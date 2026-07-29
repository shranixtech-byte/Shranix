import type { DatabaseClient } from '../client/index';
import { MasterDataRepository } from './masters.repository';
import {
  sqliteItems, pgItems,
  sqliteItemVariants, pgItemVariants,
  sqliteItemGroups, pgItemGroups,
  sqliteItemPricing, pgItemPricing,
  sqliteItemBarcodes, pgItemBarcodes,
  sqliteHsnCodes, pgHsnCodes,
  sqliteStockOpening, pgStockOpening,
  sqliteItemImages, pgItemImages,
  sqliteInventorySettings, pgInventorySettings,
} from '../schema/inventory';

// ═════════════════════════════════════════════════════════
// 1. ITEMS
// ═════════════════════════════════════════════════════════
export class ItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItems, pgItems, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 2. ITEM VARIANTS
// ═════════════════════════════════════════════════════════
export class ItemVariantsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemVariants, pgItemVariants, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 3. ITEM GROUPS
// ═════════════════════════════════════════════════════════
export class ItemGroupsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemGroups, pgItemGroups, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 4. ITEM PRICING
// ═════════════════════════════════════════════════════════
export class ItemPricingRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemPricing, pgItemPricing, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 5. ITEM BARCODES
// ═════════════════════════════════════════════════════════
export class ItemBarcodesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemBarcodes, pgItemBarcodes, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 6. HSN/SAC CODES
// ═════════════════════════════════════════════════════════
export class HsnCodesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteHsnCodes, pgHsnCodes, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 7. STOCK OPENING
// ═════════════════════════════════════════════════════════
export class StockOpeningRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteStockOpening, pgStockOpening, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 8. ITEM IMAGES
// ═════════════════════════════════════════════════════════
export class ItemImagesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemImages, pgItemImages, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 9. INVENTORY SETTINGS
// ═════════════════════════════════════════════════════════
export class InventorySettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteInventorySettings, pgInventorySettings, db, isPostgres);
  }
}
