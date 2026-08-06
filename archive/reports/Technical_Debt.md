# Technical Debt Register

## Document Control

| Field            | Value                        |
| ---------------- | ---------------------------- |
| **Project Name** | SHRANIX Krushi ERP           |
| **Document ID**  | SHRANIX-RPT-DEBT             |
| **Version**      | 1.0                          |
| **Status**       | Active                       |
| **Last Updated** | YYYY-MM-DD                   |
| **Author**       | Principal Software Architect |

---

## Purpose

This register tracks all **technical debt** items in the project. Technical debt includes intentional shortcuts, temporary solutions, placeholders, and any code or documentation that does not meet the long-term quality standard.

---

## Debt Classification

| Class           | Definition                                   | Action Timeline |
| --------------- | -------------------------------------------- | --------------- |
| **🔴 Critical** | Blocks development or poses significant risk | Immediate       |
| **🟡 High**     | Slows development or reduces quality         | This sprint     |
| **🟢 Medium**   | Minor inefficiency or cosmetic issue         | This phase      |
| **⚪ Low**      | Nice-to-have improvement                     | Backlog         |

---

## Technical Debt Register

---

### Entry 001 — Foundation Phase

| Field            | Value      |
| ---------------- | ---------- |
| **Report Date**  | YYYY-MM-DD |
| **Phase**        | Foundation |
| **Version**      | 1.0.0      |
| **Entry Number** | 001        |

| #      | Item                                                                | Category       | Class     | Created    | Owner     | Plan                                                    |
| ------ | ------------------------------------------------------------------- | -------------- | --------- | ---------- | --------- | ------------------------------------------------------- |
| TD-001 | Placeholder dates in all documentation (YYYY-MM-DD)                 | Documentation  | 🟢 Medium | Foundation | Architect | Update with actual dates as each phase completes        |
| TD-002 | TBD markers for technology stack decisions                          | Architecture   | 🟡 High   | Foundation | Architect | Resolve during Architecture Phase (PRM-003)             |
| TD-003 | Placeholder content in API documentation (request/response schemas) | Documentation  | 🟢 Medium | Foundation | Developer | Flesh out during API implementation                     |
| TD-004 | Logo/brand assets not yet created (placeholder notes only)          | Design         | 🟢 Medium | Foundation | Designer  | Design logo and store in assets/brand/                  |
| TD-005 | No automated documentation validation                               | Process        | 🟢 Medium | Foundation | Tech Lead | Add markdown linting and link checking to CI/CD         |
| TD-006 | No git history (repository not initialized)                         | Infrastructure | 🟡 High   | Foundation | Architect | Initialize git repository immediately                   |
| TD-007 | Database schema defined as markdown tables, not actual migrations   | Database       | 🟢 Medium | Foundation | Developer | Convert to actual migration files during implementation |
| TD-008 | Report system markdown is manual — no auto-generation               | Process        | ⚪ Low    | Foundation | —         | Evaluate automation tools when project stabilizes       |
| TD-009 | No unit tests exist (expected — pre-code phase)                     | Testing        | 🟢 Medium | Foundation | Developer | Write tests as code is produced                         |
| TD-010 | Browser and hardware compatibility untested                         | Testing        | 🟢 Medium | Foundation | Developer | Test on target hardware during module development       |

#### Debt Summary

| Class       | Count  |
| ----------- | ------ |
| 🔴 Critical | 0      |
| 🟡 High     | 2      |
| 🟢 Medium   | 7      |
| ⚪ Low      | 1      |
| **Total**   | **10** |

#### Debt Trend

| Entry | Date       | Total Items | Critical | High |
| ----- | ---------- | ----------- | -------- | ---- |
| 001   | YYYY-MM-DD | 10          | 0        | 2    |

---

## Debt Repayment Log

| #   | Item | Repaid Date | Resolution |
| --- | ---- | ----------- | ---------- |
| —   | —    | —           | —          |

---

_This document is proprietary and confidential. © 2026 SHRANIX Technologies._
