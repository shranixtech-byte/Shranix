# Contributing to SHRANIX Krushi ERP

First off — thank you for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to **SHRANIX Krushi ERP**. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What Should I Know Before Getting Started?](#what-should-i-know-before-getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [TypeScript Styleguide](#typescript-styleguide)
  - [Documentation Styleguide](#documentation-styleguide)
- [Additional Notes](#additional-notes)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [security@shranix.com](mailto:security@shranix.com).

---

## What Should I Know Before Getting Started?

### Repository Structure

This is a **monorepo** managed with **pnpm workspaces** and **Turborepo**:

| Package             | Path        | Description                                           |
| ------------------- | ----------- | ----------------------------------------------------- |
| `@shranix/backend`  | `backend/`  | NestJS REST API (all business logic, auth, workflows) |
| `@shranix/frontend` | `frontend/` | React 19 SPA (Vite + Tailwind + Radix UI)             |
| `@shranix/database` | `database/` | Drizzle ORM schema, migrations & seed scripts         |
| `@shranix/shared`   | `shared/`   | Shared types, enums, validation & utilities           |
| `desktop/`          | `desktop/`  | Tauri desktop shell (optional packaging)              |

### Design Principles

- **Separation of concerns** — frontend never talks to the database; the backend never renders UI.
- **Offline-first** — core flows must keep working with intermittent connectivity.
- **Type safety** — `strict: true` everywhere. Avoid `any`.
- **Business logic lives in services** — controllers are thin HTTP adapters.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:

1. **Search existing issues** — the bug may already have been reported.
2. **Use the latest version** — the bug may already be fixed.

When creating a bug report, use the [Bug Report template](./.github/ISSUE_TEMPLATE/bug_report.md) and include:

- A **clear and descriptive title**
- **Exact steps to reproduce** (with a code sample if relevant)
- **Expected vs. actual behavior**
- **Screenshots** (if the bug is visual)
- **Environment details** (OS, Node version, browser, Docker vs. bare metal)
- Any **error logs** (redact secrets first!)

### Suggesting Enhancements

Use the [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.md). Enhancement suggestions are tracked on the [roadmap](./ROADMAP.md).

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` — small, well-scoped, low-risk
- `help wanted` — larger but well-documented
- `bug` — something that needs fixing

### Pull Requests

The process described here is intended to keep the codebase healthy and reviewable.

#### Step 1: Set up your environment

```bash
# 1. Fork and clone the repository
git clone https://github.com/shranixtech-byte/Shranix.git
cd Shranix

# 2. Install dependencies (requires Node 20+ and pnpm 9+)
corepack enable
pnpm install

# 3. Configure environment
cp .env.example .env

# 4. Run migrations + seed the database
pnpm db:migrate
pnpm db:seed

# 5. Start the development servers
pnpm dev
```

#### Step 2: Create a branch

```bash
git checkout -b feat/your-feature-name        # features
git checkout -b fix/your-fix-name             # bug fixes
git checkout -b docs/your-doc-change          # documentation
```

#### Step 3: Make your changes

- Follow the [TypeScript styleguide](#typescript-styleguide).
- Keep changes focused — one logical change per PR.
- Add/update tests for anything non-trivial.
- Update documentation if user-facing behavior changes.

#### Step 4: Verify locally

```bash
pnpm typecheck        # TypeScript strict checks across all packages
pnpm lint             # ESLint
pnpm test             # Unit tests (Vitest)
pnpm build            # Production builds
```

All of these must pass before your PR is reviewed.

#### Step 5: Commit

We use [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint + Husky).

```bash
feat: add barcode scanning to delivery challan form
fix: resolve invoice date formatting issue
docs: update API reference for quotation endpoints
refactor: extract payment validation logic
chore: update dependencies
db: add inventory_batches table migration
```

#### Step 6: Open a pull request

- Fill out the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
- Reference any related issues (`Closes #123`).
- Keep PRs under ~400 lines when possible (excludes generated files, tests, config).
- Ensure CI (lint → typecheck → test → build) passes on your branch.

---

## Styleguides

### Git Commit Messages

- Use the present tense ("add feature", not "added feature").
- Use the imperative mood ("move cursor to…", not "moves cursor to…").
- Limit the first line to 72 characters or fewer.
- Use the Conventional Commits prefixes listed above.

### TypeScript Styleguide

- **Strict mode on** — never introduce `any` without a documented justification.
- **Naming:**
  - Files/directories: `kebab-case` (`user-profile.tsx`)
  - React components: `PascalCase` (`UserProfileCard`)
  - Functions/variables: `camelCase` (`getUserById`)
  - Constants/enums: `UPPER_SNAKE_CASE` (`MAX_RETRY_COUNT`)
  - Types/interfaces: `PascalCase` (`UserProfile`)
  - Database tables: `snake_case` (`user_profiles`)
- **Immutability:** prefer `const`; use `readonly` where appropriate.
- **No dead code** — no commented-out code, unused imports, or unreachable branches.
- **Errors:** throw typed exceptions (`BadRequestException`, `NotFoundException`) from services; controllers stay thin.
- **Logging:** use the NestJS `Logger` — never `console.log`.

### Documentation Styleguide

- Use [GitHub-flavored Markdown](https://guides.github.com/features/mastering-markdown/).
- Use relative links for internal files (e.g. `[CONTRIBUTING.md](./CONTRIBUTING.md)`).
- Update `README.md` and `docs/` when behavior that developers depend on changes.

---

## Additional Notes

### Issue and Pull Request Labels

This repository uses a standard set of labels for triage — see [`.github/labels.yml`](./.github/labels.yml).

### Attribution

This contributing guide is adapted from [Atom](https://github.com/atom/atom/blob/master/CONTRIBUTING.md) and [Mozilla](https://github.com/mozilla/diversity).

---

_Questions? Contact the maintainers at [developers@shranix.com](mailto:developers@shranix.com)._
