import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';

import { ApiKeysController } from './controllers/api-keys.controller';
import { ApiSettingsController } from './controllers/api-settings.controller';
import { ImportExportController } from './controllers/import-export.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { ApiKeysService } from './services/api-keys.service';
import { ApiSettingsService } from './services/api-settings.service';
import { ImportExportService } from './services/import-export.service';
import { WebhooksService } from './services/webhooks.service';

@Module({
  imports: [CommonModule],
  controllers: [
    WebhooksController,
    ApiKeysController,
    ApiSettingsController,
    ImportExportController,
  ],
  providers: [WebhooksService, ApiKeysService, ApiSettingsService, ImportExportService],
  exports: [WebhooksService, ApiKeysService, ApiSettingsService, ImportExportService],
})
export class IntegrationsModule {}
