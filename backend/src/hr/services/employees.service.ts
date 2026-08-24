import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Next sequential employee code — EMP-000001, EMP-000002 …
   * Uses maxFieldValue() which scans ALL rows — including soft-deleted —
   * because the unique index on employeeCode prevents code reuse after soft-delete. */
  async nextEmployeeCode(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.employees.maxFieldValue('employeeCode');
      if (maxVal) {
        const m = /EMP-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `EMP-${String(max + 1).padStart(6, '0')}`;
  }

  async create(data: any, userId: string) {
    if (!data.firstName) {
      throw new BadRequestException('firstName is required');
    }
    // Race-safety: auto-code is a read-then-write max-scan. Two concurrent
    // creates can allocate the same code → UNIQUE error. Retry with a fresh
    // number (same pattern as PO / invoice numbering).
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await this.createOnce(data, userId);
      } catch (err: any) {
        const isDuplicate = /UNIQUE|already exists|employee_code|employeeCode/i.test(
          String(err?.message || ''),
        );
        if (!isDuplicate || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique employee code');
  }

  private async createOnce(data: any, userId: string) {
    const employeeCode = data.employeeCode || (await this.nextEmployeeCode());
    const clean = {
      ...data,
      id: undefined,
      employeeCode,
      status: data.status || 'active',
      employmentType: data.employmentType || 'full_time',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    const emp = await this.database.employees.create(clean as any);
    await this.addTimeline(
      emp.id,
      'joined',
      'Employee joined',
      `${data.firstName} joined the organization`,
      data.joiningDate || new Date().toISOString(),
      userId,
    );
    await this.audit.log({
      userId,
      event: 'employee.created',
      resource: 'hr',
      action: 'create',
      details: { employeeId: emp.id, employeeCode },
    });
    return emp;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    departmentId?: string;
    designationId?: string;
    employmentType?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.departmentId) {
      filters.push({ field: 'departmentId', operator: 'eq', value: query.departmentId });
    }
    if (query.designationId) {
      filters.push({ field: 'designationId', operator: 'eq', value: query.designationId });
    }
    if (query.employmentType) {
      filters.push({ field: 'employmentType', operator: 'eq', value: query.employmentType });
    }
    const result = await this.database.employees.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(query.search
        ? {
            search: query.search,
            searchFields: ['employeeCode', 'firstName', 'lastName', 'mobile', 'email', 'pan'],
          }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
    return result;
  }

  async findById(id: string) {
    const emp = await this.database.employees.findById(id);
    if (!emp || emp.isDeleted) {
      throw new NotFoundException('Employee not found');
    }
    // Attach department/designation names + timeline
    const [dept, desig, timeline] = await Promise.all([
      emp.departmentId
        ? this.database.departments.findById(emp.departmentId).catch(() => null)
        : null,
      emp.designationId
        ? this.database.designations.findById(emp.designationId).catch(() => null)
        : null,
      this.database.employeeTimeline
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'employeeId', operator: 'eq', value: id }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    return {
      ...emp,
      departmentName: dept?.departmentName || null,
      designationName: desig?.designationName || null,
      timeline: timeline?.data || [],
    };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.employees.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Employee not found');
    }
    // Lifecycle tracking — never overwrite history, add timeline events.
    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const dept = await this.database.departments.findById(data.departmentId).catch(() => null);
      await this.addTimeline(
        id,
        'department_changed',
        'Department changed',
        `Moved to ${dept?.departmentName || data.departmentId}`,
        new Date().toISOString(),
        userId,
      );
    }
    if (data.designationId && data.designationId !== existing.designationId) {
      const desig = await this.database.designations.findById(data.designationId).catch(() => null);
      await this.addTimeline(
        id,
        'designation_changed',
        'Designation changed',
        `Promoted to ${desig?.designationName || data.designationId}`,
        new Date().toISOString(),
        userId,
      );
    }
    if (data.status && data.status !== existing.status) {
      await this.addTimeline(
        id,
        data.status === 'resigned'
          ? 'resigned'
          : data.status === 'terminated'
            ? 'terminated'
            : data.status === 'retired'
              ? 'retired'
              : 'status_changed',
        `Status: ${data.status}`,
        `Employee status changed from ${existing.status} to ${data.status}`,
        new Date().toISOString(),
        userId,
      );
    }
    const updated = await this.database.employees.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'employee.updated',
      resource: 'hr',
      action: 'update',
      details: { employeeId: id },
    });
    return updated;
  }

  /** Map a user account to an employee (user↔employee integration). */
  async mapUser(id: string, userId: string, username?: string) {
    const emp = await this.database.employees.findById(id);
    if (!emp || emp.isDeleted) {
      throw new NotFoundException('Employee not found');
    }
    let targetUserId = userId;
    if (username) {
      const users = await this.database.users
        .findAll({
          page: 1,
          pageSize: 1,
          search: username,
          searchFields: ['username', 'email'],
        } as any)
        .catch(() => ({ data: [] }));
      targetUserId = (users.data || [])[0]?.id || userId;
    }
    await this.database.employees.update(id, { userId: targetUserId } as any);
    await this.addTimeline(
      id,
      'user_mapped',
      'User account mapped',
      `ERP user ${username || targetUserId} mapped`,
      new Date().toISOString(),
      userId,
    );
    return { mapped: true, employeeId: id, userId: targetUserId };
  }

  async addTimeline(
    employeeId: string,
    eventType: string,
    title: string,
    description: string,
    eventDate: string,
    createdBy?: string,
  ) {
    return this.database.employeeTimeline
      .create({
        employeeId,
        eventType,
        title,
        description: description || null,
        eventDate: eventDate || new Date().toISOString(),
        createdBy: createdBy || null,
      } as any)
      .catch(() => undefined);
  }

  async softDelete(id: string, userId: string) {
    const emp = await this.database.employees.findById(id);
    if (!emp || emp.isDeleted) {
      throw new NotFoundException('Employee not found');
    }
    await this.database.employees.softDelete(id);
    await this.audit.log({
      userId,
      event: 'employee.deleted',
      resource: 'hr',
      action: 'delete',
      details: { employeeId: id },
    });
    return { deleted: true };
  }

  // ── HR Dashboard + Reports helpers ─────────────────────
  async dashboard() {
    const all = await this.database.employees
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    const rows = (all.data || []).filter((e: any) => !e.isDeleted);
    const active = rows.filter((e: any) => e.status === 'active');
    const today = new Date().toISOString().slice(0, 10);

    const [pendingLeaves, todayAttendance, departments, payrollRuns, payrollLines] =
      await Promise.all([
        this.database.leaveRequests
          .findAll({
            page: 1,
            pageSize: 100,
            filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.attendance
          .findAll({
            page: 1,
            pageSize: 5000,
            filters: [{ field: 'attendanceDate', operator: 'eq', value: today }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.departments
          .findAll({ page: 1, pageSize: 100 } as any)
          .catch(() => ({ data: [] })),
        this.database.payrollRuns
          .findAll({ page: 1, pageSize: 100 } as any)
          .catch(() => ({ data: [] })),
        this.database.payrollLines
          .findAll({ page: 1, pageSize: 5000 } as any)
          .catch(() => ({ data: [] })),
      ]);

    const deptMap = new Map(
      (departments.data || []).map((d: any) => [d.id, d.departmentName || d.id]),
    );
    const byDept: Record<string, number> = {};
    for (const e of rows) {
      const name = deptMap.get(e.departmentId) || 'Unassigned';
      byDept[name] = (byDept[name] || 0) + 1;
    }

    const attendance = todayAttendance.data || [];
    const present = attendance.filter((a: any) =>
      ['present', 'half_day', 'late', 'work_from_home'].includes(a.status),
    ).length;
    const onLeave = attendance.filter((a: any) => a.status === 'leave').length;
    const late = attendance.filter((a: any) => a.status === 'late').length;
    const absent = attendance.filter((a: any) => a.status === 'absent').length;

    // Payroll pending = approved runs not yet paid
    const pendingPayroll = (payrollRuns.data || []).filter(
      (r: any) => r.status === 'approved',
    ).length;
    const netTotal = (payrollLines.data || []).reduce(
      (s: number, l: any) => s + (Number(l.netSalary) || 0),
      0,
    );

    return {
      totalEmployees: rows.length,
      activeEmployees: active.length,
      inactiveEmployees: rows.length - active.length,
      onLeaveToday: onLeave,
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      pendingLeaveRequests: (pendingLeaves.data || []).length,
      pendingPayroll,
      totalPayrollNet: Math.round(netTotal * 100) / 100,
      departmentDistribution: Object.entries(byDept).map(([name, count]) => ({ name, count })),
      recentJoining: rows
        .sort((a: any, b: any) =>
          String(b.joiningDate || '').localeCompare(String(a.joiningDate || '')),
        )
        .slice(0, 8)
        .map((e: any) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          name: `${e.firstName} ${e.lastName || ''}`.trim(),
          department: deptMap.get(e.departmentId) || null,
          joiningDate: e.joiningDate,
          status: e.status,
        })),
    };
  }

  async reports(query: { status?: string; departmentId?: string }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.departmentId) {
      filters.push({ field: 'departmentId', operator: 'eq', value: query.departmentId });
    }
    const all = await this.database.employees
      .findAll({
        page: 1,
        pageSize: 5000,
        ...(filters.length ? { filters } : {}),
      } as any)
      .catch(() => ({ data: [] }));
    const [depts, desigs] = await Promise.all([
      this.database.departments
        .findAll({ page: 1, pageSize: 100 } as any)
        .catch(() => ({ data: [] })),
      this.database.designations
        .findAll({ page: 1, pageSize: 100 } as any)
        .catch(() => ({ data: [] })),
    ]);
    const deptMap = new Map((depts.data || []).map((d: any) => [d.id, d.departmentName]));
    const desigMap = new Map((desigs.data || []).map((d: any) => [d.id, d.designationName]));
    const rows = (all.data || []).map((e: any) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: `${e.firstName} ${e.lastName || ''}`.trim(),
      mobile: e.mobile,
      email: e.email,
      department: deptMap.get(e.departmentId) || null,
      designation: desigMap.get(e.designationId) || null,
      employmentType: e.employmentType,
      joiningDate: e.joiningDate,
      status: e.status,
    }));
    return { data: rows, total: rows.length };
  }
}
