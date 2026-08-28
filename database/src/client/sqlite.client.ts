import { createClient, type Client, type Config } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

import type { DatabaseConfig } from '../config/index';

let client: Client | null = null;
let db: LibSQLDatabase | null = null;
let currentUrl: string | null = null;

export function createSqliteClient(config: DatabaseConfig): LibSQLDatabase {
  if (db && currentUrl === config.url) {
    return db;
  }

  if (client) {
    try {
      client.close();
    } catch {
      /* ignore close error */
    }
  }

  const libsqlConfig: Config = {
    url: config.url,
  };

  client = createClient(libsqlConfig);
  currentUrl = config.url;
  db = drizzle(client);
  // Set busy timeout to prevent SQLITE_BUSY on concurrent operations
  // Fire-and-forget is fine here; libsql sends PRAGMA on the next round-trip
  client.execute('PRAGMA busy_timeout = 15000;').catch(() => {
    // Ignore — pragma may not be supported on remote/HTTP connections
  });
  return db;
}

export function getSqliteClient(): LibSQLDatabase {
  if (!db) {
    throw new Error('SQLite client not initialized. Call createSqliteClient() first.');
  }
  return db;
}

/** Returns the raw libsql Client for running raw SQL via client.execute(). */
export function getRawSqliteClient(): Client {
  if (!client) {
    throw new Error('SQLite raw client not initialized. Call createSqliteClient() first.');
  }
  return client;
}

export async function closeSqliteClient(): Promise<void> {
  if (client) {
    client.close();
    client = null;
    db = null;
    currentUrl = null;
  }
}
