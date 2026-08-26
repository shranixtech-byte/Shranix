import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    const budget = await this.database.budgets.create({
      ...data,
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
    await this.audit.log({
      userId,
      event: 'budget.created',
      resource: 'budgets',
      action: 'create',
      details: { budgetId: budget.id },
    });
    return budget;
  }

  async findAll(params: { page: number; pageSize: number; fiscalYear?: string; status?: string }) {
    return this.database.budgets.findAll(params);
  }
  async findById(id: string) {
    return this.database.budgets.findById(id);
  }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.budgets.update(id, data);
    await this.audit.log({
      userId,
      event: 'budget.updated',
      resource: 'budgets',
      action: 'update',
      details: { budgetId: id },
    });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.budgets.softDelete(id);
    await this.audit.log({
      userId,
      event: 'budget.deleted',
      resource: 'budgets',
      action: 'delete',
      details: { budgetId: id },
    });
  }

  async approve(id: string, userId: string) {
    await this.database.budgets.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    });
    await this.audit.log({
      userId,
      event: 'budget.approved',
      resource: 'budgets',
      action: 'approve',
      details: { budgetId: id },
    });
    return { approved: true, id };
  }

  async calculateVariance(id: string) {
    const budget = await this.database.budgets.findById(id);
    if (!budget) {
      return null;
    }

    const budgetAmount = Number(budget.totalAmount || 0);
    const fiscalYear = budget.fiscalYear || (budget as any).financialYear;
    const categoryId = budget.categoryId || (budget as any).expenseCategoryId;

    // Sum actual expenses that match this budget's category and fiscal year.
    const filters: any[] = [];
    if (categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: categoryId });
    }
    if (fiscalYear) {
      // Match expenses in the same fiscal year (e.g. '2026' or '2026-2027')
      filters.push({ field: 'expenseDate', operator: 'gte', value: `${fiscalYear}-01-01` });
      filters.push({ field: 'expenseDate', operator: 'lte', value: `${fiscalYear}-12-31` });
    }
    if (budget.startDate) {
      filters.push({ field: 'expenseDate', operator: 'gte', value: budget.startDate });
    }
    if (budget.endDate) {
      filters.push({ field: 'expenseDate', operator: 'lte', value: budget.endDate });
    }

    let actualSpent = 0;
    try {
      const expenses = await this.database.expenses.findAll({
        page: 1,
        pageSize: 10000,
        ...(filters.length ? { filters } : {}),
      } as any);
      actualSpent = (expenses?.data || []).reduce(
        (sum: number, e: any) => sum + Number(e.totalAmount || e.amount || 0),
        0,
      );
    } catch {
      /* expenses table may not exist */
    }

    const variance = Math.round((budgetAmount - actualSpent) * 100) / 100;
    const variancePercent =
      budgetAmount > 0 ? Math.round((variance / budgetAmount) * 10000) / 100 : 0;
    const utilizationPercent =
      budgetAmount > 0 ? Math.round((actualSpent / budgetAmount) * 10000) / 100 : 0;

    return {
      budgetId: id,
      budgetAmount,
      actualSpent: Math.round(actualSpent * 100) / 100,
      variance,
      variancePercent,
      utilizationPercent,
      status: variance < 0 ? 'over_budget' : variance === 0 ? 'on_budget' : 'under_budget',
    };
  }
}
