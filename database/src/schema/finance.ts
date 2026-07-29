import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═════════════════════════════════════════════════════════
// 1. ACCOUNT GROUPS (Nested Hierarchy)
// ═════════════════════════════════════════════════════════
export const sqliteAccountGroups = sqliteTableBase('shranix_account_groups', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  alias: sqliteText('alias'),
  type: sqliteText('type').notNull(), // assets, liabilities, income, expenses, equity
  parentId: sqliteText('parent_id'),
  level: sqliteInteger('level').notNull().default(0),
  path: sqliteText('path'), // Materialized path: /root/parent/child
  sortOrder: sqliteInteger('sort_order').notNull().default(0),
  isSystem: sqliteInteger('is_system', { mode: 'boolean' }).notNull().default(false),
  description: sqliteText('description'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({ groupNameIdx: uniqueIndex('acct_group_name_idx').on(table.name) }));

export const pgAccountGroups = pgTableBase('shranix_account_groups', {
  ...pgBase,
  name: pgText('name').notNull(),
  alias: pgText('alias'),
  type: pgText('type').notNull(),
  parentId: pgUuid('parent_id'),
  level: pgInteger('level').notNull().default(0),
  path: pgText('path'),
  sortOrder: pgInteger('sort_order').notNull().default(0),
  isSystem: pgBoolean('is_system').notNull().default(false),
  description: pgText('description'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({ groupNameIdx: pgUniqueIndex('acct_group_name_idx').on(table.name) }));

// ═════════════════════════════════════════════════════════
// 2. CHART OF ACCOUNTS (Ledger Accounts)
// ═════════════════════════════════════════════════════════
export const sqliteChartOfAccounts = sqliteTableBase('shranix_chart_of_accounts', {
  ...sqliteBase,
  accountCode: sqliteText('account_code').notNull(),
  accountName: sqliteText('account_name').notNull(),
  accountType: sqliteText('account_type').notNull(), // assets, liabilities, income, expenses, equity
  groupId: sqliteText('group_id').notNull(),
  openingBalance: sqliteReal('opening_balance').notNull().default(0),
  openingBalanceType: sqliteText('opening_balance_type').notNull().default('debit'), // debit, credit
  currency: sqliteText('currency').notNull().default('INR'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  costCenterRequired: sqliteInteger('cost_center_required', { mode: 'boolean' }).notNull().default(false),
  gstApplicable: sqliteInteger('gst_applicable', { mode: 'boolean' }).notNull().default(false),
  bankReconciliation: sqliteInteger('bank_reconciliation', { mode: 'boolean' }).notNull().default(false),
  isCashAccount: sqliteInteger('is_cash_account', { mode: 'boolean' }).notNull().default(false),
  isControlAccount: sqliteInteger('is_control_account', { mode: 'boolean' }).notNull().default(false),
  allowManualPosting: sqliteInteger('allow_manual_posting', { mode: 'boolean' }).notNull().default(true),
  description: sqliteText('description'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ accountCodeIdx: uniqueIndex('acct_code_idx').on(table.accountCode), accountNameIdx: uniqueIndex('acct_name_idx').on(table.accountName) }));

export const pgChartOfAccounts = pgTableBase('shranix_chart_of_accounts', {
  ...pgBase,
  accountCode: pgText('account_code').notNull(),
  accountName: pgText('account_name').notNull(),
  accountType: pgText('account_type').notNull(),
  groupId: pgUuid('group_id').notNull(),
  openingBalance: pgReal('opening_balance').notNull().default(0),
  openingBalanceType: pgText('opening_balance_type').notNull().default('debit'),
  currency: pgText('currency').notNull().default('INR'),
  isActive: pgBoolean('is_active').notNull().default(true),
  costCenterRequired: pgBoolean('cost_center_required').notNull().default(false),
  gstApplicable: pgBoolean('gst_applicable').notNull().default(false),
  bankReconciliation: pgBoolean('bank_reconciliation').notNull().default(false),
  isCashAccount: pgBoolean('is_cash_account').notNull().default(false),
  isControlAccount: pgBoolean('is_control_account').notNull().default(false),
  allowManualPosting: pgBoolean('allow_manual_posting').notNull().default(true),
  description: pgText('description'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ accountCodeIdx: pgUniqueIndex('acct_code_idx').on(table.accountCode), accountNameIdx: pgUniqueIndex('acct_name_idx').on(table.accountName) }));

// ═════════════════════════════════════════════════════════
// 3. LEDGER MASTER
// ═════════════════════════════════════════════════════════
export const sqliteLedgerMaster = sqliteTableBase('shranix_ledger_master', {
  ...sqliteBase,
  accountId: sqliteText('account_id').notNull(),
  ledgerType: sqliteText('ledger_type').notNull(), // customer, supplier, cash, bank, expense, income, tax
  partyId: sqliteText('party_id'),
  openingBalance: sqliteReal('opening_balance').notNull().default(0),
  openingBalanceType: sqliteText('opening_balance_type').notNull().default('debit'),
  currentBalance: sqliteReal('current_balance').notNull().default(0),
  creditLimit: sqliteReal('credit_limit').notNull().default(0),
  creditDays: sqliteInteger('credit_days').notNull().default(0),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: sqliteText('notes'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ ledgerAccountIdx: uniqueIndex('ledger_account_idx').on(table.accountId) }));

export const pgLedgerMaster = pgTableBase('shranix_ledger_master', {
  ...pgBase,
  accountId: pgUuid('account_id').notNull(),
  ledgerType: pgText('ledger_type').notNull(),
  partyId: pgUuid('party_id'),
  openingBalance: pgReal('opening_balance').notNull().default(0),
  openingBalanceType: pgText('opening_balance_type').notNull().default('debit'),
  currentBalance: pgReal('current_balance').notNull().default(0),
  creditLimit: pgReal('credit_limit').notNull().default(0),
  creditDays: pgInteger('credit_days').notNull().default(0),
  isActive: pgBoolean('is_active').notNull().default(true),
  notes: pgText('notes'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ ledgerAccountIdx: pgUniqueIndex('ledger_account_idx').on(table.accountId) }));

// ═════════════════════════════════════════════════════════
// 4. JOURNAL ENTRIES (Vouchers)
// ═════════════════════════════════════════════════════════
export const sqliteJournalEntries = sqliteTableBase('shranix_journal_entries', {
  ...sqliteBase,
  voucherNumber: sqliteText('voucher_number').notNull(),
  voucherDate: sqliteText('voucher_date').notNull(),
  voucherType: sqliteText('voucher_type').notNull().default('journal'), // journal, payment, receipt, contra, purchase, sales
  narration: sqliteText('narration'),
  totalDebit: sqliteReal('total_debit').notNull().default(0),
  totalCredit: sqliteReal('total_credit').notNull().default(0),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, posted, cancelled
  referenceNumber: sqliteText('reference_number'),
  referenceDate: sqliteText('reference_date'),
  attachments: sqliteText('attachments'), // JSON: [{name, url}]
  isPosted: sqliteInteger('is_posted', { mode: 'boolean' }).notNull().default(false),
  postedAt: sqliteText('posted_at'),
  postedBy: sqliteText('posted_by'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
  financialYearId: sqliteText('financial_year_id'),
  costCenterId: sqliteText('cost_center_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ voucherNumberIdx: uniqueIndex('journal_voucher_number_idx').on(table.voucherNumber) }));

export const pgJournalEntries = pgTableBase('shranix_journal_entries', {
  ...pgBase,
  voucherNumber: pgText('voucher_number').notNull(),
  voucherDate: pgTimestamp('voucher_date', { withTimezone: true }).notNull(),
  voucherType: pgText('voucher_type').notNull().default('journal'),
  narration: pgText('narration'),
  totalDebit: pgReal('total_debit').notNull().default(0),
  totalCredit: pgReal('total_credit').notNull().default(0),
  status: pgText('status').notNull().default('draft'),
  referenceNumber: pgText('reference_number'),
  referenceDate: pgTimestamp('reference_date', { withTimezone: true }),
  attachments: pgText('attachments'),
  isPosted: pgBoolean('is_posted').notNull().default(false),
  postedAt: pgTimestamp('posted_at', { withTimezone: true }),
  postedBy: pgUuid('posted_by'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  financialYearId: pgUuid('financial_year_id'),
  costCenterId: pgUuid('cost_center_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ voucherNumberIdx: pgUniqueIndex('journal_voucher_number_idx').on(table.voucherNumber) }));

// Journal Entry Items (Debit/Credit lines)
export const sqliteJournalEntryItems = sqliteTableBase('shranix_journal_entry_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  journalEntryId: sqliteText('journal_entry_id').notNull(),
  accountId: sqliteText('account_id').notNull(),
  ledgerId: sqliteText('ledger_id'),
  debit: sqliteReal('debit').notNull().default(0),
  credit: sqliteReal('credit').notNull().default(0),
  narration: sqliteText('narration'),
  costCenterId: sqliteText('cost_center_id'),
  partyId: sqliteText('party_id'),
  referenceNo: sqliteText('reference_no'),
});

export const pgJournalEntryItems = pgTableBase('shranix_journal_entry_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  journalEntryId: pgUuid('journal_entry_id').notNull(),
  accountId: pgUuid('account_id').notNull(),
  ledgerId: pgUuid('ledger_id'),
  debit: pgReal('debit').notNull().default(0),
  credit: pgReal('credit').notNull().default(0),
  narration: pgText('narration'),
  costCenterId: pgUuid('cost_center_id'),
  partyId: pgUuid('party_id'),
  referenceNo: pgText('reference_no'),
});

// ═════════════════════════════════════════════════════════
// 5. CASH BOOK
// ═════════════════════════════════════════════════════════
export const sqliteCashBook = sqliteTableBase('shranix_cash_book', {
  ...sqliteBase,
  cashAccountId: sqliteText('cash_account_id').notNull(),
  entryDate: sqliteText('entry_date').notNull(),
  voucherType: sqliteText('voucher_type').notNull(), // receipt, payment
  voucherId: sqliteText('voucher_id'),
  voucherNumber: sqliteText('voucher_number'),
  ledgerId: sqliteText('ledger_id'),
  partyId: sqliteText('party_id'),
  debit: sqliteReal('debit').notNull().default(0),
  credit: sqliteReal('credit').notNull().default(0),
  runningBalance: sqliteReal('running_balance').notNull().default(0),
  narration: sqliteText('narration'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
}, (table) => ({ cashBookDateIdx: uniqueIndex('cash_book_date_idx').on(table.cashAccountId, table.entryDate) }));

export const pgCashBook = pgTableBase('shranix_cash_book', {
  ...pgBase,
  cashAccountId: pgUuid('cash_account_id').notNull(),
  entryDate: pgTimestamp('entry_date', { withTimezone: true }).notNull(),
  voucherType: pgText('voucher_type').notNull(),
  voucherId: pgUuid('voucher_id'),
  voucherNumber: pgText('voucher_number'),
  ledgerId: pgUuid('ledger_id'),
  partyId: pgUuid('party_id'),
  debit: pgReal('debit').notNull().default(0),
  credit: pgReal('credit').notNull().default(0),
  runningBalance: pgReal('running_balance').notNull().default(0),
  narration: pgText('narration'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
}, (table) => ({ cashBookDateIdx: pgUniqueIndex('cash_book_date_idx').on(table.cashAccountId, table.entryDate) }));

// ═════════════════════════════════════════════════════════
// 6. BANK BOOK
// ═════════════════════════════════════════════════════════
export const sqliteBankBook = sqliteTableBase('shranix_bank_book', {
  ...sqliteBase,
  bankAccountId: sqliteText('bank_account_id').notNull(),
  entryDate: sqliteText('entry_date').notNull(),
  voucherType: sqliteText('voucher_type').notNull(), // receipt, payment, transfer
  voucherId: sqliteText('voucher_id'),
  voucherNumber: sqliteText('voucher_number'),
  ledgerId: sqliteText('ledger_id'),
  partyId: sqliteText('party_id'),
  chequeNumber: sqliteText('cheque_number'),
  chequeDate: sqliteText('cheque_date'),
  utrNumber: sqliteText('utr_number'),
  referenceNumber: sqliteText('reference_number'),
  debit: sqliteReal('debit').notNull().default(0),
  credit: sqliteReal('credit').notNull().default(0),
  runningBalance: sqliteReal('running_balance').notNull().default(0),
  reconciliationStatus: sqliteText('reconciliation_status').notNull().default('pending'), // pending, cleared, bounced
  reconciliationDate: sqliteText('reconciliation_date'),
  narration: sqliteText('narration'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
}, (table) => ({ bankBookDateIdx: uniqueIndex('bank_book_date_idx').on(table.bankAccountId, table.entryDate) }));

export const pgBankBook = pgTableBase('shranix_bank_book', {
  ...pgBase,
  bankAccountId: pgUuid('bank_account_id').notNull(),
  entryDate: pgTimestamp('entry_date', { withTimezone: true }).notNull(),
  voucherType: pgText('voucher_type').notNull(),
  voucherId: pgUuid('voucher_id'),
  voucherNumber: pgText('voucher_number'),
  ledgerId: pgUuid('ledger_id'),
  partyId: pgUuid('party_id'),
  chequeNumber: pgText('cheque_number'),
  chequeDate: pgTimestamp('cheque_date', { withTimezone: true }),
  utrNumber: pgText('utr_number'),
  referenceNumber: pgText('reference_number'),
  debit: pgReal('debit').notNull().default(0),
  credit: pgReal('credit').notNull().default(0),
  runningBalance: pgReal('running_balance').notNull().default(0),
  reconciliationStatus: pgText('reconciliation_status').notNull().default('pending'),
  reconciliationDate: pgTimestamp('reconciliation_date', { withTimezone: true }),
  narration: pgText('narration'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
}, (table) => ({ bankBookDateIdx: pgUniqueIndex('bank_book_date_idx').on(table.bankAccountId, table.entryDate) }));

// ═════════════════════════════════════════════════════════
// 7. COST CENTERS
// ═════════════════════════════════════════════════════════
export const sqliteCostCenters = sqliteTableBase('shranix_cost_centers', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  code: sqliteText('code').notNull(),
  type: sqliteText('type').notNull().default('department'), // department, project, branch, warehouse, profit_center
  parentId: sqliteText('parent_id'),
  level: sqliteInteger('level').notNull().default(0),
  path: sqliteText('path'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  description: sqliteText('description'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ costCenterCodeIdx: uniqueIndex('cost_center_code_idx').on(table.code) }));

export const pgCostCenters = pgTableBase('shranix_cost_centers', {
  ...pgBase,
  name: pgText('name').notNull(),
  code: pgText('code').notNull(),
  type: pgText('type').notNull().default('department'),
  parentId: pgUuid('parent_id'),
  level: pgInteger('level').notNull().default(0),
  path: pgText('path'),
  isActive: pgBoolean('is_active').notNull().default(true),
  description: pgText('description'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ costCenterCodeIdx: pgUniqueIndex('cost_center_code_idx').on(table.code) }));

// ═════════════════════════════════════════════════════════
// 8. ACCOUNTING SETTINGS
// ═════════════════════════════════════════════════════════
export const sqliteAccountingSettings = sqliteTableBase('shranix_accounting_settings', {
  ...sqliteBase,
  companyId: sqliteText('company_id'),
  fiscalYearStart: sqliteText('fiscal_year_start'),
  fiscalYearEnd: sqliteText('fiscal_year_end'),
  currentFinancialYearId: sqliteText('current_financial_year_id'),
  defaultCashAccountId: sqliteText('default_cash_account_id'),
  defaultBankAccountId: sqliteText('default_bank_account_id'),
  defaultSalesAccountId: sqliteText('default_sales_account_id'),
  defaultPurchaseAccountId: sqliteText('default_purchase_account_id'),
  defaultTaxAccountId: sqliteText('default_tax_account_id'),
  autoVoucherNumber: sqliteInteger('auto_voucher_number', { mode: 'boolean' }).notNull().default(true),
  voucherPrefix: sqliteText('voucher_prefix').notNull().default('JV-'),
  voucherNextNumber: sqliteInteger('voucher_next_number').notNull().default(1),
  roundOffDecimals: sqliteInteger('round_off_decimals').notNull().default(2),
  allowNegativeBalance: sqliteInteger('allow_negative_balance', { mode: 'boolean' }).notNull().default(false),
  enforceDebitCreditEquality: sqliteInteger('enforce_debit_credit_equality', { mode: 'boolean' }).notNull().default(true),
  requireApproval: sqliteInteger('require_approval', { mode: 'boolean' }).notNull().default(false),
  approvalLevels: sqliteInteger('approval_levels').notNull().default(1),
  currency: sqliteText('currency').notNull().default('INR'),
}, (table) => ({ acctSettingsCompanyIdx: uniqueIndex('acct_settings_company_idx').on(table.companyId) }));

export const pgAccountingSettings = pgTableBase('shranix_accounting_settings', {
  ...pgBase,
  companyId: pgUuid('company_id'),
  fiscalYearStart: pgText('fiscal_year_start'),
  fiscalYearEnd: pgText('fiscal_year_end'),
  currentFinancialYearId: pgUuid('current_financial_year_id'),
  defaultCashAccountId: pgUuid('default_cash_account_id'),
  defaultBankAccountId: pgUuid('default_bank_account_id'),
  defaultSalesAccountId: pgUuid('default_sales_account_id'),
  defaultPurchaseAccountId: pgUuid('default_purchase_account_id'),
  defaultTaxAccountId: pgUuid('default_tax_account_id'),
  autoVoucherNumber: pgBoolean('auto_voucher_number').notNull().default(true),
  voucherPrefix: pgText('voucher_prefix').notNull().default('JV-'),
  voucherNextNumber: pgInteger('voucher_next_number').notNull().default(1),
  roundOffDecimals: pgInteger('round_off_decimals').notNull().default(2),
  allowNegativeBalance: pgBoolean('allow_negative_balance').notNull().default(false),
  enforceDebitCreditEquality: pgBoolean('enforce_debit_credit_equality').notNull().default(true),
  requireApproval: pgBoolean('require_approval').notNull().default(false),
  approvalLevels: pgInteger('approval_levels').notNull().default(1),
  currency: pgText('currency').notNull().default('INR'),
}, (table) => ({ acctSettingsCompanyIdx: pgUniqueIndex('acct_settings_company_idx').on(table.companyId) }));
