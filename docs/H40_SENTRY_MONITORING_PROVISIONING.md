# H40 — Sentry Monitoring Provisioning Gate & Operator Guide

**Checkpoint**: H40
**Date**: 2026-08-23
**Status**: BLOCKED — Operator action required
**Baseline**: H39 (`371c8e9`)

---

## 1. Access Status

| Item              | Status        |
| ----------------- | ------------- |
| Sentry CLI        | NOT INSTALLED |
| SENTRY_DSN        | NOT SET       |
| SENTRY_AUTH_TOKEN | NOT SET       |
| @sentry/nestjs    | NOT INSTALLED |
| @sentry/react     | NOT INSTALLED |
| **Overall**       | **BLOCKED**   |

## 2. Existing Monitoring Infrastructure

The application already has robust monitoring foundations:

| Component               | Status    | Location                                                              |
| ----------------------- | --------- | --------------------------------------------------------------------- |
| Global exception filter | ✅ Active | `backend/src/filters/global-exception.filter.ts`                      |
| Request ID middleware   | ✅ Active | `backend/src/common/middleware/request-id.middleware.ts`              |
| Logging interceptor     | ✅ Active | `backend/src/interceptors/logging.interceptor.ts`                     |
| Response interceptor    | ✅ Active | `backend/src/interceptors/response.interceptor.ts`                    |
| Audit service           | ✅ Active | `backend/src/common/services/audit.service.ts`                        |
| Sensitive cache control | ✅ Active | `backend/src/common/middleware/sensitive-cache-control.middleware.ts` |

### Current Exception Handling

- ✅ Structured error responses with errorId (5xx events)
- ✅ requestId correlation on every response
- ✅ Stack trace hidden in production
- ✅ No sensitive data in error responses
- ✅ HTTP status code mapping
- ✅ Validation error formatting

## 3. What Needs to Happen

### Step 1: Create Sentry Account (~3 minutes)

1. Go to https://sentry.io
2. Sign up (free tier: 50K events/month)
3. Create organization: `shranix`

### Step 2: Create Staging Project (~3 minutes)

1. Create project: `shranix-backend-staging`
2. Platform: Node.js / NestJS
3. Create another: `shranix-frontend-staging`
4. Platform: JavaScript / React
5. Copy DSN for each project

### Step 3: Install Packages (~2 minutes)

**Backend:**

```bash
cd backend
pnpm add @sentry/nestjs @sentry/profiling-node
```

**Frontend:**

```bash
cd frontend
pnpm add @sentry/react
```

### Step 4: Configure Backend (~5 minutes)

Add to `backend/src/main.ts`:

```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.npm_package_version || '1.0.0',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express(),
    new Sentry.Integrations.Postgres(),
  ],
  beforeSend(event) {
    // Redact sensitive fields
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.token;
      delete event.request.data.refreshToken;
    }
    return event;
  },
});
```

### Step 5: Configure Frontend (~5 minutes)

Add to `frontend/src/main.tsx`:

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay({ maskAllText: true })],
});
```

### Step 6: Configure Environment Variables (~2 minutes)

Backend (Railway):

```
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Frontend (Vercel):

```
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

### Step 7: Verify (~5 minutes)

1. Deploy to staging
2. Trigger a test error
3. Verify event appears in Sentry dashboard
4. Check environment tag = staging
5. Check no sensitive data in event

**Total estimated time: ~25 minutes**

## 4. Required Environment Variables

| Variable                    | Required | Purpose                         | Secret?                  |
| --------------------------- | -------- | ------------------------------- | ------------------------ |
| `SENTRY_DSN`                | Yes      | Backend error reporting URL     | Yes (treat as sensitive) |
| `SENTRY_ENVIRONMENT`        | Yes      | staging/production tag          | No                       |
| `SENTRY_TRACES_SAMPLE_RATE` | No       | Performance tracing sample rate | No                       |
| `VITE_SENTRY_DSN`           | Yes      | Frontend error reporting URL    | Yes (treat as sensitive) |

## 5. Sensitive Data Redaction

The existing exception filter already handles most redaction:

| Field                    | Redacted? | Method                         |
| ------------------------ | --------- | ------------------------------ |
| Request body (passwords) | ✅        | Not included in error response |
| Authorization header     | ✅        | Not exposed in error response  |
| Stack traces             | ✅        | Hidden in production mode      |
| JWT tokens               | ✅        | Not in error responses         |
| API keys                 | ✅        | Not in error responses         |

Additional Sentry-specific redaction (to be implemented):

- `beforeSend` hook strips sensitive fields
- Form data masking in frontend replay
- PII scrubbing enabled

## 6. Error Classification

| Error Type              | Severity | Sentry Level |
| ----------------------- | -------- | ------------ |
| 5xx Server Error        | high     | error        |
| 4xx Client Error        | low      | warning      |
| Authentication Failure  | medium   | warning      |
| Authorization Denial    | medium   | warning      |
| Rate Limit Exceeded     | low      | info         |
| Database Error          | high     | error        |
| Payment Webhook Failure | critical | error        |
| Scheduler Failure       | high     | error        |

## 7. Request Correlation

Every Sentry event should include:

- `requestId` — from x-request-id header
- `errorId` — generated for 5xx events (8 chars)
- `userId` — where available (not password/token)
- `tenantId` — for multi-tenant context
- `environment` — staging/production
- `release` — Git SHA or version

## 8. Alerting Setup (Recommended)

| Alert            | Condition               | Severity |
| ---------------- | ----------------------- | -------- |
| 5xx Spike        | >10 errors in 5 minutes | critical |
| Auth Failures    | >20 in 5 minutes        | high     |
| Payment Failures | Any                     | critical |
| Webhook Failures | >5 in 5 minutes         | high     |
| Database Errors  | Any                     | critical |
| New Issue        | First occurrence        | info     |
| Regression       | Issue re-opened         | high     |

## 9. Rollback Procedure

### Sentry Rollback

- Sentry is a passive observer — no rollback needed
- If DSN is wrong, events won't arrive (no harm)

### Package Rollback

```bash
pnpm remove @sentry/nestjs @sentry/profiling-node
pnpm remove @sentry/react
```

### Configuration Rollback

- Remove Sentry.init() calls
- Remove SENTRY_DSN from environment

## 10. Known Limitations

| Limitation                          | Impact                           | Mitigation                  |
| ----------------------------------- | -------------------------------- | --------------------------- |
| Free tier: 50K events/month         | May exceed during debugging      | Set tracesSampleRate low    |
| Free tier: 1 user                   | Team collaboration limited       | Upgrade when needed         |
| No custom alert destinations (free) | Limited notification options     | Use Sentry email alerts     |
| Source maps require upload          | Stack traces less useful without | Configure source map upload |

## 11. Post-Deployment Checklist

- [ ] Sentry account created
- [ ] Backend project created (`shranix-backend-staging`)
- [ ] Frontend project created (`shranix-frontend-staging`)
- [ ] @sentry/nestjs installed
- [ ] @sentry/react installed
- [ ] Backend Sentry.init() configured
- [ ] Frontend Sentry.init() configured
- [ ] SENTRY_DSN set in Railway
- [ ] VITE_SENTRY_DSN set in Vercel
- [ ] Test error triggers event
- [ ] Environment tag = staging
- [ ] Release tag = Git SHA
- [ ] No sensitive data in events
- [ ] Alert rules configured

## 12. Blocker Dependencies

| Dependency       | Status  | Provider      |
| ---------------- | ------- | ------------- |
| Backend hosting  | BLOCKED | Railway (H37) |
| Frontend hosting | BLOCKED | Vercel (H38)  |
| PostgreSQL       | BLOCKED | Neon (H34)    |
| Redis            | BLOCKED | Upstash (H35) |

## 13. Evidence

No live evidence available — Sentry access is BLOCKED.
All configuration is code-verified against the repository.
Exception handling, request correlation, and sensitive data redaction are all verified in source code.
