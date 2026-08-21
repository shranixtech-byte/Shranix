import { createClient } from '@libsql/client';
import * as path from 'path';
import * as fs from 'fs';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const dbPaths = [
  path.resolve('../data/dev.db'),
  path.resolve('../backend/data/dev.db'),
  path.resolve('data/dev.db'),
];

async function syncDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`[Skip] DB does not exist: ${dbPath}`);
    return;
  }

  console.log(`\n🔄 Syncing DB: ${dbPath}`);
  const client = createClient({ url: `file:${dbPath}` });

  try {
    // 1. Create shranix_job_locks table if missing
    await client.execute(`
      CREATE TABLE IF NOT EXISTS shranix_job_locks (
        id text PRIMARY KEY NOT NULL,
        job_key text NOT NULL,
        owner_token text NOT NULL,
        acquired_at text NOT NULL,
        expires_at text NOT NULL,
        updated_at text NOT NULL
      );
    `);
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS job_lock_key_idx ON shranix_job_locks (job_key);
    `);
    console.log('  ✓ Table shranix_job_locks verified/created');

    // 2. Ensure Admin User exists & password is 'admin123'
    const now = new Date().toISOString();
    const passwordHash = await argon2.hash('admin123', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const userRes = await client.execute("SELECT id FROM shranix_users WHERE email = 'admin@shranix.com'");
    if (userRes.rows.length === 0) {
      const adminUserId = crypto.randomUUID();
      await client.execute({
        sql: `INSERT INTO shranix_users (id, created_at, updated_at, is_deleted, email, password_hash, first_name, last_name, is_active, is_email_verified, failed_login_attempts, refresh_token_version) VALUES (?, ?, ?, 0, ?, ?, ?, ?, 1, 1, 0, 0)`,
        args: [adminUserId, now, now, 'admin@shranix.com', passwordHash, 'Admin', 'User'],
      });
      console.log('  ✓ Admin user created (admin@shranix.com / admin123)');

      // Create admin role if not exist
      const roleRes = await client.execute("SELECT id FROM shranix_roles WHERE name = 'admin'");
      let roleId;
      if (roleRes.rows.length === 0) {
        roleId = crypto.randomUUID();
        await client.execute({
          sql: `INSERT INTO shranix_roles (id, created_at, updated_at, is_deleted, name, description, is_system) VALUES (?, ?, ?, 0, 'admin', 'System Administrator', 1)`,
          args: [roleId, now, now],
        });
      } else {
        roleId = roleRes.rows[0].id;
      }
      await client.execute({
        sql: `INSERT INTO shranix_user_roles (id, user_id, role_id) VALUES (?, ?, ?)`,
        args: [crypto.randomUUID(), adminUserId, roleId],
      });
    } else {
      // Update password hash to admin123 and reset failed attempts
      await client.execute({
        sql: `UPDATE shranix_users SET password_hash = ?, failed_login_attempts = 0, is_active = 1 WHERE email = 'admin@shranix.com'`,
        args: [passwordHash],
      });
      console.log('  ✓ Admin user updated & password set to admin123');
    }
  } catch (err) {
    console.error(`  ❌ Error syncing ${dbPath}:`, err.message);
  }
}

async function main() {
  for (const p of dbPaths) {
    await syncDb(p);
  }
  console.log('\n🎉 ALL DATABASE FILES ARE READY AND SYNCED!');
}

main();
