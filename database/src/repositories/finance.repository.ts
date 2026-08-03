import type { DatabaseClient } from '../client/index';
import {
  sqliteAccountGroups,
  pgAccountGroups,
  sqliteChartOfAccounts,
  pgChartOfAccounts,
  sqliteLedgerMaster,
  pgLedgerMaster,
  sqliteJournalEntries,
  pgJournalEntries,
  sqliteJournalEntryItems,
  pgJournalEntryItems,
  sqliteCashBook,
  pgCashBook,
  sqliteBankBook,
  pgBankBook,
  sqliteBankAccounts,
  pgBankAccounts,
  sqliteCostCenters,
  pgCostCenters,
  sqliteAccountingSettings,
  pgAccountingSettings,
} from '../schema/finance';

import { MasterDataRepository } from './masters.repository';

export class AccountGroupsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAccountGroups, pgAccountGroups, db, isPostgres);
  }
}
export class ChartOfAccountsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteChartOfAccounts, pgChartOfAccounts, db, isPostgres);
  }
}
export class LedgerMasterRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteLedgerMaster, pgLedgerMaster, db, isPostgres);
  }
}
export class JournalEntriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteJournalEntries, pgJournalEntries, db, isPostgres);
  }
}
export class JournalEntryItemsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteJournalEntryItems, pgJournalEntryItems, db, isPostgres);
  }
}
export class CashBookRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCashBook, pgCashBook, db, isPostgres);
  }
}
export class BankBookRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBankBook, pgBankBook, db, isPostgres);
  }
}
export class BankAccountsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBankAccounts, pgBankAccounts, db, isPostgres);
  }
}
export class CostCentersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCostCenters, pgCostCenters, db, isPostgres);
  }
}
export class AccountingSettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAccountingSettings, pgAccountingSettings, db, isPostgres);
  }
}
