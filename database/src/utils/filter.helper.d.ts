import { type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { PgColumn } from 'drizzle-orm/pg-core';
type Column = SQLiteColumn | PgColumn;
interface FilterRule {
    column: Column;
    operator: 'eq' | 'like' | 'gte' | 'lte';
    value: unknown;
}
export declare function buildWhereClause(filters: FilterRule[]): SQL | undefined;
export declare function createFilterRule(column: Column, operator: FilterRule['operator'], value: unknown): FilterRule;
export {};
//# sourceMappingURL=filter.helper.d.ts.map