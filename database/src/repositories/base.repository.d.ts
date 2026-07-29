import type { AnyPgTable } from 'drizzle-orm/pg-core';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { DatabaseClient } from '../client';
import type { PaginationParams, PaginatedResult } from '../types';
type AnyTable = AnyPgTable | AnySQLiteTable;
type DbApi = {
    select: (...args: unknown[]) => {
        from: (t: AnyTable) => unknown;
    };
    insert: (t: AnyTable) => {
        values: (d: Record<string, unknown>) => unknown;
    };
    update: (t: AnyTable) => {
        set: (d: Record<string, unknown>) => {
            where: (c: unknown) => unknown;
        };
    };
    delete: (t: AnyTable) => {
        where: (c: unknown) => unknown;
    };
};
export declare class BaseRepository<TTable extends AnyTable> {
    protected table: TTable;
    protected db: DbApi;
    protected softDeleteEnabled: boolean;
    constructor(table: TTable, db: DatabaseClient);
    findById(id: string): Promise<Record<string, unknown> | null>;
    findAll(params?: PaginationParams): Promise<PaginatedResult<Record<string, unknown>>>;
    create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    softDelete(id: string): Promise<Record<string, unknown> | null>;
    delete(id: string): Promise<Record<string, unknown> | null>;
    countAll(): Promise<number>;
    exists(id: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=base.repository.d.ts.map