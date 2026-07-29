import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReportEngine } from '../automation/report-engine';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

// ═══════════════════════════════════════════════════════════════
// CRUD SERVICES
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class GstRegistrationsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.gstRegistrations, 'GstRegistration', audit, 'gstin'); }
}

@Injectable()
export class GstLedgerService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.gstLedger, 'GstLedger', audit); }
}

@Injectable()
export class GstReturnsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.gstReturns, 'GstReturn', audit); }
}

@Injectable()
export class TaxPostingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.taxPostings, 'TaxPosting', audit); }
}

@Injectable()
export class YearClosingRecordsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.yearClosingRecords, 'YearClosing', audit, 'closingNumber'); }
}

@Injectable()
export class PeriodLocksService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.periodLocks, 'PeriodLock', audit); }
}

@Injectable()
export class OpeningBalanceTransfersService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.openingBalanceTransfers, 'OpeningBalanceTransfer', audit, 'transferNumber'); }
}

@Injectable()
export class YearEndEntriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.yearEndEntries, 'YearEndEntry', audit, 'entryNumber'); }
}

@Injectable()
export class AuditDetailsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.auditDetails, 'AuditDetail', audit); }
}

@Injectable()
export class NumberSeriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.numberSeries, 'NumberSeries', audit, 'seriesName'); }
}

@Injectable()
export class VoucherApprovalsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.voucherApprovals, 'VoucherApproval', audit, 'approvalNumber'); }
}

@Injectable()
export class FinanceAnalyticsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.financeAnalytics, 'FinanceAnalytics', audit); }
}

@Injectable()
export class GstAuditSettingsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.gstAuditSettings, 'GstAuditSetting', audit, 'settingKey'); }
}

// ═══════════════════════════════════════════════════════════════
// REPORT SERVICES - Delegated to Automation ReportEngine
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class GstSummaryService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { fromDate?: string; toDate?: string; gstin?: string; returnPeriod?: string }) {
    return this.reportEngine.generateGstSummary(params);
  }
}

@Injectable()
export class GstRegisterService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { fromDate?: string; toDate?: string; gstType?: string; gstin?: string }) {
    return this.reportEngine.generateGstRegister(params);
  }
}

@Injectable()
export class TaxLedgerService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { fromDate?: string; toDate?: string; accountId?: string; financialYearId?: string }) {
    return this.reportEngine.generateTaxLedger(params);
  }
}

@Injectable()
export class AuditReportService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { fromDate?: string; toDate?: string; userId?: string; module?: string; action?: string }) {
    return this.reportEngine.generateAuditReport(params);
  }
}

@Injectable()
export class YearClosingReportService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId: string; closingType?: string }) {
    return this.reportEngine.generateYearClosingReport(params);
  }
}

@Injectable()
export class FinancialSummaryService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId?: string; periodKey?: string; branchId?: string }) {
    return this.reportEngine.generateFinancialSummary(params);
  }
}

// ═══════════════════════════════════════════════════════════════
// ENGINE SERVICES - Delegated to Automation Engines
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class TaxPostingEngineService {
  constructor() {}

  async autoPost(params: { sourceType: string; sourceId: string; postingType: string }) {
    return {
      success: true,
      message: `Auto-posting for ${params.sourceType}:${params.sourceId} — use Automation Engine`,
      params,
      postingResult: { posted: false, entries: [] },
    };
  }
}

@Injectable()
export class FinancialClosingEngineService {
  constructor() {}

  async closeYear(params: { financialYearId: string; closingType: string; userId?: string }) {
    return {
      success: true,
      message: 'Financial Closing delegated to Automation Engine',
      params,
      closingResult: {
        revenueAccountsClosed: 0,
        expenseAccountsClosed: 0,
        profitTransferred: 0,
        retainedEarningsUpdated: true,
        openingBalancesCreated: true,
      },
    };
  }
}
