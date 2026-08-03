import { OnModuleInit, Injectable, Logger } from '@nestjs/common';

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

@Injectable()
export class EnvValidationService implements OnModuleInit {
  private readonly logger = new Logger(EnvValidationService.name);

  private readonly requiredVars: string[] = ['JWT_SECRET', 'DATABASE_URL'];

  private readonly optionalVars: string[] = [
    'REDIS_URL',
    'STORAGE_ADAPTER',
    'LOCAL_STORAGE_PATH',
    'MINIO_ENDPOINT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'CORS_ORIGINS',
    'SWAGGER_ENABLED',
    'SWAGGER_PATH',
    'APP_PORT',
    'NODE_ENV',
  ];

  onModuleInit() {
    const result = this.validate();
    if (!result.valid) {
      this.logger.warn(`Missing required environment variables: ${result.missing.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        this.logger.warn(warning);
      }
    }
  }

  validate(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const key of this.requiredVars) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }

    // JWT_SECRET strength check
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push(
        'JWT_SECRET is too short (< 32 characters). Use a strong secret in production.',
      );
    }

    // NODE_ENV check
    if (
      process.env.NODE_ENV === 'production' &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    ) {
      warnings.push('Production environment detected with weak JWT_SECRET. Set a strong secret.');
    }

    // DATABASE_URL scheme check
    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.startsWith('postgres://') &&
      !process.env.DATABASE_URL.startsWith('postgresql://') &&
      !process.env.DATABASE_URL.startsWith('sqlite://')
    ) {
      warnings.push(
        'DATABASE_URL has unexpected scheme. Expected postgres://, postgresql://, or sqlite://',
      );
    }

    // MINIO validation
    if (process.env.STORAGE_ADAPTER === 'minio') {
      const minioKeys = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
      for (const key of minioKeys) {
        if (!process.env[key]) {
          missing.push(key);
        }
      }
    }

    // SMTP validation
    if (process.env.SMTP_HOST) {
      const smtpKeys = ['SMTP_USER', 'SMTP_PASS'];
      for (const key of smtpKeys) {
        if (!process.env[key]) {
          warnings.push(`SMTP_HOST is set but ${key} is missing. Email sending will fail.`);
        }
      }
    }

    return { valid: missing.length === 0, missing, warnings };
  }

  getRedactedEnv(): Record<string, string> {
    const redacted: Record<string, string> = {};
    for (const key of [...this.requiredVars, ...this.optionalVars]) {
      if (process.env[key]) {
        const value = process.env[key]!;
        redacted[key] =
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('key')
            ? `${value.substring(0, 4)}****`
            : value;
      }
    }
    return redacted;
  }
}
