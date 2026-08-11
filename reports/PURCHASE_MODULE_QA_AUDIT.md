# SHRANIX KRUSHI ERP — PURCHASE MODULE AUDIT

**Date:** 10 Aug 2026
**Phase:** 3.3 — Purchase Module (continue & complete existing module)
**Audit Type:** Full-stack static audit (Backend + Frontend + DB Schema + Tests)
**Scope:** PO · GRN · Invoice · Return · Debit Note · Payment · Supplier · GST · Inventory · Reports

---

## 0. Executive Summary

The Purchase Module **already exists and is architecturally strong** — 15 controllers, 12 services,
transactional posting engines (debit note + invoice posting), full Supplier Master, GRN→stock
auto-posting, workflow integration, and permission guards. **It must NOT be rebuilt.**

However, the audit found **critical end-to-end gaps** that prevent the module from being
production-usable:

| Severity    | Count | Summary                                                                                                                                                                          |
| ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Critical | 4     | PO items never persisted · Invoice has NO line items · No Purchase Payment module · Auto-numbering missing for PO/Invoice/Return                                                 |
| 🟠 Major    | 6     | GST split hardcoded (no IGST) · Outstanding always ₹0 · Dashboard route broken · Dashboard `supplierOutstanding` hardcoded 0 · PO status never auto-advances · No purchase tests |
| 🟡 Minor    | 8     | No PDF/print · No doc import/export · Report gaps · beforeQty=0 in stock ledger · Return>Invoice qty not validated · etc.                                                        |

---

## 1. Audit Matrix (per STEP 1 scope)

| Area                  | Status               | Notes                                                                                                                                             |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purchase Dashboard    | 🟠 Partially         | Backend KPIs good, but `supplierOutstanding` hardcoded `0`; frontend route `/purchase/dashboard` → `<Navigate to="/" replace />` (broken)         |
| Purchase Orders       | 🔴 Partial           | Header CRUD + status + auto-GRN + blocked-supplier rule ✅ — **line items are NEVER saved** (`poItems.create` not called anywhere)                |
| Purchase Invoice      | 🔴 Partial           | Header CRUD + posting engine ✅ — **no line-item table exists** (`shranix_purchase_invoice_items` missing)                                        |
| Purchase Return       | 🟢 Implemented       | Items saved, approve → transactional debit note (stock + GST + ledger reversal)                                                                   |
| Debit Note            | 🟢 Implemented       | `createDebitNoteFromReturn` full 7-step transaction with rollback                                                                                 |
| Supplier integration  | 🟢 Implemented       | Full Supplier Master + dashboard/search/outstanding/export/import/ledger                                                                          |
| Product integration   | 🟡 Partial           | Blocked/discontinued product guards on invoice ✅ — no auto-load of SKU/HSN/GST/purchase-rate on item select (frontend gap)                       |
| Inventory integration | 🟢 Implemented       | GRN approve → batch + warehouse stock + stock ledger (transactional)                                                                              |
| GST calculations      | 🟠 Needs Improvement | Header-level only; posting engine hardcodes 50/50 CGST/SGST split, **no IGST**, `taxRate` always 0, no supplier-state vs company-state logic      |
| Payment integration   | 🔴 **MISSING**       | No supplier payment collection (sales has Phase-4 payments; purchase has none). No `paidAmount`/`balanceAmount` updates, no outstanding reduction |
| Ledger integration    | 🟢 Implemented       | Posting engine writes supplier ledger + journal + GST ledger (transactional)                                                                      |
| Reports               | 🟡 Partial           | Register/GRN/supplier/item/PO/returns/GST endpoints exist; GST report reads POs not invoice GST; no payment report                                |
| Permissions           | 🟢 Implemented       | `purchase.read/create/update/delete` + `purchase.*` wildcard seed + family guard                                                                  |
| Audit logs            | 🟢 Implemented       | BaseMasterService audit + posting/debit-note audit entries                                                                                        |
| Import/Export         | 🟡 Partial           | Suppliers only (CSV/XLSX/JSON). Purchase documents have none                                                                                      |
| PDF/Print             | 🔴 MISSING           | No purchase document print/PDF (sales has invoice share/PDF)                                                                                      |
| API layer             | 🟢 Implemented       | 15 controllers, consistent JWT + CSRF + roles + permissions + Swagger                                                                             |
| Database schema       | 🟡 Partial           | Missing `purchase_invoice_items`, `purchase_quotation_items`; no purchase payments table                                                          |
| Tests                 | 🔴 MISSING           | Only `suppliers.service.test.ts` (24 tests). No PO/GRN/Invoice/Return/DebitNote/Payment tests                                                     |

---

## 2. Implemented (verified, do not touch)

### 2.1 Backend — Controllers (`backend/src/purchase/controllers.ts`, 15 controllers)

- `purchase/orders` · `purchase/quotations` · `purchase/grn` (+ `:id/approve`) · `purchase/invoices`
- `purchase/returns` · `purchase/supplier-prices` · `purchase/approvals` · `purchase/settings`
- `suppliers` (full master + dashboard/search/outstanding/export/import/bulk/ledger/restore)
- `purchase/requisitions` · `purchase/dashboard` · `purchase/reports` (7 reports)
- `purchase/search` · `purchase/debit-notes` · `purchase/posting` (post + preview)

### 2.2 Backend — Services (`services.ts`, `purchase-postings.service.ts`, `debit-note.service.ts`)

- `StockPostingService.postFromGrn` — batch + warehouse stock + stock ledger + PO received qty, transactional
- `StockPostingService.reverseFromReturn` — stock reversal, transactional
- `GrnService` — PO over-receipt guard, duplicate supplier invoice guard, items persist, approve → auto stock post
- `PurchaseOrdersService` — blocked-supplier guard, settings defaults, auto-GRN on approval (`autoGrn`)
- `PurchaseInvoicesService` — inactive/blocked supplier guard, blocked/discontinued product guard
- `PurchaseReturnsService.approve` → `PurchaseDebitNoteService.createDebitNoteFromReturn`
- `PurchaseDebitNoteService` — 7-step transaction: DN record → stock reversal → reversal journal → GST reversal → supplier ledger → return status → audit (full rollback via TransactionManager)
- `PurchasePostingEngineService.postInvoice` — 7-step transaction: status → supplier ledger → journal (balanced check) → GST ledger → cash book → audit → notification
- `PurchaseRequisitionsService` — items persist
- Dashboard/Reports/Search services (DB-level filters, field projection, no `pageSize:1000`)

### 2.3 Frontend (`frontend/src/pages/purchase/index.tsx` + routes + sidebar)

- Generic `MasterDataPage` screens for: Suppliers, Requisitions, Orders, Quotations, GRN, Invoices, Returns, Supplier Prices, Approvals, Settings + 6 report pages
- Dashboard component exists (`PurchaseDashboardPage`) but **route points to `/` (broken)**
- Sidebar: खरेदी नोंद / खरेदी ऑर्डर / खरेदी परत / suppliers / खरेदी अहवाल

### 2.4 Schema (`database/src/schema/purchase.ts`)

- PO + PO items · Quotations · GRN + GRN items (batch/mfg/exp/serial) · Invoices (payment fields) · Returns + return items · Supplier Price List · Approvals · Suppliers + addresses/contacts/documents/groups/categories · Requisitions + items · Stock Ledger · Warehouse Stock · Settings
- Unique indexes: `po_number_idx`, `quote_number_idx`, `grn_number_idx`, `pi_number_idx`, `pr_number_idx`, supplier code/name, warehouse stock

### 2.5 Infrastructure

- TransactionManager rollback (posting, debit note, stock) · Workflow decorators + module bridge · Permissions family guard · `purchase.*` seed · Audit service · Numbering prefixes in settings

---

## 3. Missing / Gaps (to implement)

### 🔴 Critical

**G1 — PO line items are never persisted.**
`poItems.create` is called nowhere. `PurchaseOrdersService.create` passes `items` into
`super.create()` which ignores them. `shranix_po_items` stays empty → GRN-from-PO and
item-wise reports have nothing to read.
_Fix:_ persist `items` in `PurchaseOrdersService.create`/`update` (like GRN service does).

**G2 — Purchase Invoice has no line items.**
No `purchase_invoice_items` table, no DTO items, no save. Invoice is header-totals only,
so batch/expiry/qty/rate/tax per product (STEP 4, 8, 15) is impossible.
_Fix:_ new migration `purchase_invoice_items` (item, batch, expiry, qty, unit, rate, discount,
tax split, amount, warehouse) + DTO + persist in service.

**G3 — No Purchase Payment module (STEP 11).**
Sales got Phase-4 Payment Collection; purchase has **no supplier payment**. Result:
`paidAmount`/`balanceAmount`/`paymentStatus` never update → outstanding payable is always
₹0 in practice (schema default `balance_amount = 0`), supplier ledger has no credit
(payment) entries, no cash/bank book receipts on payment.
_Fix:_ `PurchasePaymentsService` (collect payment, allocate oldest-first, advance handling,
supplier ledger credit, cash/bank book, update invoice paid/balance/status, credit-profile
or supplier balance sync) + controller + frontend page (mirror sales payment collection).

**G4 — Server-side auto-numbering missing for PO / Invoice / Return / Quotation.**
Only GRN auto-numbering exists (via `autoCreateGrn`). PO/invoice/return/quote numbers are
client-required (`poNumber` marked required) → no race-safe generation like sales
`numbering.service.ts` (STEP 16).
_Fix:_ shared numbering helper using settings prefixes + next numbers + unique-index retry
(same pattern as sales) + `next-number` preview endpoints.

### 🟠 Major

**M1 — GST engine hardcodes 50/50 CGST/SGST, no IGST (STEP 5).**
`purchase-postings.service.ts` splits `taxAmount` 50/50 and GST ledger writes `taxRate: 0`.
No supplier-state vs company-state inter-state logic; per-line `igst/cgst/sgst` columns exist
on PO items but are never computed server-side.
_Fix:_ line-level tax split using supplier state + company state; honour per-line igst/cgst/sgst;
pass real taxRate to GST ledger.

**M2 — Supplier Outstanding always ₹0.**
`getOutstanding`/`getDashboard` read `invoice.balanceAmount`, which is never initialized or
updated (default 0). Invoice creation doesn't set `balanceAmount = grandTotal`.
_Fix:_ set balance on invoice create; update on payment (G3) and debit note/return.

**M3 — Frontend dashboard route broken.**
`{ path: 'purchase/dashboard', element: <Navigate to="/" replace /> }` → renders home.
_Fix:_ point to `<PurchaseDashboardPage />` (component already exists).

**M4 — PO status never auto-advances to `partially_received` / `received`.**
GRN posting updates `poItems.receivedQuantity` but not the PO header status (STEP 3 statuses).
_Fix:_ after GRN stock post, recompute PO status from received vs ordered totals.

**M5 — No purchase module tests (STEP 26).**
Only `suppliers.service.test.ts` exists. Missing: PO/GRN/Invoice/Return/DebitNote/Posting/
Payment/GST/rollback/duplicate tests.
_Fix:_ add vitest suites (mirror sales tests + payment-collection tests).

**M6 — Return quantity > purchased/invoiced quantity not validated (STEP 24).**
_Fix:_ validate return items against linked invoice/GRN quantities at create/approve.

### 🟡 Minor

**m1 — No PDF/print for purchase documents** (STEP 17/18) — reuse sales saved-invoice-pdf pattern.
**m2 — No import/export for PO/Invoice/Return** — reuse suppliers import framework (STEP 18).
**m3 — Stock ledger `beforeQty` always 0** — compute actual before-qty in postFromGrn/reverseFromReturn.
**m4 — `batchStock.findAll({search})` fragile** — use filters (`batchNo`, `itemId`).
**m5 — GST purchase report reads POs, not invoice GST** — return invoice GST breakdown.
**m6 — No Purchase Payment report** — add once G3 exists.
**m7 — Invoice→GRN/PO linkage** — invoice `poId`/`grnId` optional; no "create invoice from GRN" convenience.
**m8 — Audit `stock_posted`/`stock_reversed` use AuditService directly; posting engine writes raw `auditLogs`** — unify.

---

## 4. STEP-by-STEP Compliance (Phase 3.3 spec)

| Step | Spec                                                                              | Status | Action                                                                                              |
| ---- | --------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 1    | Existing Module Audit                                                             | ✅     | This report                                                                                         |
| 2    | Workflow Supplier→PO→GRN→Invoice→Stock→Payable→Payment→Ledger→Reports             | 🟠     | GRN exists (good). Payment step missing (G3)                                                        |
| 3    | Purchase Order (fields + 8 statuses)                                              | 🟡     | Header ✅; items (G1); status auto-advance (M4); `closed` transition missing                        |
| 4    | Purchase Invoice (items, batch, expiry, PO ref)                                   | 🔴     | G2                                                                                                  |
| 5    | GST (CGST/SGST/IGST, inclusive/exclusive, HSN)                                    | 🟠     | M1; HSN auto-load is frontend gap                                                                   |
| 6    | Product integration (auto-load SKU/HSN/GST/purchase price)                        | 🟡     | Backend guards ✅; frontend auto-load missing                                                       |
| 7    | Supplier integration (GSTIN/PAN/credit/outstanding)                               | 🟢     | Implemented (supplier master + ledger)                                                              |
| 8    | Inventory (stock up on finalize, batch, no draft posting, reversal)               | 🟢     | GRN approve posts stock ✅; invoice finalize does not post stock (by design — GRN is receipt point) |
| 9    | Purchase Return (qty, rate, tax, reason, stock down, payable)                     | 🟢     | Implemented + debit note                                                                            |
| 10   | Debit Note (number, supplier, invoice, reason, adjustment, ledger)                | 🟢     | Implemented (from return)                                                                           |
| 11   | Payment (cash/bank/UPI/cheque, ref, reduce outstanding)                           | 🔴     | **G3 — missing entirely**                                                                           |
| 12   | Supplier Ledger (invoice→debit, payment→credit, DN, running balance)              | 🟡     | Posting writes ledger ✅; payment entries missing (G3)                                              |
| 13   | Purchase Dashboard                                                                | 🟡     | Backend ✅ (supplierOutstanding=0); route broken (M3)                                               |
| 14   | Purchase List (DataTable, filters, export, print)                                 | 🟡     | Generic table ✅; no column visibility/print; export missing                                        |
| 15   | Purchase Form (header+items+footer GST)                                           | 🔴     | Generic form only; no line-item editor (G1/G2)                                                      |
| 16   | Numbering (unique, race-safe, one system)                                         | 🔴     | G4                                                                                                  |
| 17   | Documents (attach supplier invoice/PO/delivery)                                   | 🔴     | Supplier documents ✅; purchase-doc attachments missing                                             |
| 18   | Import/Export                                                                     | 🟡     | Suppliers only (m2)                                                                                 |
| 19   | Reports (register, GST, return, outstanding, payment, PO-pending, date/warehouse) | 🟡     | 7 endpoints ✅; GST-from-PO (m5), payment report (m6)                                               |
| 20   | Permissions (purchase.view…report)                                                | 🟢     | Wildcard + family guard covers all                                                                  |
| 21   | Audit Log                                                                         | 🟢     | Base + posting + DN ✅                                                                              |
| 22   | Transaction Safety (atomic finalize, rollback)                                    | 🟢     | TransactionManager everywhere critical ✅                                                           |
| 23   | Duplicate Protection (DB constraints + logic)                                     | 🟡     | Unique indexes ✅; invoice dup check in GRN only; invoice/return dup logic weak                     |
| 24   | Business Validations (neg qty/rate, tax, batch, return>purchase)                  | 🟡     | DTO @Min ✅; return-vs-invoice qty (M6)                                                             |
| 25   | Performance (indexes, pagination, projections)                                    | 🟢     | Phase-M fixes applied (0 × pageSize:1000)                                                           |
| 26   | Testing                                                                           | 🔴     | M5                                                                                                  |
| 27   | Regression                                                                        | 🟢     | Will verify sales/customer/supplier/product after changes                                           |

---

## 5. Recommended Implementation Order (backward-compatible, additive)

1. **G4** Numbering helper (foundation for every doc) + next-number endpoints
2. **G1** PO items persistence (+ update path)
3. **G2** Invoice items (migration + DTO + service)
4. **G3** Purchase Payment module (service + controller + frontend) — biggest win
5. **M2** Outstanding init + payment updates
6. **M1** GST line-level split (CGST/SGST/IGST)
7. **M4** PO status auto-advance; **M3** dashboard route fix
8. **M5** Purchase service tests (PO/GRN/Invoice/Return/DebitNote/Payment/GST/rollback)
9. **m1/m2** PDF print + doc import/export; **m5/m6** report fixes
10. Regression suite + production build

All changes are **additive and backward-compatible** — no existing endpoint/schema behaviour
is changed, no unrelated module is touched.
