# Runbook 05 — Restore

**Goal:** Recover data from a backup with verification (17.6/17.39).

## Preconditions

- Backup file exists + passed `verify`.
- Target DB is **not** the live production DB unless this is a declared DR event.

## Steps (PostgreSQL)

1. **Stop writes** (put app in maintenance or stop backend replicas):

   ```bash
   ssh "cd $APP_DIR && docker compose stop backend"
   ```

2. **Restore**:

   ```bash
   ./scripts/backup.sh restore /opt/shranix-erp/backups/shranix_erp_YYYYMMDD_HHMMSS.dump
   ```

3. **Verify data** — count rows across critical tables:

   ```bash
   psql "$DATABASE_URL" -c "select count(*) from customers;"
   psql "$DATABASE_URL" -c "select count(*) from subscriptions;"
   psql "$DATABASE_URL" -c "select count(*) from licenses;"
   psql "$DATABASE_URL" -c "select count(*) from devices;"
   psql "$DATABASE_URL" -c "select count(*) from activations;"
   psql "$DATABASE_URL" -c "select count(*) from audit_logs;"
   psql "$DATABASE_URL" -c "select count(*) from security_events;"
   ```

4. **Start app + smoke test** (health, login, license validation).

5. **Post-restore consistency** (17.6/17.38):
   - License history consistent — run the license scheduler's consistency check.
   - Payment webhook state re-syncs (Runbook 08) — replay any webhooks newer than the backup snapshot.

## SQLite deployments

Use the in-app restore (`BackupService.restoreBackup` — online ATTACH + table copy) or replace `data/dev.db` from a `backup-*.db` snapshot while the app is stopped.

## Never

- Never restore an **older** backup over a **newer** one without explicit approval (data-loss risk).
- Never restore while the app is writing.
