import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

// ── SQLite Helpers ──────────────────────────────────────
const sqliteBase = {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};

const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// 1. COMPANIES
// ═════════════════════════════════════════════════════════
export const sqliteCompanies = sqliteTableBase('shranix_companies', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  alias: sqliteText('alias'),
  address: sqliteText('address'),
  city: sqliteText('city'),
  state: sqliteText('state'),
  pincode: sqliteText('pincode'),
  country: sqliteText('country').notNull().default('India'),
  phone: sqliteText('phone'),
  email: sqliteText('email'),
  website: sqliteText('website'),
  gstin: sqliteText('gstin'),
  pan: sqliteText('pan'),
  cin: sqliteText('cin'),
  logo: sqliteText('logo'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  isHeadOffice: sqliteInteger('is_head_office', { mode: 'boolean' }).notNull().default(false),
  financialYearStart: sqliteText('financial_year_start').notNull().default('April'),
  currency: sqliteText('currency').notNull().default('INR'),
  timezone: sqliteText('timezone').notNull().default('Asia/Kolkata'),
}, (table) => ({
  nameIdx: uniqueIndex('companies_name_idx').on(table.name),
  gstinIdx: uniqueIndex('companies_gstin_idx').on(table.gstin),
}));

export const pgCompanies = pgTableBase('shranix_companies', {
  ...pgBase,
  name: pgText('name').notNull(),
  alias: pgText('alias'),
  address: pgText('address'),
  city: pgText('city'),
  state: pgText('state'),
  pincode: pgText('pincode'),
  country: pgText('country').notNull().default('India'),
  phone: pgText('phone'),
  email: pgText('email'),
  website: pgText('website'),
  gstin: pgText('gstin'),
  pan: pgText('pan'),
  cin: pgText('cin'),
  logo: pgText('logo'),
  isActive: pgBoolean('is_active').notNull().default(true),
  isHeadOffice: pgBoolean('is_head_office').notNull().default(false),
  financialYearStart: pgText('financial_year_start').notNull().default('April'),
  currency: pgText('currency').notNull().default('INR'),
  timezone: pgText('timezone').notNull().default('Asia/Kolkata'),
}, (table) => ({
  nameIdx: pgUniqueIndex('companies_name_idx').on(table.name),
  gstinIdx: pgUniqueIndex('companies_gstin_idx').on(table.gstin),
}));

// ═════════════════════════════════════════════════════════
// 2. FINANCIAL YEARS
// ═════════════════════════════════════════════════════════
export const sqliteFinancialYears = sqliteTableBase('shranix_financial_years', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  startDate: sqliteText('start_date').notNull(),
  endDate: sqliteText('end_date').notNull(),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(false),
  isClosed: sqliteInteger('is_closed', { mode: 'boolean' }).notNull().default(false),
  companyId: sqliteText('company_id'),
}, (table) => ({
  nameIdx: uniqueIndex('fy_name_idx').on(table.name),
}));

export const pgFinancialYears = pgTableBase('shranix_financial_years', {
  ...pgBase,
  name: pgText('name').notNull(),
  startDate: pgTimestamp('start_date', { withTimezone: true }).notNull(),
  endDate: pgTimestamp('end_date', { withTimezone: true }).notNull(),
  isActive: pgBoolean('is_active').notNull().default(false),
  isClosed: pgBoolean('is_closed').notNull().default(false),
  companyId: pgUuid('company_id'),
}, (table) => ({
  nameIdx: pgUniqueIndex('fy_name_idx').on(table.name),
}));

// ═════════════════════════════════════════════════════════
// 3. BRANCHES
// ═════════════════════════════════════════════════════════
export const sqliteBranches = sqliteTableBase('shranix_branches', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  code: sqliteText('code').notNull(),
  address: sqliteText('address'),
  city: sqliteText('city'),
  state: sqliteText('state'),
  phone: sqliteText('phone'),
  email: sqliteText('email'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  companyId: sqliteText('company_id'),
}, (table) => ({
  codeIdx: uniqueIndex('branch_code_idx').on(table.code),
}));

export const pgBranches = pgTableBase('shranix_branches', {
  ...pgBase,
  name: pgText('name').notNull(),
  code: pgText('code').notNull(),
  address: pgText('address'),
  city: pgText('city'),
  state: pgText('state'),
  phone: pgText('phone'),
  email: pgText('email'),
  isActive: pgBoolean('is_active').notNull().default(true),
  companyId: pgUuid('company_id'),
}, (table) => ({
  codeIdx: pgUniqueIndex('branch_code_idx').on(table.code),
}));

// ═════════════════════════════════════════════════════════
// 4. WAREHOUSES
// ═════════════════════════════════════════════════════════
export const sqliteWarehouses = sqliteTableBase('shranix_warehouses', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  code: sqliteText('code').notNull(),
  warehouseType: sqliteText('warehouse_type').notNull().default('storage'), // storage, distribution, transit
  address: sqliteText('address'),
  city: sqliteText('city'),
  state: sqliteText('state'),
  district: sqliteText('district'),
  pincode: sqliteText('pincode'),
  contactPerson: sqliteText('contact_person'),
  phone: sqliteText('phone'),
  mobile: sqliteText('mobile'),
  email: sqliteText('email'),
  gstin: sqliteText('gstin'),
  remarks: sqliteText('remarks'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  isMain: sqliteInteger('is_main', { mode: 'boolean' }).notNull().default(false),
  branchId: sqliteText('branch_id'),
  companyId: sqliteText('company_id'),
}, (table) => ({
  codeIdx: uniqueIndex('warehouse_code_idx').on(table.code),
}));

export const pgWarehouses = pgTableBase('shranix_warehouses', {
  ...pgBase,
  name: pgText('name').notNull(),
  code: pgText('code').notNull(),
  warehouseType: pgText('warehouse_type').notNull().default('storage'),
  address: pgText('address'),
  city: pgText('city'),
  state: pgText('state'),
  district: pgText('district'),
  pincode: pgText('pincode'),
  contactPerson: pgText('contact_person'),
  phone: pgText('phone'),
  mobile: pgText('mobile'),
  email: pgText('email'),
  gstin: pgText('gstin'),
  remarks: pgText('remarks'),
  isActive: pgBoolean('is_active').notNull().default(true),
  isMain: pgBoolean('is_main').notNull().default(false),
  branchId: pgUuid('branch_id'),
  companyId: pgUuid('company_id'),
}, (table) => ({
  codeIdx: pgUniqueIndex('warehouse_code_idx').on(table.code),
}));

// ═════════════════════════════════════════════════════════
// 5. UNITS
// ═════════════════════════════════════════════════════════
export const sqliteUnits = sqliteTableBase('shranix_units', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  shortName: sqliteText('short_name').notNull(),
  type: sqliteText('type').notNull().default('general'), // general, weight, volume, length, area, count
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  nameIdx: uniqueIndex('units_name_idx').on(table.name),
  shortNameIdx: uniqueIndex('units_short_name_idx').on(table.shortName),
}));

export const pgUnits = pgTableBase('shranix_units', {
  ...pgBase,
  name: pgText('name').notNull(),
  shortName: pgText('short_name').notNull(),
  type: pgText('type').notNull().default('general'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({
  nameIdx: pgUniqueIndex('units_name_idx').on(table.name),
  shortNameIdx: pgUniqueIndex('units_short_name_idx').on(table.shortName),
}));

// ═════════════════════════════════════════════════════════
// 6. CATEGORIES
// ═════════════════════════════════════════════════════════
export const sqliteCategories = sqliteTableBase('shranix_categories', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  parentId: sqliteText('parent_id'),
  type: sqliteText('type').notNull().default('item'), // item, party, expense, income
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: sqliteInteger('sort_order').notNull().default(0),
}, (table) => ({
  nameIdx: uniqueIndex('categories_name_idx').on(table.name),
}));

export const pgCategories = pgTableBase('shranix_categories', {
  ...pgBase,
  name: pgText('name').notNull(),
  description: pgText('description'),
  parentId: pgUuid('parent_id'),
  type: pgText('type').notNull().default('item'),
  isActive: pgBoolean('is_active').notNull().default(true),
  sortOrder: pgInteger('sort_order').notNull().default(0),
}, (table) => ({
  nameIdx: pgUniqueIndex('categories_name_idx').on(table.name),
}));

// ═════════════════════════════════════════════════════════
// 7. BRANDS
// ═════════════════════════════════════════════════════════
export const sqliteBrands = sqliteTableBase('shranix_brands', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  nameIdx: uniqueIndex('brands_name_idx').on(table.name),
}));

export const pgBrands = pgTableBase('shranix_brands', {
  ...pgBase,
  name: pgText('name').notNull(),
  description: pgText('description'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({
  nameIdx: pgUniqueIndex('brands_name_idx').on(table.name),
}));

// ═════════════════════════════════════════════════════════
// 8. TAX GROUPS
// ═════════════════════════════════════════════════════════
export const sqliteTaxGroups = sqliteTableBase('shranix_tax_groups', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  type: sqliteText('type').notNull().default('gst'), // gst, vat, custom
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  nameIdx: uniqueIndex('tax_groups_name_idx').on(table.name),
}));

export const pgTaxGroups = pgTableBase('shranix_tax_groups', {
  ...pgBase,
  name: pgText('name').notNull(),
  description: pgText('description'),
  type: pgText('type').notNull().default('gst'),
  isActive: pgBoolean('is_active').notNull().default(true),
  isDefault: pgBoolean('is_default').notNull().default(false),
}, (table) => ({
  nameIdx: pgUniqueIndex('tax_groups_name_idx').on(table.name),
}));

// ═════════════════════════════════════════════════════════
// 9. GST RATES
// ═════════════════════════════════════════════════════════
export const sqliteGSTRates = sqliteTableBase('shranix_gst_rates', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  rate: sqliteInteger('rate').notNull(), // percentage (e.g., 5, 12, 18, 28)
  type: sqliteText('type').notNull().default('igst'), // igst, cgst_sgst, cess
  igst: sqliteInteger('igst').notNull().default(0),
  cgst: sqliteInteger('cgst').notNull().default(0),
  sgst: sqliteInteger('sgst').notNull().default(0),
  cess: sqliteInteger('cess').notNull().default(0),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
  effectiveFrom: sqliteText('effective_from'),
  effectiveTo: sqliteText('effective_to'),
  hsnSacCode: sqliteText('hsn_sac_code'),
  taxGroupId: sqliteText('tax_group_id'),
}, (table) => ({
  nameIdx: uniqueIndex('gst_rates_name_idx').on(table.name),
  rateTypeIdx: uniqueIndex('gst_rate_type_idx').on(table.rate, table.type),
}));

export const pgGSTRates = pgTableBase('shranix_gst_rates', {
  ...pgBase,
  name: pgText('name').notNull(),
  description: pgText('description'),
  rate: pgInteger('rate').notNull(),
  type: pgText('type').notNull().default('igst'),
  igst: pgInteger('igst').notNull().default(0),
  cgst: pgInteger('cgst').notNull().default(0),
  sgst: pgInteger('sgst').notNull().default(0),
  cess: pgInteger('cess').notNull().default(0),
  isActive: pgBoolean('is_active').notNull().default(true),
  isDefault: pgBoolean('is_default').notNull().default(false),
  effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
  effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
  hsnSacCode: pgText('hsn_sac_code'),
  taxGroupId: pgUuid('tax_group_id'),
}, (table) => ({
  nameIdx: pgUniqueIndex('gst_rates_name_idx').on(table.name),
  rateTypeIdx: pgUniqueIndex('gst_rate_type_idx').on(table.rate, table.type),
}));
