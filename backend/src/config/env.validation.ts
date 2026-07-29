import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('SHRANIX-Krushi-ERP'),
  APP_PORT: z.coerce.number().int().positive().max(65535).default(4001),
  APP_URL: z.string().url().default('http://localhost:4001'),

  // Database
  DATABASE_URL: z.string().default('file:./data/dev.db'),
  DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('debug'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:4000,tauri://localhost'),
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Swagger
  SWAGGER_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  SWAGGER_PATH: z.string().default('api/docs'),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;
