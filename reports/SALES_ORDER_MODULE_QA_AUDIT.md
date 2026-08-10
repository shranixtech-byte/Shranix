# Sales Order Module — QA Audit Report

**Date:** 07 Aug 2026
**Module:** Sales Order (Quotation → Order → Challan → Invoice chain ka part)
**Audit Type:** Full-stack (Backend + Frontend + DB + Live API)
**Status:** ✅ PASS (3 bugs found & fixed, all validations green)

---

## 1. Audit Scope

| Layer              | Files Reviewed                                                               |
| ------------------ | ---------------------------------------------------------------------------- |
| Backend Service    | `backend/src/sales/services.ts` (SalesOrdersService)                         |
| Backend Controller | `backend/src/sales/controllers.ts` (SalesOrdersController)                   |
| Backend Numbering  | `backend/src/sales/numbering.service.ts`                                     |
| DTOs               | `backend/src/sales/dto.ts` (Create/UpdateSalesOrderDto, CreateOrderItemDto)  |
| Schema             | `database/src/schema/sales.ts` (shranix_sales_orders + order items)          |
| Frontend           | `frontend/src/pages/sales/sales-order-form-page.tsx`, `master-data-page.tsx` |
| Tests              | `backend/src/sales/*.test.ts` (existing + new)                               |
| Live API           | Running backend on `:4001`, real DB `dev.db`                                 |

---

## 2. Bugs Found & Fixed

### 🔴 Bug 1 — Edit mode completely broken: `PUT /sales/orders/:id` → 404

**Severity:** Critical (feature-breaking)
**Symptom:** Sales Order edit form kholne par 404 milta tha — order edit karna impossible.

**Root cause:** `SalesOrdersController` mein sirf `@Put(':id/status')` tha. Generic update
route (`PUT /sales/orders/:id`) missing tha, jabki frontend edit form wahi call karta hai.

**Fix:** Generic `@Put(':id')` route add kiya — header + line-items replace support ke saath:

- `@Roles('admin', 'manager')` + `@Permissions('sales.update')`
- Route ordering safe: `:id` aur `:id/status` alag path patterns hain (segment counts differ)
- Items-provided case → full line-item set replacement (edit form ka main flow)

**Verified live:** `PUT /sales/orders/242fd2e4…` → **200 OK** ✅ (pehle 404)

---

### 🟠 Bug 2 — Numbering preview format mismatch: `SO-007` vs `SO-0007`

**Severity:** Medium (UX inconsistency)
**Symptom:** New-order page par preview `SO-007` dikhata tha, par actual create par
`SO-0007` ban jata tha — user confuse hota tha ki kya number milega.

**Root cause:** `getNextNumber()` preview mein `padStart(3)` use hota tha, jabki actual
`numbering.service.ts` `padStart(4)` (SO-0001) generate karta hai.

**Fix:** Preview bhi `padStart(4)` karta hai — preview aur actual number ab hamesha match.

**Verified live:** `GET /sales/orders/next-number` → **`SO-0007`** ✅ (4-digit, consistent)

---

### 🟠 Bug 3 — Delivered order ke items edit ho sakte the (data-integrity risk)

**Severity:** Medium (silent data corruption)
**Symptom:** Jis order ke challan ban chuke the, uske items replace karne par
`deliveredQuantity` tracking (`syncOrderDispatchState`) toot jaati thi — challan items
purane `orderItemId` se linked hote hain.

**Root cause:** `update()` items ko bina kisi guard ke replace kar deta tha.

**Fix:** `update()` mein guard add kiya:

- Agar order ke paas **challans hain** (DB check) **ya** status `dispatched/partial/completed`
  hai → items edit **block** (`400 Bad Request`), clear Marathi-English message ke saath
- **Header changes (notes/status/address) allowed** rehte hain — sirf line items locked
- Message suggests: "create a new order" for item changes

**Verified:** Unit tests cover block + allow paths ✅

---

## 3. What Passed (No Changes Needed)

| Check                                                                             | Result                           |
| --------------------------------------------------------------------------------- | -------------------------------- |
| Order create with **Auto numbering** (settings)                                   | ✅ `SO-0001` style auto-generate |
| Order create with **Manual numbering** (no number → clear error)                  | ✅ 400 with guidance             |
| Race-safe create: duplicate `order_number` → auto-retry fresh number (5 attempts) | ✅                               |
| `GET next-number` route — before `:id` route (Express ordering)                   | ✅ no conflict                   |
| FindById attaches line items                                                      | ✅                               |
| Status transitions (`draft → approved → dispatched → partial`)                    | ✅                               |
| Conversion: Order → Delivery Challan (full + partial dispatch)                    | ✅                               |
| Permissions: only `admin`/`manager` can create/update                             | ✅ JWT + CSRF guarded            |

---

## 4. New Automated Tests

**File:** `backend/src/sales/sales-orders.service.test.ts` (7 tests, all passing)

| Test                                               | Verifies                      |
| -------------------------------------------------- | ----------------------------- |
| create assigns auto order number                   | Auto-numbering flow           |
| create rejects missing manual number               | Manual-numbering validation   |
| getNextNumber returns padded SO-0007 format        | Bug 2 fix                     |
| update applies header changes                      | Generic update works          |
| update blocks item edits on dispatched order       | Bug 3 fix (guard)             |
| update allows header-only edit on dispatched order | Guard is scoped to items only |
| update replaces items on draft order               | Normal edit flow preserved    |

---

## 5. Full Validation Matrix

| Validation                            | Result                                             |
| ------------------------------------- | -------------------------------------------------- |
| Backend typecheck (`tsc --noEmit`)    | ✅ exit 0                                          |
| Backend build (`nest build`)          | ✅ exit 0                                          |
| Frontend typecheck                    | ✅ exit 0                                          |
| Backend tests                         | ✅ **155/155** (7 naye sales-order tests included) |
| Frontend tests                        | ✅ **130/130**                                     |
| Live: `PUT /sales/orders/:id`         | ✅ 200 (pehle 404)                                 |
| Live: `GET /sales/orders/next-number` | ✅ SO-0007 (pehle SO-007)                          |
| Backend restarted with new build      | ✅ health 200                                      |

---

## 6. Residual Risks / Future Improvements

1. **Order → Invoice without challan** — allowed by design (conversion service), but invoice
   par challan reference optional rehta hai; future mein strict policy toggle add kiya ja
   sakta hai.
2. **Item-level edit audit** — item replacement par `updated_by` logged hota hai via audit
   module, par line-item granular history nahi; ledger/diff view future improvement.
3. **Batch quantity lock** — partial dispatch ke baad item quantity kam karne ka scenario
   ab blocked hai; future mein "reduce pending only" (smart partial edit) add ho sakta hai.

---

## 7. Conclusion

Sales Order module production-ready ✅ — teeno critical/medium bugs fix kiye, naye tests
se locked kiya, aur pura stack (typecheck + build + 285 tests + live API) green hai.
