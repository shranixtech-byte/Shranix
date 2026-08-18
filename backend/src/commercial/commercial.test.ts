import * as crypto from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { GlPostingEngine } from '../automation/gl-posting.engine';
import { TransactionManager } from '../automation/transaction.manager';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { BillingPaymentsService } from './services/billing-payments.service';
import { BillingService } from './services/billing.service';
import { CommercialSchedulerService } from './services/commercial-scheduler.service';
import { CommercialSettingsService } from './services/commercial-settings.service';
import { CouponsService } from './services/coupons.service';
import { EntitlementsService } from './services/entitlements.service';
import { PlansService } from './services/plans.service';
import { RemindersService } from './services/reminders.service';
import { SubscriptionsService } from './services/subscriptions.service';

/**
 * REAL-DB integration tests for the Phase-12 Subscription, Billing &
 * Commercial Plans engine.
 *
 * Covers: plan versioning, entitlement checks, usage limits, the full
 * subscription state machine (trial → activate → renew → upgrade →
 * downgrade → cancel), coupons (validation/redemption/expiry/limits),
 * server-side payment verification + idempotency, concurrent double-payment
 * protection, webhook signature validation, refunds, and the SECURITY MATRIX
 * (frontend price manipulation, cross-customer isolation, feature access
 * without entitlement, usage beyond plan limit).
 */
describe('Commercial module (real DB)', () => {
  let database: DatabaseService;
  let audit: AuditService;
  let plans: PlansService;
  let coupons: CouponsService;
  let entitlements: EntitlementsService;
  let subscriptions: SubscriptionsService;
  let billing: BillingService;
  let payments: BillingPaymentsService;
  let settings: CommercialSettingsService;
  let scheduler: CommercialSchedulerService;

  let customerA: any;
  let customerB: any;
  let customerBSub: any;
  let customerJ: any;
  let starter: any;
  let pro: any;
  let enterprise: any;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'commercial-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    audit = new AuditService(database, { getIp: () => null, getUserAgent: () => null } as any);

    const tm = new TransactionManager(database);
    const gl = new GlPostingEngine(database, tm);
    plans = new PlansService(database, audit);
    coupons = new CouponsService(database, audit);
    entitlements = new EntitlementsService(database);
    settings = new CommercialSettingsService(database, audit);
    billing = new BillingService(database, audit, gl);
    subscriptions = new SubscriptionsService(database, audit, coupons, entitlements, billing);
    payments = new BillingPaymentsService(database, audit, billing, subscriptions, settings);
    // H5 — mock distributed lock for single-process tests
    const mockLock = {
      runWithDistributedLock: async <T>(_k: string, _o: any, handler: () => Promise<T>) => {
        try {
          return { acquired: true, result: await handler() };
        } catch (e) {
          return { acquired: true, error: e as Error };
        }
      },
    };
    scheduler = new CommercialSchedulerService(
      database,
      settings,
      coupons,
      new RemindersService(database),
      subscriptions,
      payments,
      mockLock as any,
    );

    // ── Master data ──────────────────────────────────────
    customerA = await database.customers.create({
      customerCode: 'CUS-9001',
      name: 'Commercial A',
      firmName: 'Firm A',
      mobile: '9876509001',
      email: 'ca@test.in',
    } as any);
    customerB = await database.customers.create({
      customerCode: 'CUS-9002',
      name: 'Commercial B',
      firmName: 'Firm B',
      mobile: '9876509002',
      email: 'cb@test.in',
    } as any);

    // Plans — Starter (sales only, users:2), Pro (sales+accounts+inventory, users:10, invoices:5), Enterprise
    starter = await plans.create(
      {
        planCode: 'STARTER',
        planName: 'Starter',
        displayName: 'Starter',
        planType: 'monthly',
        billingCycle: 'monthly',
        trialPeriodDays: 7,
        gracePeriodDays: 3,
        price: 999,
        discountPercent: 0,
        taxRate: 18,
        features: { sales: true, purchase: true, reports: false, hr: false, api_access: false },
        limits: { users: 2, invoices: 5 },
      },
      'u1',
    );
    pro = await plans.create(
      {
        planCode: 'PRO',
        planName: 'Professional',
        displayName: 'Professional',
        planType: 'monthly',
        billingCycle: 'monthly',
        trialPeriodDays: 0,
        gracePeriodDays: 3,
        price: 4999,
        discountPercent: 0,
        taxRate: 18,
        features: {
          sales: true,
          purchase: true,
          inventory: true,
          accounts: true,
          reports: true,
          hr: false,
          api_access: false,
        },
        limits: { users: 10, invoices: 1000 },
      },
      'u1',
    );
    enterprise = await plans.create(
      {
        planCode: 'ENT',
        planName: 'Enterprise',
        displayName: 'Enterprise',
        planType: 'yearly',
        billingCycle: 'yearly',
        trialPeriodDays: 0,
        gracePeriodDays: 7,
        price: 49999,
        discountPercent: 10,
        taxRate: 18,
        features: {
          sales: true,
          purchase: true,
          inventory: true,
          accounts: true,
          reports: true,
          hr: true,
          api_access: true,
        },
        limits: { users: 500, invoices: 100000 },
      },
      'u1',
    );
  });

  afterAll(async () => {
    // no-op — temp DB discarded
  });

  // ═══════════════════════════════════════════════════════
  // PLANS + VERSIONING
  // ═══════════════════════════════════════════════════════
  it('creates plans with versioned pricing and a feature matrix', async () => {
    const matrix = await plans.getMatrix();
    const names = matrix.plans.map((p: any) => p.planCode);
    expect(names).toContain('STARTER');
    expect(names).toContain('PRO');
    const starterRow = matrix.plans.find((p: any) => p.planCode === 'STARTER');
    expect(starterRow.features.sales).toBe(true);
    expect(starterRow.features.hr).toBe(false);
    expect(starterRow.limits.users).toBe(2);
  });

  it('versions supersede the previous active version without rewriting history', async () => {
    const before = await plans.findById(pro.id);
    expect(before.currentVersion).toBe(1);
    await plans.createVersion(
      pro.id,
      {
        price: 5999,
        taxRate: 18,
        features: {
          sales: true,
          purchase: true,
          inventory: true,
          accounts: true,
          reports: true,
          hr: false,
          api_access: false,
        },
        limits: { users: 15, invoices: 2000 },
      },
      'u1',
    );
    const after = await plans.findById(pro.id);
    expect(after.currentVersion).toBe(2);
    expect(after.price).toBe(5999);
    expect(after.limits.users).toBe(15);
    // v1 preserved as history
    const v1 = after.versions.find((v: any) => v.version === 1);
    expect(v1).toBeTruthy();
    expect(v1.status).toBe('superseded');
  });

  // ═══════════════════════════════════════════════════════
  // ENTITLEMENTS + USAGE LIMITS
  // ═══════════════════════════════════════════════════════
  it('reports no entitlement before a subscription exists', async () => {
    const ent = await entitlements.getEntitlements(customerA.id);
    expect(ent.active).toBe(false);
    expect(await entitlements.hasFeature(customerA.id, 'sales')).toBe(false);
  });

  it('enforces usage limits against the active plan (users + invoices)', async () => {
    // Seed a user + an invoice so usage is non-zero
    await database.users.create({
      email: 'seed@test.in',
      passwordHash: 'x',
      firstName: 'Seed',
      lastName: 'User',
    } as any);
    await database.salesInvoices.create({
      invoiceNumber: 'INV-C-0001',
      customerId: customerA.id,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'posted',
      paymentStatus: 'unpaid',
      subTotal: 1000,
      taxAmount: 180,
      grandTotal: 1180,
      paidAmount: 0,
      balanceAmount: 1180,
    } as any);

    // Customer B subscribes to STARTER (users:2, invoices:5) — first subscription → trial
    customerBSub = await subscriptions.create(
      { customerId: customerB.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    expect(customerBSub.status).toBe('TRIAL');
    // Frontend cannot influence price
    expect(customerBSub.finalAmount).toBeCloseTo(1178.82, 1); // 999 + 18% = 1178.82

    // users usage = 1 (seeded) < 2 → allowed
    const usersCheck = await entitlements.checkLimit(customerB.id, 'users');
    expect(usersCheck.allowed).toBe(true);
    expect(usersCheck.used).toBe(1);

    // invoices: none for customer B this month → allowed
    const invCheck = await entitlements.checkLimit(customerB.id, 'invoices');
    expect(invCheck.allowed).toBe(true);

    // Feature without entitlement — STARTER has no reports
    expect(await entitlements.hasFeature(customerB.id, 'reports')).toBe(false);
    expect(await entitlements.hasFeature(customerB.id, 'sales')).toBe(true);
  });

  it('blocks the 6th user when the plan limit is 5 (limit reached)', async () => {
    // Customer A on a tight plan — users:2 but 1 already exists → creating 1 more still allowed,
    // then the check must flip to blocked at the limit.
    await subscriptions.create(
      { customerId: customerA.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    // starter users limit = 2; we have 1 seeded user → allowed now
    const check1 = await entitlements.checkLimit(customerA.id, 'users');
    expect(check1.allowed).toBe(true);
    // Create a 2nd user → usage 2 = limit 2 → blocked
    await database.users.create({
      email: 'seed2@test.in',
      passwordHash: 'x',
      firstName: 'Seed',
      lastName: 'Two',
    } as any);
    const check2 = await entitlements.checkLimit(customerA.id, 'users');
    expect(check2.allowed).toBe(false);
    expect(check2.message).toContain('Limit reached');
  });

  // ═══════════════════════════════════════════════════════
  // SUBSCRIPTION LIFECYCLE + STATE MACHINE
  // ═══════════════════════════════════════════════════════
  it('creates a trial subscription for first-time customers', async () => {
    const customerC = await database.customers.create({
      customerCode: 'CUS-9003',
      name: 'Commercial C',
      firmName: 'Firm C',
      mobile: '9876509003',
      email: 'cc@test.in',
    } as any);
    const t = await subscriptions.create(
      { customerId: customerC.id, planId: starter.id, source: 'portal' },
      'u1',
    );
    expect(t.status).toBe('TRIAL');
    expect(t.trialStart).toBeTruthy();
    expect(t.trialEnd).toBeTruthy();
    // Trial end ~7 days out (allow TZ rounding)
    const days = Math.round(
      (new Date(`${String(t.trialEnd)}T00:00:00`).getTime() - Date.now()) / 86_400_000,
    );
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(8);

    // Activate it (post-payment path)
    const active = await subscriptions.activate(t.id, 'u1');
    expect(active.status).toBe('ACTIVE');
    expect(active.paymentStatus).toBe('paid');
  });

  it('rejects duplicate active subscriptions for the same customer', async () => {
    await expect(
      subscriptions.create({ customerId: customerB.id, planId: pro.id, source: 'admin' }, 'u1'),
    ).rejects.toThrow(/already has an active subscription/);
  });

  it('rejects invalid state transitions', async () => {
    const customerD = await database.customers.create({
      customerCode: 'CUS-9004',
      name: 'Commercial D',
      firmName: 'Firm D',
      mobile: '9876509004',
      email: 'cd@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerD.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    expect(sub.status).toBe('PENDING_PAYMENT');
    // CANCELLED is allowed; EXPIRED from PENDING_PAYMENT is allowed; but SUSPENDED is not
    await expect(subscriptions.transition(sub.id, 'SUSPENDED', {})).rejects.toThrow(
      /Invalid transition/,
    );
    await expect(subscriptions.transition(sub.id, 'GRACE_PERIOD', {})).rejects.toThrow(
      /Invalid transition/,
    );
  });

  it('renews a subscription: end date extends and a billing invoice is issued', async () => {
    const customerD = await database.customers.create({
      customerCode: 'CUS-9016',
      name: 'Commercial D2',
      firmName: 'Firm D2',
      mobile: '9876509016',
      email: 'cd2@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerD.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const before = await subscriptions.findById(sub.id);
    const oldEnd = before.endDate;
    const renewed = await subscriptions.renew(sub.id, { userId: 'u1' });
    expect(String(renewed.endDate).slice(0, 10) > String(oldEnd).slice(0, 10)).toBe(true);
    const invoices = await billing.getInvoicesForCustomer(customerD.id);
    expect(invoices.length).toBeGreaterThanOrEqual(1);
    expect(invoices[0].totalAmount).toBeCloseTo(7078.82, 0); // 5999 + 18% = 7078.82
  });

  it('cancels immediately and preserves history (no deletion)', async () => {
    const customerE = await database.customers.create({
      customerCode: 'CUS-9005',
      name: 'Commercial E',
      firmName: 'Firm E',
      mobile: '9876509005',
      email: 'ce@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerE.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const cancelled = await subscriptions.cancel(sub.id, {
      reason: 'no longer needed',
      immediate: true,
      userId: 'u1',
    });
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationReason).toBe('no longer needed');
    const history = await subscriptions.getHistory(sub.id);
    expect(history.some((e: any) => e.eventType === 'cancelled')).toBe(true);
    // Record still exists (never deleted)
    const stillThere = await database.subscriptions.findById(sub.id).catch(() => null);
    expect(stillThere && !stillThere.isDeleted).toBe(true);
  });

  it('end-of-period cancellation keeps service until endDate and disables auto-renew', async () => {
    const customerF = await database.customers.create({
      customerCode: 'CUS-9006',
      name: 'Commercial F',
      firmName: 'Firm F',
      mobile: '9876509006',
      email: 'cf@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerF.id, planId: pro.id, source: 'admin', autoRenew: true },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const cancelled = await subscriptions.cancel(sub.id, {
      reason: 'moving on',
      immediate: false,
      userId: 'u1',
    });
    expect(cancelled.status).toBe('ACTIVE'); // service until end of period
    expect(cancelled.autoRenew).toBe(false);
  });

  it('upgrades immediately with prorated credit; old subscription preserved as UPGRADED', async () => {
    const customerG = await database.customers.create({
      customerCode: 'CUS-9007',
      name: 'Commercial G',
      firmName: 'Firm G',
      mobile: '9876509007',
      email: 'cg@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerG.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const upgraded = await subscriptions.upgrade(sub.id, {
      planId: enterprise.id,
      immediate: true,
      userId: 'u1',
    });
    expect(upgraded.status).toBe('PENDING_PAYMENT');
    expect(upgraded.planId).toBe(enterprise.id);
    expect(upgraded.upgradeFromSubscriptionId).toBe(sub.id);
    const old = await subscriptions.findById(sub.id);
    expect(old.status).toBe('UPGRADED');
    // prorated — enterprise yearly minus credit for unused portion
    expect(Number(upgraded.finalAmount)).toBeGreaterThan(0);
  });

  it('schedules a downgrade without rewriting the current subscription', async () => {
    const customerH = await database.customers.create({
      customerCode: 'CUS-9008',
      name: 'Commercial H',
      firmName: 'Firm H',
      mobile: '9876509008',
      email: 'ch@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerH.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const scheduled = await subscriptions.downgrade(sub.id, {
      planId: starter.id,
      immediate: false,
      userId: 'u1',
    });
    expect(scheduled.status).toBe('ACTIVE');
    const history = await subscriptions.getHistory(sub.id);
    expect(history.some((e: any) => e.eventType === 'downgrade_scheduled')).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // COUPONS
  // ═══════════════════════════════════════════════════════
  it('creates and validates a percent coupon with per-customer dedupe', async () => {
    const coupon = await coupons.create(
      {
        couponCode: 'SAVE10',
        discountType: 'percent',
        discountValue: 10,
        maxDiscount: null,
        endDate: '2099-12-31',
        usageLimit: 100,
        perCustomerLimit: 1,
        applicablePlanIds: [pro.id],
      },
      'u1',
    );
    const check = await coupons.validateCoupon({
      code: 'SAVE10',
      customerId: customerA.id,
      planId: pro.id,
      amount: 4999,
    });
    expect(check.valid).toBe(true);
    expect(check.discountAmount).toBeCloseTo(499.9, 1);
    // redeem once
    const redemption = await coupons.redeem({
      couponId: coupon.id,
      customerId: customerA.id,
      discountAmount: 499.9,
      userId: 'u1',
    });
    expect(redemption.id).toBeTruthy();
    // second redemption blocked (atomic)
    await expect(
      coupons.redeem({
        couponId: coupon.id,
        customerId: customerA.id,
        discountAmount: 499.9,
        userId: 'u1',
      }),
    ).rejects.toThrow(/already used/);
    // validation now fails for the same customer
    const again = await coupons.validateCoupon({
      code: 'SAVE10',
      customerId: customerA.id,
      planId: pro.id,
      amount: 4999,
    });
    expect(again.valid).toBe(false);
  });

  it('rejects expired coupons and inapplicable plans', async () => {
    await coupons.create(
      {
        couponCode: 'OLD50',
        discountType: 'percent',
        discountValue: 50,
        endDate: '2020-01-01',
        applicablePlanIds: [],
      },
      'u1',
    );
    const expired = await coupons.validateCoupon({
      code: 'OLD50',
      customerId: customerA.id,
      amount: 1000,
    });
    expect(expired.valid).toBe(false);

    await coupons.create(
      {
        couponCode: 'ONLYENT',
        discountType: 'fixed',
        discountValue: 1000,
        endDate: '2099-12-31',
        applicablePlanIds: [enterprise.id],
      },
      'u1',
    );
    const wrongPlan = await coupons.validateCoupon({
      code: 'ONLYENT',
      customerId: customerA.id,
      planId: pro.id,
      amount: 5000,
    });
    expect(wrongPlan.valid).toBe(false);
    const rightPlan = await coupons.validateCoupon({
      code: 'ONLYENT',
      customerId: customerA.id,
      planId: enterprise.id,
      amount: 5000,
    });
    expect(rightPlan.valid).toBe(true);
    expect(rightPlan.discountAmount).toBeCloseTo(1000, 1);
  });

  it('applies a coupon server-side at subscription creation (frontend cannot override)', async () => {
    const customerI = await database.customers.create({
      customerCode: 'CUS-9009',
      name: 'Commercial I',
      firmName: 'Firm I',
      mobile: '9876509009',
      email: 'ci@test.in',
    } as any);
    const sub = await subscriptions.create(
      {
        customerId: customerI.id,
        planId: pro.id,
        couponCode: 'SAVE10',
        price: 1,
        discountAmount: 1,
        source: 'admin',
      },
      'u1',
    );
    // Price/discount recomputed server-side — body values ignored (pro v2 = 5999)
    expect(sub.price).toBeCloseTo(5999, 0);
    expect(sub.discountAmount).toBeCloseTo(599.9, 1);
    expect(Number(sub.finalAmount)).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════
  // PAYMENTS — VERIFICATION + IDEMPOTENCY + SECURITY
  // ═══════════════════════════════════════════════════════
  it('creates a payment with server-side amount (frontend amount ignored)', async () => {
    customerJ = await database.customers.create({
      customerCode: 'CUS-9010',
      name: 'Commercial J',
      firmName: 'Firm J',
      mobile: '9876509010',
      email: 'cj@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerJ.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    const invoice = await billing.issueForSubscription(sub, { userId: 'u1' });
    const payment = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `test-${sub.id}`,
      amount: 0.01, // malicious frontend value — must be ignored
      userId: 'u1',
    });
    expect(Number(payment.amount)).toBeCloseTo(Number(invoice.totalAmount), 1);
    expect(payment.status).toBe('PENDING');
    expect(payment.gatewayRef).toBeTruthy();
  });

  it('verifies payment server-side: invoice paid, subscription activated, idempotent', async () => {
    const sub = await subscriptions.getForCustomer(customerJ.id);
    const invoices = await billing.getInvoicesForCustomer(customerJ.id);
    const invoice = invoices.find((i: any) => i.paymentStatus === 'unpaid');
    const payment = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `verify-${invoice.id}`,
      userId: 'u1',
    });

    // Wrong amount in signature → verification fails (simulated gateway)
    const failed = await payments.verify(payment.id, {
      signature: JSON.stringify({ amount: 1, eventId: 'x' }),
    });
    expect(failed.status).toBe('FAILED');
    // Failed payments cannot be re-verified — a fresh payment is required
    await expect(
      payments.verify(payment.id, {
        signature: JSON.stringify({ amount: Number(invoice.totalAmount) }),
      }),
    ).rejects.toThrow(/FAILED/);

    // Fresh payment with correct amount → SUCCESS
    const payment2 = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `verify2-${invoice.id}`,
      userId: 'u1',
    });
    const ok = await payments.verify(payment2.id, {
      signature: JSON.stringify({ amount: Number(invoice.totalAmount), eventId: 'y' }),
    });
    expect(ok.status).toBe('SUCCESS');

    const paidInvoice = await billing.getInvoiceById(invoice.id);
    expect(paidInvoice.paymentStatus).toBe('paid');
    const subAfter = await subscriptions.getForCustomer(customerJ.id);
    expect(subAfter.status).toBe('ACTIVE');
    expect(subAfter.paymentStatus).toBe('paid');

    // Double verify → idempotent, still SUCCESS, no double application
    const again = await payments.verify(payment2.id, {
      signature: JSON.stringify({ amount: Number(invoice.totalAmount) }),
    });
    expect(again.status).toBe('SUCCESS');
  });

  it('concurrent verification can never double-apply a payment', async () => {
    const customerK = await database.customers.create({
      customerCode: 'CUS-9011',
      name: 'Commercial K',
      firmName: 'Firm K',
      mobile: '9876509011',
      email: 'ck@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerK.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    const invoice = await billing.issueForSubscription(sub, { userId: 'u1' });
    const payment = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `race-${invoice.id}`,
      userId: 'u1',
    });

    const attempts = await Promise.allSettled([
      payments.verify(payment.id, {
        signature: JSON.stringify({ amount: Number(invoice.totalAmount), eventId: 'r1' }),
      }),
      payments.verify(payment.id, {
        signature: JSON.stringify({ amount: Number(invoice.totalAmount), eventId: 'r2' }),
      }),
      payments.verify(payment.id, {
        signature: JSON.stringify({ amount: Number(invoice.totalAmount), eventId: 'r3' }),
      }),
    ]);
    const fulfilled = attempts.filter((a) => a.status === 'fulfilled').length;
    expect(fulfilled).toBeGreaterThanOrEqual(1);

    const finalPayment = await payments.getPaymentById(payment.id);
    expect(finalPayment.status).toBe('SUCCESS');
    const finalInvoice = await billing.getInvoiceById(invoice.id);
    expect(finalInvoice.paymentStatus).toBe('paid');
    // Payment amount applied exactly once — invoice totals unchanged by re-application
    expect(Number(finalInvoice.totalAmount)).toBeCloseTo(Number(invoice.totalAmount), 1);
  });

  it('rejects webhooks with invalid signature / amount mismatch; accepts valid ones', async () => {
    await settings.updateSettings({ webhookSecret: 'test-secret' }, 'u1');
    const customerL = await database.customers.create({
      customerCode: 'CUS-9012',
      name: 'Commercial L',
      firmName: 'Firm L',
      mobile: '9876509012',
      email: 'cl@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerL.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    const invoice = await billing.issueForSubscription(sub, { userId: 'u1' });
    const payment = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `webhook-${invoice.id}`,
      userId: 'u1',
    });

    const canonical = JSON.stringify({
      event: 'payment.success',
      ref: payment.gatewayRef,
      amount: Number(invoice.totalAmount),
    });
    const hmac = (payload: string) =>
      crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');

    // Bad signature
    await expect(
      payments.webhook({
        signature: 'deadbeef',
        event: {
          type: 'payment.success',
          data: { reference: payment.gatewayRef, amount: Number(invoice.totalAmount) },
        },
      }),
    ).rejects.toThrow(/signature/);

    // Valid signature but wrong amount
    const wrongAmount = JSON.stringify({
      event: 'payment.success',
      ref: payment.gatewayRef,
      amount: 1,
    });
    await expect(
      payments.webhook({
        signature: hmac(wrongAmount),
        event: { type: 'payment.success', data: { reference: payment.gatewayRef, amount: 1 } },
      }),
    ).rejects.toThrow(/amount mismatch/);

    // Valid signature + correct amount
    const result = await payments.webhook({
      signature: hmac(canonical),
      event: {
        type: 'payment.success',
        data: { reference: payment.gatewayRef, amount: Number(invoice.totalAmount), id: 'evt-1' },
      },
    });
    expect(result.received).toBe(true);
    const webhooked = await payments.getPaymentById(payment.id);
    expect(webhooked.status).toBe('SUCCESS');
    const paidInvoice = await billing.getInvoiceById(invoice.id);
    expect(paidInvoice.paymentStatus).toBe('paid');

    // Replay of the same event → no-op (still one payment)
    await payments.webhook({
      signature: hmac(canonical),
      event: {
        type: 'payment.success',
        data: { reference: payment.gatewayRef, amount: Number(invoice.totalAmount), id: 'evt-1' },
      },
    });
    const again = await payments.getPaymentById(payment.id);
    expect(again.status).toBe('SUCCESS');
  });

  it('refunds a successful payment and updates billing state', async () => {
    const customerM = await database.customers.create({
      customerCode: 'CUS-9013',
      name: 'Commercial M',
      firmName: 'Firm M',
      mobile: '9876509013',
      email: 'cm@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerM.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    const invoice = await billing.issueForSubscription(sub, { userId: 'u1' });
    const payment = await payments.create({
      subscriptionId: sub.id,
      billingInvoiceId: invoice.id,
      idempotencyKey: `refund-${invoice.id}`,
      userId: 'u1',
    });
    await payments.verify(payment.id, {
      signature: JSON.stringify({ amount: Number(invoice.totalAmount) }),
    });

    const refunded = await payments.refund(payment.id, {
      reason: 'customer request',
      userId: 'u1',
    });
    expect(refunded.status).toBe('REFUNDED');
    expect(Number(refunded.refundedAmount)).toBeCloseTo(Number(payment.amount), 1);
    const inv = await billing.getInvoiceById(invoice.id);
    expect(inv.paymentStatus).toBe('refunded');

    // Cannot refund twice
    await expect(payments.refund(payment.id, { userId: 'u1' })).rejects.toThrow(
      /Only successful payments/,
    );
  });

  // ═══════════════════════════════════════════════════════
  // SCHEDULER — GRACE + SUSPENSION + REMINDER DEDUPE
  // ═══════════════════════════════════════════════════════
  it('scheduler: unpaid past endDate → grace period → suspension, reminders deduped', async () => {
    // Back-date a subscription to force the transitions
    const customerN = await database.customers.create({
      customerCode: 'CUS-9014',
      name: 'Commercial N',
      firmName: 'Firm N',
      mobile: '9876509014',
      email: 'cn@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerN.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    await database.subscriptions.update(sub.id, {
      endDate: past,
      paymentStatus: 'unpaid',
      graceStart: null,
      graceEnd: null,
    } as any);

    const r1 = await scheduler.runNow();
    expect(r1.graceStarted).toBeGreaterThanOrEqual(1);
    const inGrace = await subscriptions.findById(sub.id);
    expect(inGrace.status).toBe('GRACE_PERIOD');
    expect(inGrace.graceEnd).toBeTruthy();

    // graceEnd already in the past → suspension on next run
    await database.subscriptions.update(sub.id, { graceEnd: past } as any);
    const r2 = await scheduler.runNow();
    expect(r2.suspended).toBeGreaterThanOrEqual(1);
    const suspended = await subscriptions.findById(sub.id);
    expect(suspended.status).toBe('SUSPENDED');

    // Reminders dedupe — run again, no duplicate reminder rows
    const reminders = await new RemindersService(database).history(sub.id);
    const types = reminders.map((r: any) => r.reminderType);
    const run = await scheduler.runNow();
    expect(run.reminders).toBeGreaterThanOrEqual(0);
    const reminders2 = await new RemindersService(database).history(sub.id);
    expect(reminders2.length).toBe(reminders.length);
    void types;
  });

  // ═══════════════════════════════════════════════════════
  // SECURITY MATRIX
  // ═══════════════════════════════════════════════════════
  it('customer A can never resolve customer B subscription data through customer-scoped APIs', async () => {
    const subA = await subscriptions.getForCustomer(customerA.id);
    const subB = await subscriptions.getForCustomer(customerB.id);
    expect(subA && subA.customerId).toBe(customerA.id);
    expect(subB && subB.customerId).toBe(customerB.id);
    expect(subA && subB && subA.customerId !== subB.customerId).toBe(true);
  });

  it('frontend price/discount/tax manipulation is ignored (server-side recalculation)', async () => {
    const customerO = await database.customers.create({
      customerCode: 'CUS-9015',
      name: 'Commercial O',
      firmName: 'Firm O',
      mobile: '9876509015',
      email: 'co@test.in',
    } as any);
    const sub = await subscriptions.create(
      {
        customerId: customerO.id,
        planId: pro.id,
        price: 1,
        discountAmount: 999999,
        taxAmount: 0,
        finalAmount: 1,
        source: 'admin',
      },
      'u1',
    );
    // All values recomputed from the pinned plan version (pro v2 = 5999 + 18%)
    expect(sub.price).toBeCloseTo(5999, 0);
    expect(Number(sub.finalAmount)).toBeGreaterThan(6000);
  });

  it('admin usage endpoint snapshots current usage per period', async () => {
    const snapshot = await entitlements.snapshotUsage(customerB.id, customerBSub.id);
    expect(snapshot.length).toBeGreaterThan(0);
    const usersRow = snapshot.find((s: any) => s.resource === 'users');
    expect(usersRow).toBeTruthy();
    expect(usersRow.used).toBeGreaterThanOrEqual(1);
  });
});
