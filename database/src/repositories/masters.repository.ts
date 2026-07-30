import { eq, and, isNull, count, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { DatabaseClient } from '../client/index';
import {
  sqliteCompanies, pgCompanies,
  sqliteFinancialYears, pgFinancialYears,
  sqliteBranches, pgBranches,
  sqliteWarehouses, pgWarehouses,
  sqliteUnits, pgUnits,
  sqliteCategories, pgCategories,
  sqliteBrands, pgBrands,
  sqliteTaxGroups, pgTaxGroups,
  sqliteGSTRates, pgGSTRates,
} from '../schema/masters';
import type { PaginatedResult, PaginationParams, EnterpriseQuery } from '../types/index';
import { paginateResult, buildEnterpriseConditions, buildOrderByClauses, extractPagination } from '../utils/query.helper';

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

  /** Get the table as a column map for enterprise query builders */
  private get tableColumns(): Record<string, any> {
    return this.table as unknown as Record<string, any>;
  }

  async findById(id: string): Promise<T | null> {
    const rows = await this.activeDb
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)));
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
    params: (PaginationParams & { search?: string; isActive?: boolean }) | EnterpriseQuery = { page: 1, pageSize: 50 },
  ): Promise<PaginatedResult<T>> {
    const columns = this.tableColumns;

    // Extract pagination
    const { page, pageSize } = extractPagination(params as EnterpriseQuery);
    const offset = (page - 1) * pageSize;

    // Base conditions: soft-delete filter
    const baseConds: any[] = [isNull(this.table.deletedAt)];

    // Build enterprise conditions (supports search, searchFields, filters, isActive)
    const eqParams = params as EnterpriseQuery;
    const conditions = buildEnterpriseConditions(columns, eqParams, baseConds);

    // Legacy isActive support (already handled by buildEnterpriseConditions via eqParams.isActive)
    // Search is also handled by buildEnterpriseConditions via eqParams.search/searchFields

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build ORDER BY
    let orderByClauses = buildOrderByClauses(columns, eqParams.sorts, eqParams.sortBy, eqParams.sortOrder);

    // Default order: createdAt DESC
    if (orderByClauses.length === 0) {
      orderByClauses = [desc(this.table.createdAt)];
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
    return paginateResult(rows as T[], total, { page, pageSize });
  }

  /** Get the active db (transaction-aware if inside a transaction) */
  private get activeDb(): any {
    return (this.db as any).__currentTx || this.db;
  }

  async create(data: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = { ...data, id, createdAt: now, updatedAt: now, deletedAt: null, isDeleted: false } as any;
    await this.activeDb.insert(this.table).values(values);
    return values as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await this.activeDb.update(this.table).set(updateData).where(eq(this.table.id, id));
    return { ...existing, ...updateData } as T;
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.activeDb
      .update(this.table)
      .set({ deletedAt: now, isDeleted: true, updatedAt: now })
      .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.activeDb
      .update(this.table)
      .set({ deletedAt: null, isDeleted: false, updatedAt: now })
      .where(eq(this.table.id, id));
  }

  async count(conditions?: Partial<T>): Promise<number> {
    const whereConditions: any[] = [isNull(this.table.deletedAt)];
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
      .where(and(...whereConditions));
    return Number(result[0]?.value ?? 0);
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
