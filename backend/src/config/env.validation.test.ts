import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('accepts a valid development config', () => {
    const cfg = validateEnvironment({
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./data/dev.db',
      JWT_SECRET: 'dev-secret-change-in-production',
    });
    expect(cfg.NODE_ENV).toBe('development');
    expect(cfg.DATABASE_PROVIDER).toBe('sqlite');
  });

  it('accepts staging and production with strong secrets', () => {
    const strong = 'x'.repeat(48);
    const staging = validateEnvironment({
      NODE_ENV: 'staging',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: strong,
      JWT_REFRESH_SECRET: strong,
    });
    expect(staging.NODE_ENV).toBe('staging');

    const prod = validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: strong,
      JWT_REFRESH_SECRET: strong,
    });
    expect(prod.NODE_ENV).toBe('production');
  });

  it('rejects production with the default dev JWT secret (17.4)', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'dev-secret-change-in-production',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects production with placeholder secrets (17.4)', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_SECRET: 'change_me',
        PAYMENT_WEBHOOK_SECRET: 'shranix123',
      }),
    ).toThrow(/PAYMENT_WEBHOOK_SECRET/);
  });

  it('rejects missing DATABASE_URL (fail-fast, 17.3)', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL/);
  });

  it('rejects invalid NODE_ENV values', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'prod' as any,
        DATABASE_URL: 'file:x',
        JWT_SECRET: 's'.repeat(32),
      }),
    ).toThrow(/NODE_ENV/);
  });
});
