import { asc, desc, type SQL, type SQLWrapper } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { PaginatedResult, PaginationParams, FilterParams } from '../types/index';

export type AnyTable = PgTable | SQLiteTable;

export function buildSortOrder(
  table: AnyTable,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
): SQL[] | undefined {
  if (!sortBy) return undefined;

  const column = Object.entries(table).find(
    ([key]) => key === sortBy,
  )?.[1] as SQLWrapper | undefined;

  if (!column) return undefined;

  return sortOrder === 'desc' ? [desc(column)] : [asc(column)];
}

export function buildSearchCondition(
  table: AnyTable,
  searchFields: (keyof typeof table)[],
  search?: string,
): SQL | undefined {
  if (!search || searchFields.length === 0) return undefined;

  // This is a foundation — actual search implementation
  // will be database-specific (ILIKE for PostgreSQL, LIKE for SQLite)
  return undefined;
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
    if (value === undefined || value === null || value === '') continue;
    const dbField = fieldMap[key] || key;
    conditions[dbField] = value;
  }

  return conditions;
}
