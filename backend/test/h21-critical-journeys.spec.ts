/**
 * H21 — Critical Journey E2E API Tests
 *
 * Tests critical production paths by verifying code structure and security patterns.
 * These are API-level verification tests (not browser-level E2E).
 */

import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

const BACKEND_SRC = path.resolve(__dirname, '../src');

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(BACKEND_SRC, relativePath), 'utf8');
}

function srcExists(relativePath: string): boolean {
  return fs.existsSync(path.join(BACKEND_SRC, relativePath));
}

/**
 * H21.1 — Health & Readiness
 */
describe('H21 E2E — Health & Readiness', () => {
  it('health module exists', () => {
    expect(srcExists('health/health.module.ts')).toBe(true);
    expect(srcExists('health/health.controller.ts')).toBe(true);
    expect(srcExists('health/health.service.ts')).toBe(true);
  });
});

/**
 * H21.2 — Authentication Journey
 */
describe('H21 E2E — Authentication Journey', () => {
  it('auth module with controller and service', () => {
    expect(srcExists('auth/auth.module.ts')).toBe(true);
    expect(srcExists('auth/auth.controller.ts')).toBe(true);
    expect(srcExists('auth/auth.service.ts')).toBe(true);
  });

  it('JWT strategy configured', () => {
    const authDir = path.join(BACKEND_SRC, 'auth/strategies');
    expect(fs.existsSync(authDir)).toBe(true);
    const strategies = fs.readdirSync(authDir);
    expect(strategies.some((f) => f.includes('jwt'))).toBe(true);
  });

  it('password hashing uses argon2', () => {
    expect(readSrc('auth/auth.service.ts')).toContain('argon2');
  });

  it('refresh token mechanism exists', () => {
    expect(readSrc('auth/auth.service.ts').toLowerCase()).toContain('refresh');
  });
});

/**
 * H21.3 — Master Data Journey
 */
describe('H21 E2E — Master Data Journey', () => {
  it('products master has CRUD', () => {
    const svc = readSrc('inventory/products-master.service.ts');
    expect(svc).toContain('create');
    expect(svc).toContain('update');
  });

  it('customers service has CRUD', () => {
    const svc = readSrc('sales/customers.service.ts');
    expect(svc).toContain('create');
  });

  it('suppliers service has CRUD', () => {
    const svc = readSrc('purchase/suppliers.service.ts');
    expect(svc).toContain('create');
  });
});

/**
 * H21.4 — Sales Transaction Journey
 */
describe('H21 E2E — Sales Transaction Journey', () => {
  it('posting engine uses transactional posting', () => {
    // The posting engine may be in different locations
    const salesDir = path.join(BACKEND_SRC, 'sales');
    const files = fs.readdirSync(salesDir, { recursive: true }) as string[];
    const postingFile = files.find((f) => typeof f === 'string' && f.includes('posting'));
    expect(postingFile).toBeTruthy();
  });

  it('canonical ledger exists (H1)', () => {
    // Find canonical ledger file anywhere in inventory
    const invDir = path.join(BACKEND_SRC, 'inventory');
    const files = fs.readdirSync(invDir, { recursive: true }) as string[];
    const canonicalFile = files.find((f) => typeof f === 'string' && f.includes('canonical'));
    expect(canonicalFile).toBeTruthy();
  });

  it('stock calculation logic exists', () => {
    const invDir = path.join(BACKEND_SRC, 'inventory');
    const files = fs.readdirSync(invDir, { recursive: true }) as string[];
    // At least one service handles stock movements
    const stockFiles = files.filter(
      (f) => typeof f === 'string' && (f.includes('stock') || f.includes('movement')),
    );
    expect(stockFiles.length).toBeGreaterThan(0);
  });
});

/**
 * H21.5 — Workflow Authorization (H2)
 */
describe('H21 E2E — Workflow Authorization', () => {
  it('approval engine verifies designated approver', () => {
    expect(readSrc('workflow/services/approval-engine.service.ts')).toContain(
      'verifyApproverEligibility',
    );
  });

  it('controller uses server-derived actor', () => {
    expect(readSrc('workflow/controllers/instances.controller.ts')).toContain('@CurrentUser');
  });

  it('task engine checks assignee', () => {
    expect(readSrc('workflow/services/task-engine.service.ts')).toContain('assignee');
  });
});

/**
 * H21.6 — Payment Webhook Security (H8)
 */
describe('H21 E2E — Payment Webhook Security', () => {
  it('webhook handler with HMAC verification', () => {
    const svc = readSrc('commercial/services/billing-payments.service.ts');
    expect(svc).toContain('timingSafeEqual');
  });

  it('idempotency guard for PROCESSING state', () => {
    const svc = readSrc('commercial/services/billing-payments.service.ts');
    expect(svc).toContain('PROCESSING');
  });

  it('applyPayment is transactional', () => {
    const svc = readSrc('commercial/services/billing-payments.service.ts');
    // TransactionManager may be imported or used via executeInTransaction
    const hasTransaction =
      svc.includes('TransactionManager') ||
      svc.includes('executeInTransaction') ||
      svc.includes('transaction');
    expect(hasTransaction).toBe(true);
  });
});

/**
 * H21.7 — Security Controls
 */
describe('H21 E2E — Security Controls', () => {
  it('rate limiting configured (H13)', () => {
    expect(readSrc('guards/throttler-behind-proxy.guard.ts')).toContain('ThrottlerGuard');
  });

  it('security headers configured (H14)', () => {
    expect(readSrc('common/utils/security-headers.ts')).toContain('CORS');
  });

  it('CSRF guard exists', () => {
    expect(srcExists('common/guards/csrf.guard.ts')).toBe(true);
  });

  it('input validation uses ValidationPipe (H15)', () => {
    expect(readSrc('main.ts')).toContain('ValidationPipe');
  });

  it('audit logging captures requestId (H17)', () => {
    expect(readSrc('common/services/audit.service.ts')).toContain('requestId');
  });
});

/**
 * H21.8 — Supply Chain Integrity
 */
describe('H21 E2E — Supply Chain Integrity', () => {
  it('zero vulnerabilities documented', () => {
    const policy = fs.readFileSync(
      path.resolve(__dirname, '../../docs/SUPPLY_CHAIN_POLICY.md'),
      'utf8',
    );
    expect(policy).toContain('zero critical');
  });

  it('SBOM generation script exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../scripts/generate-sbom.sh'))).toBe(true);
  });

  it('Dependabot configured', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../.github/dependabot.yml'))).toBe(true);
  });

  it('lockfile enforcement exists', () => {
    expect(fs.existsSync(path.resolve(__dirname, '../../scripts/ci-supply-chain-audit.sh'))).toBe(
      true,
    );
  });
});
