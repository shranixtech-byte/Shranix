import { type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { PaginatedResult, PaginationParams, FilterParams } from '../types';
export type AnyTable = PgTable | SQLiteTable;
export declare function buildSortOrder(table: AnyTable, sortBy?: string, sortOrder?: 'asc' | 'desc'): SQL[] | undefined;
export declare function buildSearchCondition(table: AnyTable, searchFields: (keyof typeof table)[], search?: string): SQL | undefined;
export declare function paginateResult<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T>;
export declare function applyPagination(query: {
    limit: (n: number) => {
        offset: (n: number) => unknown;
    };
}, params: PaginationParams): void;
export declare function buildFilterConditions(params: FilterParams, fieldMap: Record<string, string>): Record<string, unknown>;
//# sourceMappingURL=query.helper.d.ts.map