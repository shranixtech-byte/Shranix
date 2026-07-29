export declare function withTransaction<T>(_db: unknown, fn: () => Promise<T>): Promise<T>;
export declare function withPgTransaction<T>(_db: unknown, fn: () => Promise<T>): Promise<T>;
export declare function withSqliteTransaction<T>(_db: unknown, fn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=transaction.helper.d.ts.map