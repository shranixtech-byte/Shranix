import { eq, and, isNull, count, like, or, desc } from 'drizzle-orm';
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
import type { PaginatedResult, PaginationParams } from '../types/index';
import { paginateResult } from '../utils/query.helper';

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

  async findById(id: string): Promise<T | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)));
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  async findAll(params: PaginationParams & { search?: string; isActive?: boolean } = { page: 1, pageSize: 50 }): Promise<PaginatedResult<T>> {
    const { page, pageSize, search, isActive } = params;
    const offset = (page - 1) * pageSize;
    const conditions: any[] = [isNull(this.table.deletedAt)];

    if (isActive !== undefined) {
      conditions.push(eq(this.table.isActive, isActive));
    }

    let whereClause = and(...conditions);

    // Build search conditions for name and code fields
    if (search) {
      const searchPattern = `%${search}%`;
      const searchConditions: any[] = [];
      if (this.table.name) searchConditions.push(like(this.table.name, searchPattern));
      if (this.table.code) searchConditions.push(like(this.table.code, searchPattern));
      if (this.table.shortName) searchConditions.push(like(this.table.shortName, searchPattern));
      if (searchConditions.length > 0) {
        whereClause = and(whereClause, or(...searchConditions));
      }
    }

    const [rows, countResult] = await Promise.all([
      (this.db as any)
        .select()
        .from(this.table)
        .where(whereClause)
        .orderBy(desc(this.table.createdAt))
        .limit(pageSize)
        .offset(offset),
      (this.db as any)
        .select({ value: count() })
        .from(this.table)
        .where(whereClause),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as T[], total, params);
  }

  async create(data: Partial<T>): Promise<T> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = { ...data, id, createdAt: now, updatedAt: now, deletedAt: null, isDeleted: false } as any;
    await (this.db as any).insert(this.table).values(values);
    return values as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await (this.db as any).update(this.table).set(updateData).where(eq(this.table.id, id));
    return { ...existing, ...updateData } as T;
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await (this.db as any)
      .update(this.table)
      .set({ deletedAt: now, isDeleted: true, updatedAt: now })
      .where(and(eq(this.table.id, id), isNull(this.table.deletedAt)));
  }

  async restore(id: string): Promise<void> {
    const now = new Date().toISOString();
    await (this.db as any)
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
    const result = await (this.db as any)
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
