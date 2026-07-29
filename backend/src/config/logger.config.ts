import { registerAs } from '@nestjs/config';

export default registerAs('logger', () => ({
  level: process.env.LOG_LEVEL || 'debug',
  format: (process.env.LOG_FORMAT || 'pretty') as 'pretty' | 'json',
}));
