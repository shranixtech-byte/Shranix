import { type Client } from '@libsql/client';
import type { DatabaseConfig } from '../config';
export declare function createSqliteClient(config: DatabaseConfig): Client;
export declare function getSqliteClient(): Client;
export declare function closeSqliteClient(): Promise<void>;
//# sourceMappingURL=sqlite.client.d.ts.map