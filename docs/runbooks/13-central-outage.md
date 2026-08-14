# Runbook 13 — Central Server Outage

**Goal:** Survive and recover from a central service outage with minimal customer impact (17.7/17.33/17.40).

## Principles

- The central server is the licensing authority, but **existing legitimate installations
  must not immediately lose data or access** — the client follows the bounded offline/grace
  policy (15.35) during the outage.
- Never make destructive changes during an incident.

## Steps

1. **Detect** — alerting fires on `/health/ready` not_ready, 5xx spike, DB outage (17.24).

2. **Assess scope**
   - Full outage (host/network/DB down) vs partial (payments only, license only).
   - Check status page (17.42) services: ERP, portal, license, activation, payments, downloads, updates.

3. **Declare incident + update status page** (Degraded / Outage).

4. **Containment / failover**
   - Restart replicas (`docker compose up -d --scale backend=2`).
   - DB: check replication/failover per hosting provider.
   - Verify health: `/health`, `/health/live`, `/health/ready`, `/metrics`.

5. **Customer impact**
   - License validation: clients fall back to offline grace — expected, safe (17.32/17.33).
   - Payments: webhook processing resumes automatically once API is back (idempotent replay, Runbook 08).
   - ERP usage: local-first; data syncs after recovery.

6. **Recovery**
   - Restore DB from latest verified backup if data loss occurred (Runbook 05).
   - Restart services in order: DB → backend → nginx → verify.
   - Re-run reconciliation jobs (license scheduler, payment reconciliation).

7. **Post-recovery verification** (17.40 drill)
   - State synchronizes: license validation returns server-authoritative answers again.
   - Payment webhooks replay without duplicates (idempotency keys).
   - Security events timestamp integrity — check for CLOCK_ROLLBACK events (15.9).

8. **Post-incident report** — detection, decision, backup selection, restore, restart,
   customer impact, RTO/RPO actuals vs targets, corrective actions.

## Targets (define per SLA)

- RPO: e.g., ≤ 24h (backup cadence)
- RTO: e.g., ≤ 4h
