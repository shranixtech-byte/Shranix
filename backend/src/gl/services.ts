import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ReportEngine } from '../automation/report-engine';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { BaseMasterService } from '../masters/base-master.service';

@Injectable()
export class GlEntriesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.glEntries, 'GlEntry', audit, 'entryNumber'); }
}

@Injectable()
export class PostingRulesService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.postingRules, 'PostingRule', audit, 'ruleName'); }
}

@Injectable()
export class FiscalClosingRecordsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.fiscalClosingRecords, 'FiscalClosing', audit); }
}

@Injectable()
export class FinancialSnapshotsService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.financialSnapshots, 'FinancialSnapshot', audit); }
}

@Injectable()
export class ReportCacheService extends BaseMasterService {
  constructor(database: DatabaseService, audit: AuditService) { super(database.reportCache, 'ReportCache', audit); }
}

// ═════════════════════════════════════════════════════════
// REPORT ENGINE SERVICES - Delegated to Automation ReportEngine
// ═════════════════════════════════════════════════════════
@Injectable()
export class TrialBalanceService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId?: string; fromDate?: string; toDate?: string; branchId?: string; costCenterId?: string }) {
    return this.reportEngine.generateTrialBalance(params);
  }
}

@Injectable()
export class ProfitLossService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId?: string; fromDate?: string; toDate?: string; branchId?: string; costCenterId?: string }) {
    return this.reportEngine.generateProfitLoss(params);
  }
}

@Injectable()
export class BalanceSheetService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId?: string; asOnDate?: string; branchId?: string; comparativeYear?: string }) {
    return this.reportEngine.generateBalanceSheet(params);
  }
}

@Injectable()
export class CashFlowService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { financialYearId?: string; fromDate?: string; toDate?: string }) {
    return this.reportEngine.generateCashFlow(params);
  }
}

@Injectable()
export class DayBookService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { date: string; voucherType?: string; branchId?: string }) {
    return this.reportEngine.generateDayBook(params);
  }
}

@Injectable()
export class AccountStatementService {
  constructor(private readonly reportEngine: ReportEngine) {}

  async generate(params: { accountId: string; fromDate?: string; toDate?: string; financialYearId?: string }) {
    return this.reportEngine.generateAccountStatement(params);
  }
}
