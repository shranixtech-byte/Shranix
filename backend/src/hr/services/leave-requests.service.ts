import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const leave = await this.database.leaveRequests.create({ ...data, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'leave.created', resource: 'leave_requests', action: 'create', details: { leaveId: leave.id } });
    return leave;
  }

  async findAll(params: { page: number; pageSize: number; status?: string; employeeId?: string }) { return this.database.leaveRequests.findAll(params); }
  async findById(id: string) { return this.database.leaveRequests.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.leaveRequests.update(id, data);
    await this.audit.log({ userId, event: 'leave.updated', resource: 'leave_requests', action: 'update', details: { leaveId: id } });
    return updated;
  }

  async approve(id: string, userId: string) {
    await this.database.leaveRequests.update(id, { status: 'approved', approvedBy: userId, approvedAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'leave.approved', resource: 'leave_requests', action: 'approve', details: { leaveId: id } });
    return { approved: true, id };
  }

  async reject(id: string, userId: string) {
    await this.database.leaveRequests.update(id, { status: 'rejected', approvedBy: userId, approvedAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'leave.rejected', resource: 'leave_requests', action: 'reject', details: { leaveId: id } });
    return { rejected: true, id };
  }

  async softDelete(id: string): Promise<void> {
    await this.database.leaveRequests.softDelete(id);
  }
}
