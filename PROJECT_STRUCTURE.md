# Project Structure

This document describes the layout of the **SHRANIX Krushi ERP** monorepo.

```
.
├── .github/                     # GitHub configuration
│   ├── workflows/               # CI/CD pipelines (ci, deploy, release, quality)
│   ├── ISSUE_TEMPLATE/          # Bug & feature issue templates
│   └── PULL_REQUEST_TEMPLATE.md # PR template
│
├── archive/                     # Historical/archived artifacts
│   ├── deprecated_files/        # Superseded one-off scripts & reports
│   ├── legacy_docs/             # Outdated documentation versions
│   ├── old_prompts/             # Completed AI-development prompts
│   ├── old_reports/             # Superseded development reports
│   ├── planning/                # Original product planning docs
│   ├── prompts/                 # Original AI prompt records
│   └── reports/                 # Original development reports & audits
│
├── backend/                     # NestJS REST API (the application server)
│   ├── src/
│   │   ├── auth/                # JWT auth, login/register/refresh, guards
│   │   ├── sales/               # Quotations, orders, challans, invoices, returns
│   │   ├── purchase/            # Orders, GRN, invoices, returns, requisitions
│   │   ├── inventory/           # Items, batches, serials, stock ledger, warehouse
│   │   ├── finance/             # COA, ledgers, journal, cash/bank books
│   │   ├── gl/                  # General ledger entries & reports
│   │   ├── gst_audit/           # GST registrations, returns, period locks, audit
│   │   ├── automation/          # Posting engines, reports engine, scheduler
│   │   ├── workflow/            # Workflow engine, approval matrices, tasks
│   │   ├── ai/                  # AI copilot, insights, predictions (optional)
│   │   ├── masters/             # Companies, branches, warehouses, units, tax
│   │   ├── users/ roles/ permissions/   # Users, RBAC
│   │   ├── multi-company/       # Companies, business units, departments
│   │   ├── crm/  hr/  fixed-assets/  governance/  integrations/  # Enterprise suite
│   │   ├── core/  common/  shared/  utils/  # Shared infrastructure
│   │   ├── config/              # Env loading & config factories
│   │   ├── database/            # DatabaseService + repository adapters
│   │   ├── dms/  storage/  pdf/  printer/  notifications/  backup/  # Services
│   │   ├── guards/  decorators/  pipes/  filters/  interceptors/  middleware/
│   │   ├── health/              # Health endpoints
│   │   └── main.ts              # Bootstrap (security, CORS, Swagger, versioning)
│   ├── test/                    # E2E tests
│   └── data/                    # Local dev SQLite DB (gitignored)
│
├── database/                    # Drizzle ORM data layer
│   ├── src/
│   │   ├── schema/              # Table definitions (dual-mode SQLite/PostgreSQL)
│   │   ├── migrations/          # Drizzle-kit SQL migrations + journal
│   │   ├── repositories/        # Type-safe repository helpers
│   │   ├── seeds/               # Seed data (admin user, dummy data)
│   │   └── utils/               # Query/filter helpers
│   └── data/                    # Local dev SQLite DB (gitignored)
│
├── desktop/                     # Tauri desktop shell (optional packaging)
│   └── src-tauri/               # Rust/Tauri config & icons
│
├── frontend/                    # React 19 SPA
│   ├── src/
│   │   ├── pages/               # Route pages (sales, purchase, inventory, finance…)
│   │   ├── components/          # Reusable UI components (ui/, layout, sidebar)
│   │   ├── services/            # API clients & business services
│   │   ├── store/               # Redux Toolkit / Zustand state
│   │   ├── hooks/  lib/  utils/
│   │   ├── routes/              # Route definitions & guards
│   │   ├── styles/              # Tailwind globals
│   │   ├── test/                # Test setup
│   │   └── main.tsx             # App entry
│   ├── public/                  # Static assets, PWA manifest, offline page
│   └── index.html
│
├── monitoring/                  # Observability
│   ├── prometheus.yml           # Prometheus scrape config
│   └── grafana-dashboard.json   # Grafana dashboard
│
├── scripts/                     # Dev/QA utility scripts
│   ├── dev.mjs                  # Dev server launcher (backend + frontend)
│   └── *.mjs                    # QA/verification scripts
│
├── shared/                      # Cross-layer shared code
│   ├── src/
│   │   ├── constants/  enums/  interfaces/  types/  utils/  validation/
│   └── index.ts
│
├── deployment/                  # Deployment documentation
│   ├── README.md                # Deployment guide
│   ├── admin-guide.md           # Admin/ops guide
│   ├── go-live-checklist.md     # Go-live checklist
│   └── release-manifest.json    # Release artifacts manifest
│
├── docs/                        # Project documentation
│   ├── 01_Project_Vision.md … 09_Release_Notes.md
│   ├── API_REFERENCE.md         # Endpoint reference
│   ├── ARCHITECTURE.md          # Architecture & request flows
│   ├── DATABASE.md              # Schema, migrations, backup/restore
│   ├── ONBOARDING.md            # Developer onboarding guide
│   └── DEPLOYMENT.md            # Deployment deep-dive
│
├── Dockerfile.backend           # Backend multi-stage Dockerfile
├── Dockerfile.frontend          # Frontend build + nginx Dockerfile
├── docker-compose.yml           # Dev compose (Postgres, Redis, MinIO, apps)
├── docker-compose.production.yml# Production compose (Nginx, scaled backend)
├── nginx.conf                   # Production Nginx config (TLS, security, proxy)
│
├── .env.example                 # Environment variable template
├── .editorconfig                # Editor conventions
├── .gitignore                   # Git exclusion rules
├── CHANGELOG.md                 # Version history (Keep a Changelog)
├── CODE_OF_CONDUCT.md           # Contributor covenant
├── CONTRIBUTING.md              # Contribution guide
├── LICENSE.md                   # License
├── PROJECT_STRUCTURE.md         # This file
├── README.md                    # Project home page
├── RELEASE_NOTES.md             # Release highlights
├── ROADMAP.md                   # Product roadmap
├── SECURITY.md                  # Security policy
├── TODO.md                      # Working backlog
│
├── package.json                 # Root scripts (pnpm workspace + turbo)
├── pnpm-workspace.yaml          # Workspace packages
├── pnpm-lock.yaml               # Locked dependency graph
├── turbo.json                   # Turborepo pipeline
└── tsconfig.json                # Root TypeScript config
```

---

## Package scripts (root)

| Command            | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | Start backend + frontend dev servers (port 4001 / 4000) |
| `pnpm build`       | Build database → backend + frontend                     |
| `pnpm typecheck`   | TypeScript strict check across all packages             |
| `pnpm lint`        | ESLint across all packages                              |
| `pnpm test`        | Run all unit tests (Vitest)                             |
| `pnpm db:generate` | Generate a new Drizzle migration                        |
| `pnpm db:migrate`  | Apply pending migrations                                |
| `pnpm db:seed`     | Seed the database (admin user + dummy data)             |
| `pnpm db:studio`   | Open Drizzle Studio                                     |

See [README.md](./README.md) for details.
