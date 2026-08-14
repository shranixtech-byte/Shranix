import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { DatabaseService } from '../database/database.service';
import { publicId } from '../license/numbering';

import { CentralKpisService } from './central-kpis.service';

/**
 * PHASE 16 — CENTRAL COMMERCIAL/LICENSE KPIs (16.2, 16.3) real-DB tests.
 * Aggregations must reflect the seeded commercial/license/security/update
 * state, and trends must bucket by day without unbounded queries.
 */
describe('Central KPIs (real DB)', () => {
  let database: DatabaseService;
  let kpis: CentralKpisService;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'central-kpis-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    database = new DatabaseService(drizzleDb as any);
    kpis = new CentralKpisService(database);

    const now = new Date().toISOString();
    const customer = await database.customers.create({
      customerCode: 'CUS-KPI-1',
      name: 'KPI Customer',
      firmName: 'KPI Firm',
      mobile: '9876500001',
      email: 'kpi@test.in',
    } as any);
    const plan = await database.plans.create({
      planCode: 'KPI-PLAN',
      planName: 'KPI Plan',
      displayName: 'KPI Plan',
      planType: 'monthly',
      billingCycle: 'monthly',
      price: 999,
      features: '{}',
      limits: '{}',
    } as any);
    const planVersion = await database.planVersions.create({
      planId: plan.id,
      version: 1,
      price: 999,
      features: '{}',
      limits: '{}',
      status: 'active',
    } as any);

    await database.subscriptions.create({
      subscriptionNumber: 'SUB-KPI-0001',
      customerId: customer.id,
      planId: plan.id,
      planVersionId: planVersion.id,
      billingCycle: 'monthly',
      startDate: now,
      endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      status: 'ACTIVE',
      autoRenew: true,
      price: 999,
      finalAmount: 999,
      currency: 'INR',
      paymentStatus: 'paid',
      source: 'admin',
    } as any);
    await database.subscriptions.create({
      subscriptionNumber: 'SUB-KPI-0002',
      customerId: customer.id,
      planId: plan.id,
      planVersionId: planVersion.id,
      billingCycle: 'monthly',
      startDate: now,
      endDate: null,
      status: 'TRIAL',
      autoRenew: false,
      price: 0,
      finalAmount: 0,
      currency: 'INR',
      paymentStatus: 'unpaid',
      source: 'portal',
    } as any);

    await database.billingPayments.create({
      paymentNumber: 'PAY-KPI-0001',
      subscriptionId: (await database.subscriptions.findAll({ page: 1, pageSize: 5 } as any))
        .data[0].id,
      customerId: customer.id,
      amount: 999,
      currency: 'INR',
      mode: 'gateway',
      provider: 'simulated',
      status: 'SUCCESS',
      idempotencyKey: publicId('idem'),
      initiatedAt: now,
      completedAt: now,
      createdBy: 'u1',
    } as any);
    await database.billingPayments.create({
      paymentNumber: 'PAY-KPI-0002',
      subscriptionId: (await database.subscriptions.findAll({ page: 1, pageSize: 5 } as any))
        .data[0].id,
      customerId: customer.id,
      amount: 999,
      currency: 'INR',
      mode: 'gateway',
      provider: 'simulated',
      status: 'FAILED',
      idempotencyKey: publicId('idem'),
      initiatedAt: now,
      failureReason: 'insufficient_funds',
      createdBy: 'u1',
    } as any);

    const license = await database.licenses.create({
      licenseNumber: 'SHR-LIC-2026-000777',
      licensePublicId: 'lic_kpi',
      customerId: customer.id,
      subscriptionId: (await database.subscriptions.findAll({ page: 1, pageSize: 5 } as any))
        .data[0].id,
      planId: plan.id,
      planVersionId: planVersion.id,
      licenseType: 'standard',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      maxDevices: 2,
      activeDevices: 1,
      entitlements: '{}',
      limits: '{}',
      issuedAt: now,
      startsAt: now,
    } as any);

    await database.licenseDevices.create({
      devicePublicId: 'dev_kpi_1',
      licenseId: license.id,
      customerId: customer.id,
      deviceIdentifierHash: 'h'.repeat(64),
      deviceName: 'KPI PC',
      platform: 'windows',
      status: 'active',
      firstSeenAt: now,
      lastSeenAt: now,
    } as any);

    await database.licenseActivations.create({
      activationPublicId: 'act_kpi_1',
      licenseId: license.id,
      deviceId: (await database.licenseDevices.findAll({ page: 1, pageSize: 5 } as any)).data[0].id,
      activationType: 'online',
      status: 'ACTIVE',
      activationReference: 'act-ref-kpi',
      requestedAt: now,
      approvedAt: now,
      requestedBy: 'u1',
      approvedBy: 'u1',
    } as any);

    await database.licenseEvents.create({
      licenseId: license.id,
      eventType: 'VALIDATION_FAILED',
      eventTime: now,
      source: 'api',
    } as any);

    await database.securityEvents.create({
      eventId: 'sev_kpi_1',
      eventType: 'SIGNATURE_FAILURE',
      severity: 'HIGH',
      eventTime: now,
      source: 'api',
      responseLevel: 3,
    } as any);
    await database.securityEvents.create({
      eventId: 'sev_kpi_2',
      eventType: 'REPLAY_DETECTED',
      severity: 'MEDIUM',
      eventTime: now,
      source: 'webhook',
      responseLevel: 2,
    } as any);
  });

  it('aggregates commercial KPIs from the seeded subscriptions and payments', async () => {
    const commercial = await kpis.commercialKpis();
    expect(commercial.customers.total).toBe(1);
    expect(commercial.subscriptions.active).toBe(1);
    expect(commercial.subscriptions.trial).toBe(1);
    expect(commercial.payments.successful).toBe(1);
    expect(commercial.payments.failed).toBe(1);
    // MRR = 1 active monthly sub @ 999
    expect(commercial.revenue.mrr).toBe(999);
    expect(commercial.revenue.arr).toBe(999 * 12);
  });

  it('aggregates license KPIs — devices, slots, activations, failures', async () => {
    const license = await kpis.licenseKpis();
    expect(license.licenses.total).toBe(1);
    expect(license.licenses.active).toBe(1);
    expect(license.devices.activeDevices).toBe(1);
    // 1 ACTIVE license with maxDevices 2, activeDevices 1 → 1 slot free
    expect(license.devices.availableSlots).toBe(1);
    expect(license.activations.total).toBe(1);
    expect(license.lifecycle.validationFailures).toBe(1);
  });

  it('aggregates security KPIs by severity and type', async () => {
    const security = await kpis.securityKpis(30);
    expect(security.total).toBeGreaterThanOrEqual(2);
    expect(security.bySeverity.HIGH).toBe(1);
    expect(security.tokenFailures).toBeGreaterThanOrEqual(1);
    expect(security.replayAttempts).toBe(1);
  });

  it('produces day-bucketed trend series for the window', async () => {
    const trends = await kpis.trends(7);
    expect(trends.windowDays).toBe(7);
    expect(trends.days.length).toBe(7);
    // Today's activation + payments land in the last bucket
    const last = trends.activationsPerDay.length - 1;
    expect(trends.activationsPerDay[last]).toBeGreaterThanOrEqual(1);
    expect(trends.paymentsPerDay[last]).toBeGreaterThanOrEqual(2);
    expect(trends.failedPaymentsPerDay[last]).toBeGreaterThanOrEqual(1);
    expect(trends.securityEventsPerDay[last]).toBeGreaterThanOrEqual(2);
  });

  it('admin search finds customers, licenses and activations by reference', async () => {
    const byCustomer = await kpis.search('KPI Customer');
    expect(byCustomer.results.some((r: any) => r.type === 'customer')).toBe(true);
    const byLicense = await kpis.search('SHR-LIC-2026-000777', 'license');
    expect(byLicense.results.some((r: any) => r.type === 'license')).toBe(true);
    const byActivation = await kpis.search('act-ref-kpi', 'activation');
    expect(byActivation.results.some((r: any) => r.type === 'activation')).toBe(true);
    const empty = await kpis.search('');
    expect(empty.total).toBe(0);
  });

  it('KPI caching: same result within TTL, recomputed after expiry (data only, never authz)', async () => {
    const clock = { now: Date.now() };
    const cached = new CentralKpisService(database, () => clock.now);

    return (async () => {
      const first = await cached.commercialKpis();
      const second = await cached.commercialKpis();
      // Within TTL → cached instance returned (same reference).
      expect(second).toBe(first);

      // Advance past the 60 s TTL → recomputed (fresh object).
      clock.now = Date.now() + 61_000;
      const third = await cached.commercialKpis();
      expect(third).not.toBe(first);
      expect(third.customers.total).toBe(first.customers.total);

      // Authorization is NOT cached — this service never sees guard decisions.
      const live = new CentralKpisService(database);
      const fresh = await live.commercialKpis();
      expect(fresh).not.toBe(third);
    })();
  });

  it('system health reports all services up with a live database', async () => {
    const health = await kpis.systemHealth();
    expect(health.services.length).toBe(5);
    for (const s of health.services) {
      expect(['up', 'degraded']).toContain(s.status);
    }
    const db = health.services.find((s: any) => s.service === 'database');
    expect(db.status).toBe('up');
  });
});
