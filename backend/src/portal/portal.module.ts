import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { AuditService } from '../common/services/audit.service';
import { CommunicationModule } from '../communication/communication.module';
import { DatabaseService } from '../database/database.service';
import { LicenseModule } from '../license/license.module';
import { PdfModule } from '../pdf/pdf.module';
import { SalesPaymentCollectionService } from '../sales/payment-collection.service';

import { PortalAdminController } from './controllers/portal-admin.controller';
import { PortalAuthController } from './controllers/portal-auth.controller';
import { PortalBillingController } from './controllers/portal-billing.controller';
import { PortalLicenseController } from './controllers/portal-license.controller';
import { PortalPaymentsController } from './controllers/portal-payments.controller';
import { PortalTicketsController } from './controllers/portal-tickets.controller';
import { PortalController } from './controllers/portal.controller';
import { PortalAdminService } from './services/portal-admin.service';
import { PortalAuthService } from './services/portal-auth.service';
import { PortalBillingService } from './services/portal-billing.service';
import { PortalLicenseService } from './services/portal-license.service';
import { PortalPaymentsService } from './services/portal-payments.service';
import { PortalTicketsService } from './services/portal-tickets.service';
import { PortalService } from './services/portal.service';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';

@Module({
  imports: [AuthModule, CommunicationModule, PdfModule, CommercialModule, LicenseModule],
  controllers: [
    PortalAuthController,
    PortalController,
    PortalTicketsController,
    PortalPaymentsController,
    PortalAdminController,
    PortalBillingController,
    PortalLicenseController,
  ],
  providers: [
    PortalJwtStrategy,
    PortalAuthService,
    PortalService,
    PortalTicketsService,
    PortalPaymentsService,
    PortalAdminService,
    PortalBillingService,
    PortalLicenseService,
    // Reused from Phase-4/Finance — provided locally (deps: DatabaseService + AuditService)
    SalesPaymentCollectionService,
    DatabaseService,
    AuditService,
  ],
  exports: [
    PortalAuthService,
    PortalService,
    PortalTicketsService,
    PortalPaymentsService,
    PortalAdminService,
    PortalBillingService,
    PortalLicenseService,
  ],
})
export class PortalModule {}
