# H3 — Legacy Sales Approval Engine: Designated Approver Security

**Status:** Complete
**Type:** P1/P2 security hardening follow-up (H2 §14.1 limitation)
**Scope:** `/sales/approvals/workflow/*` only — `src/sales/approval-engine.service.ts` (+ test)
**Validation:** Backend 502/502 (483 prior + 19 new H3 tests) · Frontend 130/130 · Typecheck clean · Lint 0 errors · Build passing

---

## 1. H2 Limitation Being Closed

H2 hardened the main Workflow Engine (`processApprovalAction`) but explicitly left the
**legacy Sales Approval Engine** (`SalesApprovalEngineService`) as a documented follow-up:
its actor was already session-derived, but the engine **never verified that the
authenticated user was the designated approver for the current approval level**.

## 2. Legacy Architecture

- **Controller:** `SalesApprovalController` at `sales/approvals/workflow/*`
  (`src/sales/approval.controller.ts`) — all mutation endpoints use
  `@CurrentUser() u` and pass `u.id` to the engine. Class-level `@UseGuards(JwtAuthGuard)`
  - `@Roles(...)` + `@Permissions(...)` gates.
- **Engine:** `SalesApprovalEngineService` (`src/sales/approval-engine.service.ts`).
- **Tables (unchanged, no migration):** `approval_matrices` (per-documentType,
  `approvers` JSON), `sales_approvals` (`currentLevel`, `totalLevels`, `status`,
  `assignedTo`), `approval_history` (`actionBy`), `approval_comments`,
  `approval_notifications`, `approval_rules`.
- **Approver model:** matrix `approvers` JSON entries per level:
  `{ level, role?, userId?, canOverride?, minAmount?, maxAmount? }`.
  Seeded chains: sales_invoice manager→admin, sales_quotation operator→manager→admin,
  credit_note manager→admin, etc. `canOverride: true` is the **explicit legacy admin
  override at that level only** (e.g. level-2 admin).
- **Frontend:** `src/services/sales-approval.service.ts` sends only
  `{ comment, reason }` / `{ comment, reason, targetLevel }` — no client identity
  fields. `assignApproval` sends `assignToUserId` (the reassignment _target_, a
  legitimate business parameter, not the acting identity).

## 3. Root Cause

`approve` / `reject` / `sendBack` performed **no designated-approver verification**:
any authenticated user holding `admin`/`manager` + `sales.approve`/`sales.reject` could
act at ANY level of ANY document — including levels designated for another role
(e.g. finance_head) or a specific user — and even at levels where the matrix intends a
different approver. Mutations were also **non-transactional** (state + history + audit
were separate writes with no rollback).

## 4. Affected Endpoints

| Endpoint                                                | Auth                                       | Before H3                                 | After H3                                                           |
| ------------------------------------------------------- | ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------ |
| `POST /sales/approvals/workflow/:id/approve`            | JWT + Roles(admin,manager) + sales.approve | any admin/manager could approve any level | designated approver for current level only                         |
| `POST /sales/approvals/workflow/:id/reject`             | JWT + Roles(admin,manager) + sales.reject  | same weakness                             | designated approver for current level only                         |
| `POST /sales/approvals/workflow/:id/send-back`          | JWT + Roles(admin,manager) + sales.reject  | same weakness                             | designated approver for current level only                         |
| `POST .../:id/assign`                                   | JWT + Roles(admin,manager) + sales.update  | management action (unchanged)             | unchanged — role-gated management action, actor is session-derived |
| `POST .../bulk-approve` / `bulk-reject` / `bulk-assign` | same gates                                 | iterated the above                        | per-item eligibility enforced via the same engine methods          |
| `POST .../:id/comments`, `GET ...` reads, `settings/*`  | various                                    | read-only / settings                      | unchanged                                                          |

## 5. Authentication Source

Actor = authenticated JWT session (`@CurrentUser()` → `u.id`). **Never** `dto.userId`,
`dto.userRole`, query, or frontend identity. The legacy `ApproveRejectDto` /
`SendBackDto` / `AssignDto` contain **no identity fields**; roles are resolved
server-side from `shranix_user_roles` (`roles.getUserRoles`).

## 6. Designated Approver Model (server-side verification)

New `verifyDesignatedApprover(master, userId)`:

1. Load the active matrix for the record's `documentType`.
2. Parse `approvers` entries for the record's **current level**
   (`master.currentLevel`).
3. Resolve the actor's server-side roles.
4. Eligible if **any** entry at that level matches:
   - `entry.userId` → actor must equal that exact user (user-based approval), **or**
   - `entry.role` → actor must hold that role (role-based), **or**
   - `entry.canOverride` → actor must hold the `admin` role (explicit legacy
     override at that level only).
5. No matching entry / no matrix / malformed approvers → **safe 403**
   ("missing approver → safe failure").

Generic permission (e.g. `sales.approve`) is **not** sufficient. The check runs
**before any mutation** (H3.7).

## 7. State Machine Protection

Existing `validateAction` (unchanged) rejects: already-approved, rejected, cancelled,
closed, and draft-without-submit. Combined with the new level check:

- wrong level / out-of-order → 403 (level-1 approver cannot act at level 2; level-2
  approver cannot skip level 1),
- duplicate / replay → 400 ("Document is already approved" / "has been rejected"),
- invalid ID → 404.

## 8. Transactional Integrity

`approve`, `reject`, `sendBack` now run inside the shared
`TransactionManager.executeInTransaction` (the existing abstraction — no second
transaction system). State update + history insert + notification + audit + quotation
sync are atomic: any downstream failure rolls everything back (test 20 proves a
failing audit write leaves the record at `pending` with zero history rows).

## 9. Tenant / Customer / Company Isolation

SHRANIX KRUSHI ERP is a **single-tenant** application — the `customerId` on a sales
approval is a sales-customer master reference, not a tenant boundary, so there is no
cross-tenant key to enforce. Isolation is instead authorization-based: an approver
designated for approval A cannot act on approval B (test 15), invalid IDs → 404, and
ineligible actors → 403 (no data disclosure). Documented honestly rather than inventing
a tenant model that does not exist.

## 10. Concurrency

Mutations re-read the record **inside the transaction**. Concurrent duplicate attempts:

- Single-connection SQLite: the platform serializes writes; the second attempt hits
  the state guard (400).
- True concurrency test (H3 test 17): **two connections** to an isolated SQLite file +
  `TransactionManager`'s bounded `SQLITE_BUSY` retry (added in H2) → the loser
  re-reads the winner's committed state and is rejected. Result: **exactly one
  success**, one controlled rejection, final state `approved`, exactly one approve
  history row.
- Platform limitation documented: a single SQLite connection cannot interleave two
  write transactions (inherent to SQLite); PostgreSQL (production) relies on row
  locking and never hits BUSY.

## 11. Audit Behavior

- `approval_history.actionBy` = the server-passed session actor (tests 18/19) — a
  comment mentioning another user cannot alter the recorded actor.
- Failed eligibility attempts throw 403 inside the transaction → rolled back, no
  history row, no state change (test 2).
- `AuditService.log` receives the session actor for approve/reject/send-back.
- No passwords/JWTs/secrets are logged.

## 12. Tests (H3.15 — real DB + real migrations)

New file: `backend/src/sales/approval-authorization.service.test.ts` — **19 tests**:

1. Correct role-based approver (manager @ L1) → SUCCESS
2. Wrong user (employee) → FORBIDDEN, no state/history change
3. Client userId spoofing → blocked (server-derived actor)
4. Client userRole spoofing → blocked (server-side role resolution)
5. Generic permission without designated eligibility → blocked
6. Specific designated user → only that user succeeds (userId-based; manager AND
   admin both 403 at L1)
7. Already approved → duplicate blocked (400)
8. Already rejected → blocked (400)
9. Wrong approval level → L1 approver cannot act at L2 (403); L2 admin succeeds
10. Out-of-order → L2 approver cannot skip L1 (403)
11. Invalid approval ID → 404
12. Cross-scope → designated approver of A cannot act on B (403 both ways)
13. Duplicate approval → blocked (400)
14. History actor = server actor
15. Client identity cannot change audit actor
16. Downstream (audit) failure → full transaction rollback

- Reject: only designated approver can reject
- Send-back: only designated approver can send back
- 17. Concurrent approval → exactly one successful transition (two-connection)

## 13. Files Changed

- `backend/src/sales/approval-engine.service.ts` — `verifyDesignatedApprover`,
  `runInTransaction`, eligibility checks in `approve`/`reject`/`sendBack`,
  optional `TransactionManager` injection (DI resolves it via AutomationModule).
- `backend/src/sales/approval-authorization.service.test.ts` — 19 real-DB tests (new).
- No controller changes required (actor already session-derived; guards already in
  place). No frontend changes required (no identity in payloads). **No database
  migration.**

## 14. Regression / Validation

| Check                                       | Result                           |
| ------------------------------------------- | -------------------------------- |
| H3 test file                                | 19/19 passed                     |
| Backend full suite                          | **502/502** (483 prior + 19 new) |
| Frontend suite                              | **130/130**                      |
| Typecheck (backend / frontend)              | clean                            |
| Lint                                        | 0 errors                         |
| Build (backend `nest build`, frontend vite) | passing                          |

## 15. Remaining Limitations

1. **`assign`** remains a role-gated management action (`admin`/`manager` +
   `sales.update`) with no designated-level check — the legacy model does not
   designate assigners; the acting identity is still session-derived.
2. **Replay** has no explicit idempotency nonce; duplicate transitions are blocked by
   the state guard + transaction, but an identical request could be retried after a
   server-side rollback (same accepted limitation as H2).
3. **`canOverride`** semantics are honored exactly as the seeded matrices define them
   (per-level, admin role). No blanket admin bypass was introduced.
4. No dedicated controller/guard integration test for "missing authentication" — the
   `JwtAuthGuard` is class-level on the controller (verified) and rejects
   unauthenticated requests before the handler; service-level tests cover the
   authorization boundary.
