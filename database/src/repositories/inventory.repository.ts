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
  sqliteWarehouseZones, pgWarehouseZones,
  sqliteWarehouseRacks, pgWarehouseRacks,
  sqliteWarehouseShelves, pgWarehouseShelves,
  sqliteWarehouseBins, pgWarehouseBins,
  sqliteUOMConversions, pgUOMConversions,
  sqliteProductAttributes, pgProductAttributes,
  sqliteItemPackaging, pgItemPackaging,
  sqliteBatchMaster, pgBatchMaster,
  sqliteBatchLots, pgBatchLots,
  sqliteBatchGenealogy, pgBatchGenealogy,
  sqliteSerialMaster, pgSerialMaster,
  sqliteSerialHistory, pgSerialHistory,
  sqliteSerialWarranty, pgSerialWarranty,
  sqliteSerialInstallation, pgSerialInstallation,
  sqliteSerialService, pgSerialService,
  sqliteSerialRMA, pgSerialRMA,
  sqliteSerialRelationship, pgSerialRelationship,
  sqliteSerialDocument, pgSerialDocument,
  sqliteInvStockLedger, pgInvStockLedger,
  sqliteInvStockBalance, pgInvStockBalance,
  sqliteInvStockReservation, pgInvStockReservation,
  sqliteStockTransfers, pgStockTransfers,
  sqliteTransferItems, pgTransferItems,
  sqliteStockAdjustments, pgStockAdjustments,
  sqliteAdjustmentItems, pgAdjustmentItems,
  sqliteInventorySettings, pgInventorySettings,
} from '../schema/inventory';
import {
  sqlitePhysicalCountHeaders, pgPhysicalCountHeaders,
  sqlitePhysicalCountItems, pgPhysicalCountItems,
} from '../schema/physical-count';

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

// ═════════════════════════════════════════════════════════
// 10. WAREHOUSE ZONES
// ═════════════════════════════════════════════════════════
export class WarehouseZonesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouseZones, pgWarehouseZones, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 11. WAREHOUSE RACKS
// ═════════════════════════════════════════════════════════
export class WarehouseRacksRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouseRacks, pgWarehouseRacks, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 12. WAREHOUSE SHELVES
// ═════════════════════════════════════════════════════════
export class WarehouseShelvesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouseShelves, pgWarehouseShelves, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 14. UOM CONVERSIONS
// ═════════════════════════════════════════════════════════
export class UOMConversionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteUOMConversions, pgUOMConversions, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 15. PRODUCT ATTRIBUTES
// ═════════════════════════════════════════════════════════
export class ProductAttributesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteProductAttributes, pgProductAttributes, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 16. ITEM PACKAGING
// ═════════════════════════════════════════════════════════
export class ItemPackagingRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteItemPackaging, pgItemPackaging, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 13. WAREHOUSE BINS
// ═════════════════════════════════════════════════════════
export class WarehouseBinsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouseBins, pgWarehouseBins, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 17. INVENTORY STOCK LEDGER (Step 20)
// ═════════════════════════════════════════════════════════
export class InvStockLedgerRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteInvStockLedger, pgInvStockLedger, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 18. INVENTORY STOCK BALANCE (Step 20)
// ═════════════════════════════════════════════════════════
export class InvStockBalanceRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteInvStockBalance, pgInvStockBalance, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 19. INVENTORY STOCK RESERVATION (Step 20)
// ═════════════════════════════════════════════════════════
export class InvStockReservationRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteInvStockReservation, pgInvStockReservation, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 29. STOCK TRANSFERS (Step 21 — Enterprise)
// ═════════════════════════════════════════════════════════
export class StockTransfersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteStockTransfers, pgStockTransfers, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 30. TRANSFER ITEMS (Step 21)
// ═════════════════════════════════════════════════════════
export class TransferItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteTransferItems, pgTransferItems, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 18. BATCH MASTER (Step 18)
// ═════════════════════════════════════════════════════════
export class BatchMasterRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBatchMaster, pgBatchMaster, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 19. BATCH LOTS
// ═════════════════════════════════════════════════════════
export class BatchLotRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBatchLots, pgBatchLots, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 21. SERIAL MASTER (Step 19)
// ═════════════════════════════════════════════════════════
export class SerialMasterRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialMaster, pgSerialMaster, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 22. SERIAL HISTORY
// ═════════════════════════════════════════════════════════
export class SerialHistoryRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialHistory, pgSerialHistory, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 23. SERIAL WARRANTY
// ═════════════════════════════════════════════════════════
export class SerialWarrantyRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialWarranty, pgSerialWarranty, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 24. SERIAL INSTALLATION
// ═════════════════════════════════════════════════════════
export class SerialInstallationRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialInstallation, pgSerialInstallation, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 25. SERIAL SERVICE
// ═════════════════════════════════════════════════════════
export class SerialServiceRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialService, pgSerialService, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 26. SERIAL RMA
// ═════════════════════════════════════════════════════════
export class SerialRMARepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialRMA, pgSerialRMA, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 27. SERIAL RELATIONSHIP
// ═════════════════════════════════════════════════════════
export class SerialRelationshipRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialRelationship, pgSerialRelationship, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 28. SERIAL DOCUMENTS
// ═════════════════════════════════════════════════════════
export class SerialDocumentRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSerialDocument, pgSerialDocument, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 31. STOCK ADJUSTMENTS (Step 22 — Enterprise)
// ═════════════════════════════════════════════════════════
export class StockAdjustmentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteStockAdjustments, pgStockAdjustments, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 32. ADJUSTMENT ITEMS (Step 22)
// ═════════════════════════════════════════════════════════
export class AdjustmentItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAdjustmentItems, pgAdjustmentItems, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 33. PHYSICAL COUNT HEADERS (Step 23)
// ═════════════════════════════════════════════════════════
export class PhysicalCountHeadersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePhysicalCountHeaders, pgPhysicalCountHeaders, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 34. PHYSICAL COUNT ITEMS (Step 23)
// ═════════════════════════════════════════════════════════
export class PhysicalCountItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePhysicalCountItems, pgPhysicalCountItems, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 20. BATCH GENEALOGY
// ═════════════════════════════════════════════════════════
export class BatchGenealogyRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBatchGenealogy, pgBatchGenealogy, db, isPostgres);
  }
}
