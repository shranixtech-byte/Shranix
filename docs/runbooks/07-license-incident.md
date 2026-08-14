# Runbook 07 — License Incident

**Goal:** Resolve license/activation anomalies without harming legitimate customers (17.51).
**Principle:** security controls escalate to verification/transfer/review — never permanent lockout.

## Common scenarios

### A. Legitimate customer can't activate (device limit, hardware change)

1. Verify the customer is who they say (portal login / support verification).
2. Use the **device transfer** flow (`POST /licenses/transfers` admin approval) — never manual DB edits.
3. If hardware changed (SSD/board/Windows reinstall): transfer device slot to the new device (17.51).

### B. Suspicious activation pattern (clone detection, 15.14)

1. Inspect security events: `GET /security/events?type=SUSPICIOUS_ACTIVATION`.
2. If the customer is legitimate → proceed, log the reason, adjust confidence.
3. If abuse confirmed → enforce device limit, revoke the offending device only.

### C. Revoked license keeps validating (cached state)

1. Confirm revocation was applied server-side.
2. The client's revalidation policy forces server checks within the grace window (15.35).
3. If the client ignores it, the update check / version policy can require a newer build.

### D. Offline token copied to another machine

1. Offline tokens are bound to installation+device+license (15.36) — copy fails signature/device binding.
2. Review `TOKEN_TAMPER` / `DEVICE_MISMATCH` events, escalate only if repeated.

## General steps

1. Reproduce with the reported license reference (masked in logs — use last-4, 15.29).
2. Check license status, device list, activation history, security events.
3. Apply the least-invasive fix (transfer > reissue > revoke).
4. Log the admin action with reason (17.18 — admin override must be visible).
5. Notify the customer through the portal/email when appropriate.

## Never

- Never manually `UPDATE licenses SET status=...` in the DB.
- Never ban a hardware permanently from a single signal (15.13).
