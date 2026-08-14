import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { GlPostingEngine } from '../../automation/gl-posting.engine';
import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, nextCommercialNumber, round2 } from '../numbering.util';

@Injectable()
export class BillingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly gl: GlPostingEngine,
  ) {}

  async getInvoices(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      customerId?: string;
      subscriptionId?: string;
    } = {},
  ) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.subscriptionId) {
      filters.push({ field: 'subscriptionId', operator: 'eq', value: query.subscriptionId });
    }
    const res = await this.database.billingInvoices.findAll({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      filters,
    } as any);
    const data = (res?.data || [])
      .filter((i: any) => !i.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { data, total: data.length, page: 1, pageSize: data.length };
  }

  async getInvoiceById(id: string): Promise<any> {
    const invoice = await this.database.billingInvoices.findById(id).catch(() => null);
    if (!invoice || invoice.isDeleted) {
      throw new NotFoundException('Billing invoice not found');
    }
    return invoice;
  }

  async getInvoicesForCustomer(customerId: string): Promise<any[]> {
    const res = await this.database.billingInvoices.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    return (res?.data || [])
      .filter((i: any) => !i.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /**
   * Issue a commercial invoice for a subscription period. Amounts are computed
   * server-side from the pinned plan version — never from the frontend.
   */
  async issueForSubscription(
    subscription: any,
    opts: { periodStart?: string; periodEnd?: string; couponCode?: string; userId?: string },
  ): Promise<any> {
    const version = await this.database.planVersions
      .findById(subscription.planVersionId)
      .catch(() => null);
    if (!version) {
      throw new BadRequestException('Subscription plan version not found');
    }
    const price = round2(Number(version.price) || 0);
    const planDiscount = round2((price * (Number(version.discountPercent) || 0)) / 100);
    const discountAmount = round2(Math.min(planDiscount, price));
    const taxable = round2(price - discountAmount);
    const taxAmount = round2((taxable * (Number(version.taxRate) || 0)) / 100);
    const total = round2(taxable + taxAmount);
    const today = new Date().toISOString().slice(0, 10);
    const periodStart = opts.periodStart || today;
    const periodEnd = opts.periodEnd || subscription.endDate || addDays(today, 30);
    const dueDate = subscription.dueOffsetDays
      ? addDays(periodEnd, Number(subscription.dueOffsetDays))
      : periodEnd;

    let attempts = 0;
    while (attempts < 5) {
      try {
        const invoice = await this.database.billingInvoices.create({
          invoiceNumber: await nextCommercialNumber(
            this.database.billingInvoices,
            'invoiceNumber',
            'SUBINV',
          ),
          subscriptionId: subscription.id,
          customerId: subscription.customerId,
          periodStart,
          periodEnd,
          basePrice: price,
          discountAmount,
          taxAmount,
          totalAmount: total,
          currency: version.currency || subscription.currency || 'INR',
          dueDate,
          couponCode: opts.couponCode || subscription.couponCode || null,
          status: 'issued',
          paymentStatus: 'unpaid',
          issuedAt: new Date().toISOString(),
          createdBy: opts.userId || null,
          updatedBy: opts.userId || null,
        } as any);

        await this.audit.log({
          userId: actor(opts.userId),
          event: 'commercial.billing_invoice_issued',
          resource: 'BillingInvoice',
          action: 'issue',
          details: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            subscriptionId: subscription.id,
            total,
          },
        });
        return invoice;
      } catch (err: any) {
        const dup =
          isUniqueConstraintError(err) || /invoice_number/i.test(String(err?.message || ''));
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique billing invoice number');
  }

  /** Mark an invoice paid — called only after server-side verified payment. */
  async markPaid(invoiceId: string, payment: any): Promise<any> {
    const invoice = await this.database.billingInvoices.findById(invoiceId).catch(() => null);
    if (!invoice || invoice.isDeleted) {
      throw new NotFoundException('Billing invoice not found');
    }
    if (invoice.paymentStatus === 'paid') {
      return invoice; // idempotent — no double-application
    }
    const updates: Record<string, any> = {
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
      billingPaymentId: payment?.id || invoice.billingPaymentId || null,
    };
    await this.database.billingInvoices.update(invoiceId, updates as any);

    // Best-effort GL posting — never breaks the payment flow
    const posted = await this.postAccounting(invoiceId, { userId: payment?.createdBy });
    if (posted && posted.voucherId) {
      await this.database.billingInvoices.update(invoiceId, {
        glVoucherId: posted.voucherId,
      } as any);
    }

    await this.audit.log({
      userId: actor(payment?.createdBy),
      event: 'commercial.billing_invoice_paid',
      resource: 'BillingInvoice',
      action: 'pay',
      details: { invoiceId, invoiceNumber: invoice.invoiceNumber, paymentId: payment?.id },
    });
    return this.getInvoiceById(invoiceId);
  }

  /**
   * Accounting integration — Dr Customer Receivable, Cr Subscription Revenue.
   * Account IDs resolve from accounting settings (never hardcoded). Posting is
   * best-effort: if the revenue account is not configured the posting is
   * skipped (same pattern as payment-collection book entries). When no
   * dedicated output-tax account exists, tax is consolidated into revenue.
   */
  async postAccounting(
    invoiceId: string,
    opts: { userId?: string },
  ): Promise<{ success: boolean; voucherId?: string; error?: string }> {
    const invoice = await this.database.billingInvoices.findById(invoiceId).catch(() => null);
    if (!invoice || invoice.isDeleted) {
      return { success: false, error: 'Invoice not found' };
    }
    if (invoice.glVoucherId) {
      return { success: true, voucherId: invoice.glVoucherId }; // already posted
    }
    const settingsRes = await this.database.accountingSettings
      .findAll({ page: 1, pageSize: 1 } as any)
      .catch(() => ({ data: [] }));
    const settings = settingsRes?.data?.[0];
    const revenueAccountId = settings?.defaultSalesAccountId;
    if (!revenueAccountId) {
      return { success: false, error: 'Revenue account not configured — posting skipped' };
    }
    // Customer receivable = ledger master record keyed by customer id
    const customerLedger = await this.database.ledgerMaster
      .findById(invoice.customerId)
      .catch(() => null);
    const receivableAccountId = customerLedger?.id || invoice.customerId;

    const total = round2(Number(invoice.totalAmount) || 0);
    const result = await this.gl.postEntries(
      [
        {
          entryDate: new Date().toISOString().split('T')[0],
          accountId: receivableAccountId,
          voucherId: invoice.id,
          voucherType: 'SUBSCRIPTION_INVOICE',
          voucherNumber: invoice.invoiceNumber,
          debit: total,
          credit: 0,
          narration: `Subscription invoice ${invoice.invoiceNumber} — period ${invoice.periodStart} to ${invoice.periodEnd}`,
          partyId: invoice.customerId,
        },
        {
          entryDate: new Date().toISOString().split('T')[0],
          accountId: revenueAccountId,
          voucherId: invoice.id,
          voucherType: 'SUBSCRIPTION_INVOICE',
          voucherNumber: invoice.invoiceNumber,
          debit: 0,
          credit: total,
          narration: `Subscription revenue ${invoice.invoiceNumber} (incl. tax ${round2(Number(invoice.taxAmount) || 0)})`,
        },
      ],
      { userId: opts.userId },
    );
    if (!result.success) {
      return { success: false, error: result.error || result.message };
    }
    return { success: true, voucherId: invoice.id };
  }

  async cancelInvoice(invoiceId: string, body: { reason?: string; userId?: string }): Promise<any> {
    const invoice = await this.database.billingInvoices.findById(invoiceId).catch(() => null);
    if (!invoice || invoice.isDeleted) {
      throw new NotFoundException('Billing invoice not found');
    }
    if (invoice.paymentStatus === 'paid') {
      throw new BadRequestException('Paid invoices cannot be cancelled — issue a refund');
    }
    await this.database.billingInvoices.update(invoiceId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: body.reason || null,
      updatedBy: body.userId || null,
    } as any);
    await this.audit.log({
      userId: actor(body.userId),
      event: 'commercial.billing_invoice_cancelled',
      resource: 'BillingInvoice',
      action: 'cancel',
      details: { invoiceId, invoiceNumber: invoice.invoiceNumber, reason: body.reason || null },
    });
    return this.getInvoiceById(invoiceId);
  }

  /** Customer-safe invoice projection for the portal. */
  toCustomerView(invoice: any): any {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      basePrice: invoice.basePrice,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      couponCode: invoice.couponCode,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
    };
  }
}

function addDays(dateIso: string, days: number): string {
  return new Date(
    new Date(`${String(dateIso).slice(0, 10)}T00:00:00`).getTime() + days * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
}
