import crypto from 'node:crypto';

import { eq, and, isNull, inArray, count } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import {
  sqliteRoles,
  pgRoles,
  sqlitePermissions,
  pgPermissions,
  sqliteRolePermissions,
  pgRolePermissions,
  sqliteUserRoles,
  pgUserRoles,
} from '../schema/auth';
import type { PaginatedResult, PaginationParams } from '../types/index';
import { paginateResult } from '../utils/query.helper';

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface PermissionRecord {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
}

export class RolesRepository {
  private rolesTable: typeof sqliteRoles | typeof pgRoles;
  private permissionsTable: typeof sqlitePermissions | typeof pgPermissions;
  private rolePermissionsTable: typeof sqliteRolePermissions | typeof pgRolePermissions;
  private userRolesTable: typeof sqliteUserRoles | typeof pgUserRoles;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, isPostgres: boolean) {
    this.db = db;
    this.rolesTable = isPostgres ? pgRoles : sqliteRoles;
    this.permissionsTable = isPostgres ? pgPermissions : sqlitePermissions;
    this.rolePermissionsTable = isPostgres ? pgRolePermissions : sqliteRolePermissions;
    this.userRolesTable = isPostgres ? pgUserRoles : sqliteUserRoles;
  }

  async findRoleById(id: string): Promise<RoleRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.rolesTable)
      .where(eq((this.rolesTable as any).id, id));
    return rows.length > 0 ? (rows[0] as unknown as RoleRecord) : null;
  }

  async findRoleByName(name: string): Promise<RoleRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.rolesTable)
      .where(
        and(eq((this.rolesTable as any).name, name), isNull((this.rolesTable as any).deletedAt)),
      );
    return rows.length > 0 ? (rows[0] as unknown as RoleRecord) : null;
  }

  async findAllRoles(
    params: PaginationParams = { page: 1, pageSize: 50 },
  ): Promise<PaginatedResult<RoleRecord>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;
    const [rows, countResult] = await Promise.all([
      (this.db as any)
        .select()
        .from(this.rolesTable)
        .where(isNull((this.rolesTable as any).deletedAt))
        .limit(pageSize)
        .offset(offset),
      (this.db as any)
        .select({ value: count() })
        .from(this.rolesTable)
        .where(isNull((this.rolesTable as any).deletedAt)),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as unknown as RoleRecord[], total, params);
  }

  async getUserRoles(userId: string): Promise<RoleRecord[]> {
    const userRoleRows = await (this.db as any)
      .select()
      .from(this.userRolesTable)
      .where(eq((this.userRolesTable as any).userId, userId));

    if (userRoleRows.length === 0) {
      return [];
    }

    const roleIds = userRoleRows.map((r: { roleId: string }) => r.roleId);
    const roleRows = await (this.db as any)
      .select()
      .from(this.rolesTable)
      .where(inArray((this.rolesTable as any).id, roleIds));

    return roleRows as unknown as RoleRecord[];
  }

  async getUserPermissions(userId: string): Promise<PermissionRecord[]> {
    const userRoleRows = await (this.db as any)
      .select()
      .from(this.userRolesTable)
      .where(eq((this.userRolesTable as any).userId, userId));

    if (userRoleRows.length === 0) {
      return [];
    }

    const roleIds = userRoleRows.map((r: { roleId: string }) => r.roleId);

    const rpRows = await (this.db as any)
      .select()
      .from(this.rolePermissionsTable)
      .where(inArray((this.rolePermissionsTable as any).roleId, roleIds));

    if (rpRows.length === 0) {
      return [];
    }

    const permissionIds = rpRows.map((r: { permissionId: string }) => r.permissionId);
    const permRows = await (this.db as any)
      .select()
      .from(this.permissionsTable)
      .where(inArray((this.permissionsTable as any).id, permissionIds));

    return permRows as unknown as PermissionRecord[];
  }

  async createRole(data: {
    name: string;
    description?: string | null;
    isSystem?: boolean;
  }): Promise<RoleRecord> {
    const [row] = await (this.db as any)
      .insert(this.rolesTable)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description ?? null,
        isSystem: data.isSystem ?? false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return row as unknown as RoleRecord;
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<RoleRecord | null> {
    const [row] = await (this.db as any)
      .update(this.rolesTable)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq((this.rolesTable as any).id, id))
      .returning();
    return (row as unknown as RoleRecord) ?? null;
  }

  async deleteRole(id: string): Promise<void> {
    // Hard delete — role_permissions / user_roles FK `onDelete: cascade` se clean hote hain.
    // Soft delete yahan galat hai: unique name index par soft-deleted row baitha rehta hai,
    // isliye same name ka naya role kabhi nahi ban sakta (UNIQUE constraint failure).
    await (this.db as any).delete(this.rolesTable).where(eq((this.rolesTable as any).id, id));
  }

  async getRolePermissions(roleId: string): Promise<PermissionRecord[]> {
    const rpRows = await (this.db as any)
      .select()
      .from(this.rolePermissionsTable)
      .where(eq((this.rolePermissionsTable as any).roleId, roleId));
    if (rpRows.length === 0) {
      return [];
    }
    const permissionIds = rpRows.map((r: { permissionId: string }) => r.permissionId);
    const permRows = await (this.db as any)
      .select()
      .from(this.permissionsTable)
      .where(inArray((this.permissionsTable as any).id, permissionIds));
    return permRows as unknown as PermissionRecord[];
  }

  async getUsersWithRole(roleId: string): Promise<string[]> {
    const rows = await (this.db as any)
      .select()
      .from(this.userRolesTable)
      .where(eq((this.userRolesTable as any).roleId, roleId));
    return rows.map((r: { userId: string }) => r.userId);
  }

  async findPermissionByName(name: string): Promise<PermissionRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.permissionsTable)
      .where(
        and(
          eq((this.permissionsTable as any).name, name),
          isNull((this.permissionsTable as any).deletedAt),
        ),
      )
      .limit(1);
    return (rows[0] as unknown as PermissionRecord) ?? null;
  }

  async createPermission(data: {
    name: string;
    description?: string;
    resource: string;
    action: string;
  }): Promise<PermissionRecord> {
    const [row] = await (this.db as any)
      .insert(this.permissionsTable)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description ?? data.name,
        resource: data.resource,
        action: data.action,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    return row as unknown as PermissionRecord;
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await (this.db as any).insert(this.userRolesTable).values({
      id: crypto.randomUUID(),
      userId,
      roleId,
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await (this.db as any)
      .delete(this.userRolesTable)
      .where(
        and(
          eq((this.userRolesTable as any).userId, userId),
          eq((this.userRolesTable as any).roleId, roleId),
        ),
      );
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await (this.db as any).insert(this.rolePermissionsTable).values({
      id: crypto.randomUUID(),
      roleId,
      permissionId,
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await (this.db as any)
      .delete(this.rolePermissionsTable)
      .where(
        and(
          eq((this.rolePermissionsTable as any).roleId, roleId),
          eq((this.rolePermissionsTable as any).permissionId, permissionId),
        ),
      );
  }
}
