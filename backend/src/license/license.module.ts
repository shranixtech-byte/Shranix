import { Module } from '@nestjs/common';

import { CommercialModule } from '../commercial/commercial.module';
import { DatabaseService } from '../database/database.service';
import { SecurityModule } from '../security/security.module';

import { LicenseAdminController } from './controllers/license-admin.controller';
import { LicenseActivationsService } from './services/license-activations.service';
import { LicenseDashboardService } from './services/license-dashboard.service';
import { LicenseDevicesService } from './services/license-devices.service';
import { LicenseEventsService } from './services/license-events.service';
import { LicenseReportsService } from './services/license-reports.service';
import { LicenseSchedulerService } from './services/license-scheduler.service';
import { LicenseTokensService } from './services/license-tokens.service';
import { LicenseValidationService } from './services/license-validation.service';
import { LicensesService } from './services/licenses.service';
import { LicenseSettingsController } from './settings.controller';
import { LicenseSettingsService } from './settings.service';

@Module({
  imports: [CommercialModule, SecurityModule],
  controllers: [LicenseSettingsController, LicenseAdminController],
  providers: [
    LicenseSettingsService,
    LicensesService,
    LicenseDevicesService,
    LicenseActivationsService,
    LicenseValidationService,
    LicenseTokensService,
    LicenseEventsService,
    LicenseSchedulerService,
    LicenseDashboardService,
    LicenseReportsService,
    DatabaseService,
  ],
  exports: [
    LicenseSettingsService,
    LicensesService,
    LicenseDevicesService,
    LicenseActivationsService,
    LicenseValidationService,
    LicenseTokensService,
    LicenseEventsService,
    LicenseDashboardService,
    LicenseReportsService,
  ],
})
export class LicenseModule {}
