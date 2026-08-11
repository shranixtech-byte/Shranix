import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { CommonModule } from '../common/common.module';
import { CommunicationModule } from '../communication/communication.module';

import { AssetsController, AssetMaintenanceController } from './controllers/assets.controller';
import { AssetCategoriesController } from './controllers/categories.controller';
import { ExpensesController } from './controllers/expenses.controller';
import { AssetsService } from './services/assets.service';
import { AssetCategoriesService } from './services/categories.service';
import { ExpensesService } from './services/expenses.service';
import { AssetMaintenanceService } from './services/maintenance.service';

@Module({
  imports: [CommonModule, AutomationModule, CommunicationModule],
  controllers: [
    AssetsController,
    AssetMaintenanceController,
    ExpensesController,
    AssetCategoriesController,
  ],
  providers: [AssetsService, AssetMaintenanceService, ExpensesService, AssetCategoriesService],
  exports: [AssetsService, AssetMaintenanceService, ExpensesService, AssetCategoriesService],
})
export class AssetsModule {}
