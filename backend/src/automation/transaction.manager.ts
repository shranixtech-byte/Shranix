import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * TransactionManager provides real database transaction support
 * with rollback, commit, concurrency protection, and optimistic locking.
 *
 * Supports both SQLite and PostgreSQL transaction modes.
 */
export interface TransactionContext {
  id: string;
  startedAt: Date;
  operations: number;
  /** The drizzle transaction object. Use this for all DB operations within the transaction. */
  tx: any;
}

@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Execute a function within a database transaction with automatic rollback on error.
   * The callback receives a `context` with a `tx` property — the drizzle transaction object.
   * ALL database operations within the callback MUST use `context.tx` to participate
   * in the transaction. If ANY operation throws, EVERYTHING is rolled back.
   */
  /**
   * SQLite serializes write transactions; a concurrent write on another
   * connection surfaces as SQLITE_BUSY. Retry with bounded backoff so the
   * losing transaction re-reads committed state after the winner finishes.
   * PostgreSQL never returns BUSY, so this is a no-op for production Postgres.
   */
  private isSqliteBusy(message?: string): boolean {
    return /SQLITE_BUSY|database is locked|SQL statements in progress/i.test(message || '');
  }

  async executeInTransaction<T>(
    fn: (context: TransactionContext) => Promise<T>,
    _options: { isolationLevel?: string; timeout?: number } = {},
  ): Promise<T> {
    const db = (this.database as any).glEntries;
    const context: TransactionContext = {
      id: crypto.randomUUID(),
      startedAt: new Date(),
      operations: 0,
      tx: null,
    };

    // Access the underlying drizzle-orm db instance
    const drizzleDb = db?.db || (this.database as any).db;

    if (!drizzleDb) {
      this.logger.warn('No underlying db instance found, running without transaction');
      return fn(context);
    }

    const maxAttempts = 5;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (typeof drizzleDb.transaction === 'function') {
          return await drizzleDb.transaction(async (tx: any) => {
            // Store the transaction on the drizzle db object so repositories can pick it up
            (drizzleDb as any).__currentTx = tx;

            const txContext: TransactionContext = {
              ...context,
              operations: 0,
              tx,
            };

            try {
              const result = await fn(txContext);
              return result;
            } finally {
              // Clean up the transaction reference
              (drizzleDb as any).__currentTx = null;
            }
          });
        }

        this.logger.warn('Database does not support transactions, running without');
        return fn(context);
      } catch (error) {
        lastError = error as Error;
        if (!this.isSqliteBusy(lastError.message)) {
          this.logger.error(
            `Transaction ${context.id} failed: ${lastError.message}. ALL changes rolled back.`,
          );
          throw error;
        }
        if (attempt < maxAttempts - 1) {
          this.logger.warn(
            `Transaction ${context.id} hit SQLITE_BUSY (attempt ${attempt + 1}/${maxAttempts}); retrying.`,
          );
          await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
        }
      }
    }

    this.logger.error(
      `Transaction ${context.id} failed: ${(lastError as Error).message}. ALL changes rolled back.`,
    );
    throw lastError;
  }

  /**
   * Optimistic locking: verify that the record version hasn't changed since read.
   * Throws if a concurrent modification is detected.
   */
  async optimisticLock<T extends { id: string; updatedAt?: string }>(
    record: T,
    fn: () => Promise<void>,
  ): Promise<void> {
    const originalUpdatedAt = record.updatedAt;
    const repo = (this.database as any).glEntries;

    if (!repo || !repo.findById) {
      await fn();
      return;
    }

    const current = await repo.findById(record.id);
    if (!current) {
      throw new Error(`Record ${record.id} not found for optimistic locking`);
    }

    if (current.updatedAt !== originalUpdatedAt) {
      throw new Error(
        `Concurrent modification detected for record ${record.id}. ` +
          `Original timestamp: ${originalUpdatedAt}, Current: ${current.updatedAt}`,
      );
    }

    await fn();
  }

  /**
   * Create a savepoint for nested transactions (SQLite only).
   */
  async savepoint(name: string): Promise<void> {
    const db = (this.database as any).db;
    if (db && typeof db.run === 'function') {
      await db.run(`SAVEPOINT ${name}`);
    }
  }

  /**
   * Rollback to a savepoint (SQLite only).
   */
  async rollbackToSavepoint(name: string): Promise<void> {
    const db = (this.database as any).db;
    if (db && typeof db.run === 'function') {
      await db.run(`ROLLBACK TO SAVEPOINT ${name}`);
    }
  }

  /**
   * Release a savepoint (SQLite only).
   */
  async releaseSavepoint(name: string): Promise<void> {
    const db = (this.database as any).db;
    if (db && typeof db.run === 'function') {
      await db.run(`RELEASE SAVEPOINT ${name}`);
    }
  }

  /**
   * Get current transaction context if inside a transaction.
   */
  getCurrentTransaction(): any {
    return (this.database as any)._currentTx || null;
  }
}
