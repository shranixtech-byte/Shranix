# H22 — Staging Readiness & Production Gap Register

**Date:** 2026-08-22 · **Baseline:** H21 = d63ba6a · **Status:** COMPLETE

---

## 1. Architecture

| Component       | Technology            | Dev (Local)   | Staging            | Production         |
| --------------- | --------------------- | ------------- | ------------------ | ------------------ |
| Backend runtime | NestJS 11 + Express 5 | ✅ Running    | ❌ Not provisioned | ❌ Not provisioned |
| Frontend        | React 19 + Vite 6     | ✅ Running    | ❌ Not provisioned | ❌ Not provisioned |
| Database        | SQLite / PostgreSQL   | SQLite ✅     | PostgreSQL ❌      | PostgreSQL ❌      |
| Cache           | Redis (optional)      | Not used      | ❌ Not provisioned | ❌ Not provisioned |
| Object storage  | Local / MinIO/S3      | Local ✅      | MinIO ❌           | S3/MinIO ❌        |
| Desktop shell   | Tauri                 | Buildable ✅  | N/A                | ❌ Not validated   |
| CI/CD           | GitHub Actions        | Configured ✅ | Partial            | ❌ Not deployed    |
| Monitoring      | Structured logs       | ✅ Available  | ❌ Not connected   | Sentry ❌          |

---

## 2. Environment Matrix

### Variables Required for Staging

| Variable           | Dev Value          | Staging Template | Status           |
| ------------------ | ------------------ | ---------------- | ---------------- |
| NODE_ENV           | development        | staging          | READY (template) |
| DATABASE_PROVIDER  | sqlite             | postgresql       | EXTERNAL         |
| DATABASE_URL       | file:./data/dev.db | postgresql://... | EXTERNAL         |
| JWT_SECRET         | dev-secret         | PLACEHOLDER      | EXTERNAL         |
| JWT_REFRESH_SECRET | dev-refresh        | PLACEHOLDER      | EXTERNAL         |
| CORS_ORIGINS       | localhost          | staging domain   | EXTERNAL         |
| APP_URL            | localhost:4001     | staging API URL  | EXTERNAL         |
| REDIS_URL          | N/A                | redis://...      | OPTIONAL         |
| STORAGE_ADAPTER    | local              | minio/s3         | EXTERNAL         |
| SMTP_HOST          | N/A                | smtp staging     | EXTERNAL         |
| RAZORPAY_KEY_ID    | N/A                | test key         | EXTERNAL         |
| SENTRY_DSN         | N/A                | staging DSN      | EXTERNAL         |

---

## 3. Staging Prerequisites

### Must Be Provisioned Before Staging Deployment

| Prerequisite                    | Owner   | Priority | Status             |
| ------------------------------- | ------- | -------- | ------------------ |
| Linux server (Ubuntu 22.04+)    | DevOps  | Critical | ❌ NOT PROVISIONED |
| PostgreSQL 15+ database         | DevOps  | Critical | ❌ NOT PROVISIONED |
| TLS certificate (Let's Encrypt) | DevOps  | Critical | ❌ NOT PROVISIONED |
| DNS records (staging domain)    | DevOps  | Critical | ❌ NOT PROVISIONED |
| Node.js 20+ runtime             | DevOps  | Critical | ❌ NOT PROVISIONED |
| pnpm 9+ package manager         | DevOps  | Critical | ❌ NOT PROVISIONED |
| Nginx/Caddy reverse proxy       | DevOps  | Critical | ❌ NOT PROVISIONED |
| MinIO/S3 object storage         | DevOps  | High     | ❌ NOT PROVISIONED |
| SMTP server/credentials         | DevOps  | High     | ❌ NOT PROVISIONED |
| Sentry project + DSN            | DevOps  | Medium   | ❌ NOT PROVISIONED |
| Razorpay test credentials       | Finance | High     | ❌ NOT PROVISIONED |
| Redis (optional)                | DevOps  | Low      | ❌ NOT PROVISIONED |

---

## 4. Database Status

| Check                    | Status      | Notes                                         |
| ------------------------ | ----------- | --------------------------------------------- |
| SQLite dev               | ✅ PASS     | Working locally                               |
| PostgreSQL production    | EXTERNAL    | Requires provisioned instance                 |
| Drizzle ORM              | ✅ PASS     | v0.45.2, compatible                           |
| Drizzle Kit              | ✅ PASS     | v0.31.10, zero vulns                          |
| Migration chain          | ✅ PASS     | 28 migrations (0000-0027), journal v7         |
| Schema generation        | ✅ PASS     | `db:generate` works                           |
| SQLite-only paths        | ⚠️ AUDIT    | Some code uses `getRawClient()` (SQLite-only) |
| PostgreSQL compatibility | ⚠️ UNTESTED | Requires real PG instance                     |

### SQLite-Only Code Paths (Potential Issues)

The reconciliation service uses `getRawClient()` which is SQLite-specific. PostgreSQL production would need this path verified or adapted.

---

## 5. Redis / Distributed Locking

| Check                  | Status          | Notes                              |
| ---------------------- | --------------- | ---------------------------------- |
| H5 distributed lock    | ✅ Implemented  | `shranix_job_locks` table          |
| SQLite concurrency     | ✅ Tested       | Single-process only                |
| PostgreSQL concurrency | EXTERNAL        | Requires real PG instance          |
| Redis integration      | NOT IMPLEMENTED | Optional, documented as future     |
| Multi-replica behavior | NOT TESTED      | Requires staging with 2+ instances |

**Status:** PARTIAL — Lock mechanism exists but requires PostgreSQL for production-grade concurrency.

---

## 6. TLS / Domain / CORS

| Check              | Status          | Notes                         |
| ------------------ | --------------- | ----------------------------- |
| TLS termination    | EXTERNAL        | Requires reverse proxy + cert |
| CORS configuration | ✅ Configurable | Via `CORS_ORIGINS` env var    |
| CSRF protection    | ✅ Implemented  | Cookie + header verification  |
| Secure cookies     | ✅ Configured   | httpOnly, sameSite            |
| HSTS headers       | ✅ Via Helmet   | `Strict-Transport-Security`   |
| Request ID         | ✅ Implemented  | `RequestIdMiddleware`         |

**Status:** BLOCKED — TLS requires infrastructure provisioning.

---

## 7. Object Storage

| Check                  | Status            | Notes                         |
| ---------------------- | ----------------- | ----------------------------- |
| Local storage adapter  | ✅ Working        | `STORAGE_ADAPTER=local`       |
| MinIO adapter          | ✅ Code exists    | Requires MinIO instance       |
| S3 adapter             | ✅ Code exists    | Requires AWS/compatible S3    |
| Path traversal defense | ✅ Implemented    | H9 `assertWithinBase()`       |
| Signed URLs            | ⚠️ Partial        | Token-based release downloads |
| Retention policy       | ⚠️ Not configured | Requires storage lifecycle    |

**Status:** BLOCKED — Requires MinIO/S3 provisioning.

---

## 8. Payment Sandbox

| Check                 | Status         | Notes                  |
| --------------------- | -------------- | ---------------------- |
| Razorpay integration  | ✅ Implemented | HMAC + idempotency     |
| Test mode             | ✅ Supported   | `rzp_test_*` keys      |
| Webhook verification  | ✅ Verified    | `timingSafeEqual`      |
| Duplicate protection  | ✅ Implemented | PROCESSING guard       |
| Transaction atomicity | ✅ Implemented | `executeInTransaction` |
| Sandbox credentials   | EXTERNAL       | Not provisioned        |

**Status:** EXTERNAL DEPENDENCY — Requires Razorpay test account.

---

## 9. Monitoring / Alerting

| Check                  | Status          | Notes                         |
| ---------------------- | --------------- | ----------------------------- |
| Structured logging     | ✅ Working      | `nestjs-pino` JSON            |
| Request ID correlation | ✅ Working      | `RequestIdMiddleware`         |
| Error IDs              | ✅ Working      | `GlobalExceptionFilter`       |
| Security audit events  | ✅ Working      | `AuditService` 19 event types |
| Sentry integration     | EXTERNAL        | Not connected                 |
| Prometheus metrics     | NOT IMPLEMENTED | Requires configuration        |
| Alerting rules         | DOCUMENTED      | In H21 production readiness   |

**Status:** PARTIAL — Application logging is production-ready; external monitoring not connected.

---

## 10. Real Load Test

| Check                | Status            | Notes                           |
| -------------------- | ----------------- | ------------------------------- |
| Local smoke test     | ✅ Script created | `tests/load/smoke-load-test.ts` |
| Staging load test    | NOT RUN           | Requires staging server         |
| k6/Artillery         | NOT INSTALLED     | External dependency             |
| Production load test | NOT RUN           | Requires production environment |

**Status:** EXTERNAL DEPENDENCY — Requires staging infrastructure + load testing tools.

---

## 11. Backup / Restore

| Check               | Status         | Notes                             |
| ------------------- | -------------- | --------------------------------- |
| Backup script       | ✅ Exists      | `scripts/backup.sh`               |
| SQLite backup       | ✅ Verified    | File copy works                   |
| PostgreSQL backup   | NOT TESTED     | Requires PG instance              |
| Restore procedure   | ✅ Documented  | `docs/runbooks/backup-restore.md` |
| Integrity checks    | ✅ Implemented | Schema verification               |
| RPO/RTO measurement | NOT MEASURED   | Requires real DB                  |

**Status:** PARTIAL — Local backup verified; PostgreSQL backup requires staging.

---

## 12. Browser E2E

| Check             | Status          | Notes                                        |
| ----------------- | --------------- | -------------------------------------------- |
| Playwright config | ✅ Exists       | `tests/playwright/config.ts`                 |
| Browser E2E tests | ❌ None written | Requires staging server                      |
| API-level E2E     | ✅ 26 tests     | `backend/test/h21-critical-journeys.spec.ts` |

**Status:** BLOCKED — Requires staging server + browser environment.

---

## 13. Clean-Windows Validation

| Check               | Status      | Notes                     |
| ------------------- | ----------- | ------------------------- |
| Tauri config        | ✅ Present  | Desktop shell configured  |
| Backend buildable   | ✅ Verified | `nest build` passes       |
| Frontend buildable  | ✅ Verified | Vite build passes         |
| Installer scripts   | ✅ Present  | `installer/` directory    |
| Actual Windows test | NOT RUN     | Requires clean Windows VM |

**Status:** EXTERNAL DEPENDENCY — Requires Windows environment.

---

## 14. Security Regression

| Suite                | Tests   | Result            |
| -------------------- | ------- | ----------------- |
| H13 rate-limit       | 53      | ✅ ALL PASSED     |
| H14 security-headers | 77      | ✅ ALL PASSED     |
| H15 input-validation | 75      | ✅ ALL PASSED     |
| H16 auth-security    | 70      | ✅ ALL PASSED     |
| H17 audit-security   | 81      | ✅ ALL PASSED     |
| H18 supply-chain     | 20      | ✅ ALL PASSED     |
| H19 enforcement      | 19      | ✅ ALL PASSED     |
| H20 modernization    | 20      | ✅ ALL PASSED     |
| **Total**            | **415** | **✅ ALL PASSED** |

---

## 15. Remaining Blockers

| #   | Blocker                             | Severity | Effort   |
| --- | ----------------------------------- | -------- | -------- |
| 1   | Provision staging server            | Critical | 1-2 days |
| 2   | Provision PostgreSQL database       | Critical | 1 day    |
| 3   | Configure TLS + DNS                 | Critical | 1 day    |
| 4   | Configure Nginx reverse proxy       | Critical | 0.5 day  |
| 5   | Provision MinIO/S3 storage          | High     | 0.5 day  |
| 6   | Configure SMTP                      | High     | 0.5 day  |
| 7   | Get Razorpay test credentials       | High     | 0.5 day  |
| 8   | Deploy Sentry project               | Medium   | 0.5 day  |
| 9   | Run real load tests                 | High     | 1 day    |
| 10  | Run PostgreSQL backup/restore drill | High     | 0.5 day  |
| 11  | Run browser E2E tests               | Medium   | 1 day    |
| 12  | Validate on clean Windows           | Medium   | 1 day    |

**Total estimated effort:** 8-10 days (with infrastructure access)

---

## 16. Recommended Production Sequence

### Phase 1: Infrastructure Provisioning (Days 1-3)

1. Provision staging Linux server
2. Install Node.js 20+, pnpm 9+
3. Provision PostgreSQL 15+
4. Configure TLS via Let's Encrypt
5. Set up Nginx reverse proxy
6. Deploy application to staging

### Phase 2: Configuration (Days 4-5)

1. Configure all environment variables
2. Run database migrations
3. Configure MinIO/S3 storage
4. Configure SMTP
5. Get Razorpay test credentials
6. Deploy Sentry

### Phase 3: Validation (Days 6-8)

1. Run full test suite against staging
2. Run database migration on PostgreSQL
3. Run backup/restore drill
4. Run load tests (k6/Artillery)
5. Run browser E2E tests
6. Validate monitoring/alerting

### Phase 4: Hardening (Days 9-10)

1. Run clean-Windows installer test
2. Performance tuning
3. Security audit against staging
4. Final production readiness review

---

## 17. Production Readiness Verdict

**Current: ENGINEERING READY / STAGING NOT PROVISIONED**

| Dimension          | Score | Evidence                                        |
| ------------------ | ----- | ----------------------------------------------- |
| Code quality       | 95%   | 1180+ tests, 0 lint errors, clean typecheck     |
| Security           | 100%  | 0 vulnerabilities, H13-H20 all pass             |
| Supply chain       | 100%  | Dependabot, SBOM, zero vulns, policy documented |
| Infrastructure     | 0%    | No staging/production servers provisioned       |
| Database           | 10%   | SQLite works; PostgreSQL untested               |
| Monitoring         | 30%   | Structured logs ready; no external monitoring   |
| Load testing       | 5%    | Script exists; no real load test run            |
| Backup/restore     | 20%   | Local verified; PostgreSQL untested             |
| Browser E2E        | 0%    | No browser tests written                        |
| Desktop validation | 5%    | Buildable; no Windows validation                |

**Overall staging readiness: ~15%** (code ready, infrastructure not provisioned)

**To reach STAGING READY:** Provision infrastructure (server, PostgreSQL, TLS) and run validation tests.

---

_H22 Staging Readiness Gap Register. Code complete; infrastructure pending._
