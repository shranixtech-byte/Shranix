import { Module } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { LicenseModule } from '../license/license.module';
import { PortalModule } from '../portal/portal.module';

import { ActivationConfigService } from './activation-config.service';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';

@Module({
  imports: [LicenseModule, PortalModule],
  controllers: [ActivationController],
  providers: [ActivationConfigService, ActivationService, DatabaseService],
  exports: [ActivationService, ActivationConfigService],
})
export class ActivationModule {}
