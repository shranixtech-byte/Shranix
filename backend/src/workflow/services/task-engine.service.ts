import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface CreateTaskDto {
  instanceId: string;
  documentId?: string;
  documentType?: string;
  documentNumber?: string;
  module: string;
  title: string;
  description?: string;
  taskType?: string;
  assignedToId?: string;
  assignedRole?: string;
  priority?: string;
  dueDate?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TaskEngineService {
  private readonly logger = new Logger(TaskEngineService.name);

  constructor(private readonly database: DatabaseService) {}

  async findAll(
    page = 1,
    pageSize = 50,
    filter?: { status?: string; assignedToId?: string; instanceId?: string; isOverdue?: boolean },
  ) {
    // NOTE: `filters` array form — a plain `filter` object is silently ignored
    // and would expose every task row (H2 tenant-isolation fix).
    const filters: any[] = [];
    if (filter?.status) {
      filters.push({ field: 'status', operator: 'eq', value: filter.status });
    }
    if (filter?.assignedToId) {
      filters.push({ field: 'assignedToId', operator: 'eq', value: filter.assignedToId });
    }
    if (filter?.instanceId) {
      filters.push({ field: 'instanceId', operator: 'eq', value: filter.instanceId });
    }
    if (filter?.isOverdue !== undefined) {
      filters.push({ field: 'isOverdue', operator: 'eq', value: filter.isOverdue });
    }
    return this.database.workflowTasks.findAll({ page, pageSize, filters } as any);
  }

  async findById(id: string) {
    const record = await this.database.workflowTasks.findById(id);
    if (!record) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    return record;
  }

  async findPendingByUser(userId: string) {
    return this.database.workflowTasks.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'assignedToId', operator: 'eq', value: userId },
        { field: 'status', operator: 'eq', value: 'pending' },
      ],
    } as any);
  }

  async findByInstance(instanceId: string) {
    return this.database.workflowTasks.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'instanceId', operator: 'eq', value: instanceId }],
    } as any);
  }

  async createTask(dto: CreateTaskDto) {
    return this.database.workflowTasks.create({
      instanceId: dto.instanceId,
      documentId: dto.documentId || null,
      documentType: dto.documentType || null,
      documentNumber: dto.documentNumber || null,
      module: dto.module,
      title: dto.title,
      description: dto.description || null,
      taskType: dto.taskType || 'approval',
      priority: dto.priority || 'normal',
      status: 'pending',
      assignedToId: dto.assignedToId || null,
      assignedRole: dto.assignedRole || null,
      dueDate: dto.dueDate || null,
      isOverdue: false,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    } as any);
  }

  async createApprovalTasks(instance: any, _userId: string) {
    const approvalLevel = (instance as any).approvalLevel || 0;
    const maxLevel = (instance as any).maxApprovalLevel || 1;

    // Get approval matrix entries — `filters` array form (a plain `filter`
    // object is ignored by the query builder and leaks rules from other modules).
    const matrixResult = await this.database.approvalMatrix.findAll({
      page: 1,
      pageSize: 20,
      filters: [
        { field: 'module', operator: 'eq' as const, value: instance.module },
        { field: 'documentType', operator: 'eq' as const, value: instance.documentType },
        { field: 'isActive', operator: 'eq' as const, value: true },
      ],
    } as any);

    const levels = (matrixResult.data || []).sort((a: any, b: any) => a.level - b.level);

    if (levels.length === 0) {
      // Default: single task for manager
      await this.createTask({
        instanceId: instance.id,
        documentId: instance.documentId,
        documentType: instance.documentType,
        documentNumber: instance.documentNumber,
        module: instance.module,
        title: `${instance.documentType} #${instance.documentNumber || instance.documentId} — needs approval`,
        taskType: 'approval',
        assignedRole: 'manager',
        priority: instance.priority || 'normal',
      });
      return;
    }

    for (const level of levels) {
      if (level.level <= approvalLevel) {
        continue;
      } // Skip completed levels
      if (level.level > maxLevel) {
        break;
      } // Skip levels beyond max

      const isCurrentLevel = level.level === approvalLevel + 1;
      if (!isCurrentLevel && level.isSequential) {
        continue;
      } // Sequential: only create current level

      await this.createTask({
        instanceId: instance.id,
        documentId: instance.documentId,
        documentType: instance.documentType,
        documentNumber: instance.documentNumber,
        module: instance.module,
        title: `Level ${level.level} approval: ${instance.documentType} #${instance.documentNumber || instance.documentId}`,
        description: `Amount: ${instance.amount}`,
        taskType: 'approval',
        assignedToId: level.approverUserId || null,
        assignedRole: level.approverRole || null,
        priority: instance.priority || 'normal',
      });

      this.logger.log(`Approval task created for level ${level.level}`);
    }
  }

  /**
   * H2 — the acting user must be the task's assignee, a holder of the task's
   * assigned role, or an admin (documented override). Client-supplied identity
   * can never complete another user's approval task.
   */
  private async assertTaskActor(task: any, userId: string): Promise<void> {
    const roles = userId ? await this.database.roles.getUserRoles(userId) : [];
    const roleNames = (roles || []).map((r: any) => r.name);
    const isAdmin = roleNames.includes('admin');
    const assigned = task.assignedToId;
    const assignedRole = task.assignedRole;
    if (isAdmin) {
      return;
    }
    if (assigned && assigned !== userId) {
      throw new ForbiddenException('This task is assigned to another user');
    }
    if (assignedRole && !roleNames.includes(assignedRole)) {
      throw new ForbiddenException(`This task requires the "${assignedRole}" role`);
    }
  }

  async completeTask(
    taskId: string,
    userId: string,
    status: string = 'completed',
    _comment?: string,
  ) {
    const task = await this.findById(taskId);
    await this.assertTaskActor(task, userId);
    return this.database.workflowTasks.update(taskId, {
      status,
      completedAt: new Date().toISOString(),
      completedBy: userId || undefined,
    } as any);
  }

  async delegateTask(taskId: string, fromUserId: string, toUserId: string) {
    const task = await this.findById(taskId);
    // Only the current assignee (or an admin) may delegate the task onward.
    await this.assertTaskActor(task, fromUserId);
    return this.database.workflowTasks.update(taskId, {
      delegatedFromId: fromUserId,
      delegatedToId: toUserId,
      status: 'delegated',
      assignedToId: toUserId,
    } as any);
  }

  async markOverdue() {
    const now = new Date().toISOString();
    const result = await this.database.workflowTasks.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    } as any);
    if (!result.data) {
      return 0;
    }

    let count = 0;
    for (const task of result.data as any[]) {
      if (task.dueDate && task.dueDate < now && !task.isOverdue) {
        await this.database.workflowTasks.update(task.id, { isOverdue: true } as any);
        count++;
      }
    }
    return count;
  }
}
