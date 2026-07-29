import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT FOLDERS
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocumentFolders = sqliteTableBase('shranix_document_folders', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  parentId: sqliteText('parent_id'),
  description: sqliteText('description'),
  path: sqliteText('path'),
  level: sqliteInteger('level').notNull().default(0),
  displayOrder: sqliteInteger('display_order').notNull().default(0),
  isSystem: sqliteInteger('is_system', { mode: 'boolean' }).notNull().default(false),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
});

export const pgDocumentFolders = pgTableBase('shranix_document_folders', {
  ...pgBase,
  name: pgText('name').notNull(),
  parentId: pgUuid('parent_id'),
  description: pgText('description'),
  path: pgText('path'),
  level: pgInteger('level').notNull().default(0),
  displayOrder: pgInteger('display_order').notNull().default(0),
  isSystem: pgBoolean('is_system').notNull().default(false),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
});

// ═══════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocuments = sqliteTableBase('shranix_documents', {
  ...sqliteBase,
  documentNumber: sqliteText('document_number').notNull(),
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  category: sqliteText('category'),
  documentType: sqliteText('document_type'),
  mimeType: sqliteText('mime_type'),
  fileSize: sqliteInteger('file_size').notNull().default(0),
  fileExtension: sqliteText('file_extension'),
  storagePath: sqliteText('storage_path').notNull(),
  checksum: sqliteText('checksum'),
  folderId: sqliteText('folder_id'),
  tags: sqliteText('tags'),
  metadata: sqliteText('metadata'),
  status: sqliteText('status').notNull().default('draft'),
  retentionPolicy: sqliteText('retention_policy'),
  retentionDays: sqliteInteger('retention_days'),
  expiryDate: sqliteText('expiry_date'),
  archiveDate: sqliteText('archive_date'),
  legalHold: sqliteInteger('legal_hold', { mode: 'boolean' }).notNull().default(false),
  isEncrypted: sqliteInteger('is_encrypted', { mode: 'boolean' }).notNull().default(false),
  currentVersion: sqliteInteger('current_version').notNull().default(1),
  linkedModule: sqliteText('linked_module'),
  linkedEntityId: sqliteText('linked_entity_id'),
  linkedEntityNumber: sqliteText('linked_entity_number'),
  ownerId: sqliteText('owner_id'),
  departmentId: sqliteText('department_id'),
  branchId: sqliteText('branch_id'),
  companyId: sqliteText('company_id'),
  warehouseId: sqliteText('warehouse_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ docNumberIdx: uniqueIndex('dms_doc_number_idx').on(table.documentNumber) }));

export const pgDocuments = pgTableBase('shranix_documents', {
  ...pgBase,
  documentNumber: pgText('document_number').notNull(),
  name: pgText('name').notNull(),
  description: pgText('description'),
  category: pgText('category'),
  documentType: pgText('document_type'),
  mimeType: pgText('mime_type'),
  fileSize: pgInteger('file_size').notNull().default(0),
  fileExtension: pgText('file_extension'),
  storagePath: pgText('storage_path').notNull(),
  checksum: pgText('checksum'),
  folderId: pgUuid('folder_id'),
  tags: pgText('tags'),
  metadata: pgText('metadata'),
  status: pgText('status').notNull().default('draft'),
  retentionPolicy: pgText('retention_policy'),
  retentionDays: pgInteger('retention_days'),
  expiryDate: pgTimestamp('expiry_date', { withTimezone: true }),
  archiveDate: pgTimestamp('archive_date', { withTimezone: true }),
  legalHold: pgBoolean('legal_hold').notNull().default(false),
  isEncrypted: pgBoolean('is_encrypted').notNull().default(false),
  currentVersion: pgInteger('current_version').notNull().default(1),
  linkedModule: pgText('linked_module'),
  linkedEntityId: pgUuid('linked_entity_id'),
  linkedEntityNumber: pgText('linked_entity_number'),
  ownerId: pgUuid('owner_id'),
  departmentId: pgUuid('department_id'),
  branchId: pgUuid('branch_id'),
  companyId: pgUuid('company_id'),
  warehouseId: pgUuid('warehouse_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ docNumberIdx: pgUniqueIndex('dms_doc_number_idx').on(table.documentNumber) }));

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT VERSIONS
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocumentVersions = sqliteTableBase('shranix_document_versions', {
  ...sqliteBase,
  documentId: sqliteText('document_id').notNull(),
  versionNumber: sqliteInteger('version_number').notNull(),
  isMajor: sqliteInteger('is_major', { mode: 'boolean' }).notNull().default(false),
  storagePath: sqliteText('storage_path').notNull(),
  fileSize: sqliteInteger('file_size').notNull().default(0),
  checksum: sqliteText('checksum'),
  changeNotes: sqliteText('change_notes'),
  authorId: sqliteText('author_id'),
}, (table) => ({ versionDocIdx: uniqueIndex('dms_version_doc_idx').on(table.documentId, table.versionNumber) }));

export const pgDocumentVersions = pgTableBase('shranix_document_versions', {
  ...pgBase,
  documentId: pgUuid('document_id').notNull(),
  versionNumber: pgInteger('version_number').notNull(),
  isMajor: pgBoolean('is_major').notNull().default(false),
  storagePath: pgText('storage_path').notNull(),
  fileSize: pgInteger('file_size').notNull().default(0),
  checksum: pgText('checksum'),
  changeNotes: pgText('change_notes'),
  authorId: pgUuid('author_id'),
}, (table) => ({ versionDocIdx: pgUniqueIndex('dms_version_doc_idx').on(table.documentId, table.versionNumber) }));

// ═══════════════════════════════════════════════════════════════════
// TAGS
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocumentTags = sqliteTableBase('shranix_document_tags', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  color: sqliteText('color'),
  description: sqliteText('description'),
});

export const pgDocumentTags = pgTableBase('shranix_document_tags', {
  ...pgBase,
  name: pgText('name').notNull(),
  color: pgText('color'),
  description: pgText('description'),
});

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT-TAG JUNCTION
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocumentTagJunction = sqliteTableBase('shranix_document_tag_junction', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: sqliteText('document_id').notNull(),
  tagId: sqliteText('tag_id').notNull(),
});

export const pgDocumentTagJunction = pgTableBase('shranix_document_tag_junction', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  documentId: pgUuid('document_id').notNull(),
  tagId: pgUuid('tag_id').notNull(),
});

// ═══════════════════════════════════════════════════════════════════
// DIGITAL SIGNATURES
// ═══════════════════════════════════════════════════════════════════
export const sqliteDigitalSignatures = sqliteTableBase('shranix_digital_signatures', {
  ...sqliteBase,
  documentId: sqliteText('document_id').notNull(),
  documentVersionId: sqliteText('document_version_id'),
  signerId: sqliteText('signer_id').notNull(),
  signatureType: sqliteText('signature_type').notNull().default('approval'),
  signature: sqliteText('signature'),
  certificateHash: sqliteText('certificate_hash'),
  isVerified: sqliteInteger('is_verified', { mode: 'boolean' }).notNull().default(false),
  verificationDate: sqliteText('verification_date'),
  signedAt: sqliteText('signed_at').notNull(),
  ipAddress: sqliteText('ip_address'),
  userAgent: sqliteText('user_agent'),
  notes: sqliteText('notes'),
  level: sqliteInteger('level').notNull().default(1),
}, (table) => ({ sigDocIdx: uniqueIndex('dms_sig_doc_idx').on(table.documentId, table.signerId) }));

export const pgDigitalSignatures = pgTableBase('shranix_digital_signatures', {
  ...pgBase,
  documentId: pgUuid('document_id').notNull(),
  documentVersionId: pgUuid('document_version_id'),
  signerId: pgUuid('signer_id').notNull(),
  signatureType: pgText('signature_type').notNull().default('approval'),
  signature: pgText('signature'),
  certificateHash: pgText('certificate_hash'),
  isVerified: pgBoolean('is_verified').notNull().default(false),
  verificationDate: pgTimestamp('verification_date', { withTimezone: true }),
  signedAt: pgTimestamp('signed_at', { withTimezone: true }).notNull(),
  ipAddress: pgText('ip_address'),
  userAgent: pgText('user_agent'),
  notes: pgText('notes'),
  level: pgInteger('level').notNull().default(1),
}, (table) => ({ sigDocIdx: pgUniqueIndex('dms_sig_doc_idx').on(table.documentId, table.signerId) }));

// ═══════════════════════════════════════════════════════════════════
// OCR RESULTS
// ═══════════════════════════════════════════════════════════════════
export const sqliteOcrResults = sqliteTableBase('shranix_ocr_results', {
  ...sqliteBase,
  documentId: sqliteText('document_id').notNull(),
  documentVersionId: sqliteText('document_version_id'),
  rawText: sqliteText('raw_text'),
  processedText: sqliteText('processed_text'),
  confidence: sqliteReal('confidence').notNull().default(0),
  invoiceNumber: sqliteText('invoice_number'),
  poNumber: sqliteText('po_number'),
  supplierName: sqliteText('supplier_name'),
  customerName: sqliteText('customer_name'),
  gstNumber: sqliteText('gst_number'),
  panNumber: sqliteText('pan_number'),
  documentDate: sqliteText('document_date'),
  dueDate: sqliteText('due_date'),
  totalAmount: sqliteReal('total_amount'),
  taxAmount: sqliteReal('tax_amount'),
  hsnCodes: sqliteText('hsn_codes'),
  itemNames: sqliteText('item_names'),
  quantities: sqliteText('quantities'),
  engine: sqliteText('engine').notNull().default('tesseract'),
  processingTime: sqliteInteger('processing_time'),
  status: sqliteText('status').notNull().default('pending'),
  errorMessage: sqliteText('error_message'),
});

export const pgOcrResults = pgTableBase('shranix_ocr_results', {
  ...pgBase,
  documentId: pgUuid('document_id').notNull(),
  documentVersionId: pgUuid('document_version_id'),
  rawText: pgText('raw_text'),
  processedText: pgText('processed_text'),
  confidence: pgReal('confidence').notNull().default(0),
  invoiceNumber: pgText('invoice_number'),
  poNumber: pgText('po_number'),
  supplierName: pgText('supplier_name'),
  customerName: pgText('customer_name'),
  gstNumber: pgText('gst_number'),
  panNumber: pgText('pan_number'),
  documentDate: pgText('document_date'),
  dueDate: pgText('due_date'),
  totalAmount: pgReal('total_amount'),
  taxAmount: pgReal('tax_amount'),
  hsnCodes: pgText('hsn_codes'),
  itemNames: pgText('item_names'),
  quantities: pgText('quantities'),
  engine: pgText('engine').notNull().default('tesseract'),
  processingTime: pgInteger('processing_time'),
  status: pgText('status').notNull().default('pending'),
  errorMessage: pgText('error_message'),
});

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT ACCESS LOGS
// ═══════════════════════════════════════════════════════════════════
export const sqliteDocumentAccessLogs = sqliteTableBase('shranix_document_access_logs', {
  ...sqliteBase,
  documentId: sqliteText('document_id').notNull(),
  userId: sqliteText('user_id').notNull(),
  action: sqliteText('action').notNull(),
  ipAddress: sqliteText('ip_address'),
  userAgent: sqliteText('user_agent'),
  timestamp: sqliteText('timestamp').notNull(),
  details: sqliteText('details'),
});

export const pgDocumentAccessLogs = pgTableBase('shranix_document_access_logs', {
  ...pgBase,
  documentId: pgUuid('document_id').notNull(),
  userId: pgUuid('user_id').notNull(),
  action: pgText('action').notNull(),
  ipAddress: pgText('ip_address'),
  userAgent: pgText('user_agent'),
  timestamp: pgTimestamp('timestamp', { withTimezone: true }).notNull(),
  details: pgText('details'),
});
