import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import {
  GlEntriesController,
  PostingRulesController,
  FiscalClosingController,
  ReportsController,
  FinancialSnapshotsController,
} from './controllers';
import {
  GlEntriesService,
  PostingRulesService,
  FiscalClosingRecordsService,
  TrialBalanceService,
  ProfitLossService,
  BalanceSheetService,
  CashFlowService,
  DayBookService,
  AccountStatementService,
  FinancialSnapshotsService,
  ReportCacheService,
} from './services';

@Module({
  imports: [AutomationModule],
  controllers: [
    GlEntriesController,
    PostingRulesController,
    FiscalClosingController,
    ReportsController,
    FinancialSnapshotsController,
  ],
  providers: [
    GlEntriesService,
    PostingRulesService,
    FiscalClosingRecordsService,
    TrialBalanceService,
    ProfitLossService,
    BalanceSheetService,
    CashFlowService,
    DayBookService,
    AccountStatementService,
    FinancialSnapshotsService,
    ReportCacheService,
    DatabaseService,
    AuditService,
  ],
  exports: [
    GlEntriesService,
    PostingRulesService,
    FiscalClosingRecordsService,
    TrialBalanceService,
    ProfitLossService,
    BalanceSheetService,
    CashFlowService,
    DayBookService,
    AccountStatementService,
  ],
})
export class GlModule {}
