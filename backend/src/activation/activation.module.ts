import { Module } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { LicenseModule } from '../license/license.module';
import { PortalModule } from '../portal/portal.module';
import { ReleasesModule } from '../releases/releases.module';
import { SecurityModule } from '../security/security.module';

import { ActivationConfigService } from './activation-config.service';
import { ActivationController } from './activation.controller';
import { ActivationService } from './activation.service';

@Module({
  imports: [LicenseModule, PortalModule, SecurityModule, ReleasesModule],
  controllers: [ActivationController],
  providers: [ActivationConfigService, ActivationService, DatabaseService],
  exports: [ActivationService, ActivationConfigService],
})
export class ActivationModule {}
