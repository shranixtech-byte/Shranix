# H2 — Workflow Approver Verification (P1 Security / Authorization Fix)

**Status:** Complete
**Type:** Security hardening — authorization boundary
**Scope:** Workflow approval engine (`src/workflow/*`), shared transaction manager, frontend approval dialogs
**Validation:** Backend 483/483 (457 prior + 26 new H2 tests) · Frontend 130/130 · Typecheck clean · Lint 0 errors · Build passing

---

## 1. Original Vulnerability (root cause)

The approval action endpoint accepted a **client-supplied identity** and never verified
that the authenticated user was the designated approver for the exact workflow step:

- `instances.controller.ts` resolved the actor as `u?.id || dto.userId` — a missing or
  forged session could fall back to an attacker-chosen `userId`.
- The controller additionally trusted a client-supplied `dto.userRole` for
  role-based eligibility.
- `approval-engine.service.ts` / `instances.service.ts` performed **no designated-approver
  verification**: any authenticated user with a generic workflow permission could approve
  a step assigned to a specific user/role/department.
- `task-engine.service.ts` allowed `completeTask` / `delegateTask` with no
  assignee/role check.

Secondary root cause found during the fix: the enterprise query builder
(`buildEnterpriseConditions`) only understands the **`filters` array** form; a plain
`filter` object is **silently ignored**. Several workflow queries (approval-matrix lookup,
employee-department lookup, dashboard, notifications, comments, tasks, history) used the
ignored form, which caused:

- approval rules from OTHER modules to leak into `determineApprovalLevels` (wrong
  designated approver wins),
- department eligibility to resolve to the FIRST employee row for ANY user
  (cross-user department spoofing),
- dashboards / notifications / comments / history to return rows for other users/instances
  (tenant-isolation leaks).

## 2. Existing Workflow Model (source of truth, reused)

- `shranix_approval_matrix` — per module/documentType/level rules with
  `approvalType` (`user` | `role` | `department`), `approverUserId`, `approverRole`,
  `departmentId`, `isSequential`, `isParallel`, `requiredApprovals`.
- `shranix_workflow_instances` — `approvalLevel`, `maxApprovalLevel`, `status`,
  `currentState`, `assignedToId`, `assignedRole`.
- `shranix_workflow_history` — immutable action audit trail.
- `StateMachineService` — transition guards (illegal-transition rejection).
- **No admin-override feature exists** → admins follow the same designated-approver rule
  (H2.7). Verified: `processApprovalAction` has no override path; `task-engine` treats
  `admin` role as the documented exception for task assignment (matches existing design).

## 3. Authentication Source

The actor is now **always** the server-derived identity:

- User actions: the JWT-authenticated session (`@CurrentUser()` → `{ id, source: 'user' }`).
- System transitions (document status changes via `WorkflowHookService`):
  `{ id, source: 'system' }` — bypasses human-eligibility (they are not human approvals)
  but still records the system actor in the audit trail.

`dto.userId` is:

- **rejected outright** (403) when it differs from the authenticated actor, and
- **never used for authorization** when it matches.

`dto.userRole` is ignored entirely — roles are loaded server-side from
`shranix_user_roles`.

## 4. Approver Determination (H2.4)

`executeAction` → `processApprovalAction` → `verifyApproverEligibility`:

1. Load the workflow instance (re-read **inside the transaction**).
2. Compute the next pending level (`approvalLevel + 1`).
3. Resolve the level config from the approval matrix (`filters` array, amount-filtered).
4. Resolve the actor's server-side `roles` + `departmentId`
   (`roles.getUserRoles` + employee row by `userId`).
5. Eligibility per `approvalType`:
   - `user` → actor.id === approverUserId
   - `department` → actor.departmentId === matrix.departmentId
   - `role` → actor's roles include approverRole (default `manager`)
6. Ineligible → `403 Forbidden` (safe, non-revealing).
7. Then the transition proceeds.

**Generic permission is NOT sufficient** — `workflow.approve`-style permissions do not
bypass designated-approver verification.

## 5. Authorization Rules Applied

| Action                         | Actor source   | Eligibility required                        | Notes                                                   |
| ------------------------------ | -------------- | ------------------------------------------- | ------------------------------------------------------- |
| `approve`                      | session (user) | designated approver for next level          | duplicate guard (`approvalLevel >= maxLevel`)           |
| `approve`                      | system         | none (auto-transition)                      | audit records `system`                                  |
| `reject`                       | session (user) | designated approver                         | persists `status='rejected'`                            |
| `return`                       | session (user) | designated approver                         | **new** — previously unverified                         |
| `submit` / `cancel` / `reopen` | session        | state-machine transition guard              | actor is always session-derived; impersonation rejected |
| task `complete` / `delegate`   | session        | assignee **or** task role **or** admin role | client cannot complete others' tasks                    |

## 6. Admin Override Behavior

The workflow module has **no admin-override feature**. Per H2.7, an admin who is not the
designated approver receives the same `403` (test 8). The only override-like behavior is
the task-engine's documented `admin` exception for task assignment — unchanged, explicit,
and recorded (task `completedBy` / `delegatedFromId`).

## 7. Tenant Isolation (H2.13)

All workflow read paths migrated from the ignored `filter` object to the `filters` array:

- `findByDocument` (duplicate check, hooks, integrations)
- `findByAssignee`, `getHistory`, `getOverdueInstances`
- `taskEngine.findAll` / `findPendingByUser` / `findByInstance` / `markOverdue`
- dashboard `getMyDashboard` (instances by initiator, tasks by assignee)
- `commentsService.findByInstance`
- `notificationEngine.getUserNotifications` / `markAllAsRead` / `getUnreadCount` /
  approver-notification matrix lookup
- `escalationEngine` pending-task query
- `resolveActorAuthorization` employee lookup (department spoofing fix)

## 8. Race Protection (H2.9)

- The whole `executeAction` runs in `TransactionManager.executeInTransaction`; the
  instance is **re-read inside the transaction**, so a concurrent duplicate sees the
  committed state and is rejected by the transition/duplicate guards.
- **New:** `TransactionManager` now performs **bounded SQLITE_BUSY retry** (5 attempts,
  exponential backoff) — the standard SQLite concurrency mechanism. On PostgreSQL
  (production) it is a no-op (never returns BUSY). This lets the losing concurrent
  transaction re-read after the winner commits and hit the state guard, instead of
  failing spuriously.
- **Test:** true concurrency exercised with TWO connections to an isolated SQLite file —
  SQLite's file locking serializes the transactions; the loser retries, re-reads, and is
  rejected by the guard. Result: **exactly one success**, one controlled rejection,
  exactly one approve history row, final state `approved`/level 1.
- Documented platform limitation: a single SQLite connection cannot interleave two write
  transactions (both fail with SQLITE_BUSY); this is inherent to SQLite, not an app bug.

## 9. Audit Trail (H2.10)

- `workflow_history.userId` is always the **server-derived actor** — never
  `dto.userId` (tests 15/16).
- `AuditService.log` receives the authenticated actor.
- Failed eligibility attempts throw `403` inside the transaction → rolled back with **no
  partial state** (test 20) and **no history row** for the failed attempt.

## 10. Tests (H2.12 — real DB + real migrations)

New file: `backend/src/workflow/approval-authorization.service.test.ts` — **26 tests**:

1. Correct designated user approves → SUCCESS
2. Wrong user approves → FORBIDDEN
3. Client userId impersonation → FORBIDDEN
4. Missing authentication → safe denial
5. Generic permission without eligibility → FAIL
6. Correct role-based approver (level 2, manager) → SUCCESS
7. Wrong role → FORBIDDEN
8. Admin without override → FORBIDDEN
9. Already-approved step → duplicate approval fails
   10b. Duplicate guard (level already maxed) → FAIL
10. Already-rejected workflow → approval fails
11. Wrong workflow level → FORBIDDEN
12. Out-of-order approval → FORBIDDEN
13. Concurrent duplicate approval → exactly one success (two-connection race)
14. Audit trail records the authenticated actor
15. Client userId cannot alter the audit actor
16. Cross-scope workflow access → denied; correct department approver succeeds
    17b. Department-based approval: non-department user → FORBIDDEN
17. Invalid workflow ID → safe error
18. Missing approver (user-type matrix with no designated user) → safe failure
19. Failed approval leaves no partial state (transaction rollback)

- Reject: only designated approver can reject
- Return: only designated approver can return to draft
- System-triggered transitions (document status changes) still work
- Task completion: non-assignee cannot complete another user's task
- Task delegation: only the assignee (or admin) may delegate

## 11. Security Tests (H2.17)

Covered by the matrix above: IDOR (18), userId spoofing (3, 16), role spoofing (7),
approval-level spoofing (12, 13), workflow-ID manipulation (18), admin privilege
escalation (8), duplicate approval (10, 10b, 14), cross-scope/cross-customer approval
(17, 17b). Replay is outside H2 scope (no idempotency key exists for approval actions;
state guards prevent double-transition — documented as a limitation).

## 12. Files Changed

**Backend**

- `src/workflow/services/approval-engine.service.ts` — eligibility verification
  (user/role/department), `return` eligibility, `filters`-array matrix lookup, actor
  interface (`source: 'user' | 'system'`)
- `src/workflow/services/instances.service.ts` — actor-based `executeAction`,
  impersonation guard, transaction race protection, server-side roles/department
  resolution, `filters`-array fixes for `findByDocument` / `findByAssignee` / `getHistory`
  / `getOverdueInstances`
- `src/workflow/services/task-engine.service.ts` — assignee-or-role-or-admin check on
  `completeTask` / `delegateTask`; `filters`-array fixes for task queries +
  `createApprovalTasks`
- `src/workflow/controllers/instances.controller.ts` — server-derived actor only; no
  `dto.userId` fallback
- `src/workflow/services/workflow-hook.service.ts` — system transitions pass
  `source: 'system'`
- `src/automation/transaction.manager.ts` — bounded SQLITE_BUSY retry (SQLite concurrency)
- `src/workflow/controllers/dashboard.controller.ts` — `getMyDashboard` isolation fix
- `src/workflow/services/comments.service.ts` — `findByInstance` isolation fix
- `src/workflow/services/escalation-engine.service.ts` — pending-task query fix
- `src/workflow/services/notification-engine.service.ts` — approver-notification matrix
  lookup + user-notification isolation fixes

**Frontend**

- `src/pages/workflow/approval-dialogs.tsx` — removed client `userId`/`userRole` from
  request payloads and props (backend is the only authority)

**Tests**

- `src/workflow/approval-authorization.service.test.ts` — 26 real-DB tests (new)

## 13. Regression / Validation Results

| Check                                       | Result                           |
| ------------------------------------------- | -------------------------------- |
| H2 test file                                | 26/26 passed                     |
| Backend full suite                          | **483/483** (457 prior + 26 new) |
| Frontend suite                              | **130/130**                      |
| Typecheck (backend / frontend / database)   | clean                            |
| Lint                                        | 0 errors                         |
| Build (backend `nest build`, frontend vite) | passing                          |
| Phase 12–16 regression                      | no failures                      |

## 14. Remaining Limitations

1. **Legacy sales approval engine** (`src/sales/approval-engine.service.ts` +
   `approval.controller.ts` at `/sales/approvals/workflow/*`) is a separate Phase-10-era
   role-based system. Its actor is already session-derived and role-gated (`@Roles` +
   `@Permissions`), but it does **not** verify the designated approver at the current
   level against `assignedTo` / matrix role. Out of H2 scope (workflow module); no
   dedicated tests exist, so it is documented here as a recommended follow-up (H3)
   rather than changed untested.
2. **Replay protection**: approval actions have no explicit idempotency key; duplicate
   transitions are prevented by the state guard + transaction, but a replayed _identical_
   request after a rollback could be retried. Acceptable for current threat model;
   a per-request nonce is a recommended enhancement.
3. **No admin override** in the workflow module — by design (H2.7); if a future
   requirement needs one, it must be explicit, permission-gated, and audited.
4. **SQLite single-connection** cannot run two interleaved write transactions
   (platform limitation). Multi-connection concurrency + BUSY retry is covered by the
   race test; PostgreSQL (production) relies on row locking.
