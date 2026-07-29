import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { MastersModule } from '../masters/masters.module';
import { WorkflowModule } from '../workflow/workflow.module';

import {
  GstRegistrationsController,
  GstLedgerController,
  GstReturnsController,
  TaxPostingsController,
  YearClosingController,
  PeriodLocksController,
  OpeningBalanceTransfersController,
  YearEndEntriesController,
  AuditDetailsController,
  NumberSeriesController,
  VoucherApprovalsController,
  FinanceAnalyticsController,
  GstAuditSettingsController,
  GstReportsController,
  GstEngineController,
} from './controllers';
import {
  GstRegistrationsService,
  GstLedgerService,
  GstReturnsService,
  TaxPostingsService,
  YearClosingRecordsService,
  PeriodLocksService,
  OpeningBalanceTransfersService,
  YearEndEntriesService,
  AuditDetailsService,
  NumberSeriesService,
  VoucherApprovalsService,
  FinanceAnalyticsService,
  GstAuditSettingsService,
  GstSummaryService,
  GstRegisterService,
  TaxLedgerService,
  AuditReportService,
  YearClosingReportService,
  FinancialSummaryService,
  TaxPostingEngineService,
  FinancialClosingEngineService,
} from './services';


const services = [
  GstRegistrationsService,
  GstLedgerService,
  GstReturnsService,
  TaxPostingsService,
  YearClosingRecordsService,
  PeriodLocksService,
  OpeningBalanceTransfersService,
  YearEndEntriesService,
  AuditDetailsService,
  NumberSeriesService,
  VoucherApprovalsService,
  FinanceAnalyticsService,
  GstAuditSettingsService,
  GstSummaryService,
  GstRegisterService,
  TaxLedgerService,
  AuditReportService,
  YearClosingReportService,
  FinancialSummaryService,
  TaxPostingEngineService,
  FinancialClosingEngineService,
];

const controllers = [
  GstRegistrationsController,
  GstLedgerController,
  GstReturnsController,
  TaxPostingsController,
  YearClosingController,
  PeriodLocksController,
  OpeningBalanceTransfersController,
  YearEndEntriesController,
  AuditDetailsController,
  NumberSeriesController,
  VoucherApprovalsController,
  FinanceAnalyticsController,
  GstAuditSettingsController,
  GstReportsController,
  GstEngineController,
];

@Module({
  imports: [MastersModule, AutomationModule, WorkflowModule],
  controllers,
  providers: services,
  exports: services,
})
export class GstAuditModule {}
