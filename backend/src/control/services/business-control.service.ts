import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { BusinessRulesService } from './business-rules.service';

@Injectable()
export class BusinessControlService {
  constructor(
    private readonly database: DatabaseService,
    private readonly rules: BusinessRulesService,
  ) {}

  /**
   * Central Business Control dashboard — pending/overdue approvals,
   * escalation queue, rule violations, blocked transactions.
   */
  async dashboard(userId?: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [pendingTasks, activeRules, instances] = await Promise.all([
      this.database.workflowTasks
        .findAll({
          page: 1,
          pageSize: 500,
          filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
        } as any)
        .catch(() => ({ data: [] })),
      this.database.businessRules
        .findAll({ page: 1, pageSize: 1000 } as any)
        .catch(() => ({ data: [] })),
      this.database.workflowInstances
        .findAll({ page: 1, pageSize: 500 } as any)
        .catch(() => ({ data: [] })),
    ]);

    const tasks = (pendingTasks.data || []).filter((t: any) => !t.isDeleted);
    const overdue = tasks.filter((t: any) => t.dueDate && t.dueDate < today);
    const myPending = userId ? tasks.filter((t: any) => t.assignedToId === userId) : [];
    const escalated = (instances.data || []).filter(
      (i: any) => i.escalationCount > 0 || i.isEscalated,
    );
    const approvedToday = (instances.data || []).filter(
      (i: any) => i.status === 'approved' && String(i.updatedAt || '').slice(0, 10) === today,
    );
    const rejectedToday = (instances.data || []).filter(
      (i: any) => i.status === 'rejected' && String(i.updatedAt || '').slice(0, 10) === today,
    );

    const activeRuleRows = (activeRules.data || []).filter(
      (r: any) => r.status === 'active' && !r.isDeleted,
    );
    const blockRules = activeRuleRows.filter(
      (r: any) => r.action === 'block' || r.action === 'lock',
    );
    const requireApprovalRules = activeRuleRows.filter((r: any) => r.action === 'require_approval');

    // Report rule configuration state; per-document evaluations happen at
    // posting time through the rule engine.
    const violations = activeRuleRows.slice(0, 6).map((r: any) => ({
      ruleCode: r.ruleCode,
      ruleName: r.ruleName,
      module: r.module,
      action: r.action,
      severity: r.severity,
      message: r.message || 'Configured control rule',
    }));

    return {
      pendingApprovals: tasks.length,
      myPendingApprovals: myPending.length,
      overdueApprovals: overdue.length,
      escalated,
      approvedToday: approvedToday.length,
      rejectedToday: rejectedToday.length,
      returnedToday: (instances.data || []).filter(
        (i: any) => i.status === 'returned' && String(i.updatedAt || '').slice(0, 10) === today,
      ).length,
      activeRules: activeRuleRows.length,
      blockRules: blockRules.length,
      requireApprovalRules: requireApprovalRules.length,
      ruleViolations: violations,
      averageApprovalHours: this.averageApprovalHours(instances.data || []),
      moduleBreakdown: this.moduleBreakdown(instances.data || []),
      pendingByType: this.pendingByType(tasks),
    };
  }

  private averageApprovalHours(instances: any[]): number | null {
    const completed = instances.filter(
      (i: any) => ['approved', 'rejected'].includes(i.status) && i.completedAt && i.createdAt,
    );
    if (completed.length === 0) {
      return null;
    }
    const totalMs = completed.reduce((s: number, i: any) => {
      return s + Math.max(0, new Date(i.completedAt).getTime() - new Date(i.createdAt).getTime());
    }, 0);
    return Math.round((totalMs / completed.length / 3600e3) * 10) / 10;
  }

  private moduleBreakdown(instances: any[]): { module: string; count: number }[] {
    const byModule: Record<string, number> = {};
    for (const i of instances) {
      byModule[i.module] = (byModule[i.module] || 0) + 1;
    }
    return Object.entries(byModule)
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count);
  }

  private pendingByType(tasks: any[]): { documentType: string; count: number }[] {
    const byType: Record<string, number> = {};
    for (const t of tasks) {
      const key = t.documentType || t.module || 'unknown';
      byType[key] = (byType[key] || 0) + 1;
    }
    return Object.entries(byType)
      .map(([documentType, count]) => ({ documentType, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Evaluate a hypothetical document against rules — used by rule testing UI. */
  async evaluateDocument(body: {
    module: string;
    documentType?: string;
    amount?: number;
    data: Record<string, any>;
  }) {
    const result = await this.rules.evaluate(body);
    return result;
  }

  /** List all rule violations currently configured (control review). */
  async violationsReport() {
    const rules = await this.rules.findAll({ pageSize: 1000 });
    const active = (rules.data || []).filter((r: any) => r.status === 'active');
    return {
      data: active.map((r: any) => ({
        ruleCode: r.ruleCode,
        ruleName: r.ruleName,
        module: r.module,
        documentType: r.documentType,
        action: r.action,
        severity: r.severity,
        message: r.message,
        priority: r.priority,
        condition: r.condition,
      })),
      total: active.length,
    };
  }
}
