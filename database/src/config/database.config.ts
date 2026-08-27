import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  url: string;
  provider: 'sqlite' | 'postgresql';
  logLevel?: 'all' | 'none' | 'error' | 'warn';
  maxConnections?: number;
}

function findWorkspaceRoot(startDir: string): string {
  let cur = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(cur, 'pnpm-workspace.yaml'))) {
      return cur;
    }
    if (fs.existsSync(path.join(cur, 'package.json'))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cur, 'package.json'), 'utf8'));
        if (pkg.name === 'shranix-krushi-erp') {
          return cur;
        }
      } catch {}
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startDir;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const provider = (process.env.DATABASE_PROVIDER || 'sqlite') as DatabaseConfig['provider'];
  const rawUrl =
    process.env.DATABASE_URL ||
    (provider === 'sqlite'
      ? 'file:./data/dev.db'
      : 'postgresql://localhost:5432/shranix_krushi_erp');

  let url = rawUrl;
  if (provider === 'sqlite' && rawUrl.startsWith('file:')) {
    const filePath = rawUrl.replace(/^file:/, '');
    if (!path.isAbsolute(filePath)) {
      const workspaceRoot = findWorkspaceRoot(process.cwd());
      const rootDbPath = path.resolve(workspaceRoot, filePath);
      url = `file:${rootDbPath.replace(/\\/g, '/')}`;
    }
  }

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
