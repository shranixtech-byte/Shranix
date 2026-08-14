import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  index,
} from 'drizzle-orm/sqlite-core';

// ── SQLite base ──────────────────────────────────────────
const sqliteBase = {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};

// ── PostgreSQL base ──────────────────────────────────────
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// SECURITY EVENTS — Phase 15 anti-piracy / security event
// engine. Immutable, append-only log of security-relevant
// facts (token failures, replay, device mismatch, clock
// rollback, activation abuse, admin override, ...).
//
// Severity: INFO | LOW | MEDIUM | HIGH | CRITICAL
// Response policy level: 1 (log only) → 6 (license
// suspension — only when authorized and justified).
// ═════════════════════════════════════════════════════════
export const sqliteSecurityEvents = sqliteTableBase(
  'shranix_security_events',
  {
    ...sqliteBase,
    eventId: sqliteText('event_id').notNull(),
    eventType: sqliteText('event_type').notNull(),
    severity: sqliteText('severity').notNull().default('LOW'),
    eventTime: sqliteText('event_time').notNull(),
    // Safe references — never raw machine identifiers / secrets
    customerId: sqliteText('customer_id'),
    licenseId: sqliteText('license_id'),
    deviceRef: sqliteText('device_ref'),
    installationRef: sqliteText('installation_ref'),
    source: sqliteText('source'), // api | installer | desktop | admin | scheduler | webhook
    ipAddress: sqliteText('ip_address'),
    actor: sqliteText('actor'),
    // 1 = log only, 2 = require online validation, 3 = require reauthentication,
    // 4 = require device recovery, 5 = admin review, 6 = license suspension
    responseLevel: sqliteInteger('response_level').notNull().default(1),
    metadata: sqliteText('metadata'), // JSON — safe metadata only
  },
  (table) => ({
    eventIdIdx: index('sec_event_id_idx').on(table.eventId),
    typeIdx: index('sec_type_idx').on(table.eventType),
    severityIdx: index('sec_severity_idx').on(table.severity),
    timeIdx: index('sec_time_idx').on(table.eventTime),
    customerIdx: index('sec_customer_idx').on(table.customerId),
    licenseIdx: index('sec_license_idx').on(table.licenseId),
  }),
);

export const pgSecurityEvents = pgTableBase(
  'shranix_security_events',
  {
    ...pgBase,
    eventId: pgText('event_id').notNull(),
    eventType: pgText('event_type').notNull(),
    severity: pgText('severity').notNull().default('LOW'),
    eventTime: pgTimestamp('event_time', { withTimezone: true }).notNull(),
    customerId: pgUuid('customer_id'),
    licenseId: pgUuid('license_id'),
    deviceRef: pgText('device_ref'),
    installationRef: pgText('installation_ref'),
    source: pgText('source'),
    ipAddress: pgText('ip_address'),
    actor: pgUuid('actor'),
    responseLevel: pgInteger('response_level').notNull().default(1),
    metadata: pgText('metadata'),
  },
  (table) => ({
    eventIdIdx: pgIndex('sec_event_id_idx').on(table.eventId),
    typeIdx: pgIndex('sec_type_idx').on(table.eventType),
    severityIdx: pgIndex('sec_severity_idx').on(table.severity),
    timeIdx: pgIndex('sec_time_idx').on(table.eventTime),
    customerIdx: pgIndex('sec_customer_idx').on(table.customerId),
    licenseIdx: pgIndex('sec_license_idx').on(table.licenseId),
  }),
);
