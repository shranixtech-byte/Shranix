/**
 * 🔧 PATCH — Financial Settings columns on shranix_accounting_settings
 *
 * Adds the 9 Financial Settings columns (fiscal_year_lock, period_lock, ...,
 * rounding_rule) to EVERY dev.db copy in the repo, idempotently.
 *
 * Why: the schema lives in database/src/schema/finance.ts and is synced by
 * sync-schema.mjs (which only targets ../data/dev.db). backend/data/dev.db and
 * database/data/dev.db are older copies — saving Financial Settings there
 * throws "no such column". This script patches all of them.
 *
 * Usage: cd database && node patch-finance-settings.mjs
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
  ['fiscal_year_lock', 'integer DEFAULT 0'],
  ['period_lock', 'integer DEFAULT 0'],
  ['period_lock_date', 'text'],
  ['voucher_lock', 'integer DEFAULT 0'],
  ['closing_date', 'text'],
  ['opening_balance_lock', 'integer DEFAULT 0'],
  ['default_ledger_account_id', 'text'],
  ['default_tax_group_id', 'text'],
  ['rounding_rule', "text DEFAULT 'nearest'"],
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
    if (!(await tableExists(client, 'shranix_accounting_settings'))) {
      console.log(`--- ${url}: table not found (skipped)`);
      client.close();
      continue;
    }
    let added = 0;
    for (const [col, def] of COLUMNS) {
      if (!(await columnExists(client, 'shranix_accounting_settings', col))) {
        await client.execute(`ALTER TABLE shranix_accounting_settings ADD COLUMN ${col} ${def}`);
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
console.log('\n✅ FINANCIAL SETTINGS COLUMNS PATCH COMPLETE');
