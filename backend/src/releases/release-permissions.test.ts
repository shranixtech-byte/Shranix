import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Reflector } from '@nestjs/core';
import { describe, expect, it, beforeAll } from 'vitest';

const dbRequire = createRequire(join(process.cwd(), '..', 'database', 'package.json'));
const { createClient } = dbRequire('@libsql/client');
const { drizzle } = dbRequire('drizzle-orm/libsql');
const { migrate } = dbRequire('drizzle-orm/libsql/migrator');

import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { grantsPermission } from '../common/guards/permissions.guard';
import { DatabaseService } from '../database/database.service';

import { ReleasesController } from './releases.controller';
import { ReleasePermissionSeedService } from './services/release-permission-seed.service';

/**
 * PHASE 16 — release permission isolation (16.8, 16.11).
 * Publishing/revoking must require release.publish/release.revoke; ordinary
 * support users (license.*) must never gain those rights implicitly.
 */
describe('Release permissions (real DB)', () => {
  let database: DatabaseService;
  let seeder: ReleasePermissionSeedService;
  let adminRoleId: string;

  beforeAll(async () => {
    const dbDir = mkdtempSync(join(tmpdir(), 'release-perms-'));
    const client = createClient({ url: `file:${join(dbDir, 'test.db')}` });
    const drizzleDb = drizzle(client as any);
    await migrate(
      drizzleDb as any,
      {
        migrationsFolder: join(process.cwd(), '..', 'database', 'src', 'migrations'),
      } as any,
    );
    database = new DatabaseService(drizzleDb as any);
    seeder = new ReleasePermissionSeedService(database);
    const admin = await database.roles.createRole({
      name: 'admin',
      description: 'Administrator',
      isSystem: true,
    });
    adminRoleId = admin.id;
  });

  it('grantsPermission matrix — release rights are never implied by license.* or release.view', () => {
    // Ordinary support users hold license.* — must NOT publish/revoke.
    expect(grantsPermission('license.view', 'release.publish')).toBe(false);
    expect(grantsPermission('license.manage', 'release.revoke')).toBe(false);
    expect(grantsPermission('license.view', 'release.view')).toBe(false);
    // release.view does not grant publish/revoke.
    expect(grantsPermission('release.view', 'release.publish')).toBe(false);
    expect(grantsPermission('release.view', 'release.revoke')).toBe(false);
    // Explicit grants work.
    expect(grantsPermission('release.publish', 'release.publish')).toBe(true);
    expect(grantsPermission('release.revoke', 'release.revoke')).toBe(true);
    expect(grantsPermission('release.manage', 'release.publish')).toBe(false);
    // Super admin passes everything.
    expect(grantsPermission('*.*', 'release.publish')).toBe(true);
    expect(grantsPermission('*.*', 'release.revoke')).toBe(true);
  });

  it('controller routes require the exact permission — publish ≠ manage ≠ revoke', () => {
    const reflector = new Reflector();
    const getPerms = (method: string) => {
      const target = (ReleasesController.prototype as any)[method];
      const meta = reflector.get(PERMISSIONS_KEY, target);
      return Array.isArray(meta) ? meta : [];
    };
    expect(getPerms('list')).toEqual(['release.view']);
    expect(getPerms('create')).toEqual(['release.manage']);
    expect(getPerms('addPackage')).toEqual(['release.manage']);
    expect(getPerms('publish')).toEqual(['release.publish']);
    expect(getPerms('revoke')).toEqual(['release.revoke']);
  });

  it('seed creates all release.* permissions and maps them to the admin role (idempotent)', async () => {
    await seeder.seedReleasePermissions();
    const names = [
      'release.view',
      'release.manage',
      'release.publish',
      'release.revoke',
      'release.download',
    ];
    for (const name of names) {
      const perm = await database.permissions.findByName(name);
      expect(perm).toBeTruthy();
    }
    const adminPerms = await database.permissions.getPermissionsByRole(adminRoleId);
    const adminNames = adminPerms.map((p: any) => p.name);
    for (const name of names) {
      expect(adminNames).toContain(name);
    }

    // Idempotent — a second run creates no duplicates and keeps the mapping.
    const before = (await database.permissions.findAll({ page: 1, pageSize: 200 } as any)).data
      .length;
    await seeder.seedReleasePermissions();
    const after = (await database.permissions.findAll({ page: 1, pageSize: 200 } as any)).data
      .length;
    expect(after).toBe(before);
    const recheck = await database.permissions.getPermissionsByRole(adminRoleId);
    expect(recheck.length).toBe(adminPerms.length);
  });

  it('a support role without release.* cannot publish or revoke', async () => {
    const support = await database.roles.createRole({ name: 'support', description: 'Support' });
    // Grant only license.view + central-style rights (family), no release.*.
    const licView = await database.permissions.create({
      name: 'license.view',
      description: 'license view',
      resource: 'license',
      action: 'view',
    } as any);
    await database.roles.assignPermissionToRole(support.id, licView.id);

    const supportPerms = await database.permissions.getPermissionsByRole(support.id);
    const names = supportPerms.map((p: any) => p.name);
    expect(names).toContain('license.view');
    // No release.* permission reachable through the family mapping.
    expect(names.some((n: string) => n.startsWith('release.'))).toBe(false);
    expect(
      names.some(
        (n: string) =>
          grantsPermission(n, 'release.publish') || grantsPermission(n, 'release.revoke'),
      ),
    ).toBe(false);
  });
});
