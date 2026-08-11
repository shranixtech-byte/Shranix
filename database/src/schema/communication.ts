import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  uniqueIndex,
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
// COMMUNICATION TEMPLATES
// Reusable channel templates — {{variable}} substitution.
// ═════════════════════════════════════════════════════════
export const sqliteCommunicationTemplates = sqliteTableBase(
  'shranix_communication_templates',
  {
    ...sqliteBase,
    templateCode: sqliteText('template_code').notNull(),
    templateName: sqliteText('template_name').notNull(),
    channel: sqliteText('channel').notNull(), // email | sms | whatsapp | in_app
    subject: sqliteText('subject'),
    body: sqliteText('body').notNull(),
    htmlBody: sqliteText('html_body'),
    variables: sqliteText('variables'), // JSON: [{ name, label, required }]
    language: sqliteText('language').notNull().default('en'), // en | mr | hi
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    category: sqliteText('category'), // invoices | payments | orders | crm | reminders | system | offers
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('comm_tpl_code_idx').on(table.templateCode, table.language),
    channelIdx: index('comm_tpl_channel_idx').on(table.channel),
  }),
);

export const pgCommunicationTemplates = pgTableBase(
  'shranix_communication_templates',
  {
    ...pgBase,
    templateCode: pgText('template_code').notNull(),
    templateName: pgText('template_name').notNull(),
    channel: pgText('channel').notNull(),
    subject: pgText('subject'),
    body: pgText('body').notNull(),
    htmlBody: pgText('html_body'),
    variables: pgText('variables'),
    language: pgText('language').notNull().default('en'),
    isActive: pgBoolean('is_active').notNull().default(true),
    category: pgText('category'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('comm_tpl_code_idx').on(table.templateCode, table.language),
    channelIdx: pgIndex('comm_tpl_channel_idx').on(table.channel),
  }),
);

// ═════════════════════════════════════════════════════════
// COMMUNICATIONS (send log / history)
// Single source of truth for every outbound message.
// ═════════════════════════════════════════════════════════
export const sqliteCommunications = sqliteTableBase(
  'shranix_communications',
  {
    ...sqliteBase,
    channel: sqliteText('channel').notNull(), // email | sms | whatsapp | in_app
    templateCode: sqliteText('template_code'),
    templateName: sqliteText('template_name'),
    recipientType: sqliteText('recipient_type'), // user | customer | supplier | lead | other
    recipientId: sqliteText('recipient_id'),
    recipientAddress: sqliteText('recipient_address'), // email / phone / wa number
    subject: sqliteText('subject'),
    messageBody: sqliteText('message_body'),
    referenceType: sqliteText('reference_type'), // sales_invoice | purchase_order | quotation | crm_followup | ...
    referenceId: sqliteText('reference_id'),
    referenceNumber: sqliteText('reference_number'),
    status: sqliteText('status').notNull().default('queued'), // queued | sending | sent | delivered | read | failed | cancelled
    provider: sqliteText('provider'), // smtp | sendgrid | twilio | whatsapp_business | in_app | log
    providerMessageId: sqliteText('provider_message_id'),
    providerResponse: sqliteText('provider_response'),
    attempts: sqliteInteger('attempts').notNull().default(0),
    maxAttempts: sqliteInteger('max_attempts').notNull().default(3),
    lastAttemptAt: sqliteText('last_attempt_at'),
    nextRetryAt: sqliteText('next_retry_at'),
    failureReason: sqliteText('failure_reason'),
    scheduledAt: sqliteText('scheduled_at'), // future → scheduled send
    sentAt: sqliteText('sent_at'),
    deliveredAt: sqliteText('delivered_at'),
    readAt: sqliteText('read_at'),
    failedAt: sqliteText('failed_at'),
    batchId: sqliteText('batch_id'), // bulk/campaign reference
    attachmentRefs: sqliteText('attachment_refs'), // JSON: [fileId]
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    statusIdx: index('comm_log_status_idx').on(table.status),
    channelIdx: index('comm_log_channel_idx').on(table.channel),
    refIdx: index('comm_log_ref_idx').on(table.referenceType, table.referenceId),
    recipientIdx: index('comm_log_recipient_idx').on(table.recipientType, table.recipientId),
    scheduledIdx: index('comm_log_scheduled_idx').on(table.scheduledAt),
    batchIdx: index('comm_log_batch_idx').on(table.batchId),
  }),
);

export const pgCommunications = pgTableBase(
  'shranix_communications',
  {
    ...pgBase,
    channel: pgText('channel').notNull(),
    templateCode: pgText('template_code'),
    templateName: pgText('template_name'),
    recipientType: pgText('recipient_type'),
    recipientId: pgUuid('recipient_id'),
    recipientAddress: pgText('recipient_address'),
    subject: pgText('subject'),
    messageBody: pgText('message_body'),
    referenceType: pgText('reference_type'),
    referenceId: pgUuid('reference_id'),
    referenceNumber: pgText('reference_number'),
    status: pgText('status').notNull().default('queued'),
    provider: pgText('provider'),
    providerMessageId: pgText('provider_message_id'),
    providerResponse: pgText('provider_response'),
    attempts: pgInteger('attempts').notNull().default(0),
    maxAttempts: pgInteger('max_attempts').notNull().default(3),
    lastAttemptAt: pgTimestamp('last_attempt_at', { withTimezone: true }),
    nextRetryAt: pgTimestamp('next_retry_at', { withTimezone: true }),
    failureReason: pgText('failure_reason'),
    scheduledAt: pgTimestamp('scheduled_at', { withTimezone: true }),
    sentAt: pgTimestamp('sent_at', { withTimezone: true }),
    deliveredAt: pgTimestamp('delivered_at', { withTimezone: true }),
    readAt: pgTimestamp('read_at', { withTimezone: true }),
    failedAt: pgTimestamp('failed_at', { withTimezone: true }),
    batchId: pgText('batch_id'),
    attachmentRefs: pgText('attachment_refs'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    statusIdx: pgIndex('comm_log_status_idx').on(table.status),
    channelIdx: pgIndex('comm_log_channel_idx').on(table.channel),
    refIdx: pgIndex('comm_log_ref_idx').on(table.referenceType, table.referenceId),
    recipientIdx: pgIndex('comm_log_recipient_idx').on(table.recipientType, table.recipientId),
    scheduledIdx: pgIndex('comm_log_scheduled_idx').on(table.scheduledAt),
    batchIdx: pgIndex('comm_log_batch_idx').on(table.batchId),
  }),
);

// ═════════════════════════════════════════════════════════
// COMMUNICATION PREFERENCES
// Per user/customer/supplier channel + category toggles.
// ═════════════════════════════════════════════════════════
export const sqliteCommunicationPreferences = sqliteTableBase(
  'shranix_communication_preferences',
  {
    ...sqliteBase,
    entityType: sqliteText('entity_type').notNull(), // user | customer | supplier
    entityId: sqliteText('entity_id').notNull(),
    channel: sqliteText('channel').notNull(), // email | sms | whatsapp
    category: sqliteText('category').notNull().default('system'), // invoices | payments | orders | offers | crm | reminders | system
    enabled: sqliteInteger('enabled', { mode: 'boolean' }).notNull().default(true),
    preferred: sqliteInteger('preferred', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => ({
    entityIdx: uniqueIndex('comm_pref_entity_idx').on(
      table.entityType,
      table.entityId,
      table.channel,
      table.category,
    ),
  }),
);

export const pgCommunicationPreferences = pgTableBase(
  'shranix_communication_preferences',
  {
    ...pgBase,
    entityType: pgText('entity_type').notNull(),
    entityId: pgUuid('entity_id').notNull(),
    channel: pgText('channel').notNull(),
    category: pgText('category').notNull().default('system'),
    enabled: pgBoolean('enabled').notNull().default(true),
    preferred: pgBoolean('preferred').notNull().default(false),
  },
  (table) => ({
    entityIdx: pgUniqueIndex('comm_pref_entity_idx').on(
      table.entityType,
      table.entityId,
      table.channel,
      table.category,
    ),
  }),
);

// ═════════════════════════════════════════════════════════
// COMMUNICATION CAMPAIGNS (bulk)
// ═════════════════════════════════════════════════════════
export const sqliteCommunicationCampaigns = sqliteTableBase(
  'shranix_communication_campaigns',
  {
    ...sqliteBase,
    campaignName: sqliteText('campaign_name').notNull(),
    channel: sqliteText('channel').notNull(),
    templateCode: sqliteText('template_code'),
    audience: sqliteText('audience'), // JSON: [{ recipientType, recipientId, address }]
    recipientCount: sqliteInteger('recipient_count').notNull().default(0),
    status: sqliteText('status').notNull().default('draft'), // draft | scheduled | sending | completed | cancelled
    scheduledAt: sqliteText('scheduled_at'),
    startedAt: sqliteText('started_at'),
    completedAt: sqliteText('completed_at'),
    sentCount: sqliteInteger('sent_count').notNull().default(0),
    deliveredCount: sqliteInteger('delivered_count').notNull().default(0),
    failedCount: sqliteInteger('failed_count').notNull().default(0),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    statusIdx: index('comm_camp_status_idx').on(table.status),
  }),
);

export const pgCommunicationCampaigns = pgTableBase(
  'shranix_communication_campaigns',
  {
    ...pgBase,
    campaignName: pgText('campaign_name').notNull(),
    channel: pgText('channel').notNull(),
    templateCode: pgText('template_code'),
    audience: pgText('audience'),
    recipientCount: pgInteger('recipient_count').notNull().default(0),
    status: pgText('status').notNull().default('draft'),
    scheduledAt: pgTimestamp('scheduled_at', { withTimezone: true }),
    startedAt: pgTimestamp('started_at', { withTimezone: true }),
    completedAt: pgTimestamp('completed_at', { withTimezone: true }),
    sentCount: pgInteger('sent_count').notNull().default(0),
    deliveredCount: pgInteger('delivered_count').notNull().default(0),
    failedCount: pgInteger('failed_count').notNull().default(0),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    statusIdx: pgIndex('comm_camp_status_idx').on(table.status),
  }),
);
