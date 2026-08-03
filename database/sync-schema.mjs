/**
 * 🔧 SCHEMA SYNC (idempotent) — bring stale live dev.db up to current schema.
 *
 * The live DB was created from an old schema and is missing many tables
 * (stock_ledger, approval_matrices, approval_history, inv_stock_balance,
 * gst_ledger, workflow_* etc.) plus columns on existing tables
 * (sales_approvals lacks document_number → posting 500s).
 *
 * drizzle-kit push is interactive and hangs on rename prompts, so this script
 * replays drizzle's own generated migration (0003) statement-by-statement:
 *   • CREATE TABLE    → only if the table does not exist
 *   • ALTER ADD COL   → only if the column does not exist
 *   • rebuild blocks  → skipped (they reference __new_ tables); the affected
 *                       table (sales_approvals) is patched with plain ALTERs
 *   • indexes/pragmas → run in try/catch (may already exist)
 *
 * Usage: cd database && node sync-schema.mjs
 * Targets: ../data/dev.db (root live DB used by the backend)
 */
import { createClient } from '@libsql/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DB_URL = 'file:../data/dev.db';
const MIGRATION = path.resolve('src/migrations/0003_clumsy_jack_flag.sql');

const client = createClient({ url: DB_URL });

async function run(sql) {
  await client.execute(sql);
}

async function query(sql) {
  const r = await client.execute(sql);
  return r.rows;
}

async function tableExists(name) {
  const rows = await query(`SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return rows.length > 0;
}

async function columnExists(table, col) {
  if (!(await tableExists(table))) {return false;}
  const rows = await query(`PRAGMA table_info('${table}')`);
  return rows.some((r) => r.name === col);
}

/** Parse `CREATE TABLE `name`` (backtick or bare) */
function parseCreateTable(sql) {
  const m = sql.match(/CREATE TABLE\s+[`"']?([\w]+)[`"']?/i);
  return m ? m[1] : null;
}

/** Parse `ALTER TABLE `name` ADD `col`` */
function parseAlterAdd(sql) {
  const m = sql.match(/ALTER TABLE\s+[`"']?([\w]+)[`"']?\s+ADD\s+[`"']?([\w]+)[`"']?/i);
  return m ? { table: m[1], col: m[2] } : null;
}

const MISSING_APPROVAL_COLUMNS = [
  ['document_number', 'text'],
  ['customer_id', 'text'],
  ['customer_name', 'text'],
  ['amount', "real DEFAULT 0 NOT NULL"],
  ['discount_amount', "real DEFAULT 0 NOT NULL"],
  ['discount_percent', "real DEFAULT 0 NOT NULL"],
  ['gst_amount', "real DEFAULT 0 NOT NULL"],
  ['created_by', "text NOT NULL DEFAULT ''"],
  ['created_by_name', 'text'],
  ['current_level', "integer DEFAULT 1 NOT NULL"],
  ['total_levels', "integer DEFAULT 1 NOT NULL"],
  ['priority', "text DEFAULT 'medium' NOT NULL"],
  ['risk', "text DEFAULT 'low' NOT NULL"],
  ['credit_status', "text DEFAULT 'normal' NOT NULL"],
  ['assigned_to', 'text'],
  ['assigned_to_name', 'text'],
  ['is_overdue', "integer DEFAULT 0 NOT NULL"],
  ['due_date', 'text'],
];

async function main() {
  console.log('🔧 SHRANIX KRUSHI ERP — Schema Sync');
  console.log(`   DB: ${DB_URL}`);
  console.log(`   Migration: ${MIGRATION}`);
  console.log('');

  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let created = 0;
  let altered = 0;
  let skippedRebuild = 0;
  let indexOk = 0;
  let indexErr = 0;

  for (const stmt of statements) {
    // Skip any statement belonging to a table-rebuild block (__new_ references)
    if (stmt.includes('__new_')) {
      skippedRebuild++;
      continue;
    }
    // Never run bare DROP TABLE (only exists inside rebuild blocks we skip)
    if (/^DROP TABLE\s/i.test(stmt)) {
      skippedRebuild++;
      continue;
    }

    const createName = parseCreateTable(stmt);
    if (createName) {
      if (await tableExists(createName)) {
        console.log(`• skip (exists): ${createName}`);
        continue;
      }
      try {
        await run(stmt);
        created++;
        console.log(`+ CREATE TABLE ${createName}`);
      } catch (e) {
        console.log(`! CREATE ${createName} failed: ${e.message}`);
      }
      continue;
    }

    const alter = parseAlterAdd(stmt);
    if (alter) {
      if (await columnExists(alter.table, alter.col)) {
        continue;
      }
      try {
        await run(stmt);
        altered++;
        console.log(`+ ALTER ${alter.table} ADD ${alter.col}`);
      } catch (e) {
        console.log(`! ALTER ${alter.table}.${alter.col} failed: ${e.message}`);
      }
      continue;
    }

    // Indexes, pragmas, drops of indexes — run defensively
    try {
      await run(stmt);
      indexOk++;
    } catch {
      indexErr++;
    }
  }

  console.log('');
  console.log('──────────────────────────────────────────');
  console.log(`CREATE TABLE: ${created}`);
  console.log(`ALTER ADD:    ${altered}`);
  console.log(`Rebuild skip: ${skippedRebuild}`);
  console.log(`Indexes OK:   ${indexOk}  (errors: ${indexErr})`);
  console.log('──────────────────────────────────────────');

  // ── Patch shranix_sales_approvals with missing columns (plain ALTERs) ──
  if (await tableExists('shranix_sales_approvals')) {
    let patched = 0;
    for (const [col, def] of MISSING_APPROVAL_COLUMNS) {
      if (!(await columnExists('shranix_sales_approvals', col))) {
        await run(`ALTER TABLE shranix_sales_approvals ADD COLUMN ${col} ${def}`);
        patched++;
      }
    }
    console.log(`✅ shranix_sales_approvals patched: +${patched} columns`);
  }

  // ── Patch shranix_users with module-access column (idempotent) ──
  if (await tableExists('shranix_users')) {
    let userPatched = 0;
    const USER_COLUMNS = [
      ['allowed_modules', 'text'],
    ];
    for (const [col, def] of USER_COLUMNS) {
      if (!(await columnExists('shranix_users', col))) {
        await run(`ALTER TABLE shranix_users ADD COLUMN ${col} ${def}`);
        userPatched++;
      }
    }
    console.log(`✅ shranix_users patched: +${userPatched} columns`);
  }

  // ── Patch shranix_companies with new business columns (idempotent) ──
  if (await tableExists('shranix_companies')) {
    let companyPatched = 0;
    const COMPANY_COLUMNS = [
      ['license_no', 'text'],
      ['pesticides_license', 'text'],
      ['seeds_license', 'text'],
      ['cotton_license', 'text'],
      ['fertilizer_license', 'text'],
      ['retail_license', 'text'],
      ['stamp', 'text'],
      ['digital_signature', 'text'],
      ['invoice_signature', 'text'],
      ['email_logo', 'text'],
      ['invoice_footer', 'text'],
      ['qr_logo', 'text'],
    ];
    for (const [col, def] of COMPANY_COLUMNS) {
      if (!(await columnExists('shranix_companies', col))) {
        await run(`ALTER TABLE shranix_companies ADD COLUMN ${col} ${def}`);
        companyPatched++;
      }
    }
    console.log(`✅ shranix_companies patched: +${companyPatched} columns`);
  }

  // ── Patch shranix_accounting_settings with Financial Settings columns (idempotent) ──
  if (await tableExists('shranix_accounting_settings')) {
    let acctPatched = 0;
    const ACCOUNTING_SETTINGS_COLUMNS = [
      ['fiscal_year_lock', 'integer DEFAULT 0'],
      ['period_lock', 'integer DEFAULT 0'],
      ['period_lock_date', 'text'],
      ['voucher_lock', 'integer DEFAULT 0'],
      ['closing_date', 'text'],
      ['opening_balance_lock', 'integer DEFAULT 0'],
      ['default_ledger_account_id', 'text'],
      ['default_tax_group_id', 'text'],
      ['rounding_rule', 'text DEFAULT \'nearest\''],
    ];
    for (const [col, def] of ACCOUNTING_SETTINGS_COLUMNS) {
      if (!(await columnExists('shranix_accounting_settings', col))) {
        await run(`ALTER TABLE shranix_accounting_settings ADD COLUMN ${col} ${def}`);
        acctPatched++;
      }
    }
    console.log(`✅ shranix_accounting_settings patched: +${acctPatched} columns`);
  }

  // ── Patch shranix_sales_settings with invoice printing columns (idempotent) ──
  if (await tableExists('shranix_sales_settings')) {
    let settingsPatched = 0;
    const SALES_SETTINGS_COLUMNS = [
      ['invoice_suffix', "text NOT NULL DEFAULT ''"],
      ['print_format', "text NOT NULL DEFAULT 'a4_portrait'"],
      ['duplicate_copy', 'integer NOT NULL DEFAULT true'],
      ['transport_copy', 'integer NOT NULL DEFAULT false'],
      ['show_qr', 'integer NOT NULL DEFAULT true'],
      ['show_hsn', 'integer NOT NULL DEFAULT true'],
      ['show_batch', 'integer NOT NULL DEFAULT true'],
      ['show_expiry', 'integer NOT NULL DEFAULT true'],
      ['show_discount', 'integer NOT NULL DEFAULT true'],
      ['show_gst', 'integer NOT NULL DEFAULT true'],
      ['show_barcode', 'integer NOT NULL DEFAULT false'],
    ];
    for (const [col, def] of SALES_SETTINGS_COLUMNS) {
      if (!(await columnExists('shranix_sales_settings', col))) {
        await run(`ALTER TABLE shranix_sales_settings ADD COLUMN ${col} ${def}`);
        settingsPatched++;
      }
    }
    console.log(`✅ shranix_sales_settings patched: +${settingsPatched} columns`);
  }

  // ── Patch shranix_purchase_settings with Supplier Settings columns (idempotent) ──
  if (await tableExists('shranix_purchase_settings')) {
    let purchPatched = 0;
    const PURCHASE_SETTINGS_COLUMNS = [
      ['default_supplier_category', 'text'],
      ['default_vendor_rating', 'integer NOT NULL DEFAULT 3'],
      ['default_gst_rate', 'real NOT NULL DEFAULT 0'],
      ['require_vendor_approval', 'integer NOT NULL DEFAULT 0'],
    ];
    for (const [col, def] of PURCHASE_SETTINGS_COLUMNS) {
      if (!(await columnExists('shranix_purchase_settings', col))) {
        await run(`ALTER TABLE shranix_purchase_settings ADD COLUMN ${col} ${def}`);
        purchPatched++;
      }
    }
    console.log(`✅ shranix_purchase_settings patched: +${purchPatched} columns`);
  }

  // ── Patch shranix_inventory_settings with stock tracking columns (idempotent) ──
  if (await tableExists('shranix_inventory_settings')) {
    let invPatched = 0;
    const INVENTORY_SETTINGS_COLUMNS = [
      ['lot_tracking', 'integer NOT NULL DEFAULT false'],
      ['auto_barcode', 'integer NOT NULL DEFAULT false'],
      ['auto_sku', 'integer NOT NULL DEFAULT false'],
      ['low_stock_alert', 'integer NOT NULL DEFAULT true'],
      ['low_stock_threshold', 'integer NOT NULL DEFAULT 5'],
      ['stock_reservation', 'integer NOT NULL DEFAULT true'],
    ];
    for (const [col, def] of INVENTORY_SETTINGS_COLUMNS) {
      if (!(await columnExists('shranix_inventory_settings', col))) {
        await run(`ALTER TABLE shranix_inventory_settings ADD COLUMN ${col} ${def}`);
        invPatched++;
      }
    }
    console.log(`✅ shranix_inventory_settings patched: +${invPatched} columns`);
  }

  console.log('\n✅ SCHEMA SYNC COMPLETE');
}

main()
  .catch((e) => { console.error('❌ Sync failed:', e); process.exit(1); })
  .finally(() => client.close());
