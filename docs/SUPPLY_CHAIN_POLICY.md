# Supply-Chain Security Policy

**Version:** 2.0 · **Effective:** 2026-08-22 · **Owner:** Engineering
**Changelog:** v2.0 — Added SBOM, Dependabot, structured audit, NestJS 11, drizzle-kit 0.31

---

## 1. Purpose

This policy establishes requirements for dependency management, vulnerability handling, and supply-chain integrity for the Shranix Krushi ERP project.

## 2. Allowed Dependency Sources

| Source                         | Policy                         | Example                            |
| ------------------------------ | ------------------------------ | ---------------------------------- |
| **npm registry**               | ✅ Allowed (preferred)         | `express@^4.22.1`                  |
| **workspace**                  | ✅ Allowed                     | `@shranix/database: workspace:*`   |
| **CDN tarball (documented)**   | ⚠️ Allowed with documentation  | `xlsx@https://cdn.sheetjs.com/...` |
| **Git repository**             | ❌ Prohibited without approval | `github:user/repo`                 |
| **Local path**                 | ⚠️ Workspace links only        | N/A                                |
| **URL tarball (undocumented)** | ❌ Prohibited                  | Any undocumented `.tgz` URL        |

### Current Non-Registry Dependencies

| Package | Source                                                | Reason                                                         | Approved      |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| xlsx    | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` | Official SheetJS CDN distribution (npm package was deprecated) | ✅ Documented |

## 3. Version Pinning Policy

- **Direct dependencies:** Use caret ranges (`^x.y.z`) in package.json
- **Transitive dependency overrides:** Use `pnpm.overrides` for security patches
- **Lockfile:** `pnpm-lock.yaml` must be committed and enforced via `--frozen-lockfile` in CI
- **Non-registry deps:** Pin to exact URL (no floating ranges)

## 4. Vulnerability Management

### Severity Classification

| Severity     | Action                                                       | Timeline      |
| ------------ | ------------------------------------------------------------ | ------------- |
| **Critical** | Fix immediately or document accepted risk with justification | Same sprint   |
| **High**     | Fix within 1 week or document accepted risk                  | Within 1 week |
| **Moderate** | Fix in next scheduled maintenance                            | Next quarter  |
| **Low**      | Document and track                                           | Best effort   |

### Accepted Risks (as of H20)

**As of H20, zero critical/high vulnerabilities remain.** All previously accepted risks have been resolved:

- NestJS upgraded 10→11 (resolved @nestjs/core, body-parser, file-type)
- Express upgraded 4→5 (resolved body-parser)
- drizzle-kit upgraded 0.28→0.31 (resolved esbuild)
- esbuild override added (resolved remaining esbuild vuln)

No production or development vulnerabilities currently accepted.
| file-type | 20.4.1 | Moderate | Transitive from @nestjs/common | 2026-Q4 |
| esbuild | 0.18/0.19 | Moderate | Dev-only via drizzle-kit | 2026-Q4 |
| webpack | 5.97.1 | Low | Dev-only via @nestjs/cli (partially resolved) | 2026-Q4 |

## 5. Lockfile Integrity

- `pnpm-lock.yaml` must be committed to version control
- CI must use `--frozen-lockfile` to prevent silent regeneration
- Lockfile changes must be reviewed in pull requests
- No `git:` or undocumented `http:` references allowed in lockfile

## 6. Install Script Policy

- Lifecycle scripts (`preinstall`, `postinstall`, `prepare`) are reviewed during dependency onboarding
- Suspicious install scripts require security review before approval
- Known safe scripts: `husky` (prepare), `node-gyp` (native builds), `tsc` (TypeScript compilation)

## 7. CI Enforcement

The following checks run automatically in CI:

| Check                                  | Gate             | Fails On                                        |
| -------------------------------------- | ---------------- | ----------------------------------------------- |
| `pnpm install --frozen-lockfile`       | Every build      | Lockfile inconsistency                          |
| `pnpm audit --audit-level=high --prod` | Security job     | Critical/high production vulns                  |
| `scripts/ci-supply-chain-audit.sh`     | Supply-chain job | Lockfile integrity, XLSX pinning, audit results |
| Gitleaks secret scan                   | Security job     | Detected secrets                                |

## 8. License Compliance

### Allowed Licenses

- MIT
- Apache-2.0
- ISC
- BSD-2-Clause
- BSD-3-Clause
- CC0-1.0
- 0BSD
- Unlicense

### Restricted Licenses (Require Review)

- GPL-2.0, GPL-3.0
- AGPL-3.0
- LGPL-2.1, LGPL-3.0
- MPL-2.0 (case-by-case)

### Unknown/ Missing Licenses

Must be investigated before production deployment.

## 9. Dependency Update Process

1. **Security updates** (patch/minor): Apply via `pnpm update` with lockfile commit
2. **Major upgrades**: Require PR with test verification and changelog review
3. **New dependencies**: Require security review (license, install scripts, maintenance status)
4. **Removals**: Verify no imports remain, update lockfile

## 10. SBOM (Software Bill of Materials)

- SBOM generated via `scripts/generate-sbom.sh` (CycloneDX 1.5 JSON)
- Generated as CI artifact on every build
- Represents actual installed dependency graph from lockfile
- Used for compliance, vulnerability tracking, and license audits

## 11. Automated Dependency Updates

- **Dependabot** configured for weekly updates (`.github/dependabot.yml`)
- Minor/patch updates grouped by ecosystem (NestJS, Vitest, Radix UI)
- Major upgrades require manual review and PR approval
- Security updates prioritized with shorter cadence
- Lockfile updates must be reviewed through PRs

## 12. Structured Audit

- `scripts/ci-structured-audit.sh` produces machine-readable JSON reports
- Reports include severity classification, policy verdict, and vulnerability details
- CI integration: FAIL on critical/high, WARN on moderate, INFO on low
- Reports stored as CI artifacts for historical tracking

## 13. Monitoring

- Weekly `pnpm audit` via CI quality gates
- Monthly dependency freshness review
- Quarterly supply-chain policy review
- Automated Dependabot PRs for routine updates

---

_This policy was established as part of H19 security hardening, updated in H20._
