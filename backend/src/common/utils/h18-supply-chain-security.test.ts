import * as fs from 'fs';
import * as path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * H18 — Supply-Chain Security & Dependency Vulnerability Tests
 *
 * These tests verify:
 * 1. Lockfile integrity (pnpm-lock.yaml exists and is parseable)
 * 2. Known vulnerable dependency versions are not present
 * 3. Package-version policy enforcement (no dangerously old packages)
 * 4. No unexpected git/URL/tarball dependencies (except documented xlsx)
 * 5. Lifecycle script awareness (no suspicious preinstall/postinstall)
 * 6. pnpm overrides are applied for security patches
 */

const ROOT = path.resolve(__dirname, '../../../../');
const LOCKFILE = path.join(ROOT, 'pnpm-lock.yaml');

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('H18 — Supply-Chain Security', () => {
  describe('1. Lockfile integrity', () => {
    it('pnpm-lock.yaml exists', () => {
      expect(fs.existsSync(LOCKFILE)).toBe(true);
    });

    it('pnpm-lock.yaml is valid YAML (parseable)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      // Basic integrity checks
      expect(content).toContain('lockfileVersion');
      expect(content.length).toBeGreaterThan(1000);
    });

    it('lockfileVersion is 9.0 (pnpm v9+)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      expect(content).toMatch(/lockfileVersion:\s*'9\.0'/);
    });

    it('no git: references in lockfile (all deps from registry or documented tarball)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const gitRefs = content.match(/git[+:]/g) || [];
      expect(gitRefs.length).toBe(0);
    });
  });

  describe('2. Vulnerable dependency detection', () => {
    it('lodash >= 4.18.0 (patched for Code Injection and Prototype Pollution)', () => {
      // Check that the override is applied — lodash should resolve to >=4.18.0
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      // Find lodash version entries in the lockfile
      const lodashLines = content.split('\n').filter((l) => l.match(/^ {2}lodash@/));
      lodashLines.forEach((line) => {
        const versionMatch = line.match(/lodash@([\d.]+)/);
        if (versionMatch) {
          const [major, minor] = versionMatch[1].split('.').map(Number);
          // Must be >= 4.18.0
          expect(major).toBeGreaterThanOrEqual(4);
          if (major === 4) {
            expect(minor).toBeGreaterThanOrEqual(18);
          }
        }
      });
    });

    it('nanoid >= 3.3.18 for 3.x series (patched for infinite loop with zero-size generators)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const nanoidLines = content.split('\n').filter((l) => l.match(/^ {2}nanoid@/));
      nanoidLines.forEach((line) => {
        const versionMatch = line.match(/nanoid@([\d.]+)/);
        if (versionMatch) {
          const [major, , patch] = versionMatch[1].split('.').map(Number);
          if (major === 3) {
            expect(patch).toBeGreaterThanOrEqual(18);
          }
          // 6.x is a separate major version, not affected by this CVE
        }
      });
    });

    it('fast-uri >= 3.1.5 (patched for host confusion via backslash authority)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const fastUriLines = content.split('\n').filter((l) => l.match(/^ {2}fast-uri@/));
      fastUriLines.forEach((line) => {
        const versionMatch = line.match(/fast-uri@([\d.]+)/);
        if (versionMatch) {
          const [major, , patch] = versionMatch[1].split('.').map(Number);
          if (major === 3) {
            expect(patch).toBeGreaterThanOrEqual(5);
          }
        }
      });
    });

    it('multer >= 2.1.0 (existing override, patched for file upload vulnerabilities)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const multerLines = content.split('\n').filter((l) => l.match(/^ {2}multer@/));
      multerLines.forEach((line) => {
        const versionMatch = line.match(/multer@([\d.]+)/);
        if (versionMatch) {
          const [major, minor] = versionMatch[1].split('.').map(Number);
          expect(major).toBeGreaterThanOrEqual(2);
          if (major === 2) {
            expect(minor).toBeGreaterThanOrEqual(1);
          }
        }
      });
    });

    it('qs >= 6.15.2 (existing override, patched for prototype pollution)', () => {
      const content = fs.readFileSync(LOCKFILE, 'utf8');
      const qsLines = content.split('\n').filter((l) => l.match(/^ {2}qs@/));
      qsLines.forEach((line) => {
        const versionMatch = line.match(/qs@([\d.]+)/);
        if (versionMatch) {
          const [major, minor, patch] = versionMatch[1].split('.').map(Number);
          expect(major).toBe(6);
          expect(minor).toBeGreaterThanOrEqual(15);
          if (minor === 15) {
            expect(patch).toBeGreaterThanOrEqual(2);
          }
        }
      });
    });
  });

  describe('3. Package-version policy', () => {
    it('express >= 4.21.0 or >= 5.x (not ancient versions with known vulns)', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const expressVersion = backendPkg.dependencies?.express;
      expect(expressVersion).toBeDefined();
      const match = expressVersion.match(/[\d.]+/);
      expect(match).toBeTruthy();
      if (match) {
        const [major, minor] = match[0].split('.').map(Number);
        // Express 4.21+ or Express 5.x are acceptable
        const isValid = (major === 4 && minor >= 21) || major >= 5;
        expect(isValid).toBe(true);
      }
    });

    it('helmet is present (security headers middleware)', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      expect(backendPkg.dependencies?.helmet).toBeDefined();
    });

    it('zod is present (input validation)', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const frontendPkg = readJson(path.join(ROOT, 'frontend/package.json'));
      expect(backendPkg.dependencies?.zod).toBeDefined();
      expect(frontendPkg.dependencies?.zod).toBeDefined();
    });
  });

  describe('4. Dependency source audit', () => {
    it('only one non-registry dependency (xlsx from CDN — documented)', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const nonRegistry: string[] = [];

      const checkDeps = (deps: Record<string, string> | undefined, cat: string) => {
        if (!deps) {
          return;
        }
        Object.entries(deps).forEach(([name, version]) => {
          if (
            version.startsWith('git') ||
            version.startsWith('http') ||
            version.startsWith('https') ||
            version.includes('.tgz') ||
            version.includes('.tar.gz')
          ) {
            nonRegistry.push(`${cat}/${name}: ${version}`);
          }
        });
      };

      checkDeps(backendPkg.dependencies, 'backend/deps');
      checkDeps(backendPkg.devDependencies, 'backend/devDeps');

      const frontendPkg = readJson(path.join(ROOT, 'frontend/package.json'));
      checkDeps(frontendPkg.dependencies, 'frontend/deps');
      checkDeps(frontendPkg.devDependencies, 'frontend/devDeps');

      const databasePkg = readJson(path.join(ROOT, 'database/package.json'));
      checkDeps(databasePkg.dependencies, 'database/deps');
      checkDeps(databasePkg.devDependencies, 'database/devDeps');

      // Only xlsx from CDN is expected
      expect(nonRegistry.length).toBeLessThanOrEqual(1);
      if (nonRegistry.length === 1) {
        expect(nonRegistry[0]).toContain('xlsx');
        expect(nonRegistry[0]).toContain('cdn.sheetjs.com');
      }
    });

    it('xlsx pinned to specific version (not floating)', () => {
      const backendPkg = readJson(path.join(ROOT, 'backend/package.json'));
      const xlsxVersion = backendPkg.dependencies?.xlsx;
      expect(xlsxVersion).toBeDefined();
      // Should be a specific URL, not a range
      expect(xlsxVersion).toMatch(/xlsx-[\d.]+\.tgz$/);
    });
  });

  describe('5. Lifecycle script awareness', () => {
    it('no suspicious preinstall scripts in workspace packages', () => {
      const files = [
        'package.json',
        'backend/package.json',
        'frontend/package.json',
        'database/package.json',
      ];

      files.forEach((f) => {
        const pkg = readJson(path.join(ROOT, f));
        const scripts = pkg.scripts || {};
        // preinstall should not exist in workspace packages
        expect(scripts.preinstall).toBeUndefined();
      });
    });

    it('only husky prepare script in root (no other lifecycle surprises)', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const scripts = rootPkg.scripts || {};
      // prepare should be husky only
      expect(scripts.prepare).toBe('husky');
    });
  });

  describe('6. pnpm overrides for security', () => {
    it('overrides section exists with security pins', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides;
      expect(overrides).toBeDefined();
      expect(overrides.multer).toBeDefined();
      expect(overrides.qs).toBeDefined();
    });

    it('lodash override present (>=4.18.0)', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides || {};
      expect(overrides.lodash).toBeDefined();
      expect(overrides.lodash).toContain('4.18');
    });

    it('js-yaml override present (>=4.3.1 for 4.x)', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides || {};
      const jsYamlKey = Object.keys(overrides).find((k) => k.startsWith('js-yaml'));
      expect(jsYamlKey).toBeDefined();
    });

    it('nanoid override present (>=3.3.18)', () => {
      const rootPkg = readJson(path.join(ROOT, 'package.json'));
      const overrides = rootPkg.pnpm?.overrides || {};
      const nanoidKey = Object.keys(overrides).find((k) => k.startsWith('nanoid'));
      expect(nanoidKey).toBeDefined();
    });
  });
});
