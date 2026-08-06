// Patch: Quotation Master — revision history + branch + FY prefix numbering
// Adds columns to existing SQLite dev databases (idempotent).
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const DB_CANDIDATES = [
  join(ROOT, 'backend', 'data', 'dev.db'),
  join(ROOT, 'data', 'dev.db'),
  join(ROOT, 'database', 'data', 'dev.db'),
];

// table → { column, ddl } — ALTER TABLE ... ADD COLUMN (SQLite-safe types)
const QUOTATION_COLUMNS = [
  { column: 'branch_id', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN branch_id TEXT' },
  { column: 'revision', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN revision INTEGER NOT NULL DEFAULT 1' },
  { column: 'parent_quote_id', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN parent_quote_id TEXT' },
  { column: 'billing_address', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN billing_address TEXT' },
  { column: 'shipping_address', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN shipping_address TEXT' },
  { column: 'contact_person', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN contact_person TEXT' },
  { column: 'payment_terms', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN payment_terms TEXT' },
  { column: 'delivery_time', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN delivery_time TEXT' },
  { column: 'freight', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN freight REAL NOT NULL DEFAULT 0' },
  { column: 'installation_charges', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN installation_charges REAL NOT NULL DEFAULT 0' },
  { column: 'warranty', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN warranty TEXT' },
  { column: 'customer_notes', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN customer_notes TEXT' },
  { column: 'sent_at', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN sent_at TEXT' },
  { column: 'sent_via', ddl: 'ALTER TABLE shranix_sales_quotations ADD COLUMN sent_via TEXT' },
];

const SETTINGS_COLUMNS = [
  { column: 'quote_fy_prefix', ddl: 'ALTER TABLE shranix_sales_settings ADD COLUMN quote_fy_prefix INTEGER NOT NULL DEFAULT 0' },
  { column: 'quote_branch_prefix', ddl: 'ALTER TABLE shranix_sales_settings ADD COLUMN quote_branch_prefix INTEGER NOT NULL DEFAULT 0' },
];

// shranix_quotation_items — full DDL (used only if the table does not exist yet)
const QUOTATION_ITEMS_DDL = `
CREATE TABLE IF NOT EXISTS shranix_quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  variant_id TEXT,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_id TEXT,
  rate REAL NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  taxable_value REAL NOT NULL DEFAULT 0,
  gst_rate REAL NOT NULL DEFAULT 0,
  igst REAL NOT NULL DEFAULT 0,
  cgst REAL NOT NULL DEFAULT 0,
  sgst REAL NOT NULL DEFAULT 0,
  cess REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  batch_no TEXT,
  hsn_code TEXT,
  barcode TEXT,
  free_qty REAL NOT NULL DEFAULT 0,
  discount_type TEXT,
  remarks TEXT,
  warehouse TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0
);
`;

const QUOTATION_ITEMS_COLUMNS = [
  { column: 'created_at', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN created_at TEXT' },
  { column: 'updated_at', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN updated_at TEXT' },
  { column: 'deleted_at', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN deleted_at TEXT' },
  { column: 'is_deleted', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0' },
  { column: 'batch_no', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN batch_no TEXT' },
  { column: 'hsn_code', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN hsn_code TEXT' },
  { column: 'barcode', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN barcode TEXT' },
  { column: 'free_qty', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN free_qty REAL NOT NULL DEFAULT 0' },
  { column: 'discount_type', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN discount_type TEXT' },
  { column: 'remarks', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN remarks TEXT' },
  { column: 'warehouse', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN warehouse TEXT' },
  { column: 'expiry_date', ddl: 'ALTER TABLE shranix_quotation_items ADD COLUMN expiry_date TEXT' },
];

function existingColumns(db, table) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return new Set(rows.map((r) => r.name));
  } catch {
    return new Set();
  }
}

let any = false;
for (const file of DB_CANDIDATES) {
  if (!existsSync(file)) continue;
  let db;
  try {
    db = new DatabaseSync(file);
  } catch (e) {
    console.log(`SKIP ${file} (open failed: ${e.message})`);
    continue;
  }
  console.log(`\n=== ${file} ===`);

  const qCols = existingColumns(db, 'shranix_sales_quotations');
  for (const c of QUOTATION_COLUMNS) {
    if (qCols.has(c.column)) {
      console.log(`  ok   sales_quotations.${c.column} (exists)`);
    } else {
      db.exec(c.ddl);
      console.log(`  ADD  sales_quotations.${c.column}`);
      any = true;
    }
  }

  const sCols = existingColumns(db, 'shranix_sales_settings');
  for (const c of SETTINGS_COLUMNS) {
    if (sCols.has(c.column)) {
      console.log(`  ok   sales_settings.${c.column} (exists)`);
    } else {
      db.exec(c.ddl);
      console.log(`  ADD  sales_settings.${c.column}`);
      any = true;
    }
  }

  // quotation items table — create if missing, then add new columns
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='shranix_quotation_items'`).all();
  if (tables.length === 0) {
    db.exec(QUOTATION_ITEMS_DDL);
    console.log('  ADD  table shranix_quotation_items (full DDL)');
    any = true;
  } else {
    const iCols = existingColumns(db, 'shranix_quotation_items');
    for (const c of QUOTATION_ITEMS_COLUMNS) {
      if (iCols.has(c.column)) {
        console.log(`  ok   quotation_items.${c.column} (exists)`);
      } else {
        db.exec(c.ddl);
        console.log(`  ADD  quotation_items.${c.column}`);
        any = true;
      }
    }
  }

  db.close();
}

console.log(`\n${any ? '✅ Migration applied (new columns added).' : 'ℹ️  No changes needed — all columns already present.'}`);
