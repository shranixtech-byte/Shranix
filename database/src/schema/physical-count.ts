import crypto from 'node:crypto';
import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';

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
// 36. PHYSICAL COUNT HEADERS (Step 23 — Enterprise Physical Inventory & Cycle Counting)
// ═════════════════════════════════════════════════════════
export const sqlitePhysicalCountHeaders = sqliteTableBase('shranix_physical_count_headers', {
  ...sqliteBase,
  countNumber: sqliteText('count_number').notNull(),
  countDate: sqliteText('count_date'),
  countType: sqliteText('count_type').notNull().default('full_warehouse'), // full_warehouse, cycle_count, abc_count, blind_count, spot_count, recount, random_audit
  warehouseId: sqliteText('warehouse_id').notNull(),
  zoneId: sqliteText('zone_id'),
  rackId: sqliteText('rack_id'),
  shelfId: sqliteText('shelf_id'),
  binId: sqliteText('bin_id'),
  department: sqliteText('department'),
  status: sqliteText('status').notNull().default('draft'), // draft, assigned, in_progress, submitted, verified, approved, completed, cancelled
  priority: sqliteText('priority').notNull().default('normal'), // low, normal, high, urgent
  // Assignment
  assignedTo: sqliteText('assigned_to'),
  assignedDate: sqliteText('assigned_date'),
  // Verification
  verifier: sqliteText('verifier'),
  verifiedBy: sqliteText('verified_by'),
  verifiedDate: sqliteText('verified_date'),
  // Approval
  approvedBy: sqliteText('approved_by'),
  approvedDate: sqliteText('approved_date'),
  // Completion
  completedBy: sqliteText('completed_by'),
  completedDate: sqliteText('completed_date'),
  // Calculated totals
  totalItems: sqliteInteger('total_items').notNull().default(0),
  totalSystemQty: sqliteReal('total_system_qty').notNull().default(0),
  totalCountedQty: sqliteReal('total_counted_qty').notNull().default(0),
  totalVariance: sqliteReal('total_variance').notNull().default(0),
  variancePercent: sqliteReal('variance_percent').notNull().default(0),
  // Audit
  createdBy: sqliteText('created_by'),
  supervisor: sqliteText('supervisor'),
  remarks: sqliteText('remarks'),
  // Adjustment reference (if created)
  adjustmentId: sqliteText('adjustment_id'),
}, (table) => ({
  countNoIdx: uniqueIndex('physical_count_no_idx').on(table.countNumber),
  countWhIdx: uniqueIndex('physical_count_wh_idx').on(table.warehouseId, table.countDate),
}));

export const pgPhysicalCountHeaders = pgTableBase('shranix_physical_count_headers', {
  ...pgBase,
  countNumber: pgText('count_number').notNull(),
  countDate: pgTimestamp('count_date', { withTimezone: true }),
  countType: pgText('count_type').notNull().default('full_warehouse'),
  warehouseId: pgUuid('warehouse_id').notNull(),
  zoneId: pgUuid('zone_id'),
  rackId: pgUuid('rack_id'),
  shelfId: pgUuid('shelf_id'),
  binId: pgUuid('bin_id'),
  department: pgText('department'),
  status: pgText('status').notNull().default('draft'),
  priority: pgText('priority').notNull().default('normal'),
  assignedTo: pgUuid('assigned_to'),
  assignedDate: pgTimestamp('assigned_date', { withTimezone: true }),
  verifier: pgUuid('verifier'),
  verifiedBy: pgUuid('verified_by'),
  verifiedDate: pgTimestamp('verified_date', { withTimezone: true }),
  approvedBy: pgUuid('approved_by'),
  approvedDate: pgTimestamp('approved_date', { withTimezone: true }),
  completedBy: pgUuid('completed_by'),
  completedDate: pgTimestamp('completed_date', { withTimezone: true }),
  totalItems: pgInteger('total_items').notNull().default(0),
  totalSystemQty: pgReal('total_system_qty').notNull().default(0),
  totalCountedQty: pgReal('total_counted_qty').notNull().default(0),
  totalVariance: pgReal('total_variance').notNull().default(0),
  variancePercent: pgReal('variance_percent').notNull().default(0),
  createdBy: pgUuid('created_by'),
  supervisor: pgUuid('supervisor'),
  remarks: pgText('remarks'),
  adjustmentId: pgUuid('adjustment_id'),
}, (table) => ({
  countNoIdx: pgUniqueIndex('physical_count_no_idx').on(table.countNumber),
  countWhIdx: pgUniqueIndex('physical_count_wh_idx').on(table.warehouseId, table.countDate),
}));

// ═════════════════════════════════════════════════════════
// 37. PHYSICAL COUNT ITEMS (Step 23)
// ═════════════════════════════════════════════════════════
export const sqlitePhysicalCountItems = sqliteTableBase('shranix_physical_count_items', {
  ...sqliteBase,
  countId: sqliteText('count_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  batchId: sqliteText('batch_id'),
  batchNo: sqliteText('batch_no'),
  lotNo: sqliteText('lot_no'),
  serialNo: sqliteText('serial_no'),
  uom: sqliteText('uom'),
  // Quantities
  systemQty: sqliteReal('system_qty').notNull().default(0),
  countedQty: sqliteReal('counted_qty').default(0),
  recountQty: sqliteReal('recount_qty').default(0),
  verifiedQty: sqliteReal('verified_qty').default(0),
  finalQty: sqliteReal('final_qty').default(0),
  // Variance
  variance: sqliteReal('variance').notNull().default(0),
  variancePercent: sqliteReal('variance_percent').notNull().default(0),
  // Status
  status: sqliteText('status').notNull().default('pending'), // pending, counted, recounted, verified, resolved
  // Assignees
  counter: sqliteText('counter'),
  verifier: sqliteText('verifier'),
  countMethod: sqliteText('count_method').default('manual'), // manual, barcode, qr, batch, serial
  remarks: sqliteText('remarks'),
  createdBy: sqliteText('created_by'),
}, (table) => ({
  countItemIdx: uniqueIndex('physical_count_item_idx').on(table.countId, table.itemId, table.batchNo),
}));

export const pgPhysicalCountItems = pgTableBase('shranix_physical_count_items', {
  ...pgBase,
  countId: pgUuid('count_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  batchId: pgUuid('batch_id'),
  batchNo: pgText('batch_no'),
  lotNo: pgText('lot_no'),
  serialNo: pgText('serial_no'),
  uom: pgText('uom'),
  systemQty: pgReal('system_qty').notNull().default(0),
  countedQty: pgReal('counted_qty').default(0),
  recountQty: pgReal('recount_qty').default(0),
  verifiedQty: pgReal('verified_qty').default(0),
  finalQty: pgReal('final_qty').default(0),
  variance: pgReal('variance').notNull().default(0),
  variancePercent: pgReal('variance_percent').notNull().default(0),
  status: pgText('status').notNull().default('pending'),
  counter: pgUuid('counter'),
  verifier: pgUuid('verifier'),
  countMethod: pgText('count_method').default('manual'),
  remarks: pgText('remarks'),
  createdBy: pgUuid('created_by'),
}, (table) => ({
  countItemIdx: pgUniqueIndex('physical_count_item_idx').on(table.countId, table.itemId, table.batchNo),
}));
