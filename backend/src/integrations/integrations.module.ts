import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { ApiKeysController } from './controllers/api-keys.controller';
import { ImportExportController } from './controllers/import-export.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { ApiKeysService } from './services/api-keys.service';
import { ImportExportService } from './services/import-export.service';
import { WebhooksService } from './services/webhooks.service';

@Module({
  imports: [CommonModule],
  controllers: [WebhooksController, ApiKeysController, ImportExportController],
  providers: [WebhooksService, ApiKeysService, ImportExportService],
  exports: [WebhooksService, ApiKeysService, ImportExportService],
})
export class IntegrationsModule {}
