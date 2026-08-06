// Idempotent migration apply — adds the base soft-delete/timestamp columns that
// were missing from the approval tables (CRIT-001 durable fix).
// Mirrors migration 0004_naive_ken_ellis.sql (approval-table section only) so the
// dev DBs (created via db:push, not the migrate chain) match the drizzle schema.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dbs = [
  path.join(root, 'data', 'dev.db'),
  path.join(root, 'backend', 'data', 'dev.db'),
  path.join(root, 'database', 'data', 'dev.db'),
];

// [table, column, ddl] — only for the three approval tables.
const ALTERS = [
  ['shranix_approval_comments', 'updated_at', 'ALTER TABLE `shranix_approval_comments` ADD `updated_at` text'],
  ['shranix_approval_comments', 'deleted_at', 'ALTER TABLE `shranix_approval_comments` ADD `deleted_at` text'],
  ['shranix_approval_comments', 'is_deleted', 'ALTER TABLE `shranix_approval_comments` ADD `is_deleted` integer DEFAULT false NOT NULL'],
  ['shranix_approval_history', 'created_at', 'ALTER TABLE `shranix_approval_history` ADD `created_at` text'],
  ['shranix_approval_history', 'updated_at', 'ALTER TABLE `shranix_approval_history` ADD `updated_at` text'],
  ['shranix_approval_history', 'deleted_at', 'ALTER TABLE `shranix_approval_history` ADD `deleted_at` text'],
  ['shranix_approval_history', 'is_deleted', 'ALTER TABLE `shranix_approval_history` ADD `is_deleted` integer DEFAULT false NOT NULL'],
  ['shranix_approval_notifications', 'updated_at', 'ALTER TABLE `shranix_approval_notifications` ADD `updated_at` text'],
  ['shranix_approval_notifications', 'deleted_at', 'ALTER TABLE `shranix_approval_notifications` ADD `deleted_at` text'],
  ['shranix_approval_notifications', 'is_deleted', 'ALTER TABLE `shranix_approval_notifications` ADD `is_deleted` integer DEFAULT false NOT NULL'],
];

async function applyTo(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`SKIP (no file): ${dbPath}`);
    return;
  }
  const client = createClient({ url: `file:${dbPath}` });
  let applied = 0;
  for (const [table, column, ddl] of ALTERS) {
    const info = await client.execute({ sql: `PRAGMA table_info(${table})`, args: [] });
    const has = info.rows.some((r) => r.name === column);
    if (!has) {
      try {
        await client.execute({ sql: ddl, args: [] });
        applied += 1;
        console.log(`  + ${table}.${column}`);
      } catch (e) {
        console.log(`  ! ${table}.${column} FAILED: ${e.message}`);
      }
    }
  }
  console.log(`${path.relative(root, dbPath)}: ${applied} column(s) added`);
  client.close();
}

for (const db of dbs) {
  await applyTo(db);
}
console.log('Done.');
