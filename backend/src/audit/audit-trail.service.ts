import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../common/context/request-context.service';
import { DatabaseService } from '../database/database.service';

export interface AuditTrailEntry {
  id: string;
  timestamp: string | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string | null;
  actionType: string | null;
  entityType: string | null;
  entityId: string | null;
  module: string | null;
  status: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changes: { field: string; old: unknown; new: unknown }[] | null;
  remarks: string | null;
}

export interface AuditTrailQuery {
  page: number;
  pageSize: number;
  search?: string;
  module?: string;
  entityType?: string;
  action?: string;
  actionType?: string;
  userId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

const SEARCH_FIELDS = [
  'entityType',
  'action',
  'actionType',
  'userName',
  'module',
  'ipAddress',
  'remarks',
];

function parseJson(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

@Injectable()
export class AuditTrailService {
  constructor(private readonly database: DatabaseService) {}

  private mapRow(row: Record<string, unknown>): AuditTrailEntry {
    return {
      id: String(row.id || ''),
      timestamp: row.timestamp ? String(row.timestamp) : null,
      userId: row.userId ? String(row.userId) : null,
      userName: row.userName ? String(row.userName) : null,
      userRole: row.userRole ? String(row.userRole) : null,
      action: row.action ? String(row.action) : null,
      actionType: row.actionType ? String(row.actionType) : null,
      entityType: row.entityType ? String(row.entityType) : null,
      entityId: row.entityId ? String(row.entityId) : null,
      module: row.module ? String(row.module) : null,
      status: row.status ? String(row.status) : null,
      ipAddress: row.ipAddress ? String(row.ipAddress) : null,
      userAgent: row.userAgent ? String(row.userAgent) : null,
      device: RequestContextService.parseDevice(row.userAgent ? String(row.userAgent) : null),
      oldValues: parseJson(row.oldValues ? String(row.oldValues) : null),
      newValues: parseJson(row.newValues ? String(row.newValues) : null),
      changes: parseJson(row.changes ? String(row.changes) : null) as AuditTrailEntry['changes'],
      remarks: row.remarks ? String(row.remarks) : null,
    };
  }

  private buildFilters(q: AuditTrailQuery): { field: string; operator: string; value: string }[] {
    const filters: { field: string; operator: string; value: string }[] = [];
    if (q.module) {
      filters.push({ field: 'module', operator: 'eq', value: q.module });
    }
    if (q.entityType) {
      filters.push({ field: 'entityType', operator: 'eq', value: q.entityType });
    }
    if (q.action) {
      filters.push({ field: 'action', operator: 'eq', value: q.action });
    }
    if (q.actionType) {
      filters.push({ field: 'actionType', operator: 'eq', value: q.actionType });
    }
    if (q.userId) {
      filters.push({ field: 'userId', operator: 'eq', value: q.userId });
    }
    if (q.from) {
      filters.push({ field: 'timestamp', operator: 'gte', value: `${q.from}T00:00:00.000Z` });
    }
    if (q.to) {
      filters.push({ field: 'timestamp', operator: 'lte', value: `${q.to}T23:59:59.999Z` });
    }
    return filters;
  }

  async findAll(q: AuditTrailQuery): Promise<{
    data: AuditTrailEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const filters = this.buildFilters(q);
    const result = await this.database.auditDetails.findAll({
      page: Math.max(1, q.page || 1),
      pageSize: Math.min(Math.max(q.pageSize || 50, 1), 200),
      search: q.search || undefined,
      searchFields: SEARCH_FIELDS,
      filters: filters.length > 0 ? filters : undefined,
      sorts: [{ field: 'timestamp', direction: 'desc' }],
    } as any);
    return {
      data: (result.data || []).map((r) => this.mapRow(r as Record<string, unknown>)),
      total: Number(result.total || 0),
      page: Number(result.page || 1),
      pageSize: Number(result.pageSize || q.pageSize || 50),
      totalPages: Number(result.totalPages || 0),
    };
  }

  /** Distinct filter values for the viewer dropdowns (from recent logs). */
  async getMeta(): Promise<{
    modules: string[];
    entityTypes: string[];
    actions: string[];
    actionTypes: string[];
  }> {
    const modules = new Set<string>();
    const entityTypes = new Set<string>();
    const actions = new Set<string>();
    const actionTypes = new Set<string>();
    const result = await this.database.auditDetails.findAll({
      page: 1,
      pageSize: 500,
      fields: ['module', 'entityType', 'action', 'actionType'],
    } as any);
    for (const row of result.data || []) {
      const r = row as Record<string, unknown>;
      if (r.module) {
        modules.add(String(r.module));
      }
      if (r.entityType) {
        entityTypes.add(String(r.entityType));
      }
      if (r.action) {
        actions.add(String(r.action));
      }
      if (r.actionType) {
        actionTypes.add(String(r.actionType));
      }
    }
    const sort = (a: string[]) => a.sort((x, y) => x.localeCompare(y));
    return {
      modules: sort([...modules]),
      entityTypes: sort([...entityTypes]),
      actions: sort([...actions]),
      actionTypes: sort([...actionTypes]),
    };
  }

  async exportCsv(q: AuditTrailQuery): Promise<string> {
    const pageSize = 500;
    const rows: AuditTrailEntry[] = [];
    for (let page = 1; ; page += 1) {
      const result = await this.findAll({ ...q, page, pageSize });
      rows.push(...result.data);
      if (rows.length >= result.total || result.data.length < pageSize) {
        break;
      }
    }
    const headers = [
      'Date & Time',
      'Who',
      'Role',
      'Action',
      'Type',
      'Module',
      'Entity',
      'Entity ID',
      'IP',
      'Device',
      'Changed Fields',
      'Old Values',
      'New Values',
    ];
    const escape = (v: unknown): string => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) => {
      const changes = (r.changes || [])
        .map((c) => `${c.field}: ${JSON.stringify(c.old)} → ${JSON.stringify(c.new)}`)
        .join(' | ');
      return [
        r.timestamp,
        r.userName,
        r.userRole,
        r.action,
        r.actionType,
        r.module,
        r.entityType,
        r.entityId,
        r.ipAddress,
        r.device,
        changes,
        r.oldValues ? JSON.stringify(r.oldValues) : '',
        r.newValues ? JSON.stringify(r.newValues) : '',
      ]
        .map(escape)
        .join(',');
    });
    return `\uFEFF${headers.join(',')}\r\n${lines.join('\r\n')}`;
  }
}
