# H1 — INVENTORY LEDGER CONSOLIDATION

## Post-Audit Hardening — P1 Production-Blocking Data-Integrity Fix

**Status: COMPLETE** — all validations green (backend 457 tests, frontend 130 tests, typecheck/lint/build clean, migration verified).

---

## 1. Original Problem

The MASTER_AUDIT identified **two independent stock-ledger concepts** that could diverge:

| Ledger                     | Schema    | Written by                                         | Column convention                                                                |
| -------------------------- | --------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `shranix_inv_stock_ledger` | inventory | inventory services (opening/batch)                 | `transactionType / direction / balanceQuantity` + unique entry/reference numbers |
| `shranix_stock_ledger`     | purchase  | **sales posting, purchase posting, return engine** | `transactionType / beforeQty / afterQty` — no direction, no unique keys          |

Additionally a **third, in-memory "ledger"** existed: `stockMovements` (generic repo with **no backing table**) — written by batch/opening/adjustment flows and read by the stock ledger pages. Data written there was **lost on every restart**.

Evidence collected during discovery:

- Sales `posting-engine.service.ts` wrote `warehouseStock` + `stockLedger` (purchase schema) directly.
- Purchase `StockPostingService` + GRN + purchase return wrote the same legacy pair.
- Sales `return-engine.service.ts` called `stockLedger.create({ ... warehouse, movementType ... })` with columns that **do not exist** in `shranix_stock_ledger` → the write threw, was swallowed by a catch, and the return **silently never recorded stock**.
- Product master (`products.service.ts`) and `products-master.service.ts` read `invStockLedger`/`invStockBalance`, while analytics read `stockLedger` → **product stock display did not reconcile with posting**.
- `warehouseStock` deduction used `Math.max(0, ...)` — overselling was **silently clamped to zero** (no error, wrong stock).

## 2. Existing Ledger Architecture (dependency map)

```
WRITERS (pre-H1)                          READERS (pre-H1)
───────────────                           ───────────────
sales posting ──► shranix_stock_ledger    analytics ──► shranix_stock_ledger
purchase posting ─► shranix_stock_ledger  sales controllers (stock check) ─► warehouseStock
return engine ──► (broken write)          products.service ─► invStockBalance
batch/opening ──► in-memory stockMovements StockLedgerService ─► in-memory stockMovements
stock transfer ─► invStockLedger (some)    StockMovementService ─► in-memory stockMovements
```

## 3. Source-of-Truth Decision

**Canonical ledger = `shranix_inv_stock_ledger` + `shranix_inv_stock_balance` (projection).**

Rationale (evidence, not file names):

- `inv_stock_ledger` is the only ledger that can represent **all** movement categories: `opening`, `purchase_receipt`, `purchase_return`, `sales_issue`, `sales_return`, `transfer_in`, `transfer_out`, `adjustment`, `cycle_count`, `reservation`, `release`, `reversal`.
- It carries `direction` (IN/OUT/TRANSFER/RESERVE/RELEASE/REVERSAL), unique `entry_number` + `reference_number`, running `balance_quantity`/`balance_cost`, from/to warehouse, batch/lot/serial, and audit fields.
- It already has unique indexes and (with migration 0027) query indexes.
- `stock_ledger` (purchase) has **no unique constraints, no direction, no entry numbers** and cannot express transfers or reversals.
- `stockMovements` has **no table at all**.

`inv_stock_balance` is the performance projection (per warehouse+item `on_hand`), maintained in the same transaction as the ledger row.

## 4. Migration Strategy (0027_striped_spectrum.sql)

**Non-destructive.** No table dropped.

1. Added indexes on `shranix_inv_stock_ledger`: `(item_id)`, `(warehouse_id, item_id)`, `(transaction_date)`.
2. **Backfill** (one-time, deterministic, idempotent — `INSERT OR IGNORE` against the unique constraints):
   - `shranix_stock_ledger` → `shranix_inv_stock_ledger` (legacy movements with `LEGACY-*` entry/reference numbers; `sales_invoice` → `sales_issue`, direction inferred from type/quantity sign; running balance from `after_qty`).
   - `shranix_warehouse_stock` → `shranix_inv_stock_balance` (`quantity` → `on_hand`, reserved carried over).
3. Legacy tables retained and documented as **LEGACY / READ-ONLY / MIGRATED** — no application code writes to them anymore.

The migration applies cleanly on fresh databases (both H1 integration test files run migrations 0000→0027) and is a no-op when re-run.

## 5–8. Posting Engine Integration (H1.5)

All inventory-affecting flows now write the canonical ledger through one engine:

| Flow                             | Canonical write                                                         |
| -------------------------------- | ----------------------------------------------------------------------- |
| Sales invoice                    | `postMovementCore` → `sales_issue` OUT (inside the invoice transaction) |
| Purchase GRN                     | `postMovementCore` → `purchase_receipt` IN                              |
| Purchase return                  | `postMovementCore` → `purchase_return` OUT                              |
| Sales return                     | `postMovementCore` → `sales_return` IN (**fixes the silent-fail bug**)  |
| Transfer                         | `postTransfer` → `transfer_out` OUT + `transfer_in` IN                  |
| Adjustment / physical count      | `postMovementCore` → `adjustment` / `cycle_count`                       |
| Batch opening / batch adjustment | `postMovementCore` (was in-memory `stockMovements`)                     |
| Manual movement API              | `StockMovementService.create` → `postMovementCore` (was in-memory)      |

Key refactor: `InventoryPostingEngine.postMovementCore()` is now **transaction-boundary-free** — callers already inside a transaction (sales/purchase/return engines) call it directly so the movement joins their transaction; standalone callers use `postMovement()` which wraps it in a transaction. **No nested transaction system was introduced.**

## 9. Stock Calculation (H1.6)

One deterministic rule enforced by the engine:

```
Opening + Purchases + Transfer In + Adjustment In + Sales Returns
− Sales − Purchase Returns − Transfer Out − Adjustment Out ± Physical Count
= on_hand (shranix_inv_stock_balance)
```

The projection is updated in the same transaction as the ledger row; a reconciliation check (below) verifies `on_hand` always equals the ledger net.

## 10. Oversell / Negative-Stock Behavior (H1.7)

The old `Math.max(0, ...)` clamp is **gone from the enforcement path** (it remains only in a _display-only_ `closingQty` payload estimate, which never touches the ledger).

Final behavior:

- **Negative stock is NOT silently allowed.** An OUT that would drive `on_hand` below zero throws a controlled business error: `Insufficient stock for item X in warehouse Y: available N, requested M`.
- `allowNegative: true` exists as an explicit opt-in (reservation/release semantics already use RESERVE/RELEASE directions; physical-count reconciliation flows can pass it deliberately).
- Test 12/13 prove: oversell throws, balance is unchanged (never clamped to 0, never negative).

## 11. Transactional Integrity (H1.8)

- Sales posting: invoice header update + canonical movement all run inside `TransactionManager.executeInTransaction`. If `inv_stock_ledger.create` fails, **both the ledger row and the balance mutation roll back** — verified by the updated rollback test (Test 1) which now injects the failure at the **canonical** boundary and asserts: invoice returns to `draft`, zero ledger rows survive, balance projection restored to 100.
- Purchase GRN/return and sales return run inside their own engine transactions with the same join semantics.

## 12. Idempotency (H1.9)

- Sales invoice posting has an existing status guard (`already posted → skip`) — Test 8 proves no second movement is created.
- `reference_number` is unique; the engine's `uniqueReference()` appends a counter so multi-line documents never hit `SQLITE_CONSTRAINT_UNIQUE` (Test 10).
- Transfers guard against re-receipt of already-received quantities.

## 13. Concurrency / Race Conditions (H1.10)

- Balance mutations are read-modify-write inside a single DB transaction (serialized by SQLite/transaction isolation).
- Test 13 simulates the race outcome: stock 30, two concurrent-style sales of 20 → the first succeeds (10 left), the second **fails with a controlled error** — no negative stock, no impossible state.

## 14. Reconciliation (H1.14)

New `StockReconciliationService` (`GET /inventory/reconciliation/stock`, admin/manager, report-only):

- `balance_vs_ledger` — projection `on_hand` vs ledger net movement (HIGH)
- `balance_without_ledger` — balance rows with no matching movements (MEDIUM)
- `duplicate_entry_numbers` / `duplicate_reference_numbers` (CRITICAL/MEDIUM)
- `impossible_quantities` / `negative_balance` (HIGH)
- `orphan_ledger_warehouse` (LOW)
- `missing_entry_number` (CRITICAL)

**Report-only by design — it never mutates data.** Repair requires a separately designed, explicitly authorized operation. Tests prove it reports a healthy ledger on consistent data, detects a deliberately corrupted balance row, and changes nothing when run.

## 15. Readers — All Canonical (H1.11)

| Reader                                     | Pre-H1                     | Post-H1                                          |
| ------------------------------------------ | -------------------------- | ------------------------------------------------ |
| Product master currentStock / stockHistory | `invStockLedger` (kept)    | canonical (unchanged)                            |
| ProductsService (billing screen)           | `invStockBalance` (kept)   | canonical (unchanged)                            |
| Analytics / dashboard                      | `stockLedger` (purchase)   | **canonical `invStockLedger`/`invStockBalance`** |
| Sales controller stock validation          | `warehouseStock`           | **canonical `invStockBalance`**                  |
| Stock ledger page (`/inventory/ledger`)    | in-memory `stockMovements` | **canonical `invStockLedger`**                   |
| Stock movements API                        | in-memory `stockMovements` | **canonical `invStockLedger`**                   |
| Movement report / stock card               | legacy                     | **canonical `invStockLedger`**                   |

Frontend updated to canonical field names (`transactionType`, `direction`, `balanceQuantity`, `documentType`, `remarks`, `unitCost`) in `stock-movements.tsx`, `stock-ledger-enhanced.tsx`, `reports.tsx`, `stock-reservation.tsx` (reserve → `reservation`).

## 16. Old Ledger Retirement (H1.15)

- All application writes/reads moved to the canonical ledger (grep-verified: zero non-test references to `.stockLedger.` / `.warehouseStock.` outside repo definitions).
- `shranix_stock_ledger` and `shranix_warehouse_stock` **retained** as LEGACY/READ-ONLY (historical evidence + restore compatibility). Repos remain defined in `DatabaseService` but are no longer called by business code.
- `stockMovements` in-memory repo no longer written by any flow.

## 17. APIs Affected

- `POST /inventory/stock-movements` — now writes the canonical ledger (was in-memory). Update/delete rejected with a controlled error (ledger is append-only).
- `GET /inventory/stock-movements` — canonical rows.
- `GET /inventory/ledger` — canonical rows.
- `GET /inventory/stock-ledger/movements|card|balances|query` — canonical (unchanged routes).
- `GET /inventory/reconciliation/stock` — **new** report-only reconciliation.

Backward compatibility: response field names changed to canonical (the old in-memory repo never persisted, so there was no durable contract to break). Frontend updated accordingly.

## 18. Tests Added

- `backend/src/inventory/canonical-ledger.service.test.ts` — **24 real-DB tests** covering all H1.13 scenarios: purchase IN, sale OUT, sales return IN, purchase return OUT, transfer, adjustment, physical count, history integrity, projection==ledger, duplicate-reference safety, atomic rollback of balance+ledger, oversell controlled error, sequential race, multi-warehouse, batch/lot metadata, legacy-table retention, canonical readers, manual-movement API, immutability, reconciliation healthy + mismatch detection.
- `backend/test/sales/posting-engine-rollback.spec.ts` — updated: failure now injected at the **canonical** `invStockLedger.create` boundary via a real `InventoryPostingEngine`; mock upgraded to an in-memory store with **snapshot/restore transaction simulation**, so Test 1 verifies _actual_ rollback (invoice back to draft, no ledger rows, balance restored) — not merely an error return.

## 19. Test Results (H1.18)

| Check                                              | Result                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Backend unit/integration                           | ✅ **457 passed** (433 pre-H1 + 24 new)                                    |
| Frontend                                           | ✅ 130/130                                                                 |
| Typecheck (backend/database/frontend)              | ✅ clean                                                                   |
| Lint                                               | ✅ 0 errors (pre-existing `no-explicit-any` warnings only)                 |
| Build (backend tsc / frontend vite / database tsc) | ✅ passing                                                                 |
| Migration                                          | ✅ journal consistent (28 → 0027), applies cleanly on fresh DB, idempotent |
| Regression (Phase 12–16 suites)                    | ✅ clean                                                                   |

## 20. Performance Changes (H1.17)

- Ledger reads paginated (50/page default) everywhere in the canonical query services.
- Indexes added for the three common lookup shapes: `item_id`, `(warehouse_id, item_id)`, `transaction_date`.
- Reconciliation uses **SQL aggregation** (single grouped queries), not row-by-row JS sums.

## 21. Remaining Limitations

- True parallel-concurrency load testing (two simultaneous HTTP requests) requires a staging environment; the transaction-isolated sequential race test documents the invariant. SQLite serializes writers, and the controlled-error path prevents negative stock.
- The `closingQty` payload estimate in `prepareStockPostings` still uses `Math.max(0, …)` — it is **display-only** (never written to the ledger) and intentionally non-fatal; the authoritative stock check happens in `postMovementCore`.
- Backfill is best-effort for pre-migration data: legacy rows without a resolvable `item_id`/`warehouse_id` still land in the ledger (with `LEGACY-*` numbers); the reconciliation tool can identify any anomalies for review.
- Postgres provider: the raw-SQL reconciliation path is currently SQLite-only (`getRawClient` throws for postgres); SQL is portable and can be enabled for the PG provider when the reconciliation service is given a PG raw client.

## Success Criteria — all met

✅ ONE canonical writable stock ledger (no second writable ledger remains)
✅ Sales / purchase / returns / transfers / adjustments all write canonical
✅ Product stock, stock history, reports read canonical
✅ Historical data preserved + reconciled (non-destructive backfill)
✅ Transactions atomic (canonical write + balance projection roll back together)
✅ Duplicate posting protected (unique refs + document-status guard)
✅ Concurrency behavior tested (controlled oversell error, no negative stock)
✅ Reconciliation exists (report-only) + tested
✅ Targeted inventory tests pass (24) + existing suite green (457)
✅ Typecheck / lint / build / migration verification pass
✅ H1 report generated
