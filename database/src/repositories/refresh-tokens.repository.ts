import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { DatabaseClient } from '../client/index';
import { sqliteRefreshTokens, pgRefreshTokens } from '../schema/auth';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export class RefreshTokensRepository {
  private table: typeof sqliteRefreshTokens | typeof pgRefreshTokens;
  private db: DatabaseClient;

  constructor(db: DatabaseClient, isPostgres: boolean) {
    this.db = db;
    this.table = isPostgres ? pgRefreshTokens : sqliteRefreshTokens;
  }

  async create(data: Omit<RefreshTokenRecord, 'id'>): Promise<void> {
    const id = crypto.randomUUID();
    await (this.db as any).insert(this.table).values({ ...data, id });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(and(eq((this.table as any).tokenHash, tokenHash), eq((this.table as any).isRevoked, false)));
    return rows.length > 0 ? (rows[0] as unknown as RefreshTokenRecord) : null;
  }

  async revoke(id: string): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ isRevoked: true, revokedAt: new Date().toISOString() })
      .where(eq((this.table as any).id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await (this.db as any)
      .update(this.table)
      .set({ isRevoked: true, revokedAt: new Date().toISOString() })
      .where(and(eq((this.table as any).userId, userId), eq((this.table as any).isRevoked, false)));
  }
}
