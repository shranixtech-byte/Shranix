import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  timestamp as pgTimestamp,
  uuid as pgUuid,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
} from 'drizzle-orm/sqlite-core';

// ═══════════════════════════════════════════════════════════════
// WEBHOOK DELIVERY — Outbound webhook delivery history
//
// Records each delivery attempt for auditability.
// Does NOT store secrets or full payloads.
// ═══════════════════════════════════════════════════════════════

export const sqliteWebhookDeliveries = sqliteTableBase('shranix_webhook_deliveries', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  webhookId: sqliteText('webhook_id').notNull(),
  attempt: sqliteInteger('attempt').notNull().default(1),
  status: sqliteText('status').notNull().default('sending'),
  httpStatus: sqliteInteger('http_status'),
  error: sqliteText('error'),
  triggeredAt: sqliteText('triggered_at').notNull(),
  completedAt: sqliteText('completed_at'),
});

export const pgWebhookDeliveries = pgTableBase('shranix_webhook_deliveries', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  webhookId: pgText('webhook_id').notNull(),
  attempt: pgInteger('attempt').notNull().default(1),
  status: pgText('status').notNull().default('sending'),
  httpStatus: pgInteger('http_status'),
  error: pgText('error'),
  triggeredAt: pgTimestamp('triggered_at', { withTimezone: true }).notNull(),
  completedAt: pgTimestamp('completed_at', { withTimezone: true }),
});
