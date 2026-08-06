# Developer Onboarding

> **Goal:** get a brand-new developer from `git clone` to a running, testable development environment in under 15 minutes.

---

## Prerequisites

| Tool                          | Version   | Why                                  |
| ----------------------------- | --------- | ------------------------------------ |
| [Node.js](https://nodejs.org) | **>= 20** | Runtime for all packages             |
| [pnpm](https://pnpm.io)       | **>= 9**  | Package manager (workspaces)         |
| Git                           | any       | Version control                      |
| Docker (optional)             | latest    | Containerized dev / production stack |
| PostgreSQL 16+ (optional)     | 16        | Only needed when not using SQLite    |

Verify:

```bash
node -v    # v20.x+
pnpm -v    # 9.x+
```

---

## Step-by-step setup

### 1. Clone

```bash
git clone https://github.com/shranixtech-byte/Shranix.git
cd Shranix
```

### 2. Install dependencies

```bash
corepack enable          # activates the pnpm version pinned in package.json
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

The defaults work out of the box (SQLite + development). If you want to change anything:

```bash
# Minimum viable settings
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./data/dev.db
JWT_SECRET=<any string ≥ 32 chars>
```

### 4. Run migrations

```bash
pnpm db:migrate
```

Creates all tables in the local SQLite DB.

### 5. Seed the database

```bash
pnpm db:seed
```

Creates the admin user (`admin@shranix.com` / `admin123`), roles, permissions, master data, and dummy business data.

### 6. Start the development servers

```bash
pnpm dev
```

- Frontend: **http://localhost:4000**
- Backend: **http://localhost:4001**
- Health check: **http://localhost:4001/v1/health**
- Swagger docs: **http://localhost:4001/api/docs**

---

## Daily workflow

### While coding

```bash
pnpm dev                 # both servers, hot reload
pnpm typecheck           # strict TS check (fast feedback)
pnpm lint                # ESLint
```

### Before a pull request

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

## Architecture map (30-second version)

```
frontend/   → React SPA talking to /api/v1
backend/    → NestJS. Controllers (HTTP) → Services (logic) → DatabaseService (repos) → DB
database/   → Drizzle schema + migrations + seeds
shared/     → types/validators used by both frontend and backend
```

**Where do I add X?**

| I want to…          | I go to…                                                         |
| ------------------- | ---------------------------------------------------------------- |
| Add a DB table      | `database/src/schema/` → run `pnpm db:generate`                  |
| Add an API endpoint | `backend/src/<module>/controllers.ts` + `services.ts` + `dto.ts` |
| Add a UI page       | `frontend/src/pages/` + register route in `frontend/src/routes/` |
| Add a shared type   | `shared/src/`                                                    |
| Fix a bug in sales  | `backend/src/sales/` + `frontend/src/pages/sales/`               |

---

## Common tasks

### Run one package's tests

```bash
pnpm --filter @shranix/backend test
pnpm --filter @shranix/frontend test
```

### Use PostgreSQL instead of SQLite

```bash
# .env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shranix_erp

# or just use the Docker stack:
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

### View the database

```bash
pnpm db:studio        # Drizzle Studio — browse/edit tables in a browser
```

### Reset the dev database

```bash
rm data/dev.db backend/data/dev.db
pnpm db:migrate
pnpm db:seed
```

---

## Troubleshooting quick reference

| Symptom                               | Fix                                                            |
| ------------------------------------- | -------------------------------------------------------------- |
| `pnpm dev` fails with "port in use"   | Kill the process on 4000/4001, or the dev script auto-kills it |
| Frontend login "Failed to fetch"      | Backend isn't running — start it first                         |
| `pnpm db:migrate` says "table exists" | Dev DB is partially migrated — reset it (see above)            |
| Missing columns after `git pull`      | Run `pnpm db:migrate`                                          |
| Lint fails on Windows                 | CI runs on Ubuntu; use WSL for local lint if needed            |

---

## Project conventions cheat sheet

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `db:`, `chore:`) — enforced by Husky + commitlint.
- **Branches:** `main` (production) · `develop` (integration) · `feat/*`, `fix/*`, `release/*`
- **Files:** `kebab-case` · components `PascalCase` · functions `camelCase` · DB tables `snake_case`
- **TypeScript:** strict, no `any`
- **Logging:** NestJS `Logger` (never `console.log`)

---

_Full guide: [CONTRIBUTING.md](../CONTRIBUTING.md) · Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md) · Project map: [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md)_
