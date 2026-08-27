/**
 * 🔧 PATCH — Purchase Settings & Invoices columns
 */
import { createClient } from '@libsql/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');

const TARGETS = [
  resolve(root, 'data/dev.db'),
  resolve(root, 'backend/data/dev.db'),
  resolve(root, 'database/data/dev.db'),
  resolve(process.cwd(), 'data/dev.db'),
];

const SETTINGS_COLUMNS = [
  ['auto_grn', 'integer DEFAULT 0'],
  ['supplier_credit_days', 'integer DEFAULT 30'],
  ['default_tax_group_id', 'text'],
  ['default_warehouse_id', 'text'],
  ['default_payment_mode', "text DEFAULT 'credit'"],
  ['default_supplier_category', 'text'],
  ['default_vendor_rating', 'integer NOT NULL DEFAULT 3'],
  ['default_gst_rate', 'real NOT NULL DEFAULT 0'],
  ['require_vendor_approval', 'integer NOT NULL DEFAULT 0'],
];

const INVOICE_COLUMNS = [
  ['branch_id', 'text'],
  ['financial_year_id', 'text'],
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
    if (await tableExists(client, 'shranix_purchase_settings')) {
      let added = 0;
      for (const [col, def] of SETTINGS_COLUMNS) {
        if (!(await columnExists(client, 'shranix_purchase_settings', col))) {
          await client.execute(`ALTER TABLE shranix_purchase_settings ADD COLUMN ${col} ${def}`);
          added++;
          console.log(`+ ${url} → shranix_purchase_settings.${col}`);
        }
      }
      console.log(`--- ${url}: ${added} settings column(s) added`);
    }

    if (await tableExists(client, 'shranix_purchase_invoices')) {
      let addedInv = 0;
      for (const [col, def] of INVOICE_COLUMNS) {
        if (!(await columnExists(client, 'shranix_purchase_invoices', col))) {
          await client.execute(`ALTER TABLE shranix_purchase_invoices ADD COLUMN ${col} ${def}`);
          addedInv++;
          console.log(`+ ${url} → shranix_purchase_invoices.${col}`);
        }
      }
      console.log(`--- ${url}: ${addedInv} purchase invoices column(s) added`);
    }
  } catch (e) {
    console.log(`--- ${url}: ERROR ${e.message}`);
  } finally {
    client.close();
  }
}
console.log('\n✅ PURCHASE SETTINGS & INVOICES COLUMNS PATCH COMPLETE');
