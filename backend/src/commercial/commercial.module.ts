import { Module } from '@nestjs/common';

import { AutomationModule } from '../automation/automation.module';
import { DatabaseService } from '../database/database.service';
import { SecurityModule } from '../security/security.module';

import { BillingController } from './controllers/billing.controller';
import { CommercialController } from './controllers/commercial.controller';
import { CouponsController } from './controllers/coupons.controller';
import { PlansController } from './controllers/plans.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { BillingPaymentsService } from './services/billing-payments.service';
import { BillingService } from './services/billing.service';
import { CommercialDashboardService } from './services/commercial-dashboard.service';
import { CommercialReportsService } from './services/commercial-reports.service';
import { CommercialSchedulerService } from './services/commercial-scheduler.service';
import { CommercialSettingsService } from './services/commercial-settings.service';
import { CouponsService } from './services/coupons.service';
import { EntitlementsService } from './services/entitlements.service';
import { PlansService } from './services/plans.service';
import { RemindersService } from './services/reminders.service';
import { SubscriptionsService } from './services/subscriptions.service';

@Module({
  imports: [AutomationModule, SecurityModule],
  controllers: [
    PlansController,
    SubscriptionsController,
    BillingController,
    CouponsController,
    CommercialController,
  ],
  providers: [
    PlansService,
    CouponsService,
    EntitlementsService,
    SubscriptionsService,
    BillingService,
    BillingPaymentsService,
    RemindersService,
    CommercialSettingsService,
    CommercialSchedulerService,
    CommercialDashboardService,
    CommercialReportsService,
    DatabaseService,
  ],
  exports: [
    PlansService,
    CouponsService,
    EntitlementsService,
    SubscriptionsService,
    BillingService,
    BillingPaymentsService,
    RemindersService,
    CommercialSettingsService,
    CommercialSchedulerService,
  ],
})
export class CommercialModule {}
