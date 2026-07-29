import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import crypto from 'node:crypto';

// ── SQLite Schemas ──────────────────────────────────────

export const sqliteUsers = sqliteTableBase('shranix_users', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  email: sqliteText('email').notNull().unique(),
  phone: sqliteText('phone'),
  passwordHash: sqliteText('password_hash').notNull(),
  firstName: sqliteText('first_name').notNull(),
  lastName: sqliteText('last_name').notNull(),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  isEmailVerified: sqliteInteger('is_email_verified', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: sqliteText('last_login_at'),
  failedLoginAttempts: sqliteInteger('failed_login_attempts').notNull().default(0),
  lockedUntil: sqliteText('locked_until'),
  refreshTokenVersion: sqliteInteger('refresh_token_version').notNull().default(0),
});

export const sqliteRoles = sqliteTableBase('shranix_roles', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  name: sqliteText('name').notNull().unique(),
  description: sqliteText('description'),
  isSystem: sqliteInteger('is_system', { mode: 'boolean' }).notNull().default(false),
});

export const sqlitePermissions = sqliteTableBase('shranix_permissions', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  name: sqliteText('name').notNull().unique(),
  description: sqliteText('description'),
  resource: sqliteText('resource').notNull(),
  action: sqliteText('action').notNull(),
}, (table) => ({
  resourceActionIdx: uniqueIndex('perm_resource_action_idx').on(table.resource, table.action),
}));

export const sqliteRolePermissions = sqliteTableBase('shranix_role_permissions', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roleId: sqliteText('role_id').notNull().references(() => sqliteRoles.id, { onDelete: 'cascade' }),
  permissionId: sqliteText('permission_id').notNull().references(() => sqlitePermissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  rolePermIdx: uniqueIndex('role_perm_idx').on(table.roleId, table.permissionId),
}));

export const sqliteUserRoles = sqliteTableBase('shranix_user_roles', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: sqliteText('user_id').notNull().references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  roleId: sqliteText('role_id').notNull().references(() => sqliteRoles.id, { onDelete: 'cascade' }),
}, (table) => ({
  userRoleIdx: uniqueIndex('user_role_idx').on(table.userId, table.roleId),
}));

export const sqliteRefreshTokens = sqliteTableBase('shranix_refresh_tokens', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: sqliteText('user_id').notNull().references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  tokenHash: sqliteText('token_hash').notNull(),
  expiresAt: sqliteText('expires_at').notNull(),
  isRevoked: sqliteInteger('is_revoked', { mode: 'boolean' }).notNull().default(false),
  revokedAt: sqliteText('revoked_at'),
  userAgent: sqliteText('user_agent'),
  ipAddress: sqliteText('ip_address'),
});

// ── PostgreSQL Schemas ──────────────────────────────────

export const pgUsers = pgTableBase('shranix_users', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  email: pgText('email').notNull().unique(),
  phone: pgText('phone'),
  passwordHash: pgText('password_hash').notNull(),
  firstName: pgText('first_name').notNull(),
  lastName: pgText('last_name').notNull(),
  isActive: pgBoolean('is_active').notNull().default(true),
  isEmailVerified: pgBoolean('is_email_verified').notNull().default(false),
  lastLoginAt: pgTimestamp('last_login_at', { withTimezone: true }),
  failedLoginAttempts: pgInteger('failed_login_attempts').notNull().default(0),
  lockedUntil: pgTimestamp('locked_until', { withTimezone: true }),
  refreshTokenVersion: pgInteger('refresh_token_version').notNull().default(0),
});

export const pgRoles = pgTableBase('shranix_roles', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  name: pgText('name').notNull().unique(),
  description: pgText('description'),
  isSystem: pgBoolean('is_system').notNull().default(false),
});

export const pgPermissions = pgTableBase('shranix_permissions', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  name: pgText('name').notNull().unique(),
  description: pgText('description'),
  resource: pgText('resource').notNull(),
  action: pgText('action').notNull(),
}, (table) => ({
  resourceActionIdx: pgUniqueIndex('perm_resource_action_idx').on(table.resource, table.action),
}));

export const pgRolePermissions = pgTableBase('shranix_role_permissions', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  roleId: pgUuid('role_id').notNull().references(() => pgRoles.id, { onDelete: 'cascade' }),
  permissionId: pgUuid('permission_id').notNull().references(() => pgPermissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  rolePermIdx: pgUniqueIndex('role_perm_idx').on(table.roleId, table.permissionId),
}));

export const pgUserRoles = pgTableBase('shranix_user_roles', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  userId: pgUuid('user_id').notNull().references(() => pgUsers.id, { onDelete: 'cascade' }),
  roleId: pgUuid('role_id').notNull().references(() => pgRoles.id, { onDelete: 'cascade' }),
}, (table) => ({
  userRoleIdx: pgUniqueIndex('user_role_idx').on(table.userId, table.roleId),
}));

export const pgRefreshTokens = pgTableBase('shranix_refresh_tokens', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  userId: pgUuid('user_id').notNull().references(() => pgUsers.id, { onDelete: 'cascade' }),
  tokenHash: pgText('token_hash').notNull(),
  expiresAt: pgTimestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: pgBoolean('is_revoked').notNull().default(false),
  revokedAt: pgTimestamp('revoked_at', { withTimezone: true }),
  userAgent: pgText('user_agent'),
  ipAddress: pgText('ip_address'),
});

// ── Relations ───────────────────────────────────────────

export const usersRelations = relations(sqliteUsers, ({ many }) => ({
  userRoles: many(sqliteUserRoles),
  refreshTokens: many(sqliteRefreshTokens),
}));

export const rolesRelations = relations(sqliteRoles, ({ many }) => ({
  userRoles: many(sqliteUserRoles),
  rolePermissions: many(sqliteRolePermissions),
}));

export const permissionsRelations = relations(sqlitePermissions, ({ many }) => ({
  rolePermissions: many(sqliteRolePermissions),
}));

// ── PostgreSQL Relations ────────────────────────────────

export const pgUsersRelations = relations(pgUsers, ({ many }) => ({
  userRoles: many(pgUserRoles),
  refreshTokens: many(pgRefreshTokens),
}));

export const pgRolesRelations = relations(pgRoles, ({ many }) => ({
  userRoles: many(pgUserRoles),
  rolePermissions: many(pgRolePermissions),
}));

export const pgPermissionsRelations = relations(pgPermissions, ({ many }) => ({
  rolePermissions: many(pgRolePermissions),
}));
