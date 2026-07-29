import { Module } from '@nestjs/common';

import { WorkflowModule } from '../workflow/workflow.module';

import {
  ItemsController, ItemVariantsController, ItemGroupsController,
  ItemPricingController, ItemBarcodesController, HsnCodesController,
  StockOpeningController, ItemImagesController, InventorySettingsController,
  BatchStockController, StockMovementController, WarehouseLocationController,
  DamageRegisterController, RecallRegisterController, DistributorReturnController,
  ReplacementQueueController, SubCategoriesController, StockLedgerController,
  StockTransferController, WarehouseDashboardController, WarehouseStockController, WarehouseSearchController,
} from './controllers';
import {
  ItemsService, ItemVariantsService, ItemGroupsService,
  ItemPricingService, ItemBarcodesService, HsnCodesService,
  StockOpeningService, ItemImagesService, InventorySettingsService,
  BatchStockService, StockMovementService, WarehouseLocationService,
  DamageRegisterService, RecallRegisterService, DistributorReturnService,
  ReplacementQueueService, SubCategoriesService, StockLedgerService,
  StockTransferService, WarehouseService,
} from './services';

@Module({
  imports: [WorkflowModule],
  controllers: [
    ItemsController, ItemVariantsController, ItemGroupsController,
    ItemPricingController, ItemBarcodesController, HsnCodesController,
    StockOpeningController, ItemImagesController, InventorySettingsController,
    BatchStockController, StockMovementController, WarehouseLocationController,
    DamageRegisterController, RecallRegisterController, DistributorReturnController,
    ReplacementQueueController, SubCategoriesController, StockLedgerController,
    StockTransferController, WarehouseDashboardController, WarehouseStockController,
    WarehouseSearchController,
  ],
  providers: [
    ItemsService, ItemVariantsService, ItemGroupsService,
    ItemPricingService, ItemBarcodesService, HsnCodesService,
    StockOpeningService, ItemImagesService, InventorySettingsService,
    BatchStockService, StockMovementService, WarehouseLocationService,
    DamageRegisterService, RecallRegisterService, DistributorReturnService,
    ReplacementQueueService, SubCategoriesService, StockLedgerService,
    StockTransferService, WarehouseService,
  ],
  exports: [
    ItemsService, ItemVariantsService, ItemGroupsService,
    ItemPricingService, ItemBarcodesService, HsnCodesService,
    StockOpeningService, ItemImagesService, InventorySettingsService,
    BatchStockService, StockMovementService, WarehouseLocationService,
    DamageRegisterService, RecallRegisterService, DistributorReturnService,
    ReplacementQueueService, SubCategoriesService, StockLedgerService,
    StockTransferService, WarehouseService,
  ],
})
export class InventoryModule {}
