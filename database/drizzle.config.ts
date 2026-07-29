import type { Config } from 'drizzle-kit';

const getConfig = (): Config => {
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  const url = process.env.DATABASE_URL || 'file:./data/dev.db';

  if (provider === 'postgresql') {
    return {
      schema: './src/schema/index.ts',
      out: './src/migrations',
      dialect: 'postgresql',
      dbCredentials: { url },
    };
  }

  return {
    schema: './src/schema/index.ts',
    out: './src/migrations',
    dialect: 'sqlite',
    dbCredentials: { url },
  };
};

export default getConfig();
