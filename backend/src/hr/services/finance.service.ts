import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class EmployeeAdvancesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async nextNumber(): Promise<string> {
    const all = await this.database.employeeAdvances
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    let max = 0;
    for (const row of all.data || []) {
      const m = /ADV-(\d+)/.exec(String(row.advanceNumber || ''));
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
    return `ADV-${String(max + 1).padStart(4, '0')}`;
  }

  async create(data: any, userId: string) {
    if (!data.employeeId || !data.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('employeeId and a positive amount are required');
    }
    const advance = await this.database.employeeAdvances.create({
      ...data,
      advanceNumber: data.advanceNumber || (await this.nextNumber()),
      status: 'pending',
      outstandingAmount: Number(data.amount),
      recoveredAmount: 0,
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'advance.created',
      resource: 'hr',
      action: 'create',
      details: { advanceId: advance.id, amount: data.amount },
    });
    return advance;
  }

  async approve(id: string, userId: string) {
    const adv = await this.database.employeeAdvances.findById(id);
    if (!adv || adv.isDeleted) {
      throw new NotFoundException('Advance not found');
    }
    if (adv.status !== 'pending') {
      throw new BadRequestException(`Advance already ${adv.status}`);
    }
    await this.database.employeeAdvances.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
    } as any);
    await this.audit.log({
      userId,
      event: 'advance.approved',
      resource: 'hr',
      action: 'approve',
      details: { advanceId: id },
    });
    return { approved: true, id };
  }

  /** Record a recovery installment against an advance. */
  async recover(id: string, amount: number, userId: string) {
    const adv = await this.database.employeeAdvances.findById(id);
    if (!adv || adv.isDeleted) {
      throw new NotFoundException('Advance not found');
    }
    const outstanding = Number(adv.outstandingAmount) || 0;
    if (amount > outstanding) {
      throw new BadRequestException(`Recovery ${amount} exceeds outstanding ${outstanding}`);
    }
    const newRecovered = Math.round(((Number(adv.recoveredAmount) || 0) + amount) * 100) / 100;
    const newOutstanding = Math.round((outstanding - amount) * 100) / 100;
    await this.database.employeeAdvances.update(id, {
      recoveredAmount: newRecovered,
      outstandingAmount: newOutstanding,
      ...(newOutstanding <= 0 ? { status: 'recovered' } : {}),
    } as any);
    await this.audit.log({
      userId,
      event: 'advance.recovered',
      resource: 'hr',
      action: 'update',
      details: { advanceId: id, amount },
    });
    return { recovered: true, id, outstandingAmount: newOutstanding };
  }

  async findAll(query: { page?: number; pageSize?: number; employeeId?: string; status?: string }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    const result = await this.database.employeeAdvances.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
    const ids = [...new Set((result.data || []).map((r: any) => r.employeeId))];
    const emps = ids.length
      ? await this.database.employees
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: ids.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const empMap = new Map(
      (emps.data || []).map((e: any) => [e.id, `${e.firstName} ${e.lastName || ''}`.trim()]),
    );
    return {
      ...result,
      data: (result.data || []).map((r: any) => ({
        ...r,
        employeeName: empMap.get(r.employeeId) || r.employeeId,
      })),
    };
  }
}

@Injectable()
export class EmployeeExpensesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async nextNumber(): Promise<string> {
    const all = await this.database.employeeExpenses
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    let max = 0;
    for (const row of all.data || []) {
      const m = /EXP-(\d+)/.exec(String(row.expenseNumber || ''));
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
    return `EXP-${String(max + 1).padStart(4, '0')}`;
  }

  async create(data: any, userId: string) {
    if (!data.employeeId || !data.amount || Number(data.amount) <= 0) {
      throw new BadRequestException('employeeId and a positive amount are required');
    }
    return this.database.employeeExpenses.create({
      ...data,
      expenseNumber: data.expenseNumber || (await this.nextNumber()),
      status: data.status || 'draft',
      createdBy: userId,
    } as any);
  }

  async submit(id: string, userId: string) {
    const exp = await this.database.employeeExpenses.findById(id);
    if (!exp || exp.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    await this.database.employeeExpenses.update(id, { status: 'submitted' } as any);
    await this.audit.log({
      userId,
      event: 'expense.submitted',
      resource: 'hr',
      action: 'update',
      details: { expenseId: id },
    });
    return { submitted: true, id };
  }

  async approve(id: string, userId: string) {
    const exp = await this.database.employeeExpenses.findById(id);
    if (!exp || exp.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    await this.database.employeeExpenses.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.approved',
      resource: 'hr',
      action: 'approve',
      details: { expenseId: id },
    });
    return { approved: true, id };
  }

  async reject(id: string, userId: string, reason?: string) {
    const exp = await this.database.employeeExpenses.findById(id);
    if (!exp || exp.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    await this.database.employeeExpenses.update(id, {
      status: 'rejected',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      remarks: reason || exp.remarks,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.rejected',
      resource: 'hr',
      action: 'reject',
      details: { expenseId: id },
    });
    return { rejected: true, id };
  }

  async markPaid(id: string, userId: string, paymentMode?: string) {
    const exp = await this.database.employeeExpenses.findById(id);
    if (!exp || exp.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    await this.database.employeeExpenses.update(id, {
      status: 'paid',
      paymentMode: paymentMode || 'bank',
    } as any);
    return { paid: true, id };
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    status?: string;
    category?: string;
  }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.category) {
      filters.push({ field: 'category', operator: 'eq', value: query.category });
    }
    const result = await this.database.employeeExpenses.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
    const ids = [...new Set((result.data || []).map((r: any) => r.employeeId))];
    const emps = ids.length
      ? await this.database.employees
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: ids.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const empMap = new Map(
      (emps.data || []).map((e: any) => [e.id, `${e.firstName} ${e.lastName || ''}`.trim()]),
    );
    return {
      ...result,
      data: (result.data || []).map((r: any) => ({
        ...r,
        employeeName: empMap.get(r.employeeId) || r.employeeId,
      })),
    };
  }
}

@Injectable()
export class PerformanceReviewsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.employeeId || !data.reviewPeriod) {
      throw new BadRequestException('employeeId and reviewPeriod are required');
    }
    return this.database.performanceReviews.create({
      ...data,
      status: 'draft',
      createdBy: userId,
    } as any);
  }

  async submit(id: string, userId: string) {
    await this.database.performanceReviews.update(id, { status: 'submitted' } as any);
    await this.audit.log({
      userId,
      event: 'performance.submitted',
      resource: 'hr',
      action: 'update',
      details: { reviewId: id },
    });
    return { submitted: true, id };
  }

  async review(id: string, data: any, userId: string) {
    await this.database.performanceReviews.update(id, {
      ...data,
      status: 'reviewed',
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
    } as any);
    await this.audit.log({
      userId,
      event: 'performance.reviewed',
      resource: 'hr',
      action: 'update',
      details: { reviewId: id },
    });
    return { reviewed: true, id };
  }

  async findAll(query: { page?: number; pageSize?: number; employeeId?: string; status?: string }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    return this.database.performanceReviews.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }
}
