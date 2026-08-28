# SHRANIX Krushi ERP — Production Deployment Guide

**Version:** 1.0.0
**Date:** August 28, 2026

---

## Quick Start

### Prerequisites

- Railway account + CLI (`npm install -g @railway/cli`)
- Neon PostgreSQL account
- Domain: api.shranix.com

### Step 1: Provision Neon Database

```bash
# Create a new Neon project at https://console.neon.tech
# Copy the connection string (pooled endpoint)
# Format: postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require
```

### Step 2: Configure Railway

```bash
railway login
railway init shranix-erp-backend
railway link
```

### Step 3: Set Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_PROVIDER=postgresql
railway variables set DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"
railway variables set JWT_SECRET="$(openssl rand -base64 48)"
railway variables set CORS_ORIGINS="https://app.shranix.com,https://shranix.com,tauri://localhost"
railway variables set APP_URL="https://api.shranix.com"
railway variables set SWAGGER_ENABLED=false
railway variables set LOG_LEVEL=warn
```

### Step 4: Deploy

```bash
railway up --production
```

### Step 5: Run Migrations

```bash
railway run npx drizzle-kit push
```

### Step 6: Verify

```bash
curl https://api.shranix.com/v1/health/live
```

---

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  Desktop App    │ ────────────── │  Railway         │
│  (Tauri/React)  │                │  Backend         │
│  Windows EXE    │                │  NestJS          │
└─────────────────┘                └────────┬─────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  Neon PostgreSQL  │
                                   │  (Serverless)     │
                                   └──────────────────┘
```

---

## Environment Variables Reference

| Variable            | Required | Description     | Example                   |
| ------------------- | -------- | --------------- | ------------------------- |
| `NODE_ENV`          | Yes      | Environment     | `production`              |
| `DATABASE_PROVIDER` | Yes      | Database type   | `postgresql`              |
| `DATABASE_URL`      | Yes      | PostgreSQL URL  | `postgresql://...`        |
| `JWT_SECRET`        | Yes      | JWT signing key | Random 48+ char           |
| `CORS_ORIGINS`      | Yes      | Allowed origins | `https://app.shranix.com` |
| `APP_URL`           | Yes      | Backend URL     | `https://api.shranix.com` |
| `APP_PORT`          | No       | Server port     | `4001`                    |
| `LOG_LEVEL`         | No       | Logging level   | `warn`                    |
| `SWAGGER_ENABLED`   | No       | API docs        | `false`                   |

---

## Health Checks

| Endpoint               | Purpose        | Expected    |
| ---------------------- | -------------- | ----------- |
| `GET /v1/health/live`  | Liveness       | 200 OK      |
| `GET /v1/health/ready` | Readiness      | 200 OK      |
| `POST /v1/auth/login`  | Authentication | 200 + token |

---

## Rollback Procedure

### Quick Rollback

```bash
# List recent deployments
railway status

# Rollback to previous deployment
railway variables set RAILWAY_DEPLOYMENT_VERSION=<previous-deployment-id>
```

### Full Rollback

```bash
# 1. Stop current deployment
railway down --service backend

# 2. Restore database from backup
psql -h ep-xxx.neon.tech -U user -d dbname < backup.sql

# 3. Deploy previous version
git checkout <previous-tag>
railway up --production
```

---

## Monitoring

### Health Monitoring

- Railway provides built-in health checks
- Set up alerts for health check failures
- Monitor response times via Railway dashboard

### Error Monitoring

- Check Railway logs: `railway logs --service backend`
- Monitor API error rates
- Set up alerts for 5xx errors

---

## Security Checklist

- [ ] `JWT_SECRET` is cryptographically random (48+ chars)
- [ ] `DATABASE_URL` uses SSL (`sslmode=require`)
- [ ] `CORS_ORIGINS` only includes production domains
- [ ] `SWAGGER_ENABLED=false` in production
- [ ] No secrets in source code
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured

---

## Troubleshooting

| Issue              | Solution                                   |
| ------------------ | ------------------------------------------ |
| Health check fails | Check `DATABASE_URL` and Neon status       |
| CORS error         | Verify `CORS_ORIGINS` includes your domain |
| Login fails        | Check `JWT_SECRET` is set correctly        |
| Migration fails    | Use direct connection URL (not pooled)     |
| Slow queries       | Check Neon compute size and indexes        |

---

_SHRANIX Krushi ERP v1.0.0 — Production Deployment Guide_
