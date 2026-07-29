import { Module, forwardRef } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AutomationModule } from '../automation/automation.module';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

import { ApprovalController } from './controllers/approval.controller';
import { CommentsController } from './controllers/comments.controller';
import { WorkflowDashboardController } from './controllers/dashboard.controller';
import { WorkflowInstancesController } from './controllers/instances.controller';
import { NotificationController } from './controllers/notifications.controller';
import { TasksController } from './controllers/tasks.controller';
import { WorkflowTemplatesController } from './controllers/templates.controller';
import { ApprovalGuard } from './guards/approval.guard';
import { WorkflowAutoStartInterceptor } from './interceptors/workflow-auto-start.interceptor';
import { ApprovalEngineService } from './services/approval-engine.service';
import { ApprovalMatrixService } from './services/approval-matrix.service';
import { CommentsService } from './services/comments.service';
import { EscalationEngineService } from './services/escalation-engine.service';
import { WorkflowInstancesService } from './services/instances.service';
import {
  PurchaseWorkflowIntegration,
  SalesWorkflowIntegration,
  InventoryWorkflowIntegration,
  FinanceWorkflowIntegration,
  GstWorkflowIntegration,
} from './services/module-integration.service';
import { NotificationEngineService } from './services/notification-engine.service';
import { StateMachineService } from './services/state-machine.service';
import { WorkflowTemplatesService } from './services/templates.service';
import { TaskEngineService } from './services/task-engine.service';
import { WorkflowHookService } from './services/workflow-hook.service';
import { WorkflowIntegrationService } from './services/workflow-integration.service';
import { WorkflowModuleBridgeService } from './services/workflow-module-bridge.service';
import { PermissionSeedService } from './services/permission-seed.service';

@Module({
  imports: [forwardRef(() => AutomationModule)],
  controllers: [
    WorkflowTemplatesController,
    WorkflowInstancesController,
    ApprovalController,
    TasksController,
    WorkflowDashboardController,
    CommentsController,
    NotificationController,
  ],
  providers: [
    WorkflowTemplatesService,
    WorkflowInstancesService,
    StateMachineService,
    ApprovalEngineService,
    ApprovalMatrixService,
    TaskEngineService,
    NotificationEngineService,
    EscalationEngineService,
    CommentsService,
    WorkflowIntegrationService,
    WorkflowHookService,
    WorkflowModuleBridgeService,
    PermissionSeedService,
    PurchaseWorkflowIntegration,
    SalesWorkflowIntegration,
    InventoryWorkflowIntegration,
    FinanceWorkflowIntegration,
    GstWorkflowIntegration,
    DatabaseService,
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkflowAutoStartInterceptor,
    },
    WorkflowAutoStartInterceptor,
    ApprovalGuard,
  ],
  exports: [
    WorkflowInstancesService,
    StateMachineService,
    ApprovalEngineService,
    TaskEngineService,
    NotificationEngineService,
    EscalationEngineService,
    WorkflowIntegrationService,
    WorkflowModuleBridgeService,
  ],
})
export class WorkflowModule {}
