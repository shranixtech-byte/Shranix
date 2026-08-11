import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  real as pgReal,
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
  real as sqliteReal,
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
// PORTAL USERS — customer-scoped self-service accounts.
// NEVER grant internal ERP permissions to these users.
// ═════════════════════════════════════════════════════════
export const sqlitePortalUsers = sqliteTableBase(
  'shranix_portal_users',
  {
    ...sqliteBase,
    customerId: sqliteText('customer_id').notNull(),
    email: sqliteText('email').notNull(),
    passwordHash: sqliteText('password_hash').notNull(),
    name: sqliteText('name').notNull(),
    mobile: sqliteText('mobile'),
    // admin | accounts | purchase | viewer
    role: sqliteText('role').notNull().default('viewer'),
    // active | inactive | blocked | pending
    status: sqliteText('status').notNull().default('pending'),
    isVerified: sqliteInteger('is_verified', { mode: 'boolean' }).notNull().default(false),
    verifiedAt: sqliteText('verified_at'),
    failedLoginAttempts: sqliteInteger('failed_login_attempts').notNull().default(0),
    lockedUntil: sqliteText('locked_until'),
    lastLoginAt: sqliteText('last_login_at'),
    lastLoginIp: sqliteText('last_login_ip'),
    tokenVersion: sqliteInteger('token_version').notNull().default(0),
    // internal ERP user who created/managed this account
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    emailIdx: uniqueIndex('pu_email_idx').on(table.email),
    customerIdx: index('pu_customer_idx').on(table.customerId),
    statusIdx: index('pu_status_idx').on(table.status),
  }),
);

export const pgPortalUsers = pgTableBase(
  'shranix_portal_users',
  {
    ...pgBase,
    customerId: pgUuid('customer_id').notNull(),
    email: pgText('email').notNull(),
    passwordHash: pgText('password_hash').notNull(),
    name: pgText('name').notNull(),
    mobile: pgText('mobile'),
    role: pgText('role').notNull().default('viewer'),
    status: pgText('status').notNull().default('pending'),
    isVerified: pgBoolean('is_verified').notNull().default(false),
    verifiedAt: pgTimestamp('verified_at', { withTimezone: true }),
    failedLoginAttempts: pgInteger('failed_login_attempts').notNull().default(0),
    lockedUntil: pgTimestamp('locked_until', { withTimezone: true }),
    lastLoginAt: pgTimestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: pgText('last_login_ip'),
    tokenVersion: pgInteger('token_version').notNull().default(0),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    emailIdx: pgUniqueIndex('pu_email_idx').on(table.email),
    customerIdx: pgIndex('pu_customer_idx').on(table.customerId),
    statusIdx: pgIndex('pu_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// PORTAL RESET TOKENS — hashed password-reset tokens
// ═════════════════════════════════════════════════════════
export const sqlitePortalResetTokens = sqliteTableBase(
  'shranix_portal_reset_tokens',
  {
    ...sqliteBase,
    portalUserId: sqliteText('portal_user_id').notNull(),
    tokenHash: sqliteText('token_hash').notNull(),
    expiresAt: sqliteText('expires_at').notNull(),
    usedAt: sqliteText('used_at'),
    ipAddress: sqliteText('ip_address'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    userIdx: index('prt_user_idx').on(table.portalUserId),
    usedIdx: index('prt_used_idx').on(table.usedAt),
  }),
);

export const pgPortalResetTokens = pgTableBase(
  'shranix_portal_reset_tokens',
  {
    ...pgBase,
    portalUserId: pgUuid('portal_user_id').notNull(),
    tokenHash: pgText('token_hash').notNull(),
    expiresAt: pgTimestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: pgTimestamp('used_at', { withTimezone: true }),
    ipAddress: pgText('ip_address'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    userIdx: pgIndex('prt_user_idx').on(table.portalUserId),
    usedIdx: pgIndex('prt_used_idx').on(table.usedAt),
  }),
);

// ═════════════════════════════════════════════════════════
// PORTAL SUPPORT TICKETS
// ═════════════════════════════════════════════════════════
export const sqlitePortalTickets = sqliteTableBase(
  'shranix_portal_tickets',
  {
    ...sqliteBase,
    ticketNumber: sqliteText('ticket_number').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    portalUserId: sqliteText('portal_user_id').notNull(),
    contactName: sqliteText('contact_name'),
    contactMobile: sqliteText('contact_mobile'),
    contactEmail: sqliteText('contact_email'),
    subject: sqliteText('subject').notNull(),
    category: sqliteText('category').notNull().default('general'),
    priority: sqliteText('priority').notNull().default('normal'), // low | normal | high | urgent
    description: sqliteText('description'),
    attachment: sqliteText('attachment'), // JSON file metadata
    // open | in_progress | waiting_customer | resolved | closed
    status: sqliteText('status').notNull().default('open'),
    assignedTo: sqliteText('assigned_to'), // internal ERP user id
    resolvedAt: sqliteText('resolved_at'),
    closedAt: sqliteText('closed_at'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('pt_number_idx').on(table.ticketNumber),
    customerIdx: index('pt_customer_idx').on(table.customerId),
    statusIdx: index('pt_status_idx').on(table.status),
    assignedIdx: index('pt_assigned_idx').on(table.assignedTo),
  }),
);

export const pgPortalTickets = pgTableBase(
  'shranix_portal_tickets',
  {
    ...pgBase,
    ticketNumber: pgText('ticket_number').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    portalUserId: pgUuid('portal_user_id').notNull(),
    contactName: pgText('contact_name'),
    contactMobile: pgText('contact_mobile'),
    contactEmail: pgText('contact_email'),
    subject: pgText('subject').notNull(),
    category: pgText('category').notNull().default('general'),
    priority: pgText('priority').notNull().default('normal'),
    description: pgText('description'),
    attachment: pgText('attachment'),
    status: pgText('status').notNull().default('open'),
    assignedTo: pgUuid('assigned_to'),
    resolvedAt: pgTimestamp('resolved_at', { withTimezone: true }),
    closedAt: pgTimestamp('closed_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('pt_number_idx').on(table.ticketNumber),
    customerIdx: pgIndex('pt_customer_idx').on(table.customerId),
    statusIdx: pgIndex('pt_status_idx').on(table.status),
    assignedIdx: pgIndex('pt_assigned_idx').on(table.assignedTo),
  }),
);

// ═════════════════════════════════════════════════════════
// PORTAL TICKET MESSAGES — isInternal=true stays hidden from customer
// ═════════════════════════════════════════════════════════
export const sqlitePortalTicketMessages = sqliteTableBase(
  'shranix_portal_ticket_messages',
  {
    ...sqliteBase,
    ticketId: sqliteText('ticket_id').notNull(),
    portalUserId: sqliteText('portal_user_id'), // set when sent by customer
    internalUserId: sqliteText('internal_user_id'), // set when sent by ERP user
    message: sqliteText('message').notNull(),
    isInternal: sqliteInteger('is_internal', { mode: 'boolean' }).notNull().default(false),
    attachment: sqliteText('attachment'), // JSON file metadata
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    ticketIdx: index('ptm_ticket_idx').on(table.ticketId),
    createdIdx: index('ptm_created_idx').on(table.createdAt),
  }),
);

export const pgPortalTicketMessages = pgTableBase(
  'shranix_portal_ticket_messages',
  {
    ...pgBase,
    ticketId: pgUuid('ticket_id').notNull(),
    portalUserId: pgUuid('portal_user_id'),
    internalUserId: pgUuid('internal_user_id'),
    message: pgText('message').notNull(),
    isInternal: pgBoolean('is_internal').notNull().default(false),
    attachment: pgText('attachment'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    ticketIdx: pgIndex('ptm_ticket_idx').on(table.ticketId),
    createdIdx: pgIndex('ptm_created_idx').on(table.createdAt),
  }),
);

// ═════════════════════════════════════════════════════════
// PORTAL PAYMENTS — initiated in portal, verified server-side,
// then recorded through the existing payment/accounting flow.
// ═════════════════════════════════════════════════════════
export const sqlitePortalPayments = sqliteTableBase(
  'shranix_portal_payments',
  {
    ...sqliteBase,
    paymentNumber: sqliteText('payment_number').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    portalUserId: sqliteText('portal_user_id').notNull(),
    invoiceId: sqliteText('invoice_id'),
    amount: sqliteReal('amount').notNull().default(0),
    // upi | card | netbanking | wallet
    mode: sqliteText('mode').notNull().default('upi'),
    gatewayRef: sqliteText('gateway_ref'),
    // initiated | verified | completed | failed | expired
    status: sqliteText('status').notNull().default('initiated'),
    idempotencyKey: sqliteText('idempotency_key').notNull(),
    initiatedAt: sqliteText('initiated_at').notNull(),
    completedAt: sqliteText('completed_at'),
    failureReason: sqliteText('failure_reason'),
    verificationPayload: sqliteText('verification_payload'), // JSON gateway verification result
    // id of the created shranix_sales_payments row after completion
    salesPaymentId: sqliteText('sales_payment_id'),
    ipAddress: sqliteText('ip_address'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('pp_number_idx').on(table.paymentNumber),
    idemIdx: uniqueIndex('pp_idem_idx').on(table.idempotencyKey),
    customerIdx: index('pp_customer_idx').on(table.customerId),
    statusIdx: index('pp_status_idx').on(table.status),
    invoiceIdx: index('pp_invoice_idx').on(table.invoiceId),
  }),
);

export const pgPortalPayments = pgTableBase(
  'shranix_portal_payments',
  {
    ...pgBase,
    paymentNumber: pgText('payment_number').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    portalUserId: pgUuid('portal_user_id').notNull(),
    invoiceId: pgUuid('invoice_id'),
    amount: pgReal('amount').notNull().default(0),
    mode: pgText('mode').notNull().default('upi'),
    gatewayRef: pgText('gateway_ref'),
    status: pgText('status').notNull().default('initiated'),
    idempotencyKey: pgText('idempotency_key').notNull(),
    initiatedAt: pgTimestamp('initiated_at', { withTimezone: true }).notNull(),
    completedAt: pgTimestamp('completed_at', { withTimezone: true }),
    failureReason: pgText('failure_reason'),
    verificationPayload: pgText('verification_payload'),
    salesPaymentId: pgUuid('sales_payment_id'),
    ipAddress: pgText('ip_address'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('pp_number_idx').on(table.paymentNumber),
    idemIdx: pgUniqueIndex('pp_idem_idx').on(table.idempotencyKey),
    customerIdx: pgIndex('pp_customer_idx').on(table.customerId),
    statusIdx: pgIndex('pp_status_idx').on(table.status),
    invoiceIdx: pgIndex('pp_invoice_idx').on(table.invoiceId),
  }),
);

// ═════════════════════════════════════════════════════════
// PORTAL NOTIFICATIONS — scoped to portal users (customer-only)
// ═════════════════════════════════════════════════════════
export const sqlitePortalNotifications = sqliteTableBase(
  'shranix_portal_notifications',
  {
    ...sqliteBase,
    portalUserId: sqliteText('portal_user_id').notNull(),
    title: sqliteText('title').notNull(),
    message: sqliteText('message').notNull(),
    type: sqliteText('type').notNull().default('info'), // info | success | warning | reminder | critical
    documentType: sqliteText('document_type'),
    documentId: sqliteText('document_id'),
    isRead: sqliteInteger('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: sqliteText('read_at'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    userIdx: index('pn_user_idx').on(table.portalUserId),
    readIdx: index('pn_read_idx').on(table.portalUserId, table.isRead),
  }),
);

export const pgPortalNotifications = pgTableBase(
  'shranix_portal_notifications',
  {
    ...pgBase,
    portalUserId: pgUuid('portal_user_id').notNull(),
    title: pgText('title').notNull(),
    message: pgText('message').notNull(),
    type: pgText('type').notNull().default('info'),
    documentType: pgText('document_type'),
    documentId: pgUuid('document_id'),
    isRead: pgBoolean('is_read').notNull().default(false),
    readAt: pgTimestamp('read_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    userIdx: pgIndex('pn_user_idx').on(table.portalUserId),
    readIdx: pgIndex('pn_read_idx').on(table.portalUserId, table.isRead),
  }),
);
