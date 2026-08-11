import * as crypto from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
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
import { LicenseActivationsService } from '../license/services/license-activations.service';
import { LicenseDevicesService } from '../license/services/license-devices.service';
import { LicenseEventsService } from '../license/services/license-events.service';
import { LicenseTokensService } from '../license/services/license-tokens.service';
import { LicenseValidationService } from '../license/services/license-validation.service';
import { LicensesService } from '../license/services/licenses.service';
import { PortalAuthService } from '../portal/services/portal-auth.service';

import { ActivationConfigService } from './activation-config.service';
import { ActivationService } from './activation.service';

/**
 * REAL-DB integration tests for the Phase-14 Online Activation Engine.
 *
 * The activation service is the ONLY surface the installer/desktop client
 * talks to. It authenticates the customer through the existing portal auth
 * (email + password), resolves the license server-side and consumes the
 * Phase-13 engine for device registration, activation slots, validation and
 * signed tokens.
 *
 * Security matrix covered: cross-customer isolation (404, no existence leak),
 * invalid credentials, unknown/revoked licenses, device limits, concurrent
 * activation race, idempotent duplicate activation, revalidation, offline
 * bounded recovery tokens, public-key exposure, trial flow and update
 * metadata.
 */
describe('Activation module (real DB)', () => {
  let database: DatabaseService;
  let licenses: LicensesService;
  let devices: LicenseDevicesService;
  let activations: LicenseActivationsService;
  let validation: LicenseValidationService;
  let tokens: LicenseTokensService;
  let events: LicenseEventsService;
  let subscriptions: SubscriptionsService;
  let plans: PlansService;
  let config: ActivationConfigService;
  let service: ActivationService;

  let customerA: any;
  let customerB: any;
  let customerT: any;
  let starter: any;
  let twoDevice: any;
  let trialPlan: any;
  let subA: any;
  let subB: any;
  let subT: any;
  let licenseA: any;

  async function makePortalUser(customerId: string, email: string, name: string) {
    const passwordHash = await argon2.hash('Passw0rd!23');
    return database.portalUsers.create({
      customerId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      status: 'active',
      role: 'customer_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  }

  const deviceCtx = (hash: string, name?: string) => ({
    deviceIdentifierHash: hash,
    deviceName: name || `${hash} device`,
    platform: 'windows',
    os: 'Windows 11',
    osVersion: '10.0.22631',
    applicationVersion: '1.0.0',
  });

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'activation-'));
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
    plans = new PlansService(database, audit);
    const coupons = new CouponsService(database, audit);
    const entitlements = new EntitlementsService(database);
    const billing = new BillingService(database, audit, gl);
    subscriptions = new SubscriptionsService(database, audit, coupons, entitlements, billing);
    events = new LicenseEventsService(database);
    tokens = new LicenseTokensService(database);
    licenses = new LicensesService(database, audit, entitlements, events, tokens);
    devices = new LicenseDevicesService(database, audit, licenses, events);
    activations = new LicenseActivationsService(database, audit, licenses, devices, events);
    validation = new LicenseValidationService(database, entitlements, licenses, events);
    const portalAuth = new PortalAuthService(
      database,
      audit,
      new JwtService({ secret: 'test-secret' }),
    );
    config = new ActivationConfigService(database);
    service = new ActivationService(
      database,
      config,
      portalAuth,
      licenses,
      activations,
      validation,
      tokens,
      devices,
    );

    // ── Master data ──────────────────────────────────────
    customerA = await database.customers.create({
      customerCode: 'CUS-9001',
      name: 'Activate A',
      firmName: 'Firm AA',
      mobile: '9876509001',
      email: 'aa@test.in',
    } as any);
    customerB = await database.customers.create({
      customerCode: 'CUS-9002',
      name: 'Activate B',
      firmName: 'Firm AB',
      mobile: '9876509002',
      email: 'ab@test.in',
    } as any);
    customerT = await database.customers.create({
      customerCode: 'CUS-9003',
      name: 'Activate T',
      firmName: 'Firm AT',
      mobile: '9876509003',
      email: 'at@test.in',
    } as any);

    starter = await plans.create(
      {
        planCode: 'ASTARTER',
        planName: 'A-Starter',
        displayName: 'A Starter',
        planType: 'monthly',
        billingCycle: 'monthly',
        trialPeriodDays: 0,
        gracePeriodDays: 3,
        price: 999,
        discountPercent: 0,
        taxRate: 18,
        features: { sales: true, purchase: true, reports: false },
        limits: { users: 2, devices: 1, branches: 1, installations: 1 },
      },
      'u1',
    );
    twoDevice = await plans.create(
      {
        planCode: 'ADEV2',
        planName: 'A-TwoDevice',
        displayName: 'A Two Device',
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
    trialPlan = await plans.create(
      {
        planCode: 'ATRYP',
        planName: 'A-Trial',
        displayName: 'A Trial',
        planType: 'trial',
        billingCycle: 'monthly',
        trialPeriodDays: 14,
        gracePeriodDays: 2,
        price: 0,
        discountPercent: 0,
        taxRate: 0,
        features: { sales: true, purchase: true },
        limits: { users: 1, devices: 1 },
      },
      'u1',
    );

    subA = await subscriptions.create(
      { customerId: customerA.id, planId: twoDevice.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(subA.id, 'u1');
    licenseA = await licenses.createFromSubscription(subA.id);

    subB = await subscriptions.create(
      { customerId: customerB.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(subB.id, 'u1');
    await licenses.createFromSubscription(subB.id);

    subT = await subscriptions.create(
      { customerId: customerT.id, planId: trialPlan.id, source: 'portal' },
      'u1',
    );
    await licenses.createFromSubscription(subT.id);

    await makePortalUser(customerA.id, 'AA@test.in', 'Alice A');
    await makePortalUser(customerB.id, 'ab@test.in', 'Bob B');
    await makePortalUser(customerT.id, 'at@test.in', 'Tara T');
  });

  // ═══════════════════════════════════════════════════════
  // ONLINE ACTIVATION
  // ═══════════════════════════════════════════════════════
  it('activates online: customer login → license resolve → device registration → signed token', async () => {
    const result = await service.activate({
      email: 'aa@test.in',
      password: 'Passw0rd!23',
      licenseReference: licenseA.licenseNumber,
      activationReference: `act-a-${crypto.randomBytes(4).toString('hex')}`,
      ...deviceCtx('aa-main-pc', 'Alice Office PC'),
    });

    expect(result.valid).toBe(true);
    expect(result.licenseNumber).toBe(licenseA.licenseNumber);
    expect(result.licenseReference).toBe(licenseA.licensePublicId);
    expect(result.status).toBe('ACTIVE');
    expect(result.allowedDevices).toBe(2);
    expect(result.usedDevices).toBe(1);
    expect(result.token).toMatch(/^SHRNXT1\./);
    expect(result.tokenExpiresAt).toBeTruthy();
    expect(result.activationReference).toBeTruthy();
    expect(result.entitlements).toContain('sales');
    // Controlled surface — internal ids never exposed
    expect(result).not.toHaveProperty('customerId');
    expect(result).not.toHaveProperty('id');
    // Token is cryptographically verifiable
    const verified = await tokens.verifyToken(result.token);
    expect(verified.payload.sub).toBe(licenseA.licensePublicId);
  });

  it('cross-customer isolation: customer B cannot activate customer A\u2019s license (404, no leak)', async () => {
    await expect(
      service.activate({
        email: 'ab@test.in',
        password: 'Passw0rd!23',
        licenseReference: licenseA.licenseNumber,
        activationReference: `act-x-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('bb-evil-pc'),
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('rejects invalid credentials without revealing account state', async () => {
    await expect(
      service.activate({
        email: 'aa@test.in',
        password: 'wrong-password',
        licenseReference: licenseA.licenseNumber,
        activationReference: `act-bad-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('bad-cred-pc'),
      }),
    ).rejects.toThrow(/Invalid email or password/);
  });

  it('rejects an unknown license number', async () => {
    await expect(
      service.activate({
        email: 'aa@test.in',
        password: 'Passw0rd!23',
        licenseReference: 'SHR-LIC-2999-999999',
        activationReference: `act-unk-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('unknown-pc'),
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('enforces the device limit and never deactivates existing devices', async () => {
    const customerD = await database.customers.create({
      customerCode: 'CUS-9004',
      name: 'Activate D',
      firmName: 'Firm AD',
      mobile: '9876509004',
      email: 'ad@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerD.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    await makePortalUser(customerD.id, 'ad@test.in', 'Dan D');

    const first = await service.activate({
      email: 'ad@test.in',
      password: 'Passw0rd!23',
      licenseReference: lic.licenseNumber,
      activationReference: `dl-1-${crypto.randomBytes(4).toString('hex')}`,
      ...deviceCtx('dl-pc-1'),
    });
    expect(first.usedDevices).toBe(1);

    const second = await service
      .activate({
        email: 'ad@test.in',
        password: 'Passw0rd!23',
        licenseReference: lic.licenseNumber,
        activationReference: `dl-2-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('dl-pc-2'),
      })
      .then(() => ({ ok: true }))
      .catch((e: any) => ({ ok: false, reason: e?.response?.reason || e?.message }));

    expect(second.ok).toBe(false);
    expect(second.reason).toBe('DEVICE_LIMIT_REACHED');

    // First device untouched; event recorded
    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(1);
    const evts = await events.list(lic.id);
    expect(evts.some((e: any) => e.eventType === 'LIMIT_REACHED')).toBe(true);
  });

  it('concurrent activations never exceed max_devices (race through the service)', async () => {
    const customerE = await database.customers.create({
      customerCode: 'CUS-9005',
      name: 'Activate E',
      firmName: 'Firm AE',
      mobile: '9876509005',
      email: 'ae@test.in',
    } as any);
    const sub = await subscriptions.create(
      { customerId: customerE.id, planId: starter.id, source: 'admin' },
      'u1',
    );
    await subscriptions.activate(sub.id, 'u1');
    const lic = await licenses.createFromSubscription(sub.id);
    await makePortalUser(customerE.id, 'ae@test.in', 'Eva E');

    const attempts = await Promise.allSettled([
      service.activate({
        email: 'ae@test.in',
        password: 'Passw0rd!23',
        licenseReference: lic.licenseNumber,
        activationReference: `race-1-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('race-pc-1'),
      }),
      service.activate({
        email: 'ae@test.in',
        password: 'Passw0rd!23',
        licenseReference: lic.licenseNumber,
        activationReference: `race-2-${crypto.randomBytes(4).toString('hex')}`,
        ...deviceCtx('race-pc-2'),
      }),
    ]);
    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    expect(fulfilled.length).toBe(1);
    const refreshed = await licenses.findById(lic.id);
    expect(refreshed.activeDevices).toBe(1);
  });

  it('activation is idempotent — same reference never consumes a second slot', async () => {
    const ref = `idem-${crypto.randomBytes(4).toString('hex')}`;
    const r1 = await service.activate({
      email: 'aa@test.in',
      password: 'Passw0rd!23',
      licenseReference: licenseA.licensePublicId,
      activationReference: ref,
      ...deviceCtx('aa-second-pc', 'Alice Second PC'),
    });
    const r2 = await service.activate({
      email: 'aa@test.in',
      password: 'Passw0rd!23',
      licenseReference: licenseA.licensePublicId,
      activationReference: ref,
      ...deviceCtx('aa-second-pc', 'Alice Second PC'),
    });
    expect(r2.activationReference).toBe(r1.activationReference);
    const fresh = await licenses.findById(licenseA.id);
    expect(fresh.activeDevices).toBe(2); // 2 distinct devices — no duplicate slot
  });

  // ═══════════════════════════════════════════════════════
  // REVALIDATION
  // ═══════════════════════════════════════════════════════
  it('revalidates an active installation with a controlled response', async () => {
    const result = await service.revalidate({
      licenseReference: licenseA.licensePublicId,
      deviceIdentifierHash: 'aa-main-pc',
      applicationVersion: '1.0.0',
      source: 'desktop',
    });
    expect(result.valid).toBe(true);
    expect(result.status).toBe('ACTIVE');
    expect(result.entitlements).toContain('sales');
    expect(result.revalidateAfterHours).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('deviceIdentifierHash');
  });

  it('revalidation fails cleanly for unknown and revoked licenses', async () => {
    const unknown = await service.revalidate({ licenseReference: 'lic_ffffffffffff' });
    expect(unknown.valid).toBe(false);
    expect(unknown.reason).toBe('LICENSE_NOT_FOUND');

    // Customer D has a license; revoke it and confirm revalidation reports it
    const customerD = await database.customers
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'email', operator: 'eq', value: 'ad@test.in' }],
      } as any)
      .then((r: any) => (r?.data || [])[0]);
    const dLic = await database.licenses
      .findAll({
        page: 1,
        pageSize: 5,
        filters: [{ field: 'customerId', operator: 'eq', value: customerD.id }],
      } as any)
      .then((r: any) => (r?.data || []).find((l: any) => !l.isDeleted));
    await licenses.revoke(dLic.id, { reason: 'Test revocation', userId: 'u1' });
    const revoked = await service.revalidate({ licenseReference: dLic.licensePublicId });
    expect(revoked.valid).toBe(false);
    expect(revoked.reason).toBe('LICENSE_REVOKED');
  });

  // ═══════════════════════════════════════════════════════
  // OFFLINE RECOVERY (bounded, exceptional)
  // ═══════════════════════════════════════════════════════
  it('issues a bounded offline token that verifies, and rejects tampering', async () => {
    const req = await service.offlineRequest({
      email: 'aa@test.in',
      password: 'Passw0rd!23',
      licenseReference: licenseA.licenseNumber,
      deviceIdentifierHash: 'aa-main-pc',
    });
    expect(req.valid).toBe(true);
    expect(req.offlineToken).toMatch(/^SHRNXT1\./);
    expect(req.expiresInDays).toBe(7); // configurable default — never unlimited

    const verify = await service.offlineVerify(req.offlineToken);
    expect(verify.valid).toBe(true);
    expect(verify.licenseNumber).toBe(licenseA.licenseNumber);

    const tampered = req.offlineToken.split('.');
    const forged = `${tampered[0]}.${Buffer.from('{"x":1}').toString('base64')}.${tampered[2]}`;
    const bad = await service.offlineVerify(forged);
    expect(bad.valid).toBe(false);
  });

  it('offline request is blocked for a foreign customer', async () => {
    await expect(
      service.offlineRequest({
        email: 'ab@test.in',
        password: 'Passw0rd!23',
        licenseReference: licenseA.licenseNumber,
      }),
    ).rejects.toThrow(/not found/i);
  });

  // ═══════════════════════════════════════════════════════
  // PUBLIC KEY + TRIAL + UPDATE
  // ═══════════════════════════════════════════════════════
  it('exposes the RSA public key for client-side signature verification', async () => {
    const { publicKeyPem } = await service.getPublicKey();
    expect(publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('trial flow issues a token only when a trial subscription exists', async () => {
    await config.updateSettings({ trialEnabled: true });

    const trial = await service.continueTrial({ email: 'at@test.in', password: 'Passw0rd!23' });
    expect(trial.valid).toBe(true);
    expect(trial.status).toBe('ACTIVE');
    expect(trial.token).toMatch(/^SHRNXT1\./);
    expect(trial.allowedDevices).toBe(1);

    // Customer without any trial → controlled failure
    const noTrial = await service
      .continueTrial({ email: 'ab@test.in', password: 'Passw0rd!23' })
      .then(() => ({ ok: true }))
      .catch((e: any) => ({ ok: false, reason: e?.response?.reason || e?.message }));
    expect(noTrial.ok).toBe(false);
    expect(noTrial.reason).toBe('NO_ACTIVE_TRIAL');

    await config.updateSettings({ trialEnabled: false });
  });

  it('serves update-channel metadata with server-side versions', async () => {
    await config.updateSettings({
      latestVersion: '1.2.0',
      minVersion: '1.0.0',
      updateUrl: 'https://updates.shranix.com',
    });
    const info = await service.getUpdateInfo('1.1.0');
    expect(info.ok).toBe(true);
    expect(info.latestVersion).toBe('1.2.0');
    expect(info.updateAvailable).toBe(true);
    expect(info.signatureRequired).toBe(true);

    const upToDate = await service.getUpdateInfo('1.2.0');
    expect(upToDate.updateAvailable).toBe(false);
  });

  it('ping returns a controlled availability probe', async () => {
    const pong = await service.ping();
    expect(pong.ok).toBe(true);
    expect(pong.service).toBe('shranix-activation');
    expect(pong.serverTime).toBeTruthy();
  });
});
