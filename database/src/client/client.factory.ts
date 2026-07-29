import type { Client as LibsqlClient } from '@libsql/client';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { DatabaseConfig } from '../config/index';
import { createSqliteClient, closeSqliteClient, getSqliteClient, getRawSqliteClient } from './sqlite.client';
import { createPostgresClient, closePostgresClient, getPostgresClient } from './postgres.client';

export type DatabaseClient = LibSQLDatabase | PostgresJsDatabase;

export function createDatabaseClient(config: DatabaseConfig): DatabaseClient {
  if (config.provider === 'postgresql') {
    return createPostgresClient(config);
  }
  return createSqliteClient(config);
}

export function getDatabaseClient(config: DatabaseConfig): DatabaseClient {
  if (config.provider === 'postgresql') {
    return getPostgresClient();
  }
  return getSqliteClient();
}

/** Returns the raw underlying database client for executing raw SQL. */
export function getRawClient(config: DatabaseConfig): LibsqlClient {
  if (config.provider === 'postgresql') {
    throw new Error('Raw client is only supported for SQLite provider');
  }
  return getRawSqliteClient();
}

export async function closeDatabaseClient(config: DatabaseConfig): Promise<void> {
  if (config.provider === 'postgresql') {
    await closePostgresClient();
  } else {
    await closeSqliteClient();
  }
}
