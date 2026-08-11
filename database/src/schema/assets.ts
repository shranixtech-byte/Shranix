import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  real as pgReal,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ── SQLite base ──────────────────────────────────────────
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

// ── PostgreSQL base ──────────────────────────────────────
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// ASSET CATEGORIES
// ═════════════════════════════════════════════════════════
export const sqliteAssetCategories = sqliteTableBase(
  'shranix_asset_categories',
  {
    ...sqliteBase,
    categoryName: sqliteText('category_name').notNull(),
    assetType: sqliteText('asset_type').notNull().default('fixed_asset'), // fixed_asset | it_asset | vehicle | equipment | furniture | machinery | tool | other
    status: sqliteText('status').notNull().default('active'),
    description: sqliteText('description'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    nameIdx: uniqueIndex('ast_cat_name_idx').on(table.categoryName),
  }),
);

export const pgAssetCategories = pgTableBase(
  'shranix_asset_categories',
  {
    ...pgBase,
    categoryName: pgText('category_name').notNull(),
    assetType: pgText('asset_type').notNull().default('fixed_asset'),
    status: pgText('status').notNull().default('active'),
    description: pgText('description'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    nameIdx: pgUniqueIndex('ast_cat_name_idx').on(table.categoryName),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSETS
// ═════════════════════════════════════════════════════════
export const sqliteAssets = sqliteTableBase(
  'shranix_assets',
  {
    ...sqliteBase,
    assetCode: sqliteText('asset_code').notNull(),
    assetName: sqliteText('asset_name').notNull(),
    categoryId: sqliteText('category_id'),
    assetType: sqliteText('asset_type').notNull().default('fixed_asset'),
    brand: sqliteText('brand'),
    model: sqliteText('model'),
    serialNumber: sqliteText('serial_number'),
    barcode: sqliteText('barcode'),
    purchaseDate: sqliteText('purchase_date'),
    purchaseInvoiceId: sqliteText('purchase_invoice_id'),
    supplierId: sqliteText('supplier_id'),
    purchaseCost: sqliteReal('purchase_cost').notNull().default(0),
    additionalCost: sqliteReal('additional_cost').notNull().default(0),
    capitalizedCost: sqliteReal('capitalized_cost').notNull().default(0),
    warrantyStart: sqliteText('warranty_start'),
    warrantyEnd: sqliteText('warranty_end'),
    warrantyProvider: sqliteText('warranty_provider'),
    warrantyNumber: sqliteText('warranty_number'),
    usefulLifeYears: sqliteReal('useful_life_years'),
    depreciationMethod: sqliteText('depreciation_method').notNull().default('straight_line'), // straight_line | written_down_value
    depreciationRate: sqliteReal('depreciation_rate'),
    salvageValue: sqliteReal('salvage_value').notNull().default(0),
    currentBookValue: sqliteReal('current_book_value').notNull().default(0),
    accumulatedDepreciation: sqliteReal('accumulated_depreciation').notNull().default(0),
    location: sqliteText('location'),
    departmentId: sqliteText('department_id'),
    assignedEmployeeId: sqliteText('assigned_employee_id'),
    branchId: sqliteText('branch_id'),
    // Vehicle-specific fields
    vehicleNumber: sqliteText('vehicle_number'),
    registrationNumber: sqliteText('registration_number'),
    insuranceExpiry: sqliteText('insurance_expiry'),
    pucExpiry: sqliteText('puc_expiry'),
    fitnessCertificateExpiry: sqliteText('fitness_certificate_expiry'),
    permitExpiry: sqliteText('permit_expiry'),
    odometerReading: sqliteReal('odometer_reading'),
    driverEmployeeId: sqliteText('driver_employee_id'),
    status: sqliteText('status').notNull().default('available'), // available | assigned | under_maintenance | disposed
    condition: sqliteText('condition').notNull().default('good'), // new | good | fair | damaged | under_repair | unserviceable | disposed
    notes: sqliteText('notes'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('ast_code_idx').on(table.assetCode),
    serialIdx: uniqueIndex('ast_serial_idx').on(table.serialNumber),
    catIdx: index('ast_cat_idx').on(table.categoryId),
    statusIdx: index('ast_status_idx').on(table.status),
    empIdx: index('ast_emp_idx').on(table.assignedEmployeeId),
  }),
);

export const pgAssets = pgTableBase(
  'shranix_assets',
  {
    ...pgBase,
    assetCode: pgText('asset_code').notNull(),
    assetName: pgText('asset_name').notNull(),
    categoryId: pgUuid('category_id'),
    assetType: pgText('asset_type').notNull().default('fixed_asset'),
    brand: pgText('brand'),
    model: pgText('model'),
    serialNumber: pgText('serial_number'),
    barcode: pgText('barcode'),
    purchaseDate: pgTimestamp('purchase_date', { withTimezone: true }),
    purchaseInvoiceId: pgUuid('purchase_invoice_id'),
    supplierId: pgUuid('supplier_id'),
    purchaseCost: pgReal('purchase_cost').notNull().default(0),
    additionalCost: pgReal('additional_cost').notNull().default(0),
    capitalizedCost: pgReal('capitalized_cost').notNull().default(0),
    warrantyStart: pgTimestamp('warranty_start', { withTimezone: true }),
    warrantyEnd: pgTimestamp('warranty_end', { withTimezone: true }),
    warrantyProvider: pgText('warranty_provider'),
    warrantyNumber: pgText('warranty_number'),
    usefulLifeYears: pgReal('useful_life_years'),
    depreciationMethod: pgText('depreciation_method').notNull().default('straight_line'),
    depreciationRate: pgReal('depreciation_rate'),
    salvageValue: pgReal('salvage_value').notNull().default(0),
    currentBookValue: pgReal('current_book_value').notNull().default(0),
    accumulatedDepreciation: pgReal('accumulated_depreciation').notNull().default(0),
    location: pgText('location'),
    departmentId: pgUuid('department_id'),
    assignedEmployeeId: pgUuid('assigned_employee_id'),
    branchId: pgUuid('branch_id'),
    vehicleNumber: pgText('vehicle_number'),
    registrationNumber: pgText('registration_number'),
    insuranceExpiry: pgTimestamp('insurance_expiry', { withTimezone: true }),
    pucExpiry: pgTimestamp('puc_expiry', { withTimezone: true }),
    fitnessCertificateExpiry: pgTimestamp('fitness_certificate_expiry', { withTimezone: true }),
    permitExpiry: pgTimestamp('permit_expiry', { withTimezone: true }),
    odometerReading: pgReal('odometer_reading'),
    driverEmployeeId: pgUuid('driver_employee_id'),
    status: pgText('status').notNull().default('available'),
    condition: pgText('condition').notNull().default('good'),
    notes: pgText('notes'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('ast_code_idx').on(table.assetCode),
    serialIdx: pgUniqueIndex('ast_serial_idx').on(table.serialNumber),
    catIdx: pgIndex('ast_cat_idx').on(table.categoryId),
    statusIdx: pgIndex('ast_status_idx').on(table.status),
    empIdx: pgIndex('ast_emp_idx').on(table.assignedEmployeeId),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET ALLOCATIONS (history — never overwrite)
// ═════════════════════════════════════════════════════════
export const sqliteAssetAllocations = sqliteTableBase(
  'shranix_asset_allocations',
  {
    ...sqliteBase,
    assetId: sqliteText('asset_id').notNull(),
    assignedToType: sqliteText('assigned_to_type').notNull(), // employee | department | branch | location | warehouse
    assignedToId: sqliteText('assigned_to_id').notNull(),
    assignmentDate: sqliteText('assignment_date'),
    expectedReturnDate: sqliteText('expected_return_date'),
    remarks: sqliteText('remarks'),
    status: sqliteText('status').notNull().default('assigned'), // assigned | returned
    returnedAt: sqliteText('returned_at'),
    assignedBy: sqliteText('assigned_by'),
  },
  (table) => ({
    assetIdx: index('ast_alloc_asset_idx').on(table.assetId),
    empIdx: index('ast_alloc_emp_idx').on(table.assignedToId),
  }),
);

export const pgAssetAllocations = pgTableBase(
  'shranix_asset_allocations',
  {
    ...pgBase,
    assetId: pgUuid('asset_id').notNull(),
    assignedToType: pgText('assigned_to_type').notNull(),
    assignedToId: pgUuid('assigned_to_id').notNull(),
    assignmentDate: pgTimestamp('assignment_date', { withTimezone: true }),
    expectedReturnDate: pgTimestamp('expected_return_date', { withTimezone: true }),
    remarks: pgText('remarks'),
    status: pgText('status').notNull().default('assigned'),
    returnedAt: pgTimestamp('returned_at', { withTimezone: true }),
    assignedBy: pgUuid('assigned_by'),
  },
  (table) => ({
    assetIdx: pgIndex('ast_alloc_asset_idx').on(table.assetId),
    empIdx: pgIndex('ast_alloc_emp_idx').on(table.assignedToId),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET TRANSFERS
// ═════════════════════════════════════════════════════════
export const sqliteAssetTransfers = sqliteTableBase(
  'shranix_asset_transfers',
  {
    ...sqliteBase,
    transferNumber: sqliteText('transfer_number').notNull(),
    assetId: sqliteText('asset_id').notNull(),
    transferDate: sqliteText('transfer_date'),
    fromType: sqliteText('from_type'), // employee | department | branch | location | warehouse
    fromId: sqliteText('from_id'),
    toType: sqliteText('to_type').notNull(),
    toId: sqliteText('to_id').notNull(),
    reason: sqliteText('reason'),
    status: sqliteText('status').notNull().default('pending'), // pending | approved | completed | cancelled
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    numIdx: uniqueIndex('ast_tr_num_idx').on(table.transferNumber),
    assetIdx: index('ast_tr_asset_idx').on(table.assetId),
  }),
);

export const pgAssetTransfers = pgTableBase(
  'shranix_asset_transfers',
  {
    ...pgBase,
    transferNumber: pgText('transfer_number').notNull(),
    assetId: pgUuid('asset_id').notNull(),
    transferDate: pgTimestamp('transfer_date', { withTimezone: true }),
    fromType: pgText('from_type'),
    fromId: pgUuid('from_id'),
    toType: pgText('to_type').notNull(),
    toId: pgUuid('to_id').notNull(),
    reason: pgText('reason'),
    status: pgText('status').notNull().default('pending'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    numIdx: pgUniqueIndex('ast_tr_num_idx').on(table.transferNumber),
    assetIdx: pgIndex('ast_tr_asset_idx').on(table.assetId),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET MAINTENANCE
// ═════════════════════════════════════════════════════════
export const sqliteAssetMaintenance = sqliteTableBase(
  'shranix_asset_maintenance',
  {
    ...sqliteBase,
    maintenanceNumber: sqliteText('maintenance_number').notNull(),
    assetId: sqliteText('asset_id').notNull(),
    maintenanceType: sqliteText('maintenance_type').notNull().default('routine'), // preventive | breakdown | routine | repair | service | other
    serviceDate: sqliteText('service_date'),
    nextServiceDate: sqliteText('next_service_date'),
    serviceFrequencyDays: sqliteInteger('service_frequency_days'),
    reminderDays: sqliteInteger('reminder_days').notNull().default(7),
    vendor: sqliteText('vendor'),
    description: sqliteText('description'),
    partsCost: sqliteReal('parts_cost').notNull().default(0),
    laborCost: sqliteReal('labor_cost').notNull().default(0),
    otherCost: sqliteReal('other_cost').notNull().default(0),
    totalCost: sqliteReal('total_cost').notNull().default(0),
    warrantyCovered: sqliteInteger('warranty_covered', { mode: 'boolean' })
      .notNull()
      .default(false),
    status: sqliteText('status').notNull().default('scheduled'), // scheduled | in_progress | completed | cancelled
    remarks: sqliteText('remarks'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    numIdx: uniqueIndex('ast_mnt_num_idx').on(table.maintenanceNumber),
    assetIdx: index('ast_mnt_asset_idx').on(table.assetId),
    nextIdx: index('ast_mnt_next_idx').on(table.nextServiceDate),
  }),
);

export const pgAssetMaintenance = pgTableBase(
  'shranix_asset_maintenance',
  {
    ...pgBase,
    maintenanceNumber: pgText('maintenance_number').notNull(),
    assetId: pgUuid('asset_id').notNull(),
    maintenanceType: pgText('maintenance_type').notNull().default('routine'),
    serviceDate: pgTimestamp('service_date', { withTimezone: true }),
    nextServiceDate: pgTimestamp('next_service_date', { withTimezone: true }),
    serviceFrequencyDays: pgInteger('service_frequency_days'),
    reminderDays: pgInteger('reminder_days').notNull().default(7),
    vendor: pgText('vendor'),
    description: pgText('description'),
    partsCost: pgReal('parts_cost').notNull().default(0),
    laborCost: pgReal('labor_cost').notNull().default(0),
    otherCost: pgReal('other_cost').notNull().default(0),
    totalCost: pgReal('total_cost').notNull().default(0),
    warrantyCovered: pgBoolean('warranty_covered').notNull().default(false),
    status: pgText('status').notNull().default('scheduled'),
    remarks: pgText('remarks'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    numIdx: pgUniqueIndex('ast_mnt_num_idx').on(table.maintenanceNumber),
    assetIdx: pgIndex('ast_mnt_asset_idx').on(table.assetId),
    nextIdx: pgIndex('ast_mnt_next_idx').on(table.nextServiceDate),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET DEPRECIATION POSTINGS
// ═════════════════════════════════════════════════════════
export const sqliteAssetDepreciation = sqliteTableBase(
  'shranix_asset_depreciation',
  {
    ...sqliteBase,
    assetId: sqliteText('asset_id').notNull(),
    period: sqliteText('period').notNull(), // YYYY-MM
    amount: sqliteReal('amount').notNull().default(0),
    bookValueBefore: sqliteReal('book_value_before').notNull().default(0),
    bookValueAfter: sqliteReal('book_value_after').notNull().default(0),
    isPosted: sqliteInteger('is_posted', { mode: 'boolean' }).notNull().default(true),
    postedAt: sqliteText('posted_at'),
    glEntryId: sqliteText('gl_entry_id'),
  },
  (table) => ({
    assetPeriodIdx: uniqueIndex('ast_dep_asset_period_idx').on(table.assetId, table.period),
    assetIdx: index('ast_dep_asset_idx').on(table.assetId),
  }),
);

export const pgAssetDepreciation = pgTableBase(
  'shranix_asset_depreciation',
  {
    ...pgBase,
    assetId: pgUuid('asset_id').notNull(),
    period: pgText('period').notNull(),
    amount: pgReal('amount').notNull().default(0),
    bookValueBefore: pgReal('book_value_before').notNull().default(0),
    bookValueAfter: pgReal('book_value_after').notNull().default(0),
    isPosted: pgBoolean('is_posted').notNull().default(true),
    postedAt: pgTimestamp('posted_at', { withTimezone: true }),
    glEntryId: pgUuid('gl_entry_id'),
  },
  (table) => ({
    assetPeriodIdx: pgUniqueIndex('ast_dep_asset_period_idx').on(table.assetId, table.period),
    assetIdx: pgIndex('ast_dep_asset_idx').on(table.assetId),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET CONDITION HISTORY
// ═════════════════════════════════════════════════════════
export const sqliteAssetConditionHistory = sqliteTableBase(
  'shranix_asset_condition_history',
  {
    ...sqliteBase,
    assetId: sqliteText('asset_id').notNull(),
    condition: sqliteText('condition').notNull(),
    changedAt: sqliteText('changed_at'),
    remarks: sqliteText('remarks'),
    changedBy: sqliteText('changed_by'),
  },
  (table) => ({
    assetIdx: index('ast_cond_asset_idx').on(table.assetId),
  }),
);

export const pgAssetConditionHistory = pgTableBase(
  'shranix_asset_condition_history',
  {
    ...pgBase,
    assetId: pgUuid('asset_id').notNull(),
    condition: pgText('condition').notNull(),
    changedAt: pgTimestamp('changed_at', { withTimezone: true }),
    remarks: pgText('remarks'),
    changedBy: pgUuid('changed_by'),
  },
  (table) => ({
    assetIdx: pgIndex('ast_cond_asset_idx').on(table.assetId),
  }),
);

// ═════════════════════════════════════════════════════════
// ASSET DISPOSALS
// ═════════════════════════════════════════════════════════
export const sqliteAssetDisposals = sqliteTableBase(
  'shranix_asset_disposals',
  {
    ...sqliteBase,
    disposalNumber: sqliteText('disposal_number').notNull(),
    assetId: sqliteText('asset_id').notNull(),
    disposalDate: sqliteText('disposal_date'),
    reason: sqliteText('reason'),
    disposalType: sqliteText('disposal_type').notNull().default('sale'), // sale | scrap | write_off | loss | donation | other
    saleValue: sqliteReal('sale_value').notNull().default(0),
    disposalCost: sqliteReal('disposal_cost').notNull().default(0),
    bookValue: sqliteReal('book_value').notNull().default(0),
    gainLoss: sqliteReal('gain_loss').notNull().default(0),
    status: sqliteText('status').notNull().default('pending'), // pending | approved | completed | cancelled
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    glEntryId: sqliteText('gl_entry_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    numIdx: uniqueIndex('ast_disp_num_idx').on(table.disposalNumber),
    assetIdx: index('ast_disp_asset_idx').on(table.assetId),
  }),
);

export const pgAssetDisposals = pgTableBase(
  'shranix_asset_disposals',
  {
    ...pgBase,
    disposalNumber: pgText('disposal_number').notNull(),
    assetId: pgUuid('asset_id').notNull(),
    disposalDate: pgTimestamp('disposal_date', { withTimezone: true }),
    reason: pgText('reason'),
    disposalType: pgText('disposal_type').notNull().default('sale'),
    saleValue: pgReal('sale_value').notNull().default(0),
    disposalCost: pgReal('disposal_cost').notNull().default(0),
    bookValue: pgReal('book_value').notNull().default(0),
    gainLoss: pgReal('gain_loss').notNull().default(0),
    status: pgText('status').notNull().default('pending'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    glEntryId: pgUuid('gl_entry_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    numIdx: pgUniqueIndex('ast_disp_num_idx').on(table.disposalNumber),
    assetIdx: pgIndex('ast_disp_asset_idx').on(table.assetId),
  }),
);

// ═════════════════════════════════════════════════════════
// EXPENSE CATEGORIES
// ═════════════════════════════════════════════════════════
export const sqliteExpenseCategories = sqliteTableBase(
  'shranix_expense_categories',
  {
    ...sqliteBase,
    categoryName: sqliteText('category_name').notNull(),
    expenseAccountId: sqliteText('expense_account_id'),
    status: sqliteText('status').notNull().default('active'),
    description: sqliteText('description'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    nameIdx: uniqueIndex('exp_cat_name_idx').on(table.categoryName),
  }),
);

export const pgExpenseCategories = pgTableBase(
  'shranix_expense_categories',
  {
    ...pgBase,
    categoryName: pgText('category_name').notNull(),
    expenseAccountId: pgUuid('expense_account_id'),
    status: pgText('status').notNull().default('active'),
    description: pgText('description'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    nameIdx: pgUniqueIndex('exp_cat_name_idx').on(table.categoryName),
  }),
);

// ═════════════════════════════════════════════════════════
// EXPENSES
// ═════════════════════════════════════════════════════════
export const sqliteExpenses = sqliteTableBase(
  'shranix_expenses',
  {
    ...sqliteBase,
    expenseNumber: sqliteText('expense_number').notNull(),
    expenseDate: sqliteText('expense_date'),
    categoryId: sqliteText('category_id'),
    expenseAccountId: sqliteText('expense_account_id'),
    vendorId: sqliteText('vendor_id'), // supplier or general payee
    employeeId: sqliteText('employee_id'),
    departmentId: sqliteText('department_id'),
    amount: sqliteReal('amount').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    totalAmount: sqliteReal('total_amount').notNull().default(0),
    paymentMode: sqliteText('payment_mode'), // cash | bank | upi | cheque | other
    paymentReference: sqliteText('payment_reference'),
    reference: sqliteText('reference'),
    description: sqliteText('description'),
    attachmentRef: sqliteText('attachment_ref'),
    status: sqliteText('status').notNull().default('draft'), // draft | submitted | approved | rejected | paid
    approvedBy: sqliteText('approved_by'),
    approvalDate: sqliteText('approval_date'),
    paidAt: sqliteText('paid_at'),
    paidBy: sqliteText('paid_by'),
    glEntryId: sqliteText('gl_entry_id'),
    recurringExpenseId: sqliteText('recurring_expense_id'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    numIdx: uniqueIndex('exp_num_idx').on(table.expenseNumber),
    catIdx: index('exp_cat_idx').on(table.categoryId),
    statusIdx: index('exp_status_idx').on(table.status),
    dateIdx: index('exp_date_idx').on(table.expenseDate),
  }),
);

export const pgExpenses = pgTableBase(
  'shranix_expenses',
  {
    ...pgBase,
    expenseNumber: pgText('expense_number').notNull(),
    expenseDate: pgTimestamp('expense_date', { withTimezone: true }),
    categoryId: pgUuid('category_id'),
    expenseAccountId: pgUuid('expense_account_id'),
    vendorId: pgUuid('vendor_id'),
    employeeId: pgUuid('employee_id'),
    departmentId: pgUuid('department_id'),
    amount: pgReal('amount').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    totalAmount: pgReal('total_amount').notNull().default(0),
    paymentMode: pgText('payment_mode'),
    paymentReference: pgText('payment_reference'),
    reference: pgText('reference'),
    description: pgText('description'),
    attachmentRef: pgText('attachment_ref'),
    status: pgText('status').notNull().default('draft'),
    approvedBy: pgUuid('approved_by'),
    approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
    paidAt: pgTimestamp('paid_at', { withTimezone: true }),
    paidBy: pgUuid('paid_by'),
    glEntryId: pgUuid('gl_entry_id'),
    recurringExpenseId: pgUuid('recurring_expense_id'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    numIdx: pgUniqueIndex('exp_num_idx').on(table.expenseNumber),
    catIdx: pgIndex('exp_cat_idx').on(table.categoryId),
    statusIdx: pgIndex('exp_status_idx').on(table.status),
    dateIdx: pgIndex('exp_date_idx').on(table.expenseDate),
  }),
);

// ═════════════════════════════════════════════════════════
// RECURRING EXPENSES
// ═════════════════════════════════════════════════════════
export const sqliteRecurringExpenses = sqliteTableBase(
  'shranix_recurring_expenses',
  {
    ...sqliteBase,
    recurringNumber: sqliteText('recurring_number').notNull(),
    categoryId: sqliteText('category_id'),
    expenseAccountId: sqliteText('expense_account_id'),
    vendorId: sqliteText('vendor_id'),
    departmentId: sqliteText('department_id'),
    amount: sqliteReal('amount').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    frequency: sqliteText('frequency').notNull().default('monthly'), // monthly | quarterly | yearly | custom
    intervalDays: sqliteInteger('interval_days'),
    nextDueDate: sqliteText('next_due_date'),
    description: sqliteText('description'),
    paymentMode: sqliteText('payment_mode'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    lastGeneratedAt: sqliteText('last_generated_at'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    numIdx: uniqueIndex('exp_rec_num_idx').on(table.recurringNumber),
    dueIdx: index('exp_rec_due_idx').on(table.nextDueDate),
  }),
);

export const pgRecurringExpenses = pgTableBase(
  'shranix_recurring_expenses',
  {
    ...pgBase,
    recurringNumber: pgText('recurring_number').notNull(),
    categoryId: pgUuid('category_id'),
    expenseAccountId: pgUuid('expense_account_id'),
    vendorId: pgUuid('vendor_id'),
    departmentId: pgUuid('department_id'),
    amount: pgReal('amount').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    frequency: pgText('frequency').notNull().default('monthly'),
    intervalDays: pgInteger('interval_days'),
    nextDueDate: pgTimestamp('next_due_date', { withTimezone: true }),
    description: pgText('description'),
    paymentMode: pgText('payment_mode'),
    isActive: pgBoolean('is_active').notNull().default(true),
    lastGeneratedAt: pgTimestamp('last_generated_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    numIdx: pgUniqueIndex('exp_rec_num_idx').on(table.recurringNumber),
    dueIdx: pgIndex('exp_rec_due_idx').on(table.nextDueDate),
  }),
);
