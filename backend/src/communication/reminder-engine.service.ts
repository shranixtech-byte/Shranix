import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { NotificationSettingsService } from '../notifications/settings.service';

import { CommunicationService } from './communication.service';

interface ReminderTarget {
  to: string; // email or phone
  channel: 'email' | 'sms' | 'whatsapp';
  recipientType?: string;
  recipientId?: string;
}

/**
 * Automated reminder engine — payment due/overdue, low stock, near expiry,
 * CRM follow-ups. Each run is idempotent per invoice/lead via reference
 * uniqueness checks in the communication log (no duplicate reminders).
 */
@Injectable()
export class ReminderEngineService {
  private readonly logger = new Logger(ReminderEngineService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly communications: CommunicationService,
    private readonly notificationSettings: NotificationSettingsService,
  ) {}

  /** Resolve a customer's best contact channel/address. */
  private async customerTarget(customerId: string): Promise<ReminderTarget | null> {
    // Preferred: canonical customers master (schema exists in Postgres).
    try {
      const master = await this.database.customers?.findById?.(customerId);
      const email = master?.email;
      const mobile = master?.mobile;
      const whatsapp = master?.whatsapp || mobile;
      if (email) {
        return { to: email, channel: 'email', recipientType: 'customer', recipientId: customerId };
      }
      if (mobile) {
        return { to: mobile, channel: 'sms', recipientType: 'customer', recipientId: customerId };
      }
      if (whatsapp) {
        return {
          to: whatsapp,
          channel: 'whatsapp',
          recipientType: 'customer',
          recipientId: customerId,
        };
      }
    } catch {
      /* ignore */
    }

    // Fallback: ledger_master row (party_id) — contact fields live in notes JSON.
    try {
      const rows = await this.database.ledgerMaster
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'partyId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [] }));
      const row = (rows.data || [])[0];
      let notes: Record<string, any> = {};
      if (row?.notes) {
        try {
          notes = JSON.parse(row.notes);
        } catch {
          /* plain text */
        }
      }
      const email = notes.email || row?.email;
      const mobile = notes.mobile || row?.mobile;
      const whatsapp = notes.whatsapp || mobile;
      if (email) {
        return { to: email, channel: 'email', recipientType: 'customer', recipientId: customerId };
      }
      if (mobile) {
        return { to: mobile, channel: 'sms', recipientType: 'customer', recipientId: customerId };
      }
      if (whatsapp) {
        return {
          to: whatsapp,
          channel: 'whatsapp',
          recipientType: 'customer',
          recipientId: customerId,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /**
   * Has a reminder already been sent for this reference + type within the
   * dedup window (7 days)? Time-windowed (not permanent) so a restocked item
   * or still-overdue invoice can re-alert later without flooding.
   */
  private async alreadySent(
    referenceType: string,
    referenceId: string,
    templateCode: string,
    windowDays = 7,
  ): Promise<boolean> {
    const res = await this.database.communications
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [
          { field: 'referenceType', operator: 'eq', value: referenceType },
          { field: 'referenceId', operator: 'eq', value: referenceId },
          { field: 'templateCode', operator: 'eq', value: templateCode },
          { field: 'status', operator: 'ne', value: 'cancelled' },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    const cutoff = Date.now() - windowDays * 86_400_000;
    return (res.data || []).some((r: any) => new Date(r.sentAt || r.createdAt).getTime() > cutoff);
  }

  /**
   * Payment reminders — unpaid/posted sales invoices where dueDate is
   * reached (due today or overdue). Never duplicates an existing reminder.
   */
  async paymentReminders(): Promise<{ sent: number; skipped: number }> {
    const enabled =
      (await this.notificationSettings.isChannelEnabled('email')) ||
      (await this.notificationSettings.isChannelEnabled('sms'));
    if (!enabled) {
      return { sent: 0, skipped: 0 };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDays = Number((await this.notificationSettings.getSettings()).dueDays) || 0;

    const invoices = await this.database.salesInvoices
      .findAll({
        page: 1,
        pageSize: 5000,
      } as any)
      .catch(() => ({ data: [] }));

    let sent = 0;
    let skipped = 0;
    for (const inv of (invoices.data || []) as any[]) {
      if (inv.isDeleted || !['posted', 'approved'].includes(inv.status)) {
        continue;
      }
      if (inv.paymentStatus === 'paid' || Number(inv.balanceAmount || inv.grandTotal || 0) <= 0) {
        continue;
      }
      if (!inv.dueDate) {
        continue;
      }
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
      // Due today or overdue (or within dueDays window when configured)
      if (diffDays > Math.max(0, dueDays)) {
        continue;
      }
      if (await this.alreadySent('sales_invoice', inv.id, 'PAYMENT_REMINDER')) {
        skipped += 1;
        continue;
      }
      const target = await this.customerTarget(inv.customerId);
      if (!target) {
        skipped += 1;
        continue;
      }
      try {
        await this.communications.send({
          channel: target.channel,
          templateCode: 'PAYMENT_REMINDER',
          to: target.to,
          recipientType: target.recipientType,
          recipientId: target.recipientId,
          referenceType: 'sales_invoice',
          referenceId: inv.id,
          referenceNumber: inv.invoiceNumber || null,
          variables: {
            customer_name: inv.customerName || '',
            invoice_number: inv.invoiceNumber || '',
            invoice_total: inv.grandTotal ?? 0,
            outstanding_amount: inv.balanceAmount ?? inv.grandTotal ?? 0,
            payment_due_date: inv.dueDate || '',
          },
        });
        sent += 1;
      } catch {
        skipped += 1;
      }
    }
    this.logger.log(`Payment reminders: ${sent} sent, ${skipped} skipped`);
    return { sent, skipped };
  }

  /**
   * Low stock alerts — items below reorder level. One alert per item per run
   * is suppressed by reference dedup; re-alerts occur on later runs.
   */
  async lowStockAlerts(): Promise<{ sent: number }> {
    const threshold =
      Number((await this.notificationSettings.getSettings()).lowStockThreshold) || 0;
    const items = await this.database.items
      .findAll({
        page: 1,
        pageSize: 5000,
      } as any)
      .catch(() => ({ data: [] }));

    let sent = 0;
    for (const item of (items.data || []) as any[]) {
      if (item.isDeleted) {
        continue;
      }
      const reorder = Number(item.reorderLevel) || Number(item.minStock) || threshold;
      if (reorder <= 0) {
        continue;
      }
      const qty = Number(item.currentStock) || 0;
      if (qty > reorder) {
        continue;
      }
      if (await this.alreadySent('item', item.id, 'LOW_STOCK_ALERT')) {
        continue;
      }
      // Low stock → alert admins via the configured alert email
      const alertEmail = String((await this.notificationSettings.getSettings()).alertEmail || '');
      if (!alertEmail) {
        continue;
      }
      try {
        await this.communications.send({
          channel: 'email',
          templateCode: 'LOW_STOCK_ALERT',
          to: alertEmail,
          recipientType: 'other',
          referenceType: 'item',
          referenceId: item.id,
          referenceNumber: item.sku || null,
          variables: {
            product_name: item.name || '',
            stock_quantity: qty,
          },
        });
        sent += 1;
      } catch {
        /* continue */
      }
    }
    return { sent };
  }

  /** Near-expiry alerts — batch master rows expiring within the configured window. */
  async expiryAlerts(): Promise<{ sent: number }> {
    const expiryDays = Number((await this.notificationSettings.getSettings()).expiryDays) || 30;
    const alertEmail = String((await this.notificationSettings.getSettings()).alertEmail || '');
    if (!alertEmail) {
      return { sent: 0 };
    }
    const now = Date.now();
    const windowEnd = new Date(now + expiryDays * 86_400_000).toISOString();
    const batches = await this.database.batchMaster
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));

    let sent = 0;
    for (const b of (batches.data || []) as any[]) {
      if (!b.expDate || ['expired', 'consumed', 'cancelled'].includes(b.status)) {
        continue;
      }
      if (b.expDate < windowEnd && b.expDate >= new Date().toISOString()) {
        if (await this.alreadySent('batch', b.id, 'EXPIRY_ALERT')) {
          continue;
        }
        try {
          await this.communications.send({
            channel: 'email',
            templateCode: 'EXPIRY_ALERT',
            to: alertEmail,
            recipientType: 'other',
            referenceType: 'batch',
            referenceId: b.id,
            referenceNumber: b.batchNo || null,
            variables: {
              product_name: b.itemId || '',
              expiry_date: b.expDate || '',
              stock_quantity: b.quantity ?? 0,
            },
          });
          sent += 1;
        } catch {
          /* continue */
        }
      }
    }
    return { sent };
  }

  /** CRM follow-up reminders — scheduled follow-ups due today/overdue → assigned user. */
  async crmFollowUpReminders(): Promise<{ sent: number }> {
    const followUps = await this.database.followUps
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'status', operator: 'eq', value: 'scheduled' }],
      } as any)
      .catch(() => ({ data: [] }));

    let sent = 0;
    for (const fu of (followUps.data || []) as any[]) {
      if (!fu.scheduledAt || !fu.assignedTo) {
        continue;
      }
      if (new Date(fu.scheduledAt).getTime() > Date.now() + 86_400_000) {
        continue; // more than a day away — not due yet
      }
      if (await this.alreadySent('crm_followup', fu.id, 'CRM_FOLLOWUP_REMINDER')) {
        continue;
      }
      try {
        await this.communications.send({
          channel: 'in_app' as any,
          templateCode: 'CRM_FOLLOWUP_REMINDER',
          to: fu.assignedTo, // in-app delivery keyed by user id
          recipientType: 'user',
          recipientId: fu.assignedTo,
          referenceType: 'crm_followup',
          referenceId: fu.id,
          variables: {
            customer_name: fu.customerName || fu.leadName || '',
            followup_date: fu.scheduledAt || '',
          },
        });
        sent += 1;
      } catch {
        /* continue */
      }
    }
    return { sent };
  }

  /** Run every reminder type (called by the scheduler loop). */
  async runAll(): Promise<Record<string, number>> {
    const payment = await this.paymentReminders();
    const lowStock = await this.lowStockAlerts();
    const expiry = await this.expiryAlerts();
    const followUps = await this.crmFollowUpReminders();
    return {
      paymentSent: payment.sent,
      lowStockSent: lowStock.sent,
      expirySent: expiry.sent,
      followUpSent: followUps.sent,
    };
  }
}
