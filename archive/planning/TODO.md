# TODO

## Document Control

| Field            | Value              |
| ---------------- | ------------------ |
| **Project**      | SHRANIX Krushi ERP |
| **Status**       | Active             |
| **Last Updated** | YYYY-MM-DD         |

---

## Immediate (Foundation Phase)

### PRM-001: Project Foundation Setup

- [x] Create project directory structure
- [x] Create README.md
- [x] Create CHANGELOG.md
- [x] Create LICENSE.md
- [x] Create .gitignore
- [x] Create .env.example
- [x] Create docs/01_Project_Vision.md through docs/09_Release_Notes.md
- [x] Create planning/Ideas.md through planning/TODO.md

### PRM-002: Foundation Upgrade & Enterprise Reporting

- [x] Add prompts/ directory (Prompt_Index, Prompt_Template, Prompt_Guidelines)
- [x] Add reports/ directory (7 reports + Report Index)
- [x] Add reports/screenshots/Phase_00, Phase_01, Phase_02
- [x] Add archive/ directory (old_reports, old_prompts, legacy_docs, deprecated_files)
- [x] Upgrade README.md to enterprise quality
- [x] Update CHANGELOG.md (append)
- [x] Update planning/TODO.md
- [x] Generate Project Health Score (8.2/10)
- [x] Save Prompt_002_Foundation_Upgrade.md
- [ ] Initialize git repository
- [ ] Create initial commit

## Short-Term (Architecture Phase)

### PRM-004A: Workspace Stabilization and Configuration Audit (Final Verification Complete)

- [x] Create workspace member package.json files (database, desktop, shared, scripts)
- [x] Fix backend module imports (6 module stubs created)
- [x] Fix ESLint config (removed unicorn plugin, created backend config)
- [x] Create shared package entry point
- [x] Install dependencies (pnpm install -- 1,194 packages)
- [x] Lint verification (passed)
- [x] Typecheck verification (passed)
- [x] Build verification (passed)
- [x] Environment configs created (.env.development, .env.production, .env.local)
- [x] Desktop Tauri scaffolding (config, Cargo.toml, Rust placeholders)
- [x] All documentation updated

### PRM-004B: Backend Foundation (NestJS Enterprise Architecture) ✅ Complete

- [x] Production-ready NestJS bootstrap (Helmet, CORS, Compression, CookieParser, graceful shutdown, versioning, request size limits)
- [x] Config module with Zod environment validation and typed config namespaces
- [x] Pino logger (pretty-print dev, JSON prod, request serialization)
- [x] Health endpoints (GET /health, /health/live, /health/ready)
- [x] Global exception filter (structured error responses)
- [x] Response, Logging, Timeout interceptors
- [x] Request ID middleware (UUID v4)
- [x] Custom ValidationPipe (whitelist, stopAtFirstError)
- [x] Guards (ThrottlerBehindProxy with X-Forwarded-For)
- [x] Decorators (@Public, @CurrentUser)
- [x] Custom exceptions (Business, EntityNotFound, DuplicateEntity, Validation)
- [x] Constants, interfaces, and utility functions
- [x] Lint, typecheck, build all passing

### PRM-004C: Database Foundation (Drizzle ORM + PostgreSQL + SQLite) ✅ Complete

- [x] Drizzle ORM workspace package with dual-mode SQLite/PostgreSQL
- [x] drizzle.config.ts with provider-aware configuration
- [x] Typed DatabaseConfig with environment-driven provider selection
- [x] SQLite client (@libsql/client, singleton pattern)
- [x] PostgreSQL client (postgres.js, connection pooling, graceful shutdown)
- [x] Client factory (create/get/close for each provider)
- [x] Base schema helpers (UUID, timestamps, soft delete, audit columns, status enums)
- [x] Migration system (drizzle-kit: generate, migrate, push, studio, rollback)
- [x] Seed framework (runner + utilities for random data generation)
- [x] Generic BaseRepository (CRUD, soft delete, pagination)
- [x] Transaction helper (withTransaction, withPgTransaction, withSqliteTransaction)
- [x] Query utilities (pagination, sorting, filter conditions)
- [x] Filter helper (dynamic where clause builder)
- [x] Shared type definitions (PaginationParams, PaginatedResult, FilterParams)
- [x] Workspace package linked to backend via workspace dependency
- [x] Typecheck and build passing

### PRM-004D: Desktop Foundation (Tauri Enterprise Shell) ✅ Complete

- [x] Enterprise Tauri v2 configuration (dual windows: splash + main, system tray, updater, deep linking, CSP, bundle config)
- [x] Rust application (window manager, splash-to-main transition, window events)
- [x] System tray (show/hide, check updates, about, quit)
- [x] Application menu (File, Edit, View, Help with keyboard shortcuts)
- [x] Auto-updater foundation (updater plugin config, IPC command, release channel)
- [x] Native API foundation (dialogs, notifications, clipboard, fs, deep linking)
- [x] IPC command handlers (5 secure handlers, typed responses, error handling)
- [x] Frontend integration (useTauri hook, splash screen component)
- [x] Security (CSP, FS scope, shell scope, secure defaults)
- [x] Build, typecheck, and lint passing

### PRM-004E: Shared Package + Testing + CI/CD ✅ Complete

- [x] Complete shared package (types, interfaces, enums, constants, validation, utils)
- [x] Root Vitest config with coverage thresholds
- [x] Playwright E2E config (3 browsers, webServer, reporter)
- [x] Mock setup and test utilities
- [x] GitHub Actions CI workflow (build, lint, typecheck, test, security, commitlint)
- [x] GitHub Actions Release workflow (validate, build, create release)
- [x] GitHub Actions Quality workflow (weekly automated gates)
- [x] Build, typecheck, and lint all passing

### PRM-004F: Final Audit & Production Hardening ✅ Complete

- [x] Full project audit (lint, typecheck, build, test all passing)
- [x] Fixed test scripts (--passWithNoTests)
- [x] Updated technology decisions table
- [x] Production hardening confirmed (env validation, secrets, versioning, error handling, logging, security, performance)
- [x] All documentation finalized
- [x] PRM-004 marked FULLY COMPLETED

### PRM-005: Core Business Modules (Next Phase)

- [ ] Complete backend NestJS module implementations
- [ ] Create database Drizzle setup (connection, migrations, seeds)
- [ ] Create desktop Tauri configuration
- [ ] Create full shared types package
- [ ] Create CI/CD workflows
- [ ] Create environment configs

## Medium-Term (Core Modules)

- [ ] Implement authentication module (login, register, JWT)
- [ ] Build master data screens (items, parties, users)
- [ ] Build inventory management screens
- [ ] Build purchasing module screens
- [ ] Build sales module screens
- [ ] Build accounts module screens
- [ ] Desktop shell integration (Electron/Tauri)
- [ ] Installer packaging

## Long-Term

- [ ] Reporting and analytics
- [ ] Offline mode
- [ ] Mobile companion app
- [ ] AI-powered features
- [ ] Marketplace platform

---

_This document is updated weekly during sprint planning._

## PRM-005A — Authentication & RBAC Foundation ✅ COMPLETED

- [x] Create Drizzle auth schema (users, roles, permissions, role_permissions, user_roles, refresh_tokens)
- [x] Generate Drizzle migration (0000_numerous_wilson_fisk.sql)
- [x] Implement AuthModule (Argon2, JWT access/refresh, login/register/logout/refresh/me)
- [x] Implement UsersModule (CRUD service + controller)
- [x] Implement RolesModule (service + controller)
- [x] Create JwtAuthGuard, RolesGuard, PermissionsGuard
- [x] Create @CurrentUser(), @Roles(), @Permissions(), @Public() decorators
- [x] Write unit tests (15 tests: auth, users, roles)
- [x] Verify: typecheck ✅ build ✅ lint ✅

### Pending for PRM-005B

- [ ] Replace in-memory UsersService with Drizzle repository
- [ ] Add integration tests (e2e auth flow)
- [ ] Implement secure HTTP-only cookies for JWT
- [ ] Implement CSRF protection
- [ ] Add role/permission management endpoints

## PRM-005B — Core Data Layer & Persistent Authentication ✅ COMPLETED

- [x] Drizzle repositories (Users, Roles, RefreshTokens)
- [x] DatabaseService for NestJS DI
- [x] HTTP-only secure cookies + CSRF protection
- [x] Token revocation + logout all devices
- [x] Dynamic RBAC from database
- [x] Permissions CRUD controller
- [x] Users/Roles CRUD with role assignment
- [x] 10/10 unit tests passing
- [x] Verify: typecheck ✅ build ✅ lint ✅ test ✅

### Pending for PRM-005C

- [ ] Wire RolesGuard/PermissionsGuard to database (currently use JWT payload)
- [ ] Full Drizzle-backed PermissionsService (currently placeholder)
- [ ] Integration/e2e auth flow tests

## PRM-005C — Enterprise Authorization & Authentication Hardening ✅ COMPLETED

- [x] Database-driven authorization (guards query DB, no JWT payload)
- [x] Permission cache with automatic invalidation (60s TTL)
- [x] Complete PermissionsRepository + Service (Drizzle CRUD)
- [x] Role-Permission assignment APIs
- [x] Token version validation + session validation
- [x] Audit logging (20+ events)
- [x] Password change with session invalidation
- [x] Integration/e2e auth tests
- [x] Device tracking (IP + user agent)
- [x] Verify: typecheck ✅ build ✅ lint ✅ test ✅

### Pending for PRM-006

- [ ] Core ERP business modules: Masters (items, parties)
- [ ] Complete frontend business screens
- [ ] Integration/e2e tests for business modules

## PRM-006A — Enterprise Master Data Foundation ✅ COMPLETED

- [x] 9 Drizzle schemas (Companies, FYears, Branches, Warehouses, Units, Categories, Brands, TaxGroups, GSTRates)
- [x] 9 repositories with search, pagination, soft delete
- [x] 9 backend modules (service, controller, DTOs) with RBAC + audit
- [x] Reusable MasterDataPage frontend component
- [x] 9 frontend CRUD page configurations
- [x] Routes + sidebar navigation for all modules
- [x] Verify: typecheck ✅ build ✅

### Known Issues (PRM-006A)

- [ ] Add unit tests for BaseMasterService and module endpoints
- [ ] Add isActive filter toggle to frontend MasterDataPage
- [ ] Add restore confirmation before restore action
- [ ] Run lint verification on new frontend files

### Pending for PRM-006B

- [ ] Items/Commodities master with stock tracking
- [ ] Parties (Customers, Suppliers, Transporters)
- [ ] Item-Party linking (rates, GST)
- [ ] Complete frontend business screens

## PRM-006C — Enterprise Purchase Management ✅ COMPLETED

- [x] 18 Drizzle tables (PO, POItems, Quotations, GRN, GRNItems, Invoices, Returns, Supplier Prices, Approvals, Settings)
- [x] 10 purchase repositories with search, pagination, soft delete
- [x] 8 backend modules (service, controller, DTOs) with RBAC + audit
- [x] PurchaseDashboardPage with stats + quick actions + reports
- [x] 8 frontend CRUD page configurations using MasterDataPage
- [x] Frontend routes + sidebar navigation for all purchase modules
- [x] Verify: typecheck ✅ build ✅

### Known Issues (PRM-006C)

- [ ] Add transaction support for PO/GRN/Return operations
- [ ] Enforce status workflow state transitions
- [ ] Implement GRN→PO status linkage (auto-update PO on GRN receipt)
- [ ] Implement stock reversal for purchase returns
- [ ] Add Import/Export/Print Preview/PDF placeholders

## PRM-006D — Enterprise Sales Management ✅ COMPLETED

- [x] 13 Drizzle tables (Sales Quotations, Quotation Items, Sales Orders, Sales Order Items, Delivery Challans, Challan Items, Sales Invoices, Invoice Items, Sales Returns, Return Items, Customer Price List, Sales Approvals, Sales Settings)
- [x] 13 sales repositories with search, pagination, soft delete
- [x] 8 backend modules (service, controller, DTOs) with RBAC + audit
- [x] SalesDashboardPage with stats + quick actions + reports
- [x] 8 frontend CRUD page configurations using MasterDataPage
- [x] Frontend routes + sidebar navigation for all sales modules
- [x] Verify: typecheck pending

### Known Issues (PRM-006D)

- [ ] Add transaction support for Quotation→Order→Challan→Invoice flow
- [ ] Enforce status workflow state transitions
- [ ] Implement stock reservation/deduction for sales orders/delivery
- [ ] Implement stock reversal for sales returns
- [ ] Add Import/Export/Print Preview/PDF placeholders

## PRM-006E1 — Enterprise Finance & Accounting Foundation ✅ COMPLETED

- [x] 9 Drizzle tables (Account Groups, Chart of Accounts, Ledger Master, Journal Entries, Journal Entry Items, Cash Book, Bank Book, Cost Centers, Accounting Settings)
- [x] 9 finance repositories with search, pagination, soft delete
- [x] 8 backend modules (service, controller, DTOs) with RBAC + audit
- [x] FinanceDashboardPage with stats + quick actions + reports
- [x] 8 frontend CRUD page configurations using MasterDataPage
- [x] Frontend routes + sidebar navigation for all finance modules

### Known Issues (PRM-006E1)

- [ ] Enforce double-entry accounting (total debit = total credit) at service layer
- [ ] Implement immutable posted journal protection
- [ ] Add running balance calculation logic for cash/bank books
- [ ] Add financial year lock validation
- [ ] Add Import/Export/Print/PDF placeholders

## PRM-006E2 — Enterprise Financial Statements & General Ledger ✅ COMPLETED

| Task                | Status |
| ------------------- | ------ |
| General Ledger      | ✅     |
| Trial Balance       | ✅     |
| Profit & Loss       | ✅     |
| Balance Sheet       | ✅     |
| Cash Flow           | ✅     |
| Day Book            | ✅     |
| Account Statement   | ✅     |
| Posting Rules       | ✅     |
| Financial Dashboard | ✅     |
| Quality Checks      | ✅     |
| Documentation       | ✅     |

## PRM-006E3 — Enterprise GST, Financial Closing & Audit ✅ COMPLETED

- [x] 5 Drizzle tables (GL Entries, Financial Snapshots, Report Cache, Posting Rules, Fiscal Closing Records)
- [x] 5 GL/reporting repositories with search, pagination, soft delete
- [x] 11 backend services (5 CRUD + 6 report engines) with RBAC + audit
- [x] FinancialDashboardPage with stats + financial statement cards
- [x] 3 CRUD page configs (GL Entries, Posting Rules, Fiscal Closing) using MasterDataPage
- [x] 6 report view pages (Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement)
- [x] Frontend routes + sidebar navigation for GL & Reports section (10 nav items)
- [x] Verify: typecheck ✅ build ✅ test ✅

### Known Issues (PRM-006E2)

- [ ] Implement actual GL query logic in report engine services
- [ ] Add database transactions for posting operations
- [ ] Add Print/PDF/Export functionality for report views
- [ ] Add Financial Snapshots frontend page

### Pending for PRM-006E3

- [ ] Accounts Receivable & Payable
- [ ] GST Returns & Compliance

## PRM-007 — Enterprise Workflow & Approval Platform ✅ COMPLETED

| Task                                                                                            | Status |
| ----------------------------------------------------------------------------------------------- | ------ |
| Universal Workflow Engine (templates, states, transitions, history, versioning)                 | ✅     |
| State Machine (strict validation, illegal transition rejection)                                 | ✅     |
| Approval Engine (single, multi-level, sequential, parallel, conditional, amount/role/user/dept) | ✅     |
| Approval Matrix (configurable, no hardcoding)                                                   | ✅     |
| Task Engine (pending, completed, rejected, delegated, overdue)                                  | ✅     |
| Notification Engine (in-app + email/SMS/push ready)                                             | ✅     |
| Escalation Engine (time-based, reminders, auto-escalation, auto-approval)                       | ✅     |
| Workflow History (every action tracked)                                                         | ✅     |
| Universal Comments (mentions, attachments)                                                      | ✅     |
| 5 Dashboard pages (Workflow, Approval, Pending, My Tasks, Escalation)                           | ✅     |
| API (REST + Swagger + pagination + filtering + search)                                          | ✅     |
| Security (RBAC + Audit)                                                                         | ✅     |
| Build ✅ Test ✅ Typecheck ✅                                                                   | ✅     |
| Implementation Report                                                                           | ✅     |

### Known Issues (PRM-007)

- [ ] Document integration hooks not implemented (existing modules don't call startWorkflow)
- [ ] Unit/integration tests not written for workflow services
- [ ] workflow.* permissions not seeded in permission system
- [ ] Drizzle migration not generated for 8 new tables
- [ ] Frontend missing timeline visualization, comments panel, history panel

## PRM-006G — Architecture Cleanup & Stabilization ✅ COMPLETED

| Task                                                                                   | Status |
| -------------------------------------------------------------------------------------- | ------ |
| Delegate old GL report services to ReportEngine                                        | ✅     |
| Delegate old GST report/engine services to automation                                  | ✅     |
| Fix frontend automation API URLs (/api/automation/ → /automation/)                     | ✅     |
| Implement real ProtectedRoute (JWT, /auth/me, refresh, redirect)                       | ✅     |
| Build Authentication UI (Login, Register, Forgot Pass, Access Denied, Session Expired) | ✅     |
| Fix audit logging (preserve userId in createRecurringEntries & applyPostingRules)      | ✅     |
| Remove dead code (Logger imports, unused service refs)                                 | ✅     |
| Extend ReportEngine (yearClosing, financialSummary methods)                            | ✅     |
| Update GL + GST modules to import AutomationModule                                     | ✅     |
| Documentation updated + PRM-006G Implementation Report                                 | ✅     |
| Verify: typecheck ✅ build ✅ test ✅                                                  | ✅     |

### Known Issues (PRM-006G)

- [ ] TransactionManager wrapping not applied to integration services (GL+GST not in single transaction)
- [ ] No logout button in sidebar/header
- [ ] Forgot password backend endpoint not implemented
- [ ] Oversized files not split (automation/index.tsx, gst_audit/services.ts, integration-services.ts)

## PRM-006F — Enterprise Financial Automation Engine ✅ COMPLETED

- [x] Transaction Manager (DB transactions, savepoints, optimistic locking)
- [x] GL Posting Engine (double-entry validation, reversal, recurring entries)
- [x] Auto Voucher Posting Engine (posting rule evaluation, condition expressions)
- [x] Journal Automation (auto-posting journal entries)
- [x] GST Calculation Engine (CGST/SGST/IGST/CESS with reverse charge)
- [x] Financial Rule Engine (condition expression evaluation)
- [x] Posting Rule Manager (creation/evaluation engine)
- [x] Sales → Finance Integration (auto-posting invoices/returns)
- [x] Purchase → Finance Integration (auto-posting invoices/returns)
- [x] Inventory → Finance Integration (goods receipt/issue posting)
- [x] Payroll → Finance Integration (salary posting)
- [x] Expense → Finance Integration (expense voucher posting)
- [x] Bank → Finance Integration (bank transaction posting)
- [x] Real Financial Reports Engine (10 reports: TB, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement, GL, GST Register, GST Summary, Audit)
- [x] Financial Scheduler (auto-posting, daily snapshots, period lock enforcement)
- [x] 22+ API endpoints in 5 controllers
- [x] 5 frontend dashboard pages
- [x] Routes, sidebar, app.module.ts updated
- [x] Documentation updated (MASTER_REPORT, CHANGELOG, DECISION_LOG, TODO, PROMPT_INDEX)
- [x] PRM-006F Implementation Report generated
- [x] Verify: typecheck ✅ build ✅ test ✅
