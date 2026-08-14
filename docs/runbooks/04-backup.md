# Runbook 04 — Backup

**Goal:** Automated, monitored, encrypted backups with tested retention (17.6).

## Configuration

- Script: `scripts/backup.sh` (PostgreSQL `pg_dump` custom format) + `scripts/schedule-backup.sh` (cron wrapper).
- SQLite deployments use the in-app `BackupService` (`VACUUM INTO`, hourly auto-backup via KV settings).
- Retention: `RETENTION_DAYS=30` (default).

## Cron (host crontab)

```cron
0 2 * * * /opt/shranix-erp/scripts/schedule-backup.sh
```

## Verify a backup (daily)

```bash
./scripts/backup.sh verify <file>   # pg_restore --list integrity check
./scripts/backup.sh list
```

## Encryption (production requirement)

Backups may contain customer/license data. Encrypt at rest:

```bash
# option A: pg_dump | gpg
pg_dump "$DATABASE_URL" -Fc | gpg --encrypt --recipient ops@shranix.com > backup.dump.gpg
# option B: storage-level encryption (object storage SSE / disk LUKS)
```

## Monitoring

- Backup job success/failure must alert (17.24 — `backup_failure` alert).
- Check `backups/backup.log` + `backups/scheduler.log` daily.

## Monthly restore test (17.6 — backup is not complete until restore is tested)

Run **Runbook 05** against staging once a month, and verify:
customer, subscription, billing, license, device, activation, audit, security-event data all present.
