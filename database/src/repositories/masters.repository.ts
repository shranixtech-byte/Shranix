import crypto from 'node:crypto';

import { eq, and, isNull, count, desc, like, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqliteCompanies,
  pgCompanies,
  sqliteFinancialYears,
  pgFinancialYears,
  sqliteBranches,
  pgBranches,
  sqliteWarehouses,
  pgWarehouses,
  sqliteUnits,
  pgUnits,
  sqliteCategories,
  pgCategories,
  sqliteBrands,
  pgBrands,
  sqliteTaxGroups,
  pgTaxGroups,
  sqliteGSTRates,
  pgGSTRates,
} from '../schema/masters';
import type { PaginatedResult, PaginationParams, EnterpriseQuery } from '../types/index';
import {
  paginateResult,
  buildEnterpriseConditions,
  buildOrderByClauses,
  extractPagination,
} from '../utils/query.helper';

// ── Generic Master Record Interface ─────────────────────
export interface MasterRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
  [key: string]: unknown;
}

// ── Generic Master Repository ───────────────────────────
export class MasterDataRepository<T extends MasterRecord> {
  protected sqliteTable: any;
  protected pgTable: any;
  protected db: DatabaseClient;
  protected isPostgres: boolean;

  constructor(sqliteTable: any, pgTable: any, db: DatabaseClient, isPostgres: boolean) {
    this.sqliteTable = sqliteTable;
    this.pgTable = pgTable;
    this.db = db;
    this.isPostgres = isPostgres;
  }

  get table(): any {
    return this.isPostgres ? this.pgTable : this.sqliteTable;
  }

  /**
   * Raw lexicographic max of a text column across ALL rows — including
   * soft-deleted rows (which keep their unique document numbers). Used by the
   * numbering services so a soft-deleted document can never cause a number
   * reuse + UNIQUE collision. Values are zero-padded (SUB-000001), so the
   * lexicographic max equals the numeric max.
   */
  async maxFieldValue(field: string): Promise<string | null> {
    try {
      if (this.isPostgres) {
        const rows: any[] = await (this.db as any)
          .select({ m: sql`max(${(this.pgTable as any)[field]})` })
          .from(this.pgTable as any);
        return rows[0]?.m ?? null;
      }
      const rows: any[] = await (this.db as any)
        .select({ m: sql`max(${(this.sqliteTable as any)[field]})` })
        .from(this.sqliteTable as any);
      return rows[0]?.m ?? null;
    } catch {
      return null;
    }
  }

  /** Get the table as a column map for enterprise query builders */
  private get tableColumns(): Record<string, any> {
    return this.table as unknown as Record<string, any>;
  }

  /**
   * True when the table actually has a given column. Some tables (approval
   * history/comments/notifications) were created without the soft-delete and
   * timestamp base columns — every access must be guarded or drizzle builds
   * invalid SQL (e.g. `where is null` → 500 on GET workflow/:id).
   */
  private hasColumn(name: string): boolean {
    return Boolean((this.table as any)[name]);
  }

  async findById(id: string): Promise<T | null> {
    const conds: any[] = [eq(this.table.id, id)];
    if (this.hasColumn('deletedAt')) {
      conds.push(isNull(this.table.deletedAt));
    }
    const rows = await this.activeDb
      .select()
      .from(this.table)
      .where(and(...conds));
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  /**
   * Find all records with enterprise-grade pagination, filtering, sorting, and search.
   *
   * Backward compatible: old callers passing `{ page: 1, pageSize: 50 }` continue to work.
   * Old callers using `search` or `isActive` also work.
   * New enterprise features (searchFields, filters, sortBy, sortOrder, sorts) are all optional.
   */
  async findAll(
    params: (PaginationParams & { search?: string; isActive?: boolean }) | EnterpriseQuery = {
      page: 1,
      pageSize: 50,
    },
  ): Promise<PaginatedResult<T>> {
    const columns = this.tableColumns;

    // Extract pagination
    const { page, pageSize } = extractPagination(params as EnterpriseQuery);
    const offset = (page - 1) * pageSize;

    // Base conditions: soft-delete filter (guard for tables without deletedAt)
    const baseConds: any[] = this.hasColumn('deletedAt') ? [isNull(this.table.deletedAt)] : [];

    // Build enterprise conditions (supports search, searchFields, filters, isActive)
    const eqParams = params as EnterpriseQuery;
    const conditions = buildEnterpriseConditions(columns, eqParams, baseConds);

    // Legacy isActive support (already handled by buildEnterpriseConditions via eqParams.isActive)
    // Search is also handled by buildEnterpriseConditions via eqParams.search/searchFields

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build ORDER BY
    let orderByClauses = buildOrderByClauses(
      columns,
      eqParams.sorts,
      eqParams.sortBy,
      eqParams.sortOrder,
    );

    // Default order: createdAt DESC — but guard for tables that don't have a
    // createdAt column (e.g. approval_history uses `timestamp`): ordering by a
    // non-existent column generates invalid SQL (500 on GET workflow/:id).
    if (orderByClauses.length === 0 && this.table.createdAt) {
      orderByClauses = [desc(this.table.createdAt)];
    }

    // Column projection: if fields specified, select only those columns
    const selectFields =
      eqParams.fields && eqParams.fields.length > 0
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
      this.activeDb.select({ value: count() }).from(this.table).where(whereClause),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as T[], total, { page, pageSize });
  }

  /** Get the active db (transaction-aware if inside a transaction) */
  private get activeDb(): any {
    return (this.db as any).__currentTx || this.db;
  }

  async create(data: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    // Respect a caller-provided id (dual-write facades must mirror the ledger
    // id 1:1 so cross-table lookups + duplicate checks stay consistent).
    const id = (data as any)?.id || crypto.randomUUID();
    const values = { ...data, id } as any;
    if (this.hasColumn('createdAt')) {
      values.createdAt = now;
    }
    if (this.hasColumn('updatedAt')) {
      values.updatedAt = now;
    }
    if (this.hasColumn('deletedAt')) {
      values.deletedAt = null;
    }
    if (this.hasColumn('isDeleted')) {
      values.isDeleted = false;
    }
    await this.activeDb.insert(this.table).values(values);
    return values as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    const updateData = { ...data } as any;
    if (this.hasColumn('updatedAt')) {
      updateData.updatedAt = new Date().toISOString();
    }
    await this.activeDb.update(this.table).set(updateData).where(eq(this.table.id, id));
    return { ...existing, ...updateData } as T;
  }

  async softDelete(id: string): Promise<void> {
    if (!this.hasColumn('deletedAt') || !this.hasColumn('isDeleted')) {
      // Table has no soft-delete columns (e.g. approval history/comments) — nothing to mark.
      return;
    }
    const now = new Date().toISOString();
    await this.activeDb
      .update(this.table)
      .set({ deletedAt: now, isDeleted: true, updatedAt: now })
      .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    if (!this.hasColumn('deletedAt') || !this.hasColumn('isDeleted')) {
      return;
    }
    const now = new Date().toISOString();
    await this.activeDb
      .update(this.table)
      .set({ deletedAt: null, isDeleted: false, updatedAt: now })
      .where(eq(this.table.id, id));
  }

  async count(conditions?: Partial<T>): Promise<number> {
    const whereConditions: any[] = this.hasColumn('deletedAt')
      ? [isNull(this.table.deletedAt)]
      : [];
    if (conditions) {
      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined && this.table[key]) {
          whereConditions.push(eq(this.table[key], value));
        }
      }
    }
    const result = await this.activeDb
      .select({ value: count() })
      .from(this.table)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    return Number(result[0]?.value ?? 0);
  }

  /**
   * H4 — SQL COUNT with enterprise filters (filters array, search, isActive).
   * Counts in the database instead of loading rows into memory.
   */
  async countWhere(params?: {
    filters?: import('../types/index').FilterCondition[];
    search?: string;
    searchFields?: string[];
    isActive?: boolean;
  }): Promise<number> {
    const columns = this.tableColumns;
    const baseConds: any[] = this.hasColumn('deletedAt') ? [isNull(this.table.deletedAt)] : [];
    const conditions = buildEnterpriseConditions(
      columns,
      {
        filters: params?.filters || [],
        search: params?.search,
        searchFields: params?.searchFields,
        isActive: params?.isActive,
      } as EnterpriseQuery,
      baseConds,
    );
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const result = await this.activeDb
      .select({ value: count() })
      .from(this.table)
      .where(whereClause);
    return Number(result[0]?.value ?? 0);
  }

  /**
   * H4 — SQL SUM of a numeric column with enterprise filters.
   *
   * Aggregates in the database instead of loading up to pageSize rows into
   * memory. This also fixes silent truncation: the previous in-memory pattern
   * loaded at most `pageSize` rows (e.g. 10000) and produced WRONG totals once
   * a table grew past that bound.
   */
  async sumField(
    field: string,
    params?: {
      filters?: import('../types/index').FilterCondition[];
      search?: string;
      searchFields?: string[];
      isActive?: boolean;
    },
  ): Promise<number> {
    const column = this.tableColumns[field];
    if (!column) {
      return 0;
    }
    const baseConds: any[] = this.hasColumn('deletedAt') ? [isNull(this.table.deletedAt)] : [];
    const conditions = buildEnterpriseConditions(
      this.tableColumns,
      {
        filters: params?.filters || [],
        search: params?.search,
        searchFields: params?.searchFields,
        isActive: params?.isActive,
      } as EnterpriseQuery,
      baseConds,
    );
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const result = await this.activeDb
      .select({ value: sql<number>`coalesce(sum(${column}), 0)` })
      .from(this.table)
      .where(whereClause);
    return Number(result[0]?.value ?? 0);
  }

  /**
   * Find the max numeric sequence for a prefix on a given column, INCLUDING
   * soft-deleted rows (unique indexes still block numbers of deleted records,
   * so deleted numbers must not be reused). Returns 0 when nothing matches.
   */
  async findMaxSequenceForPrefix(columnName: string, prefix: string): Promise<number> {
    const col = (this.table as any)[columnName];
    const rows = await this.activeDb
      .select({ val: col })
      .from(this.table)
      .where(like(col, `${prefix}%`))
      .limit(10000);
    let max = 0;
    for (const r of rows as any[]) {
      const num = String(r.val || '');
      const rest = num.startsWith(prefix) ? num.slice(prefix.length) : num;
      const m = rest.match(/^(\d+)/);
      if (m) {
        const s = parseInt(m[1], 10);
        if (!isNaN(s) && s > max) {
          max = s;
        }
      }
    }
    return max;
  }
}

// ═════════════════════════════════════════════════════════
// 1. COMPANIES
// ═════════════════════════════════════════════════════════
export class CompaniesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCompanies, pgCompanies, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 2. FINANCIAL YEARS
// ═════════════════════════════════════════════════════════
export class FinancialYearsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteFinancialYears, pgFinancialYears, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 3. BRANCHES
// ═════════════════════════════════════════════════════════
export class BranchesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBranches, pgBranches, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 4. WAREHOUSES
// ═════════════════════════════════════════════════════════
export class WarehousesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteWarehouses, pgWarehouses, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 5. UNITS
// ═════════════════════════════════════════════════════════
export class UnitsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteUnits, pgUnits, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 6. CATEGORIES
// ═════════════════════════════════════════════════════════
export class CategoriesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteCategories, pgCategories, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 7. BRANDS
// ═════════════════════════════════════════════════════════
export class BrandsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteBrands, pgBrands, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 8. TAX GROUPS
// ═════════════════════════════════════════════════════════
export class TaxGroupsRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteTaxGroups, pgTaxGroups, db, isPostgres);
  }
}

// ═════════════════════════════════════════════════════════
// 9. GST RATES
// ═════════════════════════════════════════════════════════
export class GSTRatesRepository extends MasterDataRepository<any> {
  constructor(db: DatabaseClient, isPostgres: boolean) {
    super(sqliteGSTRates, pgGSTRates, db, isPostgres);
  }
}
