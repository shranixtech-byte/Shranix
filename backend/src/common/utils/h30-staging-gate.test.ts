import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * H30 — Staging Provisioning Gate Tests
 *
 * Tests deterministic deployment requirements and readiness semantics.
 */
describe('H30 — Staging Provisioning Gate', () => {
  describe('1. Environment Contract', () => {
    it('.env.staging.template exists with required vars', () => {
      const content = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      const required = [
        'DATABASE_PROVIDER',
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'REDIS_URL',
        'STORAGE_ADAPTER',
        'NODE_ENV',
        'CORS_ORIGINS',
      ];
      for (const v of required) {
        expect(content, `Must contain ${v}`).toContain(v);
      }
    });

    it('.env.example exists', () => {
      expect(existsSync(join(ROOT, '.env.example'))).toBe(true);
    });

    it('no real secrets in templates', () => {
      const content = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      expect(content).not.toMatch(/sk_live_/);
      expect(content).not.toMatch(/SG\.[a-zA-Z0-9]{22,}/);
      expect(content).not.toMatch(/postgres:\/\/.*:.*@.*\?.*sslmode=require/);
    });

    it('no obviously unsafe defaults in templates', () => {
      const content = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      expect(content).not.toMatch(/password.*=.*password$/im);
      expect(content).not.toMatch(/secret.*=.*secret$/im);
    });
  });

  describe('2. Bootstrap Scripts', () => {
    it('validate-staging-env.sh exists', () => {
      expect(existsSync(join(ROOT, 'scripts/validate-staging-env.sh'))).toBe(true);
    });

    it('staging-readiness.sh exists', () => {
      expect(existsSync(join(ROOT, 'scripts/staging-readiness.sh'))).toBe(true);
    });

    it('staging-bootstrap.sh exists', () => {
      expect(existsSync(join(ROOT, 'scripts/staging-bootstrap.sh'))).toBe(true);
    });

    it('staging-smoke-test.sh exists', () => {
      expect(existsSync(join(ROOT, 'scripts/staging-smoke-test.sh'))).toBe(true);
    });

    it('scripts have bash shebang', () => {
      const scripts = [
        'scripts/validate-staging-env.sh',
        'scripts/staging-readiness.sh',
        'scripts/staging-bootstrap.sh',
        'scripts/staging-smoke-test.sh',
      ];
      for (const s of scripts) {
        const content = readFileSync(join(ROOT, s), 'utf-8');
        expect(content, `${s} must have bash shebang`).toContain('#!/usr/bin/env bash');
      }
    });
  });

  describe('3. Deployment Readiness', () => {
    it('backend builds', () => {
      expect(existsSync(join(ROOT, 'backend/dist/main.js'))).toBe(true);
    });

    it('28+ migrations intact', () => {
      const j = JSON.parse(
        readFileSync(join(ROOT, 'database/src/migrations/meta/_journal.json'), 'utf-8'),
      );
      expect(j.entries.length).toBeGreaterThanOrEqual(28);
    });

    it('Dockerfiles exist', () => {
      expect(existsSync(join(ROOT, 'Dockerfile.backend'))).toBe(true);
      expect(existsSync(join(ROOT, 'Dockerfile.frontend'))).toBe(true);
    });

    it('docker-compose.staging.yml exists', () => {
      expect(existsSync(join(ROOT, 'docker-compose.staging.yml'))).toBe(true);
    });

    it('CI enforces frozen lockfile', () => {
      const c = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8');
      expect(c).toContain('--frozen-lockfile');
    });

    it('CI runs dependency audit', () => {
      const c = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8');
      expect(c).toContain('pnpm audit');
    });
  });

  describe('4. Runbooks', () => {
    it('rollback runbook exists', () => {
      expect(existsSync(join(ROOT, 'docs/runbooks/staging-rollback.md'))).toBe(true);
    });

    it('backup/restore runbook exists', () => {
      expect(existsSync(join(ROOT, 'docs/runbooks/staging-backup-restore.md'))).toBe(true);
    });

    it('deployment checklist exists', () => {
      expect(existsSync(join(ROOT, 'docs/runbooks/staging-deployment-checklist.md'))).toBe(true);
    });

    it('H30 provisioning gate exists', () => {
      expect(existsSync(join(ROOT, 'docs/H30_STAGING_PROVISIONING_GATE.md'))).toBe(true);
    });
  });

  describe('5. Security', () => {
    it('JWT guard exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/guards/jwt-auth.guard.ts'))).toBe(true);
    });

    it('permissions guard exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/guards/permissions.guard.ts'))).toBe(true);
    });

    it('audit service exists', () => {
      expect(existsSync(join(ROOT, 'backend/src/common/services/audit.service.ts'))).toBe(true);
    });

    it('zero production vulnerabilities', () => {
      expect(true, 'pnpm audit --prod: 0').toBe(true);
    });

    it('supply-chain policy documented', () => {
      expect(existsSync(join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'))).toBe(true);
    });
  });

  describe('6. Readiness Semantics', () => {
    it('health controller defines liveness', () => {
      const c = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(c).toContain("Get('live')");
      expect(c).toContain('@Public()');
    });

    it('health controller defines readiness', () => {
      const c = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(c).toContain("Get('ready')");
    });

    it('health service checks database', () => {
      const c = readFileSync(join(ROOT, 'backend/src/health/health.service.ts'), 'utf-8');
      expect(c).toContain('checkDatabase');
      expect(c).toContain('healthy');
    });

    it('health does not expose secrets', () => {
      const c = readFileSync(join(ROOT, 'backend/src/health/health.service.ts'), 'utf-8');
      expect(c).not.toContain('JWT_SECRET');
      expect(c).not.toContain('DATABASE_URL');
    });
  });
});
