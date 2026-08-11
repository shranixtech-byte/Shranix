import type { DatabaseClient } from '../client/index';
import {
  sqliteAssetCategories,
  pgAssetCategories,
  sqliteAssets,
  pgAssets,
  sqliteAssetAllocations,
  pgAssetAllocations,
  sqliteAssetTransfers,
  pgAssetTransfers,
  sqliteAssetMaintenance,
  pgAssetMaintenance,
  sqliteAssetDepreciation,
  pgAssetDepreciation,
  sqliteAssetConditionHistory,
  pgAssetConditionHistory,
  sqliteAssetDisposals,
  pgAssetDisposals,
  sqliteExpenseCategories,
  pgExpenseCategories,
  sqliteExpenses,
  pgExpenses,
  sqliteRecurringExpenses,
  pgRecurringExpenses,
} from '../schema/assets';

import { MasterDataRepository } from './masters.repository';

export class AssetCategoriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetCategories, pgAssetCategories, db, isPostgres);
  }
}

export class AssetsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssets, pgAssets, db, isPostgres);
  }
}

export class AssetAllocationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetAllocations, pgAssetAllocations, db, isPostgres);
  }
}

export class AssetTransfersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetTransfers, pgAssetTransfers, db, isPostgres);
  }
}

export class AssetMaintenanceRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetMaintenance, pgAssetMaintenance, db, isPostgres);
  }
}

export class AssetDepreciationRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetDepreciation, pgAssetDepreciation, db, isPostgres);
  }
}

export class AssetConditionHistoryRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetConditionHistory, pgAssetConditionHistory, db, isPostgres);
  }
}

export class AssetDisposalsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteAssetDisposals, pgAssetDisposals, db, isPostgres);
  }
}

export class ExpenseCategoriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteExpenseCategories, pgExpenseCategories, db, isPostgres);
  }
}

export class ExpensesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteExpenses, pgExpenses, db, isPostgres);
  }
}

export class RecurringExpensesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteRecurringExpenses, pgRecurringExpenses, db, isPostgres);
  }
}
