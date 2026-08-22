# SHRANIX ERP — Staging Backup & Restore Runbook

## Overview

This runbook documents the procedure for backing up and restoring a SHRANIX ERP staging PostgreSQL database.

## Prerequisites

- Access to the staging PostgreSQL instance
- `pg_dump` and `psql` client tools available
- Sufficient disk space for backup artifacts
- Isolated restore target database (never restore over production)

## 1. Backup Procedure

### 1.1 Create Backup

```bash
# Set environment
export BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
export BACKUP_FILE="shranix_staging_backup_${BACKUP_DATE}.sql.gz"
export DATABASE_URL="postgresql://shranix:PASSWORD@localhost:5432/shranix_erp"

# Create compressed backup
pg_dump "$DATABASE_URL" | gzip > "./backups/$BACKUP_FILE"

echo "Backup created: ./backups/$BACKUP_FILE"
```

### 1.2 Verify Backup Artifact

```bash
# Check file exists and has content
ls -lh "./backups/$BACKUP_FILE"

# Verify gzip integrity
gzip -t "./backups/$BACKUP_FILE" && echo "Backup integrity: OK"

# Count table rows in backup
zcat "./backups/$BACKUP_FILE" | grep -c "COPY public\." || true
```

### 1.3 Backup Checklist

- [ ] Backup file created successfully
- [ ] File size is reasonable (not empty, not truncated)
- [ ] Gzip integrity check passes
- [ ] Backup includes all expected tables
- [ ] Backup timestamp recorded

## 2. Restore Procedure

### 2.1 Create Isolated Restore Target

```bash
# Create a new database for restore (NEVER use production DB)
export RESTORE_DB="shranix_restore_test_${BACKUP_DATE}"
psql -U postgres -c "CREATE DATABASE $RESTORE_DB;"
```

### 2.2 Restore Backup

```bash
# Restore into isolated database
zcat "./backups/$BACKUP_FILE" | psql -U postgres -d "$RESTORE_DB" -q

echo "Restore completed into: $RESTORE_DB"
```

### 2.3 Verify Restore Integrity

```bash
# Compare critical table counts
for table in users products customers suppliers sales inventory; do
  echo "Table: $table"
  psql -U postgres -d "$RESTORE_DB" -c "SELECT COUNT(*) FROM public.$table;" -t
done

# Verify migration journal
psql -U postgres -d "$RESTORE_DB" -c \
  "SELECT * FROM public.__drizzle_migrations ORDER BY created_at;" -t

# Verify no orphaned records
psql -U postgres -d "$RESTORE_DB" -c \
  "SELECT table_name, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

### 2.4 Restore Checklist

- [ ] Isolated restore database created
- [ ] Restore completed without errors
- [ ] All critical table row counts match backup
- [ ] Migration journal is intact
- [ ] No orphaned or corrupt records detected
- [ ] Schema matches expected version

## 3. RPO / RTO Measurement

### 3.1 RPO (Recovery Point Objective)

```bash
# Record the timestamp of the last backup
echo "Last backup: $BACKUP_DATE"
echo "Expected RPO: Time between last backup and failure event"
```

### 3.2 RTO (Recovery Time Objective)

```bash
# Time the restore process
START_TIME=$(date +%s)

# ... perform restore ...

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Restore duration: ${DURATION}s"
echo "Observed RTO: ≤ ${DURATION}s for staging dataset"
```

## 4. Cleanup

```bash
# Drop the test restore database after verification
psql -U postgres -c "DROP DATABASE IF EXISTS $RESTORE_DB;"
echo "Cleanup complete"
```

## 5. Production Considerations

| Aspect           | Staging          | Production                      |
| ---------------- | ---------------- | ------------------------------- |
| Backup frequency | On-demand        | Daily automated + WAL archiving |
| Backup storage   | Local filesystem | S3/GCS with versioning          |
| Restore target   | Isolated test DB | Never production directly       |
| RPO target       | Best effort      | ≤ 1 hour (WAL-based)            |
| RTO target       | < 5 minutes      | < 15 minutes                    |
| Encryption       | Optional         | Required at rest + transit      |
| Retention        | 7 days           | 30 days minimum                 |

## 6. Automated Backup (Recommended for Production)

```bash
# Add to crontab for daily automated backups
# 0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/shranix-backup.log 2>&1
```

## 7. Troubleshooting

| Issue                                 | Solution                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| pg_dump fails with permission error   | Ensure DB user has READ access to all tables                       |
| Restore fails on constraint violation | Check for missing foreign key targets; restore parent tables first |
| Backup file is empty                  | Verify DATABASE_URL is correct and DB is running                   |
| Restore is slower than expected       | Check disk I/O; consider using `--no-owner` for faster restore     |
| Migration mismatch after restore      | Run `drizzle-kit push` to verify schema alignment                  |
