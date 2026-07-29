import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { AssetCategoriesController } from './controllers/asset-categories.controller';
import { FixedAssetsController } from './controllers/fixed-assets.controller';
import { AssetCategoriesService } from './services/asset-categories.service';
import { FixedAssetsService } from './services/fixed-assets.service';

@Module({
  imports: [CommonModule],
  controllers: [AssetCategoriesController, FixedAssetsController],
  providers: [AssetCategoriesService, FixedAssetsService],
  exports: [AssetCategoriesService, FixedAssetsService],
})
export class FixedAssetsModule {}
