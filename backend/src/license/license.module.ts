import { Module } from '@nestjs/common';

import { LicenseSettingsController } from './settings.controller';
import { LicenseSettingsService } from './settings.service';

@Module({
  controllers: [LicenseSettingsController],
  providers: [LicenseSettingsService],
  exports: [LicenseSettingsService],
})
export class LicenseModule {}
