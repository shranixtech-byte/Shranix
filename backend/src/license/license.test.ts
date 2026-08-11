import * as crypto from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { GlPostingEngine } from '../automation/gl-posting.engine';
import { TransactionManager } from '../automation/transaction.manager';
import { BillingService } from '../commercial/services/billing.service';
import { CouponsService } from '../commercial/services/coupons.service';
import { EntitlementsService } from '../commercial/services/entitlements.service';
import { PlansService } from '../commercial/services/plans.service';
import { SubscriptionsService } from '../commercial/services/subscriptions.service';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { PortalLicenseService } from '../portal/services/portal-license.service';

import { LicenseActivationsService } from './services/license-activations.service';
import { LicenseDevicesService } from './services/license-devices.service';
import { LicenseEventsService } from './services/license-events.service';
import { LicenseSchedulerService } from './services/license-scheduler.service';
import { LicenseTokensService } from './services/license-tokens.service';
import { LicenseValidationService } from './services/license-validation.service';
import { LicensesService } from './services/licenses.service';

/**
 * REAL-DB integration tests for the Phase-13 License Management Engine.
 *
 * Covers: license creation from subscription (numbering, public ids, limits
 * derived from plan), one-license-per-subscription, device registration
 * (hashed identifiers), activation limits with a concurrent race, validation
 * (controlled response, revoked/expired/device checks), subscription→license
 * expiry sync + renewal extension, upgrade entitlement refresh, downgrade
 * device-resolution guard, revocation/reactivation, device transfer, customer
 * isolation through the portal service, idempotent activations, and signed
 * token signature/expiry/audience security.
 */
describe('License module (real DB)', () => {
  let database: DatabaseService;
  let licenses: LicensesService;
  let devices: LicenseDevicesService;
  let activations: LicenseActivationsService;
  let validation: LicenseValidationService;
  let tokens: LicenseTokensService;
  let events: LicenseEventsService;
  let scheduler: LicenseSchedulerService;
  let portal: PortalLicenseService;
  let entitlements: EntitlementsService;
  let subscriptions: SubscriptionsService;

  let customerA: any;
  let customerB: any;
  let starter: any;
  let pro: any;
  let twoDevice: any;
  let licenseA: any;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'license-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);

    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );

    database = new DatabaseService(drizzleDb as any);
    const audit = new AuditService(database, {
      getIp: () => null,
      getUserAgent: () => null,
    } as any);
    const tm = new TransactionManager(database);
    const gl = new GlPostingEngine(database, tm);
    const plans = new PlansService(database, audit);
    const coupons = new CouponsService(database, audit);
    entitlements = new EntitlementsService(database);
    const billing = new BillingService(database, audit, gl);
    subscriptions = new SubscriptionsService(database, audit, coupons, entitlements, billing);
    events = new LicenseEventsService(database);
    tokens = new LicenseTokensService(database);
    licenses = new LicensesService(database, audit, entitlements, events, tokens);
    devices = new LicenseDevicesService(database, audit, licenses, events);
    activations = new LicenseActivationsService(database, audit, licenses, devices, events);
    validation = new LicenseValidationService(database, entitlements, licenses, events);
    tokens = new LicenseTokensService(database);
    scheduler = new LicenseSchedulerService(database, licenses, events);
    portal = new PortalLicenseService(database, licenses, devices, activations, events, audit);

    // ── Master data ──────────────────────────────────────
    customerA = await database.customers.create({
      customerCode: 'CUS-8001',
      name: 'License A',
      firmName: 'Firm LA',
      mobile: '9876508001',
      email: 'la@test.in',
    } as any);
    customerB = await database.customers.create({
      customerCode: 'CUS-8002',
      name: 'License B',
      firmName: 'Firm LB',
      mobile: '9876508002',
      email: 'lb@test.in',
    } as any);

    starter = await plans.create(
      {
        planCode: 'STARTER',
        planName: 'Starter',
        displayName: 'Starter',
        planType: 'monthly',
        billingCycle: 'monthly',
        trialPeriodDays: 0,
        gracePeriodDays: 3,
        price: 999,
        discountPercent: 0,
        taxRate: 18,
        features: { sales: true, purchase: true, reports: false, hr: false },
        limits: { users: 2, devices: 1, branches: 1, installations: 1 },
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
        features: { sales: true, purchase: true, inventory: true, accounts: true, reports: true },
        limits: { users: 10, devices: 2, branches: 1, installations: 2 },
      },
      'u1',
    );
    twoDevice = await plans.create(
      {
        planCode: 'DEV2',
        planName: 'Two Device',
        displayName: 'Two Device',
        planType: 'monthly',
        billingCycle: 'monthly',
        trialPeriodDays: 0,
        gracePeriodDays: 3,
        price: 1499,
        discountPercent: 0,
        taxRate: 18,
        features: { sales: true },
        limits: { users: 3, devices: 2, branches: 1, installations: 2 },
      },
      'u1',
    );
  });

  // ═══════════════════════════════════════════════════════
  // LICENSE CREATION + SUBSCRIPTION MAPPING
  // ═══════════════════════════════════════════════════════
  it('creates a license from an active subscription with numbering + public id + plan limits', async () => {
    const sub = await subscriptions.create(
      { customerId: customerA.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    licenseA = await licenses.createFromSubscription(sub.id, { userId: 'u1' });

    expect(licenseA.licenseNumber).toMatch(/^SHR-LIC-\d{4}-\d{6}$/);
    expect(licenseA.licensePublicId).toMatch(/^lic_[0-9a-f]+$/);
    expect(licenseA.customerId).toBe(customerA.id);
    expect(licenseA.subscriptionId).toBe(sub.id);
    expect(licenseA.status).toBe('ACTIVE');
    expect(licenseA.licenseType).toBe('PROFESSIONAL');
    // Limits derived from the subscribed plan version — never hardcoded
    expect(licenseA.maxUsers).toBe(10);
    expect(licenseA.maxDevices).toBe(2);
    expect(licenseA.maxBranches).toBe(1);
    expect(licenseA.maxInstallations).toBe(2);
    // Entitlement snapshot
    expect(licenseA.entitlements.sales).toBe(true);
    expect(licenseA.entitlements.hr).toBe(undefined);
    // Expiry follows the subscription
    expect(String(licenseA.expiresAt).slice(0, 10)).toBe(String(sub.endDate).slice(0, 10));
  });

  it('never creates a duplicate license for the same subscription', async () => {
    const again = await licenses.createFromSubscription(licenseA.subscriptionId, { userId: 'u1' });
    expect(again.id).toBe(licenseA.id);
  });

  it('derives TRIAL license type from trial plans and STANDARD from starter', async () => {
    const trialPlan = await new PlansService(
      database,
      new AuditService(database, { getIp: () => null, getUserAgent: () => null } as any),
    ).create(
      {
        planCode: 'TRYP',
        planName: 'Try',
        displayName: 'Try',
        planType: 'trial',
        billingCycle: 'monthly',
        trialPeriodDays: 7,
        gracePeriodDays: 2,
        price: 0,
        discountPercent: 0,
        taxRate: 0,
        features: { sales: true },
        limits: { users: 1, devices: 1 },
      },
      'u1',
    );
    const customerC = await database.customers.create({
      customerCode: 'CUS-8003',
      name: 'License C',
      firmName: 'Firm LC',
      mobile: '9876508003',
      email: 'lc@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerC.id, planId: trialPlan.id, source: 'admin' },
      'u1',
    );
    const lic = await licenses.createFromSubscription(sub.id);
    expect(lic.licenseType).toBe('TRIAL');
    expect(lic.status).toBe('ACTIVE');
  });

  // ═══════════════════════════════════════════════════════
  // DEVICES — hashed identifiers, idempotent registration
  // ═══════════════════════════════════════════════════════
  it('registers devices storing only hashed identifiers', async () => {
    const first = await devices.registerDevice(licenseA.licensePublicId, {
      deviceIdentifierHash: 'raw-machine-id-1',
      deviceName: 'Office PC',
      platform: 'windows',
      os: 'Windows 11',
      applicationVersion: '1.0.0',
      userId: 'u1',
    });
    expect(first.created).toBe(true);
    // Raw identifier is never stored — only its sha256
    expect(first.device.deviceIdentifierHash).not.toContain('raw-machine-id-1');
    expect(first.device.deviceIdentifierHash).toHaveLength(64);

    const again = await devices.registerDevice(licenseA.licensePublicId, {
      deviceIdentifierHash: 'raw-machine-id-1',
      deviceName: 'Office PC',
      userId: 'u1',
    });
    expect(again.created).toBe(false);
    expect(again.device.id).toBe(first.device.id);

    const list = await devices.listDevices(licenseA.id);
    expect(list.some((d: any) => d.deviceName === 'Office PC')).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // ACTIVATIONS + DEVICE LIMITS
  // ═══════════════════════════════════════════════════════
  it('activates devices up to max_devices then rejects with LIMIT_REACHED (no silent deactivation)', async () => {
    const customerD = await database.customers.create({
      customerCode: 'CUS-8004',
      name: 'License D',
      firmName: 'Firm LD',
      mobile: '9876508004',
      email: 'ld@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerD.id, planId: twoDevice.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    expect(lic.maxDevices).toBe(2);

    const a1 = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `ref-d1-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'dev-d1',
      deviceName: 'Device D1',
      userId: 'u1',
    });
    expect(a1.status).toBe('ACTIVE');

    const a2 = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `ref-d2-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'dev-d2',
      deviceName: 'Device D2',
      userId: 'u1',
    });
    expect(a2.status).toBe('ACTIVE');

    // Third device — limit reached
    const a3 = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `ref-d3-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'dev-d3',
      deviceName: 'Device D3',
      userId: 'u1',
    });
    expect(a3.status).toBe('REJECTED');
    expect(a3.reason).toBe('ACTIVATION_LIMIT_REACHED');

    // LIMIT_REACHED event recorded; D1 and D2 untouched
    const evts = await events.list(lic.id);
    expect(evts.some((e: any) => e.eventType === 'LIMIT_REACHED')).toBe(true);
    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(2);
  });

  it('concurrent activations can never exceed max_devices (race guard)', async () => {
    const customerE = await database.customers.create({
      customerCode: 'CUS-8005',
      name: 'License E',
      firmName: 'Firm LE',
      mobile: '9876508005',
      email: 'le@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerE.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    expect(lic.maxDevices).toBe(1);

    const attempts = await Promise.allSettled([
      activations.requestActivation({
        licenseReference: lic.licensePublicId,
        activationReference: `race-a-${crypto.randomBytes(4).toString('hex')}`,
        deviceIdentifierHash: 'race-dev-a',
        userId: 'u1',
      }),
      activations.requestActivation({
        licenseReference: lic.licensePublicId,
        activationReference: `race-b-${crypto.randomBytes(4).toString('hex')}`,
        deviceIdentifierHash: 'race-dev-b',
        userId: 'u1',
      }),
    ]);
    const results = attempts.filter((a) => a.status === 'fulfilled').map((a: any) => a.value);
    const active = results.filter((r: any) => r.status === 'ACTIVE').length;
    expect(active).toBe(1);
    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(1);
  });

  it('activation is idempotent — same reference never creates a duplicate', async () => {
    const ref = `idem-${crypto.randomBytes(4).toString('hex')}`;
    const customerF = await database.customers.create({
      customerCode: 'CUS-8006',
      name: 'License F',
      firmName: 'Firm LF',
      mobile: '9876508006',
      email: 'lf@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerF.id, planId: twoDevice.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);

    const r1 = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: ref,
      deviceIdentifierHash: 'idem-dev',
      userId: 'u1',
    });
    const r2 = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: ref,
      deviceIdentifierHash: 'idem-dev',
      userId: 'u1',
    });
    expect(r2.id).toBe(r1.id);
    const all = await activations.list(lic.id);
    expect(all.filter((a: any) => a.activationReference === ref).length).toBe(1);
  });

  // ═══════════════════════════════════════════════════════
  // VALIDATION — controlled response
  // ═══════════════════════════════════════════════════════
  it('validates an active license with controlled entitlements + limits', async () => {
    const registered = await devices.registerDevice(licenseA.licensePublicId, {
      deviceIdentifierHash: 'validate-dev',
      deviceName: 'Validate PC',
      userId: 'u1',
    });
    await activations.requestActivation({
      licenseReference: licenseA.licensePublicId,
      activationReference: `val-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'validate-dev',
      userId: 'u1',
    });
    const result = await validation.validateLicense({
      licenseReference: licenseA.licensePublicId,
      deviceIdentifierHash: 'validate-dev',
      installationId: registered.installation.installationPublicId,
      applicationVersion: '1.0.0',
      source: 'installer',
    });
    expect(result.valid).toBe(true);
    expect(result.status).toBe('ACTIVE');
    expect(result.licenseReference).toBe(licenseA.licensePublicId);
    expect(result.entitlements).toContain('sales');
    expect(result.entitlements).not.toContain('hr');
    expect(result.limits.devices).toBe(2);
    expect(result.validationReference).toMatch(/^val_/);
    // Never leaks internals
    expect(result).not.toHaveProperty('machineFingerprintHash');
    expect(result).not.toHaveProperty('deviceIdentifierHash');
  });

  it('fails validation for unknown licenses and unregistered devices', async () => {
    const unknown = await validation.validateLicense({ licenseReference: 'lic_deadbeef0000' });
    expect(unknown.valid).toBe(false);
    expect(unknown.reason).toBe('LICENSE_NOT_FOUND');

    const noDevice = await validation.validateLicense({
      licenseReference: licenseA.licensePublicId,
      deviceIdentifierHash: 'never-registered-device',
    });
    expect(noDevice.valid).toBe(false);
    expect(noDevice.reason).toBe('DEVICE_NOT_REGISTERED');
  });

  it('fails validation for a foreign installation (installation not authorized)', async () => {
    const customerG = await database.customers.create({
      customerCode: 'CUS-8007',
      name: 'License G',
      firmName: 'Firm LG',
      mobile: '9876508007',
      email: 'lg@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerG.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const otherInstallation = await devices.registerDevice(lic.licensePublicId, {
      deviceIdentifierHash: 'other-install-dev',
      userId: 'u1',
    });
    const result = await validation.validateLicense({
      licenseReference: licenseA.licensePublicId,
      installationId: otherInstallation.installation.installationPublicId,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INSTALLATION_NOT_AUTHORIZED');
  });

  // ═══════════════════════════════════════════════════════
  // EXPIRY SYNC + RENEWAL + UPGRADE + DOWNGRADE
  // ═══════════════════════════════════════════════════════
  it('syncs license to EXPIRED when the subscription expires', async () => {
    await database.subscriptions.update(licenseA.subscriptionId, {
      endDate: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
      status: 'EXPIRED',
    } as any);
    const synced = await licenses.syncFromSubscription(
      licenseA,
      await database.subscriptions.findById(licenseA.subscriptionId),
    );
    expect(synced.status).toBe('EXPIRED');
    const evts = await events.list(licenseA.id);
    expect(evts.some((e: any) => e.eventType === 'LICENSE_EXPIRED')).toBe(true);
  });

  it('reactivates an expired license when the subscription is restored (LICENSE_REACTIVATED + LICENSE_RENEWED)', async () => {
    // Admin restores the subscription (simulated renewal) — back to ACTIVE + future end
    const restoredEnd = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await database.subscriptions.update(licenseA.subscriptionId, {
      status: 'ACTIVE',
      endDate: restoredEnd,
      paymentStatus: 'paid',
    } as any);
    const rawSub = await database.subscriptions.findById(licenseA.subscriptionId);
    const freshLicense = await licenses.findById(licenseA.id); // never sync a stale object
    const synced = await licenses.syncFromSubscription(freshLicense, rawSub);
    expect(synced.status).toBe('ACTIVE');
    const evts = await events.list(licenseA.id);
    expect(evts.some((e: any) => e.eventType === 'LICENSE_REACTIVATED')).toBe(true);

    // Subscription renewed again → expiry extended + LICENSE_RENEWED recorded
    const laterEnd = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
    await database.subscriptions.update(licenseA.subscriptionId, { endDate: laterEnd } as any);
    const rawSub2 = await database.subscriptions.findById(licenseA.subscriptionId);
    const freshLicense2 = await licenses.findById(licenseA.id);
    await licenses.syncFromSubscription(freshLicense2, rawSub2);
    const evts2 = await events.list(licenseA.id);
    const renewedEvt = evts2.find((e: any) => e.eventType === 'LICENSE_RENEWED');
    expect(renewedEvt).toBeTruthy();
    expect(String(renewedEvt.metadata).includes('newExpiry')).toBe(true);
    const after = await licenses.findById(licenseA.id);
    expect(String(after.expiresAt).slice(0, 10)).toBe(laterEnd);
  });

  it('upgrade refresh updates license entitlements to the new plan without deleting devices', async () => {
    const customerH = await database.customers.create({
      customerCode: 'CUS-8008',
      name: 'License H',
      firmName: 'Firm LH',
      mobile: '9876508008',
      email: 'lh@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerH.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    await devices.registerDevice(lic.licensePublicId, {
      deviceIdentifierHash: 'upgrade-dev',
      userId: 'u1',
    });

    const upgraded = await subscriptions.upgrade(sub.id, {
      planId: pro.id,
      immediate: true,
      userId: 'u1',
    });
    await licenses.syncEntitlementsToSubscription(
      lic.id,
      await database.subscriptions.findById(upgraded.id),
      { userId: 'u1' },
    );

    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.maxDevices).toBe(2); // pro
    expect(refreshed.entitlements.accounts).toBe(true);
    // Devices are never deleted on upgrade
    const devs = await devices.listDevices(lic.id);
    expect(devs.some((d: any) => d.deviceName === 'upgrade-dev' || d.deviceIdentifierHash)).toBe(
      true,
    );
  });

  it('downgrade guard returns DEVICE_RESOLUTION when active devices exceed the target limit', async () => {
    const customerI = await database.customers.create({
      customerCode: 'CUS-8009',
      name: 'License I',
      firmName: 'Firm LI',
      mobile: '9876508009',
      email: 'li@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerI.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `dg-1-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'dg-dev-1',
      userId: 'u1',
    });
    await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `dg-2-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'dg-dev-2',
      userId: 'u1',
    });
    // pro = 2 active devices; downgrade to starter (devices:1)
    const check = await licenses.validateDowngrade(lic.id, starter.id);
    expect(check.ok).toBe(false);
    expect(check.code).toBe('DOWNGRADE_REQUIRES_DEVICE_RESOLUTION');
    expect(check.activeDevices).toBe(2);
    expect(check.targetMaxDevices).toBe(1);
  });

  // ═══════════════════════════════════════════════════════
  // REVOCATION + REACTIVATION
  // ═══════════════════════════════════════════════════════
  it('revokes a license with reason; validation fails; new activations blocked', async () => {
    const customerJ = await database.customers.create({
      customerCode: 'CUS-8010',
      name: 'License J',
      firmName: 'Firm LJ',
      mobile: '9876508010',
      email: 'lj@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerJ.id, planId: twoDevice.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);

    const revoked = await licenses.revoke(lic.id, {
      reason: 'Fraudulent chargeback',
      userId: 'u1',
    });
    expect(revoked.status).toBe('REVOKED');
    expect(revoked.revocationReason).toBe('Fraudulent chargeback');

    const v = await validation.validateLicense({ licenseReference: lic.licensePublicId });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('LICENSE_REVOKED');

    await expect(
      activations.requestActivation({
        licenseReference: lic.licensePublicId,
        activationReference: `rev-${crypto.randomBytes(4).toString('hex')}`,
        deviceIdentifierHash: 'rev-dev',
        userId: 'u1',
      }),
    ).rejects.toThrow(/REVOKED/);

    const evts = await events.list(lic.id);
    expect(evts.some((e: any) => e.eventType === 'LICENSE_REVOKED')).toBe(true);
    // Record preserved — never deleted
    const stillThere = await database.licenses.findById(lic.id);
    expect(stillThere && !stillThere.isDeleted).toBe(true);
  });

  it('reactivates a revoked license when the subscription is eligible (authorized action)', async () => {
    const lic = await licenses.findByNumber(licenseA.licenseNumber);
    // Subscription is ACTIVE (restored in the previous test) → eligible
    const revoked = await licenses.revoke(lic.id, { reason: 'Security review', userId: 'u1' });
    expect(revoked.status).toBe('REVOKED');
    const reactivated = await licenses.reactivate(lic.id, {
      reason: 'Issue resolved',
      userId: 'u1',
    });
    expect(reactivated.status).toBe('ACTIVE');
    expect(reactivated.revocationReason).toBe(null);
    const evts = await events.list(lic.id);
    expect(
      evts.filter((e: any) => e.eventType === 'LICENSE_REACTIVATED').length,
    ).toBeGreaterThanOrEqual(1);
    // Revoked → reactivate again is still possible while eligible
    const revoked2 = await licenses.revoke(lic.id, { reason: 'New review', userId: 'u1' });
    expect(revoked2.status).toBe('REVOKED');
  });

  it('blocks reactivation when the subscription is not eligible', async () => {
    const customerK = await database.customers.create({
      customerCode: 'CUS-8011',
      name: 'License K',
      firmName: 'Firm LK',
      mobile: '9876508011',
      email: 'lk@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerK.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    await licenses.revoke(lic.id, { reason: 'Contract terminated', userId: 'u1' });
    await subscriptions.cancel(sub.id, { reason: 'ended', immediate: true, userId: 'u1' });
    await expect(licenses.reactivate(lic.id, { reason: 'no', userId: 'u1' })).rejects.toThrow(
      /not eligible/,
    );
  });

  // ═══════════════════════════════════════════════════════
  // DEVICE DEACTIVATION + TRANSFER
  // ═══════════════════════════════════════════════════════
  it('deactivation frees a slot and preserves history', async () => {
    const customerL = await database.customers.create({
      customerCode: 'CUS-8012',
      name: 'License L',
      firmName: 'Firm LL',
      mobile: '9876508012',
      email: 'll@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerL.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const act = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `deact-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'old-laptop',
      deviceName: 'Old Laptop',
      userId: 'u1',
    });
    expect(act.status).toBe('ACTIVE');

    const deactivated = await devices.deactivateDevice(
      lic.licensePublicId,
      act.device.devicePublicId,
      {
        reason: 'Replaced laptop',
        userId: 'u1',
      },
    );
    expect(deactivated.device.status).toBe('inactive');

    // Slot freed — a new device can activate
    const fresh = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `new-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'new-laptop',
      deviceName: 'New Laptop',
      userId: 'u1',
    });
    expect(fresh.status).toBe('ACTIVE');

    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(1);
    const evts = await events.list(lic.id);
    expect(evts.some((e: any) => e.eventType === 'DEVICE_DEACTIVATED')).toBe(true);
    // Old activation preserved as DEACTIVATED (never deleted)
    const oldAct = await activations.findById(act.id);
    expect(oldAct.status).toBe('DEACTIVATED');
  });

  it('device transfer deactivates old and activates new, keeping one slot consumed', async () => {
    const customerM = await database.customers.create({
      customerCode: 'CUS-8013',
      name: 'License M',
      firmName: 'Firm LM',
      mobile: '9876508013',
      email: 'lm@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerM.id, planId: twoDevice.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const act = await activations.requestActivation({
      licenseReference: lic.licensePublicId,
      activationReference: `tr-${crypto.randomBytes(4).toString('hex')}`,
      deviceIdentifierHash: 'old-machine',
      deviceName: 'Old Machine',
      userId: 'u1',
    });

    const transfer = await devices.requestTransfer(lic.licensePublicId, {
      transferPublicId: `trf-${crypto.randomBytes(4).toString('hex')}`,
      fromDevicePublicId: act.device.devicePublicId,
      toDeviceIdentifierHash: 'new-machine',
      toDeviceName: 'New Machine',
      reason: 'Hardware upgrade',
      userId: 'u1',
    });
    expect(transfer.status).toBe('pending');

    const done = await devices.approveTransfer(transfer.id, { userId: 'u1' });
    expect(done.status).toBe('completed');

    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(1); // old freed, new consumed — same 1 slot
    const devs = await devices.listDevices(lic.id);
    const old = devs.find((d: any) => d.deviceName === 'Old Machine');
    const fresh = devs.find((d: any) => d.deviceName === 'New Machine');
    expect(old.status).toBe('inactive');
    expect(fresh.status).toBe('active');
    const evts = await events.list(lic.id);
    expect(
      evts.filter((e: any) => e.eventType === 'DEVICE_TRANSFERRED').length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════
  // SCHEDULER — ORPHAN EXPIRY
  // ═══════════════════════════════════════════════════════
  it('scheduler expires orphaned licenses past validity', async () => {
    const customerN = await database.customers.create({
      customerCode: 'CUS-8014',
      name: 'License N',
      firmName: 'Firm LN',
      mobile: '9876508014',
      email: 'ln@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerN.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    await database.licenses.update(lic.id, { expiresAt: past } as any);
    await database.subscriptions.softDelete(sub.id);
    const result = await scheduler.syncAll();
    expect(result.synced).toBeGreaterThanOrEqual(0);
    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.status).toBe('EXPIRED');
  });

  // ═══════════════════════════════════════════════════════
  // TOKEN SECURITY
  // ═══════════════════════════════════════════════════════
  it('issues and verifies a signed token; tampering is rejected', async () => {
    const customerO = await database.customers.create({
      customerCode: 'CUS-8015',
      name: 'License O',
      firmName: 'Firm LO',
      mobile: '9876508015',
      email: 'lo@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerO.id, planId: pro.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);

    const issued = await tokens.issueToken(lic, { ttlDays: 30, userId: 'u1' });
    expect(issued.token).toMatch(/^SHRNXT1\./);

    const verified = await tokens.verifyToken(issued.token);
    expect(verified.payload.sub).toBe(lic.licensePublicId);
    expect(verified.payload.limits.devices).toBe(2);
    expect(verified.payload.features).toContain('sales');

    // Tampered payload — signature no longer matches
    const parts = issued.token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...verified.payload, limits: { devices: 999 } }),
      'utf8',
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const forged = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    await expect(tokens.verifyToken(forged)).rejects.toThrow(/signature invalid/);
  });

  it('rejects tokens with wrong audience/issuer and expired tokens', async () => {
    const customerP = await database.customers.create({
      customerCode: 'CUS-8016',
      name: 'License P',
      firmName: 'Firm LP',
      mobile: '9876508016',
      email: 'lp@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerP.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);

    // Build a token signed with the same key but wrong audience / past expiry
    const keys = await tokens.getKeys();
    const now = Math.floor(Date.now() / 1000);
    const make = (payload: any) => {
      const body = Buffer.from(JSON.stringify(payload), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const sig = crypto
        .sign('sha256', Buffer.from(body, 'utf8'), keys.privatePem)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `SHRNXT1.${body}.${sig}`;
    };
    const wrongAud = make({
      ver: 1,
      iss: 'shranix-license-server',
      aud: 'someone-else',
      sub: lic.licensePublicId,
      cus: lic.customerId,
      iat: now,
      exp: now + 3600,
      jti: 'x-aud',
    });
    await expect(tokens.verifyToken(wrongAud)).rejects.toThrow(/issuer\/audience/);
    const expired = make({
      ver: 1,
      iss: 'shranix-license-server',
      aud: 'shranix-erp',
      sub: lic.licensePublicId,
      cus: lic.customerId,
      iat: now - 7200,
      exp: now - 3600,
      jti: 'x-exp',
    });
    await expect(tokens.verifyToken(expired)).rejects.toThrow(/expired/);
  });

  it('revoking a token makes verification fail', async () => {
    const customerQ = await database.customers.create({
      customerCode: 'CUS-8017',
      name: 'License Q',
      firmName: 'Firm LQ',
      mobile: '9876508017',
      email: 'lq@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerQ.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const issued = await tokens.issueToken(lic, { ttlDays: 30 });
    await tokens.revokeToken(issued.jti, 'admin decision');
    await expect(tokens.verifyToken(issued.token)).rejects.toThrow(/revoked/);
  });

  it('revoking a license immediately invalidates its outstanding tokens (no leak)', async () => {
    const customerR = await database.customers.create({
      customerCode: 'CUS-8018',
      name: 'License R',
      firmName: 'Firm LR',
      mobile: '9876508018',
      email: 'lr@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerR.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const issued = await tokens.issueToken(lic, { ttlDays: 30 });
    await expect(tokens.verifyToken(issued.token)).resolves.toMatchObject({ valid: true });

    await licenses.revoke(lic.id, { reason: 'Chargeback', userId: 'u1' });
    await expect(tokens.verifyToken(issued.token)).rejects.toThrow(/REVOKED|revoked|invalid/);
  });

  it('license suspension sync also invalidates tokens', async () => {
    const customerS = await database.customers.create({
      customerCode: 'CUS-8019',
      name: 'License S',
      firmName: 'Firm LS',
      mobile: '9876508019',
      email: 'ls@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerS.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    const issued = await tokens.issueToken(lic, { ttlDays: 30 });

    await database.subscriptions.update(sub.id, { status: 'SUSPENDED' } as any);
    const rawSub = await database.subscriptions.findById(sub.id);
    const freshLic = await licenses.findById(lic.id);
    await licenses.syncFromSubscription(freshLic, rawSub);
    const synced = await licenses.findById(lic.id);
    expect(synced.status).toBe('SUSPENDED');
    await expect(tokens.verifyToken(issued.token)).rejects.toThrow(/SUSPENDED|revoked|invalid/);
  });

  // ═══════════════════════════════════════════════════════
  // CUSTOMER ISOLATION (portal surface)
  // ═══════════════════════════════════════════════════════
  it('portal overview only returns the authenticated customer\u2019s own license', async () => {
    const subB = await subscriptions.create(
      { customerId: customerB.id, planId: starter.id, source: 'portal' },
      'u1',
    );
    await subscriptions.activate(subB.id, 'u1');
    await licenses.createFromSubscription(subB.id);
    // Give B one registered device so the isolation test below has a target
    await devices.registerDevice((await licenses.getForCustomer(customerB.id)).licensePublicId, {
      deviceIdentifierHash: 'b-owned-device',
      deviceName: 'B Device',
      userId: 'u1',
    });

    const viewA = await portal.getOverview(customerA.id);
    const viewB = await portal.getOverview(customerB.id);
    expect(viewA.license).toBeTruthy();
    expect(viewA.license.customerId).toBeUndefined(); // internal field never exposed
    expect(viewA.license.licenseReference).toBe(licenseA.licensePublicId);
    expect(viewB.license.licenseReference).not.toBe(licenseA.licensePublicId);
    // Raw identifiers never exposed to the portal
    for (const d of viewA.devices) {
      expect(d.deviceIdentifierHash).toBeUndefined();
      expect(d.machineFingerprintHash).toBeUndefined();
    }
  });

  it('portal cannot deactivate a device belonging to another customer\u2019s license', async () => {
    // register a device on B's license
    const viewB = await portal.getOverview(customerB.id);
    const bDevice = viewB.devices.find((d: any) => d.deviceName === 'B Device');
    expect(bDevice).toBeTruthy();
    // customer A tries to deactivate B's device through the portal service
    await expect(
      portal.deactivateDevice(customerA.id, 'portal-user-a', {
        devicePublicId: bDevice.devicePublicId,
      }),
    ).rejects.toThrow(/not found|No license/);
  });

  it('portal device list returns safe projections with slot counts', async () => {
    const viewA = await portal.getDevices(customerA.id);
    expect(typeof viewA.allowedDevices).toBe('number');
    expect(viewA.availableSlots).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(viewA.devices)).toBe(true);
  });
});
