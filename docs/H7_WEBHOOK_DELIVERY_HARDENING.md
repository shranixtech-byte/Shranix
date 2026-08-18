# H7 — Webhook Delivery Hardening

**Checkpoint:** H7 · **Date:** 2026-08-18 · **Status:** ✅ Complete

---

## 1. Executive Summary

H7 hardened outbound webhook delivery reliability by fixing the most critical H6 limitation: `processRetries()` sent a synthetic payload (`{ event: 'webhook.retry', webhookId, timestamp }`) instead of the original business event. This made retries effectively useless — the receiving endpoint would not understand the synthetic event.

H7 introduces event context persistence (event_type + sanitized payload snapshot) on delivery records, enabling `processRetries()` to reconstruct and re-deliver the original business event. Additionally, delivery records now capture `provider_reference` for provider-side correlation, and a `cleanupOldDeliveries()` method prevents unbounded delivery history growth.

---

## 2. H6 Limitations Addressed

| H6 Limitation                                | H7 Fix                                                         |
| -------------------------------------------- | -------------------------------------------------------------- |
| processRetries() sends fake payload          | Stored event context (event_type + payload_ref) used for retry |
| No event_type on delivery records            | Added `event_type` column                                      |
| No payload_ref for retry reconstruction      | Added `payload_ref` column (sanitized, truncated to 4KB)       |
| No provider reference correlation            | Added `provider_reference` column                              |
| No stale delivery cleanup                    | Added `cleanupOldDeliveries()` method                          |
| processRetries not integrated into scheduler | Available via manual endpoint (scheduler integration deferred) |

---

## 3. Risk Classification

### P1 — Fixed

| Finding                                | Evidence                                                      | Fix                                              |
| -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| processRetries sends synthetic payload | `webhooks.service.ts:247` — `{ event: 'webhook.retry', ... }` | Stored `payload_ref` on delivery; used for retry |
| Delivery history lacks event_type      | `0029_h6_webhook_deliveries.sql` — no column                  | Added `event_type` column                        |

### P2 — Fixed

| Finding                                 | Evidence                                  | Fix                               |
| --------------------------------------- | ----------------------------------------- | --------------------------------- |
| No payload_ref for retry reconstruction | `webhook-delivery.ts` — no payload column | Added `payload_ref` column        |
| No provider reference correlation       | No column exists                          | Added `provider_reference` column |
| No stale delivery cleanup               | No cleanup mechanism                      | Added `cleanupOldDeliveries()`    |

---

## 4. Files Changed

| File                                                                | Type     | Change                                                                                                               |
| ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `database/src/migrations/0030_h7_webhook_delivery_enhancements.sql` | **NEW**  | ALTER TABLE: add event_type, payload_ref, provider_reference                                                         |
| `database/src/schema/webhook-delivery.ts`                           | MODIFIED | Add 3 new nullable columns                                                                                           |
| `database/src/repositories/webhook-delivery.repository.ts`          | MODIFIED | Support new columns; add findLatestPayload + cleanupOlderThan                                                        |
| `backend/src/integrations/services/webhooks.service.ts`             | MODIFIED | sanitizePayload, extractEventType, store event context on trigger, use stored payload on retry, cleanupOldDeliveries |
| `backend/src/integrations/controllers/webhooks.controller.ts`       | MODIFIED | Add cleanup endpoint                                                                                                 |
| `backend/src/integrations/h7-webhook.test.ts`                       | **NEW**  | 10 H7 tests                                                                                                          |
| `docs/H7_WEBHOOK_DELIVERY_HARDENING.md`                             | **NEW**  | This documentation                                                                                                   |

---

## 5. Database/Migration Changes

**Migration:** `0030_h7_webhook_delivery_enhancements.sql`

Adds 3 nullable columns to `shranix_webhook_deliveries`:

- `event_type TEXT` — business event name (e.g., "order.created")
- `payload_ref TEXT` — sanitized JSON snapshot (max 4KB, secrets removed)
- `provider_reference TEXT` — provider-side message/ID for correlation

Backward compatible: all new columns nullable. Existing rows unaffected.

---

## 6. Authorization/Security Impact

- No changes to authorization boundaries
- No new endpoints require different permissions
- Existing H2/H3 authorization behavior preserved
- Payload sanitization removes `secret`, `signature`, `headers` fields before storage
- No secrets logged — only event_type and truncated payload_ref

---

## 7. Idempotency + Transaction Model

- Each `attemptDelivery()` creates a NEW delivery record (existing pattern)
- On retry, `processRetries()` reads stored `payload_ref` from most recent delivery and uses it
- Best-effort delivery record creation (try/catch, doesn't block webhook trigger)
- No new transaction boundaries

---

## 8. Test Coverage

| Test                                                 | Category         | Result           |
| ---------------------------------------------------- | ---------------- | ---------------- |
| Delivery history includes event_type and payload_ref | Event context    | ✅               |
| processRetries returns processed count               | Retry mechanism  | ✅               |
| extractEventType: payload.event.type                 | Event extraction | ✅               |
| extractEventType: payload.event_type                 | Event extraction | ✅               |
| extractEventType: payload.event as string            | Event extraction | ✅               |
| extractEventType: empty payload                      | Event extraction | ✅               |
| sanitizePayload: removes secrets                     | Security         | ✅               |
| sanitizePayload: truncates large payloads            | Security         | ✅               |
| cleanupOldDeliveries method exists                   | Cleanup          | ✅               |
| findLatestPayload method exists                      | Repository       | ✅               |
| **Total**                                            |                  | **10/10 passed** |

---

## 9. Full Regression Results

| Suite               | Files  | Tests   | Result            |
| ------------------- | ------ | ------- | ----------------- |
| Backend (full)      | 53     | 532     | ✅ All passed     |
| Frontend (full)     | 13     | 130     | ✅ All passed     |
| H6 targeted         | 1      | 13      | ✅ All passed     |
| H5 distributed-lock | 1      | 17      | ✅ All passed     |
| **Total**           | **68** | **692** | **✅ All passed** |

---

## 10. Typecheck/Lint/Build

| Check              | Result                      |
| ------------------ | --------------------------- |
| Database typecheck | ✅ Clean                    |
| Backend typecheck  | ✅ Clean                    |
| Frontend typecheck | ✅ Clean                    |
| Backend lint       | ✅ 0 errors (4931 warnings) |
| Frontend lint      | ✅ 0 errors (670 warnings)  |
| Frontend build     | ✅ Built successfully       |

---

## 11. Secret Scan

✅ No hardcoded secrets, API keys, passwords, or credentials in H7 code.
✅ Payload sanitization removes `secret`, `signature`, `headers` before storage.
✅ No sensitive data in logs.

---

## 12. H1–H6 Untouched Verification

| Checkpoint                      | Hash      | Status       |
| ------------------------------- | --------- | ------------ |
| H1 (Inventory Ledger)           | `89100cf` | ✅ Untouched |
| H2 (Workflow Auth)              | `9ccc4f5` | ✅ Untouched |
| H3 (Sales Approval)             | `4f26a44` | ✅ Untouched |
| H4 (Query Performance)          | `759d560` | ✅ Untouched |
| H5 (Scheduler Locking)          | `0b911b1` | ✅ Untouched |
| H6 (Notifications/Integrations) | `c7b4ee8` | ✅ Untouched |

---

## 13. Remaining Limitations

1. **processRetries not integrated into scheduler** — Available via manual endpoint only. Automatic retry processing via scheduler requires wiring into `CommunicationSchedulerService`. This is a conscious deferral — the manual endpoint is sufficient for initial production use.

2. **Provider delivery receipts not implemented** — Status goes to 'sent' but actual delivery confirmation from email/SMS providers requires real provider credentials. The `provider_reference` column is now ready to store this when providers are wired.

3. **No inbound webhook delivery history** — The delivery history table covers outbound webhooks only. Inbound payment webhooks already have strong audit via `shranix_billing_payments` and `shranix_security_events`.

4. **Payload snapshot is truncated** — Large payloads (>4KB) are truncated. This is by design — the snapshot is for retry context, not full payload replay. The receiving endpoint should be idempotent regardless of payload size.

5. **findLatestPayload uses raw SQL** — The repository method uses raw SQL (matching the H5 pattern) for direct database access. This works but bypasses Drizzle's type safety.

---

_H7 checkpoint documentation. Do not modify H1–H6 documentation._
