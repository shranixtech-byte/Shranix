import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { NotificationEngineService } from './notification-engine.service';
import { TaskEngineService } from './task-engine.service';

/** H6 — Maximum auto-approve hours for safety. */
const MAX_AUTO_APPROVE_HOURS = 72;

@Injectable()
export class EscalationEngineService {
  private readonly logger = new Logger(EscalationEngineService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly taskEngine: TaskEngineService,
    private readonly notificationEngine: NotificationEngineService,
  ) {}

  /**
   * Process all escalations: check overdue tasks and escalate where needed.
   */
  async processEscalations(): Promise<{
    escalated: number;
    reminded: number;
    autoApproved: number;
  }> {
    let escalated = 0;
    let reminded = 0;
    let autoApproved = 0;

    // Get all active escalation rules — H6: use `filters` array form
    const rulesResult = await this.database.escalationRules.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'isActive', operator: 'eq', value: true }],
    } as any);

    const rules = rulesResult.data || [];

    // Get all pending overdue tasks — `filters` array form (a plain `filter`
    // object is silently ignored and would return tasks in ANY status, H2).
    const tasksResult = await this.database.workflowTasks.findAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    } as any);

    const tasks = tasksResult.data || [];
    const now = new Date();

    for (const task of tasks as any[]) {
      if (!task.dueDate) {
        continue;
      }
      const dueDate = new Date(task.dueDate);
      if (dueDate >= now) {
        continue;
      }

      // Task is overdue
      const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);

      // Find matching escalation rules
      const matchingRules = rules.filter((r: any) => {
        if (r.module && task.module !== r.module) {
          return false;
        }
        if (r.documentType && task.documentType !== r.documentType) {
          return false;
        }
        if (r.triggerState && task.status !== r.triggerState && r.triggerState !== 'pending') {
          return false;
        }
        return true;
      });

      for (const rule of matchingRules as any[]) {
        const timeoutHours = Number(rule.timeoutHours || 24);

        // Check if we should escalate
        if (hoursOverdue >= timeoutHours) {
          // Mark as overdue
          if (!task.isOverdue) {
            await this.database.workflowTasks.update(task.id, { isOverdue: true } as any);
          }

          // Escalate to higher level (idempotent — skip if already escalated)
          if (rule.escalateToRole || rule.escalateToUserId) {
            const existingEscalated = await this.database.workflowTasks.findAll({
              page: 1,
              pageSize: 1,
              filters: [
                { field: 'instanceId', operator: 'eq', value: task.instanceId },
                { field: 'title', operator: 'like', value: 'ESCALATED: %' },
                { field: 'status', operator: 'eq', value: 'pending' },
              ],
            } as any);
            if ((existingEscalated as any).data && (existingEscalated as any).data.length > 0) {
              continue; // Already escalated for this instance
            }
            await this.taskEngine.createTask({
              instanceId: task.instanceId,
              documentId: task.documentId,
              documentType: task.documentType,
              documentNumber: task.documentNumber,
              module: task.module,
              title: `ESCALATED: ${task.title}`,
              description: `Escalated from ${task.assignedToId || task.assignedRole} after ${Math.round(hoursOverdue)}h overdue`,
              taskType: 'approval',
              assignedToId: rule.escalateToUserId || null,
              assignedRole: rule.escalateToRole || null,
              priority: 'high',
            });

            escalated++;
            this.logger.log(
              `Task ${task.id} escalated: ${task.assignedRole || task.assignedToId} → ${rule.escalateToRole || rule.escalateToUserId}`,
            );
          }

          // Auto-approve if configured — H6: enforce safety cap
          const rawAutoApprove = Number(rule.autoApproveAfterHours || 0);
          const autoApproveAfter =
            rawAutoApprove > MAX_AUTO_APPROVE_HOURS ? MAX_AUTO_APPROVE_HOURS : rawAutoApprove;
          if (autoApproveAfter > 0 && hoursOverdue >= autoApproveAfter) {
            await this.database.workflowTasks.update(task.id, {
              status: 'completed',
              completedAt: now.toISOString(),
              completedBy: 'system_escalation',
            } as any);

            autoApproved++;
            this.logger.log(
              `Task ${task.id} auto-approved after ${Math.round(hoursOverdue)}h (cap: ${MAX_AUTO_APPROVE_HOURS}h)`,
            );
          }

          // Send reminder
          const reminderInterval = Number(rule.reminderIntervalHours || 0);
          const maxReminders = Number(rule.maxReminders || 3);
          if (reminderInterval > 0) {
            const reminderCount = Math.floor(hoursOverdue / reminderInterval);
            if (reminderCount <= maxReminders) {
              await this.sendReminder(task, rule, reminderCount);
              reminded++;
            }
          }

          // Notify about escalation
          const instance = await this.database.workflowInstances.findById(task.instanceId);
          if (instance) {
            await this.notificationEngine.notifyEscalation(instance, rule);
          }
        }
      }
    }

    return { escalated, reminded, autoApproved };
  }

  private async sendReminder(task: any, _rule: any, reminderCount: number) {
    if (task.assignedToId) {
      const instance = await this.database.workflowInstances.findById(task.instanceId);
      if (instance) {
        await this.notificationEngine.createNotification({
          userId: task.assignedToId,
          title: `Reminder #${reminderCount + 1}: ${task.documentType || 'Task'} Approval`,
          message: `Task "${task.title}" is overdue. Please take action.`,
          type: 'reminder',
          module: task.module,
          documentId: task.documentId,
          documentType: task.documentType,
          instanceId: task.instanceId,
          taskId: task.id,
        });
      }
    }
  }

  async findAllRules(page = 1, pageSize = 50) {
    return this.database.escalationRules.findAll({ page, pageSize } as any);
  }

  async findRuleById(id: string) {
    return this.database.escalationRules.findById(id);
  }

  async createRule(data: any, userId?: string) {
    // H6: validate auto-approve safety cap at configuration boundary
    const rawAutoApprove = data.autoApproveAfterHours ? Number(data.autoApproveAfterHours) : null;
    if (rawAutoApprove !== null && rawAutoApprove > MAX_AUTO_APPROVE_HOURS) {
      throw new BadRequestException(
        `autoApproveAfterHours cannot exceed ${MAX_AUTO_APPROVE_HOURS}h (got ${rawAutoApprove}h)`,
      );
    }
    return this.database.escalationRules.create({
      ...data,
      timeoutHours: Number(data.timeoutHours || 24),
      reminderIntervalHours: data.reminderIntervalHours ? Number(data.reminderIntervalHours) : null,
      maxReminders: data.maxReminders ? Number(data.maxReminders) : null,
      escalateToLevel: data.escalateToLevel ? Number(data.escalateToLevel) : null,
      autoApproveAfterHours: rawAutoApprove,
      createdBy: userId || null,
    } as any);
  }

  async updateRule(id: string, data: any) {
    // H6: validate auto-approve safety cap at configuration boundary
    if (data.autoApproveAfterHours !== undefined) {
      const raw = Number(data.autoApproveAfterHours);
      if (raw > MAX_AUTO_APPROVE_HOURS) {
        throw new BadRequestException(
          `autoApproveAfterHours cannot exceed ${MAX_AUTO_APPROVE_HOURS}h (got ${raw}h)`,
        );
      }
    }
    return this.database.escalationRules.update(id, data as any);
  }

  async deleteRule(id: string) {
    return this.database.escalationRules.softDelete(id);
  }
}
