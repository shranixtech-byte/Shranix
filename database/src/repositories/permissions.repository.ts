import { eq, and, isNull, count, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { DatabaseClient } from '../client/index';
import {
  sqlitePermissions, pgPermissions,
  sqliteRolePermissions, pgRolePermissions,
} from '../schema/auth';
import type { PaginatedResult, PaginationParams } from '../types/index';
import { paginateResult } from '../utils/query.helper';

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

export interface PermissionCreateInput {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface PermissionUpdateInput {
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

export class PermissionsRepository {
  private table: typeof sqlitePermissions | typeof pgPermissions;
  private rolePermissionsTable: typeof sqliteRolePermissions | typeof pgRolePermissions;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, isPostgres: boolean) {
    this.db = db;
    this.table = isPostgres ? pgPermissions : sqlitePermissions;
    this.rolePermissionsTable = isPostgres ? pgRolePermissions : sqliteRolePermissions;
  }

  async findAll(params: PaginationParams = { page: 1, pageSize: 50 }): Promise<PaginatedResult<PermissionRecord>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;
    const [rows, countResult] = await Promise.all([
      (this.db as any)
        .select()
        .from(this.table)
        .where(isNull((this.table as any).deletedAt))
        .limit(pageSize)
        .offset(offset),
      (this.db as any)
        .select({ value: count() })
        .from(this.table)
        .where(isNull((this.table as any).deletedAt)),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as unknown as PermissionRecord[], total, params);
  }

  async findById(id: string): Promise<PermissionRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(and(eq((this.table as any).id, id), isNull((this.table as any).deletedAt)));
    return rows.length > 0 ? (rows[0] as unknown as PermissionRecord) : null;
  }

  async findByName(name: string): Promise<PermissionRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(and(eq((this.table as any).name, name), isNull((this.table as any).deletedAt)));
    return rows.length > 0 ? (rows[0] as unknown as PermissionRecord) : null;
  }

  async findByResourceAction(resource: string, action: string): Promise<PermissionRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(
        and(
          eq((this.table as any).resource, resource),
          eq((this.table as any).action, action),
          isNull((this.table as any).deletedAt),
        ),
      );
    return rows.length > 0 ? (rows[0] as unknown as PermissionRecord) : null;
  }

  async create(data: PermissionCreateInput): Promise<PermissionRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = {
      id,
      name: data.name,
      description: data.description ?? null,
      resource: data.resource,
      action: data.action,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isDeleted: false,
    };
    await (this.db as any).insert(this.table).values(values);
    return values as unknown as PermissionRecord;
  }

  async update(id: string, data: PermissionUpdateInput): Promise<PermissionRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await (this.db as any)
      .update(this.table)
      .set(updateData)
      .where(eq((this.table as any).id, id));
    return { ...existing, ...updateData } as PermissionRecord;
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await (this.db as any)
      .update(this.table)
      .set({ deletedAt: now, isDeleted: true, updatedAt: now })
      .where(eq((this.table as any).id, id));
  }

  async getPermissionsByRole(roleId: string): Promise<PermissionRecord[]> {
    const rpRows = await (this.db as any)
      .select()
      .from(this.rolePermissionsTable)
      .where(eq((this.rolePermissionsTable as any).roleId, roleId));

    if (rpRows.length === 0) return [];

    const permissionIds = rpRows.map((r: { permissionId: string }) => r.permissionId);
    const permRows = await (this.db as any)
      .select()
      .from(this.table)
      .where(
        and(
          inArray((this.table as any).id, permissionIds),
          isNull((this.table as any).deletedAt),
        ),
      );
    return permRows as unknown as PermissionRecord[];
  }
}
