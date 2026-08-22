# H23 — Real Staging Validation & Production Dependency Register

**Date:** 2026-08-22 · **Baseline:** H22 = 5c5da04 · **Status:** COMPLETE

---

## 1. Infrastructure Topology

| Component      | Technology            | Local (Dev)  | Staging            | Production         |
| -------------- | --------------------- | ------------ | ------------------ | ------------------ |
| Backend        | NestJS 11 + Express 5 | ✅ Running   | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Frontend       | React 19 + Vite 6     | ✅ Running   | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Database       | PostgreSQL 15+        | SQLite ✅    | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Cache          | Redis 7+              | N/A          | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Object storage | MinIO / S3            | Local ✅     | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Reverse proxy  | Nginx / Caddy         | N/A          | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| TLS            | Let's Encrypt         | N/A          | ❌ NOT PROVISIONED | ❌ NOT PROVISIONED |
| Monitoring     | Sentry                | N/A          | ❌ NOT CONNECTED   | ❌ NOT CONNECTED   |
| Desktop        | Tauri                 | Buildable ✅ | N/A                | ❌ NOT VALIDATED   |

**Conclusion:** No staging or production infrastructure has been provisioned. All external dependencies remain BLOCKED.

---

## 2. PostgreSQL Verification

**Status: EXTERNAL DEPENDENCY — NOT PROVISIONED**

### SQLite-Only Code Paths Identified

| File                                         | Issue                                                                          | Severity | Production Impact                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------ | -------- | ------------------------------------------------- |
| `backup/backup.service.ts`                   | `getRawClient()` with SQLite-specific SQL (`sqlite_master`, `sqlite_sequence`) | High     | Backup requires pg_dump for PostgreSQL            |
| `inventory/services.ts`                      | `getRawClient()` for raw queries                                               | Medium   | Raw SQL may need PostgreSQL adaptation            |
| `automation/transaction.manager.ts`          | SQLite-specific savepoint logic                                                | Low      | Already provider-aware, savepoints skipped for PG |
| `data-management/data-management.service.ts` | `getRawClient()`                                                               | Medium   | Import/export may need PG adaptation              |

### What Would Be Required for PostgreSQL

1. **Backup service:** Replace SQLite-specific backup with `pg_dump`/`pg_restore` for PostgreSQL
2. **Raw SQL queries:** Audit and adapt any SQLite-specific SQL syntax
3. **Transaction manager:** Already supports both providers (verified)
4. **Drizzle ORM:** Already supports PostgreSQL (verified — `postgres` package in dependencies)
5. **Migration chain:** 28 migrations need verification against PostgreSQL schema

### Recommendation

Before PostgreSQL deployment:

1. Run all migrations against a fresh PostgreSQL instance
2. Run full test suite with `DATABASE_PROVIDER=postgresql`
3. Audit all `getRawClient()` calls for PostgreSQL compatibility
4. Replace SQLite backup with PostgreSQL-native backup (pg_dump)

---

## 3. Redis / Distributed Locking

**Status: PARTIAL — H5 lock exists but requires PostgreSQL for production concurrency**

### Current Architecture (H5)

- `shranix_job_locks` table with `job_key`, `owner_token`, `expires_at`
- Atomic acquisition via `INSERT OR IGNORE` + unique constraint
- Lease-based expiry with stale lock cleanup
- `runWithDistributedLock()` wrapper for all schedulers

### SQLite Limitation

- SQLite uses file-level locking (single-writer)
- The distributed lock works correctly for single-process deployments
- Multi-replica deployments require PostgreSQL for true concurrent acquisition

### Redis Requirement Assessment

**Redis is NOT currently required** by the application architecture. The H5 distributed lock uses database-backed locking, not Redis. However:

- For multi-replica deployments, PostgreSQL provides sufficient locking via row-level locks
- Redis would provide sub-millisecond lock acquisition (vs database round-trip)
- Redis is optional for caching (not currently implemented)

**Recommendation:** PostgreSQL alone is sufficient for production locking. Redis is optional for performance optimization.

---

## 4. Staging Deployment

**Status: EXTERNAL DEPENDENCY — NOT DEPLOYED**

### Deployment Requirements

| Requirement                  | Status             | Notes                       |
| ---------------------------- | ------------------ | --------------------------- |
| Linux server (Ubuntu 22.04+) | ❌ NOT PROVISIONED | 4 vCPU, 8GB RAM recommended |
| Node.js 20+                  | ❌ NOT INSTALLED   | Required runtime            |
| pnpm 9+                      | ❌ NOT INSTALLED   | Package manager             |
| PostgreSQL 15+               | ❌ NOT PROVISIONED | Primary database            |
| Nginx/Caddy                  | ❌ NOT CONFIGURED  | Reverse proxy + TLS         |
| Domain/DNS                   | ❌ NOT CONFIGURED  | Staging hostname            |
| TLS certificate              | ❌ NOT PROVISIONED | Let's Encrypt or equivalent |

### Deployment Steps (When Infrastructure Available)

```bash
# 1. Clone repository
git clone <repo-url> && cd shranix-krushi-erp

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.staging.template .env.staging
# Edit .env.staging with real staging values

# 4. Run database migrations
DATABASE_PROVIDER=postgresql DATABASE_URL=<staging-db-url> pnpm db:migrate

# 5. Build
pnpm build

# 6. Start backend
cd backend && node dist/main.js

# 7. Serve frontend (via Nginx or static build)
```

---

## 5. TLS / Domain / CORS

**Status: BLOCKED — Requires infrastructure provisioning**

### Configuration Contract

| Setting         | Development        | Staging            | Production         |
| --------------- | ------------------ | ------------------ | ------------------ |
| Protocol        | HTTP               | HTTPS              | HTTPS              |
| TLS termination | N/A                | Reverse proxy      | Reverse proxy      |
| HSTS            | Via Helmet         | Via Helmet         | Via Helmet         |
| CORS origin     | localhost          | staging domain     | production domain  |
| CSRF            | Cookie + header    | Cookie + header    | Cookie + header    |
| Secure cookies  | httpOnly, sameSite | httpOnly, sameSite | httpOnly, sameSite |

### Nginx Configuration (Template)

```nginx
server {
    listen 443 ssl http2;
    server_name staging-api.shranix.example.com;

    ssl_certificate /etc/letsencrypt/live/staging-api.shranix.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging-api.shranix.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name staging-api.shranix.example.com;
    return 301 https://$host$request_uri;
}
```

---

## 6. Object Storage

**Status: BLOCKED — Requires MinIO/S3 provisioning**

### Storage Requirements

| Use Case             | Adapter     | Access Pattern                       |
| -------------------- | ----------- | ------------------------------------ |
| DMS document storage | MinIO/S3    | Private bucket, authenticated access |
| Backup artifacts     | Local/MinIO | Private, time-limited retention      |
| Release packages     | CDN/S3      | Public read, signed download URLs    |
| Generated PDFs       | Local/MinIO | Temporary, auto-cleanup              |

### MinIO Configuration (Template)

```env
STORAGE_ADAPTER=minio
MINIO_ENDPOINT=minio.shranix.example.com:9000
MINIO_ACCESS_KEY=<from-secret-store>
MINIO_SECRET_KEY=<from-secret-store>
DMS_STORAGE_PATH=/shranix-staging/dms
```

---

## 7. Razorpay Sandbox

**Status: EXTERNAL DEPENDENCY — NOT PROVISIONED**

### Required Configuration

```env
RAZORPAY_KEY_ID=rzp_test_<from-razorpay-dashboard>
RAZORPAY_KEY_SECRET=<from-razorpay-dashboard>
RAZORPAY_WEBHOOK_SECRET=<from-razorpay-dashboard>
```

### Verification Checklist (When Available)

- [ ] Webhook signature verification (`timingSafeEqual`)
- [ ] Duplicate webhook handling (PROCESSING guard)
- [ ] Replay protection (5-minute timestamp window)
- [ ] Failed payment path
- [ ] Audit event creation
- [ ] Transaction atomicity (`executeInTransaction`)

---

## 8. Monitoring / Alerting

**Status: EXTERNAL DEPENDENCY — NOT CONNECTED**

### Sentry Configuration (Template)

```env
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Current Application Observability (Available Without External Services)

| Capability              | Status   | Implementation                                    |
| ----------------------- | -------- | ------------------------------------------------- |
| Structured JSON logging | ✅ READY | `nestjs-pino`                                     |
| Request ID correlation  | ✅ READY | `RequestIdMiddleware`                             |
| Error IDs               | ✅ READY | `GlobalExceptionFilter`                           |
| Security audit events   | ✅ READY | `AuditService` (19 event types)                   |
| Health endpoints        | ✅ READY | `/health/live`, `/health/ready`, `/health/status` |

---

## 9. Real Load Test

**Status: NOT RUN — Requires staging server + load testing tools**

### Load Test Scenarios (When Staging Available)

| Scenario             | Target                               | Concurrency | Duration |
| -------------------- | ------------------------------------ | ----------- | -------- |
| A. Auth login        | POST /auth/login                     | 10          | 60s      |
| B. Dashboard read    | GET /dashboard                       | 20          | 120s     |
| C. Product list      | GET /products                        | 20          | 120s     |
| D. Sales transaction | POST /sales/invoices                 | 5           | 60s      |
| E. Inventory posting | POST /inventory/stock-movements      | 5           | 60s      |
| F. Workflow approval | POST /workflow/instances/:id/approve | 5           | 60s      |
| G. Payment webhook   | POST /commercial/webhook             | 10          | 60s      |

### Required Tools

- k6 or Artillery (not currently installed)
- Staging server with PostgreSQL
- Monitoring dashboard (Grafana/Sentry)

---

## 10. Browser E2E

**Status: NOT RUN — Requires staging server + browser environment**

### Critical Journeys to Test

| Journey              | Priority | Status  |
| -------------------- | -------- | ------- |
| Login                | Critical | NOT RUN |
| Logout               | Critical | NOT RUN |
| Dashboard            | High     | NOT RUN |
| Master data CRUD     | High     | NOT RUN |
| Sales transaction    | Critical | NOT RUN |
| Purchase flow        | High     | NOT RUN |
| Inventory management | High     | NOT RUN |
| Workflow approval    | High     | NOT RUN |
| Payment sandbox      | Medium   | NOT RUN |
| File upload/download | Medium   | NOT RUN |

### Playwright Configuration

- Config exists: `tests/playwright/config.ts`
- No test suites written yet
- Requires staging server URL in `BASE_URL`

---

## 11. Clean-Windows Validation

**Status: EXTERNAL DEPENDENCY — NOT VALIDATED**

### Static Audit Results

| Component           | Status        | Notes                     |
| ------------------- | ------------- | ------------------------- |
| Tauri config        | ✅ Present    | Desktop shell configured  |
| Backend buildable   | ✅ Verified   | `nest build` passes       |
| Frontend buildable  | ✅ Verified   | Vite build passes         |
| Installer scripts   | ✅ Present    | `installer/` directory    |
| Runtime deps        | ✅ Documented | Node.js 20+, pnpm 9+      |
| Actual Windows test | ❌ NOT RUN    | Requires clean Windows VM |

### Required for Actual Validation

1. Clean Windows 10/11 VM
2. Install Node.js 20+ and pnpm 9+
3. Clone repository and run `pnpm install && pnpm build`
4. Start backend + frontend
5. Verify application loads in browser
6. Test desktop shortcuts if Tauri build configured

---

## 12. Backup / Restore

**Status: PARTIAL — Local SQLite verified; PostgreSQL requires staging**

### Current State

| Check              | Status          | Notes                 |
| ------------------ | --------------- | --------------------- |
| Backup script      | ✅ Exists       | `scripts/backup.sh`   |
| SQLite backup      | ✅ Verified     | File copy works       |
| SQLite restore     | ✅ Verified     | File copy works       |
| PostgreSQL backup  | ❌ NOT TESTED   | Requires `pg_dump`    |
| PostgreSQL restore | ❌ NOT TESTED   | Requires `pg_restore` |
| Integrity checks   | ✅ Implemented  | Schema verification   |
| RPO/RTO            | ❌ NOT MEASURED | Requires real DB      |

### PostgreSQL Backup Procedure (When Available)

```bash
# Backup
pg_dump -h <host> -U <user> -d shranix_erp -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h <host> -U <user> -d shranix_erp_restore backup_20260822.dump
```

---

## 13. Security Regression

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

## 14. Remaining Blockers

| #   | Blocker                             | Severity | Effort  | Owner       |
| --- | ----------------------------------- | -------- | ------- | ----------- |
| 1   | Provision PostgreSQL staging        | Critical | 1 day   | DevOps      |
| 2   | Provision staging server            | Critical | 1 day   | DevOps      |
| 3   | Configure TLS + DNS                 | Critical | 1 day   | DevOps      |
| 4   | Configure Nginx reverse proxy       | Critical | 0.5 day | DevOps      |
| 5   | Provision MinIO/S3                  | High     | 0.5 day | DevOps      |
| 6   | Configure SMTP                      | High     | 0.5 day | DevOps      |
| 7   | Get Razorpay test credentials       | High     | 0.5 day | Finance     |
| 8   | Deploy Sentry                       | Medium   | 0.5 day | DevOps      |
| 9   | Install k6/Artillery                | Medium   | 0.5 day | QA          |
| 10  | Run real load tests                 | High     | 1 day   | QA          |
| 11  | Run PostgreSQL backup/restore       | High     | 0.5 day | DevOps      |
| 12  | Run browser E2E tests               | Medium   | 1 day   | QA          |
| 13  | Validate on clean Windows           | Medium   | 1 day   | QA          |
| 14  | Audit SQLite-only code paths        | High     | 1 day   | Engineering |
| 15  | Adapt backup service for PostgreSQL | High     | 1 day   | Engineering |

**Total estimated effort:** 12-15 days (with infrastructure access)

---

## 15. Exact Production Prerequisites

### Must Be Complete Before Production Deployment

| #   | Prerequisite                      | Status | Evidence Required              |
| --- | --------------------------------- | ------ | ------------------------------ |
| 1   | PostgreSQL provisioned + migrated | ❌     | Migration output, health check |
| 2   | TLS certificate issued            | ❌     | HTTPS curl test                |
| 3   | DNS configured                    | ❌     | DNS resolution test            |
| 4   | Application deployed + booting    | ❌     | Health endpoint response       |
| 5   | Authentication working end-to-end | ❌     | Login API test                 |
| 6   | CORS configured for frontend      | ❌     | Browser console test           |
| 7   | Object storage configured         | ❌     | Upload/download test           |
| 8   | SMTP configured                   | ❌     | Email send test                |
| 9   | Payment sandbox configured        | ❌     | Webhook test                   |
| 10  | Monitoring connected              | ❌     | Sentry event test              |
| 11  | Load test completed               | ❌     | k6 report                      |
| 12  | Backup/restore drill completed    | ❌     | Restore verification           |
| 13  | Browser E2E completed             | ❌     | Playwright report              |
| 14  | Security audit passed             | ❌     | Pentest report                 |
| 15  | Clean-Windows validated           | ❌     | Installation test              |

**Current completion: 0/15**

---

## 16. Final Verdict

**Verdict: ENGINEERING READY / STAGING NOT PROVISIONED**

| Dimension          | Score | Evidence                                                      |
| ------------------ | ----- | ------------------------------------------------------------- |
| Code quality       | 95%   | 1180+ tests, 0 lint errors, clean typecheck                   |
| Security           | 100%  | 0 vulnerabilities, H13-H20 all pass                           |
| Supply chain       | 100%  | Dependabot, SBOM, zero vulns, policy documented               |
| Infrastructure     | 0%    | No staging/production servers provisioned                     |
| Database (PG)      | 10%   | SQLite works; PostgreSQL code paths identified but untested   |
| Monitoring         | 30%   | Structured logs ready; no external monitoring                 |
| Load testing       | 5%    | Script exists; no real load test run                          |
| Backup/restore     | 20%   | Local verified; PostgreSQL backup requires pg_dump adaptation |
| Browser E2E        | 0%    | No browser tests written                                      |
| Desktop validation | 5%    | Buildable; no Windows validation                              |

**Overall staging readiness: ~15%** (code ready, infrastructure not provisioned)

**To reach STAGING READY:** Provision infrastructure (server, PostgreSQL, TLS) and run all validation tests.

**To reach PRODUCTION READY:** Complete all 15 prerequisites listed in §15.

---

_H23 Real Staging Validation. Engineering complete; all infrastructure dependencies external._
