import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { TransactionManager } from '../../automation/transaction.manager';
import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

import { ApprovalEngineService, type ApprovalActor } from './approval-engine.service';
import { NotificationEngineService } from './notification-engine.service';
import { StateMachineService } from './state-machine.service';
import { TaskEngineService } from './task-engine.service';

export interface StartWorkflowDto {
  templateId: string;
  documentId: string;
  documentType: string;
  documentNumber?: string;
  module: string;
  initiatorId?: string;
  amount?: number;
  departmentId?: string;
  branchId?: string;
  priority?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExecuteActionDto {
  action: string;
  /** Legacy/display-only — NEVER used for authorization. The authenticated actor wins. */
  userId?: string;
  userName?: string;
  /** Legacy/display-only — NEVER used for authorization. Roles come from the server. */
  userRole?: string;
  comment?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/** Server-derived actor for a workflow action. */
export interface WorkflowActor {
  id: string;
  source?: 'user' | 'system';
}

@Injectable()
export class WorkflowInstancesService {
  private readonly logger = new Logger(WorkflowInstancesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly stateMachine: StateMachineService,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly taskEngine: TaskEngineService,
    private readonly notificationEngine: NotificationEngineService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async findAll(
    page = 1,
    pageSize = 50,
    search?: string,
    filter?: { status?: string; module?: string; currentState?: string },
  ) {
    const result = await this.database.workflowInstances.findAll({
      page,
      pageSize,
      search,
      filter,
    } as any);
    // Parse JSON fields
    if (result.data) {
      result.data = result.data.map((r: any) => ({
        ...r,
        variables: typeof r.variables === 'string' ? JSON.parse(r.variables) : r.variables,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      }));
    }
    return result;
  }

  async findById(id: string) {
    const record = await this.database.workflowInstances.findById(id);
    if (!record) {
      throw new NotFoundException(`Workflow instance with id "${id}" not found`);
    }
    return {
      ...record,
      variables:
        typeof (record as any).variables === 'string'
          ? JSON.parse((record as any).variables)
          : (record as any).variables,
      metadata:
        typeof (record as any).metadata === 'string'
          ? JSON.parse((record as any).metadata)
          : (record as any).metadata,
    };
  }

  async findByDocument(documentType: string, documentId: string) {
    // NOTE: `filters` array form — a plain `filter` object is silently ignored
    // and would return an unrelated workflow instance (H2 tenant-isolation fix).
    const result = await this.database.workflowInstances.findAll({
      page: 1,
      pageSize: 10,
      filters: [
        { field: 'documentType', operator: 'eq', value: documentType },
        { field: 'documentId', operator: 'eq', value: documentId },
      ],
    } as any);
    return result.data?.[0] || null;
  }

  async findByAssignee(userId: string, status?: string) {
    const result = await this.database.workflowInstances.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'assignedToId', operator: 'eq', value: userId },
        ...(status ? [{ field: 'status', operator: 'eq', value: status }] : []),
      ],
    } as any);
    return result;
  }

  async startWorkflow(dto: StartWorkflowDto, userId?: string) {
    // Get template
    const template = await this.database.workflowTemplates.findById(dto.templateId);
    if (!template) {
      throw new NotFoundException(`Workflow template "${dto.templateId}" not found`);
    }

    // Check for existing instance
    const existing = await this.findByDocument(dto.documentType, dto.documentId);
    if (existing) {
      throw new BadRequestException(`Workflow already exists for this document`);
    }

    const templateStates = JSON.parse((template as any).states || '[]');
    const templateTransitions = JSON.parse((template as any).transitions || '[]');
    const initialState = (template as any).initialState || 'draft';

    // Register in state machine
    this.stateMachine.registerTemplate(dto.templateId, templateStates, templateTransitions);

    // Determine approval levels from approval matrix
    const approvalLevels = await this.approvalEngine.determineApprovalLevels({
      module: dto.module,
      documentType: dto.documentType,
      amount: dto.amount || 0,
      departmentId: dto.departmentId,
    });

    const instance = await this.database.workflowInstances.create({
      templateId: dto.templateId,
      documentId: dto.documentId,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber || undefined,
      module: dto.module,
      currentState: initialState,
      previousState: undefined,
      status: 'active',
      priority: dto.priority || 'normal',
      initiatorId: dto.initiatorId || userId || undefined,
      assignedToId: undefined,
      assignedRole: undefined,
      approvalLevel: 0,
      maxApprovalLevel: approvalLevels.length > 0 ? approvalLevels.length : 1,
      amount: dto.amount || 0,
      departmentId: dto.departmentId || undefined,
      branchId: dto.branchId || undefined,
      dueDate: undefined,
      completedAt: undefined,
      completedBy: undefined,
      variables: dto.variables ? JSON.stringify(dto.variables) : undefined,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      createdBy: userId || dto.initiatorId || undefined,
      updatedBy: userId || dto.initiatorId || undefined,
    } as any);

    this.logger.log(
      `Workflow started: ${dto.documentType} #${dto.documentNumber || dto.documentId} → ${initialState}`,
    );

    // Create initial task
    await this.taskEngine.createTask({
      instanceId: instance.id,
      documentId: dto.documentId,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      module: dto.module,
      title: `${dto.documentType} created — pending submission`,
      taskType: 'action',
      assignedToId: dto.initiatorId || userId,
      priority: dto.priority,
    });

    // Notify initiator
    await this.notificationEngine.createNotification({
      userId: dto.initiatorId || userId,
      title: 'Workflow Started',
      message: `Workflow started for ${dto.documentType} #${dto.documentNumber || dto.documentId}`,
      type: 'info',
      module: dto.module,
      documentId: dto.documentId,
      documentType: dto.documentType,
      instanceId: instance.id,
    });

    // Audit
    if (userId) {
      await this.audit.log({
        userId,
        event: 'workflow_started' as any,
        resource: 'workflow',
        action: 'start',
        details: {
          instanceId: instance.id,
          documentType: dto.documentType,
          documentId: dto.documentId,
        },
      });
    }

    // Record workflow history
    await this.recordHistory({
      instanceId: instance.id,
      documentId: dto.documentId,
      documentType: dto.documentType,
      action: 'create',
      actionLabel: 'Created',
      fromState: undefined,
      toState: initialState,
      userId: userId || dto.initiatorId || 'system',
      userName: undefined,
      userRole: undefined,
      comment: 'Workflow instance created',
      approvalLevel: 0,
      ipAddress: undefined,
      userAgent: undefined,
    });

    return instance;
  }

  /**
   * H2 — resolve a user actor's server-side roles + department for eligibility.
   */
  private async resolveActorAuthorization(
    actorId: string,
  ): Promise<{ roles: string[]; departmentId?: string }> {
    let roles: string[] = [];
    try {
      const roleRows = await this.database.roles.getUserRoles(actorId);
      roles = (roleRows || []).map((r: any) => r.name);
    } catch {
      roles = [];
    }
    let departmentId: string | undefined;
    try {
      // NOTE: must use the `filters` array form — a plain `filter` object is
      // silently ignored by the enterprise query builder and would return the
      // FIRST employee row for ANY actor (cross-user department leak, H2).
      const empRes = await this.database.employees.findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'userId', operator: 'eq', value: actorId }],
      } as any);
      departmentId = (empRes.data || [])[0]?.departmentId || undefined;
    } catch {
      departmentId = undefined;
    }
    return { roles, departmentId };
  }

  /**
   * Execute a workflow action (submit, approve, reject, return, cancel, …).
   *
   * H2 hardening:
   *  - actor is server-derived from the authenticated session / system hook;
   *    a client-supplied dto.userId is rejected when it does not match.
   *  - dto.userRole is ignored for authorization (roles are loaded server-side).
   *  - approve/reject/return require designated-approver eligibility.
   *  - the whole transition runs inside a transaction; the instance is re-read
   *    inside the tx so concurrent duplicate approvals cannot both succeed.
   */
  async executeAction(instanceId: string, dto: ExecuteActionDto, actor: WorkflowActor) {
    const source = actor.source || 'user';
    const actorId = actor.id;

    // Impersonation guard: a client-supplied userId that differs from the
    // authenticated actor is rejected outright (never used as authority).
    if (dto.userId && dto.userId !== actorId) {
      throw new ForbiddenException(
        'Actor identity mismatch — approval identity comes from the authenticated session',
      );
    }

    return this.transactionManager.executeInTransaction(async () => {
      // Re-read inside the transaction so a concurrent duplicate approval sees
      // the committed state and is rejected by the guards below.
      const instance = await this.findById(instanceId);
      if ((instance as any).status !== 'active') {
        throw new BadRequestException(
          `Workflow is ${(instance as any).status}. Cannot execute action on non-active workflow.`,
        );
      }

      const templateId = (instance as any).templateId;
      const currentState = (instance as any).currentState;

      // Validate transition
      const transition = this.stateMachine.validateTransition(templateId, currentState, dto.action);
      const nextState = transition.to;

      // Check if comment is required
      if (transition.requireComment && !dto.comment) {
        throw new BadRequestException(`Comment is required for "${dto.action}" action`);
      }

      // Resolve server-side roles + department for user actors on approval actions
      let approvalActor: ApprovalActor = { id: actorId, source };
      if (
        source === 'user' &&
        (dto.action === 'approve' || dto.action === 'reject' || dto.action === 'return')
      ) {
        const authz = await this.resolveActorAuthorization(actorId);
        approvalActor = {
          id: actorId,
          source,
          roles: authz.roles,
          departmentId: authz.departmentId,
        };
      }

      // Handle approval-specific actions (designated-approver verification lives here)
      if (dto.action === 'approve' || dto.action === 'reject' || dto.action === 'return') {
        await this.approvalEngine.processApprovalAction(instance, dto, transition, approvalActor);
      }

      // Update instance — actor is always the server-derived identity
      const updateData: Record<string, any> = {
        previousState: currentState,
        currentState: nextState,
        updatedBy: actorId,
      };

      // If action goes to a final state
      if (this.stateMachine.isFinalState(templateId, nextState)) {
        updateData.status = nextState === 'cancelled' ? 'cancelled' : 'completed';
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = actorId;
      }

      await this.database.workflowInstances.update(instanceId, updateData as any);

      this.logger.log(
        `Workflow ${instanceId}: ${currentState} → ${nextState} (${dto.action}) by ${actorId}`,
      );

      // Record history — authoritative actor, never the client-supplied userId
      await this.recordHistory({
        instanceId,
        documentId: (instance as any).documentId,
        documentType: (instance as any).documentType,
        action: dto.action,
        actionLabel: transition.label,
        fromState: currentState,
        toState: nextState,
        userId: actorId,
        userName: dto.userName || undefined,
        userRole: undefined,
        comment: dto.comment || undefined,
        approvalLevel: (instance as any).approvalLevel,
        ipAddress: dto.ipAddress || undefined,
        userAgent: dto.userAgent || undefined,
      });

      // Update/create tasks based on new state
      if (nextState === 'submitted' || nextState === 'under_review') {
        await this.taskEngine.createApprovalTasks(instance, actorId);
      } else if (nextState === 'draft' && dto.action === 'return') {
        await this.taskEngine.createTask({
          instanceId,
          documentId: (instance as any).documentId,
          documentType: (instance as any).documentType,
          documentNumber: (instance as any).documentNumber,
          module: (instance as any).module,
          title: `${(instance as any).documentType} returned — needs revision`,
          taskType: 'action',
          assignedToId: (instance as any).initiatorId,
          priority: (instance as any).priority,
        });
      } else if (this.stateMachine.isFinalState(templateId, nextState)) {
        // Mark all pending tasks as completed
        await this.database.workflowTasks.markCompletedByInstance(instanceId, actorId);
      }

      // Notify relevant users
      await this.notificationEngine.notifyAction(instance, dto, transition, nextState);

      // Audit — authoritative actor
      await this.audit.log({
        userId: actorId,
        event: `workflow_${dto.action}` as any,
        resource: 'workflow',
        action: dto.action,
        details: { instanceId, fromState: currentState, toState: nextState, comment: dto.comment },
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      });

      return {
        success: true,
        instanceId,
        fromState: currentState,
        toState: nextState,
        action: dto.action,
        actionLabel: transition.label,
        status: updateData.status || 'active',
        message: `Workflow action "${dto.action}" executed: ${currentState} → ${nextState}`,
      };
    });
  }

  async getWorkflowState(instanceId: string) {
    const instance = await this.findById(instanceId);
    const templateId = (instance as any).templateId;
    const states = this.stateMachine.getStates(templateId);
    const currentState = (instance as any).currentState;
    const transitions = this.stateMachine.getTransitionsFrom(templateId, currentState);
    const history = await this.getHistory(instanceId);

    return {
      instance,
      states,
      currentState,
      availableActions: transitions,
      history,
    };
  }

  async getHistory(instanceId: string) {
    const result = await this.database.workflowHistory.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'instanceId', operator: 'eq', value: instanceId }],
    } as any);
    return result.data || [];
  }

  private async recordHistory(params: {
    instanceId: string;
    documentId?: string;
    documentType?: string;
    action: string;
    actionLabel?: string;
    fromState?: string;
    toState?: string;
    userId: string;
    userName?: string;
    userRole?: string;
    comment?: string;
    approvalLevel?: number;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    await this.database.workflowHistory.create({
      instanceId: params.instanceId,
      documentId: params.documentId ?? undefined,
      documentType: params.documentType ?? undefined,
      action: params.action,
      actionLabel: params.actionLabel ?? undefined,
      fromState: params.fromState ?? undefined,
      toState: params.toState ?? undefined,
      userId: params.userId,
      userName: params.userName ?? undefined,
      userRole: params.userRole ?? undefined,
      comment: params.comment ?? undefined,
      approvalLevel: params.approvalLevel ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
      userAgent: params.userAgent ?? undefined,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    } as any);
  }

  // ── Escalation Support ──────────────────────────────
  async getOverdueInstances() {
    const now = new Date().toISOString();
    const result = await this.database.workflowInstances.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'status', operator: 'eq', value: 'active' }],
    } as any);
    if (!result.data) {
      return [];
    }
    return result.data.filter((i: any) => i.dueDate && i.dueDate < now);
  }
}
