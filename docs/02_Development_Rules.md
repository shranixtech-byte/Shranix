# 02 — Development Rules

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SHRANIX-DOC-002 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | SHRANIX Technologies |
| **Last Updated** | YYYY-MM-DD |

---

## Golden Rules

1. **Write code for humans first, machines second.** Clarity > cleverness.
2. **Every line of code is a liability.** Less code = fewer bugs.
3. **Never commit broken code.** If it doesn't compile, it doesn't go in.
4. **No secrets in code.** API keys, passwords, and tokens live in environment variables only.
5. **Test your own code before asking for review.**

## Architecture Principles

### Separation of Concerns
- **Frontend** — Presentation only. No business logic.
- **Backend** — Business logic and data access. No HTML rendering.
- **Shared** — Types, constants, and utilities shared across layers.
- **Database** — Data storage and integrity constraints only.

### SOLID Principles
- **Single Responsibility:** Every module, class, and function has exactly one job.
- **Open/Closed:** Open for extension, closed for modification.
- **Liskov Substitution:** Subtypes must be substitutable for their base types.
- **Interface Segregation:** Many small, focused interfaces > one large interface.
- **Dependency Inversion:** Depend on abstractions, not concretions.

## TypeScript Rules

- `strict: true` in tsconfig — always.
- `noUnusedLocals` and `noUnusedParameters` enabled.
- Prefer `interface` over `type` for object shapes.
- Use `type` for unions, intersections, and primitive aliases.
- Avoid `any`. If unavoidable, add a comment explaining why.
- Use `as const` for literal types and enums.
- Functional components only — no class components.

## Git Workflow

### Branching Strategy
```
main          ─── Production-ready code
  ├── develop     ─── Integration branch
  │    ├── feat/*     ─── Feature branches
  │    ├── fix/*      ─── Bug fix branches
  │    └── refactor/* ─── Refactoring branches
  └── release/*   ─── Release candidate branches
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

### Types
| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Build, CI, dependencies |
| `db` | Database migration or seed |

## Code Review Standards

### Reviewer Must Check
- [ ] Logic correctness
- [ ] Security (injection, auth, data exposure)
- [ ] Error handling (no unhandled rejections)
- [ ] Performance (unnecessary queries, loops)
- [ ] Type safety
- [ ] Test coverage
- [ ] Logging (appropriate level, no sensitive data)
- [ ] i18n (all user-facing strings localized)

### PR Size Limit
- **Max 400 lines** per pull request (excluding generated files, tests, and config).

## Performance Budgets

| Metric | Target |
|---|---|
| Initial load time | < 2 seconds |
| API response (p95) | < 500 ms |
| DB query (p95) | < 200 ms |
| UI interaction response | < 100 ms |
| Desktop app memory | < 500 MB baseline |
| Installer size | < 200 MB |

---

## Related Reports

| Report | Link | Relevance |
|---|---|---|
| Execution Report | [View](../reports/Execution_Report.md) | Logs development actions against these rules |
| Technical Debt Register | [View](../reports/Technical_Debt.md) | Tracks debt incurred by deviating from these rules |
| Decision Log | [View](../reports/Decision_Log.md) | Records architecture decisions guided by these rules |

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*
