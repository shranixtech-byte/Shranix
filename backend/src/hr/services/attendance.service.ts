import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const ATT_STATUSES = [
  'present',
  'absent',
  'half_day',
  'late',
  'early_exit',
  'work_from_home',
  'holiday',
  'leave',
];

@Injectable()
export class AttendanceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Mark attendance for an employee/date. Duplicate (employee + date) is
   * prevented by a UNIQUE index — an upsert-style update is returned instead.
   */
  async mark(data: any, userId: string) {
    if (!data.employeeId || !data.attendanceDate) {
      throw new BadRequestException('employeeId and attendanceDate are required');
    }
    if (data.status && !ATT_STATUSES.includes(data.status)) {
      throw new BadRequestException(`Invalid attendance status: ${data.status}`);
    }

    // Recompute working/overtime hours from check-in/out when possible.
    let workingHours = data.workingHours;
    let overtimeHours = data.overtimeHours || 0;
    if (data.checkIn && data.checkOut && workingHours === undefined) {
      const start = new Date(`1970-01-01T${data.checkIn}`);
      const end = new Date(`1970-01-01T${data.checkOut}`);
      let hours = (end.getTime() - start.getTime()) / 3_600_000;
      if (hours < 0) {
        hours += 24;
      }
      workingHours = Math.round(hours * 100) / 100;
      const shift = data.shiftId
        ? await this.database.shifts.findById(data.shiftId).catch(() => null)
        : null;
      const thresholdHours = (shift?.overtimeThresholdMinutes ?? 540) / 60;
      if (workingHours > thresholdHours) {
        overtimeHours = Math.round((workingHours - thresholdHours) * 100) / 100;
      }
    }

    const existing = await this.database.attendance
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'employeeId', operator: 'eq', value: data.employeeId },
          { field: 'attendanceDate', operator: 'eq', value: data.attendanceDate },
        ],
      } as any)
      .catch(() => ({ data: [] }));

    if ((existing.data || []).length > 0) {
      // Update the existing record (unique constraint satisfied by update).
      const record = existing.data[0];
      const updated = await this.database.attendance.update(record.id, {
        ...data,
        workingHours: workingHours ?? record.workingHours,
        overtimeHours,
        markedBy: userId,
      } as any);
      await this.audit.log({
        userId,
        event: 'attendance.modified',
        resource: 'hr',
        action: 'update',
        details: {
          attendanceId: record.id,
          employeeId: data.employeeId,
          date: data.attendanceDate,
        },
      });
      return updated;
    }

    const record = await this.database.attendance.create({
      employeeId: data.employeeId,
      attendanceDate: data.attendanceDate,
      checkIn: data.checkIn || null,
      checkOut: data.checkOut || null,
      workingHours: workingHours ?? null,
      overtimeHours,
      status: data.status || 'present',
      remarks: data.remarks || null,
      markedBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'attendance.created',
      resource: 'hr',
      action: 'create',
      details: { attendanceId: record.id, employeeId: data.employeeId, date: data.attendanceDate },
    });
    return record;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    month?: string;
  }) {
    const filters: any[] = [];
    if (query.employeeId) {
      filters.push({ field: 'employeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.dateFrom) {
      filters.push({ field: 'attendanceDate', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'attendanceDate', operator: 'lte', value: query.dateTo });
    }
    if (query.month) {
      filters.push({ field: 'attendanceDate', operator: 'gte', value: `${query.month}-01` });
      filters.push({ field: 'attendanceDate', operator: 'lte', value: `${query.month}-31` });
    }
    const result = await this.database.attendance.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(filters.length ? { filters } : {}),
    } as any);

    // Attach employee names
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

  /** Daily attendance summary for the HR dashboard. */
  async dailySummary(date: string) {
    const res = await this.database.attendance
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'attendanceDate', operator: 'eq', value: date }],
      } as any)
      .catch(() => ({ data: [] }));
    const rows = res.data || [];
    const count = (s: string) => rows.filter((r: any) => r.status === s).length;
    return {
      date,
      present: count('present') + count('half_day') + count('work_from_home'),
      late: count('late'),
      absent: count('absent'),
      leave: count('leave'),
      halfDay: count('half_day'),
      workFromHome: count('work_from_home'),
      total: rows.length,
    };
  }

  async remove(id: string, userId: string) {
    const rec = await this.database.attendance.findById(id);
    if (!rec || rec.isDeleted) {
      throw new NotFoundException('Attendance record not found');
    }
    await this.database.attendance.softDelete(id);
    await this.audit.log({
      userId,
      event: 'attendance.deleted',
      resource: 'hr',
      action: 'delete',
      details: { attendanceId: id },
    });
    return { deleted: true };
  }
}
