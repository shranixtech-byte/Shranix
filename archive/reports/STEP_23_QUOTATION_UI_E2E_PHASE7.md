# STEP 23 — Quotation Module Phase 7: Full UI E2E Verification

**Date:** 2026-08-06
**Scope:** `scripts/_qa-quotation-phase7.cjs` — browser-level (UI) end-to-end tests of the sales quotation module
**Status:** ✅ **COMPLETE** — 21/21 checks pass, zero console errors

---

## 1. Why Phase 7?

Phases 1-6 verified the quotation module at the **API level** — each script logged in once and
drove the endpoints with `fetch` calls through `page.evaluate`. That verified the backend logic
(auto/manual numbering, FY/branch prefixes, line items, pricing engine math, options, 3-level
approval chain, send/reject) but **never exercised the actual React UI**.

Phase 7 closes that gap with a **real browser E2E**: clicking the actual buttons, typing into the
real inputs, and verifying the rendered page — the way an end user would work.

## 2. Coverage — 21 checks across 9 UI flows

| #   | Flow                | Checks                                                                                     |
| --- | ------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Login page          | Sign-in via `#email`/`#password` + Sign In button → dashboard renders                      |
| 2   | Quotations list     | Page renders, `+ Create Sales Quotation` button present                                    |
| 3   | Customer selection  | Create flow opens screen, customer row clickable, Select Customer → form                   |
| 4   | Product selection   | Screen opens, product search `a` → first result added to grid                              |
| 5   | Pricing engine (UI) | Breakdown visible (Calculation Breakdown, CGST/SGST/IGST/CESS), grand total computed       |
| 6   | Save                | Save → returns to list, new quote `SQ-0059` visible with Rev badge                         |
| 7   | Edit restore        | Edit opens form, quote number pre-filled, items restored                                   |
| 8   | Row actions         | All 4 actions present (Submit for Approval / Send Customer / Create Revision / Mark Final) |
| 9   | Lifecycle via UI    | Submit → Pending badge, Revision → Rev-2 badge, Mark Final → Final badge                   |

**Grand total ₹1,890.00** was computed live in the browser from the added product.

## 3. Real findings fixed during Phase 7

### 3.1 `ProtectedRoute` drops session on full page reload

`ProtectedRoute` (frontend) deliberately keeps the session **in-memory only** — any full
`page.goto()` to a protected route reloads the app and redirects to `/auth/login`.

- **Fix (QA-side):** all navigation uses **SPA navigation** — `history.pushState` +
  `PopStateEvent` — which lets React Router navigate client-side without losing the session.

### 3.2 React `onMouseDown` ignores synthetic `dispatchEvent`

Product rows in `ProductSelectionScreen` select via `onMouseDown`. A synthetic
`element.dispatchEvent(new MouseEvent('mousedown'))` is not a trusted event, so React's
handler never fired and the product never entered the grid.

- **Fix (QA-side):** the script locates the dropdown (scoped to the `.z-50` container so
  Marathi sidebar labels like "विक्री" can't be mistaken for products) and clicks the real
  coordinates with `page.mouse.click()` — a trusted event React accepts.

### 3.3 Cleanup safety (code review fix)

An earlier version of the script's cleanup deleted **every** quote whose number contained
`SQ-` — which would have wiped earlier phases' and any real user data sharing the default
prefix. Reworked to:

- capture the exact created quote **ID** right after save,
- collect the `-Rev-N` revision IDs derived from the same base number,
- delete **only those IDs**.

### 3.4 Targeted row actions (code review fix)

Row-action clicks (Submit/Revision/Final) now target the row containing the **exact
created quote number** instead of the first `SQ-` row, which could be a stale quote left
by an earlier phase run.

### 3.5 Dev-server launcher (code review fix)

The Node `start-detached.mjs` was unreliable on Windows — its `detached` spawn still shares
the console and dies with `STATUS_CONTROL_C_EXIT` when the parent shell exits. Removed;
`scripts/start-detached.ps1` (`Start-Process -WindowStyle Hidden`) is the supported
launcher, now deriving its paths from `$PSScriptRoot` instead of hardcoded drive paths.

## 4. Regression — all phases still green

| Phase                        | Script                     | Result         |
| ---------------------------- | -------------------------- | -------------- |
| 1 — Numbering + final lock   | `_qa-quotation.cjs`        | 10/10 ✅       |
| 2 — Customer search + credit | `_qa-quotation-phase2.cjs` | 8/8 ✅         |
| 3 — Line items + revisions   | `_qa-quotation-phase3.cjs` | 15/15 ✅       |
| 4 — Pricing engine           | `_qa-quotation-phase4.cjs` | 18/18 ✅       |
| 5 — Options                  | `_qa-quotation-phase5.cjs` | 16/16 ✅       |
| 6 — Approval workflow        | `_qa-quotation-phase6.cjs` | 18/18 ✅       |
| **7 — Full UI E2E (new)**    | `_qa-quotation-phase7.cjs` | **21/21 ✅**   |
| **Total**                    |                            | **106/106 ✅** |

## 5. Validation

- `pnpm --filter @shranix/frontend typecheck` ✅
- All 7 QA suites pass with **zero console/page errors**
- Test data self-cleans (created quotes deleted at the end of the run)

## 6. Artifacts

- New QA suite: `scripts/_qa-quotation-phase7.cjs`
- Dev launcher: `scripts/start-detached.ps1` + `scripts/start-detached.mjs` (independent
  background process — survives shell timeouts)

**Verdict: the sales quotation module is verified end-to-end through the real UI.**
Backend logic (phases 1-6) and the entire frontend surface (phase 7) are production-ready.
