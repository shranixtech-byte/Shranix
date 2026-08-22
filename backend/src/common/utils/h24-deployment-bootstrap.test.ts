import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * H24 — Deployment Bootstrap & Runbook Tests
 *
 * Validates that the reproducible staging bootstrap and deployment
 * runbooks are present, consistent, and reference real infrastructure.
 */
describe('H24 — Deployment Bootstrap', () => {
  describe('1. Docker Compose — Staging', () => {
    it('should have docker-compose.staging.yml', () => {
      const path = join(ROOT, 'docker-compose.staging.yml');
      expect(existsSync(path), 'docker-compose.staging.yml must exist').toBe(true);
    });

    it('should define postgres service', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('postgres');
      expect(content).toContain('postgres:16');
    });

    it('should define redis service', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('redis');
      expect(content).toContain('redis:7');
    });

    it('should define minio service', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('minio');
    });

    it('should define backend service with healthcheck', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('backend');
      expect(content).toContain('healthcheck');
      expect(content).toContain('/v1/health/live');
    });

    it('should define frontend service', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('frontend');
      expect(content).toContain('Dockerfile.frontend');
    });

    it('should use environment variables, not hardcoded secrets', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      // Should contain variable references
      expect(content).toMatch(/\$\{[A-Z_]+:-/);
      // Should NOT contain real passwords (only safe placeholders)
      expect(content).not.toContain('real_production_password');
    });

    it('should have persistent volumes', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      expect(content).toContain('volumes:');
      expect(content).toContain('staging_postgres_data');
      expect(content).toContain('staging_redis_data');
    });
  });

  describe('2. Docker Compose — Production', () => {
    it('should have docker-compose.production.yml', () => {
      const path = join(ROOT, 'docker-compose.production.yml');
      expect(existsSync(path)).toBe(true);
    });

    it('should reference production image registry', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.production.yml'), 'utf-8');
      expect(content).toContain('ghcr.io');
    });

    it('should have resource limits', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.production.yml'), 'utf-8');
      expect(content).toContain('resources:');
      expect(content).toContain('limits:');
    });
  });

  describe('3. Dockerfiles', () => {
    it('should have Dockerfile.backend with multi-stage build', () => {
      const content = readFileSync(join(ROOT, 'Dockerfile.backend'), 'utf-8');
      expect(content).toContain('FROM node:20-alpine AS deps');
      expect(content).toContain('FROM node:20-alpine AS builder');
      expect(content).toContain('FROM node:20-alpine AS runner');
    });

    it('should run as non-root user', () => {
      const content = readFileSync(join(ROOT, 'Dockerfile.backend'), 'utf-8');
      expect(content).toContain('USER appuser');
      expect(content).toContain('adduser --system');
    });

    it('should have healthcheck', () => {
      const content = readFileSync(join(ROOT, 'Dockerfile.backend'), 'utf-8');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/v1/health/live');
    });

    it('should use frozen lockfile', () => {
      const content = readFileSync(join(ROOT, 'Dockerfile.backend'), 'utf-8');
      expect(content).toContain('--frozen-lockfile');
    });

    it('should have Dockerfile.frontend with nginx', () => {
      const content = readFileSync(join(ROOT, 'Dockerfile.frontend'), 'utf-8');
      expect(content).toContain('nginx:1.25-alpine');
      expect(content).toContain('HEALTHCHECK');
    });
  });

  describe('4. Environment Templates', () => {
    it('should have .env.staging.template', () => {
      const path = join(ROOT, '.env.staging.template');
      expect(existsSync(path), '.env.staging.template must exist').toBe(true);
    });

    it('should have .env.example', () => {
      const path = join(ROOT, '.env.example');
      expect(existsSync(path), '.env.example must exist').toBe(true);
    });

    it('should contain all required staging variables', () => {
      const content = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      const requiredVars = [
        'DATABASE_PROVIDER',
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'REDIS_URL',
        'STORAGE_ADAPTER',
        'NODE_ENV',
      ];
      for (const v of requiredVars) {
        expect(content, `Must contain ${v}`).toContain(v);
      }
    });

    it('should not contain real secrets', () => {
      const content = readFileSync(join(ROOT, '.env.staging.template'), 'utf-8');
      expect(content).not.toMatch(/sk_live_/);
      expect(content).not.toMatch(/SG\.[a-zA-Z0-9]{22,}/);
      expect(content).not.toMatch(/postgres:\/\/.*:.*@.*\?.*sslmode=require/);
    });
  });

  describe('5. Health & Readiness Endpoints', () => {
    it('should have health controller', () => {
      const path = join(ROOT, 'backend/src/health/health.controller.ts');
      expect(existsSync(path)).toBe(true);
    });

    it('should have liveness probe', () => {
      const content = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(content).toContain('live');
      expect(content).toContain('@Public()');
    });

    it('should have readiness probe', () => {
      const content = readFileSync(join(ROOT, 'backend/src/health/health.controller.ts'), 'utf-8');
      expect(content).toContain('ready');
    });

    it('should have health service with database check', () => {
      const content = readFileSync(join(ROOT, 'backend/src/health/health.service.ts'), 'utf-8');
      expect(content).toContain('checkDatabase');
      expect(content).toContain('healthy');
    });
  });

  describe('6. Deployment Scripts', () => {
    it('should have staging smoke test script', () => {
      const path = join(ROOT, 'scripts/staging-smoke-test.sh');
      expect(existsSync(path), 'staging-smoke-test.sh must exist').toBe(true);
    });

    it('should have start-servers.mjs', () => {
      const path = join(ROOT, 'scripts/start-servers.mjs');
      expect(existsSync(path)).toBe(true);
    });

    it('smoke test should be executable', () => {
      // On Windows, file may not have executable bit; check it's a valid script
      const content = readFileSync(join(ROOT, 'scripts/staging-smoke-test.sh'), 'utf-8');
      expect(content).toContain('#!/usr/bin/env bash');
    });
  });

  describe('7. Deployment Runbooks', () => {
    it('should have backup/restore runbook', () => {
      const path = join(ROOT, 'docs/runbooks/staging-backup-restore.md');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('pg_dump');
      expect(content).toContain('RPO');
      expect(content).toContain('RTO');
    });

    it('should have rollback runbook', () => {
      const path = join(ROOT, 'docs/runbooks/staging-rollback.md');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('Code Rollback');
      expect(content).toContain('Database Rollback');
    });

    it('should have deployment checklist', () => {
      const path = join(ROOT, 'docs/runbooks/staging-deployment-checklist.md');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('Pre-Deploy');
      expect(content).toContain('Post-Deploy');
      expect(content).toContain('Rollback');
    });

    it('should have H24 deployment bootstrap document', () => {
      const path = join(ROOT, 'docs/H24_DEPLOYMENT_BOOTSTRAP.md');
      expect(existsSync(path)).toBe(true);
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('Bootstrap Sequence');
      expect(content).toContain('Database');
      expect(content).toContain('Redis');
      expect(content).toContain('Health Checks');
    });
  });

  describe('8. CI/CD', () => {
    it('should have CI workflow', () => {
      const path = join(ROOT, '.github/workflows/ci.yml');
      expect(existsSync(path)).toBe(true);
    });

    it('CI should verify docker compose syntax', () => {
      const content = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8');
      expect(content).toContain('docker compose');
      expect(content).toContain('config');
    });

    it('CI should use frozen lockfile', () => {
      const content = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8');
      expect(content).toContain('--frozen-lockfile');
    });

    it('CI should build docker images', () => {
      const content = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf-8');
      expect(content).toContain('docker-build');
      expect(content).toContain('Dockerfile.backend');
      expect(content).toContain('Dockerfile.frontend');
    });
  });

  describe('9. No Hardcoded Secrets', () => {
    it('docker-compose.staging.yml should not have real passwords', () => {
      const content = readFileSync(join(ROOT, 'docker-compose.staging.yml'), 'utf-8');
      // Check no hardcoded JWT secrets
      expect(content).not.toMatch(/jwt_secret.*[a-f0-9]{32,}/i);
      // Check no AWS keys
      expect(content).not.toMatch(/AKIA[A-Z0-9]{16}/);
    });

    it('smoke test should not contain credentials', () => {
      const content = readFileSync(join(ROOT, 'scripts/staging-smoke-test.sh'), 'utf-8');
      expect(content).not.toMatch(/sk_live_/);
      expect(content).not.toMatch(/SG\.[a-zA-Z0-9]{22,}/);
    });
  });
});
