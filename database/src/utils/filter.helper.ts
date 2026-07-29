import { and, eq, gte, lte, like, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { PgColumn } from 'drizzle-orm/pg-core';

type Column = SQLiteColumn | PgColumn;

interface FilterRule {
  column: Column;
  operator: 'eq' | 'like' | 'gte' | 'lte';
  value: unknown;
}

export function buildWhereClause(filters: FilterRule[]): SQL | undefined {
  if (filters.length === 0) return undefined;

  const conditions = filters.map((filter) => {
    switch (filter.operator) {
      case 'eq':
        return eq(filter.column, filter.value as string | number | boolean);
      case 'like':
        return like(filter.column, `%${filter.value}%`);
      case 'gte':
        return gte(filter.column, filter.value as number | Date);
      case 'lte':
        return lte(filter.column, filter.value as number | Date);
      default:
        return eq(filter.column, filter.value as string | number | boolean);
    }
  });

  return and(...conditions);
}

export function createFilterRule(
  column: Column,
  operator: FilterRule['operator'],
  value: unknown,
): FilterRule {
  return { column, operator, value };
}
