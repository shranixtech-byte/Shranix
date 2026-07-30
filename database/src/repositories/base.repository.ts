import { eq, and, isNull, count, desc } from 'drizzle-orm';
import type { AnyPgTable } from 'drizzle-orm/pg-core';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { DatabaseClient } from '../client/index';
import type { PaginationParams, PaginatedResult, EnterpriseQuery } from '../types/index';
import { paginateResult, buildEnterpriseConditions, buildOrderByClauses, extractPagination } from '../utils/query.helper';

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

  /** Get the active db (transaction-aware if inside a transaction) */
  protected get activeDb(): any {
    return (this.db as any).__currentTx || this.db;
  }

  /** Get the table as a record for column access */
  protected get tableColumns(): Record<string, any> {
    return this.table as unknown as Record<string, any>;
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    const rows = await this.activeDb.select().from(this.table).where(eq((this.table as any).id, id));
    return (rows as Record<string, unknown>[])[0] || null;
  }

  /**
   * Find all records with enterprise-grade pagination, filtering, sorting, and search.
   *
   * Backward compatible: old callers passing `{ page: 1, pageSize: 20 }` continue to work.
   * New enterprise features are all optional.
   */
  async findAll(
    params: PaginationParams | EnterpriseQuery = { page: 1, pageSize: 20 },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const columns = this.tableColumns;

    // Extract pagination — BaseRepository legacy default is pageSize=20
    const { page, pageSize } = extractPagination(params as EnterpriseQuery, 20);
    const offset = (page - 1) * pageSize;

    // Build enterprise conditions (filters + search)
    const baseConds: any[] = [];
    if (this.softDeleteEnabled && columns.deletedAt) {
      baseConds.push(isNull(columns.deletedAt));
    }

    const conditions = buildEnterpriseConditions(columns, params as EnterpriseQuery, baseConds);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build ORDER BY
    const eqParams = params as EnterpriseQuery;
    let orderByClauses = buildOrderByClauses(columns, eqParams.sorts, eqParams.sortBy, eqParams.sortOrder);

    // Default order: createdAt DESC if no sort specified
    if (orderByClauses.length === 0 && columns.createdAt) {
      orderByClauses = [desc(columns.createdAt)];
    }

    // Column projection: if fields specified, select only those columns
    const selectFields = eqParams.fields && eqParams.fields.length > 0
      ? Object.fromEntries(eqParams.fields.map((f) => [f, columns[f]]).filter(([, v]) => v))
      : undefined;

    const selectBuilder = selectFields
      ? this.activeDb.select(selectFields)
      : this.activeDb.select();

    const [rows, countResult] = await Promise.all([
      selectBuilder
        .from(this.table)
        .where(whereClause)
        .orderBy(...orderByClauses)
        .limit(pageSize)
        .offset(offset),
      this.activeDb
        .select({ value: count() })
        .from(this.table)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as Record<string, unknown>[], total, { page, pageSize });
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.activeDb.insert(this.table).values(data);
    return data;
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await this.activeDb.update(this.table).set(updateData).where(eq((this.table as any).id, id));
    return { ...existing, ...updateData };
  }

  async softDelete(id: string): Promise<Record<string, unknown> | null> {
    if (!this.softDeleteEnabled) return this.delete(id);
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.activeDb
      .update(this.table)
      .set({ deletedAt: new Date().toISOString(), isDeleted: true })
      .where(and(eq((this.table as any).id, id), isNull((this.table as any).deletedAt)));
    return { ...existing, deletedAt: new Date().toISOString(), isDeleted: true };
  }

  async delete(id: string): Promise<Record<string, unknown> | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.activeDb.delete(this.table).where(eq((this.table as any).id, id));
    return existing;
  }

  async countAll(): Promise<number> {
    const [result] = await this.activeDb.select({ value: this.activeDb.count() }).from(this.table);
    return result?.value || 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== null;
  }
}
