import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

export const FOLLOW_UP_TYPES = [
  'phone',
  'whatsapp',
  'email',
  'meeting',
  'visit',
  'demo',
  'quotation_discussion',
  'payment_followup',
  'other',
] as const;
export const FOLLOW_UP_STATUSES = ['scheduled', 'completed', 'missed', 'cancelled'] as const;
export const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'] as const;
export const MEETING_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled'] as const;

// ═══════════════════════════════════════════════════════════════════
// FOLLOW-UPS (+ reminders)
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class FollowUpsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.scheduledAt) {
      throw new BadRequestException('scheduledAt is required');
    }
    const record = await this.database.followUps.create({
      ...data,
      status: data.status || 'scheduled',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);
    await this.logActivity(record, 'follow_up.created', 'Follow-up scheduled', userId);
    await this.audit.log({
      userId,
      event: 'followup.created',
      resource: 'follow_ups',
      action: 'create',
      details: { followUpId: record.id },
    });
    return record;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    leadId?: string;
    customerId?: string;
    salesperson?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: query.leadId });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.salesperson) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: query.salesperson });
    }
    if (query.dateFrom) {
      filters.push({ field: 'scheduledAt', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'scheduledAt', operator: 'lte', value: query.dateTo });
    }
    return this.database.followUps.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  /** Reminder buckets: upcoming / due today / overdue / missed. */
  async reminders() {
    const all = await this.database.followUps
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'status', operator: 'eq', value: 'scheduled' }],
      } as any)
      .catch(() => ({ data: [] }));
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const upcoming: any[] = [];
    const dueToday: any[] = [];
    const overdue: any[] = [];
    for (const f of all.data || []) {
      const d = new Date(`${String(f.scheduledAt || '').slice(0, 10)}T00:00:00`);
      if (Number.isNaN(d.getTime())) {
        continue;
      }
      if (d < startOfDay) {
        overdue.push(f);
      } else if (d < endOfDay) {
        dueToday.push(f);
      } else {
        upcoming.push(f);
      }
    }
    const missed = await this.database.followUps
      .findAll({
        page: 1,
        pageSize: 100,
        filters: [{ field: 'status', operator: 'eq', value: 'missed' }],
      } as any)
      .catch(() => ({ data: [] }));
    return { upcoming, dueToday, overdue, missed: missed.data || [] };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.followUps.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Follow-up not found');
    }
    const updated = await this.database.followUps.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'followup.updated',
      resource: 'follow_ups',
      action: 'update',
      details: { followUpId: id },
    });
    return updated;
  }

  /** Complete a follow-up (records outcome + next follow-up, creates next if requested). */
  async complete(id: string, userId: string, data: { outcome?: string; nextFollowUpAt?: string }) {
    const existing = await this.database.followUps.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Follow-up not found');
    }
    if (existing.status !== 'scheduled') {
      throw new BadRequestException(
        `Only scheduled follow-ups can be completed (current: ${existing.status})`,
      );
    }
    const updated = await this.database.followUps.update(id, {
      status: 'completed',
      outcome: data.outcome ?? existing.outcome,
      nextFollowUpAt: data.nextFollowUpAt ?? existing.nextFollowUpAt,
      completedAt: new Date().toISOString(),
      completedBy: userId,
    } as any);
    if (data.nextFollowUpAt) {
      await this.create(
        {
          leadId: existing.leadId,
          customerId: existing.customerId,
          assignedTo: existing.assignedTo,
          followUpType: existing.followUpType,
          scheduledAt: data.nextFollowUpAt,
          priority: existing.priority,
          purpose: `Follow-up (from ${existing.id})`,
        },
        userId,
      );
    }
    await this.logActivity(
      existing,
      'follow_up.completed',
      'Follow-up completed',
      userId,
      data.outcome,
    );
    await this.audit.log({
      userId,
      event: 'followup.completed',
      resource: 'follow_ups',
      action: 'complete',
      details: { followUpId: id },
    });
    return updated;
  }

  async markMissed(id: string, userId: string) {
    const existing = await this.database.followUps.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Follow-up not found');
    }
    if (existing.status !== 'scheduled') {
      throw new BadRequestException(
        `Only scheduled follow-ups can be marked as missed (current: ${existing.status})`,
      );
    }
    return this.database.followUps.update(id, { status: 'missed', updatedBy: userId } as any);
  }

  private async logActivity(
    fu: any,
    type: string,
    title: string,
    userId: string,
    description?: string,
  ) {
    await this.database.leadActivities
      .create({
        leadId: fu.leadId || null,
        customerId: fu.customerId || null,
        activityType: type,
        title,
        description,
        referenceType: 'follow_up',
        referenceId: fu.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRM TASKS
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class CrmTasksService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.title) {
      throw new BadRequestException('title is required');
    }
    const task = await this.database.crmTasks.create({
      ...data,
      status: data.status || 'open',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);
    await this.logActivity(task, 'task.created', `Task: ${task.title}`, userId);
    await this.audit.log({
      userId,
      event: 'task.created',
      resource: 'crm_tasks',
      action: 'create',
      details: { taskId: task.id },
    });
    return task;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    leadId?: string;
    customerId?: string;
    salesperson?: string;
    dueBefore?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: query.leadId });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.salesperson) {
      filters.push({ field: 'assignedTo', operator: 'eq', value: query.salesperson });
    }
    if (query.dueBefore) {
      filters.push({ field: 'dueDate', operator: 'lte', value: query.dueBefore });
    }
    return this.database.crmTasks.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.crmTasks.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Task not found');
    }
    if (data.status && !TASK_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Invalid task status: ${data.status}. Must be one of: ${TASK_STATUSES.join(', ')}`,
      );
    }
    const changed: any = { ...data, updatedBy: userId };
    if (changed.status === 'completed' && existing.status !== 'completed') {
      changed.completedAt = new Date().toISOString();
      changed.completedBy = userId;
    }
    const updated = await this.database.crmTasks.update(id, changed as any);
    if (existing.status !== changed.status) {
      await this.logActivity(
        existing,
        'task.completed',
        `Task ${changed.status}: ${existing.title}`,
        userId,
      );
    }
    await this.audit.log({
      userId,
      event: 'task.updated',
      resource: 'crm_tasks',
      action: 'update',
      details: { taskId: id, status: changed.status },
    });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.crmTasks.softDelete(id);
    await this.audit.log({
      userId,
      event: 'task.deleted',
      resource: 'crm_tasks',
      action: 'delete',
      details: { taskId: id },
    });
  }

  private async logActivity(task: any, type: string, title: string, userId: string) {
    await this.database.leadActivities
      .create({
        leadId: task.leadId || null,
        customerId: task.customerId || null,
        activityType: type,
        title,
        referenceType: 'task',
        referenceId: task.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CALL LOGS
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class CallLogsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.callDate) {
      throw new BadRequestException('callDate is required');
    }
    const call = await this.database.callLogs.create({
      ...data,
      direction: data.direction || 'outgoing',
      durationSeconds: Number(data.durationSeconds) || 0,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);
    await this.database.leadActivities
      .create({
        leadId: call.leadId || null,
        customerId: call.customerId || null,
        activityType: 'call',
        title: `${call.direction} call`,
        description: call.purpose || call.notes || '',
        referenceType: 'call',
        referenceId: call.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
    await this.audit.log({
      userId,
      event: 'call.created',
      resource: 'call_logs',
      action: 'create',
      details: { callId: call.id },
    });
    return call;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    leadId?: string;
    customerId?: string;
    salesperson?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const filters: any[] = [];
    if (query.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: query.leadId });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.dateFrom) {
      filters.push({ field: 'callDate', operator: 'gte', value: query.dateFrom });
    }
    if (query.dateTo) {
      filters.push({ field: 'callDate', operator: 'lte', value: query.dateTo });
    }
    return this.database.callLogs.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.callLogs.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Call log not found');
    }
    const updated = await this.database.callLogs.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'call.updated',
      resource: 'call_logs',
      action: 'update',
      details: { callId: id },
    });
    return updated;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MEETINGS
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class MeetingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.title || !data.meetingDate) {
      throw new BadRequestException('title and meetingDate are required');
    }
    const meeting = await this.database.meetings.create({
      ...data,
      status: data.status || 'scheduled',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);
    await this.logActivity(meeting, 'meeting', `Meeting: ${meeting.title}`, userId);
    await this.audit.log({
      userId,
      event: 'meeting.created',
      resource: 'meetings',
      action: 'create',
      details: { meetingId: meeting.id },
    });
    return meeting;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    status?: string;
    leadId?: string;
    customerId?: string;
    salesperson?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: query.leadId });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    return this.database.meetings.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.meetings.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Meeting not found');
    }
    if (data.status && !MEETING_STATUSES.includes(data.status)) {
      throw new BadRequestException(
        `Invalid meeting status: ${data.status}. Must be one of: ${MEETING_STATUSES.join(', ')}`,
      );
    }
    const updated = await this.database.meetings.update(id, { ...data, updatedBy: userId } as any);
    if (data.status === 'completed') {
      await this.logActivity(
        existing,
        'meeting.completed',
        `Meeting completed: ${existing.title}`,
        userId,
      );
    }
    await this.audit.log({
      userId,
      event: 'meeting.updated',
      resource: 'meetings',
      action: 'update',
      details: { meetingId: id, status: data.status },
    });
    return updated;
  }

  private async logActivity(meeting: any, type: string, title: string, userId: string) {
    await this.database.leadActivities
      .create({
        leadId: meeting.leadId || null,
        customerId: meeting.customerId || null,
        activityType: type,
        title,
        referenceType: 'meeting',
        referenceId: meeting.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRM NOTES
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class CrmNotesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.note) {
      throw new BadRequestException('note is required');
    }
    const note = await this.database.crmNotes.create({
      ...data,
      isPrivate: data.isPrivate === true || data.isPrivate === 'true',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    } as any);
    await this.database.leadActivities
      .create({
        leadId: note.leadId || null,
        customerId: note.customerId || null,
        activityType: 'note',
        title: 'Note added',
        description: String(note.note).slice(0, 200),
        referenceType: 'note',
        referenceId: note.id,
        userId,
        happenedAt: new Date().toISOString(),
        createdBy: userId,
      } as any)
      .catch(() => undefined);
    await this.audit.log({
      userId,
      event: 'note.created',
      resource: 'crm_notes',
      action: 'create',
      details: { noteId: note.id },
    });
    return note;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    leadId?: string;
    customerId?: string;
    opportunityId?: string;
    quotationId?: string;
    salesOrderId?: string;
  }) {
    const filters: any[] = [];
    if (query.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: query.leadId });
    }
    if (query.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: query.customerId });
    }
    if (query.opportunityId) {
      filters.push({ field: 'opportunityId', operator: 'eq', value: query.opportunityId });
    }
    if (query.quotationId) {
      filters.push({ field: 'quotationId', operator: 'eq', value: query.quotationId });
    }
    if (query.salesOrderId) {
      filters.push({ field: 'salesOrderId', operator: 'eq', value: query.salesOrderId });
    }
    return this.database.crmNotes.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async softDelete(id: string, userId: string) {
    await this.database.crmNotes.softDelete(id);
    await this.audit.log({
      userId,
      event: 'note.deleted',
      resource: 'crm_notes',
      action: 'delete',
      details: { noteId: id },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY TIMELINE + CUSTOMER 360
// ═══════════════════════════════════════════════════════════════════
@Injectable()
export class ActivitiesService {
  constructor(private readonly database: DatabaseService) {}

  /** Unified timeline for a lead or a customer (Customer 360). */
  async timeline(params: {
    leadId?: string;
    customerId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters: any[] = [];
    if (params.leadId) {
      filters.push({ field: 'leadId', operator: 'eq', value: params.leadId });
    }
    if (params.customerId) {
      filters.push({ field: 'customerId', operator: 'eq', value: params.customerId });
    }
    const result = await this.database.leadActivities.findAll({
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      ...(filters.length ? { filters } : {}),
    } as any);
    // Newest first
    result.data = (result.data || []).sort((a: any, b: any) =>
      String(b.happenedAt).localeCompare(String(a.happenedAt)),
    );
    return result;
  }

  /** Customer 360 — customer + transactions + CRM engagement in one payload. */
  async customer360(customerId: string) {
    const customer = await this.database.ledgerMaster.findById(customerId).catch(() => null);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const [
      invoices,
      quotations,
      orders,
      payments,
      activities,
      followUps,
      tasks,
      notes,
      calls,
      meetings,
    ] = await Promise.all([
      this.database.salesInvoices
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.salesQuotations
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.salesOrders
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.salesPayments
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.leadActivities
        .findAll({
          page: 1,
          pageSize: 100,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.followUps
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.crmTasks
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.crmNotes
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.callLogs
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
      this.database.meetings
        .findAll({
          page: 1,
          pageSize: 50,
          filters: [{ field: 'customerId', operator: 'eq', value: customerId }],
        } as any)
        .catch(() => ({ data: [], total: 0 })),
    ]);

    const outstanding = (invoices.data || [])
      .filter((i: any) => i.paymentStatus !== 'paid')
      .reduce((s: number, i: any) => s + Number(i.balanceAmount ?? i.grandTotal), 0);

    return {
      customer,
      invoices: invoices.data || [],
      quotations: quotations.data || [],
      orders: orders.data || [],
      payments: payments.data || [],
      activities: (activities.data || []).sort((a: any, b: any) =>
        String(b.happenedAt).localeCompare(String(a.happenedAt)),
      ),
      followUps: followUps.data || [],
      tasks: tasks.data || [],
      notes: notes.data || [],
      calls: calls.data || [],
      meetings: meetings.data || [],
      outstanding,
    };
  }
}
