/**
 * 🔧 PATCH — Purchase Settings columns on shranix_purchase_settings
 *
 * Adds the 5 new Purchase Settings columns (auto_grn, supplier_credit_days,
 * default_tax_group_id, default_warehouse_id, default_payment_mode) to EVERY
 * dev.db copy in the repo, idempotently.
 *
 * Why: the schema lives in database/src/schema/purchase.ts and is synced by
 * sync-schema.mjs (which only targets ../data/dev.db). backend/data/dev.db and
 * database/data/dev.db are older copies — saving Purchase Settings there
 * throws "no such column". This script patches all of them.
 *
 * Usage: cd database && node patch-purchase-settings.mjs
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
  ['auto_grn', 'integer DEFAULT 0'],
  ['supplier_credit_days', 'integer DEFAULT 30'],
  ['default_tax_group_id', 'text'],
  ['default_warehouse_id', 'text'],
  ['default_payment_mode', "text DEFAULT 'credit'"],
  // Supplier Settings (Settings Hub → Purchase → Supplier) — match schema notNull defaults
  ['default_supplier_category', 'text'],
  ['default_vendor_rating', 'integer NOT NULL DEFAULT 3'],
  ['default_gst_rate', 'real NOT NULL DEFAULT 0'],
  ['require_vendor_approval', 'integer NOT NULL DEFAULT 0'],
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
    if (!(await tableExists(client, 'shranix_purchase_settings'))) {
      console.log(`--- ${url}: table not found (skipped)`);
      client.close();
      continue;
    }
    let added = 0;
    for (const [col, def] of COLUMNS) {
      if (!(await columnExists(client, 'shranix_purchase_settings', col))) {
        await client.execute(`ALTER TABLE shranix_purchase_settings ADD COLUMN ${col} ${def}`);
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
console.log('\n✅ PURCHASE SETTINGS COLUMNS PATCH COMPLETE');
