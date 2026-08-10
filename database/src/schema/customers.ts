import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
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
  index as sqliteIndex,
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
// 1. CUSTOMER MASTER (Phase 3 — enterprise customer master)
//
// The canonical master record. `customers.id` is the SAME UUID as the
// matching `shranix_ledger_master` row (ledgerType = 'customer') so every
// existing flow (invoices, payments, credit engine, posting engine, PDFs)
// keeps working with zero changes — the financial ledger stays the source
// of truth for balances, this table adds the enterprise master fields.
// ═════════════════════════════════════════════════════════
export const sqliteCustomers = sqliteTableBase(
  'shranix_customers',
  {
    ...sqliteBase,
    // Auto-generated (CUS-0001 …) — immutable after creation
    customerCode: sqliteText('customer_code').notNull(),
    name: sqliteText('name').notNull(),
    firmName: sqliteText('firm_name'),
    // retail | wholesale | farmer | dealer | corporate | government
    customerType: sqliteText('customer_type').notNull().default('retail'),
    groupId: sqliteText('group_id'),
    categoryId: sqliteText('category_id'),
    gstin: sqliteText('gstin'),
    pan: sqliteText('pan'),
    mobile: sqliteText('mobile'),
    altMobile: sqliteText('alt_mobile'),
    whatsapp: sqliteText('whatsapp'),
    email: sqliteText('email'),
    website: sqliteText('website'),
    creditLimit: sqliteReal('credit_limit').notNull().default(0),
    creditDays: sqliteInteger('credit_days').notNull().default(0),
    openingBalance: sqliteReal('opening_balance').notNull().default(0),
    currentBalance: sqliteReal('current_balance').notNull().default(0),
    // active | inactive | blocked
    status: sqliteText('status').notNull().default('active'),
    remarks: sqliteText('remarks'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    customerCodeIdx: uniqueIndex('cust_code_idx').on(table.customerCode),
    customerMobileIdx: sqliteIndex('cust_mobile_idx').on(table.mobile),
    customerGstinIdx: sqliteIndex('cust_gstin_idx').on(table.gstin),
    customerGroupIdx: sqliteIndex('cust_group_idx').on(table.groupId),
    customerCategoryIdx: sqliteIndex('cust_category_idx').on(table.categoryId),
  }),
);

export const pgCustomers = pgTableBase(
  'shranix_customers',
  {
    ...pgBase,
    customerCode: pgText('customer_code').notNull(),
    name: pgText('name').notNull(),
    firmName: pgText('firm_name'),
    customerType: pgText('customer_type').notNull().default('retail'),
    groupId: pgUuid('group_id'),
    categoryId: pgUuid('category_id'),
    gstin: pgText('gstin'),
    pan: pgText('pan'),
    mobile: pgText('mobile'),
    altMobile: pgText('alt_mobile'),
    whatsapp: pgText('whatsapp'),
    email: pgText('email'),
    website: pgText('website'),
    creditLimit: pgReal('credit_limit').notNull().default(0),
    creditDays: pgInteger('credit_days').notNull().default(0),
    openingBalance: pgReal('opening_balance').notNull().default(0),
    currentBalance: pgReal('current_balance').notNull().default(0),
    status: pgText('status').notNull().default('active'),
    remarks: pgText('remarks'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    customerCodeIdx: pgUniqueIndex('cust_code_idx').on(table.customerCode),
    customerMobileIdx: pgIndex('cust_mobile_idx').on(table.mobile),
    customerGstinIdx: pgIndex('cust_gstin_idx').on(table.gstin),
    customerGroupIdx: pgIndex('cust_group_idx').on(table.groupId),
    customerCategoryIdx: pgIndex('cust_category_idx').on(table.categoryId),
  }),
);

// ═════════════════════════════════════════════════════════
// 2. CUSTOMER ADDRESSES (multiple: billing / shipping / branch)
// ═════════════════════════════════════════════════════════
export const sqliteCustomerAddresses = sqliteTableBase(
  'shranix_customer_addresses',
  {
    ...sqliteBase,
    customerId: sqliteText('customer_id').notNull(),
    // billing | shipping | branch
    addressType: sqliteText('address_type').notNull().default('billing'),
    address: sqliteText('address'),
    village: sqliteText('village'),
    taluka: sqliteText('taluka'),
    district: sqliteText('district'),
    state: sqliteText('state'),
    country: sqliteText('country').notNull().default('India'),
    pincode: sqliteText('pincode'),
    isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    custAddrCustomerIdx: sqliteIndex('cust_addr_customer_idx').on(table.customerId),
  }),
);

export const pgCustomerAddresses = pgTableBase(
  'shranix_customer_addresses',
  {
    ...pgBase,
    customerId: pgUuid('customer_id').notNull(),
    addressType: pgText('address_type').notNull().default('billing'),
    address: pgText('address'),
    village: pgText('village'),
    taluka: pgText('taluka'),
    district: pgText('district'),
    state: pgText('state'),
    country: pgText('country').notNull().default('India'),
    pincode: pgText('pincode'),
    isDefault: pgBoolean('is_default').notNull().default(false),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    custAddrCustomerIdx: pgIndex('cust_addr_customer_idx').on(table.customerId),
  }),
);

// ═════════════════════════════════════════════════════════
// 3. CUSTOMER CONTACTS (multiple: owner / accounts / purchase / sales)
// ═════════════════════════════════════════════════════════
export const sqliteCustomerContacts = sqliteTableBase(
  'shranix_customer_contacts',
  {
    ...sqliteBase,
    customerId: sqliteText('customer_id').notNull(),
    // owner | accounts | purchase | sales
    contactType: sqliteText('contact_type').notNull().default('owner'),
    name: sqliteText('name').notNull(),
    mobile: sqliteText('mobile'),
    email: sqliteText('email'),
    designation: sqliteText('designation'),
    isPrimary: sqliteInteger('is_primary', { mode: 'boolean' }).notNull().default(false),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    custContactCustomerIdx: sqliteIndex('cust_contact_customer_idx').on(table.customerId),
  }),
);

export const pgCustomerContacts = pgTableBase(
  'shranix_customer_contacts',
  {
    ...pgBase,
    customerId: pgUuid('customer_id').notNull(),
    contactType: pgText('contact_type').notNull().default('owner'),
    name: pgText('name').notNull(),
    mobile: pgText('mobile'),
    email: pgText('email'),
    designation: pgText('designation'),
    isPrimary: pgBoolean('is_primary').notNull().default(false),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    custContactCustomerIdx: pgIndex('cust_contact_customer_idx').on(table.customerId),
  }),
);

// ═════════════════════════════════════════════════════════
// 4. CUSTOMER DOCUMENTS (GST certificate / PAN / agreement / shop license …)
// ═════════════════════════════════════════════════════════
export const sqliteCustomerDocuments = sqliteTableBase(
  'shranix_customer_documents',
  {
    ...sqliteBase,
    customerId: sqliteText('customer_id').notNull(),
    // gst_certificate | pan | agreement | shop_license | other
    docType: sqliteText('doc_type').notNull().default('other'),
    fileName: sqliteText('file_name').notNull(),
    fileUrl: sqliteText('file_url'),
    fileSize: sqliteInteger('file_size').notNull().default(0),
    mimeType: sqliteText('mime_type'),
    uploadedBy: sqliteText('uploaded_by'),
    notes: sqliteText('notes'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    custDocCustomerIdx: sqliteIndex('cust_doc_customer_idx').on(table.customerId),
  }),
);

export const pgCustomerDocuments = pgTableBase(
  'shranix_customer_documents',
  {
    ...pgBase,
    customerId: pgUuid('customer_id').notNull(),
    docType: pgText('doc_type').notNull().default('other'),
    fileName: pgText('file_name').notNull(),
    fileUrl: pgText('file_url'),
    fileSize: pgInteger('file_size').notNull().default(0),
    mimeType: pgText('mime_type'),
    uploadedBy: pgUuid('uploaded_by'),
    notes: pgText('notes'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    custDocCustomerIdx: pgIndex('cust_doc_customer_idx').on(table.customerId),
  }),
);

// ═════════════════════════════════════════════════════════
// 5. CUSTOMER GROUPS (Retail / Wholesale / Farmer / Dealer / Corporate / Government)
// ═════════════════════════════════════════════════════════
export const sqliteCustomerGroups = sqliteTableBase(
  'shranix_customer_groups',
  {
    ...sqliteBase,
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    isSystem: sqliteInteger('is_system', { mode: 'boolean' }).notNull().default(false),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({ custGroupNameIdx: uniqueIndex('cust_group_name_idx').on(table.name) }),
);

export const pgCustomerGroups = pgTableBase(
  'shranix_customer_groups',
  {
    ...pgBase,
    name: pgText('name').notNull(),
    description: pgText('description'),
    isSystem: pgBoolean('is_system').notNull().default(false),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    isActive: pgBoolean('is_active').notNull().default(true),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({ custGroupNameIdx: pgUniqueIndex('cust_group_name_idx').on(table.name) }),
);

// ═════════════════════════════════════════════════════════
// 6. CUSTOMER CATEGORIES (A / B / C / Premium / VIP)
// ═════════════════════════════════════════════════════════
export const sqliteCustomerCategories = sqliteTableBase(
  'shranix_customer_categories',
  {
    ...sqliteBase,
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    priority: sqliteInteger('priority').notNull().default(0),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    custCategoryNameIdx: uniqueIndex('cust_category_name_idx').on(table.name),
  }),
);

export const pgCustomerCategories = pgTableBase(
  'shranix_customer_categories',
  {
    ...pgBase,
    name: pgText('name').notNull(),
    description: pgText('description'),
    priority: pgInteger('priority').notNull().default(0),
    isActive: pgBoolean('is_active').notNull().default(true),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    custCategoryNameIdx: pgUniqueIndex('cust_category_name_idx').on(table.name),
  }),
);
