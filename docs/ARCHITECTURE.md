# Architecture

> **SHRANIX Krushi ERP** — v1.0.0 · Last updated: 2026-08-06

This document describes how the system is put together, how requests flow through it, and how each subsystem works.

---

## Table of Contents

1. [Application Architecture](#application-architecture)
2. [Repository Layout](#repository-layout)
3. [Request Flow](#request-flow)
4. [Authentication Flow](#authentication-flow)
5. [Authorization (RBAC)](#authorization-rbac)
6. [Database Flow](#database-flow)
7. [Storage Flow (DMS)](#storage-flow-dms)
8. [Cache & Queue Flow](#cache--queue-flow)
9. [External Services](#external-services)
10. [Background Jobs](#background-jobs)
11. [Workflow & Approval Engine](#workflow--approval-engine)
12. [Offline / PWA Flow](#offline--pwa-flow)

---

## Application Architecture

The system is a **classic 3-tier monorepo**:

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND — React 19 SPA (Vite, Tailwind, Radix UI)          │
│  PWA + Offline sync engine · Redux/Zustand · API client      │
└──────────────────────────────┬───────────────────────────────┘
                               │  HTTP(S)  /api/v1/*
┌──────────────────────────────▼───────────────────────────────┐
│  BACKEND — NestJS 10 API                                     │
│  Controllers → Services → Repositories (DatabaseService)     │
│  Guards · Pipes · Interceptors · Exception Filters           │
│  Engines: Sales/Purchase/Inventory/Finance/GST/Automation/   │
│           Workflow/AI                                        │
└──────────────────────────────┬───────────────────────────────┘
                               │  Drizzle ORM
┌──────────────────────────────▼───────────────────────────────┐
│  DATABASE — SQLite (dev) / PostgreSQL 16 (prod)              │
└──────────────────────────────────────────────────────────────┘
```

### Backend module layout (NestJS)

Each business domain is a NestJS module with a consistent shape:

```
src/<domain>/
├── <domain>.module.ts        # Module wiring (imports, providers, controllers)
├── controllers.ts            # HTTP endpoints (thin adapters)
├── services.ts               # Business logic
├── dto.ts                    # class-validator DTOs
└── *-engine.service.ts       # Specialized engines (posting, approval, conversion…)
```

Core cross-cutting modules:

| Module                                                   | Responsibility                                         |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `auth`                                                   | Login/register/refresh, JWT, CSRF                      |
| `database`                                               | `DatabaseService` — repository adapters & transactions |
| `config`                                                 | Env loading + validation                               |
| `guards`/`decorators`/`pipes`/`filters`/`interceptors`   | HTTP pipeline                                          |
| `workflow`                                               | Universal workflow/approval engine                     |
| `automation`                                             | Posting engines, report engine, scheduler              |
| `ai`                                                     | LLM provider abstraction, prompt guard, masking        |
| `health`                                                 | Health endpoints                                       |
| `dms`/`storage`/`pdf`/`printer`/`notifications`/`backup` | Infrastructure services                                |

---

## Request Flow

```
Browser / PWA / Desktop
   │
   ▼
Nginx (production) or Vite proxy (dev)          ← TLS termination, static assets, rate limiting
   │  /api/*  →  http://backend:4001
   ▼
NestJS pipeline:
   1. helmet() + CORS + compression + cookie-parser
   2. LoggingInterceptor        (request-id, timing)
   3. ResponseInterceptor       (standard envelope)
   4. TimeoutInterceptor        (30s default)
   5. Global ValidationPipe     (DTO validation/transformation)
   6. ThrottlerGuard           (rate limiting, 100 req/60s)
   7. JwtAuthGuard             (validate Bearer token)
   8. RolesGuard / PermissionsGuard  (RBAC)
   9. CsrfGuard               (state-changing requests)
  10. Controller → Service → Repository → Drizzle → DB
   │
   ▼
GlobalExceptionFilter          (typed HTTP errors, no internals leaked)
   │
   ▼
Response envelope: { success, data, error, timestamp, path, method }
```

---

## Authentication Flow

```
POST /api/v1/auth/login { email, password }
   │
   ├─ User lookup by email (shranix_users)
   ├─ Argon2 password verify
   ├─ Lockout checks (failed_login_attempts, locked_until)
   ├─ Issue access token (JWT, ~1d) + refresh token (JWT, ~30d)
   └─ Rotate refresh-token version (server-side revocation)
```

- **Access token** — short-lived JWT, sent as `Authorization: Bearer <token>`.
- **Refresh token** — used at `POST /auth/refresh` to obtain a new access token without re-login.
- **Change password** — requires the current password (`POST /auth/change-password`).
- **Logout / logout-all** — revoke refresh tokens via token-version bump.
- **CSRF** — `POST /auth/csrf` issues a token required for state-changing requests.
- **Session expiry** — the frontend `ProtectedRoute` validates the JWT and redirects to login on 401.

---

## Authorization (RBAC)

Permissions are checked via two decorators:

```ts
@Roles('admin', 'manager')         // role-level guard
@Permissions('sales.create')       // fine-grained permission guard
```

- Permissions are **seeded on startup** (e.g. `sales.*`, `purchase.*`, `finance.*`, `workflow.*`, `ai.*`) and assigned to roles.
- Users can also have an `allowed_modules` whitelist (module-level access).
- All auth decisions are enforced server-side — the frontend only hides UI.

---

## Database Flow

```
Service                    DatabaseService                     Database
   │                             │                              │
   │  findById(id)  ────────────►│                              │
   │                             │  build query (table adapter) │
   │                             │─────────────────────────────►│
   │                             │◄─────────────────────────────│
   │◄────────────────────────────│                              │
```

- `DatabaseService` exposes **typed repository adapters** (80+ tables) — e.g. `db.salesQuotations.findById(...)`, `db.approvalMatrices.findAll(...)`.
- **Transactions** are used for multi-step operations (posting engines, document conversion) via a transaction manager with savepoints & rollback.
- **Soft delete** — tables carry `deleted_at` / `is_deleted`; queries filter deleted rows.
- **Timestamps** — `created_at` / `updated_at` maintained by repositories.
- **Dual-mode** — the schema is written in Drizzle for both SQLite and PostgreSQL; migrations are generated per dialect.

---

## Storage Flow (DMS)

- **Adapter pattern** (`STORAGE_ADAPTER`): `local` (default, wired end-to-end) · `s3` (requires `aws-sdk`) · `minio` (requires `minio` client).
- Used for document management (attachments, invoices, generated PDFs).
- Files stored under `LOCAL_STORAGE_PATH` (dev: `./storage/dms`), checksummed; signed-URL interface ready for remote adapters.
- Backend exposes `/dms` endpoints for upload/download metadata.

---

## Cache & Queue Flow

- **Redis** is available in the Docker stack (`REDIS_URL`) with a `CacheService` ready for session/permission/KPI caching.
- The system works **without Redis** — caching is optional and non-blocking.
- **Queue** — background/queue infrastructure is reserved for future async processing (large reports, batch jobs). In v1.0, time-consuming work (PDF, backup) runs with generous timeouts.

---

## External Services

| Service                                    | Purpose                             | Config                          | Required               |
| ------------------------------------------ | ----------------------------------- | ------------------------------- | ---------------------- |
| SMTP                                       | Transactional email (notifications) | `SMTP_HOST/PORT/USER/PASS/FROM` | Optional               |
| SendGrid                                   | Alternative email provider          | `SENDGRID_API_KEY`              | Optional               |
| Redis                                      | Cache/queue                         | `REDIS_URL`                     | Optional               |
| MinIO / S3                                 | Object storage                      | `MINIO_*`                       | Optional               |
| LLM provider (OpenAI/Claude/Gemini/Ollama) | AI assistant                        | `AI_PROVIDER` + keys            | Optional               |
| Chrome/Chromium                            | Server-side PDF rendering           | `CHROME_PATH`                   | Optional (auto-detect) |

All external calls are guarded (timeouts, circuit breaker for AI, structured logging).

---

## Background Jobs

In v1.0, the following run in-process:

- **Auto-numbering** — document numbers computed at creation (`SO-####`, `DC-####`, etc.).
- **Workflow escalation** — evaluated on workflow operations (time-based escalation is ready for a scheduler hook).
- **Backup** — `scripts/backup.sh` supports `backup` / `restore` / `list` / `cleanup` with retention; `schedule-backup.sh` wires it into cron.
- **Scheduler module** (`/automation/scheduler`) — financial scheduler for auto-posting, snapshots, and period-lock enforcement.
- **Notifications** — provider abstraction (Email/SMS/Push) with in-app notifications working end-to-end.

---

## Workflow & Approval Engine

A universal engine drives multi-level approvals across business documents:

```
Document created (e.g. sales quotation)
   → workflow instance started (template + matrix)
   → Level 1: Sales Executive  → approve
   → Level 2: Sales Manager    → approve
   → Level 3: Owner (admin)    → approve  → document status = approved
   → any reject/return          → document status = rejected / draft
```

- **Approval matrix** is configurable (levels, roles, can-override) — not hardcoded.
- **Document status sync** — the source document reflects the workflow position (pending → under_review → approved → rejected).
- **History** — every action recorded (user, state, timestamp) with audit integration.
- **Notifications & escalation** — tasks, comments, escalations tracked in dedicated tables.

---

## Offline / PWA Flow

```
Online           Offline             Back online
  │                 │                     │
  ▼                 ▼                     ▼
API client    IndexedDB queue      Sync engine replays
calls ──────► caches writes ──────► queued ops with
                + service worker     retry/backoff + conflict
                serves cached UI     resolution
```

- **Service worker** — caches app shell + static assets (offline.html fallback).
- **Sync engine** — queues mutations, replays with exponential backoff.
- **Barcode/camera/GPS** — mobile capabilities work offline; results sync later.

---

_See [README.md](../README.md) for the quick overview and [DATABASE.md](./DATABASE.md) for the data layer deep-dive._
