# Runbook 06 — Security Incident

**Goal:** Contain, preserve evidence, and recover from a security incident (17.49/17.50).
**Golden rule: preserve evidence before fixing.** Never destroy logs/DB rows to "clean up".

## Incident classes

| Class           | Example                                            |
| --------------- | -------------------------------------------------- |
| Credential leak | Signing key, JWT secret, DB creds in a repo/log    |
| Abuse           | Activation abuse, device-limit race, replay spikes |
| Breach          | Unauthorized admin access, IDOR exploit            |
| Supply chain    | Malicious dependency, tampered update package      |

## Steps

1. **Assess severity** (17.31):
   - INFO/LOW: log, monitor.
   - MEDIUM/HIGH/CRITICAL: this runbook.
   - CRITICAL (signing key, full DB breach): pager + freeze new signings.

2. **Preserve evidence**

   ```bash
   # snapshot logs + security events before touching anything
   ./scripts/backup.sh backup
   pg_dump "$DATABASE_URL" -Fc -t security_events -t audit_logs > incident_events_$(date +%s).dump
   ```

3. **Contain**
   - Revoke compromised tokens: `POST /licenses/revoke` or emergency key rotation (Runbook 11).
   - Suspend affected licenses/devices via admin UI (Phase 13) — record reason (17.18).
   - Rotate any exposed secrets (JWT_SECRET, webhook secrets, storage keys).
   - Block source IPs at the reverse proxy if clearly abusive.

4. **Investigate**
   - Query security events: `GET /security/events?severity=HIGH&from=...` (Phase 15).
   - Correlate with audit trail + logs using request IDs (17.23/17.25).

5. **Remediate** — fix root cause, ship hotfix through the normal pipeline (Runbook 01).

6. **Recover + verify** — restore if data affected (Runbook 05), then smoke test.

7. **Post-incident** — write incident report: timeline, evidence, root cause, actions, lessons.
   - Update threat model (docs/PHASE15_SECURITY.md) if the model missed this.

## Key compromise procedure (17.50)

1. Stop issuing with the compromised key.
2. Generate replacement key (`openssl genrsa -out signing.key 4096`), publish new key ID.
3. Keep old-key verification window (Phase 15 key ring supports rotation).
4. Reissue affected tokens; revoke compromised ones.
5. Audit + notify affected customers where appropriate.
