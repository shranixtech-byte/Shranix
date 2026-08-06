<div align="center">

# 🌾 SHRANIX Krushi ERP

**Enterprise-Grade ERP for the Agricultural Ecosystem**

Production-ready ERP for agri-input dealers, farmers, traders, processors, and agri-retail chains — sales, purchase, inventory, finance, GST, workflow approvals, and offline-first field operations.

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](./RELEASE_NOTES.md)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](./.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-268%20passing-brightgreen.svg)](./docs/08_Testing.md)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-blue.svg)](./LICENSE.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

</div>

---

## Table of Contents

- [Project Overview](#-project-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Installation](#-installation)
- [Local Development](#-local-development)
- [Database Setup](#-database-setup)
- [Migrations & Seed](#-migrations--seed)
- [Build Commands](#-build-commands)
- [Testing](#-testing)
- [Docker Commands](#-docker-commands)
- [Production Deployment](#-production-deployment)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Deployment Checklist](#-deployment-checklist)
- [Troubleshooting](#-troubleshooting)
- [Known Limitations](#-known-limitations)
- [Future Improvements](#-future-improvements)
- [Version Information](#-version-information)
- [License](#-license)

---

## 📋 Project Overview

**SHRANIX Krushi ERP** is a commercial-grade enterprise resource planning platform purpose-built for the agricultural supply chain. It empowers agribusinesses — from farm-input dealers to processors and retailers — with a unified platform covering the entire operation:

- **Sales:** quotations → orders → delivery challans → invoices → returns, with multi-level approval chains and one-click document conversion.
- **Purchase:** orders, GRN, invoices, returns, requisitions, with auto-posting.
- **Inventory:** item master, batch/lot & serial tracking, stock ledger, transfers, multi-warehouse.
- **Finance & GST:** chart of accounts, ledger, journal, GST returns (GSTR1/3B/9), period locks, year-end closing.
- **Workflow:** universal approval engine, tasks, notifications, escalations.
- **Field intelligence:** offline-first PWA with barcode scanning, GPS, push notifications, and a sync engine.
- **AI assistant:** optional LLM-powered copilot with enterprise security (prompt-injection protection, data masking).

### Target Audience

- Agricultural input dealers (seeds, fertilizers, pesticides, equipment)
- Agri-commodity traders and processors
- Agricultural retail chains
- Food processing and packaging units
- Rural distribution and logistics operators

---

## ✨ Features

### Sales & Distribution

- Quotations with revisions, validity, **3-level approval chain** (Executive → Manager → Owner)
- Sales Orders with auto numbering and stock reservation
- Delivery Challans with partial/full dispatch, vehicle & driver details, **e-way bill** fields
- Sales Invoices with GST, discount, round-off, payment tracking
- Sales Returns & Credit Notes with stock reversal
- Customer price lists with tiered pricing
- **One-click conversion:** Quotation → Sales Order → Delivery Challan → Invoice

### Purchase

- Purchase orders, quotations, GRN, invoices, returns
- Supplier price lists, debit notes, requisitions, approvals
- Auto-posting to finance

### Inventory

- Item master with variants, barcodes, HSN codes, pricing
- Batch/lot & serial number tracking with genealogy and traceability
- Stock ledger, transfers, adjustments, physical counts
- Multi-warehouse with zones/racks/bins and UoM conversions

### Finance & GST

- Chart of Accounts, Ledger Master, Journal Entries
- Cash & Bank Books, Cost Centers, Budgets
- GST engine: registrations, ledger, returns (GSTR1/3B/9), tax postings
- Period Locking, Year-End Closing, Opening Balance Transfer
- Audit Trail, Number Series, Voucher Approval Workflow

### General Ledger & Reports

- Trial Balance, Profit & Loss, Balance Sheet, Cash Flow
- Day Book, Account Statement, GST registers
- Real GL-based reporting engine (10+ reports)

### Platform

- JWT authentication with refresh tokens, Argon2 hashing, RBAC
- Universal workflow engine with approval matrices
- PWA offline-first mode with sync engine
- Docker deployment, Nginx + TLS, Prometheus + Grafana monitoring
- Automated database backups with retention policy

---

## 🛠️ Tech Stack

| Layer               | Technology                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| **Backend**         | NestJS 10, TypeScript (strict), Express                                           |
| **Frontend**        | React 19, Vite 6, Tailwind CSS, Radix UI, Redux Toolkit + Zustand, React Router 7 |
| **Database**        | SQLite (dev) / PostgreSQL 16 (production) — dual-mode via Drizzle ORM             |
| **ORM**             | Drizzle (`drizzle-orm`, `drizzle-kit`)                                            |
| **Auth**            | JWT + refresh tokens, Argon2, passport                                            |
| **Validation**      | `class-validator` + global `ValidationPipe`                                       |
| **Desktop shell**   | Tauri (optional packaging)                                                        |
| **Testing**         | Vitest (unit), Playwright (E2E, configured)                                       |
| **CI/CD**           | GitHub Actions (lint, typecheck, test, build, deploy, release)                    |
| **Monitoring**      | Prometheus + Grafana                                                              |
| **Containers**      | Docker, Docker Compose, Nginx                                                     |
| **Package manager** | pnpm 9 + Turborepo                                                                |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 19 SPA)                     │
│   React Router · Redux/Zustand · Tailwind · Radix UI          │
│   PWA / Offline sync engine · API client layer                │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP /api/v1 (Vite proxy or Nginx)
┌──────────────────────────────▼───────────────────────────────┐
│                     BACKEND (NestJS 10)                       │
│  ┌────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │
│  │ Controllers │ │ Services    │ │ Guards/Pipes/Interceptors│ │
│  │ (thin HTTP) │ │ (business)  │ │ Auth·RBAC·CSRF·Validation│ │
│  └─────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘  │
│        └───────────────┼────────────────────┘                │
│                        ▼                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │       DatabaseService (repositories, transactions)     │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                  DATABASE (SQLite / PostgreSQL)               │
│          Drizzle ORM · migrations · seeds · backups           │
└───────────────────────────────────────────────────────────────┘
```

- **Separation of concerns** — frontend never touches the database.
- **Layered services** — controllers stay thin; business logic lives in services.
- **Offline-first** — the PWA caches API responses and syncs when back online.
- **Dual-mode DB** — the same schema runs on SQLite (dev) and PostgreSQL (prod) via Drizzle.

**Deep dive:** see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for request flow, auth flow, database flow, storage, queues, and background jobs.

---

## 📁 Folder Structure

```
├── backend/      # NestJS REST API (all business logic)
├── frontend/     # React 19 SPA
├── database/     # Drizzle schema, migrations, seeds
├── shared/       # Shared types, enums, validation, utils
├── desktop/      # Tauri desktop shell (optional)
├── docs/         # Project documentation (incl. API reference, architecture)
├── deployment/   # Deployment guides & checklists
├── monitoring/   # Prometheus + Grafana configs
├── scripts/      # Dev/QA utility scripts
└── archive/      # Historical/archived development artifacts
```

**Full tree & package scripts:** see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

---

## 🚀 Installation

### Prerequisites

| Tool       | Version                                       |
| ---------- | --------------------------------------------- |
| Node.js    | **>= 20.0.0**                                 |
| pnpm       | **>= 9.0.0**                                  |
| PostgreSQL | 16+ (production only; SQLite used for dev)    |
| Docker     | latest (optional, for containerized dev/prod) |

### 1. Clone

```bash
git clone https://github.com/shranixtech-byte/Shranix.git
cd Shranix
```

### 2. Install dependencies

```bash
corepack enable          # ensures the pinned pnpm version
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```bash
DATABASE_URL=file:./data/dev.db     # SQLite dev default
JWT_SECRET=some-long-random-string  # ≥ 32 chars
```

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Seed the database

```bash
pnpm db:seed
```

This creates the admin user **`admin@shranix.com` / `admin123`** (development only — change it immediately in any non-dev environment) plus dummy business data.

---

## 💻 Local Development

Start both servers (backend on **:4001**, frontend on **:4000**):

```bash
pnpm dev
```

- Frontend: <http://localhost:4000>
- Backend health: <http://localhost:4001/v1/health>
- Swagger API docs: <http://localhost:4001/api/docs> (enabled by default)

The frontend dev server proxies `/api` → `http://localhost:4001`, so no CORS fiddling is needed.

### Run pieces individually

```bash
pnpm --filter @shranix/backend dev      # backend only (nest start --watch)
pnpm --filter @shranix/frontend dev     # frontend only (vite)
```

### Default dev login

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@shranix.com` |
| Password | `admin123`          |

---

## 🗄️ Database Setup

### Engine

The schema is defined once in `database/src/schema/` and supports **both** SQLite and PostgreSQL (dual-mode). Drizzle generates dialect-specific SQL automatically.

- **Development:** SQLite file at `backend/data/dev.db` (or `database/data/dev.db`)
- **Production:** PostgreSQL 16+

### Schema overview

20+ business domains across ~80 tables: sales, purchase, inventory, finance, GL, GST/audit, workflow, masters, multi-company, users/permissions, AI, DMS.

**Deep dive:** see [docs/DATABASE.md](./docs/DATABASE.md).

---

## ⚙️ Migrations & Seed

```bash
# Generate a new migration from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Seed the database (idempotent — safe to re-run)
pnpm db:seed

# Open Drizzle Studio (GUI browser for the DB)
pnpm db:studio
```

Migrations live in `database/src/migrations/` (SQL + journal). The migration tooling (drizzle-kit) lives in the repo's `database/` workspace, so migrations are run from a machine with the repo checked out, pointing at the target database:

```bash
# Run against your local dev DB
pnpm db:migrate

# Run against a remote/production DB (from the repo, with production env)
DATABASE_URL=postgresql://user:pass@host:5432/shranix_erp pnpm db:migrate
```

> In Docker, migrations are applied to the attached volume once it is created; the backend does **not** auto-migrate on boot, so run this step explicitly before first use (e.g. in CI or on the deploy host).

### Backup & Restore

```bash
# Backup (pg_dump with verification & retention)
./scripts/backup.sh backup
./scripts/backup.sh restore --file=backup.sql.gz
./scripts/backup.sh list
```

Scheduled daily backups are provided via `scripts/schedule-backup.sh` (cron). Backups are stored outside the repo (`**/backups/*.db` is gitignored).

---

## 🔨 Build Commands

```bash
pnpm build                 # Build database → backend → frontend (production)
pnpm build:frontend        # Frontend only
pnpm build:backend         # Backend only
```

### Quality gates

```bash
pnpm typecheck             # TypeScript strict check (all packages)
pnpm lint                  # ESLint
pnpm format:check          # Prettier check
```

---

## 🧪 Testing

```bash
pnpm test                  # All unit tests (Vitest, all packages)
pnpm test:coverage         # With coverage report
pnpm test:e2e              # Backend E2E tests
pnpm --filter @shranix/frontend test:watch
```

> **Note:** `auth.e2e.spec.ts` requires a live database and is designed to run in an environment with one (CI excludes it unless a DB service is provisioned).

---

## 🐳 Docker Commands

### Development stack (PostgreSQL + Redis + MinIO + backend + frontend)

```bash
docker compose up --build
```

### Production stack (Nginx + scaled backend)

```bash
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, etc.
docker compose -f docker-compose.production.yml up -d --build
```

### Useful commands

```bash
docker compose ps                                # service status
docker compose logs -f backend                   # follow backend logs
docker compose exec backend node dist/main.js    # shell into backend
docker compose down                              # stop everything
docker system prune -f                           # clean up
```

---

## 🚢 Production Deployment

Supported targets:

- **Docker / Docker Compose** — the recommended path (`docker-compose.production.yml`)
- **Linux server (bare metal)** — build locally, run with PM2 or systemd
- **Reverse proxy** — bundled `nginx.conf` (TLS, HSTS, security headers, rate limiting, SPA routing)
- **SSL** — the nginx config expects certs at `/etc/ssl/certs/shranix.crt` + `/etc/ssl/private/shranix.key`

### CI/CD

GitHub Actions workflows are included:

| Workflow      | Trigger                      | Purpose                                                   |
| ------------- | ---------------------------- | --------------------------------------------------------- |
| `ci.yml`      | push/PR to `main`, `develop` | lint → typecheck → test → build → migration check         |
| `release.yml` | tag `v*`                     | version validation, build, Docker publish, GitHub release |
| `deploy.yml`  | manual                       | Docker deploy to staging/production + optional rollback   |
| `quality.yml` | weekly schedule              | full quality-gate suite                                   |

### Environment configuration

Set secrets in GitHub → Settings → Secrets: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DATABASE_URL`, `JWT_SECRET`, `REDIS_PASSWORD`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `SMTP_*`.

**Complete guides:** [deployment/README.md](./deployment/README.md) · [admin-guide.md](./deployment/admin-guide.md) · [go-live-checklist.md](./deployment/go-live-checklist.md) · [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 🔐 Environment Variables

All variables are documented with placeholders in [`.env.example`](./.env.example).

| Variable                           | Required | Default             | Description                                                   |
| ---------------------------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `NODE_ENV`                         | —        | `development`       | `development` / `test` / `production`                         |
| `APP_PORT`                         | —        | `4001`              | Backend HTTP port                                             |
| `DATABASE_PROVIDER`                | —        | `sqlite`            | `sqlite` or `postgresql`                                      |
| `DATABASE_URL`                     | ✅       | —                   | `file:./data/dev.db` or `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET`                       | ✅       | —                   | ≥ 32 chars                                                    |
| `JWT_EXPIRES_IN`                   | —        | `7d`                | Access-token lifetime                                         |
| `JWT_REFRESH_SECRET`               | —        | —                   | Refresh-token secret                                          |
| `JWT_REFRESH_EXPIRES_IN`           | —        | `30d`               | Refresh-token lifetime                                        |
| `CORS_ORIGINS`                     | —        | localhost           | Comma-separated allowed origins                               |
| `SWAGGER_ENABLED` / `SWAGGER_PATH` | —        | `true` / `api/docs` | API docs toggles                                              |
| `REDIS_URL`                        | —        | —                   | Optional Redis cache/queue                                    |
| `STORAGE_ADAPTER`                  | —        | `local`             | `local` / `s3` / `minio`                                      |
| `SMTP_HOST/PORT/USER/PASS/FROM`    | —        | —                   | Email notifications                                           |
| `AI_PROVIDER` + provider keys      | —        | —                   | Optional AI assistant                                         |
| `VITE_API_URL`                     | —        | `/api/v1`           | Frontend API base                                             |

> **Never commit real secrets.** Only `.env.example` (placeholders) is version-controlled.

---

## 📚 API Documentation

- **Base URL:** `http://localhost:4001/api/v1`
- **Interactive docs (Swagger):** `http://localhost:4001/api/docs`
- **Auth:** `Authorization: Bearer <access_token>` (JWT)
- **Response envelope:** `{ success, data, error, timestamp, path, method }`

The API exposes **160+ REST endpoints** across 20+ domains. A full endpoint reference is in [docs/API_REFERENCE.md](./docs/API_REFERENCE.md), organized by module:

| Module     | Base routes (examples)                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/login`, `/auth/refresh`, `/auth/register`                                                                     |
| Sales      | `/sales/quotations`, `/sales/orders`, `/sales/delivery-challans`, `/sales/invoices`, `/sales/returns`, `/sales/approvals` |
| Purchase   | `/purchase/orders`, `/purchase/grn`, `/purchase/invoices`, `/purchase/returns`, `/purchase/requisitions`                  |
| Inventory  | `/inventory/items`, `/inventory/batches`, `/inventory/serials`, `/inventory/stock-ledger`, `/inventory/transfers`         |
| Finance    | `/finance/chart-of-accounts`, `/finance/ledgers`, `/finance/journal-entries`, `/finance/settings`                         |
| GL         | `/gl/entries`, `/gl/reports`, `/gl/posting-rules`                                                                         |
| GST/Audit  | `/gst/registrations`, `/gst/returns`, `/gst/period-locks`, `/gst/audit-details`                                           |
| Masters    | `/companies`, `/branches`, `/warehouses`, `/units`, `/tax-groups`                                                         |
| Users/RBAC | `/users`, `/roles`, `/permissions`                                                                                        |
| Workflow   | `/workflow/templates`, `/workflow/instances`, `/workflow/tasks`, `/workflow/approval-matrix`                              |
| Health     | `GET /v1/health`, `/v1/health/live`, `/v1/health/ready` (excluded from `/api` prefix), `/api/v1/health/metrics`           |

---

## ✅ Deployment Checklist

Before going live:

- [ ] Set strong `JWT_SECRET` (≥ 32 chars, `openssl rand -base64 48`)
- [ ] Configure PostgreSQL `DATABASE_URL` with TLS
- [ ] Run `pnpm db:migrate` and `pnpm db:seed`
- [ ] **Change the default admin password** immediately
- [ ] Configure SSL certificates for Nginx (TLS 1.2/1.3, HSTS)
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP for notifications (or disable)
- [ ] Configure storage (local path / MinIO / S3)
- [ ] Verify health endpoints (`/health`, `/health/ready`)
- [ ] Configure monitoring (Prometheus + Grafana) and backups (cron)
- [ ] Set GitHub secrets for CI/CD deploy
- [ ] Run the [go-live checklist](./deployment/go-live-checklist.md)

---

## 🔧 Troubleshooting

### Login fails with "Failed to fetch" on the frontend

The Vite proxy targets `http://localhost:4001`. Ensure the backend is running and the port is not occupied:

```bash
netstat -ano | findstr ":4001"
```

### Migrations are not applying

```bash
pnpm db:migrate
```

Check `DATABASE_URL` — relative paths are resolved from the workspace package directory.

### Port 4000/4001 already in use

The dev launcher kills lingering processes automatically; if not:

```bash
# Windows
taskkill /PID <pid> /F
```

### Linter errors on Windows

ESLint can report I/O errors on Windows. CI runs on Ubuntu where it passes. Prefer `pnpm lint` inside WSL or CI.

### AI endpoints return fallback behavior

When no provider key is configured, the AI service uses the circuit-breaker fallback. Configure `AI_PROVIDER` + matching key to enable.

### More

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) → Troubleshooting and [deployment/README.md](./deployment/README.md).

---

## ⚠️ Known Limitations

- S3/MinIO storage adapters require additional npm packages (currently shipped with a Local adapter wired end-to-end).
- Email/SMS/Push providers need third-party credentials to activate.
- `auth.e2e.spec.ts` requires a live database (not runnable in CI without a DB service).
- The default seed admin (`admin123`) is for development only — must be changed in production.
- Desktop (Tauri) shell exists but the primary target is the web/PWA distribution.

---

## 🔮 Future Improvements

See the [ROADMAP.md](./ROADMAP.md) for the full plan:

- Payroll processing module
- Multi-currency support
- E-invoice (IRN) integration
- E-way bill API integration
- Offline sync engine hardening
- Data import/export wizards
- Field-level permissions
- Multi-tenant SaaS packaging

---

## 📦 Version Information

| Attribute       | Value                                        |
| --------------- | -------------------------------------------- |
| Current version | **1.0.0** (Production Release)               |
| SemVer          | `MAJOR.MINOR.PATCH` (+ pre-release suffixes) |
| Changelog       | [CHANGELOG.md](./CHANGELOG.md)               |
| Release notes   | [RELEASE_NOTES.md](./RELEASE_NOTES.md)       |
| Roadmap         | [ROADMAP.md](./ROADMAP.md)                   |

---

## 📄 License

**Proprietary** — All Rights Reserved.

Copyright © 2026 SHRANIX Technologies. This software and its documentation are confidential and proprietary. Unauthorized copying, distribution, or use is strictly prohibited.

See [LICENSE.md](./LICENSE.md) for full terms. For enterprise licensing inquiries: [licensing@shranix.com](mailto:licensing@shranix.com).

---

_Maintained by SHRANIX Technologies. Questions? [developers@shranix.com](mailto:developers@shranix.com)._
