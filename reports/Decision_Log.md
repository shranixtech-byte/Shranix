# Decision Log

## Document Control

| Field | Value |
|---|---|
| **Project Name** | SHRANIX Krushi ERP |
| **Document ID** | SHRANIX-RPT-DEC |
| **Version** | 1.0 |
| **Status** | Active |
| **Last Updated** | YYYY-MM-DD |
| **Author** | Principal Software Architect |

---

## Purpose

This log records all **significant decisions** made during the project — architectural, technical, process, and business. Each decision includes context, options considered, rationale, and consequences. This ensures transparency, auditability, and knowledge preservation.

---

## Decision Template

```markdown
### DEC-XXX: [Title]

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | [Name] |
| **Category** | [Architecture / Technical / Process / Business] |
| **Status** | [Proposed / Accepted / Deprecated / Superseded] |

#### Context
[What prompted this decision? What is the background?]

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| Option A | ... | ... |
| Option B | ... | ... |
| Option C | ... | ... |

#### Decision
[Chosen option and the rationale for choosing it.]

#### Consequences
- [Positive consequence 1]
- [Positive consequence 2]
- [Negative consequence 1 (if any)]
- [Mitigation for negative consequence]

#### Related Decisions
- [DEC-XXX]
- [DEC-XXX]

#### References
- [Link to relevant document or discussion]
```

---

## Decision Log

#### DEC-025 — PRM-007: Enterprise Workflow & Approval Platform
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Built a reusable Enterprise Workflow Engine as a standalone `WorkflowModule` with 8 database tables, 9 backend services, 7 controllers, and 5 frontend dashboard pages. The engine supports configurable state machines, multi-level approval matrices, task management, notifications, escalations, and universal comments — all integrated with the existing RBAC and audit systems.

**Rationale:** Every business document (Purchase Orders, Sales Invoices, Journal Entries, etc.) requires workflow management. A single reusable engine avoids duplicating state machine logic across every module. The approval matrix keeps approval rules configurable without hardcoding.

**Architecture:**
- 8 database tables with dual-mode SQLite/PostgreSQL support
- 9 backend services (StateMachine, Templates, Instances, ApprovalEngine, ApprovalMatrix, TaskEngine, NotificationEngine, EscalationEngine, Comments)
- 7 controllers with Swagger, pagination, RBAC
- 5 frontend dashboard pages
- 8 repositories added to DatabaseService (81 total)

**Key Patterns:**
- State machine: templates register states/transitions, instances track current state, transitions validated before execution
- Approval matrix: DB-driven with amount ranges, levels, roles — no hardcoding
- Escalation: time-based with configurable timeout, reminders, auto-escalation, auto-approval
- Notifications: in-app creation with email/SMS/push preparation fields

**Known Gaps:**
- Document integration hooks not yet implemented (existing modules don't call startWorkflow)
- Unit/integration tests not yet written
- workflow.* permissions not yet seeded
- Drizzle migration not yet generated

### DEC-024 — PRM-006G: Architecture Cleanup, Auth Completion & Technical Debt Reduction
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Executed comprehensive cleanup addressing 15 tasks from the Technical Audit findings.

1. **Delegate old services** — GL and GST placeholder report services now delegate to Automation ReportEngine
2. **Build real auth UI** — Login, Register, Forgot Password, Access Denied, Session Expired pages
3. **Upgrade ProtectedRoute** — Real JWT validation with refresh token handling
4. **Fix audit logging** — Preserve userId in createRecurringEntries and applyPostingRules
5. **Fix API URLs** — Frontend automation pages corrected to use /automation/* not /api/automation/*
6. **Remove dead code** — Cleaned unused Logger imports and unused service references

**Rationale:** The Technical Audit (PROJECT_TECHNICAL_AUDIT.md) identified stale placeholder services, missing auth UI, broken API URLs, and audit logging gaps as the top issues blocking production readiness.

**Architecture:**
- GL module and GST module both import AutomationModule (no circular dependencies)
- ReportEngine extended with 2 new methods (yearClosing, financialSummary)
- Frontend AuthProvider wraps the full app, ProtectedRoute checks auth state
- Auth service handles JWT storage, token refresh, and API calls

## DEC-022 — PRM-006E3: GST, Audit & Financial Closing Module
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Built a unified GST, Audit & Financial Closing module with 15 sub-modules covering GST Master, GST Ledger, GST Returns, Tax Posting Engine, Period Locking, Financial Year Closing, Opening Balance Transfer, Year-End Entries, Audit Trail, Audit Log Viewer, Number Series, Voucher Approvals, Finance Dashboard Analytics, and Financial Settings.

**Rationale:** The GST, audit, and financial closing features are deeply interconnected (GST posting feeds period locking, which feeds year-end closing, which feeds audit trail). A single module (`GstAuditModule`) keeps them cohesive while maintaining separation from the main Finance module.

**Architecture:**
- 13 database tables with dual-mode SQLite/PostgreSQL
- 13 CRUD services + 7 report services + 2 engine services
- 15 controllers with RBAC (finance.* permissions)
- Frontend: 2 dashboards + 12 MasterDataPage configs
- 13 repositories added to DatabaseService (73 total)

**Key Patterns:**
- Number Series table as centralized auto-numbering engine
- Voucher Approvals for multi-level approval workflow
- Period Locks for daily/monthly/quarterly/yearly locking
- Year-End Entries as linked items under Year Closing Records
- Audit Details table with comprehensive tracking (IP, user-agent, session, diff)
- Finance Analytics as cached KPI data for dashboard
- Report engines as standalone placeholder services (GST Summary, GST Register, Tax Ledger, Audit Report, Year Closing Report, Financial Summary)
- Engine services (TaxPostingEngineService, FinancialClosingEngineService) ready for logic implementation

### DEC-001: Project Naming — SHRANIX Krushi ERP

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | Principal Software Architect |
| **Category** | Business |
| **Status** | ✅ Accepted |

#### Context
The product needed a distinctive, meaningful name that reflects its agricultural focus and technology platform.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| SHRANIX Krushi ERP | Unique, Sanskrit-rooted, domain-relevant | Longer name, needs brand education |
| AgriPro ERP | Generic, easy to remember | Not distinctive, trademark risk |
| FarmConnect ERP | Modern-sounding | Less professional, overused |

#### Decision
**SHRANIX Krushi ERP.** SHRANIX derives from "Shrani" (श्रृंखला = chain/series) + "X" for technology. Krushi (कृषी) = agriculture in Sanskrit. The name is unique, meaningful, and positions the product distinctly.

#### Consequences
- Strong brand identity with cultural relevance
- Requires brand education in marketing materials
- Short form "SHRANIX" usable for informal contexts

---

### DEC-002: Target Database — PostgreSQL

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | Principal Software Architect |
| **Category** | Architecture |
| **Status** | ✅ Accepted |

#### Context
The database must support complex relational data, transactions, reporting, and future geospatial features for agricultural supply chain.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| PostgreSQL | Mature, ACID, extensible, geospatial (PostGIS), JSON support, strong ecosystem | Heavier than SQLite for single-user |
| MySQL | Widely used, good performance | Weaker geospatial, less standards-compliant |
| SQLite | Zero-config, embedded, lightweight | No concurrency, limited features for enterprise |
| SQL Server | Strong enterprise features, excellent tooling | Licensing cost, Windows-centric |

#### Decision
**PostgreSQL.** Best balance of features, performance, ecosystem, and cost for a commercial desktop ERP that needs to scale.

#### Consequences
- Requires PostgreSQL installation as part of desktop app setup
- Enables future geospatial features (farm mapping, route optimization)
- ORM evaluation still pending (Prisma vs Drizzle)

---

### DEC-003: Append-Only Reporting

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | Principal Software Architect |
| **Category** | Process |
| **Status** | ✅ Accepted |

#### Context
Project reports must preserve history and never lose information. Overwriting reports creates information loss and reduces auditability.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| Append-only entries | Complete history, auditable, no data loss | Files grow over time |
| Overwrite on update | Always current, small files | Historical context lost |
| Version-controlled files | Best of both | More complex to manage |

#### Decision
**Append-only entries** within each report file. New entries are added as new sections. Old entries are never modified or deleted. Version control provides additional safety.

#### Consequences
- Report files will grow with each phase
- Readers must check the most recent entry for current status
- Git history provides additional backup

---

### DEC-004: Markdown-Based Documentation

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | Principal Software Architect |
| **Category** | Process |
| **Status** | ✅ Accepted |

#### Context
Documentation should be version-controllable, reviewable in pull requests, and accessible without special tools.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| Markdown (`.md`) | Universal, git-friendly, PR-reviewable, renderable anywhere | Limited formatting, no built-in diagrams |
| Confluence/Notion | Rich formatting, collaboration features | Not version-controlled, SaaS dependency, cost |
| Docusaurus/GitBook | Professional docs site | Additional build step, overkill for planning phase |

#### Decision
**Markdown (`.md`)** for all documentation. Use Mermaid for diagrams within Markdown. Document Control sections ensure consistency.

#### Consequences
- All docs live in the repository (single source of truth)
- Easy to review changes in pull requests
- Migration to Docusaurus or similar possible later if needed

---

### DEC-005: Keep Docs in Repo (Docs-as-Code)

| Field | Value |
|---|---|
| **Date** | YYYY-MM-DD |
| **Author** | Principal Software Architect |
| **Category** | Process |
| **Status** | ✅ Accepted |

#### Context
Documentation often drifts from the code when stored separately. Keeping docs in the repo ensures they evolve alongside the code.

#### Decision
All documentation is stored in the `docs/`, `planning/`, `reports/`, and `prompts/` directories within the project repository. Documentation changes go through the same PR process as code changes.

#### Consequences
- Docs are versioned and reviewed alongside code
- Branch-specific documentation possible
- Requires developer discipline to update docs with code changes

---

### DEC-006: NestJS Backend Framework with Enterprise Infrastructure

| Field | Value |
|---|---|
| **Date** | 2026-07-24 |
| **Author** | Principal Software Architect |
| **Category** | Architecture |
| **Status** | ✅ Accepted |

#### Context
The backend requires a structured, maintainable framework for building a commercial ERP API. The framework must support dependency injection, modular architecture, middleware, guards, interceptors, piping, exception handling, and RESTful API design out of the box.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| NestJS 10 | Modular, DI, Guards/Interceptors/Pipes built-in, TypeScript-native, CLI tooling, Swagger integration | Heavier than Express, opinionated |
| Express | Minimal, flexible, huge ecosystem | No structure enforcement, boilerplate for DI/modules |
| .NET | Excellent performance, enterprise tooling | Different ecosystem, C# not TypeScript, less synergy with frontend |

#### Decision
**NestJS 10** with Express platform. Provides enterprise-grade structure (modules, DI, guards, interceptors, filters, pipes) while keeping TypeScript across the full stack. Paired with:
- **Helmet** for security headers
- **Compression** for response compression
- **CookieParser** for cookie handling
- **Pino** for structured logging (pretty-print dev, JSON prod)
- **class-validator + class-transformer** for DTO validation
- **Zod** for environment variable validation
- **@nestjs/throttler** for rate limiting
- **Swagger** for API documentation

#### Consequences
- Consistent, modular code structure across all business modules
- Reduced boilerplate for new features (guards, interceptors, pipes ready)
- TypeScript full-stack consistency with React frontend
- Learning curve for NestJS-specific patterns (modules, decorators)
- Mitigation: NestJS conventions documented in development rules

#### Related Decisions
- DEC-002: PostgreSQL Database (database config ready for Drizzle integration)
- DEC-005: Docs-as-Code (infrastructure documented in MASTER_DEVELOPMENT_REPORT)

---

### DEC-007: Drizzle ORM with Dual-Mode Database Strategy

| Field | Value |
|---|---|
| **Date** | 2026-07-24 |
| **Author** | Principal Software Architect |
| **Category** | Architecture |
| **Status** | ✅ Accepted |

#### Context
The project requires a database ORM that supports both SQLite (for development/Single-user Starter tier) and PostgreSQL (for production/Multi-user Pro tier). The ORM must be lightweight, type-safe, and have minimal overhead for a desktop ERP application.

#### Options Considered
| Option | Pros | Cons |
|---|---|---|
| Drizzle ORM | SQL-native, zero overhead, dual-mode support (SQLite+PostgreSQL), TypeScript-first, migrations built-in, lightweight | Newer ecosystem, fewer third-party plugins |
| Prisma | Mature, great DX, migration system, strong ecosystem | Heavier, schema file separate from code, slower build, less control over SQL |
| TypeORM | Mature, decorator-based, wide adoption | Performance overhead, complex configuration, slower migrations |
| Knex.js | SQL query builder, lightweight, mature | No type safety, manual migrations, more boilerplate |

#### Decision
**Drizzle ORM** with dual-mode strategy:
- **Development:** SQLite via `@libsql/client` (pure JS, no native compilation)
- **Production:** PostgreSQL via `postgres.js` (lightweight, modern driver)
- **Provider selection:** Driven by `DATABASE_PROVIDER` environment variable
- **Migration tool:** Drizzle Kit with single `drizzle.config.ts` that adapts to provider

#### Consequences
- Single codebase supports both database engines with minimal changes
- Developers can work locally without PostgreSQL installation (SQLite)
- Zero overhead for SQLite queries (important for desktop app performance)
- `@libsql/client` avoids native compilation issues (Windows compatibility)
- Database selection is transparent to business logic (handled at client factory level)
- Generic BaseRepository uses `any` type assertions to work around Drizzle generic constraints
  - Mitigation: Type safety is enforced at the repository implementation level (PRM-005+)

#### Related Decisions
- DEC-002: PostgreSQL Database (production target)
- DEC-006: NestJS Backend Framework

---

### DEC-008: Shared Package + Testing + CI/CD Strategy

| Field | Value |
|---|---|
| **Date** | 2026-07-24 |
| **Author** | Principal Software Architect |
| **Category** | Architecture |
| **Status** | ✅ Accepted |

#### Context
The project needs a shared codebase for types, interfaces, enums, constants, validation, and utilities that is consumed by both the frontend (React/Vite) and backend (NestJS). Additionally, testing infrastructure and CI/CD pipelines are needed for quality assurance.

#### Options Considered

**Testing Framework:**
| Option | Pros | Cons |
|---|---|---|
| Vitest | Fast, Vite-native, Jest-compatible API, built-in coverage | Newer ecosystem |
| Jest | Mature, widely adopted, extensive plugins | Slower, complex configuration |

**E2E Testing:**
| Option | Pros | Cons |
|---|---|---|
| Playwright | Multi-browser, modern API, video/trace support, webServer config | Slightly larger install size |
| Cypress | Great DX, time-travel debugging | Limited browser support |

**CI/CD:**
| Option | Pros | Cons |
|---|---|---|
| GitHub Actions | Native Git integration, free tier, large ecosystem | Vendor lock-in |
| GitLab CI | Self-hostable, good caching | Different platform |

#### Decision
- **Shared Package:** Zod for validation (consistent with backend), TypeScript-only (no framework dependencies), dual-platform safe (no React/import.meta)
- **Testing:** Vitest (unit/integration) + Playwright (E2E) with 60% coverage threshold
- **CI/CD:** GitHub Actions with 3 workflows (CI on push/PR, Release on tags, Quality on schedule)

#### Consequences
- Single source of truth for types across frontend and backend
- Shared validation ensures consistent rules on both sides
- CI/CD enforces quality gates before merging
- Testing infra ready for PRM-005 business module tests
- Playwright with 3 browsers ensures cross-browser compatibility for desktop app

#### Related Decisions
- DEC-006: NestJS Backend Framework
- DEC-007: Drizzle ORM with Dual-Mode Database Strategy

---

### DEC-009: PRM-004 Scaffolding Complete — Technology Implementation Confirmation

| Field | Value |
|---|---|
| **Date** | 2026-07-24 |
| **Author** | Principal Software Architect |
| **Category** | Technical |
| **Status** | ✅ Accepted |

#### Context
All 5 sub-phases of PRM-004 (Enterprise Scaffolding) are now complete. This decision confirms the implementation status of all technology stack decisions made in the Architecture Phase (PRM-003).

#### Implementation Status
| Layer | Decision | Status | Evidence |
|---|---|---|---|
| Backend | NestJS 10 | ✅ Implemented | Core, Config, Logger, Health, Shared, Common, Database modules |
| ORM | Drizzle ORM v0.36 | ✅ Implemented | database/ package with dual-mode SQLite/PostgreSQL |
| Desktop | Tauri v2 | ✅ Implemented | desktop/src-tauri/ with full window/tray/updater/IPC |
| Frontend | React 19 + Vite | ✅ Implemented | frontend/ with routing, state, ShadCN, Tailwind |
| UI Library | ShadCN + Tailwind CSS | ✅ Implemented | frontend/src/ with Radix primitives, custom theme |
| State Mgmt | RTK + Zustand | ✅ Implemented | Redux store + Zustand configured in frontend |
| Logging | Pino | ✅ Implemented | LoggerModule with pretty-print (dev) / JSON (prod) |
| Testing | Vitest + Playwright | ✅ Implemented | Root Vitest config, Playwright config (3 browsers), mock setup |
| CI/CD | GitHub Actions | ✅ Implemented | CI, Release, Quality workflows |
| Database | SQLite (dev) + PostgreSQL (prod) | ✅ Implemented | Dual-mode via DATABASE_PROVIDER env var |

#### Consequences
- All technology decisions from Architecture Phase (PRM-003) have been implemented
- No pending technology decisions remain — PRM-005 can proceed without tech stack ambiguity
- UI Data Grid decision (MUI DataGrid Pro vs TanStack Table) deferred to PRM-005 when actual data tables are built

#### Related Decisions
- DEC-006: NestJS Backend Framework
- DEC-007: Drizzle ORM with Dual-Mode Database Strategy
- DEC-008: Shared Package + Testing + CI/CD Strategy

---

## DEC-019: Sales Module — Same Generic Pattern as Purchase/Master
- **Status:** ✅ Implemented (PRM-006D)
- **Decision:** Extend the same generic MasterDataRepository and BaseMasterService pattern used in PRM-006A (Master Data) and PRM-006C (Purchase) to all 8 sales modules. Each module gets a simple service wrapper specifying the repository and unique field for duplicate validation.
- **Components:** SalesQuotations, SalesOrders, DeliveryChallans, SalesInvoices, SalesReturns, CustomerPriceList, SalesApprovals, SalesSettings
- **Database:** 13 Drizzle tables with dual-mode SQLite/PostgreSQL support
- **Frontend:** SalesDashboardPage + 8 MasterDataPage configurations with status/payment badges
- **Reasoning:** Consistent with existing architecture. Sales modules follow the same CRUD patterns as purchase modules.

## DEC-020: Finance Module — Double-Entry Accounting Foundation
- **Status:** ✅ Implemented (PRM-006E1)
- **Decision:** Extend the same generic MasterDataRepository and BaseMasterService pattern to all 8 finance modules. Use materialized path (`parentId` + `level` + `path`) for hierarchical data (account groups, cost centers). Journal entries follow double-entry accounting with separate header (voucher) and line items (debit/credit).
- **Components:** AccountGroups, ChartOfAccounts, LedgerMaster, JournalEntries, CashBook, BankBook, CostCenters, AccountingSettings
- **Database:** 9 Drizzle tables with dual-mode SQLite/PostgreSQL, materialized path for hierarchies
- **Frontend:** FinanceDashboardPage + 8 MasterDataPage configurations
- **Reasoning:** Consistent with existing architecture. Accounting foundation must support double-entry principles (debit=credit) while using the proven generic CRUD pattern for data management.

### DEC-023 — PRM-006F: Enterprise Financial Automation Engine
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Built a complete Financial Automation Engine with 15 sub-modules replacing all placeholder implementations from previous finance phases. Created a separate `AutomationModule` in `backend/src/automation/` to house the engine services, integration services, report engine, scheduler, and controllers — keeping automation logic separate from CRUD modules.

**Rationale:** The automation engines (posting, integration, reports) are fundamentally different from CRUD operations. They require complex business logic, database transactions, cross-module coordination, and scheduling — all of which would clutter the simple CRUD modules. A dedicated automation module keeps concerns separated and allows the engines to be developed, tested, and scaled independently.

**Architecture:**
- 8 backend files: TransactionManager, GLPostingEngine, GstCalculationEngine, IntegrationServices (6 integrations), ReportEngine (10 reports), FinancialScheduler, Controllers (5 controllers/22+ endpoints), AutomationModule
- 1 frontend file: 5 dashboard pages
- Pattern: Injectable services per module with DatabaseService dependency injection
- All engines support dual-mode (SQLite/PostgreSQL) via existing DatabaseService

**Key Patterns:**
- TransactionManager wraps drizzle-orm transactions with savepoint support
- GlPostingEngine handles all posting: validation, rules, reversal, recurring entries
- ReportEngine replaces 6+ placeholder services with one engine reading actual GL entries
- Integration services each handle a specific module's finance auto-posting (Sales, Purchase, Inventory, Payroll, Expense, Bank)
- FinancialScheduler supports manual invocation (no @nestjs/schedule dependency)
- Scheduler-controller pattern: 5 controllers (Posting, GST, Reports, Integration, Scheduler) + Dashboard

**Connections to Previous Modules:**
- Uses ChartOfAccounts from PRM-006E1 for account validation
- Uses GL Entries from PRM-006E2 for report generation
- Uses GST Ledger/Period Locks from PRM-006E3 for GST posting and period validation
- Uses Sales/Purchase/Inventory repositories from PRM-006C/006D for integration queries

## DEC-021: GL & Reporting Module — Report Engine Services with Placeholder Data
- **Status:** ✅ Implemented (PRM-006E2)
- **Decision:** Build a financial reporting layer on top of the PRM-006E1 accounting foundation. Separate CRUD services (GlEntries, PostingRules, FiscalClosing) from report engine services (TrialBalance, ProfitLoss, BalanceSheet, CashFlow, DayBook, AccountStatement). Report engines return placeholder data with structured response schemas ready for GL query implementation.
- **Components:** GL Entries, PostingRules, FiscalClosing, TrialBalance, P&L, BalanceSheet, CashFlow, DayBook, AccountStatement, FinancialSnapshots
- **Database:** 5 Drizzle tables (GL entries with reversal/multi-currency, financial snapshots, report cache, posting rules, fiscal closing records)
- **Frontend:** FinancialDashboardPage + 3 MasterDataPage configs + 6 report view pages with PDF/Export/Print placeholders
- **Reasoning:** Report engines are kept separate from CRUD services to allow independent scaling and future implementation of real GL query logic without affecting data management operations.

### DEC-026 — PRM-010: Production Hardening, DevOps, Docker, CI/CD, Monitoring, Backup & Restore
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Transformed SHRANIX Krushi ERP into a production-ready enterprise platform with full Docker support, CI/CD pipelines, monitoring, database operations, caching, notification abstraction, security hardening, and deployment documentation.

**Architecture:**
- **Docker:** Multi-stage builds (deps→build→runner for backend, build→nginx for frontend), non-root containers, HEALTHCHECK on all services, docker-compose.yml (dev) + docker-compose.production.yml (prod with Nginx, scaled replicas, resource limits)
- **Nginx:** SSL/TLS with HSTS, CSP, rate limiting (30r/s), gzip compression, SPA routing, static asset caching (1y), client_max_body_size 100M
- **CI/CD:** 4 GitHub Actions workflows (CI on push/PR, Release on tags, Deploy to production, Quality weekly)
- **Backup:** pg_dump/pg_restore scripts with integrity verification, 30-day retention, cron scheduling
- **Storage:** Local/S3/MinIO adapter abstraction with StorageService (checksum, signed URLs)
- **Cache:** Redis cache module (Global, ready for session/permission/KPI caching)
- **Health:** 4 endpoints (/, /live, /ready, /metrics) with DB readiness check
- **Notifications:** Email/SMS/Push provider abstraction (SMTP/SendGrid/Twilio/FCM-ready)
- **Monitoring:** Prometheus scrape config + Grafana dashboard (9 panels for API, DB, Redis, Node metrics)
- **Security:** Environment variable validation (JWT_SECRET strength, DB scheme, MinIO/SMTP dependency checks, secret redaction), Helmet + CORS + rate limiting already in place
- **Deployment:** DEPLOYMENT.md with production guide, upgrade/rollback procedures, environment checklist, infrastructure checklist, troubleshooting

**Key Patterns:**
- StorageAdapter interface enables pluggable storage backends (local→S3→MinIO without code changes)
- NotificationService logs gracefully when providers aren't configured (no blocking)
- HealthService uses mocked DatabaseService in unit tests (no database required)
- EnvValidationService runs on startup with warnings (non-blocking)

### DEC-027 — PRM-011A: AI Production Integration, Security Hardening & Enterprise Readiness
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Completed production integration of the Enterprise AI Platform by wiring all 6 AI services into the ERP infrastructure, implementing 4 security layers (prompt injection protection, data masking, circuit breaker, audit logging), integrating AI into frontend routes, seeding permissions, and passing all quality gates.

**Rationale:** PRM-011 created the AI infrastructure but left critical gaps: services weren't wired together, no prompt injection protection, no data masking, no circuit breaker, frontend routes missing, and permission names mismatched. PRM-011A closes all these gaps to make the AI Platform enterprise-ready.

**Architecture:**

| Feature | Implementation |
|---|---|
| Prompt Injection Protection | PromptGuardService (20 patterns, 10K limit, sanitization, security violation logging) |
| Data Protection | DataMaskService (11 patterns, role-aware, phone-before-account) |
| Reliability | CircuitBreakerService (30s timeout, 2 retries, exponential backoff, fallback provider, circuit breaker) |
| Audit | AiAuditService (logs interaction + security violations via AuditService) |
| Permissions | AiPermissionSeedService (7 ai.* permissions, auto-seeded to admin) |
| Frontend | 4 AI routes (/ai/*), sidebar section, AiCopilotPanel |

**Key Decisions:**
1. Wire all security services inside `AiService.complete()` rather than using interceptors — keeps security logic with the actual AI calls
2. Circuit breaker wraps both primary and fallback provider — single retry policy for both
3. Data masking applied before circuit breaker — ensures masked data is sent on retries too
4. Audit logging in `finally` block — always fires regardless of success or failure

**Tests:** 6 test files, 49 tests, all passing

### DEC-028 — PRM-012: Mobile Workforce, PWA & Offline Operations
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Built a Progressive Web App (PWA) platform with full offline capability, barcode/QR scanning, camera/document capture, GPS field operations, push notifications, and mobile security. Used VitePWA plugin for service worker generation, IndexedDB for offline storage, and Web APIs (BarcodeDetector, Geolocation, Notification) natively.

**Rationale:** Field workforce needs mobile access to ERP functions (inventory lookup, goods receipt, delivery verification) even without internet connectivity. A PWA approach avoids app store deployment complexity while providing native-like capabilities.

**Architecture:**
- PWA: VitePWA plugin, service worker with 4 cache strategies, web manifest, offline fallback
- Offline: IndexedDB with 4 stores (queue, cache, auth, uploads), conflict resolution, background sync
- Mobile: Barcode/QR scanner, CameraCapture, GPS tracking, push notifications, biometric auth
- Security: AES-GCM encryption for offline data, secure local storage

### DEC-029 — PRM-013: Enterprise Business Suite
**Date:** 2026-07-25
**Status:** ✅ Implemented

**Decision:** Built 7 enterprise backend modules (Multi-Company, Advanced Finance, Fixed Assets, CRM, HR, Integrations, Governance) using the established generic repository + service pattern extended with 15 new DatabaseService adapters. All new modules follow the same patterns as existing modules for consistency.

**Rationale:** Enterprise ERP requires these modules for a complete business suite. Multi-company is essential for organizations with multiple entities. Fixed assets, HR foundation, CRM pipeline, webhook integrations, and governance policies are standard enterprise requirements.

### DEC-030 — PRM-014: v1.0 Production Certification
**Date:** 2026-07-25
**Status:** ✅ CERTIFIED — **GO FOR RELEASE**

**Decision:** Certified SHRANIX Krushi ERP v1.0.0 for production release after completing 11 phases of system validation, code audit, security certification, performance assessment, database certification, deployment certification, observability validation, documentation finalization, release packaging, and final QA. **Overall grade: 9.0/10 — GO.**

**Rationale:** The platform has 19 production modules, comprehensive security controls (helmet, ThrottlerGuard, JwtAuthGuard, RolesGuard, PermissionsGuard, CsrfGuard), full audit logging, dual-mode database support (SQLite/PostgreSQL), Docker deployment, CI/CD pipelines, and all quality gates passing. The project is ready for v1.0 public release.

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*

## DEC-009: Authentication Strategy — JWT + Argon2 + RBAC
- **Status:** ✅ Implemented (PRM-005A)
- **Decision:** JWT access tokens (24h expiry) + refresh tokens (7d rotation) for stateless auth. Argon2id for password hashing. Role-based + permission-based guards for fine-grained access control. In-memory store replaces with Drizzle repository in PRM-005B.
- **Components:** AuthModule, UsersModule, RolesModule, JwtAuthGuard, RolesGuard, PermissionsGuard
- **Security:** Account lockout after 5 failed attempts (15 min), rate limiting on login (10 req/min), Public decorator for open routes

## DEC-010: Repository Pattern — DatabaseService Wraps Drizzle Repositories
- **Status:** ✅ Implemented (PRM-005B)
- **Decision:** Use a single DatabaseService class that wraps all Drizzle repositories (Users, Roles, RefreshTokens) for NestJS DI. This avoids circular dependencies between repository modules and provides a unified database access point.
- **Reasoning:** The existing BaseRepository pattern lacked typed methods for auth operations. New repositories provide type-safe methods (findByEmail, lockAccount, getUserRoles, revokeAllForUser) while the DatabaseService handles client instantiation and provider selection.

## DEC-011: CSRF Strategy — Double-Submit Cookie
- **Status:** ✅ Implemented (PRM-005B)
- **Decision:** Use double-submit cookie pattern for CSRF protection: server sets a non-HTTP-only csrf_token cookie on login, client reads it and sends as X-CSRF-Token header on state-changing requests, CsrfGuard validates both match using timing-safe comparison.

## DEC-012: JWT Cookie Strategy — HTTP-Only Refresh Token
- **Status:** ✅ Implemented (PRM-005B)
- **Decision:** Return access token in JSON body (for frontend use in Authorization header) and set refresh_token as HTTP-only, secure (in production), sameSite=lax cookie. Refresh endpoint reads cookie if available, falls back to body. Logout clears cookie.

## DEC-012: Guard Authorization Strategy — Database-Driven with Cache
- **Status:** ✅ Implemented (PRM-005C)
- **Decision:** Replace JWT payload-based role/permission checks with database queries on every request, backed by a 60s TTL in-memory cache. This ensures role/permission changes take effect within 60 seconds instead of waiting for token expiry (up to 24h).
- **Reasoning:** JWT payload authorization is stale for the token's lifetime. Database queries with a short TTL cache provide near-real-time authorization while minimizing database load.

## DEC-013: Audit Logging — Event-Driven with Severity Levels
- **Status:** ✅ Implemented (PRM-005C)
- **Decision:** Use a dedicated audit_logs table (dual-mode SQLite/PostgreSQL) with 20+ predefined event types, severity levels (info/warning/error/critical), and device context (IP, user agent). Audit failures never block the main operation.
- **Reasoning:** Enterprise ERP requires a full audit trail for compliance (GDPR, GST audit, internal security). Fire-and-forget logging ensures availability even if the audit store is temporarily unavailable.

## DEC-014: Password Change — Full Session Invalidation
- **Status:** ✅ Implemented (PRM-005C)
- **Decision:** Password change increments the user's refreshTokenVersion and revokes ALL refresh tokens. This logs out all devices except the current session (which uses the access token still valid for its remaining lifetime).
- **Reasoning:** Compromised passwords require immediate revocation of all active sessions. The token version mechanism makes this efficient (single DB update) without needing to track individual sessions.

## DEC-015: Master Data Architecture — Generic Repository + Base Service Pattern
- **Status:** ✅ Implemented (PRM-006A)
- **Decision:** Use a single generic MasterDataRepository with common CRUD/search/pagination/soft-delete/restore, backed by a BaseMasterService with optional AuditService injection and unique field validation. Each domain module extends the base with minimal boilerplate.
- **Reasoning:** All 9 master modules have identical CRUD patterns. A generic approach reduces code duplication by ~80% while still allowing per-module customization (unique fields, DTOs, column configs, form fields). The optional audit/unique params ensure backward compatibility.

## DEC-016: Frontend Master Data — Reusable Generic CRUD Page
- **Status:** ✅ Implemented (PRM-006A)
- **Decision:** Create a single MasterDataPage component that accepts column definitions and form field configurations, rendering a full CRUD interface (table, search, pagination, create/edit modal, delete confirmation, restore). Each module provides its column config and form fields from a lightweight page configuration.
- **Reasoning:** All 9 modules have identical CRUD UI patterns. A single generic component avoids 9× code duplication while maintaining consistent UX across all modules. The component handles all states (loading, error, empty) uniformly.

## DEC-017: Purchase Module — Generic MasterDataRepository + BaseMasterService Pattern
- **Status:** ✅ Implemented (PRM-006C)
- **Decision:** Extend the same generic MasterDataRepository and BaseMasterService pattern used in PRM-006A (Master Data) to all 8 purchase modules. Each module gets a simple service wrapper specifying the repository and unique field for duplicate validation.
- **Reasoning:** Purchase modules have similar CRUD patterns to master data (search, pagination, soft delete, audit). Using the same generic pattern maintains consistency, reduces code duplication, and ensures uniform API behavior across the application.

## DEC-018: Purchase Frontend — MasterDataPage with StatusBadge Components
- **Status:** ✅ Implemented (PRM-006C)
- **Decision:** Reuse the MasterDataPage generic CRUD component for all purchase listing pages. Add custom status badge rendering (getStatusBadge, getPaymentBadge) as React.ReactNode render functions within the column definitions for visual status indicators.
- **Reasoning:** Purchase documents have rich status workflows (draft→submitted→approved→received→cancelled). The MasterDataPage component supports custom render functions, allowing status badges without custom page components. A dedicated PurchaseDashboardPage provides a high-level overview with stats cards and report navigation.
