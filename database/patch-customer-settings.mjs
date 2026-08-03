/**
 * 🔧 PATCH — Customer Settings columns on shranix_sales_settings
 *
 * Adds the 8 new Customer Settings columns (default_credit_limit, customer_groups,
 * default_customer_group, loyalty_enabled, loyalty_points_per_amount,
 * default_price_list, gst_validation, pan_validation) to EVERY dev.db copy in the
 * repo, idempotently.
 *
 * Why: the schema lives in database/src/schema/sales.ts and is synced by
 * sync-schema.mjs (which only targets ../data/dev.db). backend/data/dev.db and
 * database/data/dev.db are older copies — saving Customer Settings there throws
 * "no such column". This script patches all of them.
 *
 * Usage: cd database && node patch-customer-settings.mjs
 */
import { createClient } from '@libsql/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');

const TARGETS = [
  resolve(root, 'data/dev.db'),
  resolve(root, 'backend/data/dev.db'),
  resolve(root, 'database/data/dev.db'),
];

const COLUMNS = [
  ['default_credit_limit', 'real DEFAULT 0'],
  ['customer_groups', 'text DEFAULT \'\''],
  ['default_customer_group', 'text DEFAULT \'\''],
  ['loyalty_enabled', 'integer DEFAULT 0'],
  ['loyalty_points_per_amount', 'integer DEFAULT 100'],
  ['default_price_list', 'text DEFAULT \'standard\''],
  ['gst_validation', 'integer DEFAULT 1'],
  ['pan_validation', 'integer DEFAULT 1'],
];

async function columnExists(client, table, col) {
  const r = await client.execute(`PRAGMA table_info('${table}')`);
  return (r.rows || []).some((row) => row.name === col);
}

async function tableExists(client, table) {
  const r = await client.execute(`SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='${table}'`);
  return (r.rows || []).length > 0;
}

for (const url of TARGETS) {
  if (!existsSync(url)) {
    console.log(`--- ${url}: MISSING FILE (skipped)`);
    continue;
  }
  const client = createClient({ url: `file:${url}` });
  try {
    if (!(await tableExists(client, 'shranix_sales_settings'))) {
      console.log(`--- ${url}: table not found (skipped)`);
      client.close();
      continue;
    }
    let added = 0;
    for (const [col, def] of COLUMNS) {
      if (!(await columnExists(client, 'shranix_sales_settings', col))) {
        await client.execute(`ALTER TABLE shranix_sales_settings ADD COLUMN ${col} ${def}`);
        added++;
        console.log(`+ ${url} → ${col}`);
      }
    }
    console.log(`--- ${url}: ${added} column(s) added`);
  } catch (e) {
    console.log(`--- ${url}: ERROR ${e.message}`);
  } finally {
    client.close();
  }
}
console.log('\n✅ CUSTOMER SETTINGS COLUMNS PATCH COMPLETE');
