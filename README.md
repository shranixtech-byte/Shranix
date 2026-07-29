# SHRANIX Krushi ERP

> **Enterprise-Grade Desktop ERP for the Agricultural Ecosystem**
>
> *Version 1.0.0 — Phase: Foundation | Status: 🟢 Active*

---

## Quick Navigation

| Section | Link |
|---|---|
| 📋 Project Overview | [#project-overview](#project-overview) |
| 🏗️ Architecture | [#architecture](#architecture) |
| 📁 Repository Structure | [#repository-structure](#repository-structure) |
| 🛠️ Technology Stack | [#technology-stack](#technology-stack) |
| 📐 Coding Standards | [#coding-standards](#coding-standards) |
| 📚 Documentation | [#documentation](#documentation) |
| 📊 Reports & Health | [#reports--health](#reports--health) |
| 🎯 Prompts & Execution | [#prompts--execution](#prompts--execution) |
| 📦 Versioning & Releases | [#versioning--releases](#versioning--releases) |
| 🚀 Getting Started | [#getting-started](#getting-started) |
| 📋 Project Status | [#project-status](#project-status) |
| 📄 License | [#license](#license) |

---

## Project Overview

### Vision

**SHRANIX Krushi ERP** is a commercial-grade desktop enterprise resource planning solution purpose-built for the agricultural supply chain. It empowers agribusinesses — from farm input dealers to processors and retailers — with a unified, premium-quality platform that simplifies complexity, drives efficiency, and accelerates growth.

### Mission

Deliver a reliable, intuitive, and scalable ERP that:
- **Simplifies** agricultural operations with a clutter-free, productivity-first interface
- **Integrates** end-to-end workflows across procurement, inventory, sales, finance, and production
- **Performs** reliably in low-connectivity environments with intelligent offline capabilities
- **Scales** from single-user retail to multi-branch enterprise operations
- **Protects** business data with enterprise-grade security and access controls

### Core Values

| Value | Description |
|---|---|
| **Simplicity** | Complexity lives in the engine, not the interface |
| **Reliability** | Data integrity is non-negotiable |
| **Performance** | Every interaction feels instant and fluid |
| **User-Centric** | Design for agribusiness professionals — not developers |
| **Innovation** | Modern technology applied to practical, real-world needs |

### Target Audience

- Agricultural input dealers (seeds, fertilizers, pesticides, equipment)
- Farmers and farming cooperatives
- Agri-commodity traders and processors
- Food processing and packaging units
- Agricultural retail chains
- Rural distribution and logistics operators

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  DESKTOP SHELL (Electron/Tauri)           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Renderer   │  │  Main Process │  │   Native APIs  │  │
│  │  (React UI)  │  │  (Node.js)    │  │  (File System,  │  │
│  │              │  │               │  │   Printer, etc) │  │
│  └──────┬───────┘  └──────┬────────┘  └────────────────┘  │
└─────────┼─────────────────┼───────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                     LOCAL API LAYER                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   REST API  │  │  Auth (JWT)  │  │  Sync Engine   │  │
│  └──────┬──────┘  └──────────────┘  └────────────────┘  │
└─────────┼────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Inventory │ │Purchase  │ │  Sales   │ │  Finance   │ │
│  │Module    │ │Module    │ │  Module  │ │  Module    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │           ORM (Prisma / Drizzle)                  │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                POSTGRESQL DATABASE                        │
│        (Local or Networked Instance)                      │
└─────────────────────────────────────────────────────────┘
```

### Architecture Principles

- **Separation of Concerns:** Frontend (presentation) → Backend (business logic) → Database (storage)
- **SOLID Principles:** Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **Layered Architecture:** Desktop shell → API → Business Logic → Data Access → Database
- **Offline-First:** Core operations designed to work without internet connectivity
- **Modular Packaging:** Feature-based module system tied to license tiers

---

## Repository Structure

```
SHRANIX-KRUSHI-ERP/
│
├── .env.example              # Environment variable template
├── .gitignore                # Git exclusion rules
├── CHANGELOG.md              # Version history (append-only)
├── LICENSE.md                # Proprietary commercial license
├── README.md                 # This file
│
├── assets/                   # Static resources
│   └── brand/                # Logo, brand assets (TBD)
│
├── archive/                  # Historical/archived artifacts
│   ├── old_reports/          # Superseded reports
│   ├── old_prompts/          # Completed/archived prompts
│   ├── legacy_docs/          # Outdated documentation versions
│   └── deprecated_files/     # Deprecated code or config files
│
├── backend/                  # Server-side application
│   ├── src/                  # Source code
│   ├── tests/                # Backend-specific tests
│   └── config/               # Configuration files
│
├── database/                 # Data layer
│   ├── migrations/           # Schema migrations
│   ├── seeds/                # Seed data
│   └── scripts/              # Utility scripts
│
├── desktop/                  # Desktop shell (Electron/Tauri)
│   ├── src/                  # Main process / native code
│   ├── public/               # Bundled static files
│   └── build/                # Packaging scripts
│
├── docs/                     # Project documentation (9 files)
│   ├── 01_Project_Vision.md
│   ├── 02_Development_Rules.md
│   ├── 03_Feature_List.md
│   ├── 04_Database_Design.md
│   ├── 05_UI_Guidelines.md
│   ├── 06_Brand_Guidelines.md
│   ├── 07_API_Documentation.md
│   ├── 08_Testing.md
│   └── 09_Release_Notes.md
│
├── frontend/                 # User interface (React)
│   ├── src/                  # Components, pages, hooks, stores
│   ├── public/               # Static HTML, favicon, manifest
│   └── tests/                # Frontend-specific tests
│
├── installer/                # Platform-specific installers
│
├── logs/                     # Runtime logs (gitignored)
│
├── planning/                 # Product strategy (7 files)
│   ├── Ideas.md
│   ├── Roadmap.md
│   ├── Customer_Requests.md
│   ├── Packages.md
│   ├── Premium_Features.md
│   ├── Future_Versions.md
│   └── TODO.md
│
├── prompts/                  # AI/development prompt management
│   ├── Prompt_Index.md       # Prompt catalog
│   ├── Prompt_Template.md    # Standardized prompt template
│   ├── Prompt_Guidelines.md  # Prompt writing best practices
│   └── Prompt_XXX_*.md       # Individual prompt records
│
├── reports/                  # Enterprise reporting system
│   ├── Master_Project_Report.md
│   ├── Project_Health_Report.md
│   ├── Execution_Report.md
│   ├── Risk_Register.md
│   ├── Technical_Debt.md
│   ├── Decision_Log.md
│   ├── Progress_Dashboard.md
│   ├── Report_Index.md
│   └── screenshots/          # Visual evidence by phase
│       ├── Phase_00/
│       ├── Phase_01/
│       └── Phase_02/
│
├── scripts/                  # Build, CI/CD, utility scripts
│
├── shared/                   # Cross-layer shared code
│   ├── types/                # TypeScript interfaces & types
│   ├── utils/                # Shared utility functions
│   └── constants/            # Shared constants & enums
│
└── tests/                    # Cross-cutting / E2E tests
```

---

## Technology Stack

*Final decisions pending Architecture Phase (PRM-003). Shortlisted candidates shown.*

| Layer | Primary Candidate | Alternative | Decision Status |
|---|---|---|---|
| **Desktop Shell** | Tauri | Electron | ⏳ Pending |
| **Frontend Framework** | React 18 + TypeScript | — | ✅ Confirmed |
| **UI Styling** | Tailwind CSS | — | ✅ Confirmed |
| **UI Components** | Radix UI | Headless UI | ⏳ Pending |
| **State Management** | Zustand | Redux Toolkit | ⏳ Pending |
| **Backend Framework** | NestJS | Express / .NET | ⏳ Pending |
| **Database** | PostgreSQL 16+ | — | ✅ Confirmed |
| **ORM** | Drizzle | Prisma | ⏳ Pending |
| **Authentication** | JWT + OAuth 2.0 | — | ✅ Confirmed |
| **Testing (Unit)** | Vitest | Jest | ⏳ Pending |
| **Testing (E2E)** | Playwright | Cypress | ⏳ Pending |
| **Logging** | Pino | Winston | ⏳ Pending |
| **Desktop Packaging** | Tauri Bundler | Electron Builder | ⏳ Pending |
| **CI/CD** | GitHub Actions | — | ✅ Confirmed |

---

## Coding Standards

### General Principles
- **Clean Code:** Small functions, meaningful names, single responsibility (Robert C. Martin)
- **Type Safety:** TypeScript `strict: true`. Avoid `any`. Use `unknown` with type guards
- **Immutability:** Prefer `const`. Use readonly types and immutable data patterns
- **No Dead Code:** Remove commented-out code, unused imports, unreachable branches

### Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Files/Directories | `kebab-case` | `user-profile.tsx` |
| React Components | `PascalCase` | `UserProfileCard` |
| Functions/Variables | `camelCase` | `getUserById` |
| Constants/Envs | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Types/Interfaces | `PascalCase` | `UserProfile` |
| Database Tables | `snake_case` | `user_profiles` |
| API Routes | `kebab-case` | `/api/v1/user-profiles` |

### Commit Conventions (Conventional Commits)

```
feat: add billing module
fix: resolve invoice date formatting issue
docs: update API documentation
refactor: extract payment validation logic
chore: update dependencies
db: add inventory_batches table migration
```

### Branching Strategy

```
main          ─── Production-ready
  ├── develop     ─── Integration
  │    ├── feat/*     ─── Features
  │    ├── fix/*      ─── Bug fixes
  │    └── refactor/* ─── Refactoring
  └── release/*   ─── Release candidates
```

### PR Size Limit

**Max 400 lines** per pull request (excluding generated files, tests, config).

### Performance Budgets

| Metric | Target |
|---|---|
| Initial load time | < 2 seconds |
| API response (p95) | < 500 ms |
| DB query (p95) | < 200 ms |
| UI interaction response | < 100 ms |
| Desktop app memory | < 500 MB baseline |
| Installer size | < 200 MB |

---

## Documentation

The project includes a comprehensive documentation system:

| Category | Files | Description |
|---|---|---|
| **Project Docs** (`docs/`) | 9 | Vision, rules, features, database, UI, brand, API, testing, releases |
| **Planning** (`planning/`) | 7 | Ideas, roadmap, customer requests, packages, premium, future, TODO |
| **Prompts** (`prompts/`) | 4 | Prompt index, template, guidelines, active prompts |
| **Reports** (`reports/`) | 8 | Master report, health, execution, risks, debt, decisions, dashboard, index |

See [docs/](./docs/) for the full documentation suite.

---

## Reports & Health

The enterprise reporting system provides comprehensive project tracking:

| Report | Purpose |
|---|---|
| [Master Project Report](./reports/Master_Project_Report.md) | Central status — single source of truth |
| [Project Health Report](./reports/Project_Health_Report.md) | 8-dimension health scoring |
| [Execution Report](./reports/Execution_Report.md) | Granular action log |
| [Risk Register](./reports/Risk_Register.md) | Risk tracking & mitigation |
| [Technical Debt Register](./reports/Technical_Debt.md) | Debt tracking & repayment |
| [Decision Log](./reports/Decision_Log.md) | Architecture & process decisions |
| [Progress Dashboard](./reports/Progress_Dashboard.md) | Visual progress tracking |

**Current Health Score: [8.2 / 10](./reports/Project_Health_Report.md) 🟢**

---

### 📊 Single Source of Truth

> **All project status is now tracked in [`reports/MASTER_DEVELOPMENT_REPORT.md`](./reports/MASTER_DEVELOPMENT_REPORT.md).**
> This is the only report that receives updates going forward. Previous reports remain in the `reports/` directory for archival purposes.

---

## Prompts & Execution

All AI-assisted development is managed through structured prompts:

- **[Prompt Index](./prompts/Prompt_Index.md):** Catalog of all prompts
- **[Prompt Template](./prompts/Prompt_Template.md):** Standardized format
- **[Prompt Guidelines](./prompts/Prompt_Guidelines.md):** Best practices
- **Active Prompts:** Stored in `prompts/Prompt_XXX_Title.md`

---

## Versioning & Releases

### SemVer Strategy

```
MAJOR.MINOR.PATCH (e.g., 1.3.12)
```

| Increment | When |
|---|---|
| **MAJOR** | Breaking API or database changes |
| **MINOR** | New features (backward-compatible) |
| **PATCH** | Bug fixes and minor improvements |

**Pre-release:** `-alpha.1`, `-beta.2`, `-rc.3`

### Release Cadence

| Type | Frequency |
|---|---|
| Alpha | Bi-weekly (internal) |
| Beta | Monthly (preview) |
| Stable | Quarterly (production) |
| Patch | As needed |

### Current Status

**Phase:** Foundation (65% complete)
**Target Release:** Q1 2027

---

## Getting Started

*This section will be completed once the development environment is configured.*

### Prerequisites (TBD)
- Node.js 20+
- PostgreSQL 16+
- pnpm / npm / yarn (TBD)
- Rust (if using Tauri)

### Quick Start (TBD)
```bash
# Clone the repository
git clone https://github.com/shranix/shranix-krushi-erp.git

# Install dependencies
cd shranix-krushi-erp
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development
npm run dev
```

---

## Project Status

| Attribute | Status |
|---|---|
| **Phase** | Workspace Stabilization (PRM-004A) |
| **Progress** | 75% |
| **Health Score** | 🟢 8.2 / 10 |
| **Documentation** | ✅ Complete (35+ files) |
| **Architecture** | ✅ Complete (8.5/10 score) |
| **Frontend Scaffold** | ✅ Complete (React 19 + ShadCN + RTK + Zustand) |
| **Backend Scaffold** | ✅ Module structure created |
| **Code** | ⏳ Scaffolding in progress |
| **Tests** | ⏳ Not started |
| **CI/CD** | ⏳ Not setup |
| **PRM-004A** | ✅ Complete — Workspace stabilized |

---

## License

**Proprietary** — All Rights Reserved.

Copyright © 2026 SHRANIX Technologies. This software and its documentation are confidential and proprietary. Unauthorized copying, distribution, or use is strictly prohibited.

See [LICENSE.md](./LICENSE.md) for full terms.

---

*This document is maintained as part of the SHRANIX Krushi ERP documentation suite. For questions, contact architecture@shranix.com.*
