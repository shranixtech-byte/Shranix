import { Module } from '@nestjs/common';

import { PrinterSettingsController } from './settings.controller';
import { PrinterSettingsService } from './settings.service';

@Module({
  controllers: [PrinterSettingsController],
  providers: [PrinterSettingsService],
  exports: [PrinterSettingsService],
})
export class PrinterModule {}
