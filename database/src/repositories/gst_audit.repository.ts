import type { DatabaseClient } from '../client/index';
import { MasterDataRepository } from './masters.repository';
import {
  sqliteGstRegistrations, pgGstRegistrations,
  sqliteGstLedger, pgGstLedger,
  sqliteGstReturns, pgGstReturns,
  sqliteTaxPostings, pgTaxPostings,
  sqliteYearClosingRecords, pgYearClosingRecords,
  sqlitePeriodLocks, pgPeriodLocks,
  sqliteOpeningBalanceTransfers, pgOpeningBalanceTransfers,
  sqliteYearEndEntries, pgYearEndEntries,
  sqliteAuditDetails, pgAuditDetails,
  sqliteNumberSeries, pgNumberSeries,
  sqliteVoucherApprovals, pgVoucherApprovals,
  sqliteFinanceAnalytics, pgFinanceAnalytics,
  sqliteGstAuditSettings, pgGstAuditSettings,
} from '../schema/gst_audit';

export class GstRegistrationsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteGstRegistrations, pgGstRegistrations, db, isPostgres); }
}
export class GstLedgerRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteGstLedger, pgGstLedger, db, isPostgres); }
}
export class GstReturnsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteGstReturns, pgGstReturns, db, isPostgres); }
}
export class TaxPostingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteTaxPostings, pgTaxPostings, db, isPostgres); }
}
export class YearClosingRecordsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteYearClosingRecords, pgYearClosingRecords, db, isPostgres); }
}
export class PeriodLocksRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqlitePeriodLocks, pgPeriodLocks, db, isPostgres); }
}
export class OpeningBalanceTransfersRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteOpeningBalanceTransfers, pgOpeningBalanceTransfers, db, isPostgres); }
}
export class YearEndEntriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteYearEndEntries, pgYearEndEntries, db, isPostgres); }
}
export class AuditDetailsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteAuditDetails, pgAuditDetails, db, isPostgres); }
}
export class NumberSeriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteNumberSeries, pgNumberSeries, db, isPostgres); }
}
export class VoucherApprovalsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteVoucherApprovals, pgVoucherApprovals, db, isPostgres); }
}
export class FinanceAnalyticsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteFinanceAnalytics, pgFinanceAnalytics, db, isPostgres); }
}
export class GstAuditSettingsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) { super(sqliteGstAuditSettings, pgGstAuditSettings, db, isPostgres); }
}
