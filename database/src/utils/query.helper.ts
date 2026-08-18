import type { AnyColumn, SQL } from 'drizzle-orm';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  gt,
  inArray,
  like,
  lte,
  lt,
  ne,
  notInArray,
  or,
} from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type {
  PaginatedResult,
  PaginationParams,
  FilterParams,
  FilterCondition,
  SortConfig,
  EnterpriseQuery,
} from '../types/index';

export type AnyTable = PgTable | SQLiteTable;

// ═════════════════════════════════════════════════════════
// LEGACY HELPERS (backward compatible)
// ═════════════════════════════════════════════════════════

export function buildSortOrder(
  table: AnyTable,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
): SQL[] | undefined {
  if (!sortBy) {
    return undefined;
  }

  const column = (table as any)[sortBy] as AnyColumn | undefined;
  if (!column) {
    return undefined;
  }

  return sortOrder === 'desc' ? [desc(column)] : [asc(column)];
}

export function buildSearchCondition(
  table: AnyTable,
  searchFields: (keyof typeof table)[],
  search?: string,
): SQL | undefined {
  if (!search || searchFields.length === 0) {
    return undefined;
  }

  const pattern = `%${search}%`;
  const conditions = searchFields
    .map((field) => {
      const col = (table as any)[field] as AnyColumn | undefined;
      return col ? like(col, pattern) : undefined;
    })
    .filter((c): c is SQL => c !== undefined);

  if (conditions.length === 0) {
    return undefined;
  }
  return or(...conditions);
}

export function paginateResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const { page, pageSize } = params;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

export function applyPagination(
  query: { limit: (n: number) => { offset: (n: number) => unknown } },
  params: PaginationParams,
): void {
  const { page, pageSize } = params;
  query.limit(pageSize).offset((page - 1) * pageSize);
}

export function buildFilterConditions(
  params: FilterParams,
  fieldMap: Record<string, string>,
): Record<string, unknown> {
  const conditions: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const dbField = fieldMap[key] || key;
    conditions[dbField] = value;
  }

  return conditions;
}

// ═════════════════════════════════════════════════════════
// ENTERPRISE QUERY BUILDERS
// ═════════════════════════════════════════════════════════

/**
 * Convert a FilterCondition to a drizzle SQL condition.
 */
export function buildFilterCondition(
  table: Record<string, AnyColumn>,
  filter: FilterCondition,
): SQL | undefined {
  const column = table[filter.field];
  if (!column) {
    return undefined;
  }

  switch (filter.operator) {
    case 'eq':
      return eq(column, filter.value as string | number | boolean);
    case 'neq':
      return ne(column, filter.value as string | number | boolean);
    case 'gt':
      return gt(column, filter.value as string | number | Date);
    case 'gte':
      return gte(column, filter.value as string | number | Date);
    case 'lt':
      return lt(column, filter.value as string | number | Date);
    case 'lte':
      return lte(column, filter.value as string | number | Date);
    case 'like':
      return like(column, `%${String(filter.value)}%`);
    case 'startsWith':
      return like(column, `${String(filter.value)}%`);
    case 'endsWith':
      return like(column, `%${String(filter.value)}`);
    case 'in':
      return Array.isArray(filter.value)
        ? inArray(column, filter.value as (string | number)[])
        : undefined;
    case 'notIn':
      return Array.isArray(filter.value)
        ? notInArray(column, filter.value as (string | number)[])
        : undefined;
    case 'between': {
      if (!Array.isArray(filter.value) || filter.value.length !== 2) {
        return undefined;
      }
      return and(
        gte(column, filter.value[0] as string | number | Date),
        lte(column, filter.value[1] as string | number | Date),
      );
    }
    default:
      return undefined;
  }
}

/**
 * Build an array of drizzle ORDER BY clauses from SortConfigs.
 */
export function buildOrderByClauses(
  table: Record<string, AnyColumn>,
  sorts?: SortConfig[],
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
): SQL[] {
  const clauses: SQL[] = [];

  if (sorts) {
    for (const s of sorts) {
      const col = table[s.field];
      if (col) {
        clauses.push(s.order === 'desc' ? desc(col) : asc(col));
      }
    }
  }

  // If sortBy is also provided, append it
  if (sortBy) {
    const col = table[sortBy];
    if (col) {
      clauses.push(sortOrder === 'desc' ? desc(col) : asc(col));
    }
  }

  return clauses;
}

/**
 * Build WHERE conditions from an EnterpriseQuery.
 * Returns [conditionsArray, hasSearch] where conditionsArray can be spread into and().
 */
export function buildEnterpriseConditions(
  table: Record<string, AnyColumn>,
  query: EnterpriseQuery,
  baseConditions: SQL[] = [],
): SQL[] {
  const conditions = [...baseConditions];

  // Search condition
  if (query.search && query.searchFields && query.searchFields.length > 0) {
    const pattern = `%${query.search}%`;
    const searchConds = query.searchFields
      .map((field) => {
        const col = table[field];
        return col ? like(col, pattern) : undefined;
      })
      .filter((c): c is SQL => c !== undefined);
    if (searchConds.length > 0) {
      conditions.push(or(...searchConds) as SQL);
    }
  }

  // Filter conditions
  if (query.filters && query.filters.length > 0) {
    for (const filter of query.filters) {
      const cond = buildFilterCondition(table, filter);
      if (cond) {
        conditions.push(cond);
      }
    }
  }

  // isActive filter
  if (query.isActive !== undefined) {
    const col = table['isActive'];
    if (col) {
      conditions.push(eq(col, query.isActive));
    }
  }

  return conditions;
}

/**
 * Extract pagination params from an EnterpriseQuery.
 */
/**
 * H4 — hard server-side ceiling for a single page. Client-supplied pageSize is
 * never trusted; every query is bounded. Internal aggregation/export callers
 * that legitimately need more use SQL aggregation instead of larger pages.
 */
export const MAX_PAGE_SIZE = 10000;

export function extractPagination(
  query: EnterpriseQuery,
  defaultPageSize: number = 50,
): PaginationParams {
  const rawPage = Number(query.page ?? 1);
  const rawSize = Number(query.pageSize ?? defaultPageSize);
  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    pageSize:
      Number.isFinite(rawSize) && rawSize > 0
        ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
        : defaultPageSize,
  };
}
