import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BudgetsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const budget = await this.database.budgets.create({ ...data, id: crypto.randomUUID(), status: 'draft', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'budget.created', resource: 'budgets', action: 'create', details: { budgetId: budget.id } });
    return budget;
  }

  async findAll(params: { page: number; pageSize: number; fiscalYear?: string; status?: string }) { return this.database.budgets.findAll(params); }
  async findById(id: string) { return this.database.budgets.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.budgets.update(id, data);
    await this.audit.log({ userId, event: 'budget.updated', resource: 'budgets', action: 'update', details: { budgetId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.budgets.softDelete(id);
    await this.audit.log({ userId, event: 'budget.deleted', resource: 'budgets', action: 'delete', details: { budgetId: id } });
  }

  async approve(id: string, userId: string) {
    await this.database.budgets.update(id, { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'budget.approved', resource: 'budgets', action: 'approve', details: { budgetId: id } });
    return { approved: true, id };
  }

  async calculateVariance(id: string) {
    const budget = await this.database.budgets.findById(id);
    if (!budget) {return null;}
    return { budgetId: id, totalAmount: budget.totalAmount, variance: 0 };
  }
}
