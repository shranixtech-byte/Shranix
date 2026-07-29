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
