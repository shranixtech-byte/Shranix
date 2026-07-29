import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

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
// 1. ITEMS (Master)
// ═════════════════════════════════════════════════════════
export const sqliteItems = sqliteTableBase('shranix_items', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  sku: sqliteText('sku').notNull(),
  type: sqliteText('type').notNull().default('product'), // product, service, raw_material, packaging, consumable, asset
  description: sqliteText('description'),
  categoryId: sqliteText('category_id'),
  brandId: sqliteText('brand_id'),
  unitId: sqliteText('unit_id'),
  gstRateId: sqliteText('gst_rate_id'),
  hsnCode: sqliteText('hsn_code'),
  purchaseRate: sqliteReal('purchase_rate').notNull().default(0),
  salesRate: sqliteReal('sales_rate').notNull().default(0),
  mrp: sqliteReal('mrp').notNull().default(0),
  minStock: sqliteReal('min_stock').notNull().default(0),
  maxStock: sqliteReal('max_stock').notNull().default(0),
  reorderLevel: sqliteReal('reorder_level').notNull().default(0),
  openingStock: sqliteReal('opening_stock').notNull().default(0),
  currentStock: sqliteReal('current_stock').notNull().default(0),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  hasBatch: sqliteInteger('has_batch', { mode: 'boolean' }).notNull().default(false),
  hasSerial: sqliteInteger('has_serial', { mode: 'boolean' }).notNull().default(false),
  hasExpiry: sqliteInteger('has_expiry', { mode: 'boolean' }).notNull().default(false),
  isTaxable: sqliteInteger('is_taxable', { mode: 'boolean' }).notNull().default(true),
  taxPreference: sqliteText('tax_preference').notNull().default('taxable'), // taxable, exempt, nil_rated
  weight: sqliteReal('weight'),
  weightUnit: sqliteText('weight_unit'),
  notes: sqliteText('notes'),
}, (table) => ({
  skuIdx: uniqueIndex('items_sku_idx').on(table.sku),
  nameIdx: uniqueIndex('items_name_idx').on(table.name),
}));

export const pgItems = pgTableBase('shranix_items', {
  ...pgBase,
  name: pgText('name').notNull(),
  sku: pgText('sku').notNull(),
  type: pgText('type').notNull().default('product'),
  description: pgText('description'),
  categoryId: pgUuid('category_id'),
  brandId: pgUuid('brand_id'),
  unitId: pgUuid('unit_id'),
  gstRateId: pgUuid('gst_rate_id'),
  hsnCode: pgText('hsn_code'),
  purchaseRate: pgReal('purchase_rate').notNull().default(0),
  salesRate: pgReal('sales_rate').notNull().default(0),
  mrp: pgReal('mrp').notNull().default(0),
  minStock: pgReal('min_stock').notNull().default(0),
  maxStock: pgReal('max_stock').notNull().default(0),
  reorderLevel: pgReal('reorder_level').notNull().default(0),
  openingStock: pgReal('opening_stock').notNull().default(0),
  currentStock: pgReal('current_stock').notNull().default(0),
  isActive: pgBoolean('is_active').notNull().default(true),
  hasBatch: pgBoolean('has_batch').notNull().default(false),
  hasSerial: pgBoolean('has_serial').notNull().default(false),
  hasExpiry: pgBoolean('has_expiry').notNull().default(false),
  isTaxable: pgBoolean('is_taxable').notNull().default(true),
  taxPreference: pgText('tax_preference').notNull().default('taxable'),
  weight: pgReal('weight'),
  weightUnit: pgText('weight_unit'),
  notes: pgText('notes'),
}, (table) => ({
  skuIdx: pgUniqueIndex('items_sku_idx').on(table.sku),
  nameIdx: pgUniqueIndex('items_name_idx').on(table.name),
}));

// ═════════════════════════════════════════════════════════
// 2. ITEM VARIANTS
// ═════════════════════════════════════════════════════════
export const sqliteItemVariants = sqliteTableBase('shranix_item_variants', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  name: sqliteText('name').notNull(),
  sku: sqliteText('sku').notNull(),
  barcode: sqliteText('barcode'),
  purchaseRate: sqliteReal('purchase_rate').notNull().default(0),
  salesRate: sqliteReal('sales_rate').notNull().default(0),
  mrp: sqliteReal('mrp').notNull().default(0),
  stock: sqliteReal('stock').notNull().default(0),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  attributes: sqliteText('attributes'), // JSON: {color: 'red', size: 'L'}
}, (table) => ({
  variantSkuIdx: uniqueIndex('variant_sku_idx').on(table.sku),
}));

export const pgItemVariants = pgTableBase('shranix_item_variants', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  name: pgText('name').notNull(),
  sku: pgText('sku').notNull(),
  barcode: pgText('barcode'),
  purchaseRate: pgReal('purchase_rate').notNull().default(0),
  salesRate: pgReal('sales_rate').notNull().default(0),
  mrp: pgReal('mrp').notNull().default(0),
  stock: pgReal('stock').notNull().default(0),
  isActive: pgBoolean('is_active').notNull().default(true),
  attributes: pgText('attributes'),
}, (table) => ({
  variantSkuIdx: pgUniqueIndex('variant_sku_idx').on(table.sku),
}));

// ═════════════════════════════════════════════════════════
// 3. ITEM GROUPS (Groupings for pricing/discounts)
// ═════════════════════════════════════════════════════════
export const sqliteItemGroups = sqliteTableBase('shranix_item_groups', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  description: sqliteText('description'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  groupNameIdx: uniqueIndex('item_groups_name_idx').on(table.name),
}));

export const pgItemGroups = pgTableBase('shranix_item_groups', {
  ...pgBase,
  name: pgText('name').notNull(),
  description: pgText('description'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({
  groupNameIdx: pgUniqueIndex('item_groups_name_idx').on(table.name),
}));

// Item-Group mapping (M:M)
export const sqliteItemGroupItems = sqliteTableBase('shranix_item_group_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: sqliteText('item_id').notNull(),
  groupId: sqliteText('group_id').notNull(),
}, (table) => ({
  itemGroupIdx: uniqueIndex('item_group_items_idx').on(table.itemId, table.groupId),
}));

export const pgItemGroupItems = pgTableBase('shranix_item_group_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  itemId: pgUuid('item_id').notNull(),
  groupId: pgUuid('group_id').notNull(),
}, (table) => ({
  itemGroupIdx: pgUniqueIndex('item_group_items_idx').on(table.itemId, table.groupId),
}));

// ═════════════════════════════════════════════════════════
// 4. ITEM PRICING (Tiered pricing by party/customer group)
// ═════════════════════════════════════════════════════════
export const sqliteItemPricing = sqliteTableBase('shranix_item_pricing', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  priceList: sqliteText('price_list').notNull().default('standard'), // standard, wholesale, retail, promotional, contract
  purchaseRate: sqliteReal('purchase_rate').notNull().default(0),
  salesRate: sqliteReal('sales_rate').notNull().default(0),
  mrp: sqliteReal('mrp').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  effectiveFrom: sqliteText('effective_from'),
  effectiveTo: sqliteText('effective_to'),
  minQuantity: sqliteReal('min_quantity').notNull().default(1),
  partyId: sqliteText('party_id'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  pricingIdx: uniqueIndex('item_pricing_idx').on(table.itemId, table.priceList, table.partyId),
}));

export const pgItemPricing = pgTableBase('shranix_item_pricing', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  priceList: pgText('price_list').notNull().default('standard'),
  purchaseRate: pgReal('purchase_rate').notNull().default(0),
  salesRate: pgReal('sales_rate').notNull().default(0),
  mrp: pgReal('mrp').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
  effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
  minQuantity: pgReal('min_quantity').notNull().default(1),
  partyId: pgUuid('party_id'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({
  pricingIdx: pgUniqueIndex('item_pricing_idx').on(table.itemId, table.priceList, table.partyId),
}));

// ═════════════════════════════════════════════════════════
// 5. ITEM BARCODES
// ═════════════════════════════════════════════════════════
export const sqliteItemBarcodes = sqliteTableBase('shranix_item_barcodes', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  barcode: sqliteText('barcode').notNull(),
  type: sqliteText('type').notNull().default('ean13'), // ean13, upc, code128, qr, custom
  isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  barcodeIdx: uniqueIndex('item_barcode_idx').on(table.barcode),
}));

export const pgItemBarcodes = pgTableBase('shranix_item_barcodes', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  barcode: pgText('barcode').notNull(),
  type: pgText('type').notNull().default('ean13'),
  isDefault: pgBoolean('is_default').notNull().default(false),
}, (table) => ({
  barcodeIdx: pgUniqueIndex('item_barcode_idx').on(table.barcode),
}));

// ═════════════════════════════════════════════════════════
// 6. HSN/SAC CODES
// ═════════════════════════════════════════════════════════
export const sqliteHsnCodes = sqliteTableBase('shranix_hsn_codes', {
  ...sqliteBase,
  code: sqliteText('code').notNull(),
  description: sqliteText('description'),
  type: sqliteText('type').notNull().default('hsn'), // hsn, sac
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0),
  sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0),
  chapter: sqliteText('chapter'),
  heading: sqliteText('heading'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  hsnCodeIdx: uniqueIndex('hsn_code_idx').on(table.code),
}));

export const pgHsnCodes = pgTableBase('shranix_hsn_codes', {
  ...pgBase,
  code: pgText('code').notNull(),
  description: pgText('description'),
  type: pgText('type').notNull().default('hsn'),
  gstRate: pgReal('gst_rate').notNull().default(0),
  igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0),
  sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0),
  chapter: pgText('chapter'),
  heading: pgText('heading'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({
  hsnCodeIdx: pgUniqueIndex('hsn_code_idx').on(table.code),
}));

// ═════════════════════════════════════════════════════════
// 7. STOCK OPENING (Opening stock entries per warehouse)
// ═════════════════════════════════════════════════════════
export const sqliteStockOpening = sqliteTableBase('shranix_stock_opening', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  warehouseId: sqliteText('warehouse_id'),
  batchNo: sqliteText('batch_no'),
  quantity: sqliteReal('quantity').notNull().default(0),
  rate: sqliteReal('rate').notNull().default(0),
  amount: sqliteReal('amount').notNull().default(0),
  mfgDate: sqliteText('mfg_date'),
  expDate: sqliteText('exp_date'),
  serialNumbers: sqliteText('serial_numbers'), // JSON array
  financialYearId: sqliteText('financial_year_id'),
  isPosted: sqliteInteger('is_posted', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  stockOpeningIdx: uniqueIndex('stock_opening_idx').on(table.itemId, table.warehouseId, table.batchNo),
}));

export const pgStockOpening = pgTableBase('shranix_stock_opening', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  warehouseId: pgUuid('warehouse_id'),
  batchNo: pgText('batch_no'),
  quantity: pgReal('quantity').notNull().default(0),
  rate: pgReal('rate').notNull().default(0),
  amount: pgReal('amount').notNull().default(0),
  mfgDate: pgTimestamp('mfg_date', { withTimezone: true }),
  expDate: pgTimestamp('exp_date', { withTimezone: true }),
  serialNumbers: pgText('serial_numbers'),
  financialYearId: pgUuid('financial_year_id'),
  isPosted: pgBoolean('is_posted').notNull().default(false),
}, (table) => ({
  stockOpeningIdx: pgUniqueIndex('stock_opening_idx').on(table.itemId, table.warehouseId, table.batchNo),
}));

// ═════════════════════════════════════════════════════════
// 8. ITEM IMAGES
// ═════════════════════════════════════════════════════════
export const sqliteItemImages = sqliteTableBase('shranix_item_images', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  url: sqliteText('url').notNull(),
  thumbnailUrl: sqliteText('thumbnail_url'),
  alt: sqliteText('alt'),
  sortOrder: sqliteInteger('sort_order').notNull().default(0),
  isPrimary: sqliteInteger('is_primary', { mode: 'boolean' }).notNull().default(false),
});

export const pgItemImages = pgTableBase('shranix_item_images', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  url: pgText('url').notNull(),
  thumbnailUrl: pgText('thumbnail_url'),
  alt: pgText('alt'),
  sortOrder: pgInteger('sort_order').notNull().default(0),
  isPrimary: pgBoolean('is_primary').notNull().default(false),
});

// ═════════════════════════════════════════════════════════
// 9. INVENTORY SETTINGS
// ═════════════════════════════════════════════════════════
export const sqliteInventorySettings = sqliteTableBase('shranix_inventory_settings', {
  ...sqliteBase,
  companyId: sqliteText('company_id'),
  method: sqliteText('method').notNull().default('fifo'), // fifo, lifo, weighted_average, standard
  negativeStock: sqliteInteger('negative_stock', { mode: 'boolean' }).notNull().default(false),
  autoReorder: sqliteInteger('auto_reorder', { mode: 'boolean' }).notNull().default(false),
  batchTracking: sqliteInteger('batch_tracking', { mode: 'boolean' }).notNull().default(false),
  serialTracking: sqliteInteger('serial_tracking', { mode: 'boolean' }).notNull().default(false),
  expiryTracking: sqliteInteger('expiry_tracking', { mode: 'boolean' }).notNull().default(false),
  defaultWarehouseId: sqliteText('default_warehouse_id'),
  stockValuation: sqliteText('stock_valuation').notNull().default('cost'), // cost, mrp, sales
  roundOff: sqliteInteger('round_off').notNull().default(2),
  enableWarehouse: sqliteInteger('enable_warehouse', { mode: 'boolean' }).notNull().default(true),
  enableBatch: sqliteInteger('enable_batch', { mode: 'boolean' }).notNull().default(false),
  enableSerial: sqliteInteger('enable_serial', { mode: 'boolean' }).notNull().default(false),
  enableExpiry: sqliteInteger('enable_expiry', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  settingsCompanyIdx: uniqueIndex('inv_settings_company_idx').on(table.companyId),
}));

export const pgInventorySettings = pgTableBase('shranix_inventory_settings', {
  ...pgBase,
  companyId: pgUuid('company_id'),
  method: pgText('method').notNull().default('fifo'),
  negativeStock: pgBoolean('negative_stock').notNull().default(false),
  autoReorder: pgBoolean('auto_reorder').notNull().default(false),
  batchTracking: pgBoolean('batch_tracking').notNull().default(false),
  serialTracking: pgBoolean('serial_tracking').notNull().default(false),
  expiryTracking: pgBoolean('expiry_tracking').notNull().default(false),
  defaultWarehouseId: pgUuid('default_warehouse_id'),
  stockValuation: pgText('stock_valuation').notNull().default('cost'),
  roundOff: pgInteger('round_off').notNull().default(2),
  enableWarehouse: pgBoolean('enable_warehouse').notNull().default(true),
  enableBatch: pgBoolean('enable_batch').notNull().default(false),
  enableSerial: pgBoolean('enable_serial').notNull().default(false),
  enableExpiry: pgBoolean('enable_expiry').notNull().default(false),
}, (table) => ({
  settingsCompanyIdx: pgUniqueIndex('inv_settings_company_idx').on(table.companyId),
}));
