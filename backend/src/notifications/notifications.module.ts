import { Module } from '@nestjs/common';

import { NotificationService } from './notification.service';
import { NotificationSettingsController } from './settings.controller';
import { NotificationSettingsService } from './settings.service';

@Module({
  controllers: [NotificationSettingsController],
  providers: [NotificationSettingsService, NotificationService],
  exports: [NotificationSettingsService, NotificationService],
})
export class NotificationsModule {}
