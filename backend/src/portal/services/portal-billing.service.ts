import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { BillingPaymentsService } from '../../commercial/services/billing-payments.service';
import { BillingService } from '../../commercial/services/billing.service';
import { EntitlementsService } from '../../commercial/services/entitlements.service';
import { PlansService } from '../../commercial/services/plans.service';
import { SubscriptionsService } from '../../commercial/services/subscriptions.service';
import { AuditService } from '../../common/services/audit.service';

/**
 * Customer-facing billing — every method is scoped by the authenticated
 * portal customerId (derived from the token, never from the frontend).
 */
@Injectable()
export class PortalBillingService {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly entitlements: EntitlementsService,
    private readonly billing: BillingService,
    private readonly payments: BillingPaymentsService,
    private readonly audit: AuditService,
  ) {}

  /** Portal overview — current plan, entitlements, invoices, payments, history. */
  async getOverview(customerId: string): Promise<Record<string, any>> {
    const ent = await this.entitlements.getEntitlements(customerId);
    const current = await this.subscriptions.getForCustomer(customerId);
    const invoices = await this.billing.getInvoicesForCustomer(customerId);
    const paymentsRes = await this.payments.getPayments({ customerId, pageSize: 50 });
    const history = current ? await this.subscriptions.getHistory(current.id) : [];

    return {
      entitlements: ent,
      subscription: current
        ? {
            id: current.id,
            subscriptionNumber: current.subscriptionNumber,
            status: current.status,
            billingCycle: current.billingCycle,
            startDate: current.startDate,
            endDate: current.endDate,
            trialEnd: current.trialEnd,
            graceEnd: current.graceEnd,
            finalAmount: current.finalAmount,
            currency: current.currency,
            autoRenew: Boolean(current.autoRenew),
            paymentStatus: current.paymentStatus,
            plan: current.plan,
          }
        : null,
      invoices: invoices.slice(0, 20).map((i: any) => this.billing.toCustomerView(i)),
      payments: paymentsRes.data.slice(0, 20).map((p: any) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        mode: p.mode,
        provider: p.provider,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
        failureReason: p.failureReason,
      })),
      history: history.map((e: any) => ({
        eventType: e.eventType,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
    };
  }

  /** Public sellable plans for the portal checkout. */
  async getPlans(): Promise<any[]> {
    return this.plans.getPublicPlans();
  }

  /**
   * Portal subscribe — creates the subscription (server-side pricing) then
   * initiates a payment. The subscription stays PENDING_PAYMENT until the
   * payment is verified server-side. `customerId` comes from the token.
   */
  async subscribe(
    customerId: string,
    portalUserId: string,
    body: { planId: string; couponCode?: string; autoRenew?: boolean },
  ): Promise<Record<string, any>> {
    if (!body.planId) {
      throw new BadRequestException('planId is required');
    }
    const subscription = await this.subscriptions.create(
      {
        customerId,
        planId: body.planId,
        couponCode: body.couponCode,
        autoRenew: Boolean(body.autoRenew),
        source: 'portal',
      },
      portalUserId,
    );

    await this.audit.log({
      userId: portalUserId,
      event: 'portal.subscription_requested',
      resource: 'Subscription',
      action: 'create',
      details: {
        subscriptionId: subscription.id,
        subscriptionNumber: subscription.subscriptionNumber,
      },
    });

    // Trial subscriptions need no payment — already active.
    if (subscription.status === 'TRIAL') {
      return { subscription, payment: null, trial: true };
    }
    const payment = await this.payments.create({
      subscriptionId: subscription.id,
      idempotencyKey: `portal:${subscription.id}:${new Date().toISOString().slice(0, 10)}:init`,
      mode: 'gateway',
      userId: portalUserId,
    });
    return { subscription, payment, trial: false };
  }

  /** Verify a payment owned by this customer (idempotent, atomic). */
  async verifyPayment(
    customerId: string,
    portalUserId: string,
    paymentId: string,
    body: { signature?: string } = {},
  ): Promise<any> {
    const payment = await this.payments.getPaymentById(paymentId);
    if (payment.customerId !== customerId) {
      throw new NotFoundException('Payment not found');
    }
    const result = await this.payments.verify(paymentId, {
      signature: body.signature,
      userId: portalUserId,
    });
    await this.audit.log({
      userId: portalUserId,
      event: 'portal.payment_verified',
      resource: 'BillingPayment',
      action: 'verify',
      details: { paymentId, status: result.status },
    });
    return {
      id: result.id,
      paymentNumber: result.paymentNumber,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      completedAt: result.completedAt,
      failureReason: result.failureReason,
    };
  }

  /** Customer invoice + payment records (customer-safe projections). */
  async getInvoices(customerId: string): Promise<any[]> {
    const invoices = await this.billing.getInvoicesForCustomer(customerId);
    return invoices.map((i: any) => this.billing.toCustomerView(i));
  }

  async getPayments(customerId: string): Promise<any[]> {
    const res = await this.payments.getPayments({ customerId, pageSize: 100 });
    return res.data.map((p: any) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      mode: p.mode,
      provider: p.provider,
      createdAt: p.createdAt,
      completedAt: p.completedAt,
      failureReason: p.failureReason,
    }));
  }

  async getHistory(customerId: string): Promise<any[]> {
    const current = await this.subscriptions.getForCustomer(customerId);
    if (!current) {
      return [];
    }
    const history = await this.subscriptions.getHistory(current.id);
    return history.map((e: any) => ({
      eventType: e.eventType,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      metadata: e.metadata,
      createdAt: e.createdAt,
    }));
  }
}
