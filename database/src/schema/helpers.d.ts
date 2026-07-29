export declare const sqliteTable: import("drizzle-orm/sqlite-core").SQLiteTableFn<undefined>;
export declare const pgTable: import("drizzle-orm/pg-core").PgTableFn<undefined>;
export declare const sqliteId: () => import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"id", [string, ...string[]]>>>>>;
export declare const pgId: () => import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"id">>>>;
export declare const sqliteTimestamps: {
    createdAt: import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"created_at", [string, ...string[]]>>>>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"updated_at", [string, ...string[]]>>>>>;
};
export declare const pgTimestamps: {
    createdAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"created_at">>>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"updated_at">>>>;
};
export declare const sqliteSoftDelete: {
    deletedAt: import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"deleted_at", [string, ...string[]]>;
    isDeleted: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteBooleanBuilderInitial<"is_deleted">>>;
};
export declare const pgSoftDelete: {
    deletedAt: import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"deleted_at">;
    isDeleted: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgBooleanBuilderInitial<"is_deleted">>>;
};
export declare const sqliteAuditColumns: {
    createdBy: import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"created_by", [string, ...string[]]>;
    updatedBy: import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"updated_by", [string, ...string[]]>;
};
export declare const pgAuditColumns: {
    createdBy: import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"created_by">;
    updatedBy: import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"updated_by">;
};
export declare const statusEnum: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
    readonly ARCHIVED: "archived";
    readonly DRAFT: "draft";
    readonly PENDING: "pending";
};
export declare const statusColumn: () => import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"status", [string, ...string[]]>>>;
export declare const yesNoEnum: {
    readonly YES: "yes";
    readonly NO: "no";
};
export declare const booleanColumn: () => import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"flag", [string, ...string[]]>>>;
export declare const sqliteBaseSchema: {
    deletedAt: import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"deleted_at", [string, ...string[]]>;
    isDeleted: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteBooleanBuilderInitial<"is_deleted">>>;
    createdAt: import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"created_at", [string, ...string[]]>>>>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"updated_at", [string, ...string[]]>>>>>;
    _: {
        brand: "ColumnBuilder";
        name: "id";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: boolean;
        hasDefault: boolean;
        enumValues: [string, ...string[]];
        identity: unknown;
        generated: unknown;
        dialect: "sqlite";
    } & {
        notNull: true;
    } & {
        isPrimaryKey: true;
    } & {
        hasDefault: true;
    } & {
        hasRuntimeDefault: true;
    };
    $default: (fn: () => string | import("drizzle-orm").SQL<unknown>) => import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"id", [string, ...string[]]>>>>>>>;
    $onUpdate: (fn: () => string | import("drizzle-orm").SQL<unknown>) => import("drizzle-orm").HasDefault<import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/sqlite-core").SQLiteTextBuilderInitial<"id", [string, ...string[]]>>>>>>;
};
export declare const pgBaseSchema: {
    deletedAt: import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"deleted_at">;
    isDeleted: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgBooleanBuilderInitial<"is_deleted">>>;
    createdAt: import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"created_at">>>;
    updatedAt: import("drizzle-orm").HasDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgTimestampBuilderInitial<"updated_at">>>>;
    _: {
        brand: "ColumnBuilder";
        name: "id";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: boolean;
        hasDefault: boolean;
        enumValues: undefined;
        identity: unknown;
        generated: unknown;
        dialect: "pg";
    } & {
        notNull: true;
    } & {
        isPrimaryKey: true;
    } & {
        hasDefault: true;
    };
    $default: (fn: () => string | import("drizzle-orm").SQL<unknown>) => import("drizzle-orm").HasRuntimeDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"id">>>>>>;
    $onUpdate: (fn: () => string | import("drizzle-orm").SQL<unknown>) => import("drizzle-orm").HasDefault<import("drizzle-orm").HasDefault<import("drizzle-orm").IsPrimaryKey<import("drizzle-orm").NotNull<import("drizzle-orm/pg-core").PgUUIDBuilderInitial<"id">>>>>;
};
//# sourceMappingURL=helpers.d.ts.map