# 08 — Testing

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SHRANIX-DOC-008 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | SHRANIX Technologies |
| **Last Updated** | YYYY-MM-DD |

---

## Testing Philosophy

> *"Test behavior, not implementation. If a refactor breaks tests unnecessarily, the tests are wrong."*

---

## Testing Pyramid

```
        ╱╲
       ╱ E2E ╲          ← 10% of tests
      ╱────────╲
     ╱Integration╲       ← 20% of tests
    ╱──────────────╲
   ╱   Unit Tests    ╲   ← 70% of tests
  ╱────────────────────╲
```

---

## Test Types

### 1. Unit Tests
- **Framework:** Vitest (frontend), Vitest/Jest (backend)
- **Scope:** Individual functions, components, hooks, utilities
- **Coverage Target:** ≥ 80% lines
- **What to test:**
  - Pure functions and business logic
  - Component rendering with different props
  - State management actions and selectors
  - Utility functions and formatters

### 2. Integration Tests
- **Framework:** Vitest + Testing Library
- **Scope:** Feature workflows, API endpoints, database queries
- **What to test:**
  - Complete user flows (create → read → update → delete)
  - API request/response cycles
  - Database CRUD operations with real/mocked DB
  - Authentication and authorization flows
  - Error handling and edge cases

### 3. End-to-End Tests
- **Framework:** Playwright
- **Scope:** Full application workflows through the UI
- **What to test:**
  - Login → navigate → perform action → verify result
  - Cross-module workflows (e.g., create purchase order → receive stock → update inventory)
  - Desktop app lifecycle (install → launch → operate → close)
  - Offline mode behavior (disconnect → operate → reconnect → sync)

---

## Test File Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx      ← Co-located unit test
├── features/
│   ├── inventory/
│   │   ├── stockAdjustment.ts
│   │   └── stockAdjustment.test.ts
├── pages/
│   ├── Dashboard.tsx
│   └── Dashboard.test.tsx
tests/
├── e2e/
│   ├── login.spec.ts
│   ├── inventory.spec.ts
│   └── sales.spec.ts
└── fixtures/
    ├── users.ts
    └── items.ts
```

---

## Testing Conventions

- **File naming:** `*.test.ts` or `*.test.tsx`
- **Describe blocks:** Use `describe('ComponentName', () => {...})`
- **Test blocks:** Use `it('should do something when condition', () => {...})`
- **Mock imports at top of file** using `vi.mock('...')`
- **Avoid testing internal implementation details** (use Testing Library queries)
- **Use `data-testid`** attributes sparingly — prefer accessible queries

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- src/features/inventory/stockAdjustment.test.ts

# E2E tests
npm run test:e2e
```

---

## Pre-Commit Checklist

- [ ] All unit tests pass
- [ ] Changed features have integration tests
- [ ] No regressions in existing test suites
- [ ] Test coverage does not decrease below threshold
- [ ] No flaky tests (run 3x to verify stability)

---

## Related Reports

| Report | Link | Relevance |
|---|---|---|
| Project Health Report | [View](../reports/Project_Health_Report.md) | Testing status contributes to health score |
| Technical Debt Register | [View](../reports/Technical_Debt.md) | Tracks test coverage gaps |
| Execution Report | [View](../reports/Execution_Report.md) | Logs test execution and results |

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*
