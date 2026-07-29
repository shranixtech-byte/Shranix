"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgBaseSchema = exports.sqliteBaseSchema = exports.booleanColumn = exports.yesNoEnum = exports.statusColumn = exports.statusEnum = exports.pgAuditColumns = exports.sqliteAuditColumns = exports.pgSoftDelete = exports.sqliteSoftDelete = exports.pgTimestamps = exports.sqliteTimestamps = exports.pgId = exports.sqliteId = exports.pgTable = exports.sqliteTable = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const pg_core_1 = require("drizzle-orm/pg-core");
// ── Table Creator (supports both SQLite and PostgreSQL) ─────────────────
exports.sqliteTable = (0, sqlite_core_1.sqliteTableCreator)((name) => `shranix_${name}`);
exports.pgTable = (0, pg_core_1.pgTableCreator)((name) => `shranix_${name}`);
// ── UUID Helpers ────────────────────────────────────────────────────────
const sqliteId = () => (0, sqlite_core_1.text)('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
exports.sqliteId = sqliteId;
const pgId = () => (0, pg_core_1.uuid)('id')
    .primaryKey()
    .defaultRandom();
exports.pgId = pgId;
// ── Timestamp Helpers ────────────────────────────────────────────────────
exports.sqliteTimestamps = {
    createdAt: (0, sqlite_core_1.text)('created_at')
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
    updatedAt: (0, sqlite_core_1.text)('updated_at')
        .notNull()
        .$defaultFn(() => new Date().toISOString())
        .$onUpdateFn(() => new Date().toISOString()),
};
exports.pgTimestamps = {
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdateFn(() => new Date()),
};
// ── Soft Delete Helpers ──────────────────────────────────────────────────
exports.sqliteSoftDelete = {
    deletedAt: (0, sqlite_core_1.text)('deleted_at'),
    isDeleted: (0, sqlite_core_1.integer)('is_deleted', { mode: 'boolean' }).notNull().default(false),
};
exports.pgSoftDelete = {
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').notNull().default(false),
};
// ── Audit Column Helpers ─────────────────────────────────────────────────
exports.sqliteAuditColumns = {
    createdBy: (0, sqlite_core_1.text)('created_by'),
    updatedBy: (0, sqlite_core_1.text)('updated_by'),
};
exports.pgAuditColumns = {
    createdBy: (0, pg_core_1.uuid)('created_by'),
    updatedBy: (0, pg_core_1.uuid)('updated_by'),
};
// ── Common Enums (SQLite-compatible text columns) ────────────────────────
exports.statusEnum = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
    DRAFT: 'draft',
    PENDING: 'pending',
};
const statusColumn = () => (0, sqlite_core_1.text)('status').notNull().default(exports.statusEnum.ACTIVE);
exports.statusColumn = statusColumn;
exports.yesNoEnum = {
    YES: 'yes',
    NO: 'no',
};
const booleanColumn = () => (0, sqlite_core_1.text)('flag').notNull().default(exports.yesNoEnum.NO);
exports.booleanColumn = booleanColumn;
// ── Schema Helper: Complete SQLite Table Schema ─────────────────────────
exports.sqliteBaseSchema = {
    ...(0, exports.sqliteId)(),
    ...exports.sqliteTimestamps,
    ...exports.sqliteSoftDelete,
};
// ── Schema Helper: Complete PostgreSQL Table Schema ──────────────────────
exports.pgBaseSchema = {
    ...(0, exports.pgId)(),
    ...exports.pgTimestamps,
    ...exports.pgSoftDelete,
};
//# sourceMappingURL=helpers.js.map