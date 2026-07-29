import { eq, and, isNull } from 'drizzle-orm';
import type { AnyPgTable } from 'drizzle-orm/pg-core';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { DatabaseClient } from '../client/index';
import type { PaginationParams, PaginatedResult } from '../types/index';
import { paginateResult } from '../utils/query.helper';

type AnyTable = AnyPgTable | AnySQLiteTable;

export class BaseRepository<TTable extends AnyTable> {
  protected table: TTable;
  protected db: DatabaseClient;
  protected softDeleteEnabled: boolean;

  constructor(table: TTable, db: DatabaseClient) {
    this.table = table;
    this.db = db;
    this.softDeleteEnabled = 'deletedAt' in table;
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    const rows = await (this.db as any).select().from(this.table).where(eq((this.table as any).id, id));
    return (rows as Record<string, unknown>[])[0] || null;
  }

  async findAll(
    params: PaginationParams = { page: 1, pageSize: 20 },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const db = this.db as any;

    const [rows, countResult] = await Promise.all([
      db.select().from(this.table).limit(pageSize).offset(offset),
      db.select({ value: db.count() }).from(this.table),
    ]);

    const total = countResult[0]?.value || 0;
    return paginateResult(rows as Record<string, unknown>[], total, params);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await (this.db as any).insert(this.table).values(data);
    return data;
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await (this.db as any).update(this.table).set(updateData).where(eq((this.table as any).id, id));
    return { ...existing, ...updateData };
  }

  async softDelete(id: string): Promise<Record<string, unknown> | null> {
    if (!this.softDeleteEnabled) return this.delete(id);

    const existing = await this.findById(id);
    if (!existing) return null;

    await (this.db as any)
      .update(this.table)
      .set({ deletedAt: new Date().toISOString(), isDeleted: true })
      .where(
        and(eq((this.table as any).id, id), isNull((this.table as any).deletedAt)),
      );
    return { ...existing, deletedAt: new Date().toISOString(), isDeleted: true };
  }

  async delete(id: string): Promise<Record<string, unknown> | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await (this.db as any).delete(this.table).where(eq((this.table as any).id, id));
    return existing;
  }

  async countAll(): Promise<number> {
    const [result] = await (this.db as any).select({ value: (this.db as any).count() }).from(this.table);
    return result?.value || 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== null;
  }
}
