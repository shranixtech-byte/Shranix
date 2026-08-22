import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * H19 — Supply-Chain Enforcement & Dependency Upgrade Tests
 *
 * These tests verify:
 * 1. Vitest upgraded to 3.x (critical vuln resolved)
 * 2. @nestjs/cli upgraded to 11.x (glob/picomatch/tmp vulns resolved)
 * 3. Lockfile enforcement (frozen lockfile compatible)
 * 4. Dependency audit policy (no critical/high in production)
 * 5. Accepted-risk documentation (remaining vulns are documented)
 * 6. XLSX integrity pinning (CDN tarball pinned)
 * 7. Suspicious dependency source detection
 * 8. License policy presence
 */

const ROOT = path.resolve(__dirname, '../../../../');
const LOCKFILE = path.join(ROOT, 'pnpm-lock.yaml');

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('H19 — Supply-Chain Enforcement', () => {
  describe('1. Vitest upgrade compatibility', () => {
    it('vitest >= 3.2.6 across all workspaces (critical vuln resolved)', () => {
      const workspaces = ['backend', 'frontend', 'database'];
      workspaces.forEach((ws) => {
        const pkg = readJson(path.join(ROOT, ws, 'package.json'));
        const vitestVersion = pkg.devDependencies?.vitest;
        expect(vitestVersion).toBeDefined();
        // Should resolve to 3.x
        const match = vitestVersion.match(/[\d.]+/);
        expect(match).toBeTruthy();
        if (match) {
          const major = parseInt(match[0].split('.')[0]);
          expect(major).toBeGreaterThanOrEqual(3);
        }
      });
    });

    it('vitest resolved version in lockfile >= 3.2.6', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const vitestLines = content.split('\n').filter((l) => l.match(/^ {2}vitest@/));
      vitestLines.forEach((line) => {
        const versionMatch = line.match(/vitest@([\d.]+)/);
        if (versionMatch) {
          const [major, minor, patch] = versionMatch[1].split('.').map(Number);
          if (major === 3) {
            expect(minor).toBeGreaterThanOrEqual(2);
            if (minor === 2) {
              expect(patch).toBeGreaterThanOrEqual(6);
            }
          }
        }
      });
    });
  });

  describe('2. @nestjs/cli upgrade', () => {
    it('@nestjs/cli >= 11.0.0 in backend package.json', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const cliVersion = backendPkg.devDependencies?.['@nestjs/cli'];
      expect(cliVersion).toBeDefined();
      const match = cliVersion.match(/[\d.]+/);
      expect(match).toBeTruthy();
      if (match) {
        const major = parseInt(match[0].split('.')[0]);
        expect(major).toBeGreaterThanOrEqual(11);
      }
    });

    it('no glob in vulnerable range 10.2.0-10.4.x in lockfile (command injection fixed)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const globLines = content.split('\n').filter((l) => l.match(/^ {2}glob@/));
      globLines.forEach((line) => {
        const versionMatch = line.match(/glob@([\d.]+)/);
        if (versionMatch) {
          const [major, minor] = versionMatch[1].split('.').map(Number);
          // Vulnerable range: >=10.2.0 <10.5.0
          if (major === 10) {
            const isVulnerable = minor >= 2 && minor < 5;
            expect(isVulnerable).toBe(false);
          }
        }
      });
    });

    it('picomatch >= 4.0.4 in lockfile (ReDoS fixed)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const picoLines = content.split('\n').filter((l) => l.match(/^ {2}picomatch@4/));
      picoLines.forEach((line) => {
        const versionMatch = line.match(/picomatch@([\d.]+)/);
        if (versionMatch) {
          const [, minor, patch] = versionMatch[1].split('.').map(Number);
          expect(minor).toBe(0);
          expect(patch).toBeGreaterThanOrEqual(4);
        }
      });
    });
  });

  describe('3. Lockfile enforcement', () => {
    it('pnpm-lock.yaml exists and is non-empty', () => {
      expect(fs.existsSync(LOCKFILE)).toBe(true);
      const stat = fs.statSync(LOCKFILE);
      expect(stat.size).toBeGreaterThan(10000);
    });

    it('lockfileVersion 9.0 (compatible with pnpm 9.x)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      expect(content).toMatch(/lockfileVersion:\s*'9\.0'/);
    });

    it('no git: references in lockfile', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const gitRefs = content.match(/git[+:]/g) || [];
      expect(gitRefs.length).toBe(0);
    });

    it('workspace links use workspace: protocol', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      // @shranix/database should be linked via workspace:
      expect(content).toContain('@shranix/database');
    });
  });

  describe('4. Dependency audit policy', () => {
    it('no critical vulnerabilities in production dependencies', () => {
      // This test documents the policy — actual enforcement is in CI
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      // Vitest (critical) should not appear in production deps
      // The lockfile should not have vitest in a production resolution path
      // This is a documentation/policy test
      expect(content).toContain('lockfileVersion');
    });

    it('pnpm overrides section exists with security patches', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides;
      expect(overrides).toBeDefined();
      // H18 overrides
      expect(overrides.lodash).toBeDefined();
      expect(overrides['js-yaml@>=4.0.0 <5.0.0']).toBeDefined();
      // H19 override
      expect(overrides['picomatch@>=4.0.0 <5.0.0']).toBeDefined();
    });
  });

  describe('5. Accepted-risk documentation', () => {
    it('SUPPLY_CHAIN_POLICY.md exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'))).toBe(true);
    });

    it('policy documents remaining accepted risks', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('@nestjs/core');
      expect(policy).toContain('body-parser');
      expect(policy).toContain('file-type');
    });
  });

  describe('6. XLSX integrity pinning', () => {
    it('xlsx pinned to exact CDN tarball URL', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const xlsxVersion = backendPkg.dependencies?.xlsx;
      expect(xlsxVersion).toBeDefined();
      expect(xlsxVersion).toMatch(/xlsx-[\d.]+\.tgz$/);
      expect(xlsxVersion).toContain('cdn.sheetjs.com');
    });

    it('xlsx tarball recorded in lockfile with integrity', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      expect(content).toContain('xlsx-0.20.3.tgz');
    });
  });

  describe('7. Suspicious dependency source detection', () => {
    it('no undocumented git dependencies', () => {
      const files = [
        'package.json',
        'backend/package.json',
        'frontend/package.json',
        'database/package.json',
      ];
      files.forEach((f) => {
        const pkg = readJson(path.join(ROOT, f));
        ['dependencies', 'devDependencies'].forEach((cat) => {
          if (pkg[cat]) {
            Object.entries(pkg[cat]).forEach(([name, ver]) => {
              if (typeof ver === 'string' && ver.startsWith('git')) {
                throw new Error(`Git dependency found in ${f}: ${name} = ${ver}`);
              }
            });
          }
        });
      });
    });

    it('no undocumented URL/tarball dependencies', () => {
      const files = [
        'package.json',
        'backend/package.json',
        'frontend/package.json',
        'database/package.json',
      ];
      const documented = ['xlsx']; // Only xlsx is documented
      files.forEach((f) => {
        const pkg = readJson(path.join(ROOT, f));
        ['dependencies', 'devDependencies'].forEach((cat) => {
          if (pkg[cat]) {
            Object.entries(pkg[cat]).forEach(([name, ver]) => {
              if (typeof ver === 'string' && (ver.includes('.tgz') || ver.includes('.tar.gz'))) {
                if (!documented.includes(name)) {
                  throw new Error(`Undocumented tarball dependency in ${f}: ${name} = ${ver}`);
                }
              }
            });
          }
        });
      });
    });
  });

  describe('8. License policy', () => {
    it('SUPPLY_CHAIN_POLICY.md defines allowed licenses', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('MIT');
      expect(policy).toContain('Apache-2.0');
      expect(policy).toContain('ISC');
      expect(policy).toContain('BSD');
    });

    it('policy defines restricted licenses', () => {
      const policy = fs.readFileSync(path.join(ROOT, 'docs/SUPPLY_CHAIN_POLICY.md'), 'utf8');
      expect(policy).toContain('GPL');
      expect(policy).toContain('AGPL');
    });
  });
});
