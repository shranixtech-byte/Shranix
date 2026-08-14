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
// 1. ITEMS (Enterprise Product Master)
// ═════════════════════════════════════════════════════════
export const sqliteItems = sqliteTableBase(
  'shranix_items',
  {
    ...sqliteBase,
    name: sqliteText('name').notNull(),
    shortName: sqliteText('short_name'),
    sku: sqliteText('sku').notNull(),
    type: sqliteText('type').notNull().default('product'), // product, service, raw_material, packaging, consumable, asset, agriculture_product
    status: sqliteText('status').notNull().default('active'), // active, inactive, obsolete, draft
    description: sqliteText('description'),
    categoryId: sqliteText('category_id'),
    brandId: sqliteText('brand_id'),
    manufacturer: sqliteText('manufacturer'),
    manufacturerCode: sqliteText('manufacturer_code'),
    unitId: sqliteText('unit_id'),
    purchaseUnitId: sqliteText('purchase_unit_id'),
    salesUnitId: sqliteText('sales_unit_id'),
    stockUnitId: sqliteText('stock_unit_id'),
    gstRateId: sqliteText('gst_rate_id'),
    hsnCode: sqliteText('hsn_code'),
    purchaseRate: sqliteReal('purchase_rate').notNull().default(0),
    salesRate: sqliteReal('sales_rate').notNull().default(0),
    mrp: sqliteReal('mrp').notNull().default(0),
    minStock: sqliteReal('min_stock').notNull().default(0),
    maxStock: sqliteReal('max_stock').notNull().default(0),
    reorderLevel: sqliteReal('reorder_level').notNull().default(0),
    openingStock: sqliteReal('opening_stock').notNull().default(0),
    openingRate: sqliteReal('opening_rate').notNull().default(0),
    openingValue: sqliteReal('opening_value').notNull().default(0),
    currentStock: sqliteReal('current_stock').notNull().default(0),
    weight: sqliteReal('weight'),
    weightUnit: sqliteText('weight_unit'),
    length: sqliteReal('length'),
    width: sqliteReal('width'),
    height: sqliteReal('height'),
    volume: sqliteReal('volume'),
    volumeUnit: sqliteText('volume_unit'),
    shelfLife: sqliteText('shelf_life'),
    seasonal: sqliteInteger('seasonal', { mode: 'boolean' }).notNull().default(false),
    organic: sqliteInteger('organic', { mode: 'boolean' }).notNull().default(false),
    cropSeason: sqliteText('crop_season'),
    variety: sqliteText('variety'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    hasBatch: sqliteInteger('has_batch', { mode: 'boolean' }).notNull().default(false),
    hasSerial: sqliteInteger('has_serial', { mode: 'boolean' }).notNull().default(false),
    hasExpiry: sqliteInteger('has_expiry', { mode: 'boolean' }).notNull().default(false),
    isTaxable: sqliteInteger('is_taxable', { mode: 'boolean' }).notNull().default(true),
    taxPreference: sqliteText('tax_preference').notNull().default('taxable'), // taxable, exempt, nil_rated
    notes: sqliteText('notes'),
    // ── Product Master (Phase 3.2) — enterprise extensions ──
    productCode: sqliteText('product_code'),
    subCategoryId: sqliteText('sub_category_id'),
    barcode: sqliteText('barcode'),
    qrCode: sqliteText('qr_code'),
    packSize: sqliteText('pack_size'),
    conversionFactor: sqliteReal('conversion_factor').notNull().default(1),
    sacCode: sqliteText('sac_code'),
    wholesalePrice: sqliteReal('wholesale_price').notNull().default(0),
    dealerPrice: sqliteReal('dealer_price').notNull().default(0),
    minSellingPrice: sqliteReal('min_selling_price').notNull().default(0),
    maxDiscountPercent: sqliteReal('max_discount_percent').notNull().default(0),
    preferredSupplierId: sqliteText('preferred_supplier_id'),
    trackInventory: sqliteInteger('track_inventory', { mode: 'boolean' }).notNull().default(true),
    allowNegativeStock: sqliteInteger('allow_negative_stock', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    skuIdx: uniqueIndex('items_sku_idx').on(table.sku),
    nameIdx: uniqueIndex('items_name_idx').on(table.name),
    codeIdx: uniqueIndex('items_code_idx').on(table.productCode),
    barcodeIdx: sqliteIndex('items_barcode_idx').on(table.barcode),
    catIdx: sqliteIndex('items_category_idx').on(table.categoryId),
    subCatIdx: sqliteIndex('items_subcategory_idx').on(table.subCategoryId),
    brandIdx: sqliteIndex('items_brand_idx').on(table.brandId),
    typeIdx: sqliteIndex('items_type_idx').on(table.type),
    statusIdx: sqliteIndex('items_status_idx').on(table.status),
  }),
);

export const pgItems = pgTableBase(
  'shranix_items',
  {
    ...pgBase,
    name: pgText('name').notNull(),
    shortName: pgText('short_name'),
    sku: pgText('sku').notNull(),
    type: pgText('type').notNull().default('product'),
    status: pgText('status').notNull().default('active'),
    description: pgText('description'),
    categoryId: pgUuid('category_id'),
    brandId: pgUuid('brand_id'),
    manufacturer: pgText('manufacturer'),
    manufacturerCode: pgText('manufacturer_code'),
    unitId: pgUuid('unit_id'),
    purchaseUnitId: pgUuid('purchase_unit_id'),
    salesUnitId: pgUuid('sales_unit_id'),
    stockUnitId: pgUuid('stock_unit_id'),
    gstRateId: pgUuid('gst_rate_id'),
    hsnCode: pgText('hsn_code'),
    purchaseRate: pgReal('purchase_rate').notNull().default(0),
    salesRate: pgReal('sales_rate').notNull().default(0),
    mrp: pgReal('mrp').notNull().default(0),
    minStock: pgReal('min_stock').notNull().default(0),
    maxStock: pgReal('max_stock').notNull().default(0),
    reorderLevel: pgReal('reorder_level').notNull().default(0),
    openingStock: pgReal('opening_stock').notNull().default(0),
    openingRate: pgReal('opening_rate').notNull().default(0),
    openingValue: pgReal('opening_value').notNull().default(0),
    currentStock: pgReal('current_stock').notNull().default(0),
    weight: pgReal('weight'),
    weightUnit: pgText('weight_unit'),
    length: pgReal('length'),
    width: pgReal('width'),
    height: pgReal('height'),
    volume: pgReal('volume'),
    volumeUnit: pgText('volume_unit'),
    shelfLife: pgText('shelf_life'),
    seasonal: pgBoolean('seasonal').notNull().default(false),
    organic: pgBoolean('organic').notNull().default(false),
    cropSeason: pgText('crop_season'),
    variety: pgText('variety'),
    isActive: pgBoolean('is_active').notNull().default(true),
    hasBatch: pgBoolean('has_batch').notNull().default(false),
    hasSerial: pgBoolean('has_serial').notNull().default(false),
    hasExpiry: pgBoolean('has_expiry').notNull().default(false),
    isTaxable: pgBoolean('is_taxable').notNull().default(true),
    taxPreference: pgText('tax_preference').notNull().default('taxable'),
    notes: pgText('notes'),
    // ── Product Master (Phase 3.2) — enterprise extensions ──
    productCode: pgText('product_code'),
    subCategoryId: pgUuid('sub_category_id'),
    barcode: pgText('barcode'),
    qrCode: pgText('qr_code'),
    packSize: pgText('pack_size'),
    conversionFactor: pgReal('conversion_factor').notNull().default(1),
    sacCode: pgText('sac_code'),
    wholesalePrice: pgReal('wholesale_price').notNull().default(0),
    dealerPrice: pgReal('dealer_price').notNull().default(0),
    minSellingPrice: pgReal('min_selling_price').notNull().default(0),
    maxDiscountPercent: pgReal('max_discount_percent').notNull().default(0),
    preferredSupplierId: pgUuid('preferred_supplier_id'),
    trackInventory: pgBoolean('track_inventory').notNull().default(true),
    allowNegativeStock: pgBoolean('allow_negative_stock').notNull().default(false),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    skuIdx: pgUniqueIndex('items_sku_idx').on(table.sku),
    nameIdx: pgUniqueIndex('items_name_idx').on(table.name),
    codeIdx: pgUniqueIndex('items_code_idx').on(table.productCode),
    barcodeIdx: pgIndex('items_barcode_idx').on(table.barcode),
    catIdx: pgIndex('items_category_idx').on(table.categoryId),
    subCatIdx: pgIndex('items_subcategory_idx').on(table.subCategoryId),
    brandIdx: pgIndex('items_brand_idx').on(table.brandId),
    typeIdx: pgIndex('items_type_idx').on(table.type),
    statusIdx: pgIndex('items_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// 2. ITEM VARIANTS
// ═════════════════════════════════════════════════════════
export const sqliteItemVariants = sqliteTableBase(
  'shranix_item_variants',
  {
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
  },
  (table) => ({
    variantSkuIdx: uniqueIndex('variant_sku_idx').on(table.sku),
  }),
);

export const pgItemVariants = pgTableBase(
  'shranix_item_variants',
  {
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
  },
  (table) => ({
    variantSkuIdx: pgUniqueIndex('variant_sku_idx').on(table.sku),
  }),
);

// ═════════════════════════════════════════════════════════
// 3. ITEM GROUPS (Groupings for pricing/discounts)
// ═════════════════════════════════════════════════════════
export const sqliteItemGroups = sqliteTableBase(
  'shranix_item_groups',
  {
    ...sqliteBase,
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    groupNameIdx: uniqueIndex('item_groups_name_idx').on(table.name),
  }),
);

export const pgItemGroups = pgTableBase(
  'shranix_item_groups',
  {
    ...pgBase,
    name: pgText('name').notNull(),
    description: pgText('description'),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    groupNameIdx: pgUniqueIndex('item_groups_name_idx').on(table.name),
  }),
);

// Item-Group mapping (M:M)
export const sqliteItemGroupItems = sqliteTableBase(
  'shranix_item_group_items',
  {
    id: sqliteText('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: sqliteText('item_id').notNull(),
    groupId: sqliteText('group_id').notNull(),
  },
  (table) => ({
    itemGroupIdx: uniqueIndex('item_group_items_idx').on(table.itemId, table.groupId),
  }),
);

export const pgItemGroupItems = pgTableBase(
  'shranix_item_group_items',
  {
    id: pgUuid('id').primaryKey().defaultRandom(),
    itemId: pgUuid('item_id').notNull(),
    groupId: pgUuid('group_id').notNull(),
  },
  (table) => ({
    itemGroupIdx: pgUniqueIndex('item_group_items_idx').on(table.itemId, table.groupId),
  }),
);

// ═════════════════════════════════════════════════════════
// 4. ITEM PRICING (Tiered pricing by party/customer group)
// ═════════════════════════════════════════════════════════
export const sqliteItemPricing = sqliteTableBase(
  'shranix_item_pricing',
  {
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
  },
  (table) => ({
    pricingIdx: uniqueIndex('item_pricing_idx').on(table.itemId, table.priceList, table.partyId),
  }),
);

export const pgItemPricing = pgTableBase(
  'shranix_item_pricing',
  {
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
  },
  (table) => ({
    pricingIdx: pgUniqueIndex('item_pricing_idx').on(table.itemId, table.priceList, table.partyId),
  }),
);

// ═════════════════════════════════════════════════════════
// 5. ITEM BARCODES
// ═════════════════════════════════════════════════════════
export const sqliteItemBarcodes = sqliteTableBase(
  'shranix_item_barcodes',
  {
    ...sqliteBase,
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    barcode: sqliteText('barcode').notNull(),
    type: sqliteText('type').notNull().default('ean13'), // ean13, upc, code128, qr, custom
    isDefault: sqliteInteger('is_default', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => ({
    barcodeIdx: uniqueIndex('item_barcode_idx').on(table.barcode),
  }),
);

export const pgItemBarcodes = pgTableBase(
  'shranix_item_barcodes',
  {
    ...pgBase,
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    barcode: pgText('barcode').notNull(),
    type: pgText('type').notNull().default('ean13'),
    isDefault: pgBoolean('is_default').notNull().default(false),
  },
  (table) => ({
    barcodeIdx: pgUniqueIndex('item_barcode_idx').on(table.barcode),
  }),
);

// ═════════════════════════════════════════════════════════
// 6. HSN/SAC CODES
// ═════════════════════════════════════════════════════════
export const sqliteHsnCodes = sqliteTableBase(
  'shranix_hsn_codes',
  {
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
  },
  (table) => ({
    hsnCodeIdx: uniqueIndex('hsn_code_idx').on(table.code),
  }),
);

export const pgHsnCodes = pgTableBase(
  'shranix_hsn_codes',
  {
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
  },
  (table) => ({
    hsnCodeIdx: pgUniqueIndex('hsn_code_idx').on(table.code),
  }),
);

// ═════════════════════════════════════════════════════════
// 7. STOCK OPENING (Opening stock entries per warehouse)
// ═════════════════════════════════════════════════════════
export const sqliteStockOpening = sqliteTableBase(
  'shranix_stock_opening',
  {
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
  },
  (table) => ({
    stockOpeningIdx: uniqueIndex('stock_opening_idx').on(
      table.itemId,
      table.warehouseId,
      table.batchNo,
    ),
  }),
);

export const pgStockOpening = pgTableBase(
  'shranix_stock_opening',
  {
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
  },
  (table) => ({
    stockOpeningIdx: pgUniqueIndex('stock_opening_idx').on(
      table.itemId,
      table.warehouseId,
      table.batchNo,
    ),
  }),
);

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
// 10. WAREHOUSE ZONES
// ═════════════════════════════════════════════════════════
export const sqliteWarehouseZones = sqliteTableBase(
  'shranix_warehouse_zones',
  {
    ...sqliteBase,
    warehouseId: sqliteText('warehouse_id').notNull(),
    code: sqliteText('code').notNull(),
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    zoneCodeIdx: uniqueIndex('warehouse_zone_code_idx').on(table.warehouseId, table.code),
  }),
);

export const pgWarehouseZones = pgTableBase(
  'shranix_warehouse_zones',
  {
    ...pgBase,
    warehouseId: pgUuid('warehouse_id').notNull(),
    code: pgText('code').notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    isActive: pgBoolean('is_active').notNull().default(true),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    zoneCodeIdx: pgUniqueIndex('warehouse_zone_code_idx').on(table.warehouseId, table.code),
  }),
);

// ═════════════════════════════════════════════════════════
// 11. WAREHOUSE RACKS
// ═════════════════════════════════════════════════════════
export const sqliteWarehouseRacks = sqliteTableBase(
  'shranix_warehouse_racks',
  {
    ...sqliteBase,
    zoneId: sqliteText('zone_id').notNull(),
    code: sqliteText('code').notNull(),
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    capacity: sqliteReal('capacity'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    rackCodeIdx: uniqueIndex('warehouse_rack_code_idx').on(table.zoneId, table.code),
  }),
);

export const pgWarehouseRacks = pgTableBase(
  'shranix_warehouse_racks',
  {
    ...pgBase,
    zoneId: pgUuid('zone_id').notNull(),
    code: pgText('code').notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    capacity: pgReal('capacity'),
    isActive: pgBoolean('is_active').notNull().default(true),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    rackCodeIdx: pgUniqueIndex('warehouse_rack_code_idx').on(table.zoneId, table.code),
  }),
);

// ═════════════════════════════════════════════════════════
// 12. WAREHOUSE SHELVES
// ═════════════════════════════════════════════════════════
export const sqliteWarehouseShelves = sqliteTableBase(
  'shranix_warehouse_shelves',
  {
    ...sqliteBase,
    rackId: sqliteText('rack_id').notNull(),
    code: sqliteText('code').notNull(),
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    maxWeight: sqliteReal('max_weight'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    shelfCodeIdx: uniqueIndex('warehouse_shelf_code_idx').on(table.rackId, table.code),
  }),
);

export const pgWarehouseShelves = pgTableBase(
  'shranix_warehouse_shelves',
  {
    ...pgBase,
    rackId: pgUuid('rack_id').notNull(),
    code: pgText('code').notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    maxWeight: pgReal('max_weight'),
    isActive: pgBoolean('is_active').notNull().default(true),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    shelfCodeIdx: pgUniqueIndex('warehouse_shelf_code_idx').on(table.rackId, table.code),
  }),
);

// ═════════════════════════════════════════════════════════
// 13. WAREHOUSE BINS
// ═════════════════════════════════════════════════════════
export const sqliteWarehouseBins = sqliteTableBase(
  'shranix_warehouse_bins',
  {
    ...sqliteBase,
    shelfId: sqliteText('shelf_id').notNull(),
    code: sqliteText('code').notNull(),
    name: sqliteText('name'),
    barcode: sqliteText('barcode'),
    capacity: sqliteReal('capacity'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    binCodeIdx: uniqueIndex('warehouse_bin_code_idx').on(table.shelfId, table.code),
  }),
);

export const pgWarehouseBins = pgTableBase(
  'shranix_warehouse_bins',
  {
    ...pgBase,
    shelfId: pgUuid('shelf_id').notNull(),
    code: pgText('code').notNull(),
    name: pgText('name'),
    barcode: pgText('barcode'),
    capacity: pgReal('capacity'),
    isActive: pgBoolean('is_active').notNull().default(true),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    binCodeIdx: pgUniqueIndex('warehouse_bin_code_idx').on(table.shelfId, table.code),
  }),
);

// ═════════════════════════════════════════════════════════
// 14. ENTERPRISE BATCH MASTER (Step 18)
// ═════════════════════════════════════════════════════════
export const sqliteBatchMaster = sqliteTableBase(
  'shranix_batch_master',
  {
    ...sqliteBase,
    batchNo: sqliteText('batch_no').notNull(),
    lotNo: sqliteText('lot_no'),
    itemId: sqliteText('item_id').notNull(),
    warehouseId: sqliteText('warehouse_id'),
    status: sqliteText('status').notNull().default('draft'), // draft, released, quarantine, blocked, expired, consumed, cancelled
    mfgDate: sqliteText('mfg_date'),
    packingDate: sqliteText('packing_date'),
    expDate: sqliteText('exp_date'),
    bestBeforeDate: sqliteText('best_before_date'),
    retestDate: sqliteText('retest_date'),
    countryOfOrigin: sqliteText('country_of_origin').notNull().default('India'),
    manufacturer: sqliteText('manufacturer'),
    supplierBatchNo: sqliteText('supplier_batch_no'),
    internalBatchNo: sqliteText('internal_batch_no'),
    quantity: sqliteReal('quantity').notNull().default(0),
    reservedQuantity: sqliteReal('reserved_quantity').notNull().default(0),
    availableQuantity: sqliteReal('available_quantity').notNull().default(0),
    committedQuantity: sqliteReal('committed_quantity').notNull().default(0),
    purchaseRate: sqliteReal('purchase_rate').notNull().default(0),
    mrp: sqliteReal('mrp').notNull().default(0),
    sellingPrice: sqliteReal('selling_price'),
    // Agriculture fields
    cropSeason: sqliteText('crop_season'),
    seedVariety: sqliteText('seed_variety'),
    farmSource: sqliteText('farm_source'),
    farmerName: sqliteText('farmer_name'),
    harvestDate: sqliteText('harvest_date'),
    packingCenter: sqliteText('packing_center'),
    organic: sqliteInteger('organic', { mode: 'boolean' }).notNull().default(false),
    certificationNumber: sqliteText('certification_number'),
    // Quality
    qualityStatus: sqliteText('quality_status').notNull().default('pending_inspection'), // pending_inspection, sample_collected, lab_tested, released, rejected
    approvedBy: sqliteText('approved_by'),
    rejectedBy: sqliteText('rejected_by'),
    inspectionDate: sqliteText('inspection_date'),
    // Audit
    remarks: sqliteText('remarks'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    batchNoIdx: uniqueIndex('batch_master_no_idx').on(table.batchNo, table.itemId),
    lotNoIdx: uniqueIndex('batch_master_lot_idx').on(table.lotNo),
  }),
);

export const pgBatchMaster = pgTableBase(
  'shranix_batch_master',
  {
    ...pgBase,
    batchNo: pgText('batch_no').notNull(),
    lotNo: pgText('lot_no'),
    itemId: pgUuid('item_id').notNull(),
    warehouseId: pgUuid('warehouse_id'),
    status: pgText('status').notNull().default('draft'),
    mfgDate: pgTimestamp('mfg_date', { withTimezone: true }),
    packingDate: pgTimestamp('packing_date', { withTimezone: true }),
    expDate: pgTimestamp('exp_date', { withTimezone: true }),
    bestBeforeDate: pgTimestamp('best_before_date', { withTimezone: true }),
    retestDate: pgTimestamp('retest_date', { withTimezone: true }),
    countryOfOrigin: pgText('country_of_origin').notNull().default('India'),
    manufacturer: pgText('manufacturer'),
    supplierBatchNo: pgText('supplier_batch_no'),
    internalBatchNo: pgText('internal_batch_no'),
    quantity: pgReal('quantity').notNull().default(0),
    reservedQuantity: pgReal('reserved_quantity').notNull().default(0),
    availableQuantity: pgReal('available_quantity').notNull().default(0),
    committedQuantity: pgReal('committed_quantity').notNull().default(0),
    purchaseRate: pgReal('purchase_rate').notNull().default(0),
    mrp: pgReal('mrp').notNull().default(0),
    sellingPrice: pgReal('selling_price'),
    cropSeason: pgText('crop_season'),
    seedVariety: pgText('seed_variety'),
    farmSource: pgText('farm_source'),
    farmerName: pgText('farmer_name'),
    harvestDate: pgTimestamp('harvest_date', { withTimezone: true }),
    packingCenter: pgText('packing_center'),
    organic: pgBoolean('organic').notNull().default(false),
    certificationNumber: pgText('certification_number'),
    qualityStatus: pgText('quality_status').notNull().default('pending_inspection'),
    approvedBy: pgUuid('approved_by'),
    rejectedBy: pgUuid('rejected_by'),
    inspectionDate: pgTimestamp('inspection_date', { withTimezone: true }),
    remarks: pgText('remarks'),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    batchNoIdx: pgUniqueIndex('batch_master_no_idx').on(table.batchNo, table.itemId),
    lotNoIdx: pgUniqueIndex('batch_master_lot_idx').on(table.lotNo),
  }),
);

// ═════════════════════════════════════════════════════════
// 15. BATCH LOTS (Lot Management)
// ═════════════════════════════════════════════════════════
export const sqliteBatchLots = sqliteTableBase(
  'shranix_batch_lots',
  {
    ...sqliteBase,
    lotCode: sqliteText('lot_code').notNull(),
    lotName: sqliteText('lot_name'),
    batchId: sqliteText('batch_id').notNull(),
    parentLotId: sqliteText('parent_lot_id'),
    status: sqliteText('status').notNull().default('active'), // active, split, merged, consumed, cancelled
    quantity: sqliteReal('quantity').notNull().default(0),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    lotCodeIdx: uniqueIndex('batch_lots_code_idx').on(table.lotCode),
  }),
);

export const pgBatchLots = pgTableBase(
  'shranix_batch_lots',
  {
    ...pgBase,
    lotCode: pgText('lot_code').notNull(),
    lotName: pgText('lot_name'),
    batchId: pgUuid('batch_id').notNull(),
    parentLotId: pgUuid('parent_lot_id'),
    status: pgText('status').notNull().default('active'),
    quantity: pgReal('quantity').notNull().default(0),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    lotCodeIdx: pgUniqueIndex('batch_lots_code_idx').on(table.lotCode),
  }),
);

// ═════════════════════════════════════════════════════════
// 16. BATCH GENEALOGY (Parent → Child relationships)
// ═════════════════════════════════════════════════════════
export const sqliteBatchGenealogy = sqliteTableBase('shranix_batch_genealogy', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  parentBatchId: sqliteText('parent_batch_id').notNull(),
  childBatchId: sqliteText('child_batch_id').notNull(),
  relationshipType: sqliteText('relationship_type').notNull().default('production'), // production, split, merge, transfer
  quantity: sqliteReal('quantity').notNull().default(0),
  notes: sqliteText('notes'),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const pgBatchGenealogy = pgTableBase('shranix_batch_genealogy', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  parentBatchId: pgUuid('parent_batch_id').notNull(),
  childBatchId: pgUuid('child_batch_id').notNull(),
  relationshipType: pgText('relationship_type').notNull().default('production'),
  quantity: pgReal('quantity').notNull().default(0),
  notes: pgText('notes'),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════
// 17. ENTERPRISE SERIAL MASTER (Step 19)
// ═════════════════════════════════════════════════════════
export const sqliteSerialMaster = sqliteTableBase(
  'shranix_serial_master',
  {
    ...sqliteBase,
    serialNo: sqliteText('serial_no').notNull(),
    internalSerialNo: sqliteText('internal_serial_no'),
    manufacturerSerialNo: sqliteText('manufacturer_serial_no'),
    supplierSerialNo: sqliteText('supplier_serial_no'),
    itemId: sqliteText('item_id').notNull(),
    batchId: sqliteText('batch_id'),
    warehouseId: sqliteText('warehouse_id'),
    currentLocation: sqliteText('current_location'),
    status: sqliteText('status').notNull().default('available'), // draft, available, reserved, allocated, issued, installed, returned, repair, service, scrapped, lost, blocked, disposed
    // QR / Barcode
    barcode: sqliteText('barcode'),
    qrCode: sqliteText('qr_code'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    serialNoIdx: uniqueIndex('serial_master_no_idx').on(table.serialNo),
    internalSerialIdx: uniqueIndex('serial_master_internal_idx').on(table.internalSerialNo),
    manufacturerSerialIdx: uniqueIndex('serial_master_manufacturer_idx').on(
      table.manufacturerSerialNo,
    ),
    barcodeIdx: uniqueIndex('serial_master_barcode_idx').on(table.barcode),
  }),
);

export const pgSerialMaster = pgTableBase(
  'shranix_serial_master',
  {
    ...pgBase,
    serialNo: pgText('serial_no').notNull(),
    internalSerialNo: pgText('internal_serial_no'),
    manufacturerSerialNo: pgText('manufacturer_serial_no'),
    supplierSerialNo: pgText('supplier_serial_no'),
    itemId: pgUuid('item_id').notNull(),
    batchId: pgUuid('batch_id'),
    warehouseId: pgUuid('warehouse_id'),
    currentLocation: pgText('current_location'),
    status: pgText('status').notNull().default('available'),
    barcode: pgText('barcode'),
    qrCode: pgText('qr_code'),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    serialNoIdx: pgUniqueIndex('serial_master_no_idx').on(table.serialNo),
    internalSerialIdx: pgUniqueIndex('serial_master_internal_idx').on(table.internalSerialNo),
    manufacturerSerialIdx: pgUniqueIndex('serial_master_manufacturer_idx').on(
      table.manufacturerSerialNo,
    ),
    barcodeIdx: pgUniqueIndex('serial_master_barcode_idx').on(table.barcode),
  }),
);

// ═════════════════════════════════════════════════════════
// 18. SERIAL HISTORY (Full traceability)
// ═════════════════════════════════════════════════════════
export const sqliteSerialHistory = sqliteTableBase('shranix_serial_history', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  serialId: sqliteText('serial_id').notNull(),
  eventType: sqliteText('event_type').notNull(), // purchase, grn, warehouse, transfer, sales, customer, returns, service, repair, replacement, scrap
  referenceType: sqliteText('reference_type'),
  referenceId: sqliteText('reference_id'),
  fromLocation: sqliteText('from_location'),
  toLocation: sqliteText('to_location'),
  remarks: sqliteText('remarks'),
  createdBy: sqliteText('created_by'),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const pgSerialHistory = pgTableBase('shranix_serial_history', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  serialId: pgUuid('serial_id').notNull(),
  eventType: pgText('event_type').notNull(),
  referenceType: pgText('reference_type'),
  referenceId: pgUuid('reference_id'),
  fromLocation: pgText('from_location'),
  toLocation: pgText('to_location'),
  remarks: pgText('remarks'),
  createdBy: pgUuid('created_by'),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════
// 19. SERIAL WARRANTY
// ═════════════════════════════════════════════════════════
export const sqliteSerialWarranty = sqliteTableBase(
  'shranix_serial_warranty',
  {
    ...sqliteBase,
    serialId: sqliteText('serial_id').notNull(),
    warrantyStart: sqliteText('warranty_start'),
    warrantyEnd: sqliteText('warranty_end'),
    warrantyType: sqliteText('warranty_type').notNull().default('manufacturer'), // manufacturer, seller, extended
    warrantyStatus: sqliteText('warranty_status').notNull().default('active'), // active, expired, void
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    warrantySerialIdx: uniqueIndex('serial_warranty_serial_idx').on(table.serialId),
  }),
);

export const pgSerialWarranty = pgTableBase(
  'shranix_serial_warranty',
  {
    ...pgBase,
    serialId: pgUuid('serial_id').notNull(),
    warrantyStart: pgTimestamp('warranty_start', { withTimezone: true }),
    warrantyEnd: pgTimestamp('warranty_end', { withTimezone: true }),
    warrantyType: pgText('warranty_type').notNull().default('manufacturer'),
    warrantyStatus: pgText('warranty_status').notNull().default('active'),
    isActive: pgBoolean('is_active').notNull().default(true),
  },
  (table) => ({
    warrantySerialIdx: pgUniqueIndex('serial_warranty_serial_idx').on(table.serialId),
  }),
);

// ═════════════════════════════════════════════════════════
// 20. SERIAL INSTALLATION
// ═════════════════════════════════════════════════════════
export const sqliteSerialInstallation = sqliteTableBase('shranix_serial_installation', {
  ...sqliteBase,
  serialId: sqliteText('serial_id').notNull(),
  installationDate: sqliteText('installation_date'),
  commissionDate: sqliteText('commission_date'),
  installedBy: sqliteText('installed_by'),
  customerId: sqliteText('customer_id'),
  customerName: sqliteText('customer_name'),
  location: sqliteText('location'),
  technician: sqliteText('technician'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const pgSerialInstallation = pgTableBase('shranix_serial_installation', {
  ...pgBase,
  serialId: pgUuid('serial_id').notNull(),
  installationDate: pgTimestamp('installation_date', { withTimezone: true }),
  commissionDate: pgTimestamp('commission_date', { withTimezone: true }),
  installedBy: pgText('installed_by'),
  customerId: pgUuid('customer_id'),
  customerName: pgText('customer_name'),
  location: pgText('location'),
  technician: pgText('technician'),
  isActive: pgBoolean('is_active').notNull().default(true),
});

// ═════════════════════════════════════════════════════════
// 21. SERIAL SERVICE HISTORY
// ═════════════════════════════════════════════════════════
export const sqliteSerialService = sqliteTableBase('shranix_serial_service', {
  ...sqliteBase,
  serialId: sqliteText('serial_id').notNull(),
  serviceDate: sqliteText('service_date'),
  serviceType: sqliteText('service_type').notNull().default('repair'), // repair, maintenance, amc, inspection
  description: sqliteText('description'),
  technician: sqliteText('technician'),
  sparePartsUsed: sqliteText('spare_parts_used'), // JSON array
  cost: sqliteReal('cost').notNull().default(0),
  remarks: sqliteText('remarks'),
});

export const pgSerialService = pgTableBase('shranix_serial_service', {
  ...pgBase,
  serialId: pgUuid('serial_id').notNull(),
  serviceDate: pgTimestamp('service_date', { withTimezone: true }),
  serviceType: pgText('service_type').notNull().default('repair'),
  description: pgText('description'),
  technician: pgText('technician'),
  sparePartsUsed: pgText('spare_parts_used'),
  cost: pgReal('cost').notNull().default(0),
  remarks: pgText('remarks'),
});

// ═════════════════════════════════════════════════════════
// 22. SERIAL RMA (Return Material Authorization)
// ═════════════════════════════════════════════════════════
export const sqliteSerialRMA = sqliteTableBase(
  'shranix_serial_rma',
  {
    ...sqliteBase,
    serialId: sqliteText('serial_id').notNull(),
    rmaNumber: sqliteText('rma_number').notNull(),
    rmaType: sqliteText('rma_type').notNull().default('repair'), // repair, replace, refund, reject
    rmaStatus: sqliteText('rma_status').notNull().default('pending'), // pending, approved, in_progress, completed, rejected
    reason: sqliteText('reason'),
    customerId: sqliteText('customer_id'),
    approvedBy: sqliteText('approved_by'),
    approvedDate: sqliteText('approved_date'),
    completedDate: sqliteText('completed_date'),
    remarks: sqliteText('remarks'),
  },
  (table) => ({
    rmaNumberIdx: uniqueIndex('serial_rma_number_idx').on(table.rmaNumber),
  }),
);

export const pgSerialRMA = pgTableBase(
  'shranix_serial_rma',
  {
    ...pgBase,
    serialId: pgUuid('serial_id').notNull(),
    rmaNumber: pgText('rma_number').notNull(),
    rmaType: pgText('rma_type').notNull().default('repair'),
    rmaStatus: pgText('rma_status').notNull().default('pending'),
    reason: pgText('reason'),
    customerId: pgUuid('customer_id'),
    approvedBy: pgUuid('approved_by'),
    approvedDate: pgTimestamp('approved_date', { withTimezone: true }),
    completedDate: pgTimestamp('completed_date', { withTimezone: true }),
    remarks: pgText('remarks'),
  },
  (table) => ({
    rmaNumberIdx: pgUniqueIndex('serial_rma_number_idx').on(table.rmaNumber),
  }),
);

// ═════════════════════════════════════════════════════════
// 23. SERIAL RELATIONSHIP (Parent / Child hierarchy)
// ═════════════════════════════════════════════════════════
export const sqliteSerialRelationship = sqliteTableBase('shranix_serial_relationship', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  parentSerialId: sqliteText('parent_serial_id').notNull(),
  childSerialId: sqliteText('child_serial_id').notNull(),
  relationshipType: sqliteText('relationship_type').notNull().default('contains'), // contains, part_of, replaced_by
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const pgSerialRelationship = pgTableBase('shranix_serial_relationship', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  parentSerialId: pgUuid('parent_serial_id').notNull(),
  childSerialId: pgUuid('child_serial_id').notNull(),
  relationshipType: pgText('relationship_type').notNull().default('contains'),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═════════════════════════════════════════════════════════
// 24. SERIAL DOCUMENTS (Attachments)
// ═════════════════════════════════════════════════════════
export const sqliteSerialDocument = sqliteTableBase('shranix_serial_documents', {
  ...sqliteBase,
  serialId: sqliteText('serial_id').notNull(),
  documentType: sqliteText('document_type').notNull(), // invoice, warranty_card, installation_report, service_report, inspection_report, image, pdf
  fileName: sqliteText('file_name'),
  fileUrl: sqliteText('file_url'),
  description: sqliteText('description'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const pgSerialDocument = pgTableBase('shranix_serial_documents', {
  ...pgBase,
  serialId: pgUuid('serial_id').notNull(),
  documentType: pgText('document_type').notNull(),
  fileName: pgText('file_name'),
  fileUrl: pgText('file_url'),
  description: pgText('description'),
  isActive: pgBoolean('is_active').notNull().default(true),
});

// ═════════════════════════════════════════════════════════
// 17. UOM CONVERSIONS
// ═════════════════════════════════════════════════════════
export const sqliteUOMConversions = sqliteTableBase(
  'shranix_uom_conversions',
  {
    ...sqliteBase,
    fromUnitId: sqliteText('from_unit_id').notNull(),
    toUnitId: sqliteText('to_unit_id').notNull(),
    factor: sqliteReal('factor').notNull().default(1),
    bidirectional: sqliteInteger('bidirectional', { mode: 'boolean' }).notNull().default(true),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    itemId: sqliteText('item_id'), // null = global conversion, specific = item-level override
  },
  (table) => ({
    uomConvIdx: uniqueIndex('uom_conversion_idx').on(
      table.fromUnitId,
      table.toUnitId,
      table.itemId,
    ),
  }),
);

export const pgUOMConversions = pgTableBase(
  'shranix_uom_conversions',
  {
    ...pgBase,
    fromUnitId: pgUuid('from_unit_id').notNull(),
    toUnitId: pgUuid('to_unit_id').notNull(),
    factor: pgReal('factor').notNull().default(1),
    bidirectional: pgBoolean('bidirectional').notNull().default(true),
    isActive: pgBoolean('is_active').notNull().default(true),
    itemId: pgUuid('item_id'),
  },
  (table) => ({
    uomConvIdx: pgUniqueIndex('uom_conversion_idx').on(
      table.fromUnitId,
      table.toUnitId,
      table.itemId,
    ),
  }),
);

// ═════════════════════════════════════════════════════════
// 15. PRODUCT ATTRIBUTES (Dynamic Attribute Engine)
// ═════════════════════════════════════════════════════════
export const sqliteProductAttributes = sqliteTableBase(
  'shranix_product_attributes',
  {
    ...sqliteBase,
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    attributeName: sqliteText('attribute_name').notNull(),
    attributeValue: sqliteText('attribute_value').notNull(),
    sortOrder: sqliteInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    attrItemIdx: uniqueIndex('product_attr_item_idx').on(table.itemId, table.attributeName),
  }),
);

export const pgProductAttributes = pgTableBase(
  'shranix_product_attributes',
  {
    ...pgBase,
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    attributeName: pgText('attribute_name').notNull(),
    attributeValue: pgText('attribute_value').notNull(),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    attrItemIdx: pgUniqueIndex('product_attr_item_idx').on(table.itemId, table.attributeName),
  }),
);

// ═════════════════════════════════════════════════════════
// 16. ITEM PACKAGING (Primary / Secondary / Tertiary)
// ═════════════════════════════════════════════════════════
export const sqliteItemPackaging = sqliteTableBase('shranix_item_packaging', {
  ...sqliteBase,
  itemId: sqliteText('item_id').notNull(),
  level: sqliteText('level').notNull().default('primary'), // primary, secondary, tertiary
  name: sqliteText('name').notNull(),
  weight: sqliteReal('weight'),
  weightUnit: sqliteText('weight_unit'),
  length: sqliteReal('length'),
  width: sqliteReal('width'),
  height: sqliteReal('height'),
  volume: sqliteReal('volume'),
  volumeUnit: sqliteText('volume_unit'),
  quantity: sqliteReal('quantity').notNull().default(1), // items per package
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const pgItemPackaging = pgTableBase('shranix_item_packaging', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  level: pgText('level').notNull().default('primary'),
  name: pgText('name').notNull(),
  weight: pgReal('weight'),
  weightUnit: pgText('weight_unit'),
  length: pgReal('length'),
  width: pgReal('width'),
  height: pgReal('height'),
  volume: pgReal('volume'),
  volumeUnit: pgText('volume_unit'),
  quantity: pgReal('quantity').notNull().default(1),
  isActive: pgBoolean('is_active').notNull().default(true),
});

// ═════════════════════════════════════════════════════════
// 9. INVENTORY STOCK LEDGER (Immutable Transaction Record)
// ═════════════════════════════════════════════════════════
export const sqliteInvStockLedger = sqliteTableBase(
  'shranix_inv_stock_ledger',
  {
    id: sqliteText('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: sqliteText('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    entryNumber: sqliteText('entry_number').notNull(),
    transactionNumber: sqliteText('transaction_number'),
    referenceNumber: sqliteText('reference_number'),
    transactionType: sqliteText('transaction_type').notNull(), // opening, purchase_receipt, purchase_return, sales_issue, sales_return, transfer_in, transfer_out, adjustment, production_receipt, production_issue, damage, scrap, cycle_count, reservation, release, reversal
    direction: sqliteText('direction').notNull(), // IN, OUT, TRANSFER, RESERVE, RELEASE, REVERSAL
    transactionDate: sqliteText('transaction_date'),
    postingDate: sqliteText('posting_date'),
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    batchId: sqliteText('batch_id'),
    batchNo: sqliteText('batch_no'),
    lotNo: sqliteText('lot_no'),
    serialNo: sqliteText('serial_no'),
    warehouseId: sqliteText('warehouse_id'),
    zoneId: sqliteText('zone_id'),
    rackId: sqliteText('rack_id'),
    shelfId: sqliteText('shelf_id'),
    binId: sqliteText('bin_id'),
    fromWarehouseId: sqliteText('from_warehouse_id'),
    toWarehouseId: sqliteText('to_warehouse_id'),
    uom: sqliteText('uom'),
    quantity: sqliteReal('quantity').notNull(),
    unitCost: sqliteReal('unit_cost').notNull().default(0),
    amount: sqliteReal('amount').notNull().default(0),
    balanceQuantity: sqliteReal('balance_quantity').notNull().default(0),
    balanceCost: sqliteReal('balance_cost').notNull().default(0),
    reversalRefId: sqliteText('reversal_ref_id'),
    isReversal: sqliteInteger('is_reversal', { mode: 'boolean' }).notNull().default(false),
    documentRef: sqliteText('document_ref'),
    documentType: sqliteText('document_type'),
    remarks: sqliteText('remarks'),
    createdBy: sqliteText('created_by'),
    approvedBy: sqliteText('approved_by'),
  },
  (table) => ({
    ledgerEntryNoIdx: uniqueIndex('inv_ledger_entry_no_idx').on(table.entryNumber),
    ledgerRefIdx: uniqueIndex('inv_ledger_ref_idx').on(table.referenceNumber),
    ledgerItemIdx: sqliteIndex('inv_ledger_item_idx').on(table.itemId),
    ledgerWhItemIdx: sqliteIndex('inv_ledger_wh_item_idx').on(table.warehouseId, table.itemId),
    ledgerDateIdx: sqliteIndex('inv_ledger_date_idx').on(table.transactionDate),
  }),
);

export const pgInvStockLedger = pgTableBase(
  'shranix_inv_stock_ledger',
  {
    id: pgUuid('id').primaryKey().defaultRandom(),
    createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    entryNumber: pgText('entry_number').notNull(),
    transactionNumber: pgText('transaction_number'),
    referenceNumber: pgText('reference_number'),
    transactionType: pgText('transaction_type').notNull(),
    direction: pgText('direction').notNull(),
    transactionDate: pgTimestamp('transaction_date', { withTimezone: true }),
    postingDate: pgTimestamp('posting_date', { withTimezone: true }),
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    batchId: pgUuid('batch_id'),
    batchNo: pgText('batch_no'),
    lotNo: pgText('lot_no'),
    serialNo: pgText('serial_no'),
    warehouseId: pgUuid('warehouse_id'),
    zoneId: pgUuid('zone_id'),
    rackId: pgUuid('rack_id'),
    shelfId: pgUuid('shelf_id'),
    binId: pgUuid('bin_id'),
    fromWarehouseId: pgUuid('from_warehouse_id'),
    toWarehouseId: pgUuid('to_warehouse_id'),
    uom: pgText('uom'),
    quantity: pgReal('quantity').notNull(),
    unitCost: pgReal('unit_cost').notNull().default(0),
    amount: pgReal('amount').notNull().default(0),
    balanceQuantity: pgReal('balance_quantity').notNull().default(0),
    balanceCost: pgReal('balance_cost').notNull().default(0),
    reversalRefId: pgUuid('reversal_ref_id'),
    isReversal: pgBoolean('is_reversal').notNull().default(false),
    documentRef: pgText('document_ref'),
    documentType: pgText('document_type'),
    remarks: pgText('remarks'),
    createdBy: pgUuid('created_by'),
    approvedBy: pgUuid('approved_by'),
  },
  (table) => ({
    ledgerEntryNoIdx: pgUniqueIndex('inv_ledger_entry_no_idx').on(table.entryNumber),
    ledgerRefIdx: pgUniqueIndex('inv_ledger_ref_idx').on(table.referenceNumber),
    ledgerItemIdx: pgIndex('inv_ledger_item_idx').on(table.itemId),
    ledgerWhItemIdx: pgIndex('inv_ledger_wh_item_idx').on(table.warehouseId, table.itemId),
    ledgerDateIdx: pgIndex('inv_ledger_date_idx').on(table.transactionDate),
  }),
);

// ═════════════════════════════════════════════════════════
// 10. INVENTORY STOCK BALANCES (Real-time balances)
// ═════════════════════════════════════════════════════════
export const sqliteInvStockBalance = sqliteTableBase(
  'shranix_inv_stock_balance',
  {
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
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    batchId: sqliteText('batch_id'),
    batchNo: sqliteText('batch_no'),
    warehouseId: sqliteText('warehouse_id').notNull(),
    zoneId: sqliteText('zone_id'),
    rackId: sqliteText('rack_id'),
    onHand: sqliteReal('on_hand').notNull().default(0),
    available: sqliteReal('available').notNull().default(0),
    reserved: sqliteReal('reserved').notNull().default(0),
    committed: sqliteReal('committed').notNull().default(0),
    allocated: sqliteReal('allocated').notNull().default(0),
    damaged: sqliteReal('damaged').notNull().default(0),
    blocked: sqliteReal('blocked').notNull().default(0),
    inTransit: sqliteReal('in_transit').notNull().default(0),
  },
  (table) => ({
    invBalanceIdx: uniqueIndex('inv_stock_balance_idx').on(table.warehouseId, table.itemId),
  }),
);

export const pgInvStockBalance = pgTableBase(
  'shranix_inv_stock_balance',
  {
    ...pgBase,
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    batchId: pgUuid('batch_id'),
    batchNo: pgText('batch_no'),
    warehouseId: pgUuid('warehouse_id').notNull(),
    zoneId: pgUuid('zone_id'),
    rackId: pgUuid('rack_id'),
    onHand: pgReal('on_hand').notNull().default(0),
    available: pgReal('available').notNull().default(0),
    reserved: pgReal('reserved').notNull().default(0),
    committed: pgReal('committed').notNull().default(0),
    allocated: pgReal('allocated').notNull().default(0),
    damaged: pgReal('damaged').notNull().default(0),
    blocked: pgReal('blocked').notNull().default(0),
    inTransit: pgReal('in_transit').notNull().default(0),
  },
  (table) => ({
    invBalanceIdx: pgUniqueIndex('inv_stock_balance_idx').on(table.warehouseId, table.itemId),
  }),
);

// ═════════════════════════════════════════════════════════
// 11. INVENTORY STOCK RESERVATIONS
// ═════════════════════════════════════════════════════════
export const sqliteInvStockReservation = sqliteTableBase(
  'shranix_inv_stock_reservation',
  {
    ...sqliteBase,
    reservationNumber: sqliteText('reservation_number').notNull(),
    itemId: sqliteText('item_id').notNull(),
    batchId: sqliteText('batch_id'),
    warehouseId: sqliteText('warehouse_id').notNull(),
    quantity: sqliteReal('quantity').notNull(),
    status: sqliteText('status').notNull().default('active'), // active, released, allocated, cancelled
    referenceType: sqliteText('reference_type'),
    referenceId: sqliteText('reference_id'),
    expiryDate: sqliteText('expiry_date'),
    createdBy: sqliteText('created_by'),
    releasedBy: sqliteText('released_by'),
    releasedAt: sqliteText('released_at'),
    remarks: sqliteText('remarks'),
  },
  (table) => ({
    reservationNoIdx: uniqueIndex('inv_reservation_no_idx').on(table.reservationNumber),
  }),
);

export const pgInvStockReservation = pgTableBase(
  'shranix_inv_stock_reservation',
  {
    ...pgBase,
    reservationNumber: pgText('reservation_number').notNull(),
    itemId: pgUuid('item_id').notNull(),
    batchId: pgUuid('batch_id'),
    warehouseId: pgUuid('warehouse_id').notNull(),
    quantity: pgReal('quantity').notNull(),
    status: pgText('status').notNull().default('active'),
    referenceType: pgText('reference_type'),
    referenceId: pgUuid('reference_id'),
    expiryDate: pgTimestamp('expiry_date', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
    releasedBy: pgUuid('released_by'),
    releasedAt: pgTimestamp('released_at', { withTimezone: true }),
    remarks: pgText('remarks'),
  },
  (table) => ({
    reservationNoIdx: pgUniqueIndex('inv_reservation_no_idx').on(table.reservationNumber),
  }),
);

// ═════════════════════════════════════════════════════════
// 12. INVENTORY SETTINGS
// ═════════════════════════════════════════════════════════
export const sqliteInventorySettings = sqliteTableBase(
  'shranix_inventory_settings',
  {
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
    // Stock Settings (Settings Hub → Stock) — tracking & automation
    lotTracking: sqliteInteger('lot_tracking', { mode: 'boolean' }).notNull().default(false),
    autoBarcode: sqliteInteger('auto_barcode', { mode: 'boolean' }).notNull().default(false),
    autoSku: sqliteInteger('auto_sku', { mode: 'boolean' }).notNull().default(false),
    lowStockAlert: sqliteInteger('low_stock_alert', { mode: 'boolean' }).notNull().default(true),
    lowStockThreshold: sqliteInteger('low_stock_threshold').notNull().default(5),
    stockReservation: sqliteInteger('stock_reservation', { mode: 'boolean' })
      .notNull()
      .default(true),
  },
  (table) => ({
    settingsCompanyIdx: uniqueIndex('inv_settings_company_idx').on(table.companyId),
  }),
);

export const pgInventorySettings = pgTableBase(
  'shranix_inventory_settings',
  {
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
    lotTracking: pgBoolean('lot_tracking').notNull().default(false),
    autoBarcode: pgBoolean('auto_barcode').notNull().default(false),
    autoSku: pgBoolean('auto_sku').notNull().default(false),
    lowStockAlert: pgBoolean('low_stock_alert').notNull().default(true),
    lowStockThreshold: pgInteger('low_stock_threshold').notNull().default(5),
    stockReservation: pgBoolean('stock_reservation').notNull().default(true),
  },
  (table) => ({
    settingsCompanyIdx: pgUniqueIndex('inv_settings_company_idx').on(table.companyId),
  }),
);

// ═════════════════════════════════════════════════════════
// 25. INVENTORY STOCK TRANSFERS (Step 21 — Enterprise)
// ═════════════════════════════════════════════════════════
export const sqliteStockTransfers = sqliteTableBase(
  'shranix_stock_transfers',
  {
    ...sqliteBase,
    transferNumber: sqliteText('transfer_number').notNull(),
    transferDate: sqliteText('transfer_date'),
    transferType: sqliteText('transfer_type').notNull().default('warehouse'), // warehouse, zone, rack, shelf, bin, cross_warehouse, cross_branch, transit, internal
    priority: sqliteText('priority').notNull().default('normal'), // low, normal, high, urgent
    sourceWarehouseId: sqliteText('source_warehouse_id').notNull(),
    destinationWarehouseId: sqliteText('destination_warehouse_id').notNull(),
    sourceZoneId: sqliteText('source_zone_id'),
    destinationZoneId: sqliteText('destination_zone_id'),
    sourceRackId: sqliteText('source_rack_id'),
    destinationRackId: sqliteText('destination_rack_id'),
    sourceShelfId: sqliteText('source_shelf_id'),
    destinationShelfId: sqliteText('destination_shelf_id'),
    sourceBinId: sqliteText('source_bin_id'),
    destinationBinId: sqliteText('destination_bin_id'),
    status: sqliteText('status').notNull().default('draft'), // draft, pending_approval, approved, in_transit, partially_received, received, rejected, cancelled, closed
    // Approval
    approvalLevel: sqliteText('approval_level'),
    approvedBy: sqliteText('approved_by'),
    approvedDate: sqliteText('approved_date'),
    approvalNotes: sqliteText('approval_notes'),
    // Dispatch / Receive
    dispatchDate: sqliteText('dispatch_date'),
    dispatchedBy: sqliteText('dispatched_by'),
    expectedArrival: sqliteText('expected_arrival'),
    receivedDate: sqliteText('received_date'),
    receivedBy: sqliteText('received_by'),
    // Transit
    transitWarehouseId: sqliteText('transit_warehouse_id'),
    transitNotes: sqliteText('transit_notes'),
    // Audit
    createdBy: sqliteText('created_by'),
    notes: sqliteText('notes'),
  },
  (table) => ({
    transferNoIdx: uniqueIndex('stock_transfer_no_idx').on(table.transferNumber),
  }),
);

export const pgStockTransfers = pgTableBase(
  'shranix_stock_transfers',
  {
    ...pgBase,
    transferNumber: pgText('transfer_number').notNull(),
    transferDate: pgTimestamp('transfer_date', { withTimezone: true }),
    transferType: pgText('transfer_type').notNull().default('warehouse'),
    priority: pgText('priority').notNull().default('normal'),
    sourceWarehouseId: pgUuid('source_warehouse_id').notNull(),
    destinationWarehouseId: pgUuid('destination_warehouse_id').notNull(),
    sourceZoneId: pgUuid('source_zone_id'),
    destinationZoneId: pgUuid('destination_zone_id'),
    sourceRackId: pgUuid('source_rack_id'),
    destinationRackId: pgUuid('destination_rack_id'),
    sourceShelfId: pgUuid('source_shelf_id'),
    destinationShelfId: pgUuid('destination_shelf_id'),
    sourceBinId: pgUuid('source_bin_id'),
    destinationBinId: pgUuid('destination_bin_id'),
    status: pgText('status').notNull().default('draft'),
    approvalLevel: pgText('approval_level'),
    approvedBy: pgUuid('approved_by'),
    approvedDate: pgTimestamp('approved_date', { withTimezone: true }),
    approvalNotes: pgText('approval_notes'),
    dispatchDate: pgTimestamp('dispatch_date', { withTimezone: true }),
    dispatchedBy: pgUuid('dispatched_by'),
    expectedArrival: pgTimestamp('expected_arrival', { withTimezone: true }),
    receivedDate: pgTimestamp('received_date', { withTimezone: true }),
    receivedBy: pgUuid('received_by'),
    transitWarehouseId: pgUuid('transit_warehouse_id'),
    transitNotes: pgText('transit_notes'),
    createdBy: pgUuid('created_by'),
    notes: pgText('notes'),
  },
  (table) => ({
    transferNoIdx: pgUniqueIndex('stock_transfer_no_idx').on(table.transferNumber),
  }),
);

// ═════════════════════════════════════════════════════════
// 27. STOCK ADJUSTMENTS (Step 22 — Enterprise)
// ═════════════════════════════════════════════════════════
export const sqliteStockAdjustments = sqliteTableBase(
  'shranix_stock_adjustments',
  {
    ...sqliteBase,
    adjustmentNumber: sqliteText('adjustment_number').notNull(),
    adjustmentDate: sqliteText('adjustment_date'),
    adjustmentType: sqliteText('adjustment_type').notNull().default('manual_correction'), // positive_adjustment, negative_adjustment, damage, scrap, expiry_write_off, shrinkage, quality_rejection, lost, found, manual_correction, opening_stock_correction, production_variance
    reasonCode: sqliteText('reason_code'),
    warehouseId: sqliteText('warehouse_id').notNull(),
    zoneId: sqliteText('zone_id'),
    rackId: sqliteText('rack_id'),
    shelfId: sqliteText('shelf_id'),
    binId: sqliteText('bin_id'),
    status: sqliteText('status').notNull().default('draft'), // draft, submitted, pending_approval, approved, posted, rejected, cancelled
    // Approval
    approvedBy: sqliteText('approved_by'),
    approvedDate: sqliteText('approved_date'),
    approvalNotes: sqliteText('approval_notes'),
    // Posting
    postedBy: sqliteText('posted_by'),
    postedDate: sqliteText('posted_date'),
    // Reference
    referenceNumber: sqliteText('reference_number'),
    createdBy: sqliteText('created_by'),
    remarks: sqliteText('remarks'),
    // Reversal
    reversalOfId: sqliteText('reversal_of_id'),
    isReversal: sqliteInteger('is_reversal', { mode: 'boolean' }).notNull().default(false),
    reversalReason: sqliteText('reversal_reason'),
  },
  (table) => ({
    adjNoIdx: uniqueIndex('stock_adj_no_idx').on(table.adjustmentNumber),
  }),
);

export const pgStockAdjustments = pgTableBase(
  'shranix_stock_adjustments',
  {
    ...pgBase,
    adjustmentNumber: pgText('adjustment_number').notNull(),
    adjustmentDate: pgTimestamp('adjustment_date', { withTimezone: true }),
    adjustmentType: pgText('adjustment_type').notNull().default('manual_correction'),
    reasonCode: pgText('reason_code'),
    warehouseId: pgUuid('warehouse_id').notNull(),
    zoneId: pgUuid('zone_id'),
    rackId: pgUuid('rack_id'),
    shelfId: pgUuid('shelf_id'),
    binId: pgUuid('bin_id'),
    status: pgText('status').notNull().default('draft'),
    approvedBy: pgUuid('approved_by'),
    approvedDate: pgTimestamp('approved_date', { withTimezone: true }),
    approvalNotes: pgText('approval_notes'),
    postedBy: pgUuid('posted_by'),
    postedDate: pgTimestamp('posted_date', { withTimezone: true }),
    referenceNumber: pgText('reference_number'),
    createdBy: pgUuid('created_by'),
    remarks: pgText('remarks'),
    reversalOfId: pgUuid('reversal_of_id'),
    isReversal: pgBoolean('is_reversal').notNull().default(false),
    reversalReason: pgText('reversal_reason'),
  },
  (table) => ({
    adjNoIdx: pgUniqueIndex('stock_adj_no_idx').on(table.adjustmentNumber),
  }),
);

// ═════════════════════════════════════════════════════════
// 28. ADJUSTMENT ITEMS (Step 22)
// ═════════════════════════════════════════════════════════
export const sqliteAdjustmentItems = sqliteTableBase(
  'shranix_adjustment_items',
  {
    ...sqliteBase,
    adjustmentId: sqliteText('adjustment_id').notNull(),
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    batchId: sqliteText('batch_id'),
    batchNo: sqliteText('batch_no'),
    lotNo: sqliteText('lot_no'),
    serialNo: sqliteText('serial_no'),
    uom: sqliteText('uom'),
    systemQty: sqliteReal('system_qty').notNull().default(0),
    physicalQty: sqliteReal('physical_qty').notNull().default(0),
    adjustmentQty: sqliteReal('adjustment_qty').notNull().default(0),
    unitCost: sqliteReal('unit_cost').notNull().default(0),
    amount: sqliteReal('amount').notNull().default(0),
    reason: sqliteText('reason'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    adjItemIdx: uniqueIndex('adj_item_idx').on(table.adjustmentId, table.itemId, table.batchNo),
  }),
);

export const pgAdjustmentItems = pgTableBase(
  'shranix_adjustment_items',
  {
    ...pgBase,
    adjustmentId: pgUuid('adjustment_id').notNull(),
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    batchId: pgUuid('batch_id'),
    batchNo: pgText('batch_no'),
    lotNo: pgText('lot_no'),
    serialNo: pgText('serial_no'),
    uom: pgText('uom'),
    systemQty: pgReal('system_qty').notNull().default(0),
    physicalQty: pgReal('physical_qty').notNull().default(0),
    adjustmentQty: pgReal('adjustment_qty').notNull().default(0),
    unitCost: pgReal('unit_cost').notNull().default(0),
    amount: pgReal('amount').notNull().default(0),
    reason: pgText('reason'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    adjItemIdx: pgUniqueIndex('adj_item_idx').on(table.adjustmentId, table.itemId, table.batchNo),
  }),
);

// ═════════════════════════════════════════════════════════
// 26. TRANSFER ITEMS (Step 21)
// ═════════════════════════════════════════════════════════
export const sqliteTransferItems = sqliteTableBase(
  'shranix_transfer_items',
  {
    ...sqliteBase,
    transferId: sqliteText('transfer_id').notNull(),
    itemId: sqliteText('item_id').notNull(),
    variantId: sqliteText('variant_id'),
    batchId: sqliteText('batch_id'),
    batchNo: sqliteText('batch_no'),
    lotNo: sqliteText('lot_no'),
    serialNo: sqliteText('serial_no'),
    uom: sqliteText('uom'),
    requestedQty: sqliteReal('requested_qty').notNull().default(0),
    approvedQty: sqliteReal('approved_qty').notNull().default(0),
    transferredQty: sqliteReal('transferred_qty').notNull().default(0),
    receivedQty: sqliteReal('received_qty').notNull().default(0),
    rejectedQty: sqliteReal('rejected_qty').notNull().default(0),
    unitCost: sqliteReal('unit_cost').notNull().default(0),
    remarks: sqliteText('remarks'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    transferItemIdx: uniqueIndex('transfer_item_idx').on(
      table.transferId,
      table.itemId,
      table.batchNo,
    ),
  }),
);

export const pgTransferItems = pgTableBase(
  'shranix_transfer_items',
  {
    ...pgBase,
    transferId: pgUuid('transfer_id').notNull(),
    itemId: pgUuid('item_id').notNull(),
    variantId: pgUuid('variant_id'),
    batchId: pgUuid('batch_id'),
    batchNo: pgText('batch_no'),
    lotNo: pgText('lot_no'),
    serialNo: pgText('serial_no'),
    uom: pgText('uom'),
    requestedQty: pgReal('requested_qty').notNull().default(0),
    approvedQty: pgReal('approved_qty').notNull().default(0),
    transferredQty: pgReal('transferred_qty').notNull().default(0),
    receivedQty: pgReal('received_qty').notNull().default(0),
    rejectedQty: pgReal('rejected_qty').notNull().default(0),
    unitCost: pgReal('unit_cost').notNull().default(0),
    remarks: pgText('remarks'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    transferItemIdx: pgUniqueIndex('transfer_item_idx').on(
      table.transferId,
      table.itemId,
      table.batchNo,
    ),
  }),
);

// ═════════════════════════════════════════════════════════
// 24. PRODUCT DOCUMENTS (Phase 3.2 — images, licenses, certificates)
// ═════════════════════════════════════════════════════════
export const sqliteProductDocuments = sqliteTableBase(
  'shranix_product_documents',
  {
    ...sqliteBase,
    productId: sqliteText('product_id').notNull(),
    docType: sqliteText('doc_type').notNull().default('other'), // product_image, product_doc, license, gst_certificate, other
    fileName: sqliteText('file_name').notNull(),
    fileUrl: sqliteText('file_url'),
    fileSize: sqliteInteger('file_size').notNull().default(0),
    mimeType: sqliteText('mime_type'),
    notes: sqliteText('notes'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    productDocIdx: sqliteIndex('product_doc_product_idx').on(table.productId),
  }),
);

export const pgProductDocuments = pgTableBase(
  'shranix_product_documents',
  {
    ...pgBase,
    productId: pgUuid('product_id').notNull(),
    docType: pgText('doc_type').notNull().default('other'),
    fileName: pgText('file_name').notNull(),
    fileUrl: pgText('file_url'),
    fileSize: pgInteger('file_size').notNull().default(0),
    mimeType: pgText('mime_type'),
    notes: pgText('notes'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    productDocIdx: pgIndex('product_doc_product_idx').on(table.productId),
  }),
);

// ═════════════════════════════════════════════════════════
// 25. PRODUCT PRICE HISTORY (Phase 3.2 — immutable price trail)
// ═════════════════════════════════════════════════════════
export const sqliteProductPriceHistory = sqliteTableBase(
  'shranix_product_price_history',
  {
    ...sqliteBase,
    productId: sqliteText('product_id').notNull(),
    priceType: sqliteText('price_type').notNull(), // mrp, purchase, sales, wholesale, dealer, min_selling
    oldValue: sqliteReal('old_value').notNull().default(0),
    newValue: sqliteReal('new_value').notNull().default(0),
    changedBy: sqliteText('changed_by'),
    changedAt: sqliteText('changed_at'),
    remarks: sqliteText('remarks'),
  },
  (table) => ({
    priceHistoryIdx: sqliteIndex('product_price_history_product_idx').on(table.productId),
  }),
);

export const pgProductPriceHistory = pgTableBase(
  'shranix_product_price_history',
  {
    ...pgBase,
    productId: pgUuid('product_id').notNull(),
    priceType: pgText('price_type').notNull(),
    oldValue: pgReal('old_value').notNull().default(0),
    newValue: pgReal('new_value').notNull().default(0),
    changedBy: pgUuid('changed_by'),
    changedAt: pgTimestamp('changed_at', { withTimezone: true }),
    remarks: pgText('remarks'),
  },
  (table) => ({
    priceHistoryIdx: pgIndex('product_price_history_product_idx').on(table.productId),
  }),
);
