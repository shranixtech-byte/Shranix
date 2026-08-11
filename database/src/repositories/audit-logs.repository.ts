import crypto from 'node:crypto';

import { eq, count, desc } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import { sqliteAuditLogs, pgAuditLogs } from '../schema/audit';
import type { PaginatedResult, PaginationParams } from '../types/index';
import { paginateResult } from '../utils/query.helper';

export interface AuditLogRecord {
  id: string;
  createdAt: string;
  userId: string;
  event: string;
  resource: string | null;
  action: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  severity: string;
}

export interface AuditLogCreateInput {
  userId: string;
  event: string;
  resource?: string | null;
  action?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: string;
  severity?: string;
}

export class AuditLogsRepository {
  private table: typeof sqliteAuditLogs | typeof pgAuditLogs;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, isPostgres: boolean) {
    this.db = db;
    this.table = isPostgres ? pgAuditLogs : sqliteAuditLogs;
  }

  /**
   * Transaction-aware DB handle — inside a TransactionManager transaction this
   * returns the active tx, otherwise the base client. Without this, audit writes
   * during posting/debit-note transactions hit SQLITE_BUSY (two writers on the
   * same SQLite file) and roll back the whole transaction.
   */
  private get activeDb(): any {
    return (this.db as any).__currentTx || this.db;
  }

  async create(data: AuditLogCreateInput): Promise<AuditLogRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = {
      id,
      createdAt: now,
      userId: data.userId,
      event: data.event,
      resource: data.resource ?? null,
      action: data.action ?? null,
      details: data.details ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      status: data.status ?? 'success',
      severity: data.severity ?? 'info',
    };
    await this.activeDb.insert(this.table).values(values);
    return values as unknown as AuditLogRecord;
  }

  async findByUserId(
    userId: string,
    params: PaginationParams = { page: 1, pageSize: 50 },
  ): Promise<PaginatedResult<AuditLogRecord>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;
    const [rows, countResult] = await Promise.all([
      this.activeDb
        .select()
        .from(this.table)
        .where(eq((this.table as any).userId, userId))
        .orderBy(desc((this.table as any).createdAt))
        .limit(pageSize)
        .offset(offset),
      this.activeDb
        .select({ value: count() })
        .from(this.table)
        .where(eq((this.table as any).userId, userId)),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as unknown as AuditLogRecord[], total, params);
  }

  async findByEvent(
    event: string,
    params: PaginationParams = { page: 1, pageSize: 50 },
  ): Promise<PaginatedResult<AuditLogRecord>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;
    const [rows, countResult] = await Promise.all([
      this.activeDb
        .select()
        .from(this.table)
        .where(eq((this.table as any).event, event))
        .orderBy(desc((this.table as any).createdAt))
        .limit(pageSize)
        .offset(offset),
      this.activeDb
        .select({ value: count() })
        .from(this.table)
        .where(eq((this.table as any).event, event)),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as unknown as AuditLogRecord[], total, params);
  }
}
