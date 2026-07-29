import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'file:./data/dev.db',
  provider: (process.env.DATABASE_PROVIDER || 'sqlite') as 'sqlite' | 'postgresql',
}));
