import { Module } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { WorkflowModule } from '../workflow/workflow.module';

import {
  AccountGroupsController,
  ChartOfAccountsController,
  LedgerMasterController,
  JournalEntriesController,
  CashBookController,
  BankBookController,
  CostCentersController,
  AccountingSettingsController,
} from './controllers';
import {
  AccountGroupsService,
  ChartOfAccountsService,
  LedgerMasterService,
  JournalEntriesService,
  CashBookService,
  BankBookService,
  CostCentersService,
  AccountingSettingsService,
} from './services';

@Module({
  imports: [WorkflowModule],
  controllers: [
    AccountGroupsController,
    ChartOfAccountsController,
    LedgerMasterController,
    JournalEntriesController,
    CashBookController,
    BankBookController,
    CostCentersController,
    AccountingSettingsController,
  ],
  providers: [
    AccountGroupsService,
    ChartOfAccountsService,
    LedgerMasterService,
    JournalEntriesService,
    CashBookService,
    BankBookService,
    CostCentersService,
    AccountingSettingsService,
    DatabaseService,
    AuditService,
  ],
  exports: [
    AccountGroupsService,
    ChartOfAccountsService,
    LedgerMasterService,
    JournalEntriesService,
    CashBookService,
    BankBookService,
    CostCentersService,
    AccountingSettingsService,
  ],
})
export class FinanceModule {}
