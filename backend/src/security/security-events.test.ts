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

import { maskIp, maskReference, SecurityEventsService } from './security-events.service';

/**
 * PHASE 15 — SECURITY EVENT ENGINE (15.30–15.32) real-DB integration tests.
 * Append-only log, severity, masked metadata, filters and dashboard summary.
 */
describe('Security events engine (real DB)', () => {
  let database: DatabaseService;
  let events: SecurityEventsService;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'security-events-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    database = new DatabaseService(drizzleDb as any);
    events = new SecurityEventsService(database);
  });

  it('records events with severity, response level and masked IP', async () => {
    await events.record({
      eventType: 'ACTIVATION_LIMIT_REACHED',
      severity: 'HIGH',
      customerId: 'cus_1',
      licenseId: 'lic_1',
      deviceRef: 'dev_1',
      source: 'api',
      ipAddress: '203.0.113.42',
      metadata: { reason: 'max_devices' },
    });
    const res = await events.query({ page: 1, pageSize: 10 });
    const row = res.data.find((e: any) => e.eventType === 'ACTIVATION_LIMIT_REACHED');
    expect(row).toBeTruthy();
    expect(row.severity).toBe('HIGH');
    expect(row.responseLevel).toBe(3); // HIGH → require reauthentication
    expect(row.ipAddress).toBe('203.0.113.0/24'); // masked /24
    expect(row.customerId).toBe('cus_1');
  });

  it('defaults severity to LOW and response level to 1 (log only)', async () => {
    await events.record({ eventType: 'DUPLICATE_ACTIVATION' });
    const res = await events.query({ page: 1, pageSize: 10, eventType: 'DUPLICATE_ACTIVATION' });
    const row = res.data[0];
    expect(row.severity).toBe('LOW');
    expect(row.responseLevel).toBe(1);
  });

  it('never stores raw secrets in metadata — masks password/token/private-key keys', async () => {
    await events.record({
      eventType: 'SUSPICIOUS_ACTIVATION',
      severity: 'HIGH',
      metadata: {
        password: 'super-secret',
        token: 'SHRNXT1.xxxx',
        privateKeyPem: '-----BEGIN PRIVATE KEY-----',
        licenseNumber: 'SHR-LIC-2026-000001',
        reason: 'clone',
      },
    });
    const res = await events.query({ page: 1, pageSize: 10, eventType: 'SUSPICIOUS_ACTIVATION' });
    const row = res.data.find((e: any) => e.metadata?.reason === 'clone');
    expect(row).toBeTruthy();
    expect(row.metadata.password).toBe('[masked]');
    expect(row.metadata.token).toBe('[masked]');
    expect(row.metadata.privateKeyPem).toBe('[masked]');
    // Non-secret metadata passes through untouched
    expect(row.metadata.licenseNumber).toBe('SHR-LIC-2026-000001');
  });

  it('filters by severity, customer and date range', async () => {
    await events.record({
      eventType: 'UNAUTHORIZED_LICENSE_ACCESS',
      severity: 'HIGH',
      customerId: 'cus_filter',
      licenseId: 'lic_filter',
    });
    const bySeverity = await events.query({ page: 1, pageSize: 10, severity: 'HIGH' });
    expect(bySeverity.data.every((e: any) => e.severity === 'HIGH')).toBe(true);
    const byCustomer = await events.query({ page: 1, pageSize: 10, customerId: 'cus_filter' });
    expect(byCustomer.data.every((e: any) => e.customerId === 'cus_filter')).toBe(true);
    const byRange = await events.query({
      page: 1,
      pageSize: 10,
      from: new Date(Date.now() - 60_000).toISOString(),
      to: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(byRange.data.length).toBeGreaterThan(0);
  });

  it('summary groups by severity and top event types, surfaces criticals', async () => {
    await events.record({
      eventType: 'SIGNATURE_FAILURE',
      severity: 'MEDIUM',
      metadata: { stage: 'test_summary' },
    });
    await events.record({
      eventType: 'KEY_ROTATED',
      severity: 'HIGH',
      metadata: { stage: 'test_summary' },
    });
    const summary = await events.summary(7);
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.bySeverity.HIGH).toBeGreaterThan(0);
    expect(summary.topTypes.some((t: any) => t.type === 'SIGNATURE_FAILURE')).toBe(true);
    expect(summary.criticals.some((e: any) => e.eventType === 'KEY_ROTATED')).toBe(true);
    expect(summary.generatedAt).toBeTruthy();
  });

  it('maskIp and maskReference sanitize identifiers', () => {
    expect(maskIp('203.0.113.42')).toBe('203.0.113.0/24');
    expect(maskIp('2001:db8::1')).toBe('2001:db8:0:1::/48');
    expect(maskIp(undefined)).toBeNull();
    expect(maskReference('SHR-LIC-2026-000001')).toBe('SHR-LIC-2026-00****');
    expect(maskReference(null)).toBeNull();
  });
});
