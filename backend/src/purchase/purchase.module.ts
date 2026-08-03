import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { WorkflowModule } from '../workflow/workflow.module';

import {
  PurchaseOrdersController,
  PurchaseQuotationsController,
  GrnController,
  PurchaseInvoicesController,
  PurchaseReturnsController,
  SupplierPriceListController,
  PurchaseApprovalsController,
  PurchaseSettingsController,
  SuppliersController,
  PurchaseRequisitionsController,
  PurchaseDashboardController,
  PurchaseReportsController,
  PurchaseSearchController,
  PurchaseDebitNoteController,
  PurchasePostingController,
} from './controllers';
import { PurchaseDebitNoteService } from './debit-note.service';
import { PurchasePostingEngineService } from './purchase-postings.service';
import {
  PurchaseOrdersService,
  PurchaseQuotationsService,
  GrnService,
  PurchaseInvoicesService,
  PurchaseReturnsService,
  SupplierPriceListService,
  PurchaseApprovalsService,
  PurchaseSettingsService,
  SuppliersService,
  PurchaseRequisitionsService,
  PurchaseDashboardService,
  PurchaseReportsService,
  PurchaseSearchService,
  StockPostingService,
} from './services';

@Module({
  imports: [WorkflowModule, AutomationModule],
  controllers: [
    PurchaseOrdersController,
    PurchaseQuotationsController,
    GrnController,
    PurchaseInvoicesController,
    PurchaseReturnsController,
    SupplierPriceListController,
    PurchaseApprovalsController,
    PurchaseSettingsController,
    SuppliersController,
    PurchaseRequisitionsController,
    PurchaseDashboardController,
    PurchaseReportsController,
    PurchaseSearchController,
    PurchaseDebitNoteController,
    PurchasePostingController,
  ],
  providers: [
    PurchaseOrdersService,
    PurchaseQuotationsService,
    GrnService,
    PurchaseInvoicesService,
    PurchaseReturnsService,
    SupplierPriceListService,
    PurchaseApprovalsService,
    PurchaseSettingsService,
    SuppliersService,
    PurchaseRequisitionsService,
    PurchaseDashboardService,
    PurchaseReportsService,
    PurchaseSearchService,
    StockPostingService,
    { provide: 'STOCK_POSTING_SERVICE', useExisting: StockPostingService },
    PurchasePostingEngineService,
    PurchaseDebitNoteService,
    DatabaseService,
    AuditService,
  ],
  exports: [
    PurchaseOrdersService,
    PurchaseQuotationsService,
    GrnService,
    PurchaseInvoicesService,
    PurchaseReturnsService,
    SupplierPriceListService,
    PurchaseApprovalsService,
    PurchaseSettingsService,
    SuppliersService,
    PurchaseRequisitionsService,
    PurchaseDashboardService,
    PurchaseReportsService,
    PurchaseSearchService,
    StockPostingService,
    PurchasePostingEngineService,
    PurchaseDebitNoteService,
  ],
})
export class PurchaseModule {}
