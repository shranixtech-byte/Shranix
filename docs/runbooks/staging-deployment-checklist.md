# SHRANIX ERP — Staging Deployment Checklist

## Overview

This checklist ensures deterministic, repeatable staging deployments.

## Pre-Deploy

- [ ] Clean working tree (`git status` shows no uncommitted changes)
- [ ] Correct commit checked out (`git log --oneline -1`)
- [ ] Lockfile verified (`pnpm install --frozen-lockfile` succeeds)
- [ ] Environment file present (`.env.staging` with valid values)
- [ ] Secrets validated (JWT_SECRET ≥ 32 chars, DB password set)
- [ ] PostgreSQL accessible (connection test passes)
- [ ] Redis accessible (connection test passes)
- [ ] Object storage accessible (MinIO/S3 connection test passes)
- [ ] No port conflicts (ports 80, 4001, 5432, 6379, 9000 available)
- [ ] Sufficient disk space (≥ 2GB free)

## Build

- [ ] Install dependencies: `pnpm install --frozen-lockfile`
- [ ] Build database package: `pnpm --filter @shranix/database build`
- [ ] Build shared package: `pnpm --filter @shranix/shared build`
- [ ] Build backend: `pnpm --filter @shranix/backend build`
- [ ] Build frontend: `pnpm --filter @shranix/frontend build`
- [ ] Build completed without errors

## Database

- [ ] PostgreSQL connection verified
- [ ] Run migrations: `cd database && pnpm drizzle-kit push`
- [ ] Migration status verified: `pnpm drizzle-kit check`
- [ ] Schema generation clean: `pnpm drizzle-kit generate`
- [ ] No destructive migration warnings
- [ ] Seed data loaded (if applicable)

## Deploy

- [ ] Docker images built (or pre-built images pulled)
- [ ] Backend container started
- [ ] Frontend container started
- [ ] All services healthy (`docker compose ps`)
- [ ] Backend health: `curl http://localhost:4001/v1/health/live`
- [ ] Backend readiness: `curl http://localhost:4001/v1/health/ready`
- [ ] Frontend reachable: `curl http://localhost:80`

## Post-Deploy Smoke Tests

- [ ] Run smoke test: `bash scripts/staging-smoke-test.sh http://localhost:4001`
- [ ] Login flow works (invalid credentials returns 401)
- [ ] Health endpoints respond correctly
- [ ] Security headers present (HSTS, X-Frame-Options, etc.)
- [ ] Rate limiting active (rapid requests get limited)
- [ ] Swagger docs accessible at `/api/docs`
- [ ] No 5xx errors in logs

## Security Verification

- [ ] Authentication guard active (JWT required for protected routes)
- [ ] Authorization guards active (roles/permissions enforced)
- [ ] Input validation active (malformed input rejected)
- [ ] Upload security active (file type/size limits enforced)
- [ ] Audit logging active (events recorded)
- [ ] No secrets in logs or responses
- [ ] CORS configured for staging origins only

## Monitoring

- [ ] Structured JSON logs flowing
- [ ] Request IDs generated and included in responses
- [ ] Error tracking active (Sentry or equivalent)
- [ ] Health metrics endpoint responsive

## Rollback Readiness

- [ ] Previous version identified and accessible
- [ ] Rollback procedure documented
- [ ] Backup created before deployment
- [ ] Rollback tested (dry run if possible)

## Sign-Off

| Item              | Status | Notes |
| ----------------- | ------ | ----- |
| All checks pass   | ☐      |       |
| Smoke tests pass  | ☐      |       |
| Security verified | ☐      |       |
| Rollback ready    | ☐      |       |
| Operator          | ☐      |       |
| Timestamp         | ☐      |       |
