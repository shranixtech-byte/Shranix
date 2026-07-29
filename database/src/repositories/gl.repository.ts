import type { DatabaseClient } from '../client/index';
import { MasterDataRepository } from './masters.repository';
import {
  sqliteGlEntries, pgGlEntries,
  sqliteFinancialSnapshots, pgFinancialSnapshots,
  sqliteReportCache, pgReportCache,
  sqlitePostingRules, pgPostingRules,
  sqliteFiscalClosingRecords, pgFiscalClosingRecords,
} from '../schema/gl';

export class GlEntriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteGlEntries, pgGlEntries, db, isPostgres); }
}
export class FinancialSnapshotsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteFinancialSnapshots, pgFinancialSnapshots, db, isPostgres); }
}
export class ReportCacheRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteReportCache, pgReportCache, db, isPostgres); }
}
export class PostingRulesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqlitePostingRules, pgPostingRules, db, isPostgres); }
}
export class FiscalClosingRecordsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteFiscalClosingRecords, pgFiscalClosingRecords, db, isPostgres); }
}
