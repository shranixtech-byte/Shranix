import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { SalesPaymentCollectionService } from '../../sales/payment-collection.service';
import { num } from '../portal-isolation.helper';

const ALLOWED_MODES = ['upi', 'card', 'netbanking', 'wallet'];

@Injectable()
export class PortalPaymentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly paymentCollection: SalesPaymentCollectionService,
  ) {}

  /** Auto payment number PY-000001 — uses maxFieldValue() to include soft-deleted rows. */
  private async nextPaymentNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        let max = 0;
        const maxVal = await this.database.portalPayments.maxFieldValue('paymentNumber');
        if (maxVal) {
          const m = /PY-(\d+)/.exec(String(maxVal));
          if (m) {
            max = Number(m[1]);
          }
        }
        return `PY-${String(max + 1).padStart(6, '0')}`;
      } catch {
        /* retry */
      }
    }
    return `PY-${Date.now()}`;
  }

  /**
   * Initiate a portal payment.
   * - customerId derived from the token — never from the frontend.
   * - idempotencyKey (client-generated) prevents double payment on retry.
   * - Invoice ownership is verified here and again during verification.
   */
  async createPayment(customerId: string, portalUserId: string, data: any) {
    const amount = Math.round(num(data.amount) * 100) / 100;
    if (!(amount > 0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    const mode = String(data.mode || 'upi').toLowerCase();
    if (!ALLOWED_MODES.includes(mode)) {
      throw new BadRequestException(`Invalid payment mode: ${mode}`);
    }
    const idempotencyKey = String(data.idempotencyKey || '').trim();
    if (!idempotencyKey) {
      throw new BadRequestException('idempotencyKey is required');
    }

    // Idempotency — an existing initiated payment with the same key is returned
    const existing = await this.database.portalPayments
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'idempotencyKey', operator: 'eq', value: idempotencyKey }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      const prev = existing.data[0];
      if (String(prev.customerId) !== String(customerId)) {
        throw new NotFoundException('Payment not found');
      }
      return this.safePayment(prev);
    }

    let invoice = null;
    if (data.invoiceId) {
      invoice = await this.database.salesInvoices
        .findById(String(data.invoiceId))
        .catch(() => null);
      if (!invoice || String(invoice.customerId) !== String(customerId)) {
        throw new NotFoundException('Invoice not found');
      }
      const balance = num(invoice.balanceAmount);
      if (balance <= 0) {
        throw new BadRequestException('Invoice has no outstanding balance');
      }
      if (amount > Math.round((balance + 0.01) * 100) / 100) {
        throw new BadRequestException(`Amount exceeds invoice balance of ₹${balance}`);
      }
    }

    const paymentNumber = await this.nextPaymentNumber();
    let payment: any;
    try {
      payment = await this.database.portalPayments.create({
        paymentNumber,
        customerId,
        portalUserId,
        invoiceId: invoice ? invoice.id : null,
        amount,
        mode,
        idempotencyKey,
        status: 'initiated',
        initiatedAt: new Date().toISOString(),
      } as any);
    } catch (err: any) {
      // Concurrent create with the same idempotencyKey — the UNIQUE index won.
      // Return the existing payment instead of a 500 (never a double charge).
      const dup = await this.database.portalPayments
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [{ field: 'idempotencyKey', operator: 'eq', value: idempotencyKey }],
        } as any)
        .catch(() => ({ data: [] }));
      const winner = (dup.data || [])[0];
      if (winner && String(winner.customerId) === String(customerId)) {
        return this.safePayment(winner);
      }
      throw err;
    }

    await this.audit
      .log({
        userId: portalUserId,
        event: 'portal.payment_initiated',
        resource: 'portal',
        action: 'payment_initiated',
        details: {
          paymentId: payment.id,
          paymentNumber,
          invoiceId: invoice?.id || null,
          amount,
          mode,
        },
      })
      .catch(() => {});

    return this.safePayment(payment);
  }

  /**
   * Server-side verification. Never trust the frontend — a payment only becomes
   * a real ERP payment after this server-side step records it through the
   * existing accounting/payment flow (SalesPaymentCollectionService.collect).
   */
  async verifyPayment(
    customerId: string,
    portalUserId: string,
    paymentId: string,
    verification: any,
  ) {
    const payment = await this.database.portalPayments.findById(paymentId).catch(() => null);
    if (!payment || String(payment.customerId) !== String(customerId)) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === 'completed') {
      return { ...this.safePayment(payment), alreadyCompleted: true };
    }
    if (
      payment.status !== 'initiated' &&
      payment.status !== 'verified' &&
      payment.status !== 'processing'
    ) {
      throw new BadRequestException(`Payment cannot be verified in status: ${payment.status}`);
    }

    // ATOMIC claim — only one concurrent verify may pass this transition.
    // Prevents double-payment races (two requests both calling collect).
    const claimed = await this.database.portalPayments.claimTransition(
      payment.id,
      'initiated',
      'processing',
    );
    if (!claimed) {
      const after = await this.database.portalPayments.findById(payment.id).catch(() => null);
      if (after?.status === 'completed') {
        return { ...this.safePayment(after), alreadyCompleted: true };
      }
      // Another request is processing it — wait once then report the outcome.
      await new Promise((r) => setTimeout(r, 100));
      const final = await this.database.portalPayments.findById(payment.id).catch(() => null);
      if (final?.status === 'completed') {
        return { ...this.safePayment(final), alreadyCompleted: true };
      }
      throw new BadRequestException('Payment is already being processed');
    }

    // Simulated gateway verification — production would call the provider's
    // capture/verify API or validate a signed webhook. The provider is
    // abstracted; no hardcoded credentials here.
    const gatewayRef = String(verification?.gatewayRef || `GW-${payment.paymentNumber}`);
    const verifiedOk = verification?.result !== 'failed';
    if (!verifiedOk) {
      await this.database.portalPayments.update(payment.id, {
        gatewayRef,
        status: 'failed',
        failureReason: String(verification?.failureReason || 'Gateway declined the payment'),
        verificationPayload: JSON.stringify({
          ...(verification || {}),
          verifiedAt: new Date().toISOString(),
          simulated: true,
        }),
      } as any);
      await this.audit
        .log({
          userId: portalUserId,
          event: 'portal.payment_failed',
          resource: 'portal',
          action: 'payment_failed',
          details: { paymentId: payment.id, paymentNumber: payment.paymentNumber },
        })
        .catch(() => {});
      return { ...this.safePayment({ ...payment, status: 'failed', gatewayRef }), verified: false };
    }

    // Now record through the existing ERP payment flow (balanced, atomic, audited).
    try {
      const mode = payment.mode === 'upi' || payment.mode === 'wallet' ? 'upi' : 'bank';
      const result = await this.paymentCollection.collect({
        customerId,
        paymentDate: new Date().toISOString().split('T')[0],
        mode,
        amount: num(payment.amount),
        referenceNo: gatewayRef,
        notes: `Portal payment ${payment.paymentNumber} (${payment.mode})`,
        invoiceIds: payment.invoiceId ? [payment.invoiceId] : [],
      } as any);

      const createdPayments = Array.isArray(result?.payments)
        ? result.payments
        : Array.isArray(result?.created)
          ? result.created
          : [];
      const salesPaymentId = createdPayments.length > 0 ? createdPayments[0].id : null;
      await this.database.portalPayments.update(payment.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        salesPaymentId,
        gatewayRef,
        verificationPayload: JSON.stringify({
          ...(verification || {}),
          verifiedAt: new Date().toISOString(),
          simulated: true,
        }),
      } as any);
      await this.audit
        .log({
          userId: portalUserId,
          event: 'portal.payment_completed',
          resource: 'portal',
          action: 'payment_completed',
          details: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            gatewayRef,
          },
        })
        .catch(() => {});
      return {
        ...this.safePayment({ ...payment, status: 'completed', salesPaymentId }),
        verified: true,
        result,
      };
    } catch (err: any) {
      const reason = String(err?.message || 'Payment processing failed');
      await this.database.portalPayments.update(payment.id, {
        status: 'failed',
        failureReason: reason,
      } as any);
      throw new BadRequestException(`Payment could not be completed: ${reason}`);
    }
  }

  async listPortalPayments(customerId: string) {
    const res = await this.database.portalPayments
      .findAll({
        page: 1,
        pageSize: 200,
        filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])
      .filter((p: any) => !p.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .map((p: any) => this.safePayment(p));
  }

  private safePayment(p: any) {
    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.invoiceId || null,
      amount: num(p.amount),
      mode: p.mode,
      status: p.status,
      gatewayRef: p.gatewayRef || null,
      initiatedAt: p.initiatedAt,
      completedAt: p.completedAt || null,
      failureReason: p.failureReason || null,
      salesPaymentId: p.salesPaymentId || null,
    };
  }
}
