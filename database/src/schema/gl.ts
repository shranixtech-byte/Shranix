import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  real as pgReal,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
  boolean as pgBoolean,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

const sqliteBase = {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// 1. GENERAL LEDGER ENTRIES (Posted Entries)
// ═════════════════════════════════════════════════════════
export const sqliteGlEntries = sqliteTableBase(
  'shranix_gl_entries',
  {
    ...sqliteBase,
    entryNumber: sqliteText('entry_number').notNull(),
    entryDate: sqliteText('entry_date').notNull(),
    accountId: sqliteText('account_id').notNull(),
    ledgerId: sqliteText('ledger_id'),
    voucherId: sqliteText('voucher_id').notNull(),
    voucherType: sqliteText('voucher_type').notNull(),
    voucherNumber: sqliteText('voucher_number').notNull(),
    debit: sqliteReal('debit').notNull().default(0),
    credit: sqliteReal('credit').notNull().default(0),
    balance: sqliteReal('balance').notNull().default(0),
    narration: sqliteText('narration'),
    partyId: sqliteText('party_id'),
    costCenterId: sqliteText('cost_center_id'),
    branchId: sqliteText('branch_id'),
    financialYearId: sqliteText('financial_year_id'),
    isReversal: sqliteInteger('is_reversal', { mode: 'boolean' }).notNull().default(false),
    reversedEntryId: sqliteText('reversed_entry_id'),
    reversalDate: sqliteText('reversal_date'),
    currency: sqliteText('currency').notNull().default('INR'),
    exchangeRate: sqliteReal('exchange_rate').notNull().default(1),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    glEntryNumberIdx: uniqueIndex('gl_entry_number_idx').on(table.entryNumber),
    // Duplicate protection per voucher-line: one account may appear only once per
    // voucher (a double-posted line is a genuine duplicate), but a voucher may have
    // MANY lines (Dr Customer / Cr Sales / Cr GST) — so voucher_id alone cannot be
    // unique. This also means the same account may appear in many vouchers per day.
    glVoucherIdx: uniqueIndex('gl_voucher_idx').on(table.voucherId, table.accountId),
    // Performance index for account+date ledgers/reports. NOT unique — a Sales
    // account legitimately receives many entries on the same day (multiple invoices).
    glAccountIdx: index('gl_account_date_idx').on(table.accountId, table.entryDate),
  }),
);

export const pgGlEntries = pgTableBase(
  'shranix_gl_entries',
  {
    ...pgBase,
    entryNumber: pgText('entry_number').notNull(),
    entryDate: pgTimestamp('entry_date', { withTimezone: true }).notNull(),
    accountId: pgUuid('account_id').notNull(),
    ledgerId: pgUuid('ledger_id'),
    voucherId: pgUuid('voucher_id').notNull(),
    voucherType: pgText('voucher_type').notNull(),
    voucherNumber: pgText('voucher_number').notNull(),
    debit: pgReal('debit').notNull().default(0),
    credit: pgReal('credit').notNull().default(0),
    balance: pgReal('balance').notNull().default(0),
    narration: pgText('narration'),
    partyId: pgUuid('party_id'),
    costCenterId: pgUuid('cost_center_id'),
    branchId: pgUuid('branch_id'),
    financialYearId: pgUuid('financial_year_id'),
    isReversal: pgBoolean('is_reversal').notNull().default(false),
    reversedEntryId: pgUuid('reversed_entry_id'),
    reversalDate: pgTimestamp('reversal_date', { withTimezone: true }),
    currency: pgText('currency').notNull().default('INR'),
    exchangeRate: pgReal('exchange_rate').notNull().default(1),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    glEntryNumberIdx: pgUniqueIndex('gl_entry_number_idx').on(table.entryNumber),
    glVoucherIdx: pgUniqueIndex('gl_voucher_idx').on(table.voucherId, table.accountId),
    glAccountIdx: pgIndex('gl_account_date_idx').on(table.accountId, table.entryDate),
  }),
);

// ═════════════════════════════════════════════════════════
// 2. FINANCIAL SNAPSHOTS (Cached Report Data)
// ═════════════════════════════════════════════════════════
export const sqliteFinancialSnapshots = sqliteTableBase(
  'shranix_financial_snapshots',
  {
    ...sqliteBase,
    snapshotType: sqliteText('snapshot_type').notNull(), // trial_balance, profit_loss, balance_sheet, cash_flow
    snapshotDate: sqliteText('snapshot_date').notNull(),
    financialYearId: sqliteText('financial_year_id'),
    branchId: sqliteText('branch_id'),
    costCenterId: sqliteText('cost_center_id'),
    data: sqliteText('data').notNull(), // JSON snapshot
    totalDebit: sqliteReal('total_debit').notNull().default(0),
    totalCredit: sqliteReal('total_credit').notNull().default(0),
    generatedBy: sqliteText('generated_by'),
    generatedAt: sqliteText('generated_at'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    snapshotTypeDateIdx: uniqueIndex('snapshot_type_date_idx').on(
      table.snapshotType,
      table.snapshotDate,
    ),
  }),
);

export const pgFinancialSnapshots = pgTableBase(
  'shranix_financial_snapshots',
  {
    ...pgBase,
    snapshotType: pgText('snapshot_type').notNull(),
    snapshotDate: pgTimestamp('snapshot_date', { withTimezone: true }).notNull(),
    financialYearId: pgUuid('financial_year_id'),
    branchId: pgUuid('branch_id'),
    costCenterId: pgUuid('cost_center_id'),
    data: pgText('data').notNull(),
    totalDebit: pgReal('total_debit').notNull().default(0),
    totalCredit: pgReal('total_credit').notNull().default(0),
    generatedBy: pgUuid('generated_by'),
    generatedAt: pgTimestamp('generated_at', { withTimezone: true }),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    snapshotTypeDateIdx: pgUniqueIndex('snapshot_type_date_idx').on(
      table.snapshotType,
      table.snapshotDate,
    ),
  }),
);

// ═════════════════════════════════════════════════════════
// 3. REPORT CACHE
// ═════════════════════════════════════════════════════════
export const sqliteReportCache = sqliteTableBase(
  'shranix_report_cache',
  {
    ...sqliteBase,
    reportType: sqliteText('report_type').notNull(),
    reportKey: sqliteText('report_key').notNull(), // composite key: type_params_hash
    params: sqliteText('params').notNull(), // JSON of report parameters
    data: sqliteText('data').notNull(), // JSON report data
    generatedAt: sqliteText('generated_at').notNull(),
    expiresAt: sqliteText('expires_at'),
    generatedBy: sqliteText('generated_by'),
  },
  (table) => ({
    reportKeyIdx: uniqueIndex('report_cache_key_idx').on(table.reportType, table.reportKey),
  }),
);

export const pgReportCache = pgTableBase(
  'shranix_report_cache',
  {
    ...pgBase,
    reportType: pgText('report_type').notNull(),
    reportKey: pgText('report_key').notNull(),
    params: pgText('params').notNull(),
    data: pgText('data').notNull(),
    generatedAt: pgTimestamp('generated_at', { withTimezone: true }).notNull(),
    expiresAt: pgTimestamp('expires_at', { withTimezone: true }),
    generatedBy: pgUuid('generated_by'),
  },
  (table) => ({
    reportKeyIdx: pgUniqueIndex('report_cache_key_idx').on(table.reportType, table.reportKey),
  }),
);

// ═════════════════════════════════════════════════════════
// 4. POSTING RULES
// ═════════════════════════════════════════════════════════
export const sqlitePostingRules = sqliteTableBase(
  'shranix_posting_rules',
  {
    ...sqliteBase,
    ruleName: sqliteText('rule_name').notNull(),
    voucherType: sqliteText('voucher_type').notNull(),
    debitAccountId: sqliteText('debit_account_id'),
    creditAccountId: sqliteText('credit_account_id'),
    condition: sqliteText('condition'), // JSON condition expression
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    description: sqliteText('description'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    postingRuleNameIdx: uniqueIndex('posting_rule_name_idx').on(table.ruleName),
  }),
);

export const pgPostingRules = pgTableBase(
  'shranix_posting_rules',
  {
    ...pgBase,
    ruleName: pgText('rule_name').notNull(),
    voucherType: pgText('voucher_type').notNull(),
    debitAccountId: pgUuid('debit_account_id'),
    creditAccountId: pgUuid('credit_account_id'),
    condition: pgText('condition'),
    isActive: pgBoolean('is_active').notNull().default(true),
    description: pgText('description'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    postingRuleNameIdx: pgUniqueIndex('posting_rule_name_idx').on(table.ruleName),
  }),
);

// ═════════════════════════════════════════════════════════
// 5. FISCAL CLOSING RECORDS
// ═════════════════════════════════════════════════════════
export const sqliteFiscalClosingRecords = sqliteTableBase(
  'shranix_fiscal_closing_records',
  {
    ...sqliteBase,
    financialYearId: sqliteText('financial_year_id').notNull(),
    closingDate: sqliteText('closing_date').notNull(),
    closingType: sqliteText('closing_type').notNull().default('yearly'), // monthly, quarterly, yearly
    status: sqliteText('status').notNull().default('draft'), // draft, completed, reversed
    totalRevenue: sqliteReal('total_revenue').notNull().default(0),
    totalExpenses: sqliteReal('total_expenses').notNull().default(0),
    netProfitLoss: sqliteReal('net_profit_loss').notNull().default(0),
    retainedEarningsAccountId: sqliteText('retained_earnings_account_id'),
    closingEntries: sqliteText('closing_entries'), // JSON: [{voucherId, ...}]
    notes: sqliteText('notes'),
    closedBy: sqliteText('closed_by'),
    closedAt: sqliteText('closed_at'),
    approvedBy: sqliteText('approved_by'),
    approvedAt: sqliteText('approved_at'),
  },
  (table) => ({
    fiscalClosingFyIdx: uniqueIndex('fiscal_closing_fy_idx').on(
      table.financialYearId,
      table.closingType,
    ),
  }),
);

export const pgFiscalClosingRecords = pgTableBase(
  'shranix_fiscal_closing_records',
  {
    ...pgBase,
    financialYearId: pgUuid('financial_year_id').notNull(),
    closingDate: pgTimestamp('closing_date', { withTimezone: true }).notNull(),
    closingType: pgText('closing_type').notNull().default('yearly'),
    status: pgText('status').notNull().default('draft'),
    totalRevenue: pgReal('total_revenue').notNull().default(0),
    totalExpenses: pgReal('total_expenses').notNull().default(0),
    netProfitLoss: pgReal('net_profit_loss').notNull().default(0),
    retainedEarningsAccountId: pgUuid('retained_earnings_account_id'),
    closingEntries: pgText('closing_entries'),
    notes: pgText('notes'),
    closedBy: pgUuid('closed_by'),
    closedAt: pgTimestamp('closed_at', { withTimezone: true }),
    approvedBy: pgUuid('approved_by'),
    approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  },
  (table) => ({
    fiscalClosingFyIdx: pgUniqueIndex('fiscal_closing_fy_idx').on(
      table.financialYearId,
      table.closingType,
    ),
  }),
);
