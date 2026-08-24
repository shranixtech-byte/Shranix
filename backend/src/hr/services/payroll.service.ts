import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SalaryStructuresService {
  constructor(private readonly database: DatabaseService) {}

  async create(data: any, userId: string) {
    if (!data.employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    // Deactivate previous active structure for the employee
    const prev = await this.database.salaryStructures
      .findAll({
        page: 1,
        pageSize: 50,
        filters: [
          { field: 'employeeId', operator: 'eq', value: data.employeeId },
          { field: 'isActive', operator: 'eq', value: true },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    for (const row of prev.data || []) {
      await this.database.salaryStructures.update(row.id, { isActive: false } as any);
    }
    return this.database.salaryStructures.create({
      ...data,
      isActive: true,
      effectiveFrom: data.effectiveFrom || new Date().toISOString(),
      createdBy: userId,
    } as any);
  }

  async getActive(employeeId: string) {
    const res = await this.database.salaryStructures
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'employeeId', operator: 'eq', value: employeeId },
          { field: 'isActive', operator: 'eq', value: true },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || [])[0] || null;
  }

  async list(query: { page?: number; pageSize?: number; employeeId?: string }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    return this.database.salaryStructures.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async update(id: string, data: any) {
    return this.database.salaryStructures.update(id, data as any);
  }
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly salaries: SalaryStructuresService,
  ) {}

  async nextRunNumber(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.payrollRuns.maxFieldValue('runNumber');
      if (maxVal) {
        const m = /PR-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `PR-${String(max + 1).padStart(4, '0')}`;
  }

  /** Compute one employee's payroll line from structure + attendance. */
  private async computeLine(employeeId: string, startDate: string, endDate: string): Promise<any> {
    const structure = await this.salaries.getActive(employeeId);
    if (!structure) {
      return null;
    }
    const num = (v: any) => Number(v) || 0;

    // Attendance days in period (present/half_day/work_from_home/late count; half_day = 0.5)
    const att = await this.database.attendance
      .findAll({
        page: 1,
        pageSize: 500,
        filters: [
          { field: 'employeeId', operator: 'eq', value: employeeId },
          { field: 'attendanceDate', operator: 'gte', value: startDate },
          { field: 'attendanceDate', operator: 'lte', value: endDate },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    let attendanceDays = 0;
    let overtimeHours = 0;
    for (const a of att.data || []) {
      if (['present', 'work_from_home', 'late'].includes(a.status)) {
        attendanceDays += 1;
      } else if (a.status === 'half_day') {
        attendanceDays += 0.5;
      }
      overtimeHours += Number(a.overtimeHours) || 0;
    }
    if (attendanceDays === 0) {
      // No attendance marked → count working days in the period as default present
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
          attendanceDays += 1;
        }
      }
    }

    const basicSalary = num(structure.basicSalary);
    const hra = num(structure.hra);
    const allowances = num(structure.allowances);
    const bonus = num(structure.bonus);
    const incentives = num(structure.incentives);
    const otherEarnings = num(structure.otherEarnings);
    const overtimeAmount = Math.round(num(structure.overtimeRate) * overtimeHours * 100) / 100;
    const grossSalary =
      Math.round(
        (basicSalary + hra + allowances + bonus + incentives + otherEarnings + overtimeAmount) *
          100,
      ) / 100;

    const pf = num(structure.pf);
    const esi = num(structure.esi);
    const professionalTax = num(structure.professionalTax);
    const tds = num(structure.tds);
    const loanRecovery = num(structure.loanRecovery);
    const otherDeductions = num(structure.otherDeductions);
    const totalDeductions =
      Math.round((pf + esi + professionalTax + tds + loanRecovery + otherDeductions) * 100) / 100;
    const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

    return {
      payrollRunId: null,
      employeeId,
      attendanceDays,
      overtimeHours,
      overtimeAmount,
      basicSalary,
      hra,
      allowances,
      bonus,
      incentives,
      otherEarnings,
      grossSalary,
      pf,
      esi,
      professionalTax,
      tds,
      loanRecovery,
      otherDeductions,
      totalDeductions,
      netSalary,
    };
  }

  /** Generate a payroll run for a period (draft). */
  async generateRun(data: any, userId: string) {
    if (!data.payPeriodStart || !data.payPeriodEnd) {
      throw new BadRequestException('payPeriodStart and payPeriodEnd are required');
    }
    const runNumber = data.runNumber || (await this.nextRunNumber());
    const employees = await this.database.employees
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'status', operator: 'eq', value: 'active' }],
      } as any)
      .catch(() => ({ data: [] }));

    const run = await this.database.payrollRuns.create({
      runNumber,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      employeeCount: 0,
      grossTotal: 0,
      deductionTotal: 0,
      netTotal: 0,
      status: 'draft',
      createdBy: userId,
    } as any);

    let grossTotal = 0;
    let deductionTotal = 0;
    let netTotal = 0;
    let count = 0;
    for (const emp of (employees.data || []) as any[]) {
      const line = await this.computeLine(emp.id, data.payPeriodStart, data.payPeriodEnd);
      if (!line) {
        continue;
      }
      await this.database.payrollLines.create({ ...line, payrollRunId: run.id } as any);
      grossTotal += line.grossSalary;
      deductionTotal += line.totalDeductions;
      netTotal += line.netSalary;
      count += 1;
    }

    await this.database.payrollRuns.update(run.id, {
      employeeCount: count,
      grossTotal: Math.round(grossTotal * 100) / 100,
      deductionTotal: Math.round(deductionTotal * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,
    } as any);

    await this.audit.log({
      userId,
      event: 'payroll.generated',
      resource: 'hr',
      action: 'create',
      details: { payrollRunId: run.id, runNumber, employees: count },
    });
    return this.database.payrollRuns.findById(run.id);
  }

  /** Approve a payroll run (marks payable). */
  async approveRun(id: string, userId: string) {
    const run = await this.database.payrollRuns.findById(id);
    if (!run || run.isDeleted) {
      throw new NotFoundException('Payroll run not found');
    }
    if (run.status !== 'draft') {
      throw new BadRequestException(`Payroll run already ${run.status}`);
    }
    await this.database.payrollRuns.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    } as any);
    await this.audit.log({
      userId,
      event: 'payroll.approved',
      resource: 'hr',
      action: 'approve',
      details: { payrollRunId: id },
    });
    return { approved: true, id };
  }

  /** Mark a payroll run as paid. */
  async markPaid(id: string, userId: string, paymentMode?: string) {
    const run = await this.database.payrollRuns.findById(id);
    if (!run || run.isDeleted) {
      throw new NotFoundException('Payroll run not found');
    }
    if (!['draft', 'approved'].includes(run.status)) {
      throw new BadRequestException(`Payroll run cannot be paid from status ${run.status}`);
    }
    const updated = await this.database.payrollRuns.update(id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentMode: paymentMode || 'bank',
    } as any);
    await this.audit.log({
      userId,
      event: 'payroll.paid',
      resource: 'hr',
      action: 'update',
      details: { payrollRunId: id },
    });
    return updated;
  }

  async findRunById(id: string) {
    const run = await this.database.payrollRuns.findById(id);
    if (!run || run.isDeleted) {
      throw new NotFoundException('Payroll run not found');
    }
    const lines = await this.database.payrollLines
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'payrollRunId', operator: 'eq', value: id }],
      } as any)
      .catch(() => ({ data: [] }));
    const empIds = [...new Set((lines.data || []).map((l: any) => l.employeeId))];
    const emps = empIds.length
      ? await this.database.employees
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: empIds.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const empMap = new Map((emps.data || []).map((e: any) => [e.id, e]));
    return {
      ...run,
      lines: (lines.data || []).map((l: any) => {
        const emp = empMap.get(l.employeeId) || {};
        return {
          ...l,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        };
      }),
    };
  }

  async listRuns(query: { page?: number; pageSize?: number; status?: string }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    return this.database.payrollRuns.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  /** Payslip data for an employee for a period. */
  async payslip(employeeId: string, payrollRunId?: string) {
    const filters: any[] = [{ field: 'employeeId', operator: 'eq', value: employeeId }];
    if (payrollRunId) {
      filters.push({ field: 'payrollRunId', operator: 'eq', value: payrollRunId });
    }
    const lines = await this.database.payrollLines
      .findAll({
        page: 1,
        pageSize: 1,
        filters,
      } as any)
      .catch(() => ({ data: [] }));
    const line = (lines.data || [])[0];
    if (!line) {
      return null;
    }
    const [emp, run, _dept, _desig] = await Promise.all([
      this.database.employees.findById(employeeId).catch(() => null),
      this.database.payrollRuns.findById(line.payrollRunId).catch(() => null),
      null,
      null,
    ]);
    return {
      employee: emp
        ? {
            code: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
            pan: emp.pan,
            bankAccount: emp.bankAccount,
            ifsc: emp.ifsc,
          }
        : null,
      run,
      line,
    };
  }
}
