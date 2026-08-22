# H37 — Railway Backend Provisioning Gate & Operator Guide

**Checkpoint**: H37
**Date**: 2026-08-23
**Status**: BLOCKED — Operator action required
**Baseline**: H36 (`f2111bd`)

---

## 1. Access Status

| Item                        | Status        |
| --------------------------- | ------------- |
| Railway CLI                 | NOT INSTALLED |
| RAILWAY_TOKEN               | NOT SET       |
| railway.json / railway.toml | NOT PRESENT   |
| Docker available            | NO            |
| **Overall**                 | **BLOCKED**   |

## 2. What Needs to Happen

### Step 1: Create Railway Account (~2 minutes)

1. Go to https://railway.app
2. Sign up with GitHub
3. Verify email

### Step 2: Create Staging Project (~3 minutes)

1. Create new project: `shranix-staging`
2. Add service: `shranix-backend-staging`
3. Connect to GitHub repo: `shranixtech-byte/Shranix`
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build`
   - **Start Command**: `node dist/main.js`
   - **Port**: 4001 (or Railway-assigned)
   - **Health Check Path**: `/v1/health/live`

### Step 3: Configure Secrets (~5 minutes)

Railway Dashboard → Service → Variables:

```
NODE_ENV=staging
APP_PORT=${{PORT}}
DATABASE_URL=<from Neon H34>
REDIS_URL=<from Upstash H35>
JWT_SECRET=<generate: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
CORS_ORIGINS=https://staging.yourdomain.com
COOKIE_DOMAIN=staging.yourdomain.com
FRONTEND_URL=https://staging.yourdomain.com
API_URL=https://api-staging.yourdomain.com
```

### Step 4: Deploy (~5 minutes)

1. Push to `main` or trigger manual deploy
2. Wait for build to complete
3. Check health: `GET https://<railway-url>/v1/health/live`

### Step 5: Verify (~5 minutes)

- Health endpoints return 200
- Swagger UI accessible
- Authentication works
- Database connectivity confirmed

**Total estimated time: ~20 minutes**

## 3. Dockerfile Backend Audit

| Feature           | Status                     |
| ----------------- | -------------------------- |
| Multi-stage build | ✅ deps → builder → runner |
| Non-root user     | ✅ `USER appuser`          |
| Healthcheck       | ✅ `/v1/health/live`       |
| Frozen lockfile   | ✅ `--frozen-lockfile`     |
| Exposed port      | ✅ `EXPOSE 4001`           |
| Node version      | `node:20-alpine`           |

## 4. Required Environment Variables

| Variable             | Required | Purpose                        | Secret? |
| -------------------- | -------- | ------------------------------ | ------- |
| `NODE_ENV`           | Yes      | staging                        | No      |
| `APP_PORT`           | Yes      | Port (Railway injects `$PORT`) | No      |
| `DATABASE_URL`       | Yes      | PostgreSQL connection          | Yes     |
| `REDIS_URL`          | Yes      | Redis connection               | Yes     |
| `JWT_SECRET`         | Yes      | JWT signing                    | Yes     |
| `JWT_REFRESH_SECRET` | Yes      | Refresh token signing          | Yes     |
| `CORS_ORIGINS`       | Yes      | Allowed origins                | No      |
| `COOKIE_DOMAIN`      | Yes      | Cookie domain                  | No      |
| `FRONTEND_URL`       | Yes      | Frontend URL                   | No      |
| `API_URL`            | Yes      | Backend URL                    | No      |

## 5. Port Configuration

The backend uses `APP_PORT` (not `PORT`):

```typescript
const port = process.env.APP_PORT || 4001;
await app.listen(port);
```

Railway injects `$PORT` — set `APP_PORT=${{PORT}}` in Railway variables.

## 6. Deployment Readiness

| Component                 | Status                                  |
| ------------------------- | --------------------------------------- |
| Dockerfile.backend        | ✅ Exists, multi-stage, non-root        |
| Backend build             | ✅ `dist/main.js` present               |
| Migrations                | ✅ 28+ migrations ready                 |
| Health endpoints          | ✅ /health/live, /health/ready, /health |
| Staging bootstrap scripts | ✅ 3 scripts available                  |
| Environment template      | ✅ `.env.staging.template`              |

## 7. Health Endpoints

| Endpoint           | Method | Auth   | Purpose              |
| ------------------ | ------ | ------ | -------------------- |
| `/v1/health/live`  | GET    | Public | Liveness probe       |
| `/v1/health/ready` | GET    | Public | Readiness (DB check) |
| `/v1/health`       | GET    | Public | Basic health info    |

## 8. Security Controls

| Control                  | Status             |
| ------------------------ | ------------------ |
| JWT authentication guard | ✅ Active          |
| Permissions guard        | ✅ Active          |
| Audit logging            | ✅ Active          |
| Rate limiting            | ✅ Configured      |
| Security headers         | ✅ Helmet          |
| CORS                     | ✅ Configurable    |
| CSRF protection          | ✅ Active          |
| Input validation         | ✅ class-validator |

## 9. Rollback Procedure

### Application Rollback

1. Railway Dashboard → Deployments
2. Select previous successful deployment
3. Click "Redeploy"

### Database Rollback

- **DO NOT** run destructive migration rollback on staging
- If migration causes issues, deploy previous code version
- Contact operator for database restore from backup

### Configuration Rollback

1. Revert environment variables to previous values
2. Redeploy

## 10. Blocker Dependencies

| Dependency     | Status  | Provider            |
| -------------- | ------- | ------------------- |
| PostgreSQL     | BLOCKED | Neon (H34)          |
| Redis          | BLOCKED | Upstash (H35)       |
| Object Storage | BLOCKED | Cloudflare R2 (H36) |
| DNS/TLS        | BLOCKED | Cloudflare          |
| Monitoring     | BLOCKED | Sentry              |
| Payment        | BLOCKED | Razorpay            |

## 11. Post-Deployment Verification Checklist

- [ ] Backend starts without errors
- [ ] `/v1/health/live` returns 200
- [ ] `/v1/health/ready` returns 200
- [ ] Swagger UI accessible at `/api/docs`
- [ ] Authentication endpoints respond correctly
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Request IDs generated
- [ ] No secrets in logs
- [ ] Database connectivity confirmed (when PG available)
- [ ] Redis connectivity confirmed (when Redis available)

## 12. Evidence

No live evidence available — Railway access is BLOCKED.
All configuration is code-verified against the repository.
