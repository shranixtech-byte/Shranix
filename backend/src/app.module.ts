import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AiModule } from './ai/ai.module';
import { AuditTrailModule } from './audit/audit-trail.module';
import { AuthModule } from './auth/auth.module';
import { AutomationModule } from './automation/automation.module';
import { BackupModule } from './backup/backup.module';
import { CommonModule } from './common/common.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CsrfService } from './common/services/csrf.service';
import { PermissionCacheService } from './common/services/permission-cache.service';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './core/core.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DataManagementModule } from './data-management/data-management.module';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { DmsModule } from './dms/dms.module';
import { FinanceModule } from './finance/finance.module';
import { GlModule } from './gl/gl.module';
import { GstAuditModule } from './gst_audit/gst_audit.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';
import { InventoryModule } from './inventory/inventory.module';
import { LicenseModule } from './license/license.module';
import { LoggerModule } from './logger/logger.module';
import { MastersModule } from './masters/masters.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PdfModule } from './pdf/pdf.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrinterModule } from './printer/printer.module';
import { PurchaseModule } from './purchase/purchase.module';
import { RolesModule } from './roles/roles.module';
import { SalesModule } from './sales/sales.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';
import { WorkflowModule } from './workflow/workflow.module';

const rolesGuardProvider = {
  provide: RolesGuard,
  useFactory: (reflector: Reflector, database: DatabaseService, cache: PermissionCacheService) =>
    new RolesGuard(reflector, database, cache),
  inject: [Reflector, DatabaseService, PermissionCacheService],
};

const permissionsGuardProvider = {
  provide: PermissionsGuard,
  useFactory: (reflector: Reflector, database: DatabaseService, cache: PermissionCacheService) =>
    new PermissionsGuard(reflector, database, cache),
  inject: [Reflector, DatabaseService, PermissionCacheService],
};

@Module({
  imports: [
    AuthModule,
    AuditTrailModule,
    BackupModule,
    CommonModule,
    ConfigModule,
    CoreModule,
    DatabaseModule,
    HealthModule,
    LoggerModule,
    MastersModule,
    InventoryModule,
    LicenseModule,
    IntegrationsModule,
    NotificationsModule,
    PdfModule,
    PrinterModule,
    PurchaseModule,
    SalesModule,
    FinanceModule,
    GlModule,
    GstAuditModule,
    AutomationModule,
    WorkflowModule,
    DmsModule,
    AiModule,
    PermissionsModule,
    RolesModule,
    SharedModule,
    UsersModule,
    DashboardModule,
    DataManagementModule,
  ],
  providers: [
    rolesGuardProvider,
    permissionsGuardProvider,
    CsrfService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
