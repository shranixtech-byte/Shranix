import { Module } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';
import { NotificationSettingsService } from '../notifications/settings.service';

import { CommunicationSchedulerService } from './communication-scheduler.service';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { ChannelProviderService } from './providers.service';
import { ReminderEngineService } from './reminder-engine.service';
import { CommunicationSettingsService } from './settings.service';
import { TemplateEngineService } from './template-engine.service';
import { CommunicationTemplatesController } from './templates.controller';

@Module({
  controllers: [CommunicationController, CommunicationTemplatesController],
  providers: [
    DatabaseService,
    AuditService,
    CommunicationSettingsService,
    NotificationSettingsService,
    TemplateEngineService,
    ChannelProviderService,
    CommunicationService,
    ReminderEngineService,
    CommunicationSchedulerService,
  ],
  exports: [CommunicationService, TemplateEngineService, ReminderEngineService],
})
export class CommunicationModule {}
