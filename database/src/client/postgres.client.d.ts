import postgres from 'postgres';
import type { DatabaseConfig } from '../config';
export declare function createPostgresClient(config: DatabaseConfig): postgres.Sql;
export declare function getPostgresClient(): postgres.Sql;
export declare function closePostgresClient(): Promise<void>;
//# sourceMappingURL=postgres.client.d.ts.map