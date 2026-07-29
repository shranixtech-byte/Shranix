import { text, integer, sqliteTableCreator } from 'drizzle-orm/sqlite-core';
import { pgTableCreator, uuid as pgUuid, timestamp as pgTimestamp, boolean as pgBoolean } from 'drizzle-orm/pg-core';

// ── Table Creator (supports both SQLite and PostgreSQL) ─────────────────
export const sqliteTable = sqliteTableCreator((name) => `shranix_${name}`);
export const pgTable = pgTableCreator((name) => `shranix_${name}`);

// ── UUID Helpers ────────────────────────────────────────────────────────
export const sqliteId = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const pgId = () =>
  pgUuid('id')
    .primaryKey()
    .defaultRandom();

// ── Timestamp Helpers ────────────────────────────────────────────────────
export const sqliteTimestamps = {
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
};

export const pgTimestamps = {
  createdAt: pgTimestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

// ── Soft Delete Helpers ──────────────────────────────────────────────────
export const sqliteSoftDelete = {
  deletedAt: text('deleted_at'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
};

export const pgSoftDelete = {
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ── Audit Column Helpers ─────────────────────────────────────────────────
export const sqliteAuditColumns = {
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
};

export const pgAuditColumns = {
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
};

// ── Common Enums (SQLite-compatible text columns) ────────────────────────
export const statusEnum = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  DRAFT: 'draft',
  PENDING: 'pending',
} as const;

export const statusColumn = () =>
  text('status').notNull().default(statusEnum.ACTIVE);

export const yesNoEnum = {
  YES: 'yes',
  NO: 'no',
} as const;

export const booleanColumn = () =>
  text('flag').notNull().default(yesNoEnum.NO);

// ── Schema Helper: Complete SQLite Table Schema ─────────────────────────
export const sqliteBaseSchema = {
  ...sqliteId(),
  ...sqliteTimestamps,
  ...sqliteSoftDelete,
};

// ── Schema Helper: Complete PostgreSQL Table Schema ──────────────────────
export const pgBaseSchema = {
  ...pgId(),
  ...pgTimestamps,
  ...pgSoftDelete,
};
