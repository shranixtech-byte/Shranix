import crypto from 'node:crypto';

import { eq, and, isNull, count } from 'drizzle-orm';

import type { DatabaseClient } from '../client/index';
import { sqliteUsers, pgUsers } from '../schema/auth';
import type { PaginatedResult, PaginationParams } from '../types/index';
import { paginateResult } from '../utils/query.helper';

export interface UserRecord {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  refreshTokenVersion: number;
  allowedModules?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
}

export class UsersRepository {
  private table: typeof sqliteUsers | typeof pgUsers;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, _isPostgres: boolean) {
    this.db = db;
    this.table = _isPostgres ? pgUsers : sqliteUsers;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id));
    return rows.length > 0 ? (rows[0] as unknown as UserRecord) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(and(eq((this.table as any).email, email), isNull((this.table as any).deletedAt)));
    return rows.length > 0 ? (rows[0] as unknown as UserRecord) : null;
  }

  async create(
    data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted'>,
  ): Promise<UserRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const values = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isDeleted: false,
    };
    await (this.db as any).insert(this.table).values(values);
    return values as unknown as UserRecord;
  }

  async update(
    id: string,
    data: Partial<Omit<UserRecord, 'id' | 'createdAt'>>,
  ): Promise<UserRecord | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    const updateData = { ...data, updatedAt: new Date().toISOString() };
    await (this.db as any)
      .update(this.table)
      .set(updateData)
      .where(eq((this.table as any).id, id));
    return { ...existing, ...updateData } as UserRecord;
  }

  async findAll(
    params: PaginationParams = { page: 1, pageSize: 50 },
  ): Promise<PaginatedResult<UserRecord>> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;
    // Soft-deleted users should not appear in listings — but admins may still
    // need to restore them, so hard-delete is never performed.
    const notDeleted = and(
      isNull((this.table as any).deletedAt),
      eq((this.table as any).isDeleted, false),
    );
    const [rows, countResult] = await Promise.all([
      (this.db as any).select().from(this.table).where(notDeleted).limit(pageSize).offset(offset),
      (this.db as any).select({ value: count() }).from(this.table).where(notDeleted),
    ]);
    const total = Number(countResult[0]?.value ?? 0);
    return paginateResult(rows as unknown as UserRecord[], total, params);
  }

  async incrementFailedAttempts(id: string, attempts: number): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ failedLoginAttempts: attempts })
      .where(eq((this.table as any).id, id));
  }

  async lockAccount(id: string, lockedUntil: string, attempts: number): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ lockedUntil, failedLoginAttempts: attempts, updatedAt: new Date().toISOString() })
      .where(eq((this.table as any).id, id));
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
      .where(eq((this.table as any).id, id));
  }

  async updateLastLogin(id: string): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq((this.table as any).id, id));
  }

  async incrementTokenVersion(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) {
      await (this.db as any)
        .update(this.table)
        .set({
          refreshTokenVersion: user.refreshTokenVersion + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq((this.table as any).id, id));
    }
  }
}
