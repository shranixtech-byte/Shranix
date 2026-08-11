/**
 * 📒 Seed the default hierarchical Chart of Accounts into the live dev DB.
 *
 * Creates the standard SHRANIX account structure (configurable below):
 *   ASSETS / LIABILITIES / EQUITY / INCOME / EXPENSES
 * with child groups and default ledger accounts — so sales/purchase posting
 * finds Sundry Creditor / Debtors / Sales / Purchase / GST accounts.
 *
 * Usage:  node scripts/seed-default-coa.mjs
 * Safe:   skips groups/accounts that already exist (idempotent).
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(process.cwd(), 'database/package.json'));
const { createClient } = req('@libsql/client');

// Default targets the backend's runtime DB (backend/src/config/database.config.ts
// uses `file:./data/dev.db` relative to the backend cwd → backend/data/dev.db).
// Override with SEED_DB_URL=file:... to seed any other database.
const DB_URL = process.env.SEED_DB_URL || 'file:backend/data/dev.db';
const c = createClient({ url: DB_URL });
const now = new Date().toISOString();

// ── Standard Account Groups (configurable default structure) ────────────────
// level 0 = root type groups, level 1 = natural sub-groups, level 2 = detail
const GROUPS = [
  // ASSETS
  { name: 'ASSETS', type: 'assets', level: 0, parent: null, sort: 1, system: true },
  { name: 'Current Assets', type: 'assets', level: 1, parent: 'ASSETS', sort: 1, system: true },
  { name: 'Fixed Assets', type: 'assets', level: 1, parent: 'ASSETS', sort: 2, system: true },
  { name: 'Bank Accounts', type: 'assets', level: 2, parent: 'Current Assets', sort: 1, system: true },
  { name: 'Cash-in-Hand', type: 'assets', level: 2, parent: 'Current Assets', sort: 2, system: true },
  { name: 'Accounts Receivable', type: 'assets', level: 2, parent: 'Current Assets', sort: 3, system: true },
  { name: 'Inventory', type: 'assets', level: 2, parent: 'Current Assets', sort: 4, system: true },
  { name: 'Other Current Assets', type: 'assets', level: 2, parent: 'Current Assets', sort: 5, system: true },
  // LIABILITIES
  { name: 'LIABILITIES', type: 'liabilities', level: 0, parent: null, sort: 2, system: true },
  { name: 'Current Liabilities', type: 'liabilities', level: 1, parent: 'LIABILITIES', sort: 1, system: true },
  { name: 'Accounts Payable', type: 'liabilities', level: 2, parent: 'Current Liabilities', sort: 1, system: true },
  { name: 'GST Payable', type: 'liabilities', level: 2, parent: 'Current Liabilities', sort: 2, system: true },
  { name: 'Other Current Liabilities', type: 'liabilities', level: 2, parent: 'Current Liabilities', sort: 3, system: true },
  { name: 'Loans', type: 'liabilities', level: 1, parent: 'LIABILITIES', sort: 2, system: true },
  // EQUITY
  { name: 'EQUITY', type: 'equity', level: 0, parent: null, sort: 3, system: true },
  { name: 'Capital', type: 'equity', level: 1, parent: 'EQUITY', sort: 1, system: true },
  { name: 'Retained Earnings', type: 'equity', level: 1, parent: 'EQUITY', sort: 2, system: true },
  { name: 'Drawings', type: 'equity', level: 1, parent: 'EQUITY', sort: 3, system: true },
  // INCOME
  { name: 'INCOME', type: 'income', level: 0, parent: null, sort: 4, system: true },
  { name: 'Sales', type: 'income', level: 1, parent: 'INCOME', sort: 1, system: true },
  { name: 'Other Income', type: 'income', level: 1, parent: 'INCOME', sort: 2, system: true },
  { name: 'Discount Received', type: 'income', level: 1, parent: 'INCOME', sort: 3, system: true },
  // EXPENSES
  { name: 'EXPENSES', type: 'expenses', level: 0, parent: null, sort: 5, system: true },
  { name: 'Direct Expenses', type: 'expenses', level: 1, parent: 'EXPENSES', sort: 1, system: true },
  { name: 'Indirect Expenses', type: 'expenses', level: 1, parent: 'EXPENSES', sort: 2, system: true },
  { name: 'Purchase Accounts', type: 'expenses', level: 2, parent: 'Direct Expenses', sort: 1, system: true },
  { name: 'Administrative Expenses', type: 'expenses', level: 2, parent: 'Indirect Expenses', sort: 1, system: true },
  { name: 'Selling & Distribution', type: 'expenses', level: 2, parent: 'Indirect Expenses', sort: 2, system: true },
  { name: 'Finance Charges', type: 'expenses', level: 2, parent: 'Indirect Expenses', sort: 3, system: true },
];

// ── Default Ledger Accounts ─────────────────────────────────────────────────
// group: parent group name · type: account_type (assets/liabilities/income/expenses/equity)
const ACCOUNTS = [
  // Cash & Bank
  { code: 'CASH-01', name: 'Cash in Hand', group: 'Cash-in-Hand', type: 'assets', isCash: true },
  { code: 'BANK-01', name: 'Bank Account (Default)', group: 'Bank Accounts', type: 'assets', isCash: false, bankRecon: true },
  // Receivables / Payables
  { code: 'DEBT-01', name: 'Sundry Debtors', group: 'Accounts Receivable', type: 'assets', isCash: false, control: true, manual: false },
  { code: 'CRED-01', name: 'Sundry Creditors', group: 'Accounts Payable', type: 'liabilities', isCash: false, control: true, manual: false },
  // Inventory
  { code: 'INV-01', name: 'Inventory (Stock)', group: 'Inventory', type: 'assets', isCash: false },
  // GST
  { code: 'GST-IN-01', name: 'GST Input (CGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  { code: 'GST-IN-02', name: 'GST Input (SGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  { code: 'GST-IN-03', name: 'GST Input (IGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  { code: 'GST-OUT-01', name: 'GST Output (CGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  { code: 'GST-OUT-02', name: 'GST Output (SGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  { code: 'GST-OUT-03', name: 'GST Output (IGST)', group: 'GST Payable', type: 'liabilities', isCash: false },
  // Equity
  { code: 'CAP-01', name: 'Capital Account', group: 'Capital', type: 'equity', isCash: false },
  { code: 'RE-01', name: 'Retained Earnings', group: 'Retained Earnings', type: 'equity', isCash: false },
  // Income
  { code: 'SALE-01', name: 'Sales Account', group: 'Sales', type: 'income', isCash: false },
  { code: 'SALE-02', name: 'Sales Returns', group: 'Sales', type: 'income', isCash: false },
  { code: 'OI-01', name: 'Other Income', group: 'Other Income', type: 'income', isCash: false },
  { code: 'DI-01', name: 'Discount Received', group: 'Discount Received', type: 'income', isCash: false },
  // Expenses
  { code: 'PUR-01', name: 'Purchase Account', group: 'Purchase Accounts', type: 'expenses', isCash: false },
  { code: 'PUR-02', name: 'Purchase Returns', group: 'Purchase Accounts', type: 'expenses', isCash: false },
  { code: 'EXP-01', name: 'Salary Expenses', group: 'Administrative Expenses', type: 'expenses', isCash: false },
  { code: 'EXP-02', name: 'Rent Expenses', group: 'Administrative Expenses', type: 'expenses', isCash: false },
  { code: 'EXP-03', name: 'Electricity Expenses', group: 'Administrative Expenses', type: 'expenses', isCash: false },
  { code: 'EXP-04', name: 'Transport Expenses', group: 'Selling & Distribution', type: 'expenses', isCash: false },
  { code: 'EXP-05', name: 'Bank Charges', group: 'Finance Charges', type: 'expenses', isCash: false },
  { code: 'EXP-06', name: 'Discount Allowed', group: 'Selling & Distribution', type: 'expenses', isCash: false },
  { code: 'EXP-07', name: 'Other Expenses', group: 'Administrative Expenses', type: 'expenses', isCash: false },
];

async function count(table) {
  const r = await c.execute(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(r.rows[0].c);
}

async function main() {
  const groupCount = await count('shranix_account_groups');
  const groupIdByName = new Map();

  if (groupCount === 0) {
    for (const g of GROUPS) {
      const id = randomUUID();
      const parentId = g.parent ? groupIdByName.get(g.parent) : null;
      const path = parentId ? `${parentId}/${id}` : `/${id}`;
      await c.execute({
        sql: 'INSERT INTO shranix_account_groups (id, created_at, updated_at, name, type, parent_id, level, path, sort_order, is_system, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)',
        args: [id, now, now, g.name, g.type, parentId, g.level, path, g.sort],
      });
      groupIdByName.set(g.name, id);
    }
    console.log(`✅ Seeded ${GROUPS.length} account groups.`);
  } else {
    const g = await c.execute('SELECT id, name FROM shranix_account_groups');
    for (const row of g.rows) {
      groupIdByName.set(row.name, row.id);
    }
    console.log(`⏭️  ${groupCount} account groups already exist — skipping groups.`);
  }

  // Per-account guard (by code) so a partially seeded DB still gets missing defaults.
  const existing = await c.execute(
    "SELECT account_code FROM shranix_chart_of_accounts WHERE is_deleted = 0",
  );
  const existingCodes = new Set(existing.rows.map((r) => r.account_code));
  let created = 0;
  let skipped = 0;
  for (const a of ACCOUNTS) {
    if (existingCodes.has(a.code)) {
      skipped += 1;
      continue;
    }
    const groupId = groupIdByName.get(a.group);
    if (!groupId) {
      console.warn(`⚠️  Skipping account ${a.name}: group "${a.group}" not found`);
      continue;
    }
    await c.execute({
      sql: 'INSERT INTO shranix_chart_of_accounts (id, created_at, updated_at, account_code, account_name, account_type, group_id, opening_balance, opening_balance_type, currency, is_active, cost_center_required, gst_applicable, bank_reconciliation, is_cash_account, is_control_account, allow_manual_posting, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, \'INR\', 1, 0, 0, ?, ?, ?, ?, 0)',
      args: [
        randomUUID(), now, now,
        a.code, a.name, a.type, groupId,
        a.type === 'liabilities' || a.type === 'income' || a.type === 'equity' ? 'credit' : 'debit',
        a.bankRecon ? 1 : 0,
        a.isCash ? 1 : 0,
        a.control ? 1 : 0,
        a.manual === false ? 0 : 1,
      ],
    });
    created += 1;
  }
  console.log(`✅ Seeded ${created} chart-of-accounts ledgers (${skipped} already present).`);

  const summary = await c.execute(
    "SELECT account_type, COUNT(*) AS c FROM shranix_chart_of_accounts GROUP BY account_type",
  );
  console.log('COA summary:', summary.rows.map((r) => `${r.account_type}=${r.c}`).join(', '));
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
