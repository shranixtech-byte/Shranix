import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const LEAVE_TYPES = ['casual', 'sick', 'earned', 'paid', 'unpaid', 'other'];

/** Default opening balance per leave type (configurable per type via allocation). */
const DEFAULT_OPENING: Record<string, number> = {
  casual: 12,
  sick: 12,
  earned: 12,
  paid: 0,
  unpaid: 0,
  other: 0,
};

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Working-day count between two dates (Mon–Fri). */
  private workingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
    }
    return Math.max(1, count);
  }

  /** Get or create a leave balance row for an employee + type. */
  async getBalance(employeeId: string, leaveType: string): Promise<any> {
    const res = await this.database.leaveBalances
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'employeeId', operator: 'eq', value: employeeId },
          { field: 'leaveType', operator: 'eq', value: leaveType },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((res.data || []).length > 0) {
      const row = res.data[0];
      return {
        ...row,
        available:
          Math.round(
            ((Number(row.openingBalance) || 0) +
              (Number(row.allocated) || 0) -
              (Number(row.used) || 0) -
              (Number(row.pending) || 0)) *
              100,
          ) / 100,
      };
    }
    return {
      employeeId,
      leaveType,
      openingBalance: DEFAULT_OPENING[leaveType] || 0,
      allocated: 0,
      used: 0,
      pending: 0,
      available: DEFAULT_OPENING[leaveType] || 0,
    };
  }

  async balances(employeeId: string) {
    const all = await this.database.leaveBalances
      .findAll({
        page: 1,
        pageSize: 50,
        filters: [{ field: 'employeeId', operator: 'eq', value: employeeId }],
      } as any)
      .catch(() => ({ data: [] }));
    const map = new Map((all.data || []).map((r: any) => [r.leaveType, r]));
    return LEAVE_TYPES.map((t) => {
      const row = map.get(t);
      const opening = Number(row?.openingBalance) || 0;
      const allocated = Number(row?.allocated) || 0;
      const used = Number(row?.used) || 0;
      const pending = Number(row?.pending) || 0;
      return {
        leaveType: t,
        openingBalance: opening,
        allocated,
        used,
        pending,
        available: Math.round((opening + allocated - used - pending) * 100) / 100,
      };
    });
  }

  /** Allocate leave (opening or annual allocation) to an employee. */
  async allocate(
    employeeId: string,
    leaveType: string,
    days: number,
    opening = false,
    userId?: string,
  ) {
    const res = await this.database.leaveBalances
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'employeeId', operator: 'eq', value: employeeId },
          { field: 'leaveType', operator: 'eq', value: leaveType },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((res.data || []).length > 0) {
      const row = res.data[0];
      const updates = opening
        ? { openingBalance: (Number(row.openingBalance) || 0) + days }
        : { allocated: (Number(row.allocated) || 0) + days };
      return this.database.leaveBalances.update(row.id, updates as any);
    }
    return this.database.leaveBalances.create({
      employeeId,
      leaveType,
      openingBalance: opening ? days : 0,
      allocated: opening ? 0 : days,
      used: 0,
      pending: 0,
      createdBy: userId || null,
    } as any);
  }

  async create(data: any, userId: string) {
    if (!data.employeeId || !data.startDate || !data.endDate) {
      throw new BadRequestException('employeeId, startDate and endDate are required');
    }
    const leaveType = data.leaveType || 'casual';
    if (!LEAVE_TYPES.includes(leaveType)) {
      throw new BadRequestException(`Invalid leave type: ${leaveType}`);
    }
    const numberOfDays = data.numberOfDays || this.workingDays(data.startDate, data.endDate);

    // Negative balance guard (unless explicitly allowed)
    const balance = await this.getBalance(data.employeeId, leaveType);
    if (leaveType !== 'unpaid' && Number(balance.available) < numberOfDays) {
      throw new BadRequestException(
        `Insufficient ${leaveType} leave balance — available ${balance.available}, requested ${numberOfDays}`,
      );
    }

    const leave = await this.database.leaveRequests.create({
      employeeId: data.employeeId,
      leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      numberOfDays,
      reason: data.reason || null,
      attachmentRef: data.attachmentRef || null,
      status: 'pending',
      createdBy: userId,
    } as any);

    // Reserve pending days in balance
    if (Number(balance.available) > 0) {
      await this.updateBalanceReservation(data.employeeId, leaveType, 'pending', +numberOfDays);
    }
    await this.audit.log({
      userId,
      event: 'leave.submitted',
      resource: 'hr',
      action: 'create',
      details: { leaveId: leave.id, days: numberOfDays },
    });
    return leave;
  }

  private async updateBalanceReservation(
    employeeId: string,
    leaveType: string,
    field: 'used' | 'pending',
    delta: number,
  ) {
    const res = await this.database.leaveBalances
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'employeeId', operator: 'eq', value: employeeId },
          { field: 'leaveType', operator: 'eq', value: leaveType },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((res.data || []).length === 0) {
      // Auto-create a balance row (fresh employee, e.g. first leave). Seed the
      // default opening balance so the computed available never goes negative
      // for a brand-new employee who takes leave before any allocation.
      await this.database.leaveBalances.create({
        employeeId,
        leaveType,
        openingBalance: DEFAULT_OPENING[leaveType] || 0,
        allocated: 0,
        used: field === 'used' ? delta : 0,
        pending: field === 'pending' ? delta : 0,
      } as any);
      return;
    }
    const row = res.data[0];
    const updates: Record<string, number> = {};
    if (field === 'pending') {
      updates.pending = Math.max(0, (Number(row.pending) || 0) + delta);
    } else {
      updates.used = Math.max(0, (Number(row.used) || 0) + delta);
    }
    await this.database.leaveBalances.update(row.id, updates as any);
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    status?: string;
    leaveType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.leaveType) {
      filters.push({ field: 'leaveType', operator: 'eq', value: query.leaveType });
    }
    if (query.dateFrom) {
      filters.push({ field: 'startDate', operator: 'gte', value: query.dateFrom });
    }
    const result = await this.database.leaveRequests.findAll({
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

  async findById(id: string) {
    const leave = await this.database.leaveRequests.findById(id);
    if (!leave || leave.isDeleted) {
      throw new NotFoundException('Leave request not found');
    }
    return leave;
  }

  async approve(id: string, userId: string, remarks?: string) {
    const leave = await this.database.leaveRequests.findById(id);
    if (!leave || leave.isDeleted) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException(`Leave already ${leave.status}`);
    }
    await this.database.leaveRequests.update(id, {
      status: 'approved',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      remarks: remarks || leave.remarks,
    } as any);
    // Move pending → used
    await this.updateBalanceReservation(
      leave.employeeId,
      leave.leaveType,
      'pending',
      -(Number(leave.numberOfDays) || 0),
    );
    await this.updateBalanceReservation(
      leave.employeeId,
      leave.leaveType,
      'used',
      +(Number(leave.numberOfDays) || 0),
    );
    await this.audit.log({
      userId,
      event: 'leave.approved',
      resource: 'hr',
      action: 'approve',
      details: { leaveId: id },
    });
    return { approved: true, id };
  }

  async reject(id: string, userId: string, remarks?: string) {
    const leave = await this.database.leaveRequests.findById(id);
    if (!leave || leave.isDeleted) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'pending') {
      throw new BadRequestException(`Leave already ${leave.status}`);
    }
    await this.database.leaveRequests.update(id, {
      status: 'rejected',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      remarks: remarks || leave.remarks,
    } as any);
    // Release pending reservation
    await this.updateBalanceReservation(
      leave.employeeId,
      leave.leaveType,
      'pending',
      -(Number(leave.numberOfDays) || 0),
    );
    await this.audit.log({
      userId,
      event: 'leave.rejected',
      resource: 'hr',
      action: 'reject',
      details: { leaveId: id },
    });
    return { rejected: true, id };
  }

  async cancel(id: string, userId: string) {
    const leave = await this.database.leaveRequests.findById(id);
    if (!leave || leave.isDeleted) {
      throw new NotFoundException('Leave request not found');
    }
    if (['approved', 'pending'].includes(leave.status)) {
      await this.updateBalanceReservation(
        leave.employeeId,
        leave.leaveType,
        'pending',
        -(Number(leave.numberOfDays) || 0),
      );
      if (leave.status === 'approved') {
        await this.updateBalanceReservation(
          leave.employeeId,
          leave.leaveType,
          'used',
          -(Number(leave.numberOfDays) || 0),
        );
      }
    }
    await this.database.leaveRequests.update(id, { status: 'cancelled' } as any);
    await this.audit.log({
      userId,
      event: 'leave.cancelled',
      resource: 'hr',
      action: 'cancel',
      details: { leaveId: id },
    });
    return { cancelled: true, id };
  }

  async softDelete(id: string, _userId: string) {
    await this.database.leaveRequests.softDelete(id);
    return { deleted: true };
  }
}
