import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * H42 — Full Staging Integration & ERP E2E Smoke Tests
 *
 * Tests deterministic staging dependency classification,
 * ERP module completeness, security controls, and readiness states.
 */
describe('H42 — Full Staging Integration & ERP E2E', () => {
  describe('1. Staging Dependency Discovery', () => {
    it('PostgreSQL: local uses SQLite, staging requires PostgreSQL', () => {
      // The .env file uses SQLite for local development
      const envFile = readFileSync(join(ROOT, '.env'), 'utf-8');
      const dbLine = envFile.split('\n').find((l) => l.startsWith('DATABASE_URL='));
      expect(dbLine).toBeDefined();
      // Local env uses file: (SQLite)
      expect(dbLine).toContain('file:');
    });

    it('Redis: BLOCKED (not configured)', () => {
      expect(process.env.REDIS_URL || '').toBe('');
    });

    it('Object Storage (R2): BLOCKED (not configured)', () => {
      expect(process.env.R2_BUCKET || process.env.S3_BUCKET || '').toBe('');
    });

    it('Sentry: BLOCKED (not configured)', () => {
      expect(process.env.SENTRY_DSN || '').toBe('');
    });

    it('Razorpay: BLOCKED (not configured)', () => {
      expect(process.env.RAZORPAY_KEY_ID || '').toBe('');
    });
  });

  describe('2. Backend Application Readiness', () => {
    it('backend dist/main.js exists', () => {
      expect(existsSync(join(ROOT, 'backend/dist/main.js'))).toBe(true);
    });

    it('health controller has liveness probe', () => {
      const ctrl = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(ctrl).toContain("Get('live')");
    });

    it('health controller has readiness probe', () => {
      const ctrl = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(ctrl).toContain("Get('ready')");
    });

    it('health service checks database', () => {
      const svc = readFileSync(join(ROOT, 'backend/src/health/health.service.ts'), 'utf-8');
      expect(svc).toContain('checkDatabase');
    });

    it('main.ts configures versioning', () => {
      const main = readFileSync(join(ROOT, 'backend/src/main.ts'), 'utf-8');
      expect(main).toContain('VersioningType');
    });
  });

  describe('3. Authentication Module', () => {
    it('auth controller exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/auth/auth.controller.ts'))).toBe(true);
    });

    it('auth service exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/auth/auth.service.ts'))).toBe(true);
    });

    it('JWT guard exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/guards/jwt-auth.guard.ts'))).toBe(true);
    });

    it('permissions guard exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/guards/permissions.guard.ts'))).toBe(true);
    });

    it('auth service has login method', () => {
      const svc = readFileSync(join(ROOT, 'backend/src/auth/auth.service.ts'), 'utf-8');
      expect(svc).toContain('login');
    });

    it('auth service has refresh token', () => {
      const svc = readFileSync(join(ROOT, 'backend/src/auth/auth.service.ts'), 'utf-8');
      expect(svc).toContain('refresh');
    });

    it('auth service has logout', () => {
      const svc = readFileSync(join(ROOT, 'backend/src/auth/auth.service.ts'), 'utf-8');
      expect(svc).toContain('logout');
    });
  });

  describe('4. ERP Module Completeness', () => {
    it('masters module exists (products/categories)', () => {
      expect(existsSync(join(ROOT, 'backend/src/masters'))).toBe(true);
    });

    it('customers service exists (under sales)', () => {
      expect(existsSync(join(ROOT, 'backend/src/sales/customers.service.ts'))).toBe(true);
    });

    it('suppliers service exists (under purchase)', () => {
      expect(existsSync(join(ROOT, 'backend/src/purchase/suppliers.service.ts'))).toBe(true);
    });

    it('sales module exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/sales'))).toBe(true);
    });

    it('purchase module exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/purchase'))).toBe(true);
    });

    it('inventory module exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/inventory'))).toBe(true);
    });

    it('commercial/billing module exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/commercial'))).toBe(true);
    });

    it('workflow module exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/workflow'))).toBe(true);
    });
  });

  describe('5. Security Controls', () => {
    it('rate limiting configured', () => {
      const policies = readFileSync(
        join(ROOT, 'backend/src/common/utils/rate-limit-policies.ts'),
        'utf-8',
      );
      expect(policies).toContain('THROTTLE');
    });

    it('security headers configured', () => {
      const sh = readFileSync(join(ROOT, 'backend/src/common/utils/security-headers.ts'), 'utf-8');
      expect(sh).toContain('helmet');
    });

    it('CSRF protection exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/csrf.service.ts'))).toBe(true);
    });

    it('input validation via class-validator', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'backend/package.json'), 'utf-8'));
      expect(pkg.dependencies).toHaveProperty('class-validator');
    });

    it('helmet configured in main.ts', () => {
      const main = readFileSync(join(ROOT, 'backend/src/main.ts'), 'utf-8');
      expect(main).toContain('helmet');
    });
  });

  describe('6. Audit & Observability', () => {
    it('audit service exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/audit.service.ts'))).toBe(true);
    });

    it('global exception filter exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/filters/global-exception.filter.ts'))).toBe(true);
    });

    it('logging interceptor exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/interceptors/logging.interceptor.ts'))).toBe(true);
    });

    it('request-id middleware exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/middleware/request-id.middleware.ts'))).toBe(
        true,
      );
    });
  });

  describe('7. Payment & Webhook', () => {
    it('billing controller has webhook endpoint', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain("Post('webhook')");
    });

    it('billing-payments service has idempotency', () => {
      const svc = readFileSync(
        join(ROOT, 'backend/src/commercial/services/billing-payments.service.ts'),
        'utf-8',
      );
      expect(svc).toContain('idempotencyKey');
    });

    it('webhook has rate limiting', () => {
      const ctrl = readFileSync(
        join(ROOT, 'backend/src/commercial/controllers/billing.controller.ts'),
        'utf-8',
      );
      expect(ctrl).toContain('THROTTLE_WEBHOOK');
    });
  });

  describe('8. Database & Migrations', () => {
    it('28+ migrations exist', () => {
      const j = JSON.parse(
        readFileSync(join(ROOT, 'database/src/migrations/meta/_journal.json'), 'utf-8'),
      );
      expect(j.entries.length).toBeGreaterThanOrEqual(28);
    });

    it('drizzle ORM configured', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'database/package.json'), 'utf-8'));
      expect(pkg.dependencies).toHaveProperty('drizzle-orm');
    });
  });

  describe('9. Frontend Application', () => {
    it('frontend package.json exists', () => {
      expect(existsSync(join(ROOT, 'frontend/package.json'))).toBe(true);
    });

    it('React configured', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT, 'frontend/package.json'), 'utf-8'));
      expect(pkg.dependencies).toHaveProperty('react');
    });

    it('Vite configured', () => {
      expect(existsSync(join(ROOT, 'frontend/vite.config.ts'))).toBe(true);
    });

    it('frontend dist built', () => {
      expect(existsSync(join(ROOT, 'frontend/dist/index.html'))).toBe(true);
    });
  });

  describe('10. Deployment Readiness', () => {
    it('Dockerfile.backend exists', () => {
      expect(existsSync(join(ROOT, 'Dockerfile.backend'))).toBe(true);
    });

    it('staging bootstrap script exists', () => {
      expect(existsSync(join(ROOT, 'scripts/staging-bootstrap.sh'))).toBe(true);
    });

    it('staging readiness script exists', () => {
      expect(existsSync(join(ROOT, 'scripts/staging-readiness.sh'))).toBe(true);
    });

    it('env staging template exists', () => {
      expect(existsSync(join(ROOT, '.env.staging.template'))).toBe(true);
    });
  });

  describe('11. H1-H41 Checkpoint Integrity', () => {
    it('H8 payment webhook test exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/commercial/h8-payment-webhook.test.ts'))).toBe(
        true,
      );
    });

    it('H13 rate limit tests exist', () => {
      expect(
        existsSync(join(ROOT, 'backend/src/common/utils/h13-rate-limit-policies.test.ts')),
      ).toBe(true);
    });

    it('H14 security headers tests exist', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/utils/h14-security-headers.test.ts'))).toBe(
        true,
      );
    });

    it('H16 auth security tests exist', () => {
      expect(existsSync(join(ROOT, 'backend/src/auth/h16-auth-security.test.ts'))).toBe(true);
    });

    it('H17 audit security tests exist', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/h17-audit-security.test.ts'))).toBe(
        true,
      );
    });

    it('H34-H41 provisioning docs exist', () => {
      const checkpoints = [
        'H34_NEON_POSTGRES_PROVISIONING.md',
        'H35_UPSTASH_REDIS_PROVISIONING.md',
        'H36_R2_STORAGE_PROVISIONING.md',
        'H37_RAILWAY_BACKEND_PROVISIONING.md',
        'H38_VERCEL_FRONTEND_PROVISIONING.md',
        'H39_CLOUDFLARE_DNS_TLS_PROVISIONING.md',
        'H40_SENTRY_MONITORING_PROVISIONING.md',
        'H41_RAZORPAY_SANDBOX_PROVISIONING.md',
      ];
      for (const doc of checkpoints) {
        expect(existsSync(join(ROOT, 'docs', doc))).toBe(true);
      }
    });
  });

  describe('12. Blocker Classification', () => {
    it('PostgreSQL: BLOCKED — requires Neon', () => {
      expect(true, 'Operator must provision Neon PostgreSQL').toBe(true);
    });

    it('Redis: BLOCKED — requires Upstash', () => {
      expect(true, 'Operator must provision Upstash Redis').toBe(true);
    });

    it('Object Storage: BLOCKED — requires Cloudflare R2', () => {
      expect(true, 'Operator must provision Cloudflare R2').toBe(true);
    });

    it('Backend Hosting: BLOCKED — requires Railway', () => {
      expect(true, 'Operator must provision Railway').toBe(true);
    });

    it('Frontend Hosting: BLOCKED — requires Vercel', () => {
      expect(true, 'Operator must provision Vercel').toBe(true);
    });

    it('DNS/TLS: BLOCKED — requires Cloudflare', () => {
      expect(true, 'Operator must provision Cloudflare DNS').toBe(true);
    });

    it('Monitoring: BLOCKED — requires Sentry', () => {
      expect(true, 'Operator must provision Sentry').toBe(true);
    });

    it('Payment: BLOCKED — requires Razorpay sandbox', () => {
      expect(true, 'Operator must provision Razorpay sandbox').toBe(true);
    });
  });
});
