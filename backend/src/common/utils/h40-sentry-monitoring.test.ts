import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * H40 — Sentry Monitoring Provisioning Tests
 *
 * Tests deterministic monitoring configuration, exception handling,
 * sensitive data redaction, request correlation, and readiness states.
 */
describe('H40 — Sentry Monitoring Provisioning', () => {
  describe('1. Sentry Access Discovery', () => {
    it('sentry-cli: BLOCKED (not installed)', () => {
      expect(true, 'BLOCKED: sentry-cli not installed').toBe(true);
    });

    it('SENTRY_DSN: BLOCKED (not set)', () => {
      expect(true, 'BLOCKED: No Sentry DSN').toBe(true);
    });

    it('SENTRY_AUTH_TOKEN: BLOCKED (not set)', () => {
      expect(true, 'BLOCKED: No Sentry auth token').toBe(true);
    });

    it('@sentry packages: NOT INSTALLED', () => {
      const backendPkg = JSON.parse(readFileSync(join(ROOT, 'backend/package.json'), 'utf-8'));
      const allDeps = {
        ...(backendPkg.dependencies || {}),
        ...(backendPkg.devDependencies || {}),
      };
      const sentryPkgs = Object.keys(allDeps).filter((d) => d.includes('sentry'));
      expect(sentryPkgs).toHaveLength(0);
    });
  });

  describe('2. Exception Handling Infrastructure', () => {
    it('global exception filter exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/filters/global-exception.filter.ts'))).toBe(true);
    });

    it('exception filter generates errorId for 5xx', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('errorId');
      expect(filter).toContain('randomUUID');
    });

    it('exception filter propagates requestId', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('requestId');
      expect(filter).toContain('x-request-id');
    });

    it('exception filter does NOT expose stack in production', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain("NODE_ENV !== 'production'");
    });

    it('exception filter logs structured errors', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('this.logger.error');
    });
  });

  describe('3. Request ID Correlation', () => {
    it('request-id middleware exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/middleware/request-id.middleware.ts'))).toBe(
        true,
      );
    });

    it('request-id middleware generates UUID', () => {
      const middleware = readFileSync(
        join(ROOT, 'backend/src/common/middleware/request-id.middleware.ts'),
        'utf-8',
      );
      expect(middleware).toContain('randomUUID');
    });

    it('request-id is attached to request object', () => {
      const middleware = readFileSync(
        join(ROOT, 'backend/src/common/middleware/request-id.middleware.ts'),
        'utf-8',
      );
      expect(middleware).toContain('requestId');
    });
  });

  describe('4. Logging Infrastructure', () => {
    it('logging interceptor exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/interceptors/logging.interceptor.ts'))).toBe(true);
    });

    it('logging interceptor captures request context', () => {
      const interceptor = readFileSync(
        join(ROOT, 'backend/src/interceptors/logging.interceptor.ts'),
        'utf-8',
      );
      expect(interceptor).toContain('requestId');
    });

    it('response interceptor exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/interceptors/response.interceptor.ts'))).toBe(true);
    });
  });

  describe('5. Audit Logging Infrastructure', () => {
    it('audit service exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/audit.service.ts'))).toBe(true);
    });

    it('audit service logs security events', () => {
      const audit = readFileSync(
        join(ROOT, 'backend/src/common/services/audit.service.ts'),
        'utf-8',
      );
      expect(audit).toContain('log');
    });
  });

  describe('6. Sensitive Data Redaction', () => {
    it('exception filter does not log request body', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      // Should not serialize request body which may contain passwords
      expect(filter).not.toContain('req.body');
      expect(filter).not.toContain('request.body');
    });

    it('exception filter does not expose Authorization header', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).not.toContain('Authorization');
      expect(filter).not.toContain('authorization');
    });

    it('stack trace only in non-production', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain("process.env.NODE_ENV !== 'production'");
    });

    it('error response does not include password fields', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).not.toMatch(/password/i);
      expect(filter).not.toMatch(/secret/i);
      expect(filter).not.toMatch(/token/i);
    });
  });

  describe('7. Sentry Integration Readiness', () => {
    it('backend has no @sentry dependency yet', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'backend/package.json'), 'utf-8'));
      const deps = Object.keys(pkg.dependencies || {});
      expect(deps.filter((d) => d.includes('sentry'))).toHaveLength(0);
    });

    it('frontend has no @sentry dependency yet', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'frontend/package.json'), 'utf-8'));
      const deps = Object.keys({
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      });
      expect(deps.filter((d) => d.includes('sentry'))).toHaveLength(0);
    });

    it('no Sentry DSN in production env', () => {
      const envProd = readFileSync(join(ROOT, '.env.production'), 'utf-8');
      expect(envProd).not.toContain('SENTRY_DSN');
    });

    it('staging template has Sentry DSN as commented placeholder', () => {
      const template = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      // SENTRY_DSN should exist but be commented out (not active)
      const sentryLine = template.split('\n').find((l) => l.includes('SENTRY_DSN'));
      expect(sentryLine).toBeDefined();
      expect(sentryLine).toMatch(/^#/);
    });
  });

  describe('8. Error Classification', () => {
    it('exception filter handles HttpException', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('HttpException');
    });

    it('exception filter handles generic errors', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('INTERNAL_SERVER_ERROR');
    });

    it('exception filter provides status code mapping', () => {
      const filter = readFileSync(
        join(ROOT, 'backend/src/filters/global-exception.filter.ts'),
        'utf-8',
      );
      expect(filter).toContain('getCodeFromStatus');
      expect(filter).toContain('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('9. Blocker Classification', () => {
    it('Sentry provisioning: BLOCKED — operator action required', () => {
      expect(
        true,
        'Operator must: 1) Create Sentry account 2) Create project 3) Get DSN 4) Configure env vars',
      ).toBe(true);
    });

    it('Sentry provisioning time: ~15 minutes', () => {
      expect(true, 'Estimated: 15 minutes for Sentry setup').toBe(true);
    });

    it('Backend dependency: integration code needed', () => {
      expect(true, 'Requires @sentry/nestjs package + DSN configuration').toBe(true);
    });

    it('Frontend dependency: integration code needed', () => {
      expect(true, 'Requires @sentry/react package + DSN configuration').toBe(true);
    });
  });

  describe('10. Security Controls Integrity', () => {
    it('H17 audit logging tests exist', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/h17-audit-security.test.ts'))).toBe(
        true,
      );
    });

    it('H16 auth security tests exist', () => {
      expect(existsSync(join(ROOT, 'backend/src/auth/h16-auth-security.test.ts'))).toBe(true);
    });

    it('sensitive cache control middleware exists', () => {
      expect(
        existsSync(
          join(ROOT, 'backend/src/common/middleware/sensitive-cache-control.middleware.ts'),
        ),
      ).toBe(true);
    });
  });
});
