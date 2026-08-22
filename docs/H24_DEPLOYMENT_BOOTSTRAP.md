# SHRANIX ERP — H24 Deployment Bootstrap

## 1. Purpose

This document provides a reproducible, operator-friendly guide for standing up a SHRANIX ERP staging environment from clean infrastructure.

**Goal:** Given clean infrastructure and valid environment secrets, an operator can deploy SHRANIX ERP staging using documented, deterministic steps.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHRANIX ERP Stack                        │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Frontend  │   Backend   │  PostgreSQL │  Redis     MinIO      │
│   (Nginx)   │  (NestJS)   │  (16)       │  (7)       (S3)      │
│   :80       │  :4001      │  :5432      │  :6379     :9000/9001 │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
```

### Component Versions

| Component   | Version       | Purpose                                     |
| ----------- | ------------- | ------------------------------------------- |
| Node.js     | 20.x (Alpine) | Backend runtime                             |
| PostgreSQL  | 16 (Alpine)   | Primary database                            |
| Redis       | 7 (Alpine)    | Caching, distributed locking, rate limiting |
| MinIO       | latest        | S3-compatible object storage (DMS, backups) |
| Nginx       | 1.25 (Alpine) | Frontend static serving, reverse proxy      |
| pnpm        | latest        | Package manager                             |
| NestJS      | 11.x          | Backend framework                           |
| Vite        | 5.x           | Frontend build                              |
| Drizzle ORM | 0.45.x        | Database ORM                                |
| Drizzle Kit | 0.31.x        | Migration tool                              |

## 3. Prerequisites

### Required Tools

| Tool           | Version | Purpose                       |
| -------------- | ------- | ----------------------------- |
| Docker         | ≥ 24.x  | Container runtime             |
| Docker Compose | ≥ 2.x   | Multi-container orchestration |
| Node.js        | 20.x    | Local development             |
| pnpm           | ≥ 9.x   | Package management            |
| git            | ≥ 2.x   | Source control                |

### Required Infrastructure

| Service          | Status            | Notes                    |
| ---------------- | ----------------- | ------------------------ |
| PostgreSQL       | PROVIDED (Docker) | Via docker-compose       |
| Redis            | PROVIDED (Docker) | Via docker-compose       |
| Object Storage   | PROVIDED (Docker) | MinIO via docker-compose |
| TLS/Domain       | NOT PROVIDED      | See Section 13           |
| Razorpay Sandbox | NOT PROVIDED      | Optional for staging     |
| Sentry           | NOT PROVIDED      | Optional for staging     |

## 4. Environment Variables

See `.env.staging.template` for the complete list.

### Required Variables

| Variable             | Purpose                     | Example                                        |
| -------------------- | --------------------------- | ---------------------------------------------- |
| `NODE_ENV`           | Runtime environment         | `staging`                                      |
| `DATABASE_PROVIDER`  | DB engine                   | `postgresql`                                   |
| `DATABASE_URL`       | PostgreSQL connection       | `postgresql://user:pass@host:5432/shranix_erp` |
| `JWT_SECRET`         | JWT signing key (≥32 chars) | `openssl rand -base64 48`                      |
| `JWT_REFRESH_SECRET` | Refresh token signing key   | `openssl rand -base64 48`                      |
| `REDIS_URL`          | Redis connection            | `redis://redis:6379`                           |
| `STORAGE_ADAPTER`    | Storage backend             | `minio`                                        |

### Optional Variables

| Variable          | Purpose               | Default            |
| ----------------- | --------------------- | ------------------ |
| `SMTP_HOST`       | Email server          | `smtp.example.com` |
| `SENTRY_DSN`      | Error tracking        | Not set            |
| `RAZORPAY_KEY_ID` | Payment sandbox       | Not set            |
| `AI_PROVIDER`     | AI assistant provider | `openai`           |

## 5. Bootstrap Sequence

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone <repo-url> shranix-erp
cd shranix-erp

# 2. Create staging environment file
cp .env.staging.template .env.staging
# Edit .env.staging with staging-appropriate values

# 3. Start all services
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# 4. Wait for services to be healthy
docker compose -f docker-compose.staging.yml ps

# 5. Verify health
curl http://localhost:4001/v1/health/live

# 6. Run smoke tests
bash scripts/staging-smoke-test.sh http://localhost:4001
```

### Option B: Local Development

```bash
# 1. Clone the repository
git clone <repo-url> shranix-erp
cd shranix-erp

# 2. Install dependencies
pnpm install --frozen-lockfile

# 3. Create .env file
cp .env.example .env
# Edit .env with SQLite configuration for quick start

# 4. Build packages
pnpm --filter @shranix/database build
pnpm --filter @shranix/shared build
pnpm --filter @shranix/backend build

# 5. Run database migrations
cd database && pnpm drizzle-kit push

# 6. Start servers
node scripts/start-servers.mjs
```

## 6. Database Bootstrap

### Migration Sequence

```bash
# 1. Verify PostgreSQL connection
psql -U shranix -h localhost -d shranix_erp -c "SELECT 1;"

# 2. Run Drizzle migrations
cd database
pnpm drizzle-kit push

# 3. Verify migration status
pnpm drizzle-kit check

# 4. Verify schema
pnpm drizzle-kit generate
```

### Migration Notes

- All 28 migrations (0000–0027) are idempotent on re-run
- `drizzle-kit push` applies pending migrations safely
- No destructive reset commands in the bootstrap process
- Journal version 7 is maintained across all migrations

## 7. Redis Bootstrap

Redis is provided by docker-compose.staging.yml with these defaults:

- Port: 6379
- Persistence: AOF enabled
- Memory limit: 128MB
- Eviction: allkeys-lru

### Verification

```bash
# Check Redis is running
docker exec shranix-staging-redis redis-cli ping
# Expected: PONG

# Check memory usage
docker exec shranix-staging-redis redis-cli info memory | grep used_memory_human
```

## 8. Object Storage Bootstrap

MinIO is provided by docker-compose.staging.yml:

- API port: 9000
- Console port: 9001
- Default user: `shranix_staging`

### Verification

```bash
# Access MinIO console
open http://localhost:9001

# Create the required bucket (first time only)
docker exec shranix-staging-minio mc alias set local \
  http://localhost:9000 shranix_staging staging_dev_only_123
docker exec shranix-staging-minio mc mb local/shranix-dms
```

## 9. Application Deployment

### Docker Deployment (Recommended)

```bash
# Build backend image
docker build -f Dockerfile.backend -t shranix-backend:staging .

# Build frontend image
docker build -f Dockerfile.frontend -t shranix-frontend:staging .

# Start with staging compose
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### Health Checks

| Service           | Endpoint                 | Expected                                            |
| ----------------- | ------------------------ | --------------------------------------------------- |
| Backend liveness  | `GET /v1/health/live`    | `{"status":"ok"}`                                   |
| Backend readiness | `GET /v1/health/ready`   | `{"status":"ready"}`                                |
| Backend health    | `GET /v1/health`         | `{"status":"ok","services":{"database":"healthy"}}` |
| Backend metrics   | `GET /v1/health/metrics` | Uptime, memory, CPU                                 |
| Backend status    | `GET /v1/health/status`  | Operational status snapshot                         |
| Frontend          | `GET /`                  | HTML response                                       |

## 10. Smoke Tests

```bash
# Run the full smoke test suite
bash scripts/staging-smoke-test.sh http://localhost:4001

# Tests include:
# - Health/readiness endpoints
# - Authentication (invalid credentials)
# - Security headers (HSTS, X-Frame-Options)
# - Input validation (SQL injection)
# - Frontend reachability
```

## 11. Backup & Restore

See `docs/runbooks/staging-backup-restore.md` for the complete procedure.

### Quick Reference

```bash
# Backup
pg_dump "$DATABASE_URL" | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Restore (into isolated database)
createdb restore_test
zcat backups/backup_*.sql.gz | psql restore_test
```

## 12. Rollback

See `docs/runbooks/staging-rollback.md` for the complete procedure.

### Quick Reference

```bash
# Code rollback
docker compose -f docker-compose.staging.yml --env-file .env.staging \
  up -d --force-recreate backend

# Verify
curl http://localhost:4001/v1/health/live
```

## 13. TLS / Domain (NOT PROVIDED)

For production, you need:

1. **Domain name** — DNS A record pointing to your server
2. **TLS certificate** — Let's Encrypt (free) or commercial
3. **Reverse proxy** — Nginx/Caddy with TLS termination
4. **HSTS** — Enabled after TLS is verified
5. **CORS** — Update `CORS_ORIGINS` with your domain

See `docs/H23_REAL_STAGING_VALIDATION.md` Section 5 for details.

## 14. Security Considerations

| Control               | Status       | Notes                |
| --------------------- | ------------ | -------------------- |
| JWT authentication    | ✅ Active    | H16                  |
| Role-based access     | ✅ Active    | PermissionsGuard     |
| Tenant isolation      | ✅ Active    | Organization scoping |
| Rate limiting         | ✅ Active    | H13                  |
| Security headers      | ✅ Active    | H14                  |
| Input validation      | ✅ Active    | H15                  |
| Upload security       | ✅ Active    | H12                  |
| Audit logging         | ✅ Active    | H17                  |
| Supply-chain security | ✅ Active    | H18-H20              |
| Zero vulnerabilities  | ✅ Confirmed | pnpm audit           |

## 15. Troubleshooting

| Issue                        | Solution                                              |
| ---------------------------- | ----------------------------------------------------- |
| Backend won't start          | Check DATABASE_URL, JWT_SECRET ≥ 32 chars             |
| Database connection refused  | Ensure PostgreSQL container is healthy                |
| Redis connection refused     | Ensure Redis container is running                     |
| Migration fails              | Check DATABASE_URL, ensure user has CREATE权限        |
| Frontend can't reach backend | Check CORS_ORIGINS includes frontend origin           |
| Health check fails           | Check application logs: `docker compose logs backend` |
| Build fails                  | Run `pnpm install --frozen-lockfile` first            |

## 16. External Infrastructure Requirements

| Requirement        | Status   | Priority | Notes                                      |
| ------------------ | -------- | -------- | ------------------------------------------ |
| PostgreSQL hosting | EXTERNAL | P0       | Supabase, AWS RDS, or Neon                 |
| Redis hosting      | EXTERNAL | P0       | Upstash, Redis Cloud, or self-hosted       |
| Domain + TLS       | EXTERNAL | P0       | Cloudflare, Route53, or Let's Encrypt      |
| Object storage     | EXTERNAL | P1       | AWS S3, Cloudflare R2, or Supabase Storage |
| Razorpay sandbox   | EXTERNAL | P2       | For payment testing                        |
| Sentry             | EXTERNAL | P2       | For error monitoring                       |
| SMTP server        | EXTERNAL | P2       | For notifications                          |
| Load balancer      | EXTERNAL | P1       | For production traffic distribution        |

## 17. Known Limitations

1. **SQLite in local dev** — Development uses SQLite; production uses PostgreSQL. Some SQLite-specific behaviors may not surface until staging.
2. **No TLS in local compose** — Local staging runs over HTTP. TLS requires a real domain + certificate.
3. **No real payment testing** — Razorpay sandbox credentials not provided. Payment E2E requires real sandbox setup.
4. **No monitoring integration** — Sentry/Grafana not connected. Structured logs are available but external monitoring is a manual step.
5. **No load testing** — k6/Artillery scripts exist but require a running staging server.
