import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { PdfService } from '../../pdf/pdf.service';
import { assertOwned, num, toDateStr } from '../portal-isolation.helper';

@Injectable()
export class PortalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly pdf: PdfService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════
  async getDashboard(customerId: string, userId: string) {
    const [profile, invoices, quotations, orders, payments, notifications] = await Promise.all([
      this.getCreditProfile(customerId),
      this.listInvoices(customerId),
      this.listQuotations(customerId),
      this.listOrders(customerId),
      this.listPayments(customerId),
      this.listNotifications(userId, 5),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const totalOutstanding = profile.outstanding;
    let overdue = 0;
    for (const inv of invoices) {
      if (inv.balanceAmount > 0 && inv.dueDate && inv.dueDate < today) {
        overdue += inv.balanceAmount;
      }
    }

    return {
      outstanding: totalOutstanding,
      overdue: Math.round(overdue * 100) / 100,
      dueSoon: invoices.filter(
        (i: any) =>
          i.balanceAmount > 0 && i.dueDate && i.dueDate >= today && i.dueDate <= addDays(today, 7),
      ).length,
      totalInvoices: invoices.length,
      openInvoices: invoices.filter((i: any) => i.balanceAmount > 0).length,
      pendingQuotations: quotations.filter(
        (q: any) => q.status === 'sent' || q.status === 'approved',
      ).length,
      openOrders: orders.filter((o: any) => !['completed', 'cancelled'].includes(o.status)).length,
      totalSales:
        Math.round(invoices.reduce((s: number, i: any) => s + i.grandTotal, 0) * 100) / 100,
      recentInvoices: invoices.slice(0, 5),
      recentOrders: orders.slice(0, 5),
      recentPayments: payments.slice(0, 5),
      recentNotifications: notifications.items,
      unreadNotifications: notifications.unread,
      creditLimit: profile.creditLimit,
      availableCredit: profile.availableCredit,
    };
  }

  private async getCreditProfile(customerId: string) {
    const res = await this.database.creditProfiles
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    const p = (res.data || [])[0] || {};
    return {
      creditLimit: num(p.creditLimit),
      creditDays: num(p.creditDays),
      outstanding: num(p.outstanding),
      availableCredit: num(p.availableCredit),
      overdueAmount: num(p.overdueAmount),
      openingBalance: num(p.openingBalance),
    };
  }

  // ═════════════════════════════════════════════════════════
  // QUOTATIONS
  // ═════════════════════════════════════════════════════════
  async listQuotations(customerId: string) {
    const res = await this.database.salesQuotations
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((q: any) => !q.isDeleted)
      .sort((a: any, b: any) => String(b.quoteDate || '').localeCompare(String(a.quoteDate || '')))
      .map((q: any) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        quoteDate: toDateStr(q.quoteDate),
        validTill: toDateStr(q.validTill),
        status: q.status,
        revision: q.revision,
        subTotal: num(q.subTotal),
        taxAmount: num(q.taxAmount),
        discountAmount: num(q.discountAmount),
        grandTotal: num(q.grandTotal ?? q.totalAmount),
        paymentTerms: q.paymentTerms,
      }));
  }

  async getQuotation(customerId: string, quotationId: string) {
    const q = await this.database.salesQuotations.findById(quotationId).catch(() => null);
    assertOwned(q, customerId);
    const itemsRes = await this.database.quotationItems
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'quotationId', operator: 'eq', value: q.id }],
      } as any)
      .catch(() => ({ data: [] }));
    // NOTE: only customer-safe fields are returned — no internal notes, approver
    // ids, branch/financial-year ids or audit columns ever reach the customer.
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      quoteDate: toDateStr(q.quoteDate),
      validTill: toDateStr(q.validTill),
      status: q.status,
      revision: q.revision,
      billingAddress: q.billingAddress,
      shippingAddress: q.shippingAddress,
      paymentTerms: q.paymentTerms,
      deliveryTime: q.deliveryTime,
      terms: q.terms,
      subTotal: num(q.subTotal),
      discountPercent: num(q.discountPercent),
      discountAmount: num(q.discountAmount),
      taxAmount: num(q.taxAmount),
      roundOff: num(q.roundOff),
      grandTotal: num(q.grandTotal ?? q.totalAmount),
      items: (itemsRes.data || []).map((i: any) => ({
        id: i.id,
        itemId: i.itemId,
        description: i.description,
        quantity: num(i.quantity),
        rate: num(i.rate),
        discountPercent: num(i.discountPercent),
        gstRate: num(i.gstRate),
        totalAmount: num(i.totalAmount),
      })),
    };
  }

  /**
   * Customer accepts / rejects / requests change.
   * - Only quotations the internal team has already sent can be responded to.
   * - request_changes never mutates the workflow status (no silent downgrade of
   *   an approved/sent quotation) — it is recorded as a customer note + audit
   *   entry so the internal approval workflow remains authoritative.
   */
  async respondQuotation(
    customerId: string,
    userId: string,
    quotationId: string,
    action: 'accept' | 'reject' | 'request_changes',
    comment?: string,
  ) {
    const q = await this.database.salesQuotations.findById(quotationId).catch(() => null);
    assertOwned(q, customerId);
    if (q.status !== 'sent' && q.status !== 'approved') {
      throw new NotFoundException('Quotation cannot be responded to in its current status');
    }
    const nextStatus =
      action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : q.status;
    const customerNotes = comment ? `Customer ${action}: ${comment}` : `Customer ${action}`;
    await this.database.salesQuotations.update(q.id, { status: nextStatus, customerNotes } as any);
    await this.audit
      .log({
        userId,
        event: `portal.quotation_${action}`,
        resource: 'portal',
        action,
        details: { quotationId: q.id, quotationNumber: q.quoteNumber, comment },
      })
      .catch(() => {});
    return { ok: true, quotationId: q.id, status: nextStatus };
  }

  // ═════════════════════════════════════════════════════════
  // SALES ORDERS
  // ═════════════════════════════════════════════════════════
  async listOrders(customerId: string) {
    const res = await this.database.salesOrders
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((o: any) => !o.isDeleted)
      .sort((a: any, b: any) => String(b.orderDate || '').localeCompare(String(a.orderDate || '')))
      .map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: toDateStr(o.orderDate),
        deliveryDate: toDateStr(o.deliveryDate),
        status: o.status,
        subTotal: num(o.subTotal),
        taxAmount: num(o.taxAmount),
        grandTotal: num(o.grandTotal ?? o.totalAmount),
        paymentStatus: o.paymentStatus,
        isPartial: !!o.isPartial,
      }));
  }

  async getOrder(customerId: string, orderId: string) {
    const o = await this.database.salesOrders.findById(orderId).catch(() => null);
    assertOwned(o, customerId);
    const itemsRes = await this.database.salesOrderItems
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'orderId', operator: 'eq', value: o.id }],
      } as any)
      .catch(() => ({ data: [] }));
    // Customer-safe projection only — no internal audit/approver fields.
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: toDateStr(o.orderDate),
      deliveryDate: toDateStr(o.deliveryDate),
      status: o.status,
      billingAddress: o.billingAddress,
      shippingAddress: o.shippingAddress,
      paymentTerms: o.paymentTerms,
      isPartial: !!o.isPartial,
      subTotal: num(o.subTotal),
      discountPercent: num(o.discountPercent),
      discountAmount: num(o.discountAmount),
      taxAmount: num(o.taxAmount),
      roundOff: num(o.roundOff),
      grandTotal: num(o.grandTotal ?? o.totalAmount),
      paymentStatus: o.paymentStatus,
      items: (itemsRes.data || []).map((i: any) => ({
        id: i.id,
        itemId: i.itemId,
        description: i.description,
        quantity: num(i.quantity),
        rate: num(i.rate),
        gstRate: num(i.gstRate),
        totalAmount: num(i.totalAmount),
      })),
    };
  }

  // ═════════════════════════════════════════════════════════
  // INVOICES
  // ═════════════════════════════════════════════════════════
  async listInvoices(customerId: string) {
    const res = await this.database.salesInvoices
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((i: any) => !i.isDeleted)
      .sort((a: any, b: any) =>
        String(b.invoiceDate || '').localeCompare(String(a.invoiceDate || '')),
      )
      .map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: toDateStr(i.invoiceDate),
        dueDate: toDateStr(i.dueDate),
        status: i.status,
        paymentStatus: i.paymentStatus,
        subTotal: num(i.subTotal),
        taxAmount: num(i.taxAmount),
        discountAmount: num(i.discountAmount),
        roundOff: num(i.roundOff),
        grandTotal: num(i.grandTotal),
        paidAmount: num(i.paidAmount),
        balanceAmount: num(i.balanceAmount),
      }));
  }

  async getInvoice(customerId: string, invoiceId: string) {
    const i = await this.database.salesInvoices.findById(invoiceId).catch(() => null);
    assertOwned(i, customerId);
    const itemsRes = await this.database.invoiceItems
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'invoiceId', operator: 'eq', value: i.id }],
      } as any)
      .catch(() => ({ data: [] }));
    // Customer-safe projection only — no internal notes/order/challan refs.
    return {
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      invoiceDate: toDateStr(i.invoiceDate),
      dueDate: toDateStr(i.dueDate),
      status: i.status,
      paymentStatus: i.paymentStatus,
      billingAddress: i.billingAddress,
      shippingAddress: i.shippingAddress,
      paymentTerms: i.paymentTerms,
      subTotal: num(i.subTotal),
      discountPercent: num(i.discountPercent),
      discountAmount: num(i.discountAmount),
      taxAmount: num(i.taxAmount),
      roundOff: num(i.roundOff),
      grandTotal: num(i.grandTotal),
      paidAmount: num(i.paidAmount),
      balanceAmount: num(i.balanceAmount),
      items: (itemsRes.data || []).map((it: any) => ({
        id: it.id,
        itemId: it.itemId,
        description: it.description,
        quantity: num(it.quantity),
        rate: num(it.rate),
        gstRate: num(it.gstRate),
        totalAmount: num(it.totalAmount),
      })),
    };
  }

  // ═════════════════════════════════════════════════════════
  // PAYMENTS + OUTSTANDING + LEDGER
  // ═════════════════════════════════════════════════════════
  async listPayments(customerId: string) {
    const res = await this.database.salesPayments
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((p: any) => !p.isDeleted)
      .sort((a: any, b: any) =>
        String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')),
      )
      .map((p: any) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        paymentDate: toDateStr(p.paymentDate),
        mode: p.mode,
        amount: num(p.amount),
        status: p.status,
        isAdvance: !!p.isAdvance,
        referenceNo: p.referenceNo,
        invoiceId: p.invoiceId,
      }));
  }

  async getOutstanding(customerId: string) {
    const profile = await this.getCreditProfile(customerId);
    const invoices = await this.listInvoices(customerId);
    const today = new Date().toISOString().split('T')[0];

    const buckets = { current: 0, days0_30: 0, days31_60: 0, days61_90: 0, days90plus: 0 };
    let totalOverdue = 0;
    for (const inv of invoices) {
      if (inv.balanceAmount <= 0) {
        continue;
      }
      if (!inv.dueDate) {
        buckets.current += inv.balanceAmount;
        continue;
      }
      const days = daysBetween(inv.dueDate, today);
      if (days <= 0) {
        buckets.current += inv.balanceAmount;
      } else if (days <= 30) {
        buckets.days0_30 += inv.balanceAmount;
        totalOverdue += inv.balanceAmount;
      } else if (days <= 60) {
        buckets.days31_60 += inv.balanceAmount;
        totalOverdue += inv.balanceAmount;
      } else if (days <= 90) {
        buckets.days61_90 += inv.balanceAmount;
        totalOverdue += inv.balanceAmount;
      } else {
        buckets.days90plus += inv.balanceAmount;
        totalOverdue += inv.balanceAmount;
      }
    }

    return {
      totalOutstanding: profile.outstanding,
      currentDue: Math.round(buckets.current * 100) / 100,
      overdue: Math.round(totalOverdue * 100) / 100,
      creditLimit: profile.creditLimit,
      availableCredit: profile.availableCredit,
      creditDays: profile.creditDays,
      ageing: {
        days0_30: Math.round(buckets.days0_30 * 100) / 100,
        days31_60: Math.round(buckets.days31_60 * 100) / 100,
        days61_90: Math.round(buckets.days61_90 * 100) / 100,
        days90plus: Math.round(buckets.days90plus * 100) / 100,
      },
    };
  }

  async getLedger(customerId: string, { from, to, page = 1, pageSize = 50 }: any = {}) {
    const profile = await this.getCreditProfile(customerId);
    const [invoices, payments] = await Promise.all([
      this.listInvoices(customerId),
      this.listPayments(customerId),
    ]);

    const entries: any[] = [];
    for (const inv of invoices) {
      if (inv.status === 'cancelled') {
        continue;
      }
      const date = inv.invoiceDate;
      if (from && date < from) {
        continue;
      }
      if (to && date > to) {
        continue;
      }
      entries.push({
        date,
        reference: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber}`,
        debit: inv.grandTotal,
        credit: 0,
        type: 'invoice',
        documentId: inv.id,
      });
    }
    for (const p of payments) {
      if (p.status === 'bounced' || p.status === 'cancelled') {
        continue;
      }
      const date = p.paymentDate;
      if (from && date < from) {
        continue;
      }
      if (to && date > to) {
        continue;
      }
      entries.push({
        date,
        reference: p.paymentNumber,
        description: `Payment ${p.mode}${p.isAdvance ? ' (advance)' : ''}`,
        debit: 0,
        credit: p.amount,
        type: 'payment',
        documentId: p.id,
      });
    }

    entries.sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        String(a.reference).localeCompare(String(b.reference)),
    );
    let running = num(profile.openingBalance);
    for (const e of entries) {
      running = Math.round((running + num(e.debit) - num(e.credit)) * 100) / 100;
      e.balance = running;
    }
    entries.reverse(); // newest first for display

    const start = (page - 1) * pageSize;
    return {
      openingBalance: num(profile.openingBalance),
      closingBalance: entries.length ? entries[0].balance : num(profile.openingBalance),
      page,
      pageSize,
      total: entries.length,
      entries: entries.slice(start, start + pageSize),
    };
  }

  // ═════════════════════════════════════════════════════════
  // DOCUMENTS — server-generated customer-safe PDFs
  // ═════════════════════════════════════════════════════════
  async getDocument(
    customerId: string,
    userId: string,
    documentType: string,
    documentId: string,
  ): Promise<Buffer> {
    if (documentType === 'invoice') {
      const inv = await this.getInvoice(customerId, documentId);
      await this.audit
        .log({
          userId,
          event: 'portal.document_downloaded',
          resource: 'portal',
          action: 'download',
          details: { documentType, documentId, number: inv.invoiceNumber },
        })
        .catch(() => {});
      return this.pdf.generatePdf(this.invoiceHtml(inv));
    }
    if (documentType === 'quotation') {
      const q = await this.getQuotation(customerId, documentId);
      await this.audit
        .log({
          userId,
          event: 'portal.document_downloaded',
          resource: 'portal',
          action: 'download',
          details: { documentType, documentId, number: q.quoteNumber },
        })
        .catch(() => {});
      return this.pdf.generatePdf(this.quotationHtml(q));
    }
    if (documentType === 'order') {
      const o = await this.getOrder(customerId, documentId);
      await this.audit
        .log({
          userId,
          event: 'portal.document_downloaded',
          resource: 'portal',
          action: 'download',
          details: { documentType, documentId, number: o.orderNumber },
        })
        .catch(() => {});
      return this.pdf.generatePdf(this.orderHtml(o));
    }
    throw new NotFoundException('Document type not supported');
  }

  private invoiceHtml(inv: any): string {
    const rows = (inv.items || [])
      .map(
        (i: any) =>
          `<tr><td>${esc(i.description || i.itemId)}</td><td style="text-align:right">${num(i.quantity)}</td><td style="text-align:right">₹${num(i.rate)}</td><td style="text-align:right">₹${num(i.totalAmount)}</td></tr>`,
      )
      .join('');
    return `<div style="font-family:Arial,sans-serif;padding:32px;color:#1e293b">
      <h2 style="margin:0">TAX INVOICE</h2>
      <p style="margin:4px 0 24px;color:#64748b">${esc(inv.invoiceNumber)} • ${esc(inv.invoiceDate)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0">Item</th><th style="padding:8px;border:1px solid #e2e8f0">Qty</th><th style="padding:8px;border:1px solid #e2e8f0">Rate</th><th style="padding:8px;border:1px solid #e2e8f0">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:13px">
        <p>Subtotal: ₹${num(inv.subTotal)}</p>
        <p>Discount: ₹${num(inv.discountAmount)}</p>
        <p>Tax: ₹${num(inv.taxAmount)}</p>
        <p style="font-size:16px;font-weight:bold;margin-top:8px">Total: ₹${num(inv.grandTotal)}</p>
        <p style="color:#64748b">Paid: ₹${num(inv.paidAmount)} • Balance: ₹${num(inv.balanceAmount)}</p>
      </div>
    </div>`;
  }

  private quotationHtml(q: any): string {
    const rows = (q.items || [])
      .map(
        (i: any) =>
          `<tr><td>${esc(i.description || i.itemId)}</td><td style="text-align:right">${num(i.quantity)}</td><td style="text-align:right">₹${num(i.rate)}</td><td style="text-align:right">₹${num(i.totalAmount)}</td></tr>`,
      )
      .join('');
    return `<div style="font-family:Arial,sans-serif;padding:32px;color:#1e293b">
      <h2 style="margin:0">QUOTATION</h2>
      <p style="margin:4px 0 24px;color:#64748b">${esc(q.quoteNumber)} • ${esc(q.quoteDate)} ${q.validTill ? `• Valid till ${esc(q.validTill)}` : ''}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0">Item</th><th style="padding:8px;border:1px solid #e2e8f0">Qty</th><th style="padding:8px;border:1px solid #e2e8f0">Rate</th><th style="padding:8px;border:1px solid #e2e8f0">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:13px">
        <p>Subtotal: ₹${num(q.subTotal)}</p>
        <p>Tax: ₹${num(q.taxAmount)}</p>
        <p style="font-size:16px;font-weight:bold;margin-top:8px">Total: ₹${num(q.grandTotal)}</p>
        <p style="color:#64748b;margin-top:12px">${esc(q.paymentTerms || '')}</p>
      </div>
    </div>`;
  }

  private orderHtml(o: any): string {
    const rows = (o.items || [])
      .map(
        (i: any) =>
          `<tr><td>${esc(i.description || i.itemId)}</td><td style="text-align:right">${num(i.quantity)}</td><td style="text-align:right">₹${num(i.rate)}</td><td style="text-align:right">₹${num(i.totalAmount)}</td></tr>`,
      )
      .join('');
    return `<div style="font-family:Arial,sans-serif;padding:32px;color:#1e293b">
      <h2 style="margin:0">SALES ORDER</h2>
      <p style="margin:4px 0 24px;color:#64748b">${esc(o.orderNumber)} • ${esc(o.orderDate)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:8px;border:1px solid #e2e8f0">Item</th><th style="padding:8px;border:1px solid #e2e8f0">Qty</th><th style="padding:8px;border:1px solid #e2e8f0">Rate</th><th style="padding:8px;border:1px solid #e2e8f0">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:13px">
        <p>Subtotal: ₹${num(o.subTotal)}</p>
        <p>Tax: ₹${num(o.taxAmount)}</p>
        <p style="font-size:16px;font-weight:bold;margin-top:8px">Total: ₹${num(o.grandTotal)}</p>
        <p style="color:#64748b">Status: ${esc(o.status)}</p>
      </div>
    </div>`;
  }

  // ═════════════════════════════════════════════════════════
  // NOTIFICATIONS (portal-scoped)
  // ═════════════════════════════════════════════════════════
  async listNotifications(portalUserId: string, limit = 20) {
    const res = await this.database.portalNotifications
      .findAll({
        page: 1,
        pageSize: Math.max(limit, 50),
        filters: [{ field: 'portalUserId', operator: 'eq', value: portalUserId }],
      } as any)
      .catch(() => ({ data: [] }));
    const items = (res.data || [])
      .filter((n: any) => !n.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, limit)
      .map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        documentType: n.documentType,
        documentId: n.documentId,
        isRead: !!n.isRead,
        createdAt: n.createdAt,
      }));
    return {
      items,
      unread: items.filter((i: any) => !i.isRead).length,
      totalUnread: (res.data || []).filter((n: any) => !n.isRead).length,
    };
  }

  async markNotificationRead(portalUserId: string, notificationId: string) {
    const n = await this.database.portalNotifications.findById(notificationId).catch(() => null);
    if (!n || String(n.portalUserId) !== String(portalUserId)) {
      throw new NotFoundException('Notification not found');
    }
    await this.database.portalNotifications.update(n.id, {
      isRead: true,
      readAt: new Date().toISOString(),
    } as any);
    return { ok: true };
  }

  async markAllNotificationsRead(portalUserId: string) {
    const res = await this.database.portalNotifications
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [{ field: 'portalUserId', operator: 'eq', value: portalUserId }],
      } as any)
      .catch(() => ({ data: [] }));
    for (const n of res.data || []) {
      if (!n.isRead) {
        await this.database.portalNotifications
          .update(n.id, { isRead: true, readAt: new Date().toISOString() } as any)
          .catch(() => {});
      }
    }
    return { ok: true };
  }
}

function esc(v: any): string {
  return String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / 86_400_000);
}
