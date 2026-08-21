# SHRANIX KRUSHI ERP — MASTER AUDIT

**Audit date:** 2026-08-14 · **Audit type:** Evidence-based, read-only (no code modified, no commits)
**Baseline commit:** `4d3257b` (feat: complete phases 15-17 security licensing and production readiness)

---

## 1. Executive Summary

The repository contains a genuinely large ERP + commercial-licensing platform: **79 backend
controllers, 149 services, 223 SQLite tables (27 migrations, journal-consistent), 718 API route
methods, 195 frontend pages, 348 frontend route paths**, a Tauri desktop shell, and an installer
script. The Phase 12–17 licensing/commercial/security stack is **well-built and well-tested**
(commercial 25, license 43, activation 17, security+token+release ~24 tests, portal isolation 19).

Validation claims from the checkpoint were **verified true**: 433 backend tests green (346
`it()`-style assertions across 34 files), 130 frontend tests green (13 files), typecheck/lint/
build clean, secret scan clean, working tree clean.

**However**, the audit found evidence of real, non-cosmetic issues:

- **P1 — Inventory ledger split:** two stock-ledger tables (`shranix_inv_stock_ledger` vs
  `shranix_stock_ledger`) with different column conventions written by different modules —
  product stock shown in inventory may not reflect sales/purchase movements.
- **P1 — Workflow approval lacks per-level approver verification:** `processApprovalAction`
  increments `approvalLevel` on any `approve` without checking the caller is the designated
  approver for that level; controller falls back to client-supplied `dto.userId`.
- **P1 — 188 unbounded queries** (`pageSize: 5000/10000`) across services — scale risk.
- **P2 — Sales posting is best-effort on accounting/stock:** GL, GST, cash-book, and stock
  deduction are wrapped in try/catch with warnings (fresh installs without a chart of accounts
  post invoices with _no_ GL entry; oversell is silently clamped to 0 instead of blocked).
- **P2 — Zero test coverage** for DMS, AI, Integrations, Notifications, Governance, Automation,
  Workflow, and backup/restore modules.
- **P2 — Schedulers are in-process `setInterval`** with no distributed locking — duplicate
  execution risk with 2+ replicas.
- **P3 — ERP-level multi-tenancy is not present:** ERP tables' `customer_id` is the _sales
  customer_, not a tenant key. The ERP is single-tenant-per-installation; the **central server**
  is the multi-tenant surface (correctly isolated via JWT `customerId` + `assertOwned` → 404).

**Final verdict: INTERNAL READY** — engineering-complete with documented gaps; **not** STAGING
READY (no real staging environment has been stood up and validated) and **not** PRODUCTION READY
(no TLS/certs/HSM/CDN/prod DB — external).

---

## 2. Repository Baseline

| Item                   | Verified value                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Branch                 | `main`                                                                                                                            |
| Commit                 | `4d3257b`                                                                                                                         |
| vs remote              | **ahead 3** (4d3257b, 5d44506, d4f2a53) — never pushed                                                                            |
| Working tree           | **clean** (nothing staged, nothing modified)                                                                                      |
| Untracked files        | none                                                                                                                              |
| .env / secrets tracked | only `.env.example` + `deployment/.env.production.template` (placeholders)                                                        |
| Ignored sensitive      | `.env*`, `*.pem/key/cert`, `*.db`, backups, logs, node_modules — confirmed via `.gitignore` + `git check-ignore`                  |
| Recent history         | 4d3257b (P15–17) → 5d44506 (P12–14) → d4f2a53 (masters+payments) → 95d04dd (docs) → 07e32f0 (finance) → 4578528 → 30a7412 (sales) |

**Evidence:** `git status` clean · `git diff` empty · `git ls-files` shows no real env/db/artifact
files. Phase 15/16/17 work is **one commit behind origin** (unpushed, intact).

---

## 3. Phase 1–17 Status

Legend: 🟢 complete · 🟡 partial · 🟠 needs verification · 🔴 missing · ⚫ external dependency

| #   | Phase                | Status | Backend                               | Database   | Tests                | Docs | Production        |
| --- | -------------------- | ------ | ------------------------------------- | ---------- | -------------------- | ---- | ----------------- |
| 1–2 | Core ERP foundation  | 🟢     | 79 controllers                        | 223 tables | 433 green            | ✅   | 🟠                |
| 3   | Master data          | 🟢     | masters, customers/suppliers/products | yes        | yes                  | ✅   | 🟠                |
| 4   | Accounts/Finance     | 🟢     | finance+gl+advanced-finance           | yes        | gl engine test       | ✅   | 🟠                |
| 5   | Reports/Analytics    | 🟢     | analytics, bi, report-engine          | yes        | analytics test       | ✅   | 🟠                |
| 6   | CRM                  | 🟢     | crm (leads/opps/engagement)           | 9 tables   | 7 tests              | ✅   | 🟠                |
| 7   | Communication        | 🟢     | comm + notification + templates       | 4+ tables  | 11 tests             | ✅   | ⚫ providers      |
| 8   | HR & Employees       | 🟢     | hr (7 services)                       | 15 tables  | 8 tests              | ✅   | 🟠                |
| 9   | Assets & Expenses    | 🟢     | assets (11 tables)                    | yes        | assets test          | ✅   | 🟠                |
| 10  | Workflow/Approval    | 🟡     | workflow (8 tables, 14 services)      | yes        | **no tests**         | ✅   | ⚠️ approver check |
| 11  | Customer Portal      | 🟢     | portal (6 tables, 6 controllers)      | yes        | 19 tests + isolation | ✅   | 🟠                |
| 12  | Subscription/Billing | 🟢     | commercial (10 tables)                | yes        | 25 tests             | ✅   | ⚫ payment creds  |
| 13  | License engine       | 🟢     | license (7 tables)                    | yes        | 43 tests             | ✅   | 🟠                |
| 14  | Installer/Activation | 🟢     | activation module                     | yes        | 17 tests             | ✅   | ⚫ clean Win test |
| 15  | Security/Anti-piracy | 🟢     | security events + token hardening     | 1+ tables  | ~24 tests            | ✅   | ⚫ HSM/signing    |
| 16  | Central/Releases     | 🟢     | releases + central KPIs               | 4 tables   | 13 tests             | ✅   | ⚫ CDN/storage    |
| 17  | DevOps/Production    | 🟡     | env validation, runbooks, CI          | —          | env tests            | ✅   | ⚫ infra          |

---

## 4. Core ERP Audit

**Sales flow (traced):** Customer → Quotation (submit-approval → convert) → Sales Order (convert)
→ Delivery Challan (convert) → Invoice (post) → Payment collection → Customer ledger → Stock
deduction → Reports. Routes exist at every hop (`sales/quotations`, `sales/orders`,
`sales/delivery-challans`, `sales/invoices`, `sales/returns`, `sales/payment-collection`,
`sales/reports`, `sales/approvals`, `sales/credit`).

**Found:** posting engine is **transactional + idempotent** (already-posted guard, single
`executeInTransaction`). But **accounting/stock writes are best-effort** (see §8/§9) — a fresh
install without a chart of accounts posts invoices with no GL entry. Return engine reverses stock
into `stockLedger` with a _different column convention_ (`movementType/receivedQty/closingQty`)
than the sales posting engine (`transactionType/beforeQty/afterQty`) — same table, different
shapes.

**Purchase flow (traced):** Supplier → PO → Purchase invoice (post) → stock increase → supplier
payable → payment → ledger. Purchase posting writes supplier ledger (ledger_master balance) +
journal + GST + stock, all inside one transaction — **stronger than sales** (throws on GL
failure rather than skipping).

---

## 5. Database Audit

**27 migrations, journal-consistent** (27 entries, 27 SQL files, max idx 26). No orphaned or
missing migration files.

**223 SQLite tables** across 30 schema files: inventory 37, purchase 23, sales 23, hr 15,
gst_audit 13, assets 11, commercial 10, finance 10, masters 9, crm 9, dms 8, workflow 8,
license 7, auth 6, customers 6, portal 6, control 5, gl 5, communication 4, release 4,
security 1, audit 1, physical-count 2.

**P1 — Duplicate stock-ledger concept:**

- `shranix_inv_stock_ledger` (inventory schema; written by inventory services, read by
  `products-master.service.ts`)
- `shranix_stock_ledger` (purchase schema; written by sales posting + return engine + purchase
  services, read by analytics)
- Impact: the product card's `currentStock`/`stockHistory` (read from `invStockLedger`) can
  disagree with `stockLedger` rows written by sales/purchase posting. No reconciliation job found.

**Indexes/FKs:** unique indexes on numbering/idempotency columns exist (sub_number, bi_number,
bp_idem, cp_code, cr_coupon_customer, pv_plan_version, warehouse_stock, inv_ledger_entry_no…).
FK constraints are **not** declared at schema level (SQLite/PG tables omit `.references()` in most
places) — referential integrity is application-enforced.

---

## 6. Backend/API Audit

- **79 controllers, 718 route methods.** Modules: activation, ai, analytics, assets, audit,
  auth, automation, backup, central, commercial, communication, control, crm, dashboard,
  data-management, dms, finance, gl, governance, gst_audit, health, hr, integrations, inventory,
  license, masters, multi-company, notifications, pdf, portal, printer, purchase, releases,
  roles, sales, security, users, workflow.
- **23 `@Public` routes** across 7 controllers: auth (register/login/refresh/csrf), activation
  (activate/validate/trial/offline), health (live/ready/status/metrics), portal-auth,
  releases `download/:token` (HMAC-token auth — safe), billing webhook (HMAC auth — safe). PDF
  generate is correctly **not** public.
- **Rate limiting:** global `ThrottlerBehindProxyGuard` + per-route `@Throttle` on activation
  endpoints. ✅
- **CSRF:** global guard — enforced on state-changing methods, skipped on public + GET. ✅
- **Input validation:** global `ValidationPipe` (transform). ✅
- **Error handling:** global exception filter with errorId/requestId, no stack in production. ✅
- **Tenant isolation:** portal/central/license/security customerId-scoped (JWT-derived); ERP
  routes are single-tenant (see §19).

---

## 7. Frontend Audit

- **195 page files, 348 route paths** (`frontend/src/routes/index.tsx`), 30+ service modules,
  activation gate, PWA (sw.ts), offline-db, GPS, barcode/camera (mobile).
- **13 test files, 130 tests** — cover: auth login, krushi-bill templates, quotation PDF,
  routes, responsive hook, mobile (barcode/bottom-nav/camera), gps, offline-db, push, pwa.
- **Coverage gap:** the 195 pages have almost **no page-level component tests**; tests are
  utility/service-level. No E2E suite (`playwright` config exists under tests/ but no suites
  found).
- No hardcoded customer IDs found; API base from `VITE_API_URL` with safe fallback.

---

## 8. Accounting/Financial Integrity

- **GL posting engine** validates debit=credit per batch, rejects unbalanced entries, is
  transactional, and idempotent per (voucher, account) unique index. ✅
- **Sales posting GL:** writes a **single summary row** to `gl_entries` on the receivable
  account (not full double-entry lines for revenue/tax) and **skips entirely when no receivable
  account exists**. GST ledger + cash book likewise skip on missing config. → **P2:** invoices
  can post with no accounting trail on fresh installs.
- **Purchase posting GL:** full journal (Purchase A/c, Input GST, Supplier) — throws on failure.
- **Reports:** trial-balance, balance-sheet, P&L routes exist with `finance.read`.
- No test asserts **actual ledger balances** across the full sales→payment→report cycle (the GL
  test covers engine balance checks only).

---

## 9. Inventory Integrity

**P1 — Stock math cannot be verified as consistent across modules:**

```
Opening + Purchases + TransfersIn + AdjustIn − Sales − Returns − TransfersOut − AdjustOut
```

- Sales deduction: `warehouseStock` update **clamped `Math.max(0, …)`** → **oversell is never
  blocked**, it silently clamps to zero (no negative stock, but no insufficient-stock error).
- Sales/returns write to `shranix_stock_ledger`; inventory reads `shranix_inv_stock_ledger` →
  the two ledgers are disconnected. No reconciliation query found.
- Sales stock deduction is wrapped in try/catch and **non-fatal** ("stock record missing →
  deduction skipped, invoice still posts").

---

## 10. CRM Audit

CRM module (leads, opportunities, engagement, dashboard) — routes + 9 tables, 7 tests. Basic
CRUD/search/filter exists. No deep engagement-flow integration test.

---

## 11. Workflow/Approval Audit

- Workflow engine: templates, matrices, instances, tasks, state machine, escalation, comments,
  notifications — 8 tables, 14 services. ✅ breadth.
- **P1 — approver verification gap:** `processApprovalAction(instance, dto)` approves by
  incrementing `approvalLevel`; it does **not** verify that `dto.userId` is the approver
  assigned to the current level (rule `approverUserId` is only used when _creating_ the task).
  Controller gates on `@Roles('admin','manager')` + `@Permissions('workflow.create')` and falls
  back to client `dto.userId` if `CurrentUser` is absent. Any admin/manager can approve any
  instance at any level.
- **Sales approval:** quotations have approval chain; invoice posting itself does **not**
  require approval (auto-approved when no validation failures).
- **No workflow tests.**

---

## 12. Customer Portal Audit

- Portal JWT strategy; all controllers derive `customerId` from the token (never from body).
- `assertOwned()` returns **404** on cross-customer (no existence leak). ✅
- **Tests verify isolation:** `getInvoice(customerB.id, invoiceA.id) → not found`, tickets
  cross-customer → not found. ✅
- 6 controllers: portal, portal-admin, portal-auth, portal-billing, portal-license,
  portal-payments, portal-tickets.

---

## 13. Commercial/Billing Audit

- Plans + versions (immutable), subscriptions state machine (TRIAL→ACTIVE→PAST_DUE→GRACE→
  SUSPENDED→EXPIRED, CANCELLED/UPGRADED/DOWNGRADED), billing invoices, payments with
  idempotency keys, coupons (atomic per-customer unique index), usage records, entitlements,
  reminders (deduped), commercial reports. **25 tests cover the full lifecycle + security
  matrix.**
- Webhook: HMAC + `timingSafeEqual` + timestamp window (replay) + amount/currency
  reconciliation + idempotency + security events on failure. ✅ strong.
- ⚫ Payment provider live credentials are external.

---

## 14. License/Activation Audit

- License: 7 tables; device limit enforcement, transfers, revocation, expiry, scheduler,
  dashboard, reports. **43 tests** incl. race/idempotency/isolation.
- Activation: activate/validate/trial/offline-request/offline-verify/public-key/update/ping,
  per-route throttles (5/min activate, 3/h offline-request). **17 tests.**
- Tokens: RSA-2048 signed, kid-based key rotation, algorithm whitelist (rsa-sha256), nbf/exp,
  offline device binding. **14 token-security tests.**
- ⚫ Clean-Windows installer validation, signing cert, HSM/KMS = external.

---

## 15. Security Audit

- Authentication: JWT access + refresh (httpOnly cookie), CSRF cookie+header, password hashing.
- Authorization: RolesGuard + PermissionsGuard (`license.*`, `release.*`, `finance.*`,
  `workflow.*`, …) + permission cache.
- Security events engine (`shranix_security_events`): 19 event types, severity, response
  policy, masked metadata. **6 tests.**
- Rate limiting: global + per-route. ✅
- Secret scan: clean (tree + history). `.gitignore` verified.
- **P2/P3:** no dedicated IDOR/privilege-escalation test suite against _ERP_ endpoints (portal
  isolation is tested; ERP is single-tenant so IDOR surface is smaller); permission matrix
  (sec 18) shows families but no exhaustive route×permission test.

---

## 16. Release/Update Audit

- Release registry (4 tables): software_releases, release_packages (sha-256 + signature
  metadata), release_channels, version_compatibility. Lifecycle DRAFT→PUBLISHED→REVOKED.
- `GET /activation/update` resolves from registry (KV fallback for backward compat) — verified
  in tests. Verdicts: UPDATE_AVAILABLE / UPDATE_RECOMMENDED / UPDATE_REQUIRED /
  VERSION_SUPPORTED / VERSION_BLOCKED.
- Download: short-lived HMAC tokens; revoked releases never downloadable; customer-specific
  eligibility. **13 release tests + 4 permission tests.**
- ⚫ CDN/object-storage + code-signing cert = external.

---

## 17. DevOps/Production Audit

**Actually implemented (verified in code, not just docs):**

- Zod env validation wired into ConfigModule (fail-fast) with production secret guards; env-file
  separation dev/staging/prod.
- Request-id middleware + errorId correlation; structured pino logs (masked).
- `ThrottlerBehindProxyGuard` global.
- CI: `security` job (gitleaks + repo secret scan + `pnpm audit --audit-level=high --prod` +
  semgrep) gating docker-build.
- Health: /health, /health/live, /health/ready, /health/metrics, /health/status.
- Status page (static + endpoint). 13 runbooks. Secret-scan script.
- Dependency hardening (multer 2.2.0, xlsx 0.20.3 CDN, drizzle 0.45.2, react-router 7.18.2,
  qs 6.15.2) — verified in lockfile.

**Documented but NOT provisioned (external):** TLS certs, DNS, code-signing cert/HSM, license
signing key in KMS, object storage/CDN, prod DB hosts, monitoring stack deployment, backup
restore drill, clean-Windows test, load test.

---

## 18. Permission Matrix

Verified families (route-level `@Permissions`): `sales.*`, `purchase.*`, `inventory.*`,
`finance.*`, `workflow.*`, `commercial.*`, `license.*`, `security.view`, `release.view/manage/
publish/revoke/download`, `asset.*`, `dms.*`, `hr.*`(implied), `communication.*`, `ai.*`,
`branch/company.*`, `integration.webhook` etc.

- **Roles:** admin/manager/accountant/employee/user; seed services create permissions idempotently
  (release-permission-seed verified by test).
- **Gap:** no automated test proving every `@Permissions(...)` string is seeded (only the
  release family is tested). API/UI mismatch not exhaustively verified.

---

## 19. Tenant Isolation

**Central (multi-tenant) surface — GOOD:** portal/license/security/central controllers derive
`customerId` from JWT; `assertOwned` → 404; isolation tests pass. Release download eligibility
enforced. Commercial subscriptions are customer-scoped.

**ERP surface — single-tenant by design:** ERP tables' `customer_id` is the _sales customer_
(party), not a tenant key; there is no `tenant_id` column in ERP schemas. Multi-company module
scopes by `companyId/branchId` for internal multi-branch use. **This is an architecture choice,
not a bug** — but it means "customer A cannot see customer B's ERP data" is only true if each
customer runs a separate installation/DB (which the licensing model implies).

---

## 20. Performance

- **P1 — 188 unbounded queries** (`pageSize: 5000/10000`) across: products-master (18),
  report-engine (15), customers (13), suppliers (12), kpi-engine (12), inventory services (11),
  commercial-reports (11), license-reports (8), entitlements (8), coupons (6), assets, expenses,
  dashboard, analytics.
- Dashboard/KPI queries fetch whole tables then aggregate in JS (bounded page sizes but large
  caps). KPI layer has 60s TTL cache.
- Pagination exists on list endpoints; reports/ledgers fetch 5–10k rows per call.

---

## 21. Background Jobs

- Schedulers: license-scheduler, commercial-scheduler, communication-scheduler, backup
  (all `setInterval`-based), permission-cache cleanup.
- **P2 — no distributed locking / leader election:** with 2+ replicas, schedulers can run
  concurrently (idempotency mostly mitigates: reminders deduped, payments claim-transition,
  backup prunes duplicates; license scheduler untested for concurrency).
- No @nestjs/schedule Cron jobs; no dead-job/orphan-job monitoring.

---

## 22. Testing

**Verified:** Backend 47 files / 433 tests green · Frontend 13 files / 130 tests green ·
typecheck clean · lint 0 errors · builds pass · secret scan clean.

**Coverage by module (evidence):** sales 55, purchase 50, license 43, commercial 25, portal 19,
activation 17, communication 11, hr 8, crm 7, control 7, analytics 7, security 6, assets ~12,
central 6, config 6, token-security 14, release 13+4.

**Gaps:**

- **Zero test files** for: dms, ai, integrations, notifications, governance, automation
  (gl engine tested via finance test), workflow, backup/restore.
- No E2E suite (playwright config present, no suites).
- No load test, no backup-restore test, no clean-machine test.

---

## 23. Documentation

- ✅ Current: PHASE14/15/16/17 docs, Security_Architecture, 13 runbooks, DEPLOYMENT.md,
  DATABASE.md, ARCHITECTURE.md, API_REFERENCE.md, deployment/go-live-checklist,
  release-manifest, admin-guide, README, SECURITY.md, MASTER_DEVELOPMENT_REPORT, TODO.
- 🟡 Outdated: `deployment/go-live-checklist.md` references port 3001 and `/health` paths that
  no longer match (4001, `/v1/health`); RELEASE_NOTES/REPORT.md may lag.

---

## 24. External Dependencies

| Dependency                                        | Required           | Configured | Production blocker  |
| ------------------------------------------------- | ------------------ | ---------- | ------------------- |
| DNS/domains (api/portal/license/downloads/status) | yes                | no         | ✅                  |
| TLS certificates                                  | yes                | no         | ✅                  |
| Production DB host (PG)                           | yes                | no         | ✅                  |
| Redis                                             | optional (caching) | no         | —                   |
| Object storage / CDN                              | yes (releases)     | no         | ✅                  |
| Payment provider (Razorpay/Stripe) live creds     | yes                | no         | ✅                  |
| Email/SMS provider creds                          | yes                | no         | ✅ (test-mode only) |
| Code-signing cert (Authenticode/Tauri)            | yes                | no         | ✅                  |
| HSM/KMS for signing keys                          | recommended        | no         | ✅                  |
| Monitoring/alerting stack                         | yes                | no         | ⚠️                  |
| Error tracking (Sentry etc.)                      | optional           | no         | —                   |
| CI/CD secrets (GH Actions)                        | yes                | no         | ⚠️                  |
| Backup infrastructure (offsite)                   | yes                | no         | ⚠️                  |

---

## 25. Duplicate/Dead Code Findings

**Duplicates:**

1. **Two stock-ledger tables** (`inv_stock_ledger` vs `stock_ledger`) — source of truth unclear;
   recommend consolidating on one with a migration (do NOT do now).
2. **Customer/supplier master in two places:** `sales/customers.service.ts` + `customers.ts`
   schema vs `masters.ts` — the customers schema (`shranix_customers`) is the source; master-data
   customers module may overlap (needs verification).
3. **Auth in two places:** `auth/` (ERP users) vs `portal-auth` (customers) — intentional
   (different identities), not a bug.
4. **Notifications:** `notifications/` + `communication/` overlap in channels/reminders.

**Dead/unverified:** `data-management` (generic import/export) may overlap with per-module
imports; `integration` api-keys/webhooks modules have no tests; `governance` (retention/legal
holds) has no tests and unknown usage; `physical-count` schema separate from inventory schema.

---

## 26. P0 Critical Issues

**None found.** No evidence of an exploitable cross-tenant data leak, no committed secrets, no
corrupting migration, no destructive default behavior.

---

## 27. P1 High Issues

1. **Inventory ledger split / stock inconsistency** — `inv_stock_ledger` vs `stock_ledger` with
   different column conventions; inventory displays stock from one, posting writes the other.
   _Evidence:_ migration 0003 creates both; `products-master.service.ts` reads
   `invStockLedger`; `posting-engine.service.ts`/`return-engine.service.ts` write
   `stockLedger` with different shapes. _Module:_ inventory/sales/purchase. _Fix:_ pick one
   source of truth, write both during posting or migrate to one table; add reconciliation.
   _Internal._
2. **Workflow approver verification missing** — any admin/manager can approve any level;
   controller falls back to client `dto.userId`. _Module:_ workflow. _Fix:_ verify
   `approverUserId` for current level before advancing; never trust body userId. _Internal._
3. **188 unbounded queries** — scale risk on ledgers/reports/dashboards. _Fix:_ aggregate in SQL
   with date filters, paginate, cap exports. _Internal._

---

## 28. P2/P3/P4 Issues

- **P2** Sales posting best-effort accounting (GL/GST/cash skip silently when chart of accounts
  empty; oversell clamped not blocked).
- **P2** No tests for dms/ai/integrations/notifications/governance/automation/workflow/backup.
- **P2** Schedulers lack distributed locking.
- **P2** No E2E suite, no load test, no backup-restore test.
- **P3** ERP is single-tenant-per-installation (by design); document clearly.
- **P3** `deployment/go-live-checklist.md` port/path drift (3001 vs 4001, `/health` vs
  `/v1/health`).
- **P3** No route×permission seed-coverage test (only release family verified).
- **P4** 1069 ESLint warnings (import-order, no-explicit-any) — 0 errors.
- **P4** `pnpm-lock` churn from dependency fixes; vitest 2.x critical advisory (dev-only, UI
  server) — staged upgrade.

---

## 29. Production Blockers

1. No TLS/DNS/certs (17.8/17.9).
2. No code-signing cert / HSM / license-signing key management (17.12).
3. No object storage/CDN for releases (17.11).
4. No production DB/Redis/MinIO hosts + backups + DR drill (17.5/17.6/17.7).
5. Payment/email/SMS live credentials (17.35).
6. Clean-Windows installer validation (17.31) and load test (17.38) not run.
7. Inventory ledger split + workflow approver gap should be fixed before go-live.

---

## 30. Recommended Next Steps

1. **Fix P1s (internal):** consolidate stock ledger (or write both with reconciliation);
   enforce workflow approver identity; convert top unbounded queries to SQL aggregation/paging.
2. Add integration tests: backup/restore, workflow approvals, DMS, entitlements→license flows.
3. Stand up a real staging environment (host, DB, TLS via Let's Encrypt, payment sandbox) and
   run the 17.30 E2E customer journey + 17.38 load test + 17.39 restore drill.
4. Provision external infra: domains, certs, code-signing/HSM, object storage/CDN.
5. Update deployment/go-live-checklist paths; add route×permission seed test.
6. Do NOT claim production readiness until 1–4 have real evidence.

---

## 31. Production Readiness Score

| Category       | Score | Rationale (evidence-based)                                                          |
| -------------- | ----- | ----------------------------------------------------------------------------------- |
| Functional     | 85%   | All phase modules exist + core flows tested; approval bypass + stock split cap it   |
| Database       | 75%   | 27 consistent migrations, indexes; ledger duplication + no FKs at schema level      |
| Security       | 85%   | Strong central isolation, CSRF, throttling, webhooks; approver gap, no ERP pen-test |
| Testing        | 70%   | 563 green; no E2E/load/restore; 8 modules untested                                  |
| Performance    | 60%   | 188 unbounded queries, JS-side aggregation                                          |
| Infrastructure | 20%   | Docker/nginx/CI exist; no real infra provisioned                                    |
| Deployment     | 40%   | Runbooks + workflows exist; no environment stood up                                 |
| Monitoring     | 40%   | Health/status endpoints + prometheus config; not deployed, no alerting delivery     |
| Backup/DR      | 35%   | Scripts + in-app backup; restore never tested, no offsite, no DR drill              |
| Payments       | 50%   | Verified webhook engine + tests; no live provider                                   |
| Licensing      | 85%   | Engine + tokens + activation well tested; no production signing                     |
| Installer      | 30%   | Tauri + script exist; never run on clean Windows                                    |
| Support        | 40%   | Runbooks + admin guide; no real support tooling/monitoring                          |
| Documentation  | 90%   | Comprehensive and current (small checklist drift)                                   |

**Engineering Readiness: ~82%** (code complete, 563 tests green, clear gaps)
**Staging Readiness: ~30%** (nothing deployed/validated on a real staging host)
**Production Readiness: ~15%** (external infra + validation all pending)

---

## 32. FINAL VERDICT

**INTERNAL READY**

Engineering work for Phases 1–17 is substantially complete and internally verified
(433 backend + 130 frontend tests green, typecheck/lint/build clean, secret scan clean).
**Not** STAGING READY (no real staging environment exists), **not** CONTROLLED BETA READY and
**not** PRODUCTION READY — production requires external infrastructure (TLS/DNS, code-signing +
HSM, object storage/CDN, prod DB, live payment/email credentials) and real-world validation
(clean-Windows install, load test, backup-restore drill, E2E journey) that the repository cannot
provide. Three internal P1 issues (stock-ledger split, workflow approver verification, unbounded
queries) should be resolved before go-live.

_Audit performed read-only. No code, schema, config, or git state was modified._
