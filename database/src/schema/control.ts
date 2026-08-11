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
// BUSINESS RULES
// ═════════════════════════════════════════════════════════
export const sqliteBusinessRules = sqliteTableBase(
  'shranix_business_rules',
  {
    ...sqliteBase,
    ruleCode: sqliteText('rule_code').notNull(),
    ruleName: sqliteText('rule_name').notNull(),
    module: sqliteText('module').notNull(), // sales | purchase | inventory | accounts | hr | asset | expense | crm | payment
    documentType: sqliteText('document_type'), // e.g. sales_invoice, purchase_order
    description: sqliteText('description'),
    // Condition: JSON { field, operator, value } or { and: [...] } / { or: [...] }
    condition: sqliteText('condition').notNull().default('{}'),
    // Action: allow | block | warn | require_approval | notify | escalate | lock
    action: sqliteText('action').notNull().default('block'),
    severity: sqliteText('severity').notNull().default('error'), // info | warning | error | critical
    message: sqliteText('message'),
    priority: sqliteInteger('priority').notNull().default(100),
    status: sqliteText('status').notNull().default('active'), // active | inactive
    effectiveFrom: sqliteText('effective_from'),
    effectiveTo: sqliteText('effective_to'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('br_rule_code_idx').on(table.ruleCode),
    moduleIdx: index('br_module_idx').on(table.module),
    statusIdx: index('br_status_idx').on(table.status),
  }),
);

export const pgBusinessRules = pgTableBase(
  'shranix_business_rules',
  {
    ...pgBase,
    ruleCode: pgText('rule_code').notNull(),
    ruleName: pgText('rule_name').notNull(),
    module: pgText('module').notNull(),
    documentType: pgText('document_type'),
    description: pgText('description'),
    condition: pgText('condition').notNull().default('{}'),
    action: pgText('action').notNull().default('block'),
    severity: pgText('severity').notNull().default('error'),
    message: pgText('message'),
    priority: pgInteger('priority').notNull().default(100),
    status: pgText('status').notNull().default('active'),
    effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
    effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('br_rule_code_idx').on(table.ruleCode),
    moduleIdx: pgIndex('br_module_idx').on(table.module),
    statusIdx: pgIndex('br_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// CUSTOM FIELDS (definitions — no schema change needed)
// ═════════════════════════════════════════════════════════
export const sqliteCustomFields = sqliteTableBase(
  'shranix_custom_fields',
  {
    ...sqliteBase,
    fieldCode: sqliteText('field_code').notNull(),
    fieldName: sqliteText('field_name').notNull(),
    module: sqliteText('module').notNull(), // sales | purchase | customer | supplier | product | asset | expense | hr | crm
    documentType: sqliteText('document_type').notNull(),
    fieldType: sqliteText('field_type').notNull().default('text'), // text | number | decimal | date | boolean | dropdown | multi_select | file | long_text
    isRequired: sqliteInteger('is_required', { mode: 'boolean' }).notNull().default(false),
    minValue: sqliteReal('min_value'),
    maxValue: sqliteReal('max_value'),
    pattern: sqliteText('pattern'),
    options: sqliteText('options'), // JSON array for dropdown/multi_select
    defaultValue: sqliteText('default_value'),
    placeholder: sqliteText('placeholder'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    docTypeCodeIdx: uniqueIndex('cf_doc_type_code_idx').on(table.documentType, table.fieldCode),
    moduleIdx: index('cf_module_idx').on(table.module),
  }),
);

export const pgCustomFields = pgTableBase(
  'shranix_custom_fields',
  {
    ...pgBase,
    fieldCode: pgText('field_code').notNull(),
    fieldName: pgText('field_name').notNull(),
    module: pgText('module').notNull(),
    documentType: pgText('document_type').notNull(),
    fieldType: pgText('field_type').notNull().default('text'),
    isRequired: pgBoolean('is_required').notNull().default(false),
    minValue: pgReal('min_value'),
    maxValue: pgReal('max_value'),
    pattern: pgText('pattern'),
    options: pgText('options'),
    defaultValue: pgText('default_value'),
    placeholder: pgText('placeholder'),
    isActive: pgBoolean('is_active').notNull().default(true),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    docTypeCodeIdx: pgUniqueIndex('cf_doc_type_code_idx').on(table.documentType, table.fieldCode),
    moduleIdx: pgIndex('cf_module_idx').on(table.module),
  }),
);

// ═════════════════════════════════════════════════════════
// CUSTOM FIELD VALUES (one row per record+field — JSON values)
// ═════════════════════════════════════════════════════════
export const sqliteCustomFieldValues = sqliteTableBase(
  'shranix_custom_field_values',
  {
    ...sqliteBase,
    fieldId: sqliteText('field_id').notNull(),
    documentType: sqliteText('document_type').notNull(),
    recordId: sqliteText('record_id').notNull(),
    value: sqliteText('value'), // JSON-encoded value (string/number/bool/array)
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    recFieldIdx: uniqueIndex('cfv_record_field_idx').on(table.recordId, table.fieldId),
    docIdx: index('cfv_doc_idx').on(table.documentType, table.recordId),
  }),
);

export const pgCustomFieldValues = pgTableBase(
  'shranix_custom_field_values',
  {
    ...pgBase,
    fieldId: pgUuid('field_id').notNull(),
    documentType: pgText('document_type').notNull(),
    recordId: pgUuid('record_id').notNull(),
    value: pgText('value'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    recFieldIdx: pgUniqueIndex('cfv_record_field_idx').on(table.recordId, table.fieldId),
    docIdx: pgIndex('cfv_doc_idx').on(table.documentType, table.recordId),
  }),
);

// ═════════════════════════════════════════════════════════
// TAGS (definitions)
// ═════════════════════════════════════════════════════════
export const sqliteTags = sqliteTableBase(
  'shranix_tags',
  {
    ...sqliteBase,
    tagName: sqliteText('tag_name').notNull(),
    tagColor: sqliteText('tag_color').notNull().default('blue'),
    description: sqliteText('description'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    nameIdx: uniqueIndex('tag_name_idx').on(table.tagName),
  }),
);

export const pgTags = pgTableBase(
  'shranix_tags',
  {
    ...pgBase,
    tagName: pgText('tag_name').notNull(),
    tagColor: pgText('tag_color').notNull().default('blue'),
    description: pgText('description'),
    isActive: pgBoolean('is_active').notNull().default(true),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    nameIdx: pgUniqueIndex('tag_name_idx').on(table.tagName),
  }),
);

// ═════════════════════════════════════════════════════════
// RECORD TAGS (tag assignments — polymorphic via recordType)
// ═════════════════════════════════════════════════════════
export const sqliteRecordTags = sqliteTableBase(
  'shranix_record_tags',
  {
    ...sqliteBase,
    tagId: sqliteText('tag_id').notNull(),
    recordType: sqliteText('record_type').notNull(), // customer | supplier | product | invoice | lead | employee | asset | expense | ...
    recordId: sqliteText('record_id').notNull(),
    assignedBy: sqliteText('assigned_by'),
  },
  (table) => ({
    tagRecordIdx: uniqueIndex('rt_tag_record_idx').on(
      table.tagId,
      table.recordType,
      table.recordId,
    ),
    recordIdx: index('rt_record_idx').on(table.recordType, table.recordId),
  }),
);

export const pgRecordTags = pgTableBase(
  'shranix_record_tags',
  {
    ...pgBase,
    tagId: pgUuid('tag_id').notNull(),
    recordType: pgText('record_type').notNull(),
    recordId: pgUuid('record_id').notNull(),
    assignedBy: pgUuid('assigned_by'),
  },
  (table) => ({
    tagRecordIdx: pgUniqueIndex('rt_tag_record_idx').on(
      table.tagId,
      table.recordType,
      table.recordId,
    ),
    recordIdx: pgIndex('rt_record_idx').on(table.recordType, table.recordId),
  }),
);
