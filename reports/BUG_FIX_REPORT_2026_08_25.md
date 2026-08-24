# 🐛 SHRANIX KRUSHI ERP — BUG FIX REPORT

**Date:** August 25, 2026  
**Auditor:** Buffy (Codebuff Agent)  
**Commit (before):** `6a04120`  
**Trigger:** Module-by-Module Functional Audit found 3 real product bugs

---

## BUG-1: Supplier Empty Name → HTTP 500

### Root Cause

`SuppliersService.create()` had no validation for the required `name` field. When `name` was empty/whitespace, the code fell through to the Drizzle INSERT which failed on the `NOT NULL` constraint, producing an unhandled 500 error.

### Fix

Added explicit validation at the top of `SuppliersService.create()`:

```typescript
const rawName = String(data?.name ?? '').trim();
if (!rawName) {
  throw new BadRequestException('Supplier name is required and cannot be empty');
}
```

### Files Changed

- `backend/src/purchase/suppliers.service.ts` — Added name validation (line ~722)
- `backend/src/purchase/suppliers.service.test.ts` — Added 5 regression tests

### Tests Added

| Test                    | Expected | Result |
| ----------------------- | -------- | ------ |
| Empty name `""`         | 400      | ✅     |
| Whitespace-only `"   "` | 400      | ✅     |
| Missing name (no field) | 400      | ✅     |
| Null name               | 400      | ✅     |
| Valid name              | 201      | ✅     |

---

## BUG-2: Customer Empty Name → HTTP 201 (accepted invalid data)

### Root Cause

`CustomersService.create()` had no validation for the required `name` field. Empty/whitespace names were accepted, creating invalid customer records in the database.

### Fix

Added explicit validation at the top of `CustomersService.create()`:

```typescript
const rawName = String(data?.name ?? '').trim();
if (!rawName) {
  throw new BadRequestException('Customer name is required and cannot be empty');
}
```

### Files Changed

- `backend/src/sales/customers.service.ts` — Added name validation (line ~755)
- `backend/src/sales/customers.service.test.ts` — Added 5 regression tests

### Tests Added

| Test                    | Expected | Result |
| ----------------------- | -------- | ------ |
| Empty name `""`         | 400      | ✅     |
| Whitespace-only `"   "` | 400      | ✅     |
| Missing name (no field) | 400      | ✅     |
| Null name               | 400      | ✅     |
| Valid name              | 201      | ✅     |

---

## BUG-3: Stale Code in Credit Profile After Retry Bump

### Root Cause

In `CustomersService.create()`, when the auto-generated customer code (`CUS-XXXX`) collided with a soft-deleted row's UNIQUE index, the retry loop bumped the code to a fresh value (`finalCode`). However, the subsequent `creditEngine.upsertProfile()` call and the `auditLog()` call still referenced the **original** `code` variable instead of `finalCode`, causing:

1. Credit profile written with a stale/colliding code
2. Audit log recorded with wrong code

### Fix

Changed the credit profile and audit log to use `finalCode`:

```typescript
// Before (bug):
customerCode: code,
// After (fix):
customerCode: finalCode,
```

```typescript
// Before (bug):
details: { id, name: enriched.name || code, code },
// After (fix):
details: { id, name: enriched.name || finalCode, code: finalCode },
```

### Files Changed

- `backend/src/sales/customers.service.ts` — Fixed credit profile + audit log (lines ~861-875)
- `backend/src/sales/customers.service.test.ts` — Added 2 regression tests

### Tests Added

| Test                                           | Expected           | Result |
| ---------------------------------------------- | ------------------ | ------ |
| Credit profile uses finalCode after retry bump | correct code       | ✅     |
| Does not reuse soft-deleted codes              | new code > deleted | ✅     |

---

## BONUS FIX: Supplier Retry Regex

### Root Cause

The supplier retry logic caught UNIQUE constraint errors with `/UNIQUE constraint failed[^)]*code/`, but Drizzle wraps SQLite errors as `Failed query: ...` which doesn't match that pattern. This caused valid supplier creations to fail with 500 when codes collided with soft-deleted rows.

### Fix

Broadened the regex to match Drizzle's error format:

```typescript
const msg = String(err?.message || '');
const uniqueCode =
  /UNIQUE constraint failed[^)]*code/i.test(msg) ||
  /UNIQUE/i.test(msg) ||
  /Failed query.*insert/i.test(msg);
```

### Files Changed

- `backend/src/purchase/suppliers.service.ts` — Updated retry regex (lines ~805-815)

---

## VERIFICATION

### Unit Tests

| Suite          | Before | After    | Delta   |
| -------------- | ------ | -------- | ------- |
| Backend tests  | 2105   | **2117** | **+12** |
| Frontend tests | 130    | 130      | 0       |
| Test files     | 93     | 93       | 0       |

### API Smoke Tests (Live)

| Test                           | HTTP | Result |
| ------------------------------ | ---- | ------ |
| Supplier empty name → 400      | 400  | ✅     |
| Supplier whitespace → 400      | 400  | ✅     |
| Supplier missing name → 400    | 400  | ✅     |
| Supplier valid name → 201      | 201  | ✅     |
| Customer empty name → 400      | 400  | ✅     |
| Customer whitespace → 400      | 400  | ✅     |
| Customer missing name → 400    | 400  | ✅     |
| Customer valid name → 201      | 201  | ✅     |
| Customer duplicate GSTIN → 400 | 400  | ✅     |

### Build Status

| Check            | Result              |
| ---------------- | ------------------- |
| `pnpm typecheck` | ✅ Zero errors      |
| `pnpm build`     | ✅ Clean            |
| `pnpm test`      | ✅ 2117/2117 passed |

### Git Status

| Item              | Value                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Branch            | `main`                                                                                                                            |
| Uncommitted files | 5 modified                                                                                                                        |
| Files changed     | `suppliers.service.ts`, `suppliers.service.test.ts`, `customers.service.ts`, `customers.service.test.ts`, `masters.repository.ts` |
| Lines added       | +207                                                                                                                              |
| Lines removed     | -18                                                                                                                               |

---

## ACCEPTANCE CRITERIA

| Criterion                                | Status  |
| ---------------------------------------- | ------- |
| Supplier empty name → HTTP 400           | ✅ PASS |
| Customer empty name → HTTP 400           | ✅ PASS |
| Whitespace-only names → HTTP 400         | ✅ PASS |
| Credit profile retry/bump → correct code | ✅ PASS |
| No duplicate/unique-index collision      | ✅ PASS |
| Existing functionality remains PASS      | ✅ PASS |
| 2117 tests pass                          | ✅ PASS |
| Typecheck clean                          | ✅ PASS |
| Build clean                              | ✅ PASS |

---

_Generated by Buffy · Freebuff Bug Fix Report_
