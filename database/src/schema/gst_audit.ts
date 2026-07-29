import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═════════════════════════════════════════════════════════
// 1. GST REGISTRATIONS
// ═════════════════════════════════════════════════════════
export const sqliteGstRegistrations = sqliteTableBase('shranix_gst_registrations', {
  ...sqliteBase,
  gstin: sqliteText('gstin').notNull().unique(),
  tradeName: sqliteText('trade_name').notNull(),
  legalName: sqliteText('legal_name').notNull(),
  address: sqliteText('address'),
  stateCode: sqliteText('state_code'),
  registrationType: sqliteText('registration_type').notNull().default('regular'),
  taxPayerType: sqliteText('tax_payer_type').notNull().default('regular'),
  status: sqliteText('status').notNull().default('active'),
  validFrom: sqliteText('valid_from'),
  validTo: sqliteText('valid_to'),
  cancelDate: sqliteText('cancel_date'),
  eWayBillRequired: sqliteText('eway_bill_required').notNull().default('no'),
  eInvoiceRequired: sqliteText('einvoice_required').notNull().default('no'),
  returnFilingType: sqliteText('return_filing_type').notNull().default('monthly'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ gstinIdx: uniqueIndex('gst_gstin_idx').on(table.gstin) }));

export const pgGstRegistrations = pgTableBase('shranix_gst_registrations', {
  ...pgBase,
  gstin: pgText('gstin').notNull().unique(),
  tradeName: pgText('trade_name').notNull(),
  legalName: pgText('legal_name').notNull(),
  address: pgText('address'),
  stateCode: pgText('state_code'),
  registrationType: pgText('registration_type').notNull().default('regular'),
  taxPayerType: pgText('tax_payer_type').notNull().default('regular'),
  status: pgText('status').notNull().default('active'),
  validFrom: pgTimestamp('valid_from', { withTimezone: true }),
  validTo: pgTimestamp('valid_to', { withTimezone: true }),
  cancelDate: pgTimestamp('cancel_date', { withTimezone: true }),
  eWayBillRequired: pgText('eway_bill_required').notNull().default('no'),
  eInvoiceRequired: pgText('einvoice_required').notNull().default('no'),
  returnFilingType: pgText('return_filing_type').notNull().default('monthly'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ gstinIdx: pgUniqueIndex('gst_gstin_idx').on(table.gstin) }));

// ═════════════════════════════════════════════════════════
// 2. GST LEDGER
// ═════════════════════════════════════════════════════════
export const sqliteGstLedger = sqliteTableBase('shranix_gst_ledger', {
  ...sqliteBase,
  voucherType: sqliteText('voucher_type').notNull(),
  voucherId: sqliteText('voucher_id').notNull(),
  voucherNumber: sqliteText('voucher_number').notNull(),
  voucherDate: sqliteText('voucher_date').notNull(),
  gstin: sqliteText('gstin'),
  gstType: sqliteText('gst_type').notNull(),
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstAmount: sqliteReal('gst_amount').notNull().default(0),
  cessAmount: sqliteReal('cess_amount').notNull().default(0),
  inputOutput: sqliteText('input_output').notNull(),
  reverseCharge: sqliteText('reverse_charge').notNull().default('no'),
  hsnSacCode: sqliteText('hsn_sac_code'),
  financialYearId: sqliteText('financial_year_id'),
  branchId: sqliteText('branch_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ gstVoucherIdx: uniqueIndex('gst_voucher_idx').on(table.voucherType, table.voucherId) }));

export const pgGstLedger = pgTableBase('shranix_gst_ledger', {
  ...pgBase,
  voucherType: pgText('voucher_type').notNull(),
  voucherId: pgUuid('voucher_id').notNull(),
  voucherNumber: pgText('voucher_number').notNull(),
  voucherDate: pgTimestamp('voucher_date', { withTimezone: true }).notNull(),
  gstin: pgText('gstin'),
  gstType: pgText('gst_type').notNull(),
  gstRate: pgReal('gst_rate').notNull().default(0),
  taxableValue: pgReal('taxable_value').notNull().default(0),
  gstAmount: pgReal('gst_amount').notNull().default(0),
  cessAmount: pgReal('cess_amount').notNull().default(0),
  inputOutput: pgText('input_output').notNull(),
  reverseCharge: pgText('reverse_charge').notNull().default('no'),
  hsnSacCode: pgText('hsn_sac_code'),
  financialYearId: pgUuid('financial_year_id'),
  branchId: pgUuid('branch_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ gstVoucherIdx: pgUniqueIndex('gst_voucher_idx').on(table.voucherType, table.voucherId) }));

// ═════════════════════════════════════════════════════════
// 3. GST RETURNS
// ═════════════════════════════════════════════════════════
export const sqliteGstReturns = sqliteTableBase('shranix_gst_returns', {
  ...sqliteBase,
  returnType: sqliteText('return_type').notNull(),
  returnPeriod: sqliteText('return_period').notNull(),
  financialYear: sqliteText('financial_year').notNull(),
  gstin: sqliteText('gstin').notNull(),
  status: sqliteText('status').notNull().default('draft'),
  totalOutwardSupply: sqliteReal('total_outward_supply').notNull().default(0),
  totalInwardSupply: sqliteReal('total_inward_supply').notNull().default(0),
  totalOutputTax: sqliteReal('total_output_tax').notNull().default(0),
  totalInputTaxCredit: sqliteReal('total_input_tax_credit').notNull().default(0),
  netTaxPayable: sqliteReal('net_tax_payable').notNull().default(0),
  totalPaid: sqliteReal('total_paid').notNull().default(0),
  balanceDue: sqliteReal('balance_due').notNull().default(0),
  filingDate: sqliteText('filing_date'),
  acknowledgmentNo: sqliteText('acknowledgment_no'),
  preparedBy: sqliteText('prepared_by'),
  validatedBy: sqliteText('validated_by'),
  remarks: sqliteText('remarks'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ gstReturnPeriodIdx: uniqueIndex('gst_return_period_idx').on(table.returnType, table.returnPeriod) }));

export const pgGstReturns = pgTableBase('shranix_gst_returns', {
  ...pgBase,
  returnType: pgText('return_type').notNull(),
  returnPeriod: pgText('return_period').notNull(),
  financialYear: pgText('financial_year').notNull(),
  gstin: pgText('gstin').notNull(),
  status: pgText('status').notNull().default('draft'),
  totalOutwardSupply: pgReal('total_outward_supply').notNull().default(0),
  totalInwardSupply: pgReal('total_inward_supply').notNull().default(0),
  totalOutputTax: pgReal('total_output_tax').notNull().default(0),
  totalInputTaxCredit: pgReal('total_input_tax_credit').notNull().default(0),
  netTaxPayable: pgReal('net_tax_payable').notNull().default(0),
  totalPaid: pgReal('total_paid').notNull().default(0),
  balanceDue: pgReal('balance_due').notNull().default(0),
  filingDate: pgTimestamp('filing_date', { withTimezone: true }),
  acknowledgmentNo: pgText('acknowledgment_no'),
  preparedBy: pgText('prepared_by'),
  validatedBy: pgText('validated_by'),
  remarks: pgText('remarks'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ gstReturnPeriodIdx: pgUniqueIndex('gst_return_period_idx').on(table.returnType, table.returnPeriod) }));

// ═════════════════════════════════════════════════════════
// 4. TAX POSTINGS
// ═════════════════════════════════════════════════════════
export const sqliteTaxPostings = sqliteTableBase('shranix_tax_postings', {
  ...sqliteBase,
  postingType: sqliteText('posting_type').notNull(),
  sourceType: sqliteText('source_type').notNull(),
  sourceId: sqliteText('source_id').notNull(),
  sourceNumber: sqliteText('source_number'),
  sourceDate: sqliteText('source_date'),
  postingRule: sqliteText('posting_rule'),
  fromAccountId: sqliteText('from_account_id'),
  toAccountId: sqliteText('to_account_id'),
  amount: sqliteReal('amount').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0),
  totalAmount: sqliteReal('total_amount').notNull().default(0),
  status: sqliteText('status').notNull().default('pending'),
  postedDate: sqliteText('posted_date'),
  errorLog: sqliteText('error_log'),
  financialYearId: sqliteText('financial_year_id'),
  branchId: sqliteText('branch_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
});

export const pgTaxPostings = pgTableBase('shranix_tax_postings', {
  ...pgBase,
  postingType: pgText('posting_type').notNull(),
  sourceType: pgText('source_type').notNull(),
  sourceId: pgUuid('source_id').notNull(),
  sourceNumber: pgText('source_number'),
  sourceDate: pgTimestamp('source_date', { withTimezone: true }),
  postingRule: pgText('posting_rule'),
  fromAccountId: pgUuid('from_account_id'),
  toAccountId: pgUuid('to_account_id'),
  amount: pgReal('amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0),
  totalAmount: pgReal('total_amount').notNull().default(0),
  status: pgText('status').notNull().default('pending'),
  postedDate: pgTimestamp('posted_date', { withTimezone: true }),
  errorLog: pgText('error_log'),
  financialYearId: pgUuid('financial_year_id'),
  branchId: pgUuid('branch_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
});

// ═════════════════════════════════════════════════════════
// 5. YEAR CLOSING RECORDS
// ═════════════════════════════════════════════════════════
export const sqliteYearClosingRecords = sqliteTableBase('shranix_year_closing_records', {
  ...sqliteBase,
  closingNumber: sqliteText('closing_number').notNull().unique(),
  financialYearId: sqliteText('financial_year_id').notNull(),
  closingType: sqliteText('closing_type').notNull(),
  closingDate: sqliteText('closing_date').notNull(),
  status: sqliteText('status').notNull().default('draft'),
  totalRevenue: sqliteReal('total_revenue').notNull().default(0),
  totalExpenses: sqliteReal('total_expenses').notNull().default(0),
  netProfit: sqliteReal('net_profit').notNull().default(0),
  netLoss: sqliteReal('net_loss').notNull().default(0),
  retainedEarnings: sqliteReal('retained_earnings').notNull().default(0),
  totalAssets: sqliteReal('total_assets').notNull().default(0),
  totalLiabilities: sqliteReal('total_liabilities').notNull().default(0),
  closingRemarks: sqliteText('closing_remarks'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
}, (table) => ({ closingNumberIdx: uniqueIndex('closing_number_idx').on(table.closingNumber) }));

export const pgYearClosingRecords = pgTableBase('shranix_year_closing_records', {
  ...pgBase,
  closingNumber: pgText('closing_number').notNull().unique(),
  financialYearId: pgUuid('financial_year_id').notNull(),
  closingType: pgText('closing_type').notNull(),
  closingDate: pgTimestamp('closing_date', { withTimezone: true }).notNull(),
  status: pgText('status').notNull().default('draft'),
  totalRevenue: pgReal('total_revenue').notNull().default(0),
  totalExpenses: pgReal('total_expenses').notNull().default(0),
  netProfit: pgReal('net_profit').notNull().default(0),
  netLoss: pgReal('net_loss').notNull().default(0),
  retainedEarnings: pgReal('retained_earnings').notNull().default(0),
  totalAssets: pgReal('total_assets').notNull().default(0),
  totalLiabilities: pgReal('total_liabilities').notNull().default(0),
  closingRemarks: pgText('closing_remarks'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
}, (table) => ({ closingNumberIdx: pgUniqueIndex('closing_number_idx').on(table.closingNumber) }));

// ═════════════════════════════════════════════════════════
// 6. PERIOD LOCKS
// ═════════════════════════════════════════════════════════
export const sqlitePeriodLocks = sqliteTableBase('shranix_period_locks', {
  ...sqliteBase,
  financialYearId: sqliteText('financial_year_id').notNull(),
  periodType: sqliteText('period_type').notNull(),
  periodKey: sqliteText('period_key').notNull(),
  periodStart: sqliteText('period_start').notNull(),
  periodEnd: sqliteText('period_end').notNull(),
  isLocked: sqliteText('is_locked').notNull().default('yes'),
  lockedBy: sqliteText('locked_by'),
  lockedAt: sqliteText('locked_at'),
  unlockedBy: sqliteText('unlocked_by'),
  unlockedAt: sqliteText('unlocked_at'),
  unlockReason: sqliteText('unlock_reason'),
  roleRequired: sqliteText('role_required').notNull().default('admin'),
  module: sqliteText('module'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ periodLockKeyIdx: uniqueIndex('period_lock_key_idx').on(table.financialYearId, table.periodType, table.periodKey) }));

export const pgPeriodLocks = pgTableBase('shranix_period_locks', {
  ...pgBase,
  financialYearId: pgUuid('financial_year_id').notNull(),
  periodType: pgText('period_type').notNull(),
  periodKey: pgText('period_key').notNull(),
  periodStart: pgTimestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: pgTimestamp('period_end', { withTimezone: true }).notNull(),
  isLocked: pgText('is_locked').notNull().default('yes'),
  lockedBy: pgUuid('locked_by'),
  lockedAt: pgTimestamp('locked_at', { withTimezone: true }),
  unlockedBy: pgUuid('unlocked_by'),
  unlockedAt: pgTimestamp('unlocked_at', { withTimezone: true }),
  unlockReason: pgText('unlock_reason'),
  roleRequired: pgText('role_required').notNull().default('admin'),
  module: pgText('module'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ periodLockKeyIdx: pgUniqueIndex('period_lock_key_idx').on(table.financialYearId, table.periodType, table.periodKey) }));

// ═════════════════════════════════════════════════════════
// 7. OPENING BALANCE TRANSFERS
// ═════════════════════════════════════════════════════════
export const sqliteOpeningBalanceTransfers = sqliteTableBase('shranix_opening_balance_transfers', {
  ...sqliteBase,
  transferNumber: sqliteText('transfer_number').notNull().unique(),
  fromFinancialYearId: sqliteText('from_financial_year_id').notNull(),
  toFinancialYearId: sqliteText('to_financial_year_id').notNull(),
  transferDate: sqliteText('transfer_date').notNull(),
  status: sqliteText('status').notNull().default('draft'),
  totalDebit: sqliteReal('total_debit').notNull().default(0),
  totalCredit: sqliteReal('total_credit').notNull().default(0),
  accountCount: sqliteInteger('account_count').notNull().default(0),
  transferType: sqliteText('transfer_type').notNull().default('all'),
  remarks: sqliteText('remarks'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
}, (table) => ({ transferNumberIdx: uniqueIndex('transfer_number_idx').on(table.transferNumber) }));

export const pgOpeningBalanceTransfers = pgTableBase('shranix_opening_balance_transfers', {
  ...pgBase,
  transferNumber: pgText('transfer_number').notNull().unique(),
  fromFinancialYearId: pgUuid('from_financial_year_id').notNull(),
  toFinancialYearId: pgUuid('to_financial_year_id').notNull(),
  transferDate: pgTimestamp('transfer_date', { withTimezone: true }).notNull(),
  status: pgText('status').notNull().default('draft'),
  totalDebit: pgReal('total_debit').notNull().default(0),
  totalCredit: pgReal('total_credit').notNull().default(0),
  accountCount: pgInteger('account_count').notNull().default(0),
  transferType: pgText('transfer_type').notNull().default('all'),
  remarks: pgText('remarks'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
}, (table) => ({ transferNumberIdx: pgUniqueIndex('transfer_number_idx').on(table.transferNumber) }));

// ═════════════════════════════════════════════════════════
// 8. YEAR-END ENTRIES
// ═════════════════════════════════════════════════════════
export const sqliteYearEndEntries = sqliteTableBase('shranix_year_end_entries', {
  ...sqliteBase,
  closingRecordId: sqliteText('closing_record_id').notNull(),
  entryNumber: sqliteText('entry_number').notNull().unique(),
  entryType: sqliteText('entry_type').notNull(),
  fromAccountId: sqliteText('from_account_id'),
  toAccountId: sqliteText('to_account_id'),
  amount: sqliteReal('amount').notNull().default(0),
  debitAmount: sqliteReal('debit_amount').notNull().default(0),
  creditAmount: sqliteReal('credit_amount').notNull().default(0),
  narration: sqliteText('narration'),
  status: sqliteText('status').notNull().default('pending'),
  postedDate: sqliteText('posted_date'),
  glEntryId: sqliteText('gl_entry_id'),
}, (table) => ({ yearEndEntryNumberIdx: uniqueIndex('year_end_entry_number_idx').on(table.entryNumber) }));

export const pgYearEndEntries = pgTableBase('shranix_year_end_entries', {
  ...pgBase,
  closingRecordId: pgUuid('closing_record_id').notNull(),
  entryNumber: pgText('entry_number').notNull().unique(),
  entryType: pgText('entry_type').notNull(),
  fromAccountId: pgUuid('from_account_id'),
  toAccountId: pgUuid('to_account_id'),
  amount: pgReal('amount').notNull().default(0),
  debitAmount: pgReal('debit_amount').notNull().default(0),
  creditAmount: pgReal('credit_amount').notNull().default(0),
  narration: pgText('narration'),
  status: pgText('status').notNull().default('pending'),
  postedDate: pgTimestamp('posted_date', { withTimezone: true }),
  glEntryId: pgUuid('gl_entry_id'),
}, (table) => ({ yearEndEntryNumberIdx: pgUniqueIndex('year_end_entry_number_idx').on(table.entryNumber) }));

// ═════════════════════════════════════════════════════════
// 9. AUDIT DETAILS
// ═════════════════════════════════════════════════════════
export const sqliteAuditDetails = sqliteTableBase('shranix_audit_details', {
  ...sqliteBase,
  auditLogId: sqliteText('audit_log_id').notNull(),
  action: sqliteText('action').notNull(),
  entityType: sqliteText('entity_type').notNull(),
  entityId: sqliteText('entity_id'),
  userId: sqliteText('user_id'),
  userName: sqliteText('user_name'),
  userRole: sqliteText('user_role'),
  ipAddress: sqliteText('ip_address'),
  userAgent: sqliteText('user_agent'),
  oldValues: sqliteText('old_values'),
  newValues: sqliteText('new_values'),
  changes: sqliteText('changes'),
  timestamp: sqliteText('timestamp').notNull(),
  module: sqliteText('module').notNull(),
  actionType: sqliteText('action_type').notNull(),
  status: sqliteText('status').notNull().default('success'),
  remarks: sqliteText('remarks'),
  sessionId: sqliteText('session_id'),
}, (table) => ({ auditTimestampIdx: uniqueIndex('audit_timestamp_idx').on(table.timestamp) }));

export const pgAuditDetails = pgTableBase('shranix_audit_details', {
  ...pgBase,
  auditLogId: pgUuid('audit_log_id').notNull(),
  action: pgText('action').notNull(),
  entityType: pgText('entity_type').notNull(),
  entityId: pgUuid('entity_id'),
  userId: pgUuid('user_id'),
  userName: pgText('user_name'),
  userRole: pgText('user_role'),
  ipAddress: pgText('ip_address'),
  userAgent: pgText('user_agent'),
  oldValues: pgText('old_values'),
  newValues: pgText('new_values'),
  changes: pgText('changes'),
  timestamp: pgTimestamp('timestamp', { withTimezone: true }).notNull(),
  module: pgText('module').notNull(),
  actionType: pgText('action_type').notNull(),
  status: pgText('status').notNull().default('success'),
  remarks: pgText('remarks'),
  sessionId: pgText('session_id'),
}, (table) => ({ auditTimestampIdx: pgUniqueIndex('audit_timestamp_idx').on(table.timestamp) }));

// ═════════════════════════════════════════════════════════
// 10. NUMBER SERIES
// ═════════════════════════════════════════════════════════
export const sqliteNumberSeries = sqliteTableBase('shranix_number_series', {
  ...sqliteBase,
  seriesName: sqliteText('series_name').notNull(),
  seriesCode: sqliteText('series_code').notNull(),
  module: sqliteText('module').notNull(),
  documentType: sqliteText('document_type').notNull(),
  prefix: sqliteText('prefix').notNull().default(''),
  suffix: sqliteText('suffix').notNull().default(''),
  startNumber: sqliteInteger('start_number').notNull().default(1),
  currentNumber: sqliteInteger('current_number').notNull().default(0),
  endNumber: sqliteInteger('end_number'),
  padLength: sqliteInteger('pad_length').notNull().default(5),
  resetFrequency: sqliteText('reset_frequency'),
  isActive: sqliteText('is_active').notNull().default('yes'),
  allowOverride: sqliteText('allow_override').notNull().default('no'),
  branchId: sqliteText('branch_id'),
}, (table) => ({ seriesNameIdx: uniqueIndex('series_name_idx').on(table.seriesName), seriesCodeIdx: uniqueIndex('series_code_idx').on(table.seriesCode) }));

export const pgNumberSeries = pgTableBase('shranix_number_series', {
  ...pgBase,
  seriesName: pgText('series_name').notNull(),
  seriesCode: pgText('series_code').notNull(),
  module: pgText('module').notNull(),
  documentType: pgText('document_type').notNull(),
  prefix: pgText('prefix').notNull().default(''),
  suffix: pgText('suffix').notNull().default(''),
  startNumber: pgInteger('start_number').notNull().default(1),
  currentNumber: pgInteger('current_number').notNull().default(0),
  endNumber: pgInteger('end_number'),
  padLength: pgInteger('pad_length').notNull().default(5),
  resetFrequency: pgText('reset_frequency'),
  isActive: pgText('is_active').notNull().default('yes'),
  allowOverride: pgText('allow_override').notNull().default('no'),
  branchId: pgUuid('branch_id'),
}, (table) => ({ seriesNameIdx: pgUniqueIndex('series_name_idx').on(table.seriesName), seriesCodeIdx: pgUniqueIndex('series_code_idx').on(table.seriesCode) }));

// ═════════════════════════════════════════════════════════
// 11. VOUCHER APPROVALS
// ═════════════════════════════════════════════════════════
export const sqliteVoucherApprovals = sqliteTableBase('shranix_voucher_approvals', {
  ...sqliteBase,
  approvalNumber: sqliteText('approval_number').notNull(),
  voucherType: sqliteText('voucher_type').notNull(),
  voucherId: sqliteText('voucher_id').notNull(),
  voucherNumber: sqliteText('voucher_number').notNull(),
  module: sqliteText('module').notNull(),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
  maxLevel: sqliteInteger('max_level').notNull().default(1),
  status: sqliteText('status').notNull().default('pending'),
  requestedBy: sqliteText('requested_by'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
  rejectedBy: sqliteText('rejected_by'),
  rejectedAt: sqliteText('rejected_at'),
  rejectionReason: sqliteText('rejection_reason'),
  escalatedTo: sqliteText('escalated_to'),
  remarks: sqliteText('remarks'),
  amount: sqliteReal('amount').notNull().default(0),
}, (table) => ({ approvalNumberIdx: uniqueIndex('approval_number_idx').on(table.approvalNumber) }));

export const pgVoucherApprovals = pgTableBase('shranix_voucher_approvals', {
  ...pgBase,
  approvalNumber: pgText('approval_number').notNull(),
  voucherType: pgText('voucher_type').notNull(),
  voucherId: pgUuid('voucher_id').notNull(),
  voucherNumber: pgText('voucher_number').notNull(),
  module: pgText('module').notNull(),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
  maxLevel: pgInteger('max_level').notNull().default(1),
  status: pgText('status').notNull().default('pending'),
  requestedBy: pgUuid('requested_by'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  rejectedBy: pgUuid('rejected_by'),
  rejectedAt: pgTimestamp('rejected_at', { withTimezone: true }),
  rejectionReason: pgText('rejection_reason'),
  escalatedTo: pgUuid('escalated_to'),
  remarks: pgText('remarks'),
  amount: pgReal('amount').notNull().default(0),
}, (table) => ({ approvalNumberIdx: pgUniqueIndex('approval_number_idx').on(table.approvalNumber) }));

// ═════════════════════════════════════════════════════════
// 12. FINANCE ANALYTICS
// ═════════════════════════════════════════════════════════
export const sqliteFinanceAnalytics = sqliteTableBase('shranix_finance_analytics', {
  ...sqliteBase,
  analyticsType: sqliteText('analytics_type').notNull(),
  periodKey: sqliteText('period_key').notNull(),
  financialYearId: sqliteText('financial_year_id'),
  branchId: sqliteText('branch_id'),
  totalRevenue: sqliteReal('total_revenue').notNull().default(0),
  totalExpenses: sqliteReal('total_expenses').notNull().default(0),
  netProfit: sqliteReal('net_profit').notNull().default(0),
  totalReceivables: sqliteReal('total_receivables').notNull().default(0),
  totalPayables: sqliteReal('total_payables').notNull().default(0),
  cashBalance: sqliteReal('cash_balance').notNull().default(0),
  bankBalance: sqliteReal('bank_balance').notNull().default(0),
  totalSales: sqliteReal('total_sales').notNull().default(0),
  totalPurchases: sqliteReal('total_purchases').notNull().default(0),
  totalGstInput: sqliteReal('total_gst_input').notNull().default(0),
  totalGstOutput: sqliteReal('total_gst_output').notNull().default(0),
  totalGstPayable: sqliteReal('total_gst_payable').notNull().default(0),
  customerCount: sqliteInteger('customer_count').notNull().default(0),
  vendorCount: sqliteInteger('vendor_count').notNull().default(0),
  invoiceCount: sqliteInteger('invoice_count').notNull().default(0),
  metrics: sqliteText('metrics'),
  computedAt: sqliteText('computed_at').notNull(),
}, (table) => ({ analyticsPeriodIdx: uniqueIndex('analytics_period_idx').on(table.analyticsType, table.periodKey) }));

export const pgFinanceAnalytics = pgTableBase('shranix_finance_analytics', {
  ...pgBase,
  analyticsType: pgText('analytics_type').notNull(),
  periodKey: pgText('period_key').notNull(),
  financialYearId: pgUuid('financial_year_id'),
  branchId: pgUuid('branch_id'),
  totalRevenue: pgReal('total_revenue').notNull().default(0),
  totalExpenses: pgReal('total_expenses').notNull().default(0),
  netProfit: pgReal('net_profit').notNull().default(0),
  totalReceivables: pgReal('total_receivables').notNull().default(0),
  totalPayables: pgReal('total_payables').notNull().default(0),
  cashBalance: pgReal('cash_balance').notNull().default(0),
  bankBalance: pgReal('bank_balance').notNull().default(0),
  totalSales: pgReal('total_sales').notNull().default(0),
  totalPurchases: pgReal('total_purchases').notNull().default(0),
  totalGstInput: pgReal('total_gst_input').notNull().default(0),
  totalGstOutput: pgReal('total_gst_output').notNull().default(0),
  totalGstPayable: pgReal('total_gst_payable').notNull().default(0),
  customerCount: pgInteger('customer_count').notNull().default(0),
  vendorCount: pgInteger('vendor_count').notNull().default(0),
  invoiceCount: pgInteger('invoice_count').notNull().default(0),
  metrics: pgText('metrics'),
  computedAt: pgTimestamp('computed_at', { withTimezone: true }).notNull(),
}, (table) => ({ analyticsPeriodIdx: pgUniqueIndex('analytics_period_idx').on(table.analyticsType, table.periodKey) }));

// ═════════════════════════════════════════════════════════
// 13. GST / AUDIT SETTINGS
// ═════════════════════════════════════════════════════════
export const sqliteGstAuditSettings = sqliteTableBase('shranix_gst_audit_settings', {
  ...sqliteBase,
  settingKey: sqliteText('setting_key').notNull(),
  settingValue: sqliteText('setting_value').notNull(),
  settingGroup: sqliteText('setting_group').notNull(),
  description: sqliteText('description'),
  isSystem: sqliteText('is_system').notNull().default('no'),
  dataType: sqliteText('data_type').notNull().default('text'),
}, (table) => ({ settingKeyIdx: uniqueIndex('setting_key_idx').on(table.settingKey) }));

export const pgGstAuditSettings = pgTableBase('shranix_gst_audit_settings', {
  ...pgBase,
  settingKey: pgText('setting_key').notNull(),
  settingValue: pgText('setting_value').notNull(),
  settingGroup: pgText('setting_group').notNull(),
  description: pgText('description'),
  isSystem: pgText('is_system').notNull().default('no'),
  dataType: pgText('data_type').notNull().default('text'),
}, (table) => ({ settingKeyIdx: pgUniqueIndex('setting_key_idx').on(table.settingKey) }));
