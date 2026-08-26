import { Module, forwardRef } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { FinancialClosingEngineService } from '../gst_audit/services';
import { WorkflowModule } from '../workflow/workflow.module';

import {
  PostingEngineController,
  GstEngineController,
  ReportsController,
  IntegrationController,
  SchedulerController,
  AutomationDashboardController,
} from './controllers';
import { FinancialScheduler } from './financial-scheduler';
import { GlPostingEngine } from './gl-posting.engine';
import { GstCalculationEngine } from './gst-calculation.engine';
import {
  SalesFinanceIntegration,
  PurchaseFinanceIntegration,
  InventoryFinanceIntegration,
  PayrollFinanceIntegration,
  ExpenseFinanceIntegration,
  BankFinanceIntegration,
} from './integration-services';
import { ReportEngine } from './report-engine';
import { TransactionManager } from './transaction.manager';

@Module({
  imports: [forwardRef(() => WorkflowModule)],
  controllers: [
    PostingEngineController,
    GstEngineController,
    ReportsController,
    IntegrationController,
    SchedulerController,
    AutomationDashboardController,
  ],
  providers: [
    TransactionManager,
    GlPostingEngine,
    GstCalculationEngine,
    ReportEngine,
    FinancialScheduler,
    SalesFinanceIntegration,
    PurchaseFinanceIntegration,
    InventoryFinanceIntegration,
    PayrollFinanceIntegration,
    ExpenseFinanceIntegration,
    BankFinanceIntegration,
    DatabaseService,
    AuditService,
    FinancialClosingEngineService,
  ],
  exports: [
    TransactionManager,
    GlPostingEngine,
    GstCalculationEngine,
    ReportEngine,
    FinancialScheduler,
    SalesFinanceIntegration,
    PurchaseFinanceIntegration,
    InventoryFinanceIntegration,
    PayrollFinanceIntegration,
    ExpenseFinanceIntegration,
    BankFinanceIntegration,
  ],
})
export class AutomationModule {}
