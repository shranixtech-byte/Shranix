# SHRANIX Krushi ERP — Production Deployment Guide

**Version:** 1.18.0  
**Last Updated:** 2026-07-25  

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Docker Deployment](#3-docker-deployment)
4. [Upgrade Guide](#4-upgrade-guide)
5. [Rollback Guide](#5-rollback-guide)
6. [Production Checklist](#6-production-checklist)
7. [Infrastructure Checklist](#7-infrastructure-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

- **Docker** 24.0+ and **Docker Compose** v2.20+
- **Node.js** 20.x (for local development only)
- **pnpm** 9.x (for local development only)
- **PostgreSQL** 16+ (production, or use the Docker image)
- **Redis** 7+ (production, or use the Docker image)
- **Domain** with valid SSL certificate (production)
- **GitHub Container Registry** access (for CI/CD)

---

## 2. Environment Setup

### 2.1. Clone Repository

```bash
git clone https://github.com/shranix/erp.git
cd erp
```

### 2.2. Environment Variables

Copy the template and configure for your environment:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment (production/development) | `development` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | — |
| `DATABASE_URL` | PostgreSQL connection URL | `postgres://shranix:shranix123@localhost:5432/shranix_erp` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:3000` |

**Optional variables:**

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `STORAGE_ADAPTER` | File storage adapter (local/s3/minio) | `local` |
| `SMTP_HOST` | SMTP server for email | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | Sender email address | `noreply@shranix.com` |
| `APP_PORT` | Backend API port | `3001` |
| `SWAGGER_ENABLED` | Enable Swagger docs | `true` |

---

## 3. Docker Deployment

### 3.1. Development

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, MinIO, Backend, and Frontend.

### 3.2. Production

```bash
# 1. Set production environment variables
export NODE_ENV=production
export JWT_SECRET="your-strong-64-char-secret-here!"
export DATABASE_URL="postgres://user:pass@host:5432/shranix_erp"
export REDIS_URL="redis://:password@redis:6379"

# 2. Build and start
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# 3. Run database migrations
docker exec shranix-backend npx drizzle-kit push

# 4. Verify health
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

### 3.3. Scaling

```bash
# Scale backend replicas
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --scale backend=3
```

---

## 4. Upgrade Guide

### 4.1. Standard Upgrade

```bash
# 1. Pull latest images
docker compose -f docker-compose.production.yml pull

# 2. Back up database
./scripts/backup.sh backup

# 3. Apply database migrations
docker compose -f docker-compose.production.yml run --rm backend npx drizzle-kit push

# 4. Restart services with new images
docker compose -f docker-compose.production.yml up -d --force-recreate

# 5. Verify
curl http://localhost:3000/health
```

### 4.2. Breaking Change Upgrade

```bash
# 1. Announce maintenance window
# 2. Take application offline
docker compose -f docker-compose.production.yml down

# 3. Back up database
./scripts/backup.sh backup

# 4. Pull new images
docker compose -f docker-compose.production.yml pull

# 5. Run migrations
docker compose -f docker-compose.production.yml run --rm backend npx drizzle-kit push

# 6. Start services
docker compose -f docker-compose.production.yml up -d

# 7. Verify
curl http://localhost:3000/health

# 8. End maintenance window
```

---

## 5. Rollback Guide

### 5.1. Application Rollback

```bash
# 1. Restore previous Docker image tag
export TAG=v1.17.0
docker compose -f docker-compose.production.yml up -d

# 2. Verify
curl http://localhost:3000/health
```

### 5.2. Database Rollback

```bash
# 1. Identify backup file
./scripts/backup.sh list

# 2. Restore from backup
./scripts/backup.sh restore ./backups/shranix_erp_20260725_120000.dump

# 3. Verify data integrity
./scripts/backup.sh verify ./backups/shranix_erp_20260725_120000.dump

# 4. Restart application
docker compose -f docker-compose.production.yml restart backend
```

---

## 6. Production Checklist

- [ ] JWT_SECRET set to a cryptographically strong value (> 32 characters)
- [ ] DATABASE_URL uses a dedicated production database user (not `shranix` default)
- [ ] SSL certificates configured and HTTPS enforced
- [ ] CORS_ORIGINS restricted to known domains
- [ ] Redis password set (`REDIS_URL` includes `:password@`)
- [ ] MinIO access key and secret key set
- [ ] SMTP credentials configured for email notifications
- [ ] Backup schedule configured (cron or k8s CronJob)
- [ ] Monitoring stack deployed (Prometheus + Grafana)
- [ ] Health endpoints accessible and returning `ok`
- [ ] Rate limiting configured for API endpoints
- [ ] Logging level set to `warn` or `error` in production
- [ ] Swagger disabled or restricted (`SWAGGER_ENABLED=false`)
- [ ] Docker images use non-root users
- [ ] Database migrations verified against production data

---

## 7. Infrastructure Checklist

- [ ] Load balancer configured (Nginx in production compose)
- [ ] PostgreSQL 16+ running with replication (recommended)
- [ ] Redis 7+ running with persistence (AOF enabled)
- [ ] Object storage (MinIO/S3) configured for DMS
- [ ] Reverse proxy with rate limiting configured
- [ ] Firewall rules restrict access to necessary ports only
- [ ] Monitoring and alerting configured
- [ ] Backup retention policy defined (default: 30 days)
- [ ] Disaster recovery plan documented
- [ ] Staging environment mirrors production

---

## 8. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Backend health check fails | Database unreachable | Check `DATABASE_URL` and network connectivity |
| Frontend shows blank page | API proxy misconfigured | Verify Nginx `proxy_pass` target |
| File upload fails | Storage path not writable | Check `DMS_STORAGE_PATH` permissions |
| Email not sending | SMTP credentials incorrect | Verify `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| JWT authentication fails | JWT_SECRET changed | Regenerate tokens or set consistent secret |
| Slow queries | Missing indexes | Run `EXPLAIN ANALYZE` and add indexes |
| Docker build fails | Out of memory | Increase Docker memory limit |

---

## 9. Monitoring URLs

| Service | URL |
|---|---|
| Backend Health | `http://localhost:3000/health` |
| Backend Liveness | `http://localhost:3000/health/live` |
| Backend Readiness | `http://localhost:3000/health/ready` |
| Backend Metrics | `http://localhost:3000/health/metrics` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3002` |
| MinIO Console | `http://localhost:9001` |
| Swagger Docs | `http://localhost:3000/api/docs` |
