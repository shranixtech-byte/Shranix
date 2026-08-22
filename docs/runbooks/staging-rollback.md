# SHRANIX ERP — Staging Rollback Runbook

## Overview

This runbook documents the procedure for rolling back a SHRANIX ERP staging deployment to a previous known-good state.

## Types of Rollback

| Type                  | When                  | Risk | Downtime |
| --------------------- | --------------------- | ---- | -------- |
| **Code Rollback**     | Bad code deploy       | Low  | Seconds  |
| **Config Rollback**   | Bad env/config change | Low  | Seconds  |
| **Database Rollback** | Bad migration         | HIGH | Minutes  |
| **Data Restore**      | Data corruption/loss  | HIGH | Minutes  |

**Rule:** Never use database rollback as a substitute for proper code rollback.

## 1. Code Rollback

### 1.1 Docker Deployment

```bash
# Rollback to previous image tag
export PREVIOUS_TAG="1.0.0-previous"  # Use the known-good tag
docker compose -f docker-compose.staging.yml \
  --env-file .env.staging \
  pull backend:$PREVIOUS_TAG

# Restart backend with previous image
docker compose -f docker-compose.staging.yml \
  --env-file .env.staging \
  up -d --force-recreate backend

# Verify health
curl -f http://localhost:4001/v1/health/live
```

### 1.2 Git Rollback (Development)

```bash
# Identify the commit to rollback to
git log --oneline -10

# Create a revert commit (preserves history)
git revert HEAD --no-edit

# Deploy the reverted code
```

### 1.3 Code Rollback Checklist

- [ ] Identified the known-good version/commit
- [ ] Built or pulled the previous image
- [ ] Deployed previous version
- [ ] Verified health endpoint returns OK
- [ ] Verified no database schema mismatch
- [ ] Smoke tests pass

## 2. Configuration Rollback

```bash
# Restore previous environment file
cp .env.staging.backup .env.staging

# Restart services
docker compose -f docker-compose.staging.yml \
  --env-file .env.staging \
  restart backend

# Verify
curl -f http://localhost:4001/v1/health/ready
```

### 2.2 Configuration Rollback Checklist

- [ ] Previous config backup identified
- [ ] Config restored from backup
- [ ] Services restarted
- [ ] Health checks pass
- [ ] No secrets accidentally exposed

## 3. Database Migration Rollback

**WARNING:** Database rollback is risky. Only use when a migration has caused data loss or corruption.

### 3.1 Check Migration Status

```bash
# See applied migrations
psql -U shranix -d shranix_erp -c \
  "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

### 3.2 Migration Rollback Options

**Option A: Revert the migration code**

```bash
# 1. Revert the code to the previous version
# 2. Deploy the reverted code
# 3. The application uses the previous schema
```

**Option B: Restore from backup (preferred for staging)**

```bash
# 1. Create backup of current state
pg_dump "$DATABASE_URL" | gzip > ./backups/pre-rollback_$(date +%Y%m%d).sql.gz

# 2. Restore from known-good backup
# (see staging-backup-restore.md)

# 3. Verify restored data integrity
```

### 3.3 Migration Rollback Checklist

- [ ] Root cause identified
- [ ] Backup of current state created
- [ ] Rollback method selected (revert code vs restore backup)
- [ ] Rollback executed
- [ ] Schema integrity verified
- [ ] Data integrity verified
- [ ] Application health confirmed

## 4. Data Restore

```bash
# For data corruption or accidental deletion
# (see staging-backup-restore.md for full procedure)

# 1. Identify last known-good backup
ls -lh ./backups/shranix_staging_backup_*.sql.gz

# 2. Restore into isolated database first
# 3. Verify data integrity
# 4. If correct, restore into staging
```

## 5. Rollback Decision Matrix

| Symptom                 | Action                            |
| ----------------------- | --------------------------------- |
| Health check failing    | Code rollback                     |
| Auth broken             | Code rollback                     |
| API returning 500s      | Code rollback                     |
| Data corruption         | Data restore                      |
| Migration error         | Code rollback or migration revert |
| Performance degradation | Config rollback                   |
| Security vulnerability  | Immediate code rollback           |

## 6. Post-Rollback Verification

After any rollback:

```bash
# 1. Health checks
curl -f http://localhost:4001/v1/health/live
curl -f http://localhost:4001/v1/health/ready

# 2. Smoke tests
bash scripts/staging-smoke-test.sh http://localhost:4001

# 3. Verify key data
psql -U shranix -d shranix_erp -c "SELECT COUNT(*) FROM users;"
psql -U shranix -d shranix_erp -c "SELECT COUNT(*) FROM products;"

# 4. Check logs for errors
docker compose -f docker-compose.staging.yml logs --tail=50 backend
```

## 7. Prevention

| Practice                            | Benefit                         |
| ----------------------------------- | ------------------------------- |
| Every migration has a rollback path | Safer database changes          |
| Feature flags for new code          | Instant rollback without deploy |
| Blue-green deployments              | Zero-downtime rollback          |
| Database backups before migration   | Safe restore point              |
| Staging mirrors production schema   | Catch migration issues early    |
