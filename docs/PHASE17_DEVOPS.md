# SHRANIX Krushi ERP — Phase 17: Production Deployment, DevOps & Go-Live

**Status:** A. Engineering Complete ✅ · B. Staging Ready ✅ · C. Production Infrastructure Ready ⚠️ (documented) · D/E. Production Ready ❌ (external infra required)

---

## 1. Complete Production Audit (17.1)

| Area                                  | Status         | Notes                                                                                             |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Backend (NestJS 10, 88 repos)         | ✅ IMPLEMENTED | auth, RBAC, customer isolation, commercial, license, activation, security, releases, central KPIs |
| Frontend (React/Vite/PWA)             | ✅ IMPLEMENTED | 130 tests green (fixed 3 in 17.29)                                                                |
| Database (SQLite/PG, drizzle)         | ✅ IMPLEMENTED | 27 migrations, unique indexes, FKs                                                                |
| Migrations                            | ✅ IMPLEMENTED | drizzle-kit workflow; 0025/0026 applied to dev DB                                                 |
| Authentication/Authorization          | ✅ IMPLEMENTED | JWT + refresh, RolesGuard, PermissionsGuard, CSRF                                                 |
| Customer isolation                    | ✅ IMPLEMENTED | customerId-scoped everywhere + portal assertOwned (404)                                           |
| Commercial/Billing/License/Activation | ✅ IMPLEMENTED | Phases 12–15, 433 backend tests                                                                   |
| Security events                       | ✅ IMPLEMENTED | Phase 15 engine + dashboard API                                                                   |
| Release management                    | ✅ IMPLEMENTED | Phase 16 registry + download tokens                                                               |
| Background jobs/schedulers            | ✅ IMPLEMENTED | license/commercial schedulers, backup service                                                     |
| Logging                               | ✅ IMPLEMENTED | pino structured; **requestId + errorId added (17.23/17.25)**                                      |
| Environment config                    | ✅ IMPLEMENTED | **zod fail-fast validation + env separation (17.2/17.3)**                                         |
| Build config                          | ✅ IMPLEMENTED | turbo, Docker multi-stage                                                                         |
| Deployment config                     | ✅ IMPLEMENTED | docker-compose, nginx, CI/CD workflows                                                            |
| Health checks                         | ✅ IMPLEMENTED | /health, /health/live, /health/ready, /health/metrics, **/health/status (17.42)**                 |
| Rate limiting                         | ✅ IMPLEMENTED | Throttler + **behind-proxy guard (17.26)**                                                        |
| Tests                                 | ✅ IMPLEMENTED | 433 backend + 130 frontend green                                                                  |
| **PRODUCTION RISK**                   | ⚠️             | no real cert/HSM/CDN/DNS — external dependency                                                    |
| **EXTERNAL DEPENDENCY**               | ⚠️             | signing cert, object storage/CDN, TLS cert, production DB host                                    |
| **TECHNICAL DEBT**                    | ⚠️             | dev-tooling audit findings (see §7), KPI caching is TTL-only                                      |

## 2. Frontend Test Failures — Resolved (17.29)

**Root cause found & fixed:** the 3 `krushi-bill-template` failures were **not pre-existing
environment noise — they were a real regression**. Commit `5d44506` (Phase 14 rewrite) dropped
the `<div class="{{badgeClass}}">{{copyLabel}}</div>` badge line from `COPY_TEMPLATE`, so
OFFICE/CUSTOMER/TRANSPORT COPY labels never rendered. Restored the badge markup.

**Result:** frontend **130/130 tests pass** (previously 127/130).

## 3. Environment Separation (17.2) + Config Validation (17.3)

- `backend/src/config/env.validation.ts` — zod schema, now **wired into ConfigModule via `validate`**
  (fail-fast on boot). Covers: DATABASE, AUTH/JWT, LICENSE SIGNING, PAYMENT, STORAGE, EMAIL,
  MONITORING, RATE LIMITING, CORS, SWAGGER.
- **Production guards:** `NODE_ENV=production|staging` rejects default/placeholder secrets
  (`dev-secret-change-in-production`, `change_me`, `shranix123`, …) for JWT_SECRET,
  JWT_REFRESH_SECRET, PAYMENT_WEBHOOK_SECRET, PAYMENT_KEY_SECRET, MINIO_SECRET_KEY, SMTP_PASS.
- **Env-file separation:** ConfigModule loads `.env.development` / `.env.staging` /
  `.env.production` based on NODE_ENV — staging can never read production values from a shared file.
- Templates: `deployment/.env.production.template` (rewritten, all categories),
  `deployment/.env.staging.template` (new).
- Tests: `backend/src/config/env.validation.test.ts` (6 tests).

## 4. Observability (17.21/17.23/17.25/17.42)

- **Request ID / correlation ID:** `RequestIdMiddleware` generates/echoes `x-request-id`
  (128-char cap), surfaces in logs + error responses.
- **Error ID:** `GlobalExceptionFilter` adds an opaque `errorId` to 5xx responses and logs
  `[requestId=… errorId=…]` — support can correlate a customer report to server logs.
- **Logging:** `LoggingInterceptor` includes `[requestId=…]`; pino serializers already mask
  sensitive headers. Never logs tokens/passwords (17.23).
- **Status page:** `GET /health/status` (customer-safe aggregate, no infra details) +
  `deployment/status-page/index.html` (17.42).
- **Health endpoints:** liveness (/health/live) vs readiness (/health/ready) vs metrics
  (/health/metrics) — already separate; no secrets exposed.

## 5. Rate Limiting (17.26)

- Global Throttler guard now uses `ThrottlerBehindProxyGuard` — respects `X-Forwarded-For`
  so limits work across multiple instances behind nginx.
- nginx.conf has a `limit_req_zone` for /api (30 r/s per IP).

## 6. CI/CD + Secret Scanning + SAST (17.14/17.15/17.17)

- `.github/workflows/ci.yml` — new **`security` job**: gitleaks secret scan, repo secret scan
  (`scripts/secret-scan.sh --history`), `pnpm audit --audit-level=high --prod`, semgrep SAST.
  Docker build now depends on security passing.
- `scripts/secret-scan.sh` — dependency-free scanner (working tree + git history).
- `.gitleaks.toml` — allowlist for documented dev/test placeholders.
- Result: **no high-signal secrets in repo or git history.**

## 7. Dependency Audit (17.16)

Ran `pnpm audit`. **Fixed (production-relevant):**

| Package                               | Finding                                       | Fix                                                                                                                                                      |
| ------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| multer (via @nestjs/platform-express) | high DoS <2.1.0                               | pnpm override `>=2.1.0` → resolves 2.2.0                                                                                                                 |
| xlsx                                  | high prototype pollution + ReDoS (no npm fix) | upgraded to **0.20.3 from SheetJS CDN** (official fix)                                                                                                   |
| drizzle-orm                           | high SQL injection (identifiers) <0.45.2      | upgraded 0.36.4 → **0.45.2**; adapted unique-constraint error detection (`isUniqueConstraintError` helper in `@shranix/database`); full regression green |
| react-router-dom                      | high RSC CSRF 7.12–7.18.1                     | upgraded → **7.18.2**                                                                                                                                    |
| qs (via express)                      | moderate/high DoS                             | pnpm override `>=6.15.2`                                                                                                                                 |

**Accepted risks (documented, all dev/build-time or low exploitability):**

- **vitest 2.1.9 (critical advisory, dev-only)** — UI-server file-read requires `vitest --ui` in
  dev; CI uses `vitest run` headless. Upgrade to vitest 3.x is a staged task, not a prod blocker.
- @nestjs/cli transitive (glob, tmp, brace-expansion, picomatch, webpack) — build tooling only.
- vite 5 (dev server fs.deny) — dev-only.
- js-yaml/lodash via @nestjs/swagger/config — used on trusted decorator/config input, no
  attacker-controlled `_.template`.

## 8. Backup & Restore (17.6/17.7)

- PG: `scripts/backup.sh` (custom-format dump, verify, retention, restore) + cron wrapper.
- SQLite: in-app `BackupService` (VACUUM INTO + online ATTACH restore, hourly auto-backup).
- **Restore is NOT considered complete until tested** — monthly restore drill on staging
  verifying customers/subscriptions/billing/licenses/devices/activations/audit/security events
  (Runbooks 04/05).

## 9. Runbooks (17.41) — `docs/runbooks/`

All 13 created: 01-deployment, 02-rollback, 03-database-migration, 04-backup, 05-restore,
06-security-incident, 07-license-incident, 08-payment-incident, 09-release,
10-certificate-renewal, 11-key-rotation, 12-customer-recovery, 13-central-outage.

## 10. Production Readiness Levels (17.46)

| Level                              | Status | Evidence                                                       |
| ---------------------------------- | ------ | -------------------------------------------------------------- |
| A. Engineering Complete            | ✅     | 563 tests green, typecheck/lint/build clean, secret scan clean |
| B. Staging Ready                   | ✅     | migrations applied, env validation, runbooks, deploy workflow  |
| C. Production Infrastructure Ready | ⚠️     | configs+templates complete; **real infra not provisioned**     |
| D. Controlled Beta Ready           | ❌     | needs C + clean-machine + load + E2E staging runs              |
| E. Full Production Ready           | ❌     | needs real certs, HSM/KMS, CDN, DNS, production deployment     |

## 11. Exact Remaining Blockers (17.48 §26) — external environment required

1. **Production TLS certificate** + DNS (`api.shranix.in`, `portal.shranix.in`, `downloads.shranix.in`, `status.shranix.in`).
2. **Code-signing certificate** (Authenticode/Tauri) in HSM/KMS + timestamping service.
3. **License signing key** loaded into KMS/HSM or secure secret manager (interface ready).
4. **Object storage / CDN** for release packages (private bucket + signed URLs).
5. **Production PostgreSQL + Redis + MinIO** hosts, backups, replication.
6. **Clean Windows machine test** (installer, activation, update, uninstall — Phase 17.31).
7. **Load test on staging** (17.38) and **backup-restore drill** (17.39/17.40).
8. **Payment provider live credentials** + webhook verification end-to-end.
9. **CI SAST tool accounts** (gitleaks action works via GitHub token; semgrep API token for full scan).
10. **vitest 3.x upgrade** (staged, dev-only advisory).

## 12. Files Created/Modified

- `backend/src/config/env.validation.ts`, `config.module.ts` — env validation + separation
- `backend/src/common/middleware/request-id.middleware.ts` (+ test)
- `backend/src/filters/global-exception.filter.ts`, `interceptors/logging.interceptor.ts` — request/error IDs
- `backend/src/app.module.ts`, `guards/throttler-behind-proxy.guard.ts` — rate limiting behind proxy
- `backend/src/health/health.service.ts`, `health.controller.ts` — /health/status
- `database/src/utils/errors.helper.ts` — isUniqueConstraintError
- `backend/src/commercial/services/{coupons,plans,billing,billing-payments,subscriptions,reminders}.service.ts`, `assets/services/assets.service.ts`, `automation/gl-posting.engine.ts` — drizzle 0.45 compat
- `scripts/secret-scan.sh`, `.gitleaks.toml`, `.github/workflows/ci.yml`
- `frontend/src/pages/sales/krushi-bill-template.ts` — badge regression fix
- `deployment/.env.production.template` (rewritten), `deployment/.env.staging.template` (new), `deployment/status-page/index.html`
- `docs/runbooks/` (13 files), `docs/PHASE17_DEVOPS.md`
- `package.json` (pnpm overrides), `backend/package.json` (xlsx CDN), `database/package.json` (drizzle 0.45), frontend lockfile (react-router 7.18.2)

## 13. Test Results

| Suite            | Result                                               |
| ---------------- | ---------------------------------------------------- |
| Backend          | **433 passed** (47 files)                            |
| Frontend         | **130 passed** (13 files) — was 127, 3 fixed         |
| Typecheck        | backend + frontend + database clean                  |
| Lint             | 0 errors (import-order warnings only)                |
| Build            | backend + frontend (PWA) + database clean            |
| Secret scan      | clean (tree + git history)                           |
| Dependency audit | prod-relevant highs fixed; dev-only risks documented |
