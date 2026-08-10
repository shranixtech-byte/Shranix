import type { DatabaseClient } from '../client/index';
import {
  sqliteCustomers,
  pgCustomers,
  sqliteCustomerAddresses,
  pgCustomerAddresses,
  sqliteCustomerContacts,
  pgCustomerContacts,
  sqliteCustomerDocuments,
  pgCustomerDocuments,
  sqliteCustomerGroups,
  pgCustomerGroups,
  sqliteCustomerCategories,
  pgCustomerCategories,
} from '../schema/customers';

import { MasterDataRepository } from './masters.repository';

// ═════════════════════════════════════════════════════════
// Phase 3 — CUSTOMER MASTER repositories
// (customers.id === shranix_ledger_master.id → 1:1 financial ledger link)
// ═════════════════════════════════════════════════════════
export class CustomersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomers, pgCustomers, db, isPostgres);
  }
}
export class CustomerAddressesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerAddresses, pgCustomerAddresses, db, isPostgres);
  }
}
export class CustomerContactsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerContacts, pgCustomerContacts, db, isPostgres);
  }
}
export class CustomerDocumentsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerDocuments, pgCustomerDocuments, db, isPostgres);
  }
}
export class CustomerGroupsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerGroups, pgCustomerGroups, db, isPostgres);
  }
}
export class CustomerCategoriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCustomerCategories, pgCustomerCategories, db, isPostgres);
  }
}
