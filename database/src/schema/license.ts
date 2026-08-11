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
// LICENSES — the software usage authorization derived from a
// commercial subscription. Subscription stays the source of
// commercial truth; license limits/entitlements are snapshots
// of the subscribed plan version (never rewritten).
// Status: PENDING | ACTIVE | GRACE_PERIOD | SUSPENDED |
//         EXPIRED | REVOKED | CANCELLED
// ═════════════════════════════════════════════════════════
export const sqliteLicenses = sqliteTableBase(
  'shranix_licenses',
  {
    ...sqliteBase,
    licenseNumber: sqliteText('license_number').notNull(),
    licensePublicId: sqliteText('license_public_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    subscriptionId: sqliteText('subscription_id').notNull(),
    planId: sqliteText('plan_id').notNull(),
    planVersionId: sqliteText('plan_version_id'),
    // trial | standard | professional | enterprise | custom | lifetime
    licenseType: sqliteText('license_type').notNull().default('standard'),
    status: sqliteText('status').notNull().default('PENDING'),
    issuedAt: sqliteText('issued_at'),
    startsAt: sqliteText('starts_at'),
    expiresAt: sqliteText('expires_at'),
    graceUntil: sqliteText('grace_until'),
    maxUsers: sqliteInteger('max_users').notNull().default(5),
    maxDevices: sqliteInteger('max_devices').notNull().default(1),
    maxBranches: sqliteInteger('max_branches').notNull().default(1),
    maxInstallations: sqliteInteger('max_installations').notNull().default(1),
    // live counter of ACTIVE devices — incremented atomically on approval
    activeDevices: sqliteInteger('active_devices').notNull().default(0),
    autoRenew: sqliteInteger('auto_renew', { mode: 'boolean' }).notNull().default(false),
    // JSON snapshot of plan features — historical consistency
    entitlements: sqliteText('entitlements').notNull().default('{}'),
    // JSON snapshot of plan limits
    limits: sqliteText('limits').notNull().default('{}'),
    revokedAt: sqliteText('revoked_at'),
    revocationReason: sqliteText('revocation_reason'),
    lastValidatedAt: sqliteText('last_validated_at'),
    metadata: sqliteText('metadata'), // JSON
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('lic_number_idx').on(table.licenseNumber),
    publicIdIdx: uniqueIndex('lic_public_id_idx').on(table.licensePublicId),
    customerIdx: index('lic_customer_idx').on(table.customerId),
    subscriptionIdx: index('lic_subscription_idx').on(table.subscriptionId),
    statusIdx: index('lic_status_idx').on(table.status),
    expiresIdx: index('lic_expires_idx').on(table.expiresAt),
  }),
);

export const pgLicenses = pgTableBase(
  'shranix_licenses',
  {
    ...pgBase,
    licenseNumber: pgText('license_number').notNull(),
    licensePublicId: pgText('license_public_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    subscriptionId: pgUuid('subscription_id').notNull(),
    planId: pgUuid('plan_id').notNull(),
    planVersionId: pgUuid('plan_version_id'),
    licenseType: pgText('license_type').notNull().default('standard'),
    status: pgText('status').notNull().default('PENDING'),
    issuedAt: pgTimestamp('issued_at', { withTimezone: true }),
    startsAt: pgTimestamp('starts_at', { withTimezone: true }),
    expiresAt: pgTimestamp('expires_at', { withTimezone: true }),
    graceUntil: pgTimestamp('grace_until', { withTimezone: true }),
    maxUsers: pgInteger('max_users').notNull().default(5),
    maxDevices: pgInteger('max_devices').notNull().default(1),
    maxBranches: pgInteger('max_branches').notNull().default(1),
    maxInstallations: pgInteger('max_installations').notNull().default(1),
    activeDevices: pgInteger('active_devices').notNull().default(0),
    autoRenew: pgBoolean('auto_renew').notNull().default(false),
    entitlements: pgText('entitlements').notNull().default('{}'),
    limits: pgText('limits').notNull().default('{}'),
    revokedAt: pgTimestamp('revoked_at', { withTimezone: true }),
    revocationReason: pgText('revocation_reason'),
    lastValidatedAt: pgTimestamp('last_validated_at', { withTimezone: true }),
    metadata: pgText('metadata'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('lic_number_idx').on(table.licenseNumber),
    publicIdIdx: pgUniqueIndex('lic_public_id_idx').on(table.licensePublicId),
    customerIdx: pgIndex('lic_customer_idx').on(table.customerId),
    subscriptionIdx: pgIndex('lic_subscription_idx').on(table.subscriptionId),
    statusIdx: pgIndex('lic_status_idx').on(table.status),
    expiresIdx: pgIndex('lic_expires_idx').on(table.expiresAt),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE DEVICES — authorized devices bound to a license.
// Only normalized/hashed identifiers are stored — never raw
// machine fingerprints. Status: active | inactive
// ═════════════════════════════════════════════════════════
export const sqliteLicenseDevices = sqliteTableBase(
  'shranix_license_devices',
  {
    ...sqliteBase,
    devicePublicId: sqliteText('device_public_id').notNull(),
    licenseId: sqliteText('license_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    deviceIdentifierHash: sqliteText('device_identifier_hash').notNull(),
    deviceName: sqliteText('device_name'),
    platform: sqliteText('platform'),
    os: sqliteText('os'),
    applicationVersion: sqliteText('application_version'),
    // active | inactive
    status: sqliteText('status').notNull().default('active'),
    firstSeenAt: sqliteText('first_seen_at').notNull(),
    lastSeenAt: sqliteText('last_seen_at'),
    lastValidationAt: sqliteText('last_validation_at'),
    metadata: sqliteText('metadata'), // JSON — no raw hardware identifiers
  },
  (table) => ({
    publicIdIdx: uniqueIndex('ld_public_id_idx').on(table.devicePublicId),
    licenseDeviceIdx: uniqueIndex('ld_license_device_idx').on(
      table.licenseId,
      table.deviceIdentifierHash,
    ),
    licenseIdx: index('ld_license_idx').on(table.licenseId),
    customerIdx: index('ld_customer_idx').on(table.customerId),
    statusIdx: index('ld_status_idx').on(table.status),
  }),
);

export const pgLicenseDevices = pgTableBase(
  'shranix_license_devices',
  {
    ...pgBase,
    devicePublicId: pgText('device_public_id').notNull(),
    licenseId: pgUuid('license_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    deviceIdentifierHash: pgText('device_identifier_hash').notNull(),
    deviceName: pgText('device_name'),
    platform: pgText('platform'),
    os: pgText('os'),
    applicationVersion: pgText('application_version'),
    status: pgText('status').notNull().default('active'),
    firstSeenAt: pgTimestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: pgTimestamp('last_seen_at', { withTimezone: true }),
    lastValidationAt: pgTimestamp('last_validation_at', { withTimezone: true }),
    metadata: pgText('metadata'),
  },
  (table) => ({
    publicIdIdx: pgUniqueIndex('ld_public_id_idx').on(table.devicePublicId),
    licenseDeviceIdx: pgUniqueIndex('ld_license_device_idx').on(
      table.licenseId,
      table.deviceIdentifierHash,
    ),
    licenseIdx: pgIndex('ld_license_idx').on(table.licenseId),
    customerIdx: pgIndex('ld_customer_idx').on(table.customerId),
    statusIdx: pgIndex('ld_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE INSTALLATIONS — application installations under a
// license. Hashed device reference only.
// ═════════════════════════════════════════════════════════
export const sqliteLicenseInstallations = sqliteTableBase(
  'shranix_license_installations',
  {
    ...sqliteBase,
    installationPublicId: sqliteText('installation_public_id').notNull(),
    licenseId: sqliteText('license_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    installationName: sqliteText('installation_name'),
    applicationVersion: sqliteText('application_version'),
    platform: sqliteText('platform'),
    osVersion: sqliteText('os_version'),
    deviceIdentifierHash: sqliteText('device_identifier_hash'),
    machineFingerprintHash: sqliteText('machine_fingerprint_hash'),
    // active | inactive | stale
    status: sqliteText('status').notNull().default('active'),
    firstSeenAt: sqliteText('first_seen_at').notNull(),
    lastSeenAt: sqliteText('last_seen_at'),
    activatedAt: sqliteText('activated_at'),
    deactivatedAt: sqliteText('deactivated_at'),
    lastValidationAt: sqliteText('last_validation_at'),
    metadata: sqliteText('metadata'), // JSON
  },
  (table) => ({
    publicIdIdx: uniqueIndex('li_public_id_idx').on(table.installationPublicId),
    licenseIdx: index('li_license_idx').on(table.licenseId),
    customerIdx: index('li_customer_idx').on(table.customerId),
    statusIdx: index('li_status_idx').on(table.status),
  }),
);

export const pgLicenseInstallations = pgTableBase(
  'shranix_license_installations',
  {
    ...pgBase,
    installationPublicId: pgText('installation_public_id').notNull(),
    licenseId: pgUuid('license_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    installationName: pgText('installation_name'),
    applicationVersion: pgText('application_version'),
    platform: pgText('platform'),
    osVersion: pgText('os_version'),
    deviceIdentifierHash: pgText('device_identifier_hash'),
    machineFingerprintHash: pgText('machine_fingerprint_hash'),
    status: pgText('status').notNull().default('active'),
    firstSeenAt: pgTimestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastSeenAt: pgTimestamp('last_seen_at', { withTimezone: true }),
    activatedAt: pgTimestamp('activated_at', { withTimezone: true }),
    deactivatedAt: pgTimestamp('deactivated_at', { withTimezone: true }),
    lastValidationAt: pgTimestamp('last_validation_at', { withTimezone: true }),
    metadata: pgText('metadata'),
  },
  (table) => ({
    publicIdIdx: pgUniqueIndex('li_public_id_idx').on(table.installationPublicId),
    licenseIdx: pgIndex('li_license_idx').on(table.licenseId),
    customerIdx: pgIndex('li_customer_idx').on(table.customerId),
    statusIdx: pgIndex('li_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE ACTIVATIONS — activation records.
// Status: PENDING | ACTIVE | REJECTED | DEACTIVATED | EXPIRED | REVOKED
// ═════════════════════════════════════════════════════════
export const sqliteLicenseActivations = sqliteTableBase(
  'shranix_license_activations',
  {
    ...sqliteBase,
    activationPublicId: sqliteText('activation_public_id').notNull(),
    licenseId: sqliteText('license_id').notNull(),
    installationId: sqliteText('installation_id'),
    deviceId: sqliteText('device_id'),
    // online | offline | admin_approved | reactivation | device_transfer | recovery
    activationType: sqliteText('activation_type').notNull().default('online'),
    status: sqliteText('status').notNull().default('PENDING'),
    activationReference: sqliteText('activation_reference').notNull(),
    requestedAt: sqliteText('requested_at').notNull(),
    approvedAt: sqliteText('approved_at'),
    deactivatedAt: sqliteText('deactivated_at'),
    lastValidationAt: sqliteText('last_validation_at'),
    reason: sqliteText('reason'),
    metadata: sqliteText('metadata'), // JSON
    requestedBy: sqliteText('requested_by'),
    approvedBy: sqliteText('approved_by'),
  },
  (table) => ({
    publicIdIdx: uniqueIndex('la_public_id_idx').on(table.activationPublicId),
    referenceIdx: uniqueIndex('la_reference_idx').on(table.activationReference),
    licenseIdx: index('la_license_idx').on(table.licenseId),
    deviceIdx: index('la_device_idx').on(table.deviceId),
    statusIdx: index('la_status_idx').on(table.status),
  }),
);

export const pgLicenseActivations = pgTableBase(
  'shranix_license_activations',
  {
    ...pgBase,
    activationPublicId: pgText('activation_public_id').notNull(),
    licenseId: pgUuid('license_id').notNull(),
    installationId: pgUuid('installation_id'),
    deviceId: pgUuid('device_id'),
    activationType: pgText('activation_type').notNull().default('online'),
    status: pgText('status').notNull().default('PENDING'),
    activationReference: pgText('activation_reference').notNull(),
    requestedAt: pgTimestamp('requested_at', { withTimezone: true }).notNull(),
    approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
    deactivatedAt: pgTimestamp('deactivated_at', { withTimezone: true }),
    lastValidationAt: pgTimestamp('last_validation_at', { withTimezone: true }),
    reason: pgText('reason'),
    metadata: pgText('metadata'),
    requestedBy: pgUuid('requested_by'),
    approvedBy: pgUuid('approved_by'),
  },
  (table) => ({
    publicIdIdx: pgUniqueIndex('la_public_id_idx').on(table.activationPublicId),
    referenceIdx: pgUniqueIndex('la_reference_idx').on(table.activationReference),
    licenseIdx: pgIndex('la_license_idx').on(table.licenseId),
    deviceIdx: pgIndex('la_device_idx').on(table.deviceId),
    statusIdx: pgIndex('la_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE EVENTS — immutable lifecycle history
// ═════════════════════════════════════════════════════════
export const sqliteLicenseEvents = sqliteTableBase(
  'shranix_license_events',
  {
    ...sqliteBase,
    licenseId: sqliteText('license_id').notNull(),
    eventType: sqliteText('event_type').notNull(), // LICENSE_CREATED | LICENSE_ACTIVATED | LICENSE_VALIDATED | LICENSE_RENEWED | LICENSE_SUSPENDED | LICENSE_REACTIVATED | LICENSE_EXPIRED | LICENSE_REVOKED | LICENSE_CANCELLED | DEVICE_ADDED | DEVICE_DEACTIVATED | DEVICE_TRANSFERRED | ACTIVATION_REQUESTED | ACTIVATION_APPROVED | ACTIVATION_REJECTED | LIMIT_REACHED | VALIDATION_FAILED
    eventTime: sqliteText('event_time').notNull(),
    fromStatus: sqliteText('from_status'),
    toStatus: sqliteText('to_status'),
    actor: sqliteText('actor'),
    source: sqliteText('source'), // admin | portal | api | scheduler | installer
    installationRef: sqliteText('installation_ref'),
    deviceRef: sqliteText('device_ref'),
    metadata: sqliteText('metadata'), // JSON
  },
  (table) => ({
    licenseIdx: index('lev_license_idx').on(table.licenseId),
    typeIdx: index('lev_type_idx').on(table.eventType),
    timeIdx: index('lev_time_idx').on(table.eventTime),
  }),
);

export const pgLicenseEvents = pgTableBase(
  'shranix_license_events',
  {
    ...pgBase,
    licenseId: pgUuid('license_id').notNull(),
    eventType: pgText('event_type').notNull(),
    eventTime: pgTimestamp('event_time', { withTimezone: true }).notNull(),
    fromStatus: pgText('from_status'),
    toStatus: pgText('to_status'),
    actor: pgUuid('actor'),
    source: pgText('source'),
    installationRef: pgUuid('installation_ref'),
    deviceRef: pgUuid('device_ref'),
    metadata: pgText('metadata'),
  },
  (table) => ({
    licenseIdx: pgIndex('lev_license_idx').on(table.licenseId),
    typeIdx: pgIndex('lev_type_idx').on(table.eventType),
    timeIdx: pgIndex('lev_time_idx').on(table.eventTime),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE TRANSFERS — controlled device transfer history
// ═════════════════════════════════════════════════════════
export const sqliteLicenseTransfers = sqliteTableBase(
  'shranix_license_transfers',
  {
    ...sqliteBase,
    transferPublicId: sqliteText('transfer_public_id').notNull(),
    licenseId: sqliteText('license_id').notNull(),
    fromDeviceId: sqliteText('from_device_id'),
    toDeviceId: sqliteText('to_device_id'),
    fromDeviceRef: sqliteText('from_device_ref'),
    toDeviceRef: sqliteText('to_device_ref'),
    // pending | approved | rejected | completed
    status: sqliteText('status').notNull().default('pending'),
    requestedAt: sqliteText('requested_at').notNull(),
    requestedBy: sqliteText('requested_by'),
    approvedAt: sqliteText('approved_at'),
    approvedBy: sqliteText('approved_by'),
    reason: sqliteText('reason'),
    metadata: sqliteText('metadata'), // JSON
  },
  (table) => ({
    publicIdIdx: uniqueIndex('lt_public_id_idx').on(table.transferPublicId),
    licenseIdx: index('lt_license_idx').on(table.licenseId),
    statusIdx: index('lt_status_idx').on(table.status),
  }),
);

export const pgLicenseTransfers = pgTableBase(
  'shranix_license_transfers',
  {
    ...pgBase,
    transferPublicId: pgText('transfer_public_id').notNull(),
    licenseId: pgUuid('license_id').notNull(),
    fromDeviceId: pgUuid('from_device_id'),
    toDeviceId: pgUuid('to_device_id'),
    fromDeviceRef: pgText('from_device_ref'),
    toDeviceRef: pgText('to_device_ref'),
    status: pgText('status').notNull().default('pending'),
    requestedAt: pgTimestamp('requested_at', { withTimezone: true }).notNull(),
    requestedBy: pgUuid('requested_by'),
    approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
    approvedBy: pgUuid('approved_by'),
    reason: pgText('reason'),
    metadata: pgText('metadata'),
  },
  (table) => ({
    publicIdIdx: pgUniqueIndex('lt_public_id_idx').on(table.transferPublicId),
    licenseIdx: pgIndex('lt_license_idx').on(table.licenseId),
    statusIdx: pgIndex('lt_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// LICENSE TOKENS — issued signed tokens (online validation,
// offline-token future). Status: active | revoked | expired
// ═════════════════════════════════════════════════════════
export const sqliteLicenseTokens = sqliteTableBase(
  'shranix_license_tokens',
  {
    ...sqliteBase,
    licenseId: sqliteText('license_id').notNull(),
    tokenVersion: sqliteInteger('token_version').notNull().default(1),
    tokenJti: sqliteText('token_jti').notNull(),
    token: sqliteText('token'), // signed token payload (opaque)
    issuedAt: sqliteText('issued_at').notNull(),
    expiresAt: sqliteText('expires_at').notNull(),
    status: sqliteText('status').notNull().default('active'),
    revokedAt: sqliteText('revoked_at'),
    revokedReason: sqliteText('revoked_reason'),
  },
  (table) => ({
    licenseIdx: index('ltok_license_idx').on(table.licenseId),
    jtiIdx: uniqueIndex('ltok_jti_idx').on(table.tokenJti),
    statusIdx: index('ltok_status_idx').on(table.status),
    expiresIdx: index('ltok_expires_idx').on(table.expiresAt),
  }),
);

export const pgLicenseTokens = pgTableBase(
  'shranix_license_tokens',
  {
    ...pgBase,
    licenseId: pgUuid('license_id').notNull(),
    tokenVersion: pgInteger('token_version').notNull().default(1),
    tokenJti: pgText('token_jti').notNull(),
    token: pgText('token'),
    issuedAt: pgTimestamp('issued_at', { withTimezone: true }).notNull(),
    expiresAt: pgTimestamp('expires_at', { withTimezone: true }).notNull(),
    status: pgText('status').notNull().default('active'),
    revokedAt: pgTimestamp('revoked_at', { withTimezone: true }),
    revokedReason: pgText('revoked_reason'),
  },
  (table) => ({
    licenseIdx: pgIndex('ltok_license_idx').on(table.licenseId),
    jtiIdx: pgUniqueIndex('ltok_jti_idx').on(table.tokenJti),
    statusIdx: pgIndex('ltok_status_idx').on(table.status),
    expiresIdx: pgIndex('ltok_expires_idx').on(table.expiresAt),
  }),
);
