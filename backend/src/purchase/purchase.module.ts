import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { InventoryModule } from '../inventory/inventory.module';
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
  PurchasePaymentsController,
} from './controllers';
import { PurchaseDebitNoteService } from './debit-note.service';
import { PurchaseNumberingService } from './purchase-numbering.service';
import { PurchasePaymentsService } from './purchase-payments.service';
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
  PurchaseRequisitionsService,
  PurchaseDashboardService,
  PurchaseReportsService,
  PurchaseSearchService,
  StockPostingService,
} from './services';
import {
  SupplierCategoriesController,
  SupplierDetailsController,
  SupplierGroupsController,
} from './supplier-details.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [WorkflowModule, AutomationModule, InventoryModule],
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
    PurchasePaymentsController,
    SupplierDetailsController,
    SupplierGroupsController,
    SupplierCategoriesController,
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
    PurchasePaymentsService,
    PurchaseNumberingService,
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
    PurchasePaymentsService,
    PurchaseNumberingService,
  ],
})
export class PurchaseModule {}
