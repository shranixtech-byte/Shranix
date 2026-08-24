import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { GlPostingEngine } from '../../automation/gl-posting.engine';
import { AuditService } from '../../common/services/audit.service';
import { CommunicationService } from '../../communication/communication.service';
import { DatabaseService } from '../../database/database.service';

const EXPENSE_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'paid'];
const PAYMENT_MODES = ['cash', 'bank', 'upi', 'cheque', 'other'];
const FREQUENCIES = ['monthly', 'quarterly', 'yearly', 'custom'];

@Injectable()
export class ExpensesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly glPosting?: GlPostingEngine,
    private readonly communication?: CommunicationService,
  ) {}

  async nextExpenseNumber(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.expenses.maxFieldValue('expenseNumber');
      if (maxVal) {
        const m = /EXP-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `EXP-${String(max + 1).padStart(6, '0')}`;
  }

  // ── Expense categories ─────────────────────────────────
  async createCategory(data: any, userId: string) {
    if (!data.categoryName) {
      throw new BadRequestException('categoryName is required');
    }
    const existing = await this.database.expenseCategories
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'categoryName', operator: 'eq', value: data.categoryName }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(`Expense category "${data.categoryName}" already exists`);
    }
    const cat = await this.database.expenseCategories.create({ ...data, createdBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'expense.category_created',
      resource: 'expense',
      action: 'create',
      details: { categoryId: cat.id },
    });
    return cat;
  }

  async listCategories() {
    const res = await this.database.expenseCategories
      .findAll({ page: 1, pageSize: 500 } as any)
      .catch(() => ({ data: [] }));
    return res.data || [];
  }

  async updateCategory(id: string, data: any, userId: string) {
    await this.database.expenseCategories.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'expense.category_updated',
      resource: 'expense',
      action: 'update',
      details: { categoryId: id },
    });
    return { updated: true, id };
  }

  // ── Expense CRUD ───────────────────────────────────────
  async create(data: any, userId: string) {
    if (!data.amount || Number(data.amount) < 0) {
      throw new BadRequestException('amount is required and must be non-negative');
    }
    const amount = Number(data.amount) || 0;
    const taxAmount = Number(data.taxAmount) || 0;
    const totalAmount = Math.round((amount + taxAmount) * 100) / 100;
    // Workflow integrity — always enter as draft; approve/reject/pay must go
    // through their dedicated endpoints (never bypass approval on create).
    const status = data.status === 'submitted' ? 'submitted' : 'draft';

    const expense = await this.database.expenses.create({
      expenseNumber: await this.nextExpenseNumber(),
      expenseDate: data.expenseDate || new Date().toISOString().slice(0, 10),
      categoryId: data.categoryId || null,
      expenseAccountId: data.expenseAccountId || null,
      vendorId: data.vendorId || null,
      employeeId: data.employeeId || null,
      departmentId: data.departmentId || null,
      amount,
      taxAmount,
      totalAmount,
      paymentMode: data.paymentMode || null,
      paymentReference: data.paymentReference || null,
      reference: data.reference || null,
      description: data.description || null,
      attachmentRef: data.attachmentRef || null,
      status,
      recurringExpenseId: data.recurringExpenseId || null,
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.created',
      resource: 'expense',
      action: 'create',
      details: { expenseId: expense.id, expenseNumber: expense.expenseNumber, amount: totalAmount },
    });
    return expense;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    categoryId?: string;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: query.categoryId });
    }
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.dateFrom) {
      filters.push({ field: 'expenseDate', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'expenseDate', operator: 'lte', value: query.dateTo });
    }
    const result = await this.database.expenses.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(query.search
        ? {
            search: query.search,
            searchFields: ['expenseNumber', 'description', 'reference', 'paymentReference'],
          }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
    const rows = result.data || [];
    const catIds = [...new Set(rows.map((r: any) => r.categoryId).filter(Boolean))];
    const empIds = [...new Set(rows.map((r: any) => r.employeeId).filter(Boolean))];
    const [cats, emps] = await Promise.all([
      catIds.length
        ? this.database.expenseCategories
            .findAll({
              page: 1,
              pageSize: 200,
              filters: [{ field: 'id', operator: 'in', value: catIds.join(',') }],
            } as any)
            .catch(() => ({ data: [] }))
        : { data: [] },
      empIds.length
        ? this.database.employees
            .findAll({
              page: 1,
              pageSize: 200,
              filters: [{ field: 'id', operator: 'in', value: empIds.join(',') }],
            } as any)
            .catch(() => ({ data: [] }))
        : { data: [] },
    ]);
    const catMap = new Map((cats.data || []).map((c: any) => [c.id, c.categoryName]));
    const empMap = new Map(
      (emps.data || []).map((e: any) => [e.id, `${e.firstName} ${e.lastName || ''}`.trim()]),
    );
    return {
      ...result,
      data: rows.map((r: any) => ({
        ...r,
        categoryName: catMap.get(r.categoryId) || null,
        employeeName: empMap.get(r.employeeId) || null,
      })),
    };
  }

  async findById(id: string) {
    const expense = await this.database.expenses.findById(id);
    if (!expense || expense.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.expenses.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    if (['approved', 'paid'].includes(String(existing.status))) {
      throw new BadRequestException('Approved or paid expenses cannot be edited');
    }
    if (data.status && !EXPENSE_STATUSES.includes(data.status)) {
      throw new BadRequestException(`Invalid status: ${data.status}`);
    }
    if (data.status && !['draft', 'submitted'].includes(String(data.status))) {
      // Workflow transitions (approve/reject/pay) must use dedicated endpoints
      throw new BadRequestException(
        'Status can only be draft or submitted via edit — use approve/reject/pay endpoints',
      );
    }
    const updated = await this.database.expenses.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'expense.updated',
      resource: 'expense',
      action: 'update',
      details: { expenseId: id },
    });
    return updated;
  }

  // ── Approval workflow ──────────────────────────────────
  async submit(id: string, userId: string) {
    const expense = await this.requireEditable(id);
    if (expense.status !== 'draft') {
      throw new BadRequestException(
        `Only draft expenses can be submitted (current: ${expense.status})`,
      );
    }
    await this.database.expenses.update(id, { status: 'submitted', updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'expense.submitted',
      resource: 'expense',
      action: 'submit',
      details: { expenseId: id },
    });
    return { submitted: true, id };
  }

  async approve(id: string, userId: string, remarks?: string) {
    const expense = await this.requireEditable(id);
    if (expense.status !== 'submitted') {
      throw new BadRequestException(
        `Only submitted expenses can be approved (current: ${expense.status})`,
      );
    }
    await this.database.expenses.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      remarks: remarks || expense.remarks,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.approved',
      resource: 'expense',
      action: 'approve',
      details: { expenseId: id },
    });

    // Notify employee if linked
    if (expense.employeeId && this.communication) {
      const emp = await this.database.employees.findById(expense.employeeId).catch(() => null);
      const target = emp?.userId || userId;
      this.communication
        .send({
          channel: 'in_app',
          to: target,
          recipientType: 'user',
          recipientId: target,
          subject: 'Expense approved',
          message: `Expense ${expense.expenseNumber} (₹${expense.totalAmount}) approved`,
          referenceType: 'expense',
          referenceId: id,
          referenceNumber: expense.expenseNumber,
          userId,
          skipPreference: true,
        })
        .catch(() => undefined);
    }
    return { approved: true, id };
  }

  async reject(id: string, userId: string, remarks?: string) {
    const expense = await this.requireEditable(id);
    if (expense.status !== 'submitted') {
      throw new BadRequestException(
        `Only submitted expenses can be rejected (current: ${expense.status})`,
      );
    }
    await this.database.expenses.update(id, {
      status: 'rejected',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      remarks: remarks || expense.remarks,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.rejected',
      resource: 'expense',
      action: 'reject',
      details: { expenseId: id },
    });
    return { rejected: true, id };
  }

  // ── Payment (with accounting) ──────────────────────────
  async pay(
    id: string,
    data: { paymentMode?: string; paymentReference?: string; paidAt?: string },
    userId: string,
  ) {
    const expense = await this.requireEditable(id);
    if (expense.status !== 'approved') {
      throw new BadRequestException(
        `Only approved expenses can be paid (current: ${expense.status})`,
      );
    }
    if (data.paymentMode && !PAYMENT_MODES.includes(data.paymentMode)) {
      throw new BadRequestException(`Invalid payment mode: ${data.paymentMode}`);
    }

    // GL: Dr Expense + Dr Input Tax / Cr Cash/Bank
    let glEntryId: string | null = null;
    if (this.glPosting) {
      const amount = Number(expense.amount) || 0;
      const taxAmount = Number(expense.taxAmount) || 0;
      const total = Math.round((amount + taxAmount) * 100) / 100;
      const cashAccountId = expense.paymentMode === 'cash' ? 'CASH' : 'BANK';
      const entries: any[] = [
        {
          entryDate: data.paidAt || expense.expenseDate || new Date().toISOString().slice(0, 10),
          accountId: expense.expenseAccountId || 'EXPENSES',
          voucherId: `EXP-${expense.expenseNumber}`,
          voucherType: 'EXPENSE_PAYMENT',
          voucherNumber: expense.expenseNumber,
          debit: amount,
          credit: 0,
          narration: expense.description || `Expense ${expense.expenseNumber}`,
          partyId: expense.vendorId || undefined,
        },
      ];
      if (taxAmount > 0) {
        entries.push({
          entryDate: data.paidAt || expense.expenseDate || new Date().toISOString().slice(0, 10),
          accountId: 'INPUT_GST',
          voucherId: `EXP-${expense.expenseNumber}`,
          voucherType: 'EXPENSE_PAYMENT',
          voucherNumber: expense.expenseNumber,
          debit: taxAmount,
          credit: 0,
          narration: `Input tax for ${expense.expenseNumber}`,
        });
      }
      entries.push({
        entryDate: data.paidAt || expense.expenseDate || new Date().toISOString().slice(0, 10),
        accountId: cashAccountId,
        voucherId: `EXP-${expense.expenseNumber}`,
        voucherType: 'EXPENSE_PAYMENT',
        voucherNumber: expense.expenseNumber,
        debit: 0,
        credit: total,
        narration: `Payment for ${expense.expenseNumber}`,
      });
      const result = await this.glPosting.postEntries(entries, { userId });
      if (result.success) {
        glEntryId = result.entries?.[0]?.entryNumber || null;
      }
    }

    await this.database.expenses.update(id, {
      status: 'paid',
      paidAt: data.paidAt || new Date().toISOString(),
      paidBy: userId,
      paymentMode: data.paymentMode || expense.paymentMode || 'bank',
      paymentReference: data.paymentReference || expense.paymentReference || null,
      glEntryId,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.paid',
      resource: 'expense',
      action: 'pay',
      details: { expenseId: id, paymentMode: data.paymentMode, glEntryId },
    });
    return { paid: true, id, glEntryId };
  }

  private async requireEditable(id: string) {
    const expense = await this.database.expenses.findById(id);
    if (!expense || expense.isDeleted) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async softDelete(id: string, userId: string) {
    const expense = await this.requireEditable(id);
    if (expense.status === 'paid') {
      throw new BadRequestException('Paid expenses cannot be deleted');
    }
    await this.database.expenses.softDelete(id);
    await this.audit.log({
      userId,
      event: 'expense.deleted',
      resource: 'expense',
      action: 'delete',
      details: { expenseId: id },
    });
    return { deleted: true };
  }

  // ── Recurring expenses ─────────────────────────────────
  async createRecurring(data: any, userId: string) {
    if (!data.amount || Number(data.amount) < 0) {
      throw new BadRequestException('amount is required and must be non-negative');
    }
    if (!FREQUENCIES.includes(data.frequency)) {
      throw new BadRequestException(
        `Invalid frequency: ${data.frequency}. Must be one of ${FREQUENCIES.join(', ')}`,
      );
    }
    if (!data.nextDueDate) {
      throw new BadRequestException('nextDueDate is required');
    }
    const all = await this.database.recurringExpenses
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    const num = `REC-${String((all.data || []).length + 1).padStart(6, '0')}`;
    const recurring = await this.database.recurringExpenses.create({
      recurringNumber: num,
      categoryId: data.categoryId || null,
      expenseAccountId: data.expenseAccountId || null,
      vendorId: data.vendorId || null,
      departmentId: data.departmentId || null,
      amount: Number(data.amount) || 0,
      taxAmount: Number(data.taxAmount) || 0,
      frequency: data.frequency,
      intervalDays: data.intervalDays || null,
      nextDueDate: data.nextDueDate,
      description: data.description || null,
      paymentMode: data.paymentMode || null,
      isActive: data.isActive !== false,
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'expense.recurring_created',
      resource: 'expense',
      action: 'create',
      details: { recurringId: recurring.id, frequency: data.frequency },
    });
    return recurring;
  }

  /**
   * Generate expense(s) for recurring templates due on/before today.
   * Dedup: skips templates already generated for the current period (checks
   * lastGeneratedAt + nextDueDate ≤ today and no open draft with the same
   * recurringExpenseId + due date marker).
   */
  async generateRecurring(userId = 'system') {
    const today = new Date().toISOString().slice(0, 10);
    const due = await this.database.recurringExpenses
      .findAll({
        page: 1,
        pageSize: 1000,
        filters: [{ field: 'nextDueDate', operator: 'lte', value: today }],
      } as any)
      .catch(() => ({ data: [] }));
    // isActive is stored as 0/1 — filter in JS to stay storage-agnostic
    const activeDue = (due.data || []).filter((r: any) => r.isActive !== false);

    let generated = 0;
    const skipped: string[] = [];
    for (const template of activeDue) {
      // Dedup — check a draft/submitted expense already exists for this period
      const dup = await this.database.expenses
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [
            { field: 'recurringExpenseId', operator: 'eq', value: template.id },
            { field: 'expenseDate', operator: 'eq', value: template.nextDueDate },
          ],
        } as any)
        .catch(() => ({ data: [] }));
      if ((dup.data || []).length > 0) {
        skipped.push(template.recurringNumber);
        continue;
      }
      await this.create(
        {
          expenseDate: template.nextDueDate,
          categoryId: template.categoryId,
          expenseAccountId: template.expenseAccountId,
          vendorId: template.vendorId,
          departmentId: template.departmentId,
          amount: template.amount,
          taxAmount: template.taxAmount,
          paymentMode: template.paymentMode,
          description: template.description
            ? `[Recurring ${template.recurringNumber}] ${template.description}`
            : `Recurring expense ${template.recurringNumber}`,
          status: 'submitted',
          recurringExpenseId: template.id,
        },
        userId,
      );
      generated += 1;

      // Advance next due date
      const next = this.computeNextDue(
        template.nextDueDate,
        template.frequency,
        template.intervalDays,
      );
      await this.database.recurringExpenses.update(template.id, {
        nextDueDate: next,
        lastGeneratedAt: new Date().toISOString(),
      } as any);
    }
    if (generated > 0) {
      await this.audit.log({
        userId,
        event: 'expense.recurring_generated',
        resource: 'expense',
        action: 'generate',
        details: { generated, skipped },
      });
    }
    return { generated, skipped, checked: activeDue.length };
  }

  private computeNextDue(current: string, frequency: string, intervalDays?: number): string {
    const d = new Date(current);
    if (frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (frequency === 'quarterly') {
      d.setMonth(d.getMonth() + 3);
    } else if (frequency === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setDate(d.getDate() + (Number(intervalDays) || 30));
    }
    return d.toISOString().slice(0, 10);
  }

  async listRecurring() {
    const res = await this.database.recurringExpenses
      .findAll({ page: 1, pageSize: 500 } as any)
      .catch(() => ({ data: [] }));
    return res.data || [];
  }

  async updateRecurring(id: string, data: any, userId: string) {
    await this.database.recurringExpenses.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'expense.recurring_updated',
      resource: 'expense',
      action: 'update',
      details: { recurringId: id },
    });
    return { updated: true, id };
  }

  async deleteRecurring(id: string, userId: string) {
    await this.database.recurringExpenses.update(id, { isActive: false } as any);
    await this.audit.log({
      userId,
      event: 'expense.recurring_deleted',
      resource: 'expense',
      action: 'delete',
      details: { recurringId: id },
    });
    return { deleted: true, id };
  }

  // ── Dashboard + reports ────────────────────────────────
  async dashboard() {
    const [expenses, categories] = await Promise.all([
      this.database.expenses
        .findAll({ page: 1, pageSize: 5000 } as any)
        .catch(() => ({ data: [] })),
      this.database.expenseCategories
        .findAll({ page: 1, pageSize: 500 } as any)
        .catch(() => ({ data: [] })),
    ]);
    const rows = (expenses.data || []).filter((e: any) => !e.isDeleted);
    const catMap = new Map((categories.data || []).map((c: any) => [c.id, c.categoryName]));
    const monthKey = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);

    const total = rows.reduce((s: number, e: any) => s + (Number(e.totalAmount) || 0), 0);
    const thisMonth = rows
      .filter(
        (e: any) => String(e.expenseDate || '').startsWith(monthKey) && e.status !== 'rejected',
      )
      .reduce((s: number, e: any) => s + (Number(e.totalAmount) || 0), 0);
    const todayTotal = rows
      .filter((e: any) => e.expenseDate === today && e.status !== 'rejected')
      .reduce((s: number, e: any) => s + (Number(e.totalAmount) || 0), 0);
    const pendingApproval = rows.filter((e: any) => e.status === 'submitted').length;
    const paidTotal = rows
      .filter((e: any) => e.status === 'paid')
      .reduce((s: number, e: any) => s + (Number(e.totalAmount) || 0), 0);

    const byCat: Record<string, number> = {};
    for (const e of rows) {
      if (e.status === 'rejected') {
        continue;
      }
      const name = catMap.get(e.categoryId) || 'Uncategorized';
      byCat[name] = (byCat[name] || 0) + (Number(e.totalAmount) || 0);
    }
    return {
      totalExpenses: Math.round(total * 100) / 100,
      thisMonthExpenses: Math.round(thisMonth * 100) / 100,
      todayExpenses: Math.round(todayTotal * 100) / 100,
      paidExpenses: Math.round(paidTotal * 100) / 100,
      pendingApproval,
      expenseCount: rows.length,
      categoryBreakdown: Object.entries(byCat)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => b.value - a.value),
      recentExpenses: rows
        .sort((a: any, b: any) =>
          String(b.expenseDate || '').localeCompare(String(a.expenseDate || '')),
        )
        .slice(0, 8)
        .map((e: any) => ({
          id: e.id,
          expenseNumber: e.expenseNumber,
          category: catMap.get(e.categoryId) || null,
          amount: e.totalAmount,
          status: e.status,
          expenseDate: e.expenseDate,
        })),
    };
  }

  async reports(query: {
    status?: string;
    categoryId?: string;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: query.categoryId });
    }
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.dateFrom) {
      filters.push({ field: 'expenseDate', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'expenseDate', operator: 'lte', value: query.dateTo });
    }
    const res = await this.database.expenses
      .findAll({ page: 1, pageSize: 5000, ...(filters.length ? { filters } : {}) } as any)
      .catch(() => ({ data: [] }));
    const rows = (res.data || []).filter((e: any) => !e.isDeleted);
    const catIds = [...new Set(rows.map((r: any) => r.categoryId).filter(Boolean))];
    const cats = catIds.length
      ? await this.database.expenseCategories
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: catIds.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const catMap = new Map((cats.data || []).map((c: any) => [c.id, c.categoryName]));
    const total = rows.reduce((s: number, e: any) => s + (Number(e.totalAmount) || 0), 0);
    return {
      data: rows.map((e: any) => ({
        id: e.id,
        expenseNumber: e.expenseNumber,
        expenseDate: e.expenseDate,
        category: catMap.get(e.categoryId) || null,
        amount: e.amount,
        taxAmount: e.taxAmount,
        totalAmount: e.totalAmount,
        vendorId: e.vendorId,
        employeeId: e.employeeId,
        paymentMode: e.paymentMode,
        status: e.status,
        glEntryId: e.glEntryId,
      })),
      totalRows: rows.length,
      totalAmount: Math.round(total * 100) / 100,
    };
  }
}
