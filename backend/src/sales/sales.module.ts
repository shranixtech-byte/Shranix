import { Module, forwardRef } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { AutomationModule } from '../automation/automation.module';

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
import { SalesReportsController } from './reports.controller';
import { SalesApprovalController } from './approval.controller';
import { SalesCreditController } from './credit.controller';
import { SalesReturnEngineController } from './return.controller';
import { CustomersController } from './customers.controller';
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
import { CustomersService } from './customers.service';
import { SalesReportsService } from './reports.service';
import { SalesApprovalEngineService } from './approval-engine.service';
import { SalesCreditEngineService } from './credit-engine.service';
import { SalesReturnEngineService } from './return-engine.service';
import { PostingEngineService } from './posting-engine.service';

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
  ],
})
export class SalesModule {}
