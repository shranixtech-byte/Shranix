# Runbook 03 — Database Migration

**Goal:** Apply schema changes safely with zero manual editing (17.5/17.20).
**Rule:** All schema changes go through `drizzle-kit` migrations in `database/src/migrations/`.

## Pipeline (17.20)

```
Backup → Validate → Staging migration → Staging tests → Approval → Production migration → Smoke test
```

## Steps

1. **Backup production** (non-negotiable):

   ```bash
   ./scripts/backup.sh backup
   ```

2. **Validate the migration locally**

   ```bash
   cd database && pnpm db:migrate   # against dev db — must succeed
   cd ../backend && npx vitest run   # regression
   ```

3. **Apply on staging first**, run the test suite against staging.

4. **Get approval** for production migration (change-controlled, 17.13/17.20).

5. **Apply on production** (downtime window if migration is long-running):

   ```bash
   ssh "cd $APP_DIR && DATABASE_URL='$PROD_DB_URL' pnpm --filter @shranix/database db:migrate"
   ```

6. **Verify applied version**:

   ```bash
   ssh "psql $PROD_DB_URL -c 'select * from __drizzle_migrations order by id desc limit 3;'"
   ```

7. **Smoke test** — health, login, one license validation, one payment lookup.

## Guardrails

- Never run `db:migrate` from a dev machine against production URL.
- Never manually `CREATE TABLE`/`ALTER TABLE` on production.
- Destructive migrations must be reviewed by a second person.
- On failure mid-migration: restore from backup (Runbook 05), do **not** re-run blindly.
