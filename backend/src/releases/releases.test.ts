import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, beforeAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { ActivationService } from '../activation/activation.service';
import { DatabaseService } from '../database/database.service';
import { SecurityEventsService } from '../security/security-events.service';

import { ReleasesService, UPDATE_VERDICTS } from './releases.service';

/**
 * PHASE 16 — CENTRAL LICENSE SERVER: release/version registry (16.1, 16.5,
 * 16.10, 16.11) real-DB tests. Covers duplicate-version rejection, publish/
 * revoke, min/recommended/blocked versions, channel isolation, customer-
 * specific releases, package checksum metadata and update resolution.
 */
describe('Release registry (real DB)', () => {
  let database: DatabaseService;
  let security: SecurityEventsService;
  let releases: ReleasesService;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'releases-'));
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
    releases = new ReleasesService(database, security);
    await releases.ensureChannel({ channelCode: 'STABLE', minVersion: '1.0.0' });
    await releases.ensureChannel({ channelCode: 'BETA' });
  });

  const pkg = (overrides: Record<string, any> = {}) => ({
    fileName: 'SHRANIX-Setup-1.0.0.exe',
    platform: 'windows',
    architecture: 'x64',
    packageUrl: 'https://downloads.shranix.com/SHRANIX-1.0.0.exe',
    packageSize: 42_000_000,
    checksum: 'a'.repeat(64),
    checksumAlgorithm: 'sha256',
    signature: 'base64-signature',
    signatureAlgorithm: 'rsa-sha256',
    ...overrides,
  });

  it('creates a DRAFT release and rejects duplicate versions for the same channel/platform', async () => {
    const rel = await releases.createRelease({ version: '1.0.0', channel: 'STABLE', userId: 'u1' });
    expect(rel.status).toBe('DRAFT');
    expect(rel.releaseId).toMatch(/^rel_/);
    await expect(
      releases.createRelease({ version: '1.0.0', channel: 'STABLE', userId: 'u1' }),
    ).rejects.toThrow(/already exists/i);
    // Same version on a DIFFERENT channel is allowed (channel isolation).
    const beta = await releases.createRelease({ version: '1.0.0', channel: 'BETA', userId: 'u1' });
    expect(beta.channel).toBe('BETA');
  });

  it('publishes a release with a package and serves update metadata with checksum', async () => {
    const rel = await releases.createRelease({ version: '2.0.0', channel: 'STABLE', userId: 'u1' });
    await releases.addPackage(
      rel.id,
      pkg({ fileName: 'SHRANIX-Setup-2.0.0.exe', checksum: 'b'.repeat(64) }),
    );
    await releases.publishRelease(rel.id, { userId: 'admin' });
    expect((await releases.getRelease(rel.id)).status).toBe('PUBLISHED');

    const update = await releases.resolveUpdate({
      currentVersion: '1.0.0',
      platform: 'windows',
      architecture: 'x64',
      channel: 'STABLE',
    });
    expect(update.verdict).toBe(UPDATE_VERDICTS.UPDATE_AVAILABLE);
    expect(update.latestVersion).toBe('2.0.0');
    expect(update.updateAvailable).toBe(true);
    expect(update.packageMetadata).toBeTruthy();
    expect(update.packageMetadata.checksum).toBe('b'.repeat(64));
    expect(update.packageMetadata.checksumAlgorithm).toBe('sha256');
    expect(update.packageMetadata.signature).toBe('base64-signature');
  });

  it('min supported version forces UPDATE_REQUIRED; recommended version → UPDATE_RECOMMENDED', async () => {
    await releases.createRelease({ version: '3.0.0', channel: 'STABLE', userId: 'u1' });
    const rels = await releases.listReleases({ version: '3.0.0' });
    const rel = rels.data[0];
    await releases.addPackage(rel.id, pkg({ fileName: 'SHRANIX-Setup-3.0.0.exe' }));
    await releases.publishRelease(rel.id, { userId: 'admin' });

    // Current 0.9.0 is below STABLE minVersion 1.0.0 → required
    const required = await releases.resolveUpdate({
      currentVersion: '0.9.0',
      channel: 'STABLE',
    });
    expect(required.verdict).toBe(UPDATE_VERDICTS.UPDATE_REQUIRED);
    expect(required.updateRequired).toBe(true);

    // Current 1.5.0 ≥ min but < recommended (2.0.0 via version policy) → recommended
    await releases.setVersionPolicy({
      version: '1.5.0',
      channel: 'STABLE',
      recommendedVersion: '2.0.0',
      userId: 'admin',
    });
    const recommended = await releases.resolveUpdate({
      currentVersion: '1.5.0',
      channel: 'STABLE',
    });
    expect(recommended.verdict).toBe(UPDATE_VERDICTS.UPDATE_RECOMMENDED);
    expect(recommended.updateRecommended).toBe(true);

    // Current == latest → supported
    const supported = await releases.resolveUpdate({
      currentVersion: '3.0.0',
      channel: 'STABLE',
    });
    expect(supported.verdict).toBe(UPDATE_VERDICTS.VERSION_SUPPORTED);
    expect(supported.updateAvailable).toBe(false);
  });

  it('blocked versions are rejected and never offered a bypass', async () => {
    await releases.setVersionPolicy({
      version: '1.0.0',
      channel: 'STABLE',
      blocked: true,
      blockedReason: 'Known security issue',
      userId: 'admin',
    });
    const blocked = await releases.resolveUpdate({ currentVersion: '1.0.0', channel: 'STABLE' });
    expect(blocked.verdict).toBe(UPDATE_VERDICTS.VERSION_BLOCKED);
    expect(blocked.blockedReason).toBe('Known security issue');
    expect(blocked.updateAvailable).toBe(false);
    expect(blocked.updateRequired).toBe(false);
  });

  it('channel isolation — BETA releases are not offered on STABLE', async () => {
    const beta = await releases.createRelease({ version: '4.0.0', channel: 'BETA', userId: 'u1' });
    await releases.addPackage(beta.id, pkg());
    await releases.publishRelease(beta.id, { userId: 'admin' });

    const stable = await releases.resolveUpdate({ currentVersion: '1.0.0', channel: 'STABLE' });
    expect(stable.latestVersion).not.toBe('4.0.0');
    const betaRes = await releases.resolveUpdate({ currentVersion: '1.0.0', channel: 'BETA' });
    expect(betaRes.latestVersion).toBe('4.0.0');
  });

  it('customer-specific releases are only resolved for authorized customers', async () => {
    const spec = await releases.createRelease({
      version: '5.0.0-custom',
      channel: 'CUSTOMER_SPECIFIC',
      assignedCustomerIds: ['cus_authorized'],
      userId: 'u1',
    });
    await releases.addPackage(spec.id, pkg());
    await releases.publishRelease(spec.id, { userId: 'admin' });

    const authorized = await releases.resolveUpdate({
      currentVersion: '1.0.0',
      channel: 'CUSTOMER_SPECIFIC',
      customerId: 'cus_authorized',
    });
    expect(authorized.latestVersion).toBe('5.0.0-custom');

    const unauthorized = await releases.resolveUpdate({
      currentVersion: '1.0.0',
      channel: 'CUSTOMER_SPECIFIC',
      customerId: 'cus_other',
    });
    expect(unauthorized.latestVersion).toBeNull();
    expect(unauthorized.updateAvailable).toBe(false);
  });

  it('a revoked release is never offered as a valid update', async () => {
    const rel = await releases.createRelease({ version: '6.0.0', channel: 'STABLE', userId: 'u1' });
    await releases.addPackage(rel.id, pkg());
    await releases.publishRelease(rel.id, { userId: 'admin' });
    await releases.revokeRelease(rel.id, { reason: 'Bad build', userId: 'admin' });
    expect((await releases.getRelease(rel.id)).status).toBe('REVOKED');

    const update = await releases.resolveUpdate({ currentVersion: '1.0.0', channel: 'STABLE' });
    expect(update.latestVersion).not.toBe('6.0.0');
  });

  it('GET /activation/update (registry path) returns the merged Phase-16 contract', async () => {
    const dummyConfig = { getConfig: async () => ({}) } as any;
    const activation = new ActivationService(
      database as any,
      dummyConfig,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      releases,
    );
    const info = await activation.getUpdateInfo('1.0.0');
    expect(info.ok).toBe(true);
    expect(info.verdict).toBeTruthy();
    expect(info.latestVersion).toBeTruthy();
    // Legacy Phase-14 fields preserved (16.6)
    expect(typeof info.minVersion).toBe('string');
    expect(typeof info.updateAvailable).toBe('boolean');
    expect(info.channel).toBe('stable');
    // Never exposes internal infrastructure
    expect(JSON.stringify(info)).not.toContain('private');
    expect(JSON.stringify(info)).not.toContain('secret');
  });

  it('issues short-lived authenticated download tokens — valid, tampered and expired', async () => {
    const rel = await releases.createRelease({ version: '7.0.0', channel: 'STABLE', userId: 'u1' });
    await releases.addPackage(rel.id, pkg({ fileName: 'SHRANIX-Setup-7.0.0.exe' }));
    await releases.publishRelease(rel.id, { userId: 'admin' });

    const access = await releases.createDownloadAccess(rel.id, { ttlMinutes: 5 });
    expect(access.token).toBeTruthy();
    const resolved = await releases.resolveDownloadAccess(access.token);
    expect(resolved.version).toBe('7.0.0');
    expect(resolved.checksum).toBe(pkg().checksum);
    expect(resolved.checksumAlgorithm).toBe('sha256');
    // Internal ids/paths never leak through the token response
    expect(JSON.stringify(resolved)).not.toContain('private');
    expect(resolved.packageUrl).toContain('https://');

    // Tampered token → rejected
    const decoded = Buffer.from(access.token, 'base64url').toString('utf8');
    const tokParts = decoded.split('.');
    const tamperedDecoded = `${tokParts[0]}.${tokParts[1]}.${tokParts[2]}.${'f'.repeat(64)}`;
    const tampered = Buffer.from(tamperedDecoded, 'utf8').toString('base64url');
    await expect(releases.resolveDownloadAccess(tampered)).rejects.toThrow(/signature/i);

    // Expired token → rejected
    const expired = await releases.createDownloadAccess(rel.id, { ttlMinutes: -1 });
    await expect(releases.resolveDownloadAccess(expired.token)).rejects.toThrow(/expired/i);
  });

  it('a revoked release cannot be downloaded even with a previously valid token', async () => {
    const rel = await releases.createRelease({ version: '8.0.0', channel: 'STABLE', userId: 'u1' });
    await releases.addPackage(rel.id, pkg());
    await releases.publishRelease(rel.id, { userId: 'admin' });
    const access = await releases.createDownloadAccess(rel.id);
    await releases.revokeRelease(rel.id, { reason: 'withdrawn', userId: 'admin' });
    await expect(releases.resolveDownloadAccess(access.token)).rejects.toThrow(
      /no longer available/i,
    );
  });

  it('customer-specific download eligibility is enforced at issuance', async () => {
    const spec = await releases.createRelease({
      version: '9.0.0-custom',
      channel: 'CUSTOMER_SPECIFIC',
      assignedCustomerIds: ['cus_dl_ok'],
      userId: 'u1',
    });
    await releases.addPackage(spec.id, pkg());
    await releases.publishRelease(spec.id, { userId: 'admin' });

    await expect(
      releases.createDownloadAccess(spec.id, { customerId: 'cus_dl_other' }),
    ).rejects.toThrow(/not authorized/i);
    const ok = await releases.createDownloadAccess(spec.id, { customerId: 'cus_dl_ok' });
    expect((await releases.resolveDownloadAccess(ok.token)).version).toBe('9.0.0-custom');
  });

  it('update metadata carries a download token for the latest package', async () => {
    const rel = await releases.createRelease({
      version: '10.0.0',
      channel: 'STABLE',
      userId: 'u1',
    });
    await releases.addPackage(rel.id, pkg());
    await releases.publishRelease(rel.id, { userId: 'admin' });
    const update = await releases.resolveUpdate({ currentVersion: '1.0.0', channel: 'STABLE' });
    expect(update.latestVersion).toBe('10.0.0');
    expect(update.packageMetadata.downloadToken).toBeTruthy();
    expect(update.packageMetadata.downloadTokenExpiresAt).toBeTruthy();
    const viaToken = await releases.resolveDownloadAccess(update.packageMetadata.downloadToken);
    expect(viaToken.checksum).toBeTruthy();
  });

  it('GET /activation/update falls back to KV config when registry is empty (backward compat)', async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'releases-fallback-'));
    const client = createClient({ url: `file:${join(dbDir, 't.db')}` });
    const drizzleDb = drizzle(client as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    const emptyDb = new DatabaseService(drizzleDb as any);
    const emptyReleases = new ReleasesService(emptyDb, security);
    const dummyConfig = {
      getConfig: async () => ({
        latestVersion: '1.2.0',
        minVersion: '1.0.0',
        updateUrl: 'https://updates.shranix.com',
        updateChannel: 'stable',
        signatureRequired: true,
      }),
    } as any;
    const activation = new ActivationService(
      emptyDb as any,
      dummyConfig,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      emptyReleases,
    );
    const info = await activation.getUpdateInfo('1.1.0');
    expect(info.ok).toBe(true);
    expect(info.latestVersion).toBe('1.2.0');
    expect(info.updateAvailable).toBe(true);
    expect(info.signatureRequired).toBe(true);
  });
});
