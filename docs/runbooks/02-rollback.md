# Runbook 02 — Rollback

**Goal:** Return to a known-good version quickly when a deploy breaks.
**Trigger:** App fails to start, critical 5xx spike, data corruption, security issue in new version.

## Steps

1. **Confirm the breakage** — do not roll back on a single flaky request:

   ```bash
   curl -fsS https://api.shranix.in/v1/health/ready   # not_ready?
   tail -100 /opt/shranix-erp/logs/backend.log         # stack traces?
   ```

2. **Backup the database first** (rollback + restore both directions):

   ```bash
   ./scripts/backup.sh backup
   ```

3. **Deploy the previous image tag**

   ```bash
   # GitHub UI → Actions → Deploy → tag: <previous vX.Y.Z>
   ```

4. **Downgrade database ONLY if the new migration was applied and is incompatible.**
   - Migrations are forward-only (17.5). A destructive downgrade requires a **restore from backup** instead (Runbook 05).
   - If the schema is compatible (common case), leave it — old app tolerates new columns.

5. **Smoke test** (same as Runbook 01 steps 5–7).

6. **Post-incident:** file the failure, attach error IDs / request IDs from logs (17.25).

## Decision table

| Symptom                           | Action                                                               |
| --------------------------------- | -------------------------------------------------------------------- |
| App crash-loop                    | Rollback images only                                                 |
| New migration broke queries       | Rollback images + restore pre-migration backup (Runbook 05)          |
| Security issue in new code        | Rollback + apply security hotfix; never keep vulnerable version live |
| Payment/license data inconsistent | Stop new writes, escalate, restore + reconcile (Runbooks 05/08)      |

## Never

- Never roll forward data by hand-editing the DB.
- Never reuse the broken tag for the "previous" slot.
