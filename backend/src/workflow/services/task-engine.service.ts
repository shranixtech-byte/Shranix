import { Injectable, Logger, NotFoundException } from '@nestjs/common';

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

  async findAll(page = 1, pageSize = 50, filter?: { status?: string; assignedToId?: string; instanceId?: string; isOverdue?: boolean }) {
    return this.database.workflowTasks.findAll({ page, pageSize, filter } as any);
  }

  async findById(id: string) {
    const record = await this.database.workflowTasks.findById(id);
    if (!record) {throw new NotFoundException(`Task with id "${id}" not found`);}
    return record;
  }

  async findPendingByUser(userId: string) {
    return this.database.workflowTasks.findAll({ page: 1, pageSize: 50, filter: { assignedToId: userId, status: 'pending' } } as any);
  }

  async findByInstance(instanceId: string) {
    return this.database.workflowTasks.findAll({ page: 1, pageSize: 50, filter: { instanceId } } as any);
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

    // Get approval matrix entries
    const matrixResult = await this.database.approvalMatrix.findAll({
      page: 1,
      pageSize: 20,
      filter: {
        module: instance.module,
        documentType: instance.documentType,
        isActive: true,
      } as any,
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
      if (level.level <= approvalLevel) {continue;} // Skip completed levels
      if (level.level > maxLevel) {break;} // Skip levels beyond max

      const isCurrentLevel = level.level === approvalLevel + 1;
      if (!isCurrentLevel && level.isSequential) {continue;} // Sequential: only create current level

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

  async completeTask(taskId: string, _userId: string, status: string = 'completed', _comment?: string) {
    await this.findById(taskId);
    return this.database.workflowTasks.update(taskId, {
      status,
      completedAt: new Date().toISOString(),
      completedBy: _userId || undefined,
    } as any);
  }

  async delegateTask(taskId: string, fromUserId: string, toUserId: string) {
    await this.findById(taskId);
    return this.database.workflowTasks.update(taskId, {
      delegatedFromId: fromUserId,
      delegatedToId: toUserId,
      status: 'delegated',
      assignedToId: toUserId,
    } as any);
  }

  async markOverdue() {
    const now = new Date().toISOString();
    const result = await this.database.workflowTasks.findAll({ page: 1, pageSize: 100, filter: { status: 'pending' } } as any);
    if (!result.data) {return 0;}

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
