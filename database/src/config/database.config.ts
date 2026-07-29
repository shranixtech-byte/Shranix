export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
  logLevel?: 'all' | 'none' | 'error' | 'warn';
  maxConnections?: number;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const provider = (process.env.DATABASE_PROVIDER || 'sqlite') as DatabaseConfig['provider'];
  const url = process.env.DATABASE_URL || (provider === 'sqlite' ? 'file:./data/dev.db' : 'postgresql://localhost:5432/shranix_krushi_erp');

  return {
    url,
    provider,
    logLevel: (process.env.DATABASE_LOG_LEVEL as DatabaseConfig['logLevel']) || 'error',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  return loadDatabaseConfig();
}
