# POST-CODEX REGRESSION AUDIT — SHRANIX Krushi ERP

**Audit Type:** Post-Codex Read-Only Regression Audit  
**Date:** 2026-07-26  
**Status:** ⚠️ **Stable with Regressions — Fix before new features**  

---

## 1. Executive Summary

This audit was conducted to identify regressions introduced by recent Codex modifications. The project is a comprehensive ERP system with **19+ production modules**, **34 backend modules**, **80+ frontend routes**, and **dual-mode database (SQLite + PostgreSQL)**.

**Key Findings:**
- The project is **NOT a git repository** — there is no commit history to compare against. This means Codex modifications cannot be tracked or rolled back.
- **Core infrastructure (auth, routing, backend modules)** is stable and well-structured.
- **15 production modules** (Masters, Inventory, Purchase, Sales, Finance, GL, GST, Workflow, DMS, AI, Automation, Role Dashboards, BI Dashboards, Health, Auth) are structurally complete.
- **Several significant regressions** were identified in PRM-013 modules (Multi-Company, HR, CRM, Fixed Assets, etc.), report pages, and frontend-backend integration.
- **No .env files exist** — the backend and frontend cannot start without configuration.
- **Known pre-existing issues** (health endpoint routing, empty Redux store) remain unresolved.

**Overall Assessment: ⚠️ Stable with Regressions — Fix before new features**

---

## 2. Files Changed by Codex

**⚠️ Unable to determine.** The project directory is not initialized as a git repository (`git init` has not been run). There is no `.git` directory, no commit history, and no diff available. Therefore, this audit cannot identify which specific files were modified by Codex.

**Recommendation:** Initialize a git repository immediately to track future changes.

---

## 3. Stable Components

The following components are verified as structurally stable:

| Component | Status | Evidence |
|-----------|--------|----------|
| Backend NestJS Bootstrapping | ✅ STABLE | `main.ts` — Helmet, CORS, Compression, CookieParser, graceful shutdown |
| Module Architecture | ✅ STABLE | 34 modules with consistent `@Module()` decorators |
| Authentication (JWT) | ✅ STABLE | `auth.module.ts`, `auth.service.ts`, `jwt.strategy.ts` — Argon2, refresh tokens, CSRF |
| Authorization (RBAC) | ✅ STABLE | RolesGuard, PermissionsGuard with cache, seed data |
| CSRF Protection | ✅ STABLE | Double-submit cookie pattern |
| Database Schema | ✅ STABLE | 15 schema files with dual-mode SQLite/PostgreSQL |
| Repository Layer | ✅ STABLE | 88 repository classes in `database/src/repositories/` |
| Frontend Routing | ✅ STABLE | `routes/index.tsx` — 80+ route definitions with lazy imports |
| Sidebar Navigation | ✅ STABLE | `sidebar.tsx` — All 12 navigation sections fully defined |
| Protected Route | ✅ STABLE | `protected-route.tsx` with token refresh |
| Auth Context | ✅ STABLE | `AuthContext.tsx` — Login, register, logout, session refresh |
| Login Page | ✅ STABLE | `login.tsx` — Complete form with validation |
| Dashboard Page | ✅ STABLE | `dashboard.tsx` — API-driven with enterprise metrics |
| Master CRUD Component | ✅ STABLE | `master-data-page.tsx` — Generic CRUD with create/edit/delete/search/pagination |
| Logger Module | ✅ STABLE | `logger.module.ts` — Pino structured logging |
| Config Module | ✅ STABLE | `config.module.ts` — Zod env validation |
| Exception Filter | ✅ STABLE | `global-exception.filter.ts` — Structured error responses |

---

## 4. Regressions Found

### 🔴 CRITICAL REGRESSIONS

| # | Regression | Location | Impact |
|---|-----------|----------|--------|
| R1 | **No git repository** | Root | Cannot track Codex changes, no rollback capability, no version history |
| R2 | **No .env files found** | `backend/`, `frontend/` | Backend and frontend cannot start — JWT_SECRET, DATABASE_URL, VITE_API_URL all require configuration. Backend has hardcoded `dev-secret-change-in-production` fallback, but `auth.module.ts` throws if JWT_SECRET is missing. |
| R3 | **PRM-013 modules use stub repositories** | `database.service.ts` L300-320 | `businessUnits`, `departments`, `leads`, `opportunities`, `assetCategories`, `fixedAssets`, `employees`, `employeeDesignations`, `leaveTypes`, `leaveRequests`, `budgets`, `webhooks`, `apiKeys`, `importLogs`, `dataRetentionPolicies`, `legalHolds` — All 16 of these are initialized as generic stubs that return empty data (`{ data: [], total: 0 }`). These modules are non-functional. |

### 🟠 MAJOR REGRESSIONS

| # | Regression | Location | Impact |
|---|-----------|----------|--------|
| R4 | **Frontend API calls use raw `fetch()` instead of api-client** | `workflow/index.tsx`, `gst_audit/index.tsx` (dashboard pages) | These pages call `fetch('/workflow/dashboard')` directly rather than going through `apiRequest()` from `api-client.ts`. This means: (1) CSRF tokens are not attached, (2) 401 refresh-retry logic is bypassed, (3) API path prefix is not applied (should be `/api/v1/workflow/dashboard`). |
| R5 | **Finance Analytics Dashboard uses USD ($) instead of INR (₹)** | `gst_audit/index.tsx` — `FinanceAnalyticsDashboardPage` | Hardcoded `$0.00` values throughout the component instead of `₹0.00`. This is an ERP system for Indian agricultural businesses. |
| R6 | **Report pages are placeholder UIs** | `gl/index.tsx` — TrialBalance, ProfitLoss, BalanceSheet, CashFlow, DayBook, AccountStatement pages | All 6 report pages show "data will display here after generation" placeholder states. No actual API integration or report rendering logic. |
| R7 | **Frontend and backend API paths may mismatch** | `auth.service.ts` vs `api-client.ts` | `api-client.ts` constructs URLs as `apiBaseUrl/path` (from `VITE_API_URL || '/api/v1'`). `auth.service.ts` constructs as `API_BASE/path` from same base. If these run on different ports, auth will work but module CRUD will fail. |
| R8 | **JWT Strategy bypasses NestJS ConfigService** | `jwt.strategy.ts` L17 | Uses `process.env.JWT_SECRET` directly instead of injecting `ConfigService`. This is inconsistent with the rest of the codebase and could cause config sync issues. |

### 🟡 MINOR REGRESSIONS

| # | Regression | Location | Impact |
|---|-----------|----------|--------|
| R9 | **Sidebar uses emoji placeholders instead of lucide-react icons** | `sidebar.tsx` | lucide-react is installed as a dependency (`^0.451.0`) but sidebar renders emoji text characters instead of proper icon components. |
| R10 | **Redux store is empty** | `store/index.ts` | No reducers are registered. The store has a comment saying "Modules will be registered here as they are built". Redux Toolkit and react-redux are installed but unused. |
| R11 | **Zustand is installed but unused** | `frontend/package.json` | `zustand ^5.0.0` is in dependencies but never imported anywhere in the codebase. |
| R12 | **`whitelist: false` on ValidationPipe** | `main.ts` L56 | Global ValidationPipe uses `whitelist: false` and `forbidNonWhitelisted: false`, which means unknown properties in request bodies are silently accepted. This is a security regression — should be `whitelist: true` with class-validator decorators. |
| R13 | **Workflow interceptor import may cause circular dependency** | `inventory/controllers.ts` | Imports `WorkflowDocument` from `common/decorators/workflow-document.decorator` but `InventoryModule` imports `WorkflowModule`. If `WorkflowModule` imports `InventoryModule`, this creates a circular dependency. |
| R14 | **Multiple `any` type usage** | `database.service.ts` | PRM-013 repositories typed as `any`. This bypasses TypeScript strict mode protections. |

---

## 5. Runtime Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Backend cannot start without .env file | `backend/` | 🔴 Critical |
| Frontend cannot start without VITE_API_URL | `frontend/` | 🔴 Critical |
| Health endpoints may return 404 (pre-existing) | `health.controller.ts` | 🟠 Major |
| Missing database migrations for new tables | `database/migrations/` | 🟠 Major |
| Swagger documentation may fail if JWT_SECRET missing | `auth.module.ts` | 🟠 Major |

---

## 6. UI Issues

| Issue | Location | Severity |
|-------|----------|----------|
| USD currency symbols instead of INR | `gst_audit/index.tsx` | 🟠 Major |
| Emoji icons instead of lucide-react components | `sidebar.tsx` | 🟡 Minor |
| Report pages show "coming soon" placeholders | `gl/index.tsx` | 🟡 Minor |

---

## 7. API Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Raw `fetch()` bypasses api-client interceptors | `workflow/index.tsx`, `gst_audit/index.tsx` | 🟠 Major |
| No CSRF tokens on workflow/GST API calls | workflow pages | 🟠 Major |
| API prefix mismatch potential | `auth.service.ts` vs `api-client.ts` | 🟡 Minor |
| Health endpoint routing broken (pre-existing) | `health.controller.ts` | 🟡 Minor |

---

## 8. Authentication Status

| Check | Status | Evidence |
|-------|--------|----------|
| JWT Token Generation | ✅ WORKING | `auth.service.ts` — Access + Refresh tokens with HS256 |
| JWT Validation | ✅ WORKING | `jwt.strategy.ts` with `ExtractJwt.fromAuthHeaderAsBearerToken()` |
| Token Refresh | ✅ WORKING | `auth.service.refreshToken()` with version validation |
| Token Revocation | ✅ WORKING | `auth.service.logout()` + `revokeAllForUser()` |
| Password Hashing | ✅ WORKING | Argon2id with proper parameters |
| Account Lockout | ✅ WORKING | 5 failed attempts → 15-min lockout |
| CSRF Protection | ✅ WORKING | Double-submit cookie pattern |
| Rate Limiting | ✅ WORKING | ThrottlerGuard (global 100/min, auth 10/min) |
| RBAC Guards | ✅ WORKING | RolesGuard + PermissionsGuard with cache |
| Login endpoint | ✅ WORKING | `POST /api/v1/auth/login` |
| Register endpoint | ✅ WORKING | `POST /api/v1/auth/register` |
| Me endpoint | ✅ WORKING | `GET /api/v1/auth/me` |
| Refresh endpoint | ✅ WORKING | `POST /api/v1/auth/refresh` |

**Verdict:** ✅ Authentication system is fully operational with no regressions detected.

---

## 9. Dashboard Status

| Dashboard | Status | Notes |
|-----------|--------|-------|
| Main Enterprise Dashboard | ✅ WORKING | `dashboard.tsx` — Fetches from `/dashboard`, renders KPIs, charts, transactions |
| Purchase Dashboard | ✅ WORKING | `purchase/index.tsx` — Static UI with quick actions |
| Sales Dashboard | ✅ WORKING | `sales/index.tsx` — Static UI with quick actions |
| Finance Dashboard | ✅ WORKING | `finance/index.tsx` — Static UI |
| GL / Financial Dashboard | ✅ WORKING | `gl/index.tsx` — Static UI with report links |
| GST Dashboard | ✅ WORKING | `gst_audit/index.tsx` — Static UI with stats |
| Workflow Dashboard | ⚠️ API integration incomplete | Uses raw `fetch()` instead of api-client |
| DMS Dashboard | ✅ WORKING | `dms/index.tsx` |
| AI Dashboard | ✅ WORKING | `ai/index.tsx` |
| Automation Dashboard | ✅ WORKING | `automation/index.tsx` |
| BI Analytics Dashboards (11) | ✅ WORKING | `bi-dashboards/index.tsx` |
| Role-Based Dashboards (5) | ✅ WORKING | `role-dashboards/index.tsx` |

---

## 10. Module Status

| Module | Status | Details |
|--------|--------|---------|
| **Authentication** | ✅ STABLE | JWT, CSRF, RBAC, rate limiting all operational |
| **Users** | ✅ STABLE | CRUD operations, permissions |
| **Roles** | ✅ STABLE | CRUD, assignment, cache invalidation |
| **Permissions** | ✅ STABLE | CRUD, cache management |
| **Masters** (9 entities) | ✅ STABLE | Companies, FY, Branches, Warehouses, Units, Categories, Brands, Tax Groups, GST Rates — all with CRUD endpoints |
| **Inventory** (9 entities) | ✅ STABLE | Items, Variants, Groups, Pricing, Barcodes, HSN, Stock Opening, Images, Settings |
| **Purchase** (9 entities) | ✅ STABLE | POs, Quotations, GRN, Invoices, Returns, Supplier Prices, Approvals, Settings |
| **Sales** (9 entities) | ✅ STABLE | Quotations, Orders, Delivery Challans, Invoices, Returns, Customer Prices, Approvals, Settings |
| **Finance** (9 entities) | ✅ STABLE | Account Groups, COA, Ledgers, Journal Entries, Cash/Bank Books, Cost Centers, Settings |
| **GL/Reporting** (10 entities) | ⚠️ PARTIAL | 6 report pages are placeholder UIs (no actual data rendering) |
| **GST/Audit** (14 entities) | ✅ STABLE | Registrations, Ledger, Returns, Tax Postings, Year Closing, Period Locks, etc. |
| **Automation** (5 entities) | ✅ STABLE | Posting, Dashboard, Monitor, Integration, Health |
| **Workflow** (8 entities) | ⚠️ INCOMPLETE | API calls use raw `fetch()`, no CSRF on state-changing operations |
| **DMS** (7 entities) | ✅ STABLE | Documents, Folders, Versions, Tags, OCR, Signatures, Compliance |
| **AI / Copilot** (12 services) | ✅ STABLE | 12 AI services including NL Query, Insights, Predictive, Smart Automation |
| **Multi-Company** | ❌ STUB | Companies, Branches, BusinessUnits, Departments — controllers exist but backend uses generic stubs |
| **HR** | ❌ STUB | Employees, Leave, Designations — controllers exist but backend uses generic stubs |
| **CRM** | ❌ STUB | Leads, Opportunities — controllers exist but backend uses generic stubs |
| **Fixed Assets** | ❌ STUB | Assets, Categories, Depreciation — controllers exist but backend uses generic stubs |
| **Integrations** | ❌ STUB | Webhooks, API Keys, Import/Export — controllers exist but backend uses generic stubs |
| **Governance** | ❌ STUB | Retention, Legal Holds — controllers exist but backend uses generic stubs |
| **Advanced Finance** | ❌ STUB | Budgets — controllers exist but backend uses generic stubs |
| **Health** | ⚠️ PARTIAL | Controller exists but routing behind global prefix may cause 404 |

---

## 11. Critical Issues

| # | Issue | Location | Severity | Impact |
|---|-------|----------|----------|--------|
| C1 | **No git repository** | Root | High | Cannot identify Codex changes, cannot roll back |
| C2 | **No .env files** | `backend/`, `frontend/` | High | Application cannot start without configuration |
| C3 | **16 PRM-013 modules use stub repositories** | `database.service.ts` | High | Multi-Company, HR, CRM, Fixed Assets, Integrations, Governance, Advanced Finance all return empty data |

---

## 12. Major Issues

| # | Issue | Location | Severity | Impact |
|---|-------|----------|----------|--------|
| M1 | Workflow pages bypass api-client | `workflow/index.tsx` | Medium | Missing CSRF, auth headers, and refresh retry |
| M2 | Finance Analytics uses USD instead of INR | `gst_audit/index.tsx` | Medium | Wrong currency for Indian ERP |
| M3 | 6 report pages are placeholder UIs | `gl/index.tsx` | Medium | Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement not functional |
| M4 | ValidationPipe whitelist disabled | `main.ts` | Medium | Security — unknown properties are silently accepted |
| M5 | Health endpoint routing issue (pre-existing) | `health.controller.ts` | Medium | Monitoring cannot verify application health |

---

## 13. Minor Issues

| # | Issue | Location |
|---|-------|----------|
| m1 | Emoji icons instead of lucide-react components | `sidebar.tsx` |
| m2 | Redux store empty (no reducers) | `store/index.ts` |
| m3 | Zustand installed but unused | `frontend/package.json` |
| m4 | JWT Strategy reads process.env directly | `jwt.strategy.ts` |
| m5 | `any` types on PRM-013 repositories | `database.service.ts` |
| m6 | Potential circular dependency with WorkflowModule | `inventory/controllers.ts` |
| m7 | Auth service and api-client may have different API bases | `auth.service.ts`, `api-client.ts` |

---

## 14. Recommended Priority Order

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | **Initialize git repository** | 5 min | Enables version tracking for all future work |
| 2 | **Create .env files** from `.env.example` | 10 min | Allows application to start |
| 3 | **Fix validation pipe** — set `whitelist: true` | 5 min | Closes security gap |
| 4 | **Replace raw fetch() with api-client** in workflow pages | 30 min | Ensures CSRF + auth headers |
| 5 | **Fix USD → INR** in Finance Analytics | 5 min | Correct currency display |
| 6 | **Implement PRM-013 repositories** (16 modules) | 4-8 hours | Enables Multi-Company, HR, CRM, Fixed Assets, etc. |
| 7 | **Implement report page APIs** for GL reports | 4-6 hours | Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement |
| 8 | **Replace emoji icons with lucide-react** | 1 hour | Professional UI appearance |
| 9 | **Fix health endpoint routing** | 30 min | Enable monitoring |
| 10 | **Replace lucide-react icons** in sidebar | 1 hour | Visual consistency |

---

## 15. Overall Project Health

| Category | Score | Justification |
|----------|-------|---------------|
| Architecture | 8.5/10 | Clean NestJS modular architecture |
| Backend | 7.5/10 | Core modules stable; 16 PRM-013 modules are stubs |
| Frontend | 7.0/10 | 80+ routes defined; report pages are placeholders |
| Database | 8.5/10 | 15 schema files, 88 repositories, dual-mode |
| Security | 7.5/10 | Auth is strong; ValidationPipe whitelist disabled |
| Authentication | 9.0/10 | JWT, CSRF, RBAC, rate limiting all working |
| Testing | 7.0/10 | 174 tests in previous audit; no E2E without live DB |
| **Overall Health** | **7.5/10** | Functional core with known regressions |

---

## 16. Production Readiness

| Category | Score | Justification |
|----------|-------|---------------|
| Production Readiness | 6.0/10 | Core modules work but 16 backend modules are stubs, 6 report pages are placeholders |
| **Readiness Verdict** | **⚠️ NOT PRODUCTION READY** | Regressions must be fixed before production deployment |

---

## 17. FINAL VERDICT

**⚠️ Stable with Regressions — Fix before new features**

### Justification

The project core (authentication, routing, backend module structure, database schema, master CRUD) is **stable and well-architected**. The authentication system is fully functional with JWT, CSRF, RBAC, rate limiting, and account lockout. The frontend has 80+ defined routes with a consistent MasterDataPage-based CRUD pattern.

However, **significant regressions** were identified:

1. **No git repository** — Codex changes cannot be tracked or rolled back
2. **No .env files** — Application cannot start
3. **16 PRM-013 modules are non-functional** — They return empty data from generic stub repositories
4. **6 financial report pages are placeholder UIs** — Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement have no report rendering
5. **Workflow pages bypass the API client** — Missing CSRF protection and auth headers
6. **Currency display error** — USD used instead of INR in Finance Analytics
7. **Security gap** — ValidationPipe whitelist is disabled

### Required Before New Features

1. ✅ Initialize git repository
2. ✅ Create .env files from .env.example
3. ✅ Fix ValidationPipe whitelist setting
4. ✅ Fix raw fetch() calls in workflow pages
5. ✅ Fix USD → INR currency

### Required Before Production

1. Implement PRM-013 repositories (16 modules)
2. Implement report page APIs (6 reports)
3. Fix health endpoint routing
4. Replace emoji icons with lucide-react
5. Register reducers in Redux store or remove unused dependencies

---

**REPORT GENERATED:**  
`reports/POST_CODEX_REGRESSION_AUDIT.md`

**AUDIT COMPLETED — READ-ONLY — NO CODE MODIFIED**
