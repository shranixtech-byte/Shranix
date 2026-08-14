# H4 — Query / Performance Hardening (P1/P2 Data Access + Scalability)

**Status:** Complete
**Type:** Data-access / scalability hardening
**Scope:** Repository aggregation, KPI engine, financial reports, invoice posting, UI list pagination
**Validation:** Backend 509/509 (502 prior + 7 new H4 tests) · Frontend 130/130 · Typecheck clean · Lint 0 errors · Build passing (backend/frontend/database)

---

## 1. Original Audit Finding

The master audit flagged ~188 potentially unbounded/large query patterns
(`pageSize: 5000/10000`, full-table loads, in-memory aggregation over raw rows).
The dominant risk was **silent truncation**: `findAll` with `pageSize: 10000` returns
_at most_ 10000 rows, so any report/KPI/list that loaded rows and aggregated in
JavaScript produced **incorrect totals once a table grew past 10000 rows** — not just
slow, but wrong.

## 2. Discovery Methodology

- Grepped all `pageSize: [4+ digits]` → **269 occurrences across ~40 files**.
- Classified each by intent:
  - **Aggregation** (load-then-sum in JS) → P0/P1 data-safety (truncation → wrong totals).
  - **UI/API list** (client pageSize passthrough) → P1 unbounded-request risk.
  - **Export** (intentional full dataset) → P3 acceptable (must not be paginated away).
  - **Reference/map building** (small master tables: groups, categories, units) → P3 bounded by data volume.
- Traced the actual aggregation columns against the schema (found two pre-existing
  column bugs in the GST KPIs).

## 3. Risk-Ranked Query Inventory (top findings)

| Risk | Location                                                                   | Pattern                                                                                                        | Status                                                                                          |
| ---- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P0   | `automation/kpi-engine.service.ts` (12 calcs)                              | load ≤10000 glEntries/gstLedger/invoices/orders/items, aggregate in JS → wrong totals >10k rows                | **FIXED** → SQL `sumField`/`countWhere`                                                         |
| P0   | `sales/controllers.ts` invoice posting                                     | load ALL items + ALL invStockBalance (10000 cap) per invoice post → stock validation incomplete past 10k items | **FIXED** → chunked `IN` on invoice item ids                                                    |
| P1   | `automation/report-engine.ts` (7 gl/gst loads)                             | load ≤10000 rows, filter in JS; date-bounded reports can truncate                                              | **PARTIAL FIX** → SQL date/branch/account prefilter (pure subset); unbounded reports documented |
| P1   | Client `pageSize` passthrough (59 controllers)                             | `pageSize=1e6` → `limit(1e6)`                                                                                  | **FIXED** → repo hard ceiling 10000 + UI cap 200 on highest-risk lists                          |
| P2   | `sales/customers.service.ts` `nextCustomerCode`, `loadMasterContext`       | full scans for max code / map building                                                                         | Documented; numbering uses existing sequence helpers                                            |
| P2   | `users.service.ts`, `workflow/dashboard.controller.ts` (`pageSize: 1000`)  | per-request 1000-row loads                                                                                     | Documented (bounded at 1000)                                                                    |
| P3   | `customerGroups`/`customerCategories`/`units` map loads (`pageSize: 1000`) | small reference tables                                                                                         | Acceptable — bounded by data volume                                                             |
| P3   | Export paths (products/ledger/customers exports)                           | intentional full dataset                                                                                       | Unchanged — exports need complete data                                                          |

## 4. Queries Changed

1. **Repository layer (`database/src/repositories/masters.repository.ts`)**
   - New `sumField(field, { filters, search, searchFields, isActive })` — SQL `SUM`
     with the enterprise filter builder; returns `0` for unknown columns.
   - New `countWhere({ filters, ... })` — SQL `COUNT` with the same filter support.
   - Both are transaction-aware (`activeDb`) and inherited by every master repository.
2. **Pagination safety ceiling (`database/src/utils/query.helper.ts`)**
   - `extractPagination` now: `page` → positive int (default 1); `pageSize` → positive
     int capped at `MAX_PAGE_SIZE = 10000` (default 50). No caller passes >10000, so
     nothing internal regresses; pathological client requests are bounded.
3. **KPI engine (`automation/kpi-engine.service.ts`)** — 10 calculators converted:
   `revenue`, `gross_profit`, `net_profit`, `gst_payable`, `gst_receivable`,
   `sales_trend`, `top_customers`, `purchase_trend`, `top_suppliers`,
   `inventory_turnover`. Formulas unchanged, now computed in SQL with optional
   date bounds (`entryDate`/`voucherDate`/`createdAt` `between` when
   `fromDate`/`toDate` are passed — the params previously existed but were ignored).
4. **Report engine (`automation/report-engine.ts`)** — date/branch/cost-center/account/
   gst filters pushed into SQL as a pure subset prefilter for `generateTrialBalance`,
   `generateGeneralLedger`, `generateGstRegister`, `generateGstSummary` (in-memory
   filters kept — results unchanged, rows loaded bounded).
5. **Invoice posting (`sales/controllers.ts`)** — product-master + warehouse-balance
   lookups now use **chunked `IN`** (500/chunk) on the invoice's item ids instead of
   loading the whole catalog + whole balance table.
6. **UI list caps** — new `sanitizePageSize`/`sanitizePage`
   (`backend/src/common/utils/pagination.util.ts`, default 50 / **max 200** for UI)
   applied to the highest-risk list endpoints: products (`products-master.controller`),
   product search, customers search, suppliers search/list/outstanding, purchase
   payments list, inventory stock ledger.

## 5. Pagination Changes

- Every page is now bounded server-side: hard ceiling 10000 (repo) + UI lists capped
  at 200 via `sanitizePageSize`.
- Deterministic ordering: the master repo already defaults to `createdAt DESC` when no
  sort is given — verified by test (same query → same order; page boundaries; empty
  page returns `[]`).
- Client page/pageSize are never trusted (invalid → defaults).

## 6. Export Handling

Export endpoints were **not** paginated away — exports intentionally return complete
datasets (products export, ledger export, customers export). No change made. Chunked
`IN`-based fetches (as used in posting) are the pattern for bounded retrieval when a
subset suffices.

## 7. Index Changes

**No new indexes were added in this pass.** Justification per H4.6:

- The fixed KPI queries filter on `gl_entries(voucher_type, credit, debit, entry_date)`,
  `gst_ledger(input_output, gst_amount, voucher_date)`,
  `sales_invoices(created_at, grand_total)`, `purchase_orders(created_at, grand_total)`,
  `items(current_stock)`. Existing tables already carry indexes on
  `gst_voucher_idx` (voucher_type+voucher_id) and the base `id` PK; the primary cost
  driver was row-loading (memory + truncation), now removed by SQL aggregation.
- `voucher_type`/`entry_date` composite indexes are **recommended** for very large GL
  deployments (documented below as a follow-up) — not created here to avoid schema
  churn without a real load profile.

## 8. N+1 Fixes

- **Invoice posting** was the verified N+1-adjacent pattern (per-invoice post loaded
  the whole catalog). Replaced with 2 batched `IN` queries per post (items + balances),
  chunked to stay within SQLite parameter limits.
- No other verified N+1 loops were found in the top-risk paths during this pass
  (dashboards/maps already batch).

## 9. Report / KPI Changes

- KPI definitions (formulas, ids, statuses) unchanged — only the execution moved from
  JS-over-10000-rows to SQL.
- **Bug fix (evidence):** `gst_payable`/`gst_receivable` filtered on non-existent
  columns (`transactionType`, `cgstAmount`, `sgstAmount`, `igstAmount`) and always
  returned 0. Now use the real `gst_ledger.inputOutput` + `gst_amount` columns.
- `dead_stock`/`fast_moving` still reference a non-existent `items.totalSold` column
  (pre-existing, out of H4 scope — documented limitation).

## 10. Response-Size Changes

- UI list endpoints now cap at 200 rows/page; the repo ceiling (10000) prevents
  pathological single-page responses everywhere else.
- No fields removed from existing public contracts.

## 11. Tests (H4.13 — real DB)

New file: `backend/src/automation/kpi-engine.service.test.ts` — **7 tests**:

1. `sumField` matches exact SQL sums (revenue 350, COGS 75, count 3).
2. **>10000-row proof**: 10050 gl entries seeded; revenue KPI equals the true total
   (40545) — the old code would have stopped at 10000 rows.
3. Date-bounded revenue KPI returns only in-range entries.
4. GST payable now uses the real columns (returns 180, not 0).
5. Repository caps client pageSize at the hard ceiling (1e6 → 10000); invalid pages
   normalize.
6. Deterministic pagination: `createdAt DESC` order, page boundaries, empty page.
7. `sanitizePageSize`/`sanitizePage` unit behavior (cap 200, defaults, bad input).

## 12. Before/After Evidence

- **Truncation:** KPI revenue over 10050 entries: before → 40195 (stops at 10000 rows,
  WRONG); after → 40545 (exact SQL sum). Test locks this in.
- **Posting:** catalog lookup went from 2 full-table loads (10k cap) to 2 chunked `IN`
  queries scoped to the invoice's line items.
- **Pagination:** `pageSize=1000000` request previously produced `limit(1000000)`;
  now bounded to 10000 (repo) / 200 (UI lists).

## 13. Remaining Limitations

1. **Report engine unbounded reports** (`generateTrialBalance`, cash flow, etc. without
   date params) still load ≤10000 GL rows — SQL aggregation for these needs a
   `SUM ... GROUP BY accountId` repository method; recommended as the next follow-up
   (H5) with the exact pattern used for the KPI engine.
2. **`dead_stock` / `fast_moving`** KPIs reference a non-existent `items.totalSold`
   column (pre-existing; a correct implementation needs a stock-ledger aggregation).
3. **Recommended indexes** (no schema change made): composite
   `gl_entries(voucher_type, entry_date)`, `gl_entries(account_id, entry_date)`,
   `gst_ledger(input_output, voucher_date)`, `sales_invoices(created_at)`,
   `purchase_orders(created_at)` for very large datasets — add only after a real load
   profile justifies them.
4. **No real load test** was run — infrastructure for staging load testing is not
   configured in this environment; correctness/perf evidence is from the real-DB
   truncation test and query-count reduction, not measured latency.
5. Other `pageSize: 10000` internal callers (customers maps, dashboard loads, credit
   profile loads) remain at their existing bounded sizes — documented, not silently
   changed (H4.16 smallest-safe-change).

## 14. Files Changed

- `database/src/repositories/masters.repository.ts` — `sumField`, `countWhere`
- `database/src/utils/query.helper.ts` — `MAX_PAGE_SIZE` cap in `extractPagination`
- `backend/src/automation/kpi-engine.service.ts` — SQL aggregation + date bounds + GST column fix
- `backend/src/automation/report-engine.ts` — SQL prefilters (pure subset)
- `backend/src/sales/controllers.ts` — chunked `IN` catalog/balance lookup in posting
- `backend/src/common/utils/pagination.util.ts` — `sanitizePageSize`/`sanitizePage` (new)
- `backend/src/inventory/products-master.controller.ts` — UI pageSize caps
- `backend/src/sales/customers.controller.ts` — UI pageSize caps
- `backend/src/purchase/controllers.ts` — UI pageSize caps
- `backend/src/inventory/controllers.ts` — stock-ledger UI pageSize caps
- `backend/src/automation/kpi-engine.service.test.ts` — 7 real-DB tests (new)

## 15. Regression / Validation

| Check                                     | Result                                                            |
| ----------------------------------------- | ----------------------------------------------------------------- |
| H4 tests                                  | 7/7 passed                                                        |
| Backend full suite                        | **509/509** (502 prior + 7 new)                                   |
| Frontend suite                            | **130/130**                                                       |
| Typecheck (backend / frontend / database) | clean                                                             |
| Lint                                      | 0 errors                                                          |
| Build (backend / frontend / database)     | passing                                                           |
| H1 inventory ledger queries               | unchanged (posting balance lookup now scoped IN, same projection) |
| H2/H3 authorization                       | untouched (no auth code modified)                                 |
