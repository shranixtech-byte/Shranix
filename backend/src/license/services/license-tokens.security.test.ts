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

import { DatabaseService } from '../../database/database.service';
import { SecurityEventsService } from '../../security/security-events.service';
import { sha256 } from '../numbering';

import { LicenseTokensService } from './license-tokens.service';

/**
 * PHASE 15 — LICENSE TOKEN HARDENING (15.4, 15.5, 15.6, 15.36) real-DB tests.
 * Covers: key rotation with kid, algorithm-confusion rejection, nbf, tamper,
 * unknown key ids and offline-token device binding.
 */
describe('License token hardening (real DB)', () => {
  let database: DatabaseService;
  let security: SecurityEventsService;
  let tokens: LicenseTokensService;
  let license: any;

  const b64url = (buf: Buffer) =>
    buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64ToBuf = (b64: string) => {
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  };

  async function signPayload(payload: Record<string, any>): Promise<string> {
    const keys = await tokens.getKeys();
    const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
    const sig = crypto.sign('sha256', Buffer.from(body, 'utf8'), keys.privatePem);
    return `SHRNXT1.${body}.${b64url(sig)}`;
  }

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'token-hardening-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    database = new DatabaseService(drizzleDb as any);
    security = new SecurityEventsService(database);
    tokens = new LicenseTokensService(database, security);

    license = await database.licenses.create({
      licenseNumber: 'SHR-LIC-2026-000901',
      licensePublicId: 'lic_phase15_token_test',
      customerId: 'cus_phase15',
      subscriptionId: 'sub_phase15',
      planId: 'plan_phase15',
      licenseType: 'standard',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      maxDevices: 2,
      activeDevices: 0,
      entitlements: JSON.stringify({ sales: true }),
      limits: JSON.stringify({ users: 2 }),
      issuedAt: new Date().toISOString(),
      startsAt: new Date().toISOString(),
    } as any);
  });

  it('issues a v2 token with a key id (kid) that verifies', async () => {
    const issued = await tokens.issueToken(license, { ttlDays: 30, purpose: 'online-activation' });
    expect(issued.token).toMatch(/^SHRNXT1\./);
    const verified = await tokens.verifyToken(issued.token);
    expect(verified.payload.ver).toBe(2);
    expect(verified.payload.kid).toBeTruthy();
    expect(verified.payload.nbf).toBeTruthy();
    expect(verified.payload.sub).toBe(license.licensePublicId);
  });

  it('rejects tampered payloads (signature failure) and records a security event', async () => {
    const issued = await tokens.issueToken(license, { ttlDays: 30 });
    const parts = issued.token.split('.');
    const forgedBody = b64url(
      Buffer.from(
        JSON.stringify({ ...JSON.parse(b64ToBuf(parts[1]).toString('utf8')), exp: 9999999999 }),
        'utf8',
      ),
    );
    await expect(tokens.verifyToken(`${parts[0]}.${forgedBody}.${parts[2]}`)).rejects.toThrow(
      /signature invalid/i,
    );
    const res = await security.query({ page: 1, pageSize: 10, eventType: 'SIGNATURE_FAILURE' });
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('rejects algorithm confusion — a signed token declaring alg "none" or "HS256" fails', async () => {
    const good = await tokens.issueToken(license, { ttlDays: 30 });
    const payload = JSON.parse(b64ToBuf(good.token.split('.')[1]).toString('utf8'));
    // Signature is still a valid RSA signature, but the declared algorithm is
    // outside the server whitelist → must be rejected (15.5).
    const confusedNone = await signPayload({ ...payload, alg: 'none' });
    await expect(tokens.verifyToken(confusedNone)).rejects.toThrow(/algorithm not allowed/i);
    const confusedHs = await signPayload({ ...payload, alg: 'HS256' });
    await expect(tokens.verifyToken(confusedHs)).rejects.toThrow(/algorithm not allowed/i);
  });

  it('rejects tokens carrying an unknown key id (kid)', async () => {
    const good = await tokens.issueToken(license, { ttlDays: 30 });
    const payload = JSON.parse(b64ToBuf(good.token.split('.')[1]).toString('utf8'));
    const unknownKid = await signPayload({ ...payload, kid: 'key_999' });
    await expect(tokens.verifyToken(unknownKid)).rejects.toThrow(/key id not recognized/i);
  });

  it('rejects a validly-signed token that is not yet valid (nbf in the future)', async () => {
    const good = await tokens.issueToken(license, { ttlDays: 30 });
    const payload = JSON.parse(b64ToBuf(good.token.split('.')[1]).toString('utf8'));
    const future = Math.floor(Date.now() / 1000) + 3600;
    const notYet = await signPayload({ ...payload, nbf: future });
    await expect(tokens.verifyToken(notYet)).rejects.toThrow(/not yet valid/i);
  });

  it('key rotation: new tokens get a new kid, old tokens keep verifying', async () => {
    const before = await tokens.getCurrentKid();
    const oldToken = await tokens.issueToken(license, { ttlDays: 30, purpose: 'before-rotation' });
    expect((await tokens.verifyToken(oldToken.token)).payload.kid).toBe(before);

    const rotation = await tokens.rotateSigningKey();
    expect(rotation.rotated).toBe(true);
    expect(rotation.previousKid).toBe(before);
    expect(rotation.currentKid).not.toBe(before);

    // New tokens use the new key…
    const newToken = await tokens.issueToken(license, { ttlDays: 30, purpose: 'after-rotation' });
    expect((await tokens.verifyToken(newToken.token)).payload.kid).toBe(rotation.currentKid);
    // …and previously issued tokens still verify via the retired key.
    expect((await tokens.verifyToken(oldToken.token)).payload.kid).toBe(before);

    // KEY_ROTATED event recorded.
    const res = await security.query({ page: 1, pageSize: 10, eventType: 'KEY_ROTATED' });
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('offline tokens are bound to the requesting installation (15.36)', async () => {
    const offline = await tokens.issueOfflineLicenseToken(license, {
      ttlDays: 7,
      deviceIdentifierHash: 'device-A',
    });
    // Same device verifies.
    const ok = await tokens.verifyOfflineLicenseToken(offline, {
      deviceIdentifierHash: 'device-A',
    });
    expect(ok.valid).toBe(true);
    // Different device → rejected.
    await expect(
      tokens.verifyOfflineLicenseToken(offline, { deviceIdentifierHash: 'device-B' }),
    ).rejects.toThrow(/bound to a different installation/i);
    // No device supplied → binding not enforced (verify still passes).
    expect((await tokens.verifyOfflineLicenseToken(offline)).valid).toBe(true);
    // DEVICE_MISMATCH event recorded.
    const res = await security.query({ page: 1, pageSize: 10, eventType: 'DEVICE_MISMATCH' });
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('rejects tokens for revoked licenses even when the signature is valid', async () => {
    const license2 = await database.licenses.create({
      licenseNumber: 'SHR-LIC-2026-000902',
      licensePublicId: 'lic_phase15_revoked',
      customerId: 'cus_phase15',
      subscriptionId: 'sub_phase15',
      planId: 'plan_phase15',
      licenseType: 'standard',
      status: 'REVOKED',
      maxDevices: 1,
      activeDevices: 0,
      entitlements: '{}',
      limits: '{}',
      issuedAt: new Date().toISOString(),
      startsAt: new Date().toISOString(),
    } as any);
    const issued = await tokens.issueToken(license2, { ttlDays: 30 });
    await expect(tokens.verifyToken(issued.token)).rejects.toThrow(/license is REVOKED/i);
  });

  it('hashes device identifiers before binding (payload carries the hash, not the raw value)', async () => {
    const offline = await tokens.issueOfflineLicenseToken(license, {
      ttlDays: 7,
      deviceIdentifierHash: 'raw-device-identity',
    });
    const payload = JSON.parse(b64ToBuf(offline.split('.')[1]).toString('utf8'));
    expect(payload.dev).toBe(sha256('raw-device-identity'));
    expect(payload.dev).not.toContain('raw-device-identity');
  });
});
