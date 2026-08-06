import { Module, forwardRef } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { WorkflowModule } from '../workflow/workflow.module';

import { SalesApprovalEngineService } from './approval-engine.service';
import { SalesApprovalController } from './approval.controller';
import {
  SalesQuotationsController,
  SalesOrdersController,
  DeliveryChallansController,
  SalesInvoicesController,
  SalesReturnsController,
  CustomerPriceListController,
  SalesApprovalsController,
  SalesSettingsController,
} from './controllers';
import { DocumentConversionService } from './conversion.service';
import { SalesCreditEngineService } from './credit-engine.service';
import { SalesCreditController } from './credit.controller';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { DocumentNumberingService } from './numbering.service';
import { PostingEngineService } from './posting-engine.service';
import { SalesReportsController } from './reports.controller';
import { SalesReportsService } from './reports.service';
import { SalesReturnEngineService } from './return-engine.service';
import { SalesReturnEngineController } from './return.controller';
import {
  SalesQuotationsService,
  SalesOrdersService,
  DeliveryChallansService,
  SalesInvoicesService,
  SalesReturnsService,
  CustomerPriceListService,
  SalesApprovalsService,
  SalesSettingsService,
} from './services';

@Module({
  imports: [WorkflowModule, forwardRef(() => AutomationModule)],
  controllers: [
    SalesQuotationsController,
    SalesOrdersController,
    DeliveryChallansController,
    SalesInvoicesController,
    SalesReturnsController,
    CustomerPriceListController,
    SalesApprovalsController,
    SalesSettingsController,
    SalesReportsController,
    SalesApprovalController,
    SalesCreditController,
    SalesReturnEngineController,
    CustomersController,
  ],
  providers: [
    SalesQuotationsService,
    SalesOrdersService,
    DeliveryChallansService,
    SalesInvoicesService,
    SalesReturnsService,
    CustomerPriceListService,
    SalesApprovalsService,
    SalesSettingsService,
    CustomersService,
    SalesReportsService,
    SalesApprovalEngineService,
    SalesCreditEngineService,
    SalesReturnEngineService,
    PostingEngineService,
    DocumentNumberingService,
    DocumentConversionService,
    DatabaseService,
    AuditService,
  ],
  exports: [
    SalesQuotationsService,
    SalesOrdersService,
    DeliveryChallansService,
    SalesInvoicesService,
    SalesReturnsService,
    CustomerPriceListService,
    SalesApprovalsService,
    SalesSettingsService,
    PostingEngineService,
    DocumentNumberingService,
    DocumentConversionService,
  ],
})
export class SalesModule {}
