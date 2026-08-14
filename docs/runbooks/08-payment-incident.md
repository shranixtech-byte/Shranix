# Runbook 08 — Payment Incident

**Goal:** Keep subscription/license state consistent when payments go wrong (17.35).
**Principle:** Never activate a subscription from an unverified webhook (15.22).

## Common scenarios

### A. Webhook signature failure spike

1. Verify webhook secret matches the payment provider dashboard.
2. Check `security_events` for `SIGNATURE_FAILURE`-class events (Phase 15).
3. Confirm timestamps within the replay window (15.22) — reject old replays.

### B. Duplicate or delayed webhook

1. The webhook handler is idempotent by payment reference (Phase 12).
2. Delayed webhook: reconciliation job / manual reprocess from provider dashboard events.
3. Verify subscription status matches the provider's invoice state.

### C. Payment succeeded but subscription not activated

1. Look up the payment reference in provider dashboard.
2. Check webhook delivery logs (retries, provider events page).
3. Reprocess the event via admin (Phase 12 admin surface) — do NOT hand-edit DB.

### D. Refund / chargeback

1. Refund webhook updates billing state.
2. If refund > grace period: subscription suspends per plan policy; license follows (grace → suspended).
3. Verify device/activation behavior matches the license scheduler.

## Steps

1. Confirm payment state in provider dashboard (source of truth).
2. Confirm our subscription/payment records (`GET /commercial/...` admin).
3. Reconcile via the existing reconciliation path.
4. If inconsistent: reprocess webhook → verify → escalate to finance admin.

## Never

- Never create subscriptions by DB insert.
- Never trust client-claimed payment success (Phase 15 security authority).
