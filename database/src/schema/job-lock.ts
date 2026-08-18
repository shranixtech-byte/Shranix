import {
  pgTable as pgTableBase,
  text as pgText,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  uniqueIndex as pgUniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ═══════════════════════════════════════════════════════════════
// JOB LOCK — Distributed lock table for scheduler coordination
//
// Conceptual structure:
//   job_key        UNIQUE — logical job identifier (e.g. "commercial_scheduler")
//   owner_token    UUID   — identifies which worker instance holds the lock
//   acquired_at    timestamp — when lock was acquired
//   expires_at     timestamp — lease expiration (stale lock recovery)
//   updated_at     timestamp — last modification
//
// Atomic acquire: INSERT OR IGNORE + check affected rows
// Safe release:   UPDATE WHERE owner_token = :myToken
// Stale takeover: UPDATE WHERE expires_at < now AND (owner = :myToken OR expires)
// ═══════════════════════════════════════════════════════════════

export const sqliteJobLocks = sqliteTableBase(
  'shranix_job_locks',
  {
    id: sqliteText('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobKey: sqliteText('job_key').notNull(),
    ownerToken: sqliteText('owner_token').notNull(),
    acquiredAt: sqliteText('acquired_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    expiresAt: sqliteText('expires_at').notNull(),
    updatedAt: sqliteText('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('job_lock_key_idx').on(t.jobKey)],
);

export const pgJobLocks = pgTableBase(
  'shranix_job_locks',
  {
    id: pgUuid('id').primaryKey().defaultRandom(),
    jobKey: pgText('job_key').notNull(),
    ownerToken: pgText('owner_token').notNull(),
    acquiredAt: pgTimestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: pgTimestamp('expires_at', { withTimezone: true }).notNull(),
    updatedAt: pgTimestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [pgUniqueIndex('job_lock_key_idx').on(t.jobKey)],
);
