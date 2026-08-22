# H44 — Real Infrastructure Provisioning

**Checkpoint**: H44
**Date**: 2026-08-23
**Status**: INFRASTRUCTURE BLOCKED
**Baseline**: H43 (`7b9999d`)

---

## 1. Infrastructure Access Matrix

| Service         | CLI Installed | Credential Set | Provisioned | Status  |
| --------------- | ------------- | -------------- | ----------- | ------- |
| Neon PostgreSQL | ❌ neonctl    | ❌             | ❌          | BLOCKED |
| Upstash Redis   | ❌ redis-cli  | ❌             | ❌          | BLOCKED |
| Cloudflare R2   | ❌ wrangler   | ❌             | ❌          | BLOCKED |
| Railway         | ❌ railway    | ❌             | ❌          | BLOCKED |
| Vercel          | ❌ vercel     | ❌             | ❌          | BLOCKED |
| Cloudflare DNS  | ❌            | ❌             | ❌          | BLOCKED |
| Sentry          | ❌ sentry-cli | ❌             | ❌          | BLOCKED |
| Razorpay        | ❌            | ❌             | ❌          | BLOCKED |

**All 8 services: BLOCKED — No operator access available on this machine.**

## 2. Why Provisioning Is Blocked

This machine has:

- ✅ Node.js 24.18.0
- ✅ pnpm 9.15.0
- ✅ Git 2.55.0
- ✅ curl

This machine does NOT have:

- ❌ No Docker (cannot run containers)
- ❌ No PostgreSQL client (cannot connect to databases)
- ❌ No Redis client (cannot connect to Redis)
- ❌ No cloud CLIs (cannot provision resources)
- ❌ No SSH access (cannot deploy to servers)
- ❌ No domain/DNS tools (cannot configure DNS)

**All provisioning requires operator action through web dashboards.**

## 3. What The Operator Must Do

### Step 1: Neon PostgreSQL (~15 minutes)

1. Go to https://neon.tech
2. Sign up (free tier)
3. Create project: `shranix-staging`
4. Copy connection string (format: `postgresql://...`)
5. Save for Railway configuration

### Step 2: Upstash Redis (~10 minutes)

1. Go to https://upstash.com
2. Sign up (free tier)
3. Create Redis database: `shranix-staging`
4. Copy REST URL and token
5. Save for Railway configuration

### Step 3: Cloudflare R2 (~10 minutes)

1. Go to https://dash.cloudflare.com
2. Sign up (free plan)
3. Enable R2
4. Create bucket: `shranix-staging-documents`
5. Create API token with R2 access
6. Save credentials for Railway configuration

### Step 4: Railway (~15 minutes)

1. Go to https://railway.app
2. Sign up with GitHub
3. Import `shranixtech-byte/Shranix`
4. Create service: `shranix-backend-staging`
5. Root directory: `backend`
6. Configure all environment variables:
   - DATABASE_URL (from Neon)
   - REDIS_URL (from Upstash)
   - R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (from R2)
   - JWT_SECRET, JWT_REFRESH_SECRET (generate)
   - CORS_ORIGINS, COOKIE_DOMAIN, FRONTEND_URL, API_URL
   - NODE_ENV=staging
7. Deploy

### Step 5: Vercel (~10 minutes)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Import `shranixtech-byte/Shranix`
4. Root directory: `frontend`
5. Configure:
   - VITE_API_URL=https://api-staging.shranix.com/api/v1
6. Deploy

### Step 6: Cloudflare DNS (~10 minutes)

1. Add domain: `shranix.com`
2. Create CNAME records:
   - `staging` → `cname.vercel-dns.com`
   - `api-staging` → `<railway-url>`
3. SSL/TLS mode: Full (strict)
4. Always HTTPS: ON

### Step 7: Sentry (~10 minutes)

1. Go to https://sentry.io
2. Create project: `shranix-backend-staging`
3. Copy DSN
4. Install @sentry/nestjs in backend
5. Configure Sentry.init()
6. Set SENTRY_DSN in Railway

### Step 8: Razorpay (~10 minutes)

1. Go to https://dashboard.razorpay.com
2. Create account (free tier)
3. Enable test mode
4. Get sandbox API keys
5. Configure webhook: `https://api-staging.shranix.com/billing/webhook`
6. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET in Railway

**Total estimated time: ~90 minutes**

## 4. Provisioning Evidence

No live evidence exists — all services are BLOCKED.

| Evidence Type       | Status                       |
| ------------------- | ---------------------------- |
| Database connection | NOT VERIFIED                 |
| Redis PING          | NOT VERIFIED                 |
| R2 upload/download  | NOT VERIFIED                 |
| Backend health      | NOT VERIFIED (no deployment) |
| Frontend load       | NOT VERIFIED (no deployment) |
| DNS resolution      | NOT VERIFIED                 |
| TLS certificate     | NOT VERIFIED                 |
| Sentry event        | NOT VERIFIED                 |
| Razorpay order      | NOT VERIFIED                 |

## 5. Local Validation Evidence

| Evidence Type       | Status      | Details                     |
| ------------------- | ----------- | --------------------------- |
| Backend build       | ✅ VERIFIED | dist/main.js exists         |
| Frontend build      | ✅ VERIFIED | dist/index.html exists      |
| Health endpoints    | ✅ VERIFIED | /health/live, /health/ready |
| Auth validation     | ✅ VERIFIED | 401/400 responses           |
| Security headers    | ✅ VERIFIED | nosniff, DENY, request-id   |
| API surface         | ✅ VERIFIED | 900+ routes, Swagger        |
| Security regression | ✅ VERIFIED | 415/415 tests pass          |
| All tests           | ✅ VERIFIED | 1889+130 = 2019 tests pass  |

## 6. Remaining Blockers

| Blocker            | Severity | Action Required         |
| ------------------ | -------- | ----------------------- |
| No PostgreSQL      | P0       | Create Neon account     |
| No backend server  | P0       | Deploy to Railway       |
| No domain/TLS      | P0       | Configure Cloudflare    |
| No Redis           | P1       | Create Upstash Redis    |
| No object storage  | P1       | Create R2 bucket        |
| No monitoring      | P1       | Create Sentry project   |
| No payment sandbox | P2       | Create Razorpay sandbox |
| No load test       | P2       | Run k6/Artillery        |
| No browser E2E     | P2       | Run Playwright          |

## 7. Test Results

| Suite            | Result                                |
| ---------------- | ------------------------------------- |
| H44 targeted     | **32/32 passed**                      |
| H13-H20 security | **415/415 passed**                    |
| Full backend     | **88 files, 1921 tests — ALL PASSED** |
| Full frontend    | **13 files, 130 tests — ALL PASSED**  |
| Typecheck        | ✅ Clean                              |
| Lint             | 0 errors                              |
| Build            | ✅ Passing                            |

## 8. Verdict

**INFRASTRUCTURE BLOCKED**

All 8 required services need operator provisioning via web dashboards. The repository is fully prepared with operator guides, deployment scripts, and environment templates. An operator can achieve staging readiness in approximately 90 minutes.
