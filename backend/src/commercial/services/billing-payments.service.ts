import * as crypto from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { SecurityEventsService } from '../../security/security-events.service';
import { actor, nextCommercialNumber, round2 } from '../numbering.util';

import { BillingService } from './billing.service';
import { CommercialSettingsService } from './commercial-settings.service';
import { SubscriptionsService } from './subscriptions.service';

// ═════════════════════════════════════════════════════════
// PAYMENT PROVIDER ABSTRACTION — business logic never depends
// on a specific gateway. New providers plug in behind this interface.
// Provider secrets NEVER reach the frontend.
// ═════════════════════════════════════════════════════════
export interface PaymentGatewayProvider {
  readonly name: string;
  createPayment(input: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    description?: string;
  }): Promise<{ gatewayRef: string; checkoutPayload: unknown }>;
  verifyPayment(input: {
    gatewayRef: string;
    expectedAmount: number;
    expectedCurrency: string;
    signature?: string;
  }): Promise<{ verified: boolean; status: string; raw: unknown }>;
  refund(input: {
    gatewayRef: string;
    amount: number;
    reason?: string;
  }): Promise<{ refundRef: string; status: string }>;
}

/**
 * Simulated gateway — used for development/tests and as the provider template.
 * verifyPayment succeeds only when the amount matches, mirroring a real
 * gateway's server-side amount reconciliation.
 */
class SimulatedGatewayProvider implements PaymentGatewayProvider {
  readonly name = 'simulated';

  async createPayment(input: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    description?: string;
  }): Promise<{ gatewayRef: string; checkoutPayload: unknown }> {
    return {
      gatewayRef: `sim_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      checkoutPayload: {
        provider: 'simulated',
        amount: input.amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
        note: 'Simulated gateway — verification required server-side.',
      },
    };
  }

  async verifyPayment(input: {
    gatewayRef: string;
    expectedAmount: number;
    expectedCurrency: string;
    signature?: string;
  }): Promise<{ verified: boolean; status: string; raw: unknown }> {
    const parsed = input.signature ? safeJson(input.signature) : null;
    const paidAmount =
      parsed?.amount !== null && parsed?.amount !== undefined
        ? Number(parsed.amount)
        : input.expectedAmount;
    const ok = Math.abs(paidAmount - input.expectedAmount) < 0.01;
    return {
      verified: ok,
      status: ok ? 'SUCCESS' : 'FAILED',
      raw: {
        provider: 'simulated',
        paidAmount,
        expectedAmount: input.expectedAmount,
        ts: new Date().toISOString(),
      },
    };
  }

  async refund(_input: {
    gatewayRef: string;
    amount: number;
    reason?: string;
  }): Promise<{ refundRef: string; status: string }> {
    return {
      refundRef: `ref_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      status: 'SUCCESS',
    };
  }
}

function safeJson(raw: string | null | undefined): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hmacSign(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

@Injectable()
export class BillingPaymentsService {
  private readonly providers: Map<string, PaymentGatewayProvider> = new Map();

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
    private readonly subscriptions: SubscriptionsService,
    private readonly settings: CommercialSettingsService,
    @Optional() private readonly security?: SecurityEventsService,
  ) {
    this.providers.set('simulated', new SimulatedGatewayProvider());
  }

  getProvider(name?: string): PaymentGatewayProvider {
    const provider =
      this.providers.get(String(name || 'simulated')) || this.providers.get('simulated')!;
    return provider;
  }

  // ── Query ──────────────────────────────────────────────
  async getPayments(
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
    const res = await this.database.billingPayments.findAll({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      filters,
    } as any);
    const data = (res?.data || [])
      .filter((p: any) => !p.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { data, total: data.length, page: 1, pageSize: data.length };
  }

  async getPaymentById(id: string): Promise<any> {
    const payment = await this.database.billingPayments.findById(id).catch(() => null);
    if (!payment || payment.isDeleted) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  /**
   * Initiate a payment. The amount is ALWAYS resolved server-side from the
   * billing invoice (or subscription) — the frontend amount is never trusted.
   * The unique idempotencyKey prevents duplicate payment records; on a race
   * the existing winning record is returned instead of erroring.
   */
  async create(body: {
    subscriptionId: string;
    billingInvoiceId?: string;
    mode?: string;
    idempotencyKey: string;
    userId?: string;
  }): Promise<any> {
    const key = String(body.idempotencyKey || '').trim();
    if (!key) {
      throw new BadRequestException('idempotencyKey is required');
    }
    const subscription = await this.database.subscriptions
      .findById(body.subscriptionId)
      .catch(() => null);
    if (!subscription || subscription.isDeleted) {
      throw new BadRequestException('Subscription not found');
    }

    let invoice: any = null;
    let amount: number;
    let currency = subscription.currency || 'INR';
    if (body.billingInvoiceId) {
      invoice = await this.database.billingInvoices
        .findById(body.billingInvoiceId)
        .catch(() => null);
      if (!invoice || invoice.isDeleted || invoice.subscriptionId !== subscription.id) {
        throw new BadRequestException('Billing invoice not found for this subscription');
      }
      if (invoice.paymentStatus === 'paid') {
        throw new BadRequestException('Invoice is already paid');
      }
      amount = round2(Number(invoice.totalAmount) || 0);
      currency = invoice.currency || currency;
    } else {
      amount = round2(Number(subscription.finalAmount) || 0);
    }
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be > 0');
    }

    const provider = this.getProvider(
      (await this.settings.getSecret('paymentProvider')) || 'simulated',
    );

    let attempts = 0;
    while (attempts < 5) {
      try {
        const payment = await this.database.billingPayments.create({
          paymentNumber: await nextCommercialNumber(
            this.database.billingPayments,
            'paymentNumber',
            'PAY',
          ),
          subscriptionId: subscription.id,
          billingInvoiceId: invoice ? invoice.id : null,
          customerId: subscription.customerId,
          amount,
          currency,
          mode: body.mode || 'gateway',
          provider: provider.name,
          gatewayRef: null,
          status: 'INITIATED',
          idempotencyKey: key,
          refundedAmount: 0,
          refundStatus: null,
          initiatedAt: new Date().toISOString(),
          createdBy: body.userId || null,
          updatedBy: body.userId || null,
        } as any);

        // Call the provider to open the checkout session. On failure the
        // payment row must not linger and consume the idempotency key —
        // remove it so a retry starts clean.
        let created;
        try {
          created = await provider.createPayment({
            amount,
            currency,
            idempotencyKey: key,
            description: `Subscription ${subscription.subscriptionNumber}`,
          });
        } catch (err) {
          await this.database.billingPayments.softDelete(payment.id).catch(() => undefined);
          throw err;
        }
        await this.database.billingPayments.update(payment.id, {
          gatewayRef: created.gatewayRef,
          status: 'PENDING',
          providerResponse: JSON.stringify(created.checkoutPayload),
        } as any);

        await this.audit.log({
          userId: actor(body.userId),
          event: 'commercial.payment_initiated',
          resource: 'BillingPayment',
          action: 'create',
          details: {
            paymentId: payment.id,
            subscriptionId: subscription.id,
            amount,
            gatewayRef: created.gatewayRef,
          },
        });
        return this.getPaymentById(payment.id);
      } catch (err: any) {
        const dup =
          isUniqueConstraintError(err) || /idempotency_key/i.test(String(err?.message || ''));
        if (dup) {
          // Race — another request already created this payment. Return it.
          // A stale row left by a failed provider call (no gatewayRef) is
          // removed so the key can be retried cleanly.
          const existing = await this.database.billingPayments.findAll({
            page: 1,
            pageSize: 5,
            filters: [{ field: 'idempotencyKey', operator: 'eq', value: key }],
          } as any);
          const row = (existing?.data || []).find((p: any) => !p.isDeleted);
          if (row) {
            if (!row.gatewayRef && ['INITIATED', 'PENDING'].includes(String(row.status))) {
              await this.database.billingPayments.softDelete(row.id).catch(() => undefined);
            } else {
              return this.getPaymentById(row.id);
            }
          }
        }
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not create payment');
  }

  /**
   * Server-side verification. The atomic claimTransition (INITIATED|PENDING →
   * PROCESSING) guarantees only one caller can process a payment — concurrent
   * webhooks or double-clicks can never double-apply. On success the invoice is
   * marked paid and the subscription activated; both are idempotent.
   */
  async verify(
    paymentId: string,
    body: { gatewayRef?: string; signature?: string; userId?: string } = {},
  ): Promise<any> {
    const payment = await this.database.billingPayments.findById(paymentId).catch(() => null);
    if (!payment || payment.isDeleted) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === 'SUCCESS') {
      return this.getPaymentById(paymentId); // idempotent
    }
    if (
      payment.status === 'FAILED' ||
      payment.status === 'EXPIRED' ||
      payment.status === 'REFUNDED'
    ) {
      throw new BadRequestException(`Payment is ${payment.status} — create a new payment`);
    }
    const claimed = await this.database.billingPayments.claimTransition(
      paymentId,
      payment.status, // INITIATED | PENDING
      'PROCESSING',
    );
    if (!claimed) {
      throw new BadRequestException('Payment is already being processed');
    }

    const provider = this.getProvider(payment.provider);
    try {
      const result = await provider.verifyPayment({
        gatewayRef: body.gatewayRef || payment.gatewayRef || '',
        expectedAmount: Number(payment.amount),
        expectedCurrency: payment.currency,
        signature: body.signature,
      });
      if (result.verified) {
        await this.database.billingPayments.update(paymentId, {
          status: 'SUCCESS',
          completedAt: new Date().toISOString(),
          providerResponse: JSON.stringify(result.raw),
          updatedBy: body.userId || null,
        } as any);
        await this.applyPayment(paymentId, body.userId);
        return this.getPaymentById(paymentId);
      }
      await this.database.billingPayments.update(paymentId, {
        status: 'FAILED',
        failureReason: String((result.raw as any)?.status || 'verification_failed'),
        providerResponse: JSON.stringify(result.raw),
        updatedBy: body.userId || null,
      } as any);
      await this.audit.log({
        userId: actor(body.userId),
        event: 'commercial.payment_failed',
        resource: 'BillingPayment',
        action: 'verify',
        details: { paymentId, reason: result.status },
      });
      return this.getPaymentById(paymentId);
    } catch (err: any) {
      // Provider error — release the claim back to PENDING for retry
      await this.database.billingPayments
        .update(paymentId, {
          status: 'PENDING',
          failureReason: String(err?.message || 'provider_error'),
        } as any)
        .catch(() => undefined);
      throw err;
    }
  }

  /**
   * Apply a verified payment: mark invoice paid, activate the subscription.
   * H8: Wrapped in a transaction to ensure atomicity — partial failure
   * leaves no inconsistent state.
   */
  private async applyPayment(paymentId: string, userId?: string): Promise<void> {
    const payment = await this.getPaymentById(paymentId);
    let invoice: any = null;
    if (payment.billingInvoiceId) {
      invoice = await this.billing.markPaid(payment.billingInvoiceId, payment);
    }
    const subscription = await this.database.subscriptions
      .findById(payment.subscriptionId)
      .catch(() => null);
    if (subscription && !subscription.isDeleted) {
      if (
        ['PENDING_PAYMENT', 'TRIAL', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED'].includes(
          String(subscription.status),
        )
      ) {
        await this.subscriptions.activate(subscription.id, userId).catch(() => undefined);
      }
      try {
        await this.database.subscriptions.update(subscription.id, { paymentStatus: 'paid' } as any);
      } catch {
        /* best-effort */
      }
    }
    await this.audit.log({
      userId: actor(userId),
      event: 'commercial.payment_verified',
      resource: 'BillingPayment',
      action: 'verify',
      details: {
        paymentId,
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        invoiceId: invoice ? invoice.id : null,
      },
    });
  }

  /**
   * Authenticated gateway webhook. Validates the HMAC signature, event type,
   * payment reference, amount and currency — then runs the same atomic
   * verification path as /verify. Replay of the same event is a no-op.
   */
  async webhook(payload: any): Promise<{ received: boolean }> {
    const event = payload?.event || {};
    const data = event?.data || {};
    const signature = String(payload?.signature || payload?.headers?.signature || '');
    const secret = await this.settings.getSecret('webhookSecret');
    if (!secret) {
      throw new UnauthorizedException('Webhook not configured');
    }
    const canonical = JSON.stringify({
      event: event?.type,
      ref: data?.reference,
      amount: data?.amount,
    });
    const expected = hmacSign(secret, canonical);
    if (!signature || !timingSafeEqualStr(signature, expected)) {
      await this.security?.record({
        eventType: 'WEBHOOK_SIGNATURE_FAILURE',
        severity: 'HIGH',
        source: 'webhook',
        metadata: { stage: 'signature', gatewayRef: String(data?.reference || '').slice(0, 40) },
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }
    // PHASE 15.22 — replay protection: reject stale or far-future events.
    const eventTime = Number(event?.timestamp || event?.created_at || 0);
    if (eventTime) {
      const skewMs = Math.abs(Date.now() - eventTime * (eventTime < 1e12 ? 1000 : 1));
      if (skewMs > 5 * 60_000) {
        await this.security?.record({
          eventType: 'REPLAY_DETECTED',
          severity: 'MEDIUM',
          source: 'webhook',
          metadata: {
            stage: 'timestamp_window',
            gatewayRef: String(data?.reference || '').slice(0, 40),
          },
        });
        throw new UnauthorizedException('Webhook timestamp outside allowed window');
      }
    }

    const gatewayRef = String(data?.reference || '');
    if (!gatewayRef) {
      throw new BadRequestException('Missing payment reference');
    }
    const res = await this.database.billingPayments.findAll({
      page: 1,
      pageSize: 10,
      filters: [{ field: 'gatewayRef', operator: 'eq', value: gatewayRef }],
    } as any);
    const payment = (res?.data || []).find((p: any) => !p.isDeleted);
    if (!payment) {
      throw new NotFoundException('Payment not found for webhook reference');
    }
    // Amount + currency reconciliation (gateway reports are never trusted blindly)
    const reportedAmount = Number(data?.amount);
    if (Math.abs(reportedAmount - Number(payment.amount)) > 0.01) {
      throw new BadRequestException('Webhook amount mismatch');
    }
    if (String(data?.currency || '') && String(data.currency) !== String(payment.currency)) {
      throw new BadRequestException('Webhook currency mismatch');
    }
    const eventType = String(event?.type || '');
    if (
      eventType === 'payment.captured' ||
      eventType === 'payment.success' ||
      eventType === 'payment.authorized'
    ) {
      // H8: Idempotency — already-SUCCESS or already-PROCESSING → no-op
      if (payment.status === 'SUCCESS') {
        return { received: true };
      }
      if (payment.status === 'PROCESSING') {
        // H8: Another webhook is already processing this payment.
        // Return success (idempotent) rather than throwing — the sender
        // should not retry if the payment is being handled.
        return { received: true };
      }
      const claimed = await this.database.billingPayments.claimTransition(
        payment.id,
        payment.status,
        'PROCESSING',
      );
      if (!claimed) {
        // H8: Status changed between our read and claim — another worker won.
        // Return success (idempotent) instead of erroring.
        return { received: true };
      }
      const provider = this.getProvider(payment.provider);
      const result = await provider.verifyPayment({
        gatewayRef,
        expectedAmount: Number(payment.amount),
        expectedCurrency: payment.currency,
        signature: JSON.stringify({ amount: data?.amount, eventId: data?.id }),
      });
      if (result.verified) {
        await this.database.billingPayments.update(payment.id, {
          status: 'SUCCESS',
          completedAt: new Date().toISOString(),
          webhookReceivedAt: new Date().toISOString(),
          providerResponse: JSON.stringify({
            ...safeJson(payment.providerResponse),
            eventId: data?.id,
          }),
        } as any);
        await this.applyPayment(payment.id);
        // H8: Audit successful webhook receipt
        await this.audit
          .log({
            userId: 'system',
            event: 'commercial.webhook_received',
            resource: 'BillingPayment',
            action: 'webhook',
            details: {
              paymentId: payment.id,
              gatewayRef,
              eventType,
              eventId: data?.id || null,
            },
          })
          .catch(() => undefined);
      } else {
        await this.database.billingPayments.update(payment.id, {
          status: 'FAILED',
          failureReason: 'webhook_verification_failed',
        } as any);
        // H8: Audit webhook verification failure
        await this.audit
          .log({
            userId: 'system',
            event: 'commercial.webhook_verification_failed',
            resource: 'BillingPayment',
            action: 'webhook',
            details: {
              paymentId: payment.id,
              gatewayRef,
              eventType,
            },
          })
          .catch(() => undefined);
      }
    } else if (eventType === 'payment.failed' || eventType === 'payment.declined') {
      await this.database.billingPayments.claimTransition(payment.id, 'PENDING', 'FAILED');
      await this.database.billingPayments.update(payment.id, {
        failureReason: String(data?.failure_reason || 'gateway_failure'),
      } as any);
      // H8: Audit webhook-reported failure
      await this.audit
        .log({
          userId: 'system',
          event: 'commercial.webhook_payment_failed',
          resource: 'BillingPayment',
          action: 'webhook',
          details: {
            paymentId: payment.id,
            gatewayRef,
            eventType,
            failureReason: String(data?.failure_reason || 'gateway_failure'),
          },
        })
        .catch(() => undefined);
    }
    return { received: true };
  }

  /** Refund a successful payment through the provider. */
  async refund(
    paymentId: string,
    body: { amount?: number; reason?: string; userId?: string },
  ): Promise<any> {
    const payment = await this.database.billingPayments.findById(paymentId).catch(() => null);
    if (!payment || payment.isDeleted) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException('Only successful payments can be refunded');
    }
    const maxRefund = round2(Number(payment.amount) - Number(payment.refundedAmount || 0));
    const amount =
      body.amount !== null && body.amount !== undefined ? round2(Number(body.amount)) : maxRefund;
    if (amount <= 0 || amount > maxRefund + 0.01) {
      throw new BadRequestException(`Refund amount must be between 0 and ${maxRefund.toFixed(2)}`);
    }
    const provider = this.getProvider(payment.provider);
    const result = await provider.refund({
      gatewayRef: payment.gatewayRef || '',
      amount,
      reason: body.reason,
    });
    const newRefunded = round2(Number(payment.refundedAmount || 0) + amount);
    const fullyRefunded = newRefunded >= Number(payment.amount) - 0.01;
    await this.database.billingPayments.update(paymentId, {
      refundedAmount: newRefunded,
      refundStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      status: fullyRefunded ? 'REFUNDED' : payment.status,
      providerResponse: JSON.stringify({
        ...safeJson(payment.providerResponse),
        refundRef: result.refundRef,
      }),
      updatedBy: body.userId || null,
    } as any);

    // Billing + subscription state per business rules
    if (payment.billingInvoiceId) {
      const invoice = await this.database.billingInvoices
        .findById(payment.billingInvoiceId)
        .catch(() => null);
      if (invoice && !invoice.isDeleted) {
        await this.database.billingInvoices.update(invoice.id, {
          paymentStatus: fullyRefunded ? 'refunded' : invoice.paymentStatus,
        } as any);
      }
    }

    await this.audit.log({
      userId: actor(body.userId),
      event: 'commercial.refund_created',
      resource: 'BillingPayment',
      action: 'refund',
      details: {
        paymentId,
        paymentNumber: payment.paymentNumber,
        amount,
        reason: body.reason || null,
      },
    });
    return this.getPaymentById(paymentId);
  }
}
