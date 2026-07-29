import type { Client } from '@libsql/client';
import type postgres from 'postgres';
import type { DatabaseConfig } from '../config';
export type DatabaseClient = Client | postgres.Sql;
export declare function createDatabaseClient(config: DatabaseConfig): DatabaseClient;
export declare function getDatabaseClient(config: DatabaseConfig): DatabaseClient;
export declare function closeDatabaseClient(config: DatabaseConfig): Promise<void>;
//# sourceMappingURL=client.factory.d.ts.map