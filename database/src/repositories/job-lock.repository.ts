import type { DatabaseClient } from '../client/index';
import type { DatabaseConfig } from '../config/index';
import { loadDatabaseConfig } from '../config/index';

/**
 * JobLocksRepository — low-level distributed lock operations.
 *
 * Uses raw SQL for atomic acquire/release because the MasterDataRepository
 * CRUD pattern doesn't support the UPSERT + affected-row-count pattern
 * needed for safe lock acquisition.
 *
 * Design:
 *   - acquire: INSERT OR IGNORE + check changes() — exactly one winner
 *   - release: DELETE WHERE job_key = ? AND owner_token = ? — owner-only
 *   - renew:   UPDATE WHERE job_key = ? AND owner_token = ? SET expires_at
 *   - cleanup: DELETE WHERE expires_at < now — stale lock reclamation
 *   - status:  SELECT for observability
 */
export class JobLocksRepository {
  private readonly config: DatabaseConfig;

  constructor(_db: DatabaseClient, _isPostgres: boolean) {
    this.config = loadDatabaseConfig();
  }

  /**
   * Get the raw underlying client for executing atomic SQL.
   * SQLite: @libsql/client  — client.execute(sql, args)
   * Postgres: postgres.js   — sql.unsafe(sql)
   */
  private get rawClient(): any {
    if (this.config.provider === 'postgresql') {
      // postgres.js — import lazily to avoid circular deps
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPostgresClient } = require('../client/postgres.client');
      return getPostgresClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRawSqliteClient } = require('../client/sqlite.client');
    return getRawSqliteClient();
  }

  private get isPostgres(): boolean {
    return this.config.provider === 'postgresql';
  }

  // ── Atomic Acquire ──────────────────────────────────────────

  /**
   * Attempt to acquire the lock for `jobKey`.
   *
   * Returns `{ acquired: true, ownerToken }` if this call won,
   * or `{ acquired: false }` if another owner holds it.
   *
   * SQLite: INSERT OR IGNORE + SELECT changes()
   * Postgres: INSERT ... ON CONFLICT DO NOTHING + GET DIAGNOSTICS
   */
  /**
   * SQLite-compatible datetime string ('YYYY-MM-DD HH:MM:SS').
   * We store this format so string comparison with datetime('now') works.
   */
  private sqliteNow(): string {
    return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
  }

  async acquire(
    jobKey: string,
    ownerToken: string,
    leaseMs: number,
  ): Promise<{ acquired: boolean }> {
    const expiresAt = new Date(Date.now() + leaseMs)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);
    const now = this.sqliteNow();
    const id = crypto.randomUUID();

    if (this.isPostgres) {
      // Postgres: atomic INSERT ON CONFLICT + check viaRETURNING
      const sql = this.rawClient;
      const result = await sql.unsafe(
        `INSERT INTO shranix_job_locks (id, job_key, owner_token, acquired_at, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (job_key) DO NOTHING`,
        [id, jobKey, ownerToken, now, expiresAt, now],
      );
      // postgres.js returns the result object; rowCount=1 means inserted
      if (result && (result as any).count >= 1) {
        return { acquired: true };
      }
      // Fallback: check if we own it
      const rows = await sql.unsafe(
        `SELECT owner_token FROM shranix_job_locks WHERE job_key = $1`,
        [jobKey],
      );
      const row = (rows as any[])[0];
      return { acquired: row?.owner_token === ownerToken };
    }

    // SQLite: INSERT OR IGNORE + check changes()
    const client = this.rawClient;
    await client.execute({
      sql: `INSERT OR IGNORE INTO shranix_job_locks (id, job_key, owner_token, acquired_at, expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, jobKey, ownerToken, now, expiresAt, now],
    });
    // After INSERT OR IGNORE, check if the row is ours
    const result = await client.execute({
      sql: `SELECT owner_token FROM shranix_job_locks WHERE job_key = ?`,
      args: [jobKey],
    });
    const row = result.rows?.[0];
    return { acquired: row?.owner_token === ownerToken };
  }

  // ── Safe Release (owner-only) ───────────────────────────────

  /**
   * Release the lock only if `ownerToken` matches.
   * Returns true if the lock was released.
   */
  async release(jobKey: string, ownerToken: string): Promise<boolean> {
    if (this.isPostgres) {
      const sql = this.rawClient;
      const result = await sql.unsafe(
        `DELETE FROM shranix_job_locks WHERE job_key = $1 AND owner_token = $2`,
        [jobKey, ownerToken],
      );
      return (result as any).count >= 1;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `DELETE FROM shranix_job_locks WHERE job_key = ? AND owner_token = ?`,
      args: [jobKey, ownerToken],
    });
    return (result as any).rowsAffected >= 1;
  }

  // ── Renew (extend lease) ────────────────────────────────────

  /**
   * Extend the lease for an active lock. Only the current owner can renew.
   */
  async renew(jobKey: string, ownerToken: string, leaseMs: number): Promise<boolean> {
    const newExpiresAt = new Date(Date.now() + leaseMs)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 19);

    if (this.isPostgres) {
      const sql = this.rawClient;
      const result = await sql.unsafe(
        `UPDATE shranix_job_locks
         SET expires_at = $1, updated_at = NOW()
         WHERE job_key = $3 AND owner_token = $4 AND expires_at > NOW()`,
        [newExpiresAt, jobKey, ownerToken],
      );
      return (result as any).count >= 1;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `UPDATE shranix_job_locks
            SET expires_at = ?, updated_at = datetime('now')
            WHERE job_key = ? AND owner_token = ? AND expires_at > datetime('now')`,
      args: [newExpiresAt, jobKey, ownerToken],
    });
    return (result as any).rowsAffected >= 1;
  }

  // ── Stale Lock Takeover ─────────────────────────────────────

  /**
   * Force-remove a lock whose lease has expired, regardless of owner.
   * Returns true if a stale lock was cleaned up.
   */
  async cleanupStale(jobKey: string): Promise<boolean> {
    const now = new Date().toISOString();

    if (this.isPostgres) {
      const sql = this.rawClient;
      const result = await sql.unsafe(
        `DELETE FROM shranix_job_locks WHERE job_key = $1 AND expires_at < $2`,
        [jobKey, now],
      );
      return (result as any).count >= 1;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `DELETE FROM shranix_job_locks WHERE job_key = ? AND expires_at < datetime('now')`,
      args: [jobKey],
    });
    return (result as any).rowsAffected >= 1;
  }

  // ── Status (observability) ──────────────────────────────────

  /**
   * Get current lock status for a job key.
   */
  async status(jobKey: string): Promise<{
    locked: boolean;
    ownerToken: string | null;
    acquiredAt: string | null;
    expiresAt: string | null;
    isStale: boolean;
  } | null> {
    const now = this.sqliteNow();

    if (this.isPostgres) {
      const sql = this.rawClient;
      const rows = await sql.unsafe(
        `SELECT owner_token, acquired_at, expires_at
         FROM shranix_job_locks WHERE job_key = $1`,
        [jobKey],
      );
      const row = (rows as any[])[0];
      if (!row) {return null;}
      return {
        locked: true,
        ownerToken: row.owner_token,
        acquiredAt: row.acquired_at?.toISOString?.() ?? row.acquired_at,
        expiresAt: row.expires_at?.toISOString?.() ?? row.expires_at,
        isStale: (row.expires_at?.toISOString?.() ?? row.expires_at) < now,
      };
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `SELECT owner_token, acquired_at, expires_at
            FROM shranix_job_locks WHERE job_key = ?`,
      args: [jobKey],
    });
    const row = result.rows?.[0];
    if (!row) {return null;}
    return {
      locked: true,
      ownerToken: row.owner_token,
      acquiredAt: row.acquired_at,
      expiresAt: row.expires_at,
      isStale: row.expires_at < now,
    };
  }

  // ── Bulk Status (observability dashboard) ───────────────────

  /**
   * Get status of all active locks.
   */
  async allStatus(): Promise<
    Array<{
      jobKey: string;
      ownerToken: string;
      acquiredAt: string;
      expiresAt: string;
      isStale: boolean;
    }>
  > {
    const now = this.sqliteNow();

    if (this.isPostgres) {
      const sql = this.rawClient;
      const rows = await sql.unsafe(
        `SELECT job_key, owner_token, acquired_at, expires_at
         FROM shranix_job_locks ORDER BY acquired_at DESC`,
      );
      return (rows as any[]).map((r) => ({
        jobKey: r.job_key,
        ownerToken: r.owner_token,
        acquiredAt: r.acquired_at?.toISOString?.() ?? r.acquired_at,
        expiresAt: r.expires_at?.toISOString?.() ?? r.expires_at,
        isStale: (r.expires_at?.toISOString?.() ?? r.expires_at) < now,
      }));
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `SELECT job_key, owner_token, acquired_at, expires_at
            FROM shranix_job_locks ORDER BY acquired_at DESC`,
      args: [],
    });
    return (result.rows || []).map((r: any) => ({
      jobKey: r.job_key,
      ownerToken: r.owner_token,
      acquiredAt: r.acquired_at,
      expiresAt: r.expires_at,
      isStale: r.expires_at < now,
    }));
  }

  // ── Cleanup all stale (periodic maintenance) ────────────────

  /**
   * Remove all expired locks. Safe to call periodically.
   */
  async cleanupAllStale(): Promise<number> {
    if (this.isPostgres) {
      const sql = this.rawClient;
      const result = await sql.unsafe(`DELETE FROM shranix_job_locks WHERE expires_at < NOW()`);
      return (result as any).count || 0;
    }

    const client = this.rawClient;
    const result = await client.execute({
      sql: `DELETE FROM shranix_job_locks WHERE expires_at < datetime('now')`,
      args: [],
    });
    return (result as any).rowsAffected || 0;
  }
}
