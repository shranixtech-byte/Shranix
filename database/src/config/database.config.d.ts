export interface DatabaseConfig {
    url: string;
    provider: 'sqlite' | 'postgresql';
    logLevel?: 'all' | 'none' | 'error' | 'warn';
    maxConnections?: number;
}
export declare function loadDatabaseConfig(): DatabaseConfig;
export declare function getDatabaseConfig(): DatabaseConfig;
//# sourceMappingURL=database.config.d.ts.map