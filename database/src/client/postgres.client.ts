import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { DatabaseConfig } from '../config/index';

let sql: postgres.Sql | null = null;
let db: PostgresJsDatabase | null = null;

export function createPostgresClient(config: DatabaseConfig): PostgresJsDatabase {
  if (db) return db;

  sql = postgres(config.url, {
    max: config.maxConnections || 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
    debug: config.logLevel === 'all',
  });

  db = drizzle(sql);
  return db;
}

export function getPostgresClient(): PostgresJsDatabase {
  if (!db) {
    throw new Error('PostgreSQL client not initialized. Call createPostgresClient() first.');
  }
  return db;
}

export async function closePostgresClient(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
    db = null;
  }
}
