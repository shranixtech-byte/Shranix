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
// PHASE 16 — CENTRAL LICENSE SERVER: release/version registry.
//
// software_releases — one row per released build
//   (version + build + platform + architecture + channel).
//   Status: DRAFT | TESTING | STAGED | PUBLISHED | DEPRECATED | REVOKED
//   Channels: STABLE | BETA | INTERNAL | CUSTOMER_SPECIFIC
// ═════════════════════════════════════════════════════════
export const sqliteSoftwareReleases = sqliteTableBase(
  'shranix_software_releases',
  {
    ...sqliteBase,
    releaseId: sqliteText('release_id').notNull(),
    version: sqliteText('version').notNull(),
    buildNumber: sqliteText('build_number'),
    platform: sqliteText('platform').notNull().default('windows'),
    architecture: sqliteText('architecture').notNull().default('x64'),
    channel: sqliteText('channel').notNull().default('STABLE'),
    status: sqliteText('status').notNull().default('DRAFT'),
    releaseNotes: sqliteText('release_notes'),
    critical: sqliteInteger('critical', { mode: 'boolean' }).notNull().default(false),
    releasedAt: sqliteText('released_at'),
    createdBy: sqliteText('created_by'),
    publishedBy: sqliteText('published_by'),
    publishedAt: sqliteText('published_at'),
    deprecatedAt: sqliteText('deprecated_at'),
    revokedAt: sqliteText('revoked_at'),
    revocationReason: sqliteText('revocation_reason'),
    metadata: sqliteText('metadata'), // JSON
  },
  (table) => ({
    releaseIdIdx: uniqueIndex('rel_release_id_idx').on(table.releaseId),
    versionChannelPlatformIdx: uniqueIndex('rel_version_chan_plat_idx').on(
      table.version,
      table.channel,
      table.platform,
      table.architecture,
    ),
    channelIdx: index('rel_channel_idx').on(table.channel),
    statusIdx: index('rel_status_idx').on(table.status),
    publishedAtIdx: index('rel_published_at_idx').on(table.publishedAt),
  }),
);

export const pgSoftwareReleases = pgTableBase(
  'shranix_software_releases',
  {
    ...pgBase,
    releaseId: pgText('release_id').notNull(),
    version: pgText('version').notNull(),
    buildNumber: pgText('build_number'),
    platform: pgText('platform').notNull().default('windows'),
    architecture: pgText('architecture').notNull().default('x64'),
    channel: pgText('channel').notNull().default('STABLE'),
    status: pgText('status').notNull().default('DRAFT'),
    releaseNotes: pgText('release_notes'),
    critical: pgBoolean('critical').notNull().default(false),
    releasedAt: pgTimestamp('released_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
    publishedBy: pgUuid('published_by'),
    publishedAt: pgTimestamp('published_at', { withTimezone: true }),
    deprecatedAt: pgTimestamp('deprecated_at', { withTimezone: true }),
    revokedAt: pgTimestamp('revoked_at', { withTimezone: true }),
    revocationReason: pgText('revocation_reason'),
    metadata: pgText('metadata'),
  },
  (table) => ({
    releaseIdIdx: pgUniqueIndex('rel_release_id_idx').on(table.releaseId),
    versionChannelPlatformIdx: pgUniqueIndex('rel_version_chan_plat_idx').on(
      table.version,
      table.channel,
      table.platform,
      table.architecture,
    ),
    channelIdx: pgIndex('rel_channel_idx').on(table.channel),
    statusIdx: pgIndex('rel_status_idx').on(table.status),
    publishedAtIdx: pgIndex('rel_published_at_idx').on(table.publishedAt),
  }),
);

// ═════════════════════════════════════════════════════════
// release_packages — downloadable artifacts for a release.
// Client verifies checksum + signature BEFORE executing (16.1).
// ═════════════════════════════════════════════════════════
export const sqliteReleasePackages = sqliteTableBase(
  'shranix_release_packages',
  {
    ...sqliteBase,
    releaseId: sqliteText('release_id').notNull(),
    fileName: sqliteText('file_name').notNull(),
    platform: sqliteText('platform').notNull(),
    architecture: sqliteText('architecture').notNull(),
    packageUrl: sqliteText('package_url').notNull(),
    packageSize: sqliteInteger('package_size'),
    checksum: sqliteText('checksum').notNull(),
    checksumAlgorithm: sqliteText('checksum_algorithm').notNull().default('sha256'),
    signature: sqliteText('signature'),
    signatureAlgorithm: sqliteText('signature_algorithm'),
    signatureMetadata: sqliteText('signature_metadata'), // JSON — signer, cert, time
    status: sqliteText('status').notNull().default('active'),
    uploadedAt: sqliteText('uploaded_at'),
    uploadedBy: sqliteText('uploaded_by'),
  },
  (table) => ({
    releasePlatformIdx: uniqueIndex('rp_release_platform_idx').on(
      table.releaseId,
      table.platform,
      table.architecture,
    ),
    releaseIdx: index('rp_release_idx').on(table.releaseId),
  }),
);

export const pgReleasePackages = pgTableBase(
  'shranix_release_packages',
  {
    ...pgBase,
    releaseId: pgUuid('release_id').notNull(),
    fileName: pgText('file_name').notNull(),
    platform: pgText('platform').notNull(),
    architecture: pgText('architecture').notNull(),
    packageUrl: pgText('package_url').notNull(),
    packageSize: pgInteger('package_size'),
    checksum: pgText('checksum').notNull(),
    checksumAlgorithm: pgText('checksum_algorithm').notNull().default('sha256'),
    signature: pgText('signature'),
    signatureAlgorithm: pgText('signature_algorithm'),
    signatureMetadata: pgText('signature_metadata'),
    status: pgText('status').notNull().default('active'),
    uploadedAt: pgTimestamp('uploaded_at', { withTimezone: true }),
    uploadedBy: pgUuid('uploaded_by'),
  },
  (table) => ({
    releasePlatformIdx: pgUniqueIndex('rp_release_platform_idx').on(
      table.releaseId,
      table.platform,
      table.architecture,
    ),
    releaseIdx: pgIndex('rp_release_idx').on(table.releaseId),
  }),
);

// ═════════════════════════════════════════════════════════
// release_channels — channel definitions with per-channel
// minimum/recommended version policy (16.1 version compatibility).
// ═════════════════════════════════════════════════════════
export const sqliteReleaseChannels = sqliteTableBase(
  'shranix_release_channels',
  {
    ...sqliteBase,
    channelCode: sqliteText('channel_code').notNull(), // STABLE | BETA | INTERNAL | CUSTOMER_SPECIFIC
    name: sqliteText('name').notNull(),
    description: sqliteText('description'),
    minVersion: sqliteText('min_version'),
    recommendedVersion: sqliteText('recommended_version'),
    isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    channelCodeIdx: uniqueIndex('rc_channel_code_idx').on(table.channelCode),
  }),
);

export const pgReleaseChannels = pgTableBase(
  'shranix_release_channels',
  {
    ...pgBase,
    channelCode: pgText('channel_code').notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    minVersion: pgText('min_version'),
    recommendedVersion: pgText('recommended_version'),
    isActive: pgBoolean('is_active').notNull().default(true),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    channelCodeIdx: pgUniqueIndex('rc_channel_code_idx').on(table.channelCode),
  }),
);

// ═════════════════════════════════════════════════════════
// version_compatibility — explicit per-version policy.
// A version can be: supported (min supported + recommended),
// blocked (update must NOT be offered), or critical-security
// (update REQUIRED). Channel-scoped.
// ═════════════════════════════════════════════════════════
export const sqliteVersionCompatibility = sqliteTableBase(
  'shranix_version_compatibility',
  {
    ...sqliteBase,
    version: sqliteText('version').notNull(),
    channel: sqliteText('channel').notNull().default('STABLE'),
    minSupportedVersion: sqliteText('min_supported_version'),
    recommendedVersion: sqliteText('recommended_version'),
    blocked: sqliteInteger('blocked', { mode: 'boolean' }).notNull().default(false),
    blockedReason: sqliteText('blocked_reason'),
    critical: sqliteInteger('critical', { mode: 'boolean' }).notNull().default(false),
    notes: sqliteText('notes'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    versionChannelIdx: uniqueIndex('vc_version_channel_idx').on(table.version, table.channel),
    channelIdx: index('vc_channel_idx').on(table.channel),
  }),
);

export const pgVersionCompatibility = pgTableBase(
  'shranix_version_compatibility',
  {
    ...pgBase,
    version: pgText('version').notNull(),
    channel: pgText('channel').notNull().default('STABLE'),
    minSupportedVersion: pgText('min_supported_version'),
    recommendedVersion: pgText('recommended_version'),
    blocked: pgBoolean('blocked').notNull().default(false),
    blockedReason: pgText('blocked_reason'),
    critical: pgBoolean('critical').notNull().default(false),
    notes: pgText('notes'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    versionChannelIdx: pgUniqueIndex('vc_version_channel_idx').on(table.version, table.channel),
    channelIdx: pgIndex('vc_channel_idx').on(table.channel),
  }),
);
