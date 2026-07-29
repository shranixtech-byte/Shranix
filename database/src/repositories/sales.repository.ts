import type { DatabaseClient } from '../client/index';
import { MasterDataRepository } from './masters.repository';
import {
  sqliteSalesQuotations, pgSalesQuotations,
  sqliteQuotationItems, pgQuotationItems,
  sqliteSalesOrders, pgSalesOrders,
  sqliteSalesOrderItems, pgSalesOrderItems,
  sqliteDeliveryChallans, pgDeliveryChallans,
  sqliteChallanItems, pgChallanItems,
  sqliteSalesInvoices, pgSalesInvoices,
  sqliteInvoiceItems, pgInvoiceItems,
  sqliteSalesReturns, pgSalesReturns,
  sqliteReturnItems, pgReturnItems,
  sqliteCustomerPriceList, pgCustomerPriceList,
  sqliteSalesApprovals, pgSalesApprovals,
  sqliteSalesSettings, pgSalesSettings,
} from '../schema/sales';

export class SalesQuotationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesQuotations, pgSalesQuotations, db, isPostgres); }
}
export class QuotationItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteQuotationItems, pgQuotationItems, db, isPostgres); }
}
export class SalesOrdersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesOrders, pgSalesOrders, db, isPostgres); }
}
export class SalesOrderItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesOrderItems, pgSalesOrderItems, db, isPostgres); }
}
export class DeliveryChallansRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteDeliveryChallans, pgDeliveryChallans, db, isPostgres); }
}
export class ChallanItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteChallanItems, pgChallanItems, db, isPostgres); }
}
export class SalesInvoicesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesInvoices, pgSalesInvoices, db, isPostgres); }
}
export class InvoiceItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteInvoiceItems, pgInvoiceItems, db, isPostgres); }
}
export class SalesReturnsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesReturns, pgSalesReturns, db, isPostgres); }
}
export class ReturnItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteReturnItems, pgReturnItems, db, isPostgres); }
}
export class CustomerPriceListRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteCustomerPriceList, pgCustomerPriceList, db, isPostgres); }
}
export class SalesApprovalsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesApprovals, pgSalesApprovals, db, isPostgres); }
}
export class SalesSettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteSalesSettings, pgSalesSettings, db, isPostgres); }
}
