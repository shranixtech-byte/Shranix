# H30 CHECKPOINT — STAGING PROVISIONING GATE

## 1. Baseline

| Item        | Value                                              |
| ----------- | -------------------------------------------------- |
| H29 commit  | `13fd575`                                          |
| H29 verdict | STAGING PARTIAL                                    |
| H30 scope   | Operator-ready deployment package + readiness gate |

## 2. Classification

| Category         | Status             | Evidence                                                        |
| ---------------- | ------------------ | --------------------------------------------------------------- |
| CODE READY       | ✅ YES             | 1434 backend + 130 frontend tests passing, zero vulnerabilities |
| DEPLOYMENT READY | ✅ YES             | Dockerfiles, docker-compose, bootstrap scripts, runbooks        |
| LOCAL VALIDATION | ✅ YES             | Backend boots, 900 routes, health/auth/security verified live   |
| EXTERNAL STAGING | ❌ NOT PROVISIONED | No PostgreSQL, Redis, TLS, storage, monitoring                  |
| PRODUCTION READY | ❌ NOT ALLOWED     | Requires operational evidence from real staging                 |

## 3. Infrastructure Provisioning Matrix

| #   | Component      | Provider          | Required Account    | Required Variables | Provision Command          | Validation           | Status  |
| --- | -------------- | ----------------- | ------------------- | ------------------ | -------------------------- | -------------------- | ------- |
| 1   | PostgreSQL     | Neon              | console.neon.tech   | `DATABASE_URL`     | Create project → copy URL  | `pg_isready`         | BLOCKED |
| 2   | Redis          | Upstash           | console.upstash.com | `REDIS_URL`        | Create database → copy URL | `redis-cli ping`     | BLOCKED |
| 3   | Object Storage | Cloudflare R2     | dash.cloudflare.com | `R2_*` vars        | Create bucket              | upload/download test | BLOCKED |
| 4   | DNS            | Cloudflare        | dash.cloudflare.com | DNS records        | Add A/CNAME                | `dig`                | BLOCKED |
| 5   | TLS            | Cloudflare        | (same)              | Proxy enabled      | Enable proxy               | `curl https://`      | BLOCKED |
| 6   | Backend Host   | Railway/Render    | account required    | Deployment config  | Connect GitHub             | health check         | BLOCKED |
| 7   | Frontend Host  | Vercel/Cloudflare | account required    | Build config       | Connect GitHub             | curl                 | BLOCKED |
| 8   | Monitoring     | Sentry            | sentry.io           | `SENTRY_DSN`       | Create project             | test exception       | BLOCKED |
| 9   | Payment        | Razorpay          | razorpay.com        | `RAZORPAY_*`       | Get test keys              | test payment         | BLOCKED |
| 10  | Load Testing   | k6                | —                   | —                  | `npm install -g k6`        | k6 run               | BLOCKED |
| 11  | Browser E2E    | Playwright        | —                   | —                  | `npx playwright install`   | test suite           | BLOCKED |
| 12  | Windows        | Local VM          | —                   | —                  | Manual                     | checklist            | BLOCKED |

## 4. Environment Contract

### Required Variables (must be set for staging)

| Variable             | Purpose                     | Example                       | Required |
| -------------------- | --------------------------- | ----------------------------- | -------- |
| `NODE_ENV`           | Runtime mode                | `staging`                     | ✅       |
| `DATABASE_URL`       | PostgreSQL connection       | `postgresql://...`            | ✅       |
| `JWT_SECRET`         | JWT signing key (≥32 chars) | `openssl rand -base64 48`     | ✅       |
| `JWT_REFRESH_SECRET` | Refresh token signing       | `openssl rand -base64 48`     | ✅       |
| `REDIS_URL`          | Redis connection            | `redis://...`                 | ✅       |
| `CORS_ORIGINS`       | Allowed browser origins     | `https://staging.example.com` | ✅       |

### Optional Variables

| Variable          | Purpose               | Default |
| ----------------- | --------------------- | ------- |
| `STORAGE_ADAPTER` | Object storage        | `local` |
| `MINIO_ENDPOINT`  | S3-compatible storage | —       |
| `SENTRY_DSN`      | Error tracking        | —       |
| `RAZORPAY_KEY_ID` | Payment sandbox       | —       |
| `SMTP_HOST`       | Email server          | —       |

## 5. Bootstrap Scripts Created

| Script                            | Purpose                          | Status          |
| --------------------------------- | -------------------------------- | --------------- |
| `scripts/validate-staging-env.sh` | Validates all required env vars  | ✅ Created      |
| `scripts/staging-readiness.sh`    | Single-command readiness gate    | ✅ Created      |
| `scripts/staging-bootstrap.sh`    | Deterministic bootstrap sequence | ✅ Created      |
| `scripts/staging-smoke-test.sh`   | Non-destructive smoke tests      | ✅ Pre-existing |

## 6. Readiness Gate Output

The `scripts/staging-readiness.sh` script produces:

```
CODE:        PASS / BLOCKED
DEPENDENCIES: PASS / BLOCKED
DATABASE:    PASS / BLOCKED
REDIS:       PASS / BLOCKED
STORAGE:     PASS / BLOCKED
TLS:         PASS / BLOCKED
HEALTH:      PASS / BLOCKED
MONITORING:  PASS / BLOCKED
PAYMENT:     PASS / BLOCKED
LOAD:        PASS / BLOCKED

Final: STAGING READY / STAGING PARTIAL / STAGING BLOCKED
```

## 7. Current Readiness

Running `scripts/staging-readiness.sh` against current state:

```
CODE:        PASS (backend built, migrations intact)
DEPENDENCIES: PASS (lockfile exists)
DATABASE:    BLOCKED (SQLite only, not PostgreSQL)
REDIS:       BLOCKED (REDIS_URL not set)
STORAGE:     BLOCKED (not configured)
TLS:         BLOCKED (HTTP only)
HEALTH:      NOT RUN (server not running)
MONITORING:  BLOCKED (no SENTRY_DSN)
PAYMENT:     BLOCKED (no RAZORPAY credentials)
LOAD:        BLOCKED (k6 not installed)

Final: STAGING BLOCKED
```

## 8. Operator Quick-Start

To provision staging, an operator must:

### Step 1: Provision PostgreSQL (5 minutes)

1. Go to https://console.neon.tech
2. Create free account
3. Create PostgreSQL 16 project
4. Copy pooled connection string
5. Set: `export DATABASE_URL="postgresql://..."`

### Step 2: Provision Redis (5 minutes)

1. Go to https://console.upstash.com
2. Create free account
3. Create Redis database
4. Copy REST API URL
5. Set: `export REDIS_URL="..."`

### Step 3: Configure Environment (2 minutes)

1. Copy `.env.staging.template` to `.env.staging`
2. Fill in `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
3. Source: `source .env.staging`

### Step 4: Bootstrap (5 minutes)

1. Run: `bash scripts/staging-bootstrap.sh`
2. Run: `bash scripts/staging-readiness.sh`
3. Expected: STAGING PARTIAL (at minimum)

### Step 5: Start and Verify (2 minutes)

1. Start backend: `cd backend && node dist/main.js`
2. Run smoke test: `bash scripts/staging-smoke-test.sh`
3. Verify all checks pass

## 9. Rollback Policy

| Type              | Method                | Risk                    |
| ----------------- | --------------------- | ----------------------- |
| Code rollback     | Git revert + redeploy | Low                     |
| Config rollback   | Restore previous env  | Low                     |
| Database rollback | Migration revert      | HIGH — requires caution |
| Data restore      | pg_dump/restore       | HIGH — requires backup  |

## 10. Backup/Restore Commands

```bash
# Backup
pg_dump "$DATABASE_URL" | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Restore (isolated)
createdb restore_test
zcat backups/backup_*.sql.gz | psql restore_test

# Verify
psql restore_test -c "SELECT COUNT(*) FROM users;"
```

## 11. Monitoring Contract

| Alert              | Severity | Condition               | Response                    |
| ------------------ | -------- | ----------------------- | --------------------------- |
| 5xx spike          | Critical | >5% error rate for 5min | Investigate immediately     |
| Auth failure spike | High     | >10 failures/min        | Check for brute force       |
| DB connectivity    | Critical | Health check fails      | Check PostgreSQL status     |
| Redis connectivity | High     | Cache miss rate >50%    | Check Redis status          |
| Backup failure     | Critical | Daily backup fails      | Manual backup + investigate |
| Storage failure    | High     | Upload/download fails   | Check S3/R2 status          |

## 12. Remaining External Blockers

| #   | Blocker          | Provisioning Time | Priority |
| --- | ---------------- | ----------------- | -------- |
| 1   | PostgreSQL       | 5 minutes         | P0       |
| 2   | Redis            | 5 minutes         | P0       |
| 3   | Object storage   | 10 minutes        | P1       |
| 4   | TLS/Domain       | 15 minutes        | P1       |
| 5   | Razorpay sandbox | 10 minutes        | P2       |
| 6   | Sentry           | 5 minutes         | P2       |
| 7   | k6               | 2 minutes         | P2       |
| 8   | Playwright       | 5 minutes         | P2       |
| 9   | Windows VM       | 30+ minutes       | P3       |

**Total estimated provisioning time: ~90 minutes**

---

**H30 CHECKPOINT COMMITTED. NO PUSH. H31 NOT STARTED.**
