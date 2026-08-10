import type { DatabaseClient } from '../client/index';
import {
  sqlitePurchaseOrders,
  pgPurchaseOrders,
  sqlitePOItems,
  pgPOItems,
  sqlitePurchaseQuotations,
  pgPurchaseQuotations,
  sqliteGrn,
  pgGrn,
  sqliteGRNItems,
  pgGRNItems,
  sqlitePurchaseInvoices,
  pgPurchaseInvoices,
  sqlitePurchaseReturns,
  pgPurchaseReturns,
  sqliteSupplierPriceList,
  pgSupplierPriceList,
  sqlitePurchaseApprovals,
  pgPurchaseApprovals,
  sqlitePurchaseSettings,
  pgPurchaseSettings,
  sqliteSuppliers,
  pgSuppliers,
  sqliteSupplierAddresses,
  pgSupplierAddresses,
  sqliteSupplierContacts,
  pgSupplierContacts,
  sqliteSupplierDocuments,
  pgSupplierDocuments,
  sqliteSupplierGroups,
  pgSupplierGroups,
  sqliteSupplierCategories,
  pgSupplierCategories,
  sqlitePurchaseRequisitions,
  pgPurchaseRequisitions,
  sqlitePurchaseRequisitionItems,
  pgPurchaseRequisitionItems,
  sqliteStockLedger,
  pgStockLedger,
  sqliteWarehouseStock,
  pgWarehouseStock,
  sqlitePurchaseReturnItems,
  pgPurchaseReturnItems,
} from '../schema/purchase';

import { MasterDataRepository } from './masters.repository';

export class PurchaseOrdersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseOrders, pgPurchaseOrders, db, isPostgres);
  }
}
export class POItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePOItems, pgPOItems, db, isPostgres);
  }
}
export class PurchaseQuotationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseQuotations, pgPurchaseQuotations, db, isPostgres);
  }
}
export class GrnRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteGrn, pgGrn, db, isPostgres);
  }
}
export class GRNItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteGRNItems, pgGRNItems, db, isPostgres);
  }
}
export class PurchaseInvoicesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseInvoices, pgPurchaseInvoices, db, isPostgres);
  }
}
export class PurchaseReturnsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseReturns, pgPurchaseReturns, db, isPostgres);
  }
}
export class PurchaseReturnItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseReturnItems, pgPurchaseReturnItems, db, isPostgres);
  }
}
export class SupplierPriceListRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierPriceList, pgSupplierPriceList, db, isPostgres);
  }
}
export class PurchaseApprovalsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseApprovals, pgPurchaseApprovals, db, isPostgres);
  }
}
export class PurchaseSettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseSettings, pgPurchaseSettings, db, isPostgres);
  }
}
export class SuppliersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSuppliers, pgSuppliers, db, isPostgres);
  }
}
export class SupplierAddressesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierAddresses, pgSupplierAddresses, db, isPostgres);
  }
}
export class SupplierContactsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierContacts, pgSupplierContacts, db, isPostgres);
  }
}
export class SupplierDocumentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierDocuments, pgSupplierDocuments, db, isPostgres);
  }
}
export class SupplierGroupsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierGroups, pgSupplierGroups, db, isPostgres);
  }
}
export class SupplierCategoriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteSupplierCategories, pgSupplierCategories, db, isPostgres);
  }
}
export class PurchaseRequisitionsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseRequisitions, pgPurchaseRequisitions, db, isPostgres);
  }
}
export class PurchaseRequisitionItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqlitePurchaseRequisitionItems, pgPurchaseRequisitionItems, db, isPostgres);
  }
}
export class StockLedgerRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteStockLedger, pgStockLedger, db, isPostgres);
  }
}
export class WarehouseStockRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouseStock, pgWarehouseStock, db, isPostgres);
  }
}
