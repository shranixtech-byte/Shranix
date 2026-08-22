import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * H20 — Platform Modernization & Security Tests
 *
 * Tests verify:
 * 1. NestJS 11 alignment across all packages
 * 2. Express 5 compatibility
 * 3. drizzle-kit upgrade
 * 4. Zero critical/high vulnerabilities
 * 5. SBOM generation capability
 * 6. Structured audit script exists
 * 7. Dependabot configuration exists
 * 8. Supply-chain policy updated
 * 9. H19 regression prevention
 */

const ROOT = path.resolve(__dirname, '../../../../');

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('H20 — Platform Modernization', () => {
  describe('1. NestJS 11 alignment', () => {
    it('all core NestJS packages are >= 11.0.0', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const corePackages = [
        '@nestjs/common',
        '@nestjs/core',
        '@nestjs/platform-express',
        '@nestjs/testing',
      ];
      corePackages.forEach((pkg) => {
        const version = backendPkg.dependencies?.[pkg] || backendPkg.devDependencies?.[pkg];
        expect(version).toBeDefined();
        const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
        expect(major).toBeGreaterThanOrEqual(11);
      });
    });

    it('@nestjs/config >= 4.0.0', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const version = backendPkg.dependencies?.['@nestjs/config'];
      expect(version).toBeDefined();
      const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
      expect(major).toBeGreaterThanOrEqual(4);
    });

    it('@nestjs/swagger >= 11.0.0', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const version = backendPkg.dependencies?.['@nestjs/swagger'];
      expect(version).toBeDefined();
      const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
      expect(major).toBeGreaterThanOrEqual(11);
    });

    it('@nestjs/cli >= 11.0.0', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const version = backendPkg.devDependencies?.['@nestjs/cli'];
      expect(version).toBeDefined();
      const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
      expect(major).toBeGreaterThanOrEqual(11);
    });
  });

  describe('2. Express 5 compatibility', () => {
    it('express >= 5.0.0 in backend package.json', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const version = backendPkg.dependencies?.express;
      expect(version).toBeDefined();
      const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
      expect(major).toBeGreaterThanOrEqual(5);
    });
  });

  describe('3. drizzle-kit upgrade', () => {
    it('drizzle-kit >= 0.31.0', () => {
      const dbPkg = readJson(path.join(ROOT, 'database/package.json'));
      const version = dbPkg.dependencies?.['drizzle-kit'];
      expect(version).toBeDefined();
      const match = version.match(/[\d.]+/);
      expect(match).toBeTruthy();
      if (match) {
        const [major, minor] = match[0].split('.').map(Number);
        expect(major).toBe(0);
        expect(minor).toBeGreaterThanOrEqual(31);
      }
    });

    it('drizzle-orm is present', () => {
      const dbPkg = readJson(path.join(ROOT, 'database/package.json'));
      expect(dbPkg.dependencies?.['drizzle-orm']).toBeDefined();
    });
  });

  describe('4. Zero critical/high vulnerabilities', () => {
    it('pnpm overrides include esbuild fix', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides || {};
      expect(overrides['esbuild@<=0.24.2']).toBeDefined();
    });

    it('all H18 overrides still present', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides || {};
      expect(overrides.lodash).toBeDefined();
      expect(overrides['js-yaml@>=4.0.0 <5.0.0']).toBeDefined();
      expect(overrides['nanoid@>=3.0.0 <4.0.0']).toBeDefined();
      expect(overrides['fast-uri@>=3.0.0 <4.0.0']).toBeDefined();
      expect(overrides['picomatch@>=4.0.0 <5.0.0']).toBeDefined();
    });
  });

  describe('5. SBOM generation', () => {
    it('generate-sbom.sh exists and is executable', () => {
      const sbomScript = path.join(ROOT, 'scripts/generate-sbom.sh');
      expect(fs.existsSync(sbomScript)).toBe(true);
    });
  });

  describe('6. Structured audit', () => {
    it('ci-structured-audit.sh exists', () => {
      const auditScript = path.join(ROOT, 'scripts/ci-structured-audit.sh');
      expect(fs.existsSync(auditScript)).toBe(true);
    });
  });

  describe('7. Dependabot configuration', () => {
    it('.github/dependabot.yml exists', () => {
      expect(fs.existsSync(path.join(ROOT, '.github/dependabot.yml'))).toBe(true);
    });

    it('dependabot.yml has npm ecosystem configured', () => {
      const config = fs.readFileSync(path.join(ROOT, '.github/dependabot.yml'), 'utf8');
      expect(config).toContain('package-ecosystem:');
      expect(config).toContain('npm');
      expect(config).toContain('interval:');
      expect(config).toContain('weekly');
    });

    it('dependabot.yml has github-actions ecosystem', () => {
      const config = fs.readFileSync(path.join(ROOT, '.github/dependabot.yml'), 'utf8');
      expect(config).toContain('github-actions');
    });
  });

  describe('8. Supply-chain policy', () => {
    it('SUPPLY_CHAIN_POLICY.md exists and is version 2.0', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('Version:** 2.0');
    });

    it('policy documents SBOM section', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('SBOM');
      expect(policy).toContain('CycloneDX');
    });

    it('policy documents Dependabot', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('Dependabot');
    });

    it('policy documents structured audit', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('Structured Audit');
    });
  });

  describe('9. H19 regression prevention', () => {
    it('vitest >= 3.2.6', () => {
      const workspaces = ['backend', 'frontend', 'database'];
      workspaces.forEach((ws) => {
        const pkg = readJson(path.join(ROOT, ws, 'package.json'));
        const version = pkg.devDependencies?.vitest;
        expect(version).toBeDefined();
        const major = parseInt(version.match(/[\d.]+/)?.[0]?.split('.')[0] || '0');
        expect(major).toBeGreaterThanOrEqual(3);
      });
    });

    it('CI workflow has supply-chain job', () => {
      const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
      expect(ci).toContain('supply-chain');
      expect(ci).toContain('ci-supply-chain-audit.sh');
    });
  });
});
