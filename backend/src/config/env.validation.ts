import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Environment configuration validation (Phase 17.2/17.3)
// - Fail-fast: invalid/missing critical config crashes on boot, not at runtime.
// - Production guards: default/dev secrets are rejected when NODE_ENV=production.
// - Each environment (development / staging / production) must supply its own
//   secrets — production credentials must never be reused in development.
// ─────────────────────────────────────────────────────────────────────────────

const DEV_DEFAULT_SECRETS = [
  'dev-secret-change-in-production',
  'change_me',
  'change_me_to_a_long_random_string_at_least_32_chars',
  'change_me_to_another_long_random_string_32_chars',
  'shranix123',
  'shranix',
];

/**
 * Rejects placeholder/default secrets in production-like environments.
 * Empty values are allowed — they mean the associated feature is disabled
 * (e.g. no SMTP configured, local storage, manual payments). Only provided
 * but weak/placeholder values are rejected.
 */
function productionSecretGuard(value: string | undefined, field: string, env: string): string {
  const v = (value || '').trim();
  if (
    (env === 'production' || env === 'staging') &&
    v &&
    DEV_DEFAULT_SECRETS.includes(v.toLowerCase())
  ) {
    throw new Error(
      `[CONFIG] ${field} must be a strong, environment-specific secret (NODE_ENV=${env}). ` +
        'Generate one with: openssl rand -base64 48',
    );
  }
  return v;
}

export const environmentSchema = z
  .object({
    // ── Application ──────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    APP_NAME: z.string().default('SHRANIX-Krushi-ERP'),
    APP_PORT: z.coerce.number().int().positive().max(65535).default(4001),
    APP_URL: z.string().url().default('http://localhost:4001'),
    CORS_ORIGINS: z.string().default('http://localhost:4000,tauri://localhost'),

    // ── Database ─────────────────────────────────────────────
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']).default('sqlite'),

    // ── Logging ──────────────────────────────────────────────
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
      .default('debug'),
    LOG_FORMAT: z.enum(['pretty', 'json']).default('pretty'),

    // ── Auth / JWT ───────────────────────────────────────────
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    JWT_REFRESH_SECRET: z.string().default(''),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // ── License signing (Phase 13/15 key management) ─────────
    LICENSE_SIGNING_KEY: z.string().default(''), // PEM RSA private key (server-side only)
    LICENSE_SIGNING_KEY_ID: z.string().default('key-1'),
    LICENSE_SIGNING_ALGORITHM: z.enum(['rsa-sha256']).default('rsa-sha256'),

    // ── Payment (Phase 12) ───────────────────────────────────
    PAYMENT_PROVIDER: z.enum(['razorpay', 'stripe', 'manual', 'test']).default('test'),
    PAYMENT_WEBHOOK_SECRET: z.string().default(''),
    PAYMENT_KEY_ID: z.string().default(''),
    PAYMENT_KEY_SECRET: z.string().default(''),

    // ── Storage (DMS) ────────────────────────────────────────
    STORAGE_ADAPTER: z.enum(['local', 's3', 'minio']).default('local'),
    LOCAL_STORAGE_PATH: z.string().default('./storage/dms'),
    MINIO_ENDPOINT: z.string().default(''),
    MINIO_ACCESS_KEY: z.string().default(''),
    MINIO_SECRET_KEY: z.string().default(''),

    // ── Email / Notifications ────────────────────────────────
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('SHRANIX ERP <noreply@shranix.com>'),

    // ── Monitoring / observability ───────────────────────────
    METRICS_ENABLED: z
      .string()
      .transform((v) => v === 'true' || v === '1')
      .default('true'),

    // ── Rate limiting ────────────────────────────────────────
    RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

    // ── Swagger ──────────────────────────────────────────────
    SWAGGER_ENABLED: z
      .string()
      .transform((v) => v === 'true' || v === '1')
      .default('true'),
    SWAGGER_PATH: z.string().default('api/docs'),
  })
  .superRefine((data, ctx) => {
    // Production/staging: no default secrets allowed.
    if (data.NODE_ENV === 'production' || data.NODE_ENV === 'staging') {
      const guard = (field: string, value: string | undefined) => {
        try {
          productionSecretGuard(value, field, data.NODE_ENV);
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: (err as Error).message,
            path: [field],
          });
        }
      };
      guard('JWT_SECRET', data.JWT_SECRET);
      guard('JWT_REFRESH_SECRET', data.JWT_REFRESH_SECRET);
      guard('PAYMENT_WEBHOOK_SECRET', data.PAYMENT_WEBHOOK_SECRET);
      guard('PAYMENT_KEY_SECRET', data.PAYMENT_KEY_SECRET);
      guard('MINIO_SECRET_KEY', data.MINIO_SECRET_KEY);
      guard('SMTP_PASS', data.SMTP_PASS);
    }
  });

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

/** Parse + validate process.env. Throws with a clear message on invalid config. */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[CONFIG] Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
