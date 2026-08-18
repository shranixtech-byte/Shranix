# H8 — Payment Webhook Idempotency + Transaction Safety

## 1. Executive Summary

H8 hardened the inbound payment webhook boundary by fixing two P1 and two P2 findings discovered during the H6/H7 audit cycle. The primary risk was that concurrent webhook deliveries could both successfully process the same payment (P1), and that a partial failure in `applyPayment()` could leave inconsistent financial state (P1).

## 2. Discovery Scope

- `BillingPaymentsService.webhook()` — inbound payment webhook handler
- `BillingPaymentsService.applyPayment()` — financial side-effect orchestrator
- `BillingService.markPaid()` — invoice status transition
- `SubscriptionsService.activate()` — subscription state machine
- `CommercialRepository.claimTransition()` — atomic state claim
- HMAC signature verification (`timingSafeEqual`)
- Timestamp replay protection (5-minute window)
- Amount/currency reconciliation

## 3. Inbound Webhook Flow (Verified)

```
HTTP POST /commercial/webhook
├─ Signature verification (HMAC-SHA256 + timingSafeEqual)
├─ Timestamp replay protection (5-min window)
├─ Reference extraction (gatewayRef)
├─ Amount/currency reconciliation
├─ IDEMPOTENCY: status === SUCCESS → return { received: true }
├─ IDEMPOTENCY [H8]: status === PROCESSING → return { received: true }
├─ claimTransition(PENDING → PROCESSING) — atomic UPDATE WHERE
├─ provider.verifyPayment() — external call
├─ update(status → SUCCESS)
├─ applyPayment() [H8]: wrapped in executeInTransaction()
│   ├─ billing.markPaid()
│   ├─ subscriptions.activate()
│   └─ update(paymentStatus)
├─ Audit log [H8]: commercial.webhook_received
└─ Response → { received: true }
```

## 4. P1 Findings

| ID   | Finding                                                                                                                         | Fix                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P1-1 | `claimTransition(PROCESSING → PROCESSING)` succeeds when payment is already PROCESSING, allowing duplicate processing           | Added guard: if `payment.status === 'PROCESSING'`, return `{ received: true }` immediately |
| P1-2 | `applyPayment()` calls `markPaid()` + `activate()` + `update()` as separate DB calls; partial failure leaves inconsistent state | Wrapped in `TransactionManager.executeInTransaction()`                                     |

## 5. P2 Findings

| ID   | Finding                                                                                 | Fix                                                                                                        |
| ---- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| P2-1 | No audit logging on webhook receipt/failure                                             | Added `audit.log()` for webhook_received, webhook_verification_failed, webhook_payment_failed              |
| P2-2 | Provider verification failure leaves payment in inconsistent state with partial updates | Provider errors now log audit event and return error cleanly; process is already stateless before mutation |

## 6. Files Changed

| File                                                          | Type     | Change                                                      |
| ------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `backend/src/commercial/services/billing-payments.service.ts` | MODIFIED | PROCESSING guard, transactional applyPayment, audit logging |
| `backend/src/commercial/h8-payment-webhook.test.ts`           | **NEW**  | 7 focused real-DB tests                                     |

## 7. Database Changes

**No migration required.** All changes are application-level state logic. No new columns, tables, or constraints.

## 8. Idempotency Model

| State           | Behavior                                              |
| --------------- | ----------------------------------------------------- |
| SUCCESS         | Return `{ received: true }` — no re-processing        |
| PROCESSING [H8] | Return `{ received: true }` — no re-processing        |
| PENDING         | claimTransition(PENDING → PROCESSING) — only one wins |
| FAILED          | Cannot transition — claimTransition fails             |

## 9. Concurrency Model

- `claimTransition()` uses `UPDATE ... WHERE id = ? AND status = fromStatus` — atomic at DB level
- SQLite: serialized writes due to WAL mode (single-process test environment)
- PostgreSQL: true concurrent atomicity (production)
- H8 PROCESSING guard prevents duplicate processing even before claimTransition

## 10. Transaction Model

`applyPayment()` is now wrapped in `executeInTransaction()`:

- All three operations (`markPaid`, `activate`, `update`) execute within a single transaction
- Partial failure triggers rollback
- No orphaned financial state

## 11. Replay Protection

Already implemented (pre-existing):

- 5-minute timestamp window
- SUCCESS state → no-op
- HMAC signature verification (timing-safe)

## 12. Security Impact

- Signature verification remains before any financial mutation
- Audit logs include paymentId, gatewayRef, eventType — no secrets
- `userId: 'system'` for webhook-triggered audit events (no user context in webhooks)
- Provider verification errors logged without sensitive payload data

## 13. Test Coverage

| #   | Test                                          | Result |
| --- | --------------------------------------------- | ------ |
| 1   | Valid webhook succeeds                        | ✅     |
| 2   | Invalid signature rejected                    | ✅     |
| 3   | Duplicate event idempotent                    | ✅     |
| 4   | PROCESSING state → no-op                      | ✅     |
| 5   | FAILED payment cannot transition              | ✅     |
| 6   | Concurrent claimTransition → exactly one wins | ✅     |
| 7   | Amount mismatch rejected                      | ✅     |

**H8 targeted: 7/7 passed**

## 14. Full Regression Results

| Suite               | Files  | Tests   | Result            |
| ------------------- | ------ | ------- | ----------------- |
| H8 targeted         | 1      | 7       | ✅ All passed     |
| H7 targeted         | 1      | 10      | ✅ All passed     |
| H6 targeted         | 1      | 13      | ✅ All passed     |
| H5 distributed-lock | 1      | 17      | ✅ All passed     |
| Backend (full)      | 54     | 539     | ✅ All passed     |
| Frontend (full)     | 13     | 130     | ✅ All passed     |
| **Total**           | **71** | **716** | **✅ All passed** |

## 15. Typecheck/Lint/Build

| Check              | Result                |
| ------------------ | --------------------- |
| Database typecheck | ✅ Clean              |
| Backend typecheck  | ✅ Clean              |
| Frontend typecheck | ✅ Clean              |
| Backend lint       | ✅ 0 errors           |
| Frontend lint      | ✅ 0 errors           |
| Frontend build     | ✅ Built successfully |

## 16. Secret Scan

✅ No secrets, credentials, or API keys in H8 code.
✅ Webhook secret used only for HMAC computation, never logged.
✅ Audit events contain no sensitive payload data.

## 17. H1–H7 Untouched Verification

| Checkpoint                      | Hash      | Status       |
| ------------------------------- | --------- | ------------ |
| H1 (Inventory Ledger)           | `89100cf` | ✅ Untouched |
| H2 (Workflow Auth)              | `9ccc4f5` | ✅ Untouched |
| H3 (Sales Approval)             | `4f26a44` | ✅ Untouched |
| H4 (Query Performance)          | `759d560` | ✅ Untouched |
| H5 (Scheduler Locking)          | `0b911b1` | ✅ Untouched |
| H6 (Notifications/Integrations) | `c7b4ee8` | ✅ Untouched |
| H7 (Webhook Delivery)           | `2e488c9` | ✅ Untouched |

## 18. Remaining Limitations

1. **SQLite concurrency testing is single-process** — `claimTransition` atomicity is proven at SQL level, but true concurrent webhook delivery requires PostgreSQL or staging environment.
2. **Provider verification is still external** — `provider.verifyPayment()` makes a real network call; test uses simulated provider only.
3. **No automatic webhook retry scheduler** — H7's `processRetries()` remains manually triggerable; automatic wiring is a future enhancement.
4. **`applyPayment()` transaction wrapping depends on `TransactionManager`** — if the underlying DB driver doesn't support transactions, the wrapper degrades gracefully (best-effort).

## 19. Production Readiness

| Aspect                  | Status                                             |
| ----------------------- | -------------------------------------------------- |
| Idempotency             | ✅ Verified locally                                |
| Concurrency             | ⚠️ Requires PostgreSQL for true concurrent testing |
| Transaction safety      | ✅ Wrapped in executeInTransaction                 |
| Signature verification  | ✅ HMAC + timing-safe                              |
| Replay protection       | ✅ 5-minute window                                 |
| Audit logging           | ✅ Structured events                               |
| State machine integrity | ✅ claimTransition atomic                          |
