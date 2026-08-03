/**
 * 🔧 PATCH — Sales Settings columns on shranix_sales_settings
 *
 * Adds the 7 new Sales Settings columns (discount_approval, discount_approval_limit,
 * enforce_credit_limit, overdue_alert, overdue_alert_days, salesman_mandatory,
 * quotation_expiry_days) to EVERY dev.db copy in the repo, idempotently.
 *
 * Why: the schema lives in database/src/schema/sales.ts and is synced by
 * sync-schema.mjs (which only targets ../data/dev.db). backend/data/dev.db and
 * database/data/dev.db are older copies — saving Sales Settings there throws
 * "no such column". This script patches all of them.
 *
 * Usage: cd database && node patch-sales-settings.mjs
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
  ['discount_approval', 'integer DEFAULT 0'],
  ['discount_approval_limit', 'integer DEFAULT 30'],
  ['enforce_credit_limit', 'integer DEFAULT 1'],
  ['overdue_alert', 'integer DEFAULT 0'],
  ['overdue_alert_days', 'integer DEFAULT 5'],
  ['salesman_mandatory', 'integer DEFAULT 0'],
  ['quotation_expiry_days', 'integer DEFAULT 15'],
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
console.log('\n✅ SALES SETTINGS COLUMNS PATCH COMPLETE');
