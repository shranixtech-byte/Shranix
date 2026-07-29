import { sqliteTable as sqliteTableBase, text as sqliteText } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, uuid as pgUuid, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

// ── Audit Log ───────────────────────────────────────────
// Tracks all security-relevant events: login, logout, permission changes, password changes

export const sqliteAuditLogs = sqliteTableBase('shranix_audit_logs', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  userId: sqliteText('user_id').notNull(),
  event: sqliteText('event').notNull(),
  resource: sqliteText('resource'),
  action: sqliteText('action'),
  details: sqliteText('details'),
  ipAddress: sqliteText('ip_address'),
  userAgent: sqliteText('user_agent'),
  status: sqliteText('status').notNull().default('success'),
  severity: sqliteText('severity').notNull().default('info'),
});

export const pgAuditLogs = pgTableBase('shranix_audit_logs', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  userId: pgUuid('user_id').notNull(),
  event: pgText('event').notNull(),
  resource: pgText('resource'),
  action: pgText('action'),
  details: pgText('details'),
  ipAddress: pgText('ip_address'),
  userAgent: pgText('user_agent'),
  status: pgText('status').notNull().default('success'),
  severity: pgText('severity').notNull().default('info'),
});
