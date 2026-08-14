import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor, nextCommercialNumber, round2 } from '../numbering.util';

import { BillingService } from './billing.service';
import { CouponsService } from './coupons.service';
import { EntitlementsService } from './entitlements.service';

export const SUBSCRIPTION_STATUSES = [
  'TRIAL',
  'PENDING_PAYMENT',
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
  'UPGRADED',
  'DOWNGRADED',
] as const;

/**
 * Guarded state machine — invalid transitions are rejected server-side.
 * Terminal states (CANCELLED/EXPIRED/UPGRADED/DOWNGRADED) never re-enter.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  TRIAL: ['ACTIVE', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED', 'UPGRADED', 'DOWNGRADED'],
  PENDING_PAYMENT: ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'UPGRADED', 'DOWNGRADED'],
  ACTIVE: ['PAST_DUE', 'GRACE_PERIOD', 'CANCELLED', 'UPGRADED', 'DOWNGRADED'],
  PAST_DUE: ['GRACE_PERIOD', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
  GRACE_PERIOD: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
  UPGRADED: [],
  DOWNGRADED: [],
};

const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
  lifetime: 1200,
};

export function addCycle(dateIso: string, cycle: string): string {
  const months = CYCLE_MONTHS[cycle] ?? 1;
  const d = new Date(`${String(dateIso).slice(0, 10)}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${String(fromIso).slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${String(toIso).slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly coupons: CouponsService,
    private readonly entitlements: EntitlementsService,
    @Inject(forwardRef(() => BillingService))
    private readonly billing: BillingService,
  ) {}

  // ── Query ──────────────────────────────────────────────
  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      customerId?: string;
      search?: string;
    } = {},
  ) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    const res = await this.database.subscriptions.findAll({
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 50,
      filters,
    } as any);
    let data = (res?.data || []).filter((s: any) => !s.isDeleted);
    data.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (query.search) {
      const q = String(query.search).toLowerCase();
      data = data.filter(
        (s: any) =>
          String(s.subscriptionNumber || '')
            .toLowerCase()
            .includes(q) ||
          String(s.customerId || '')
            .toLowerCase()
            .includes(q),
      );
    }
    const enriched = await Promise.all(data.map(async (s: any) => this.enrich(s)));
    return { data: enriched, total: enriched.length, page: 1, pageSize: enriched.length };
  }

  private async enrich(sub: any): Promise<any> {
    const [plan, version, customer] = await Promise.all([
      this.database.plans.findById(sub.planId).catch(() => null),
      this.database.planVersions.findById(sub.planVersionId).catch(() => null),
      this.database.customers.findById(sub.customerId).catch(() => null),
    ]);
    return {
      ...sub,
      plan: plan
        ? {
            id: plan.id,
            planCode: plan.planCode,
            planName: plan.planName,
            displayName: plan.displayName,
          }
        : null,
      planVersion: version ? version.version : null,
      customer: customer
        ? { id: customer.id, name: customer.customerName || customer.firmName || customer.name }
        : null,
    };
  }

  async findById(id: string): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    return this.enrich(sub);
  }

  async getForCustomer(customerId: string): Promise<any | null> {
    const res = await this.database.subscriptions.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    const rows = (res?.data || [])
      .filter((s: any) => !s.isDeleted)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (rows.length === 0) {
      return null;
    }
    return this.enrich(rows[0]);
  }

  async getHistory(subscriptionId: string): Promise<any[]> {
    const res = await this.database.subscriptionEvents.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'subscriptionId', operator: 'eq', value: subscriptionId }],
    } as any);
    return (res?.data || [])
      .filter((e: any) => !e.isDeleted)
      .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  // ── Creation ───────────────────────────────────────────
  async create(body: any, userId?: string): Promise<any> {
    const plan = await this.database.plans.findById(body.planId).catch(() => null);
    if (!plan || plan.isDeleted || plan.status !== 'active') {
      throw new BadRequestException('Plan is not available');
    }
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'planId', operator: 'eq', value: plan.id }],
    } as any);
    const versions = (versionsRes?.data || []).filter((v: any) => !v.isDeleted);
    const version =
      (body.planVersionId ? versions.find((v: any) => v.id === body.planVersionId) : null) ||
      versions.find((v: any) => v.status === 'active') ||
      [...versions].sort((a: any, b: any) => b.version - a.version)[0];
    if (!version) {
      throw new BadRequestException('Plan has no pricing version');
    }

    const customerId = body.customerId;
    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }
    const customer = await this.database.customers.findById(customerId).catch(() => null);
    if (!customer || customer.isDeleted) {
      throw new BadRequestException('Customer not found');
    }

    // Duplicate protection — one active subscription per customer
    const existing = await this.getActiveSubscriptionRecord(customerId);
    if (existing && body.allowMultiple !== true) {
      throw new BadRequestException(
        `Customer already has an active subscription (${existing.subscriptionNumber}, ${existing.status})`,
      );
    }

    const cycle = body.billingCycle || plan.billingCycle || 'monthly';
    const price = round2(Number(version.price) || 0);
    const planDiscount = round2((price * (Number(version.discountPercent) || 0)) / 100);

    // Coupon validation + redemption (server-side, never trust frontend)
    let couponDiscount = 0;
    let coupon: any = null;
    if (body.couponCode) {
      const check = await this.coupons.validateCoupon({
        code: body.couponCode,
        customerId,
        planId: plan.id,
        amount: price,
      });
      if (!check.valid) {
        throw new BadRequestException(check.reason || 'Invalid coupon');
      }
      coupon = check.coupon;
      couponDiscount = check.discountAmount || 0;
    }

    const discountAmount = round2(Math.min(planDiscount + couponDiscount, price));
    const taxable = round2(price - discountAmount);
    const taxAmount = round2((taxable * (Number(version.taxRate) || 0)) / 100);
    const finalAmount = round2(taxable + taxAmount);

    const today = new Date().toISOString().slice(0, 10);
    const trialPeriodDays = Math.max(0, Number(plan.trialPeriodDays) || 0);
    // Trial only for first-ever subscription of this customer (prevents unlimited trials)
    const priorCount = await this.countPriorSubscriptions(customerId);
    const isTrial = trialPeriodDays > 0 && priorCount === 0;

    let status = 'PENDING_PAYMENT';
    const startDate = today;
    let endDate = addCycle(today, cycle);
    let trialStart: string | null = null;
    let trialEnd: string | null = null;
    if (isTrial) {
      status = 'TRIAL';
      trialStart = today;
      trialEnd = new Date(new Date(`${today}T00:00:00`).getTime() + trialPeriodDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
      endDate = trialEnd;
    }

    let attempts = 0;
    while (attempts < 5) {
      try {
        const sub = await this.database.subscriptions.create({
          subscriptionNumber: await nextCommercialNumber(
            this.database.subscriptions,
            'subscriptionNumber',
            'SUB',
          ),
          customerId,
          planId: plan.id,
          planVersionId: version.id,
          billingCycle: cycle,
          startDate,
          endDate,
          trialStart,
          trialEnd,
          graceStart: null,
          graceEnd: null,
          status,
          autoRenew: Boolean(body.autoRenew),
          price,
          discountAmount,
          taxAmount,
          finalAmount,
          currency: version.currency || plan.currency || 'INR',
          paymentStatus: 'unpaid',
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
          upgradeFromSubscriptionId: body.upgradeFromSubscriptionId || null,
          paymentMethodRef: body.paymentMethodRef || null,
          source: body.source || 'admin',
          createdBy: userId || null,
          updatedBy: userId || null,
        } as any);

        // Coupon redemption (atomic — fails on per-customer duplicate). If it
        // fails, the just-created subscription must NOT be left behind — soft-
        // delete it and surface the error (no orphaned records).
        if (coupon) {
          try {
            await this.coupons.redeem({
              couponId: coupon.id,
              customerId,
              subscriptionId: sub.id,
              discountAmount: couponDiscount,
              userId,
            });
          } catch (err) {
            await this.database.subscriptions.softDelete(sub.id).catch(() => undefined);
            throw err;
          }
        }

        await this.recordEvent(
          sub,
          'created',
          null,
          status,
          { source: body.source || 'admin' },
          userId,
        );
        if (isTrial) {
          await this.recordEvent(sub, 'trial_started', null, status, { trialEnd }, userId);
          await this.notifyInternal(
            userId,
            'Trial started',
            `${sub.subscriptionNumber} — ${plan.planName} trial until ${trialEnd}`,
            'subscription',
            sub.id,
          );
        } else {
          await this.notifyInternal(
            userId,
            'Subscription created',
            `${sub.subscriptionNumber} — payment required`,
            'subscription',
            sub.id,
          );
        }
        await this.audit.log({
          userId: actor(userId),
          event: 'commercial.subscription_created',
          resource: 'Subscription',
          action: 'create',
          details: {
            subscriptionId: sub.id,
            subscriptionNumber: sub.subscriptionNumber,
            planId: plan.id,
            status,
          },
        });
        return this.findById(sub.id);
      } catch (err: any) {
        const dup =
          isUniqueConstraintError(err) || /subscription_number/i.test(String(err?.message || ''));
        if (!dup || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique subscription number');
  }

  private async getActiveSubscriptionRecord(customerId: string): Promise<any | null> {
    const res = await this.database.subscriptions.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    const rows = (res?.data || []).filter(
      (s: any) =>
        !s.isDeleted && ['TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'].includes(String(s.status)),
    );
    rows.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return rows[0] || null;
  }

  private async countPriorSubscriptions(customerId: string): Promise<number> {
    const res = await this.database.subscriptions.findAll({
      page: 1,
      pageSize: 10000,
      filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
    } as any);
    return (res?.data || []).filter((s: any) => !s.isDeleted).length;
  }

  // ── State machine ──────────────────────────────────────
  private async recordEvent(
    sub: any,
    eventType: string,
    fromStatus: string | null,
    toStatus: string | null,
    metadata: Record<string, any> | null,
    userId?: string,
  ): Promise<void> {
    try {
      await this.database.subscriptionEvents.create({
        subscriptionId: sub.id,
        eventType,
        fromStatus,
        toStatus,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdBy: userId || null,
      } as any);
    } catch {
      /* best-effort */
    }
  }

  async transition(
    id: string,
    toStatus: string,
    opts: { eventType?: string; metadata?: Record<string, any>; userId?: string } = {},
  ): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    const allowed = VALID_TRANSITIONS[String(sub.status)] || [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(`Invalid transition ${sub.status} → ${toStatus}`);
    }
    const updates: Record<string, any> = { status: toStatus, updatedBy: opts.userId || null };
    if (toStatus === 'ACTIVE') {
      updates.paymentStatus = 'paid';
      updates.graceStart = null;
      updates.graceEnd = null;
    }
    if (toStatus === 'GRACE_PERIOD') {
      const plan = await this.database.plans.findById(sub.planId).catch(() => null);
      const graceDays = Math.max(0, Number(plan?.gracePeriodDays ?? 3) || 0);
      const nowDate = new Date().toISOString().slice(0, 10);
      updates.graceStart = nowDate;
      updates.graceEnd = new Date(
        new Date(`${nowDate}T00:00:00`).getTime() + graceDays * 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
    }
    await this.database.subscriptions.update(id, updates as any);
    await this.recordEvent(
      sub,
      opts.eventType || `status_${toStatus.toLowerCase()}`,
      sub.status,
      toStatus,
      opts.metadata || null,
      opts.userId,
    );
    return this.findById(id);
  }

  /** Activate a subscription after server-side verified payment (or admin). */
  async activate(id: string, userId?: string): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    if (sub.status === 'ACTIVE') {
      return this.findById(id);
    }
    return this.transition(id, 'ACTIVE', { eventType: 'activated', userId });
  }

  // ── Renewal ────────────────────────────────────────────
  async renew(id: string, opts: { userId?: string; force?: boolean } = {}): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    if (!['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(sub.status))) {
      throw new BadRequestException(`Subscription cannot be renewed from status ${sub.status}`);
    }
    const today = new Date().toISOString().slice(0, 10);
    const base = String(sub.endDate || sub.startDate || today).slice(0, 10);
    const newEnd =
      base < today ? addCycle(today, sub.billingCycle) : addCycle(base, sub.billingCycle);
    const periodStart = base < today ? today : base;

    await this.database.subscriptions.update(id, {
      endDate: newEnd,
      paymentStatus:
        sub.paymentStatus === 'unpaid' && sub.status === 'GRACE_PERIOD'
          ? 'pending'
          : sub.paymentStatus,
      updatedBy: opts.userId || null,
    } as any);
    await this.recordEvent(
      sub,
      'renewed',
      sub.status,
      sub.status,
      { periodStart, newEnd },
      opts.userId,
    );

    // Renewal invoice
    await this.billing.issueForSubscription(sub, {
      periodStart,
      periodEnd: newEnd,
      userId: opts.userId,
    });

    await this.audit.log({
      userId: actor(opts.userId),
      event: 'commercial.subscription_renewed',
      resource: 'Subscription',
      action: 'renew',
      details: {
        subscriptionId: id,
        subscriptionNumber: sub.subscriptionNumber,
        periodEnd: newEnd,
      },
    });
    return this.findById(id);
  }

  // ── Upgrade ────────────────────────────────────────────
  async upgrade(
    id: string,
    body: { planId: string; planVersionId?: string; immediate?: boolean; userId?: string },
  ): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    if (!['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'PAST_DUE'].includes(String(sub.status))) {
      throw new BadRequestException(`Subscription cannot be upgraded from status ${sub.status}`);
    }
    const plan = await this.database.plans.findById(body.planId).catch(() => null);
    if (!plan || plan.isDeleted || plan.status !== 'active') {
      throw new BadRequestException('Target plan is not available');
    }
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'planId', operator: 'eq', value: plan.id }],
    } as any);
    const versions = (versionsRes?.data || []).filter((v: any) => !v.isDeleted);
    const version =
      versions.find((v: any) => v.id === body.planVersionId) ||
      versions.find((v: any) => v.status === 'active') ||
      [...versions].sort((a: any, b: any) => b.version - a.version)[0];
    if (!version) {
      throw new BadRequestException('Target plan has no pricing version');
    }
    if (plan.id === sub.planId) {
      throw new BadRequestException('Cannot upgrade to the same plan');
    }

    if (body.immediate === false) {
      // Schedule for next renewal — no rewriting of the current subscription
      await this.recordEvent(
        sub,
        'upgrade_scheduled',
        sub.status,
        sub.status,
        {
          targetPlanId: plan.id,
          targetPlanVersionId: version.id,
          effectiveDate: sub.endDate,
        },
        body.userId,
      );
      await this.audit.log({
        userId: actor(body.userId),
        event: 'commercial.subscription_upgrade_scheduled',
        resource: 'Subscription',
        action: 'upgrade',
        details: { subscriptionId: id, targetPlanId: plan.id, effectiveDate: sub.endDate },
      });
      return this.findById(id);
    }

    // Immediate upgrade — prorated credit for unused portion of the current cycle
    const oldFinal = round2(Number(sub.finalAmount) || 0);
    const newPrice = round2(Number(version.price) || 0);
    const newPlanDiscount = round2((newPrice * (Number(version.discountPercent) || 0)) / 100);
    const newDiscountAmount = round2(Math.min(newPlanDiscount, newPrice));
    const newTaxable = round2(newPrice - newDiscountAmount);
    const newTax = round2((newTaxable * (Number(version.taxRate) || 0)) / 100);
    const newFinal = round2(newTaxable + newTax);

    const totalCycleDays = Math.max(1, daysBetween(sub.startDate, sub.endDate || sub.startDate));
    const remainingDays = Math.max(
      0,
      daysBetween(new Date().toISOString().slice(0, 10), sub.endDate || sub.startDate),
    );
    const proratedCredit = round2((oldFinal * remainingDays) / totalCycleDays);
    const dueAmount = round2(Math.max(0, newFinal - proratedCredit));

    // Close the old subscription (never delete — history preserved)
    await this.database.subscriptions.update(id, {
      status: 'UPGRADED',
      cancelledAt: new Date().toISOString(),
      cancellationReason: `Upgraded to ${plan.planName}`,
      cancelledBy: body.userId || null,
      updatedBy: body.userId || null,
    } as any);
    await this.recordEvent(
      sub,
      'upgraded',
      sub.status,
      'UPGRADED',
      {
        targetPlanId: plan.id,
        proratedCredit,
        dueAmount,
      },
      body.userId,
    );

    const newSub = await this.create(
      {
        customerId: sub.customerId,
        planId: plan.id,
        planVersionId: version.id,
        billingCycle: sub.billingCycle,
        autoRenew: Boolean(sub.autoRenew),
        upgradeFromSubscriptionId: id,
        source: sub.source || 'admin',
        allowMultiple: true,
      },
      body.userId,
    );

    // Override the computed amount with the prorated due amount
    await this.database.subscriptions.update(newSub.id, {
      price: newPrice,
      discountAmount: newDiscountAmount,
      taxAmount: newTax,
      finalAmount: dueAmount,
      startDate: new Date().toISOString().slice(0, 10),
    } as any);

    await this.audit.log({
      userId: actor(body.userId),
      event: 'commercial.subscription_upgraded',
      resource: 'Subscription',
      action: 'upgrade',
      details: {
        subscriptionId: id,
        newSubscriptionId: newSub.id,
        targetPlanId: plan.id,
        proratedCredit,
        dueAmount,
      },
    });
    return this.findById(newSub.id);
  }

  // ── Downgrade ──────────────────────────────────────────
  async downgrade(
    id: string,
    body: { planId: string; planVersionId?: string; immediate?: boolean; userId?: string },
  ): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    if (!['ACTIVE', 'GRACE_PERIOD'].includes(String(sub.status))) {
      throw new BadRequestException(`Subscription cannot be downgraded from status ${sub.status}`);
    }
    const plan = await this.database.plans.findById(body.planId).catch(() => null);
    if (!plan || plan.isDeleted || plan.status !== 'active') {
      throw new BadRequestException('Target plan is not available');
    }
    const versionsRes = await this.database.planVersions.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'planId', operator: 'eq', value: plan.id }],
    } as any);
    const versions = (versionsRes?.data || []).filter((v: any) => !v.isDeleted);
    const version =
      versions.find((v: any) => v.id === body.planVersionId) ||
      versions.find((v: any) => v.status === 'active') ||
      [...versions].sort((a: any, b: any) => b.version - a.version)[0];
    if (!version) {
      throw new BadRequestException('Target plan has no pricing version');
    }
    if (plan.id === sub.planId) {
      throw new BadRequestException('Cannot downgrade to the same plan');
    }

    if (body.immediate !== true) {
      // Scheduled downgrade at next renewal
      await this.recordEvent(
        sub,
        'downgrade_scheduled',
        sub.status,
        sub.status,
        {
          targetPlanId: plan.id,
          targetPlanVersionId: version.id,
          effectiveDate: sub.endDate,
        },
        body.userId,
      );
      await this.audit.log({
        userId: actor(body.userId),
        event: 'commercial.subscription_downgrade_scheduled',
        resource: 'Subscription',
        action: 'downgrade',
        details: { subscriptionId: id, targetPlanId: plan.id, effectiveDate: sub.endDate },
      });
      return this.findById(id);
    }

    // Immediate downgrade — never silently remove data; block when usage exceeds
    // the target plan's limits.
    const limitsRaw = version.limits ? JSON.parse(version.limits) : {};
    const limits: Record<string, number> = limitsRaw;
    for (const [resource, limit] of Object.entries(limits)) {
      const numLimit = Number(limit) || 0;
      if (numLimit <= 0) {
        continue;
      }
      const usage = await this.entitlements.computeUsage(sub.customerId, resource);
      if (usage > numLimit) {
        throw new BadRequestException(
          `Cannot downgrade — ${resource} usage (${usage}) exceeds the target plan limit (${numLimit}). Resolve usage first or schedule the downgrade.`,
        );
      }
    }

    await this.database.subscriptions.update(id, {
      status: 'DOWNGRADED',
      cancelledAt: new Date().toISOString(),
      cancellationReason: `Downgraded to ${plan.planName}`,
      cancelledBy: body.userId || null,
      updatedBy: body.userId || null,
    } as any);
    await this.recordEvent(
      sub,
      'downgraded',
      sub.status,
      'DOWNGRADED',
      { targetPlanId: plan.id },
      body.userId,
    );

    const newSub = await this.create(
      {
        customerId: sub.customerId,
        planId: plan.id,
        planVersionId: version.id,
        billingCycle: sub.billingCycle,
        autoRenew: Boolean(sub.autoRenew),
        upgradeFromSubscriptionId: id,
        source: sub.source || 'admin',
        allowMultiple: true,
      },
      body.userId,
    );

    await this.audit.log({
      userId: actor(body.userId),
      event: 'commercial.subscription_downgraded',
      resource: 'Subscription',
      action: 'downgrade',
      details: { subscriptionId: id, newSubscriptionId: newSub.id, targetPlanId: plan.id },
    });
    return this.findById(newSub.id);
  }

  // ── Cancellation ───────────────────────────────────────
  async cancel(
    id: string,
    body: { reason?: string; immediate?: boolean; userId?: string },
  ): Promise<any> {
    const sub = await this.database.subscriptions.findById(id).catch(() => null);
    if (!sub || sub.isDeleted) {
      throw new NotFoundException('Subscription not found');
    }
    if (['CANCELLED', 'EXPIRED', 'UPGRADED', 'DOWNGRADED'].includes(String(sub.status))) {
      throw new BadRequestException(`Subscription already ${sub.status}`);
    }

    if (body.immediate === true) {
      await this.database.subscriptions.update(id, {
        status: 'CANCELLED',
        autoRenew: false,
        cancelledAt: new Date().toISOString(),
        cancellationReason: body.reason || null,
        cancelledBy: body.userId || null,
        updatedBy: body.userId || null,
      } as any);
      await this.recordEvent(
        sub,
        'cancelled',
        sub.status,
        'CANCELLED',
        { reason: body.reason || null },
        body.userId,
      );
    } else {
      // Cancel at end of period — auto-renew off; scheduler finalizes at endDate
      await this.database.subscriptions.update(id, {
        autoRenew: false,
        updatedBy: body.userId || null,
      } as any);
      await this.recordEvent(
        sub,
        'cancelled',
        sub.status,
        sub.status,
        {
          mode: 'end_of_period',
          effectiveDate: sub.endDate,
          reason: body.reason || null,
        },
        body.userId,
      );
    }

    await this.audit.log({
      userId: actor(body.userId),
      event: 'commercial.subscription_cancelled',
      resource: 'Subscription',
      action: 'cancel',
      details: {
        subscriptionId: id,
        subscriptionNumber: sub.subscriptionNumber,
        immediate: body.immediate === true,
        reason: body.reason || null,
      },
    });
    return this.findById(id);
  }

  /** In-app notification via the existing notification table. */
  private async notifyInternal(
    userId: string | undefined,
    title: string,
    message: string,
    documentType: string,
    documentId: string,
  ): Promise<void> {
    try {
      if (!userId) {
        return;
      }
      await this.database.notifications.create({
        userId,
        title,
        message,
        type: 'info',
        module: 'commercial',
        documentId,
        documentType,
        isRead: false,
      } as any);
    } catch {
      /* best-effort */
    }
  }
}
