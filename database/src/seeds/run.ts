import { loadDatabaseConfig } from '../config/index';
import { createDatabaseClient, closeDatabaseClient, getRawClient } from '../client/index';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';

// Core ERP permissions to seed for admin role
const CORE_PERMISSIONS = [
  { name: 'auth.*', resource: 'auth', action: '*' },
  { name: 'users.*', resource: 'users', action: '*' },
  { name: 'roles.*', resource: 'roles', action: '*' },
  { name: 'permissions.*', resource: 'permissions', action: '*' },
  { name: 'masters.*', resource: 'masters', action: '*' },
  { name: 'inventory.*', resource: 'inventory', action: '*' },
  { name: 'purchase.*', resource: 'purchase', action: '*' },
  { name: 'sales.*', resource: 'sales', action: '*' },
  { name: 'finance.*', resource: 'finance', action: '*' },
  { name: 'gl.*', resource: 'gl', action: '*' },
  { name: 'gst.*', resource: 'gst', action: '*' },
  { name: 'workflow.*', resource: 'workflow', action: '*' },
  { name: 'reports.*', resource: 'reports', action: '*' },
  { name: 'dms.*', resource: 'dms', action: '*' },
  { name: 'ai.*', resource: 'ai', action: '*' },
  { name: 'multicompany.*', resource: 'multicompany', action: '*' },
  { name: 'hr.*', resource: 'hr', action: '*' },
  { name: 'crm.*', resource: 'crm', action: '*' },
  { name: 'assets.*', resource: 'assets', action: '*' },
  { name: 'integrations.*', resource: 'integrations', action: '*' },
  { name: 'governance.*', resource: 'governance', action: '*' },
];

async function runSeeds(): Promise<void> {
  const config = loadDatabaseConfig();
  console.log(`🌱 Seeding database: ${config.provider} @ ${config.url}`);

  createDatabaseClient(config);
  const rawClient = getRawClient(config);

  try {
    // ── Check if already seeded ──────────────────────
    const existingAdmin = await rawClient.execute("SELECT id FROM shranix_users WHERE email = 'admin@shranix.com'");
    const adminExists = Array.isArray(existingAdmin) ? existingAdmin.length > 0 : (existingAdmin?.rows?.length > 0);

    if (adminExists) {
      console.log('✅ Database already seeded, skipping...');
      return;
    }

    const now = new Date().toISOString();

    // ── Create admin role ────────────────────────────
    const adminRoleId = crypto.randomUUID();
    await rawClient.execute({
      sql: 'INSERT INTO shranix_roles (id, created_at, updated_at, is_deleted, name, description, is_system) VALUES (?, ?, ?, 0, ?, ?, 1)',
      args: [adminRoleId, now, now, 'admin', 'System Administrator'],
    });
    console.log('  ✓ Admin role created');

    // ── Create admin user ────────────────────────────
    const adminUserId = crypto.randomUUID();
    const passwordHash = await argon2.hash('admin123', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await rawClient.execute({
      sql: 'INSERT INTO shranix_users (id, created_at, updated_at, is_deleted, email, password_hash, first_name, last_name, is_active, is_email_verified, failed_login_attempts, refresh_token_version) VALUES (?, ?, ?, 0, ?, ?, ?, ?, 1, 1, 0, 0)',
      args: [adminUserId, now, now, 'admin@shranix.com', passwordHash, 'Admin', 'User'],
    });
    console.log('  ✓ Admin user created (admin@shranix.com / admin123)');

    // ── Assign admin role to admin user ──────────────
    await rawClient.execute({
      sql: 'INSERT INTO shranix_user_roles (id, user_id, role_id) VALUES (?, ?, ?)',
      args: [crypto.randomUUID(), adminUserId, adminRoleId],
    });
    console.log('  ✓ Admin role assigned');

    // ── Seed permissions ─────────────────────────────
    let permCount = 0;
    for (const perm of CORE_PERMISSIONS) {
      const permId = crypto.randomUUID();
      await rawClient.execute({
        sql: 'INSERT INTO shranix_permissions (id, created_at, updated_at, is_deleted, name, description, resource, action) VALUES (?, ?, ?, 0, ?, ?, ?, ?)',
        args: [permId, now, now, perm.name, `Full access to ${perm.resource}`, perm.resource, perm.action],
      });
      await rawClient.execute({
        sql: 'INSERT INTO shranix_role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)',
        args: [crypto.randomUUID(), adminRoleId, permId],
      });
      permCount++;
    }
    console.log(`  ✓ ${permCount} permissions created and assigned to admin role`);

    console.log('✅ Seeds completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseClient(config);
  }
}

runSeeds();
