# Risk Register

## Document Control

| Field            | Value                        |
| ---------------- | ---------------------------- |
| **Project Name** | SHRANIX Krushi ERP           |
| **Document ID**  | SHRANIX-RPT-RISK             |
| **Version**      | 1.0                          |
| **Status**       | Active                       |
| **Last Updated** | YYYY-MM-DD                   |
| **Author**       | Principal Software Architect |

---

## Purpose

This register tracks all identified risks throughout the project lifecycle. Each risk includes probability, impact, mitigation strategy, and current status. Entries are appended — never overwritten.

---

## Risk Scoring Matrix

| Impact \ Probability | Low (1)    | Medium (2) | High (3)     |
| -------------------- | ---------- | ---------- | ------------ |
| **High (3)**         | Medium (3) | High (6)   | Critical (9) |
| **Medium (2)**       | Low (2)    | Medium (4) | High (6)     |
| **Low (1)**          | Low (1)    | Low (2)    | Medium (3)   |

**Risk Score = Probability × Impact**

| Score | Rating      | Action Required                    |
| ----- | ----------- | ---------------------------------- |
| 6–9   | 🔴 Critical | Immediate mitigation plan required |
| 4–5   | 🟡 High     | Active monitoring and mitigation   |
| 2–3   | 🟢 Medium   | Regular review                     |
| 1     | ⚪ Low      | Accept and monitor                 |

---

## Risk Register

---

### Entry 001 — Foundation Phase

| Field            | Value      |
| ---------------- | ---------- |
| **Report Date**  | YYYY-MM-DD |
| **Phase**        | Foundation |
| **Version**      | 1.0.0      |
| **Entry Number** | 001        |

| #     | Risk Description                                                    | Category  | Prob. | Impact | Score | Mitigation                                                                                                  | Owner           | Status |
| ----- | ------------------------------------------------------------------- | --------- | ----- | ------ | ----- | ----------------------------------------------------------------------------------------------------------- | --------------- | ------ |
| R-001 | Technology stack decisions delayed, blocking downstream development | Schedule  | 3     | 3      | 9 🔴  | Schedule architecture workshop immediately in next phase; set 2-week deadline for final decisions           | Architect       | Open   |
| R-002 | Documentation becomes stale as project evolves                      | Process   | 2     | 2      | 4 🟡  | Enforce "update docs with code" policy in PR reviews; add documentation step to Definition of Done          | Tech Lead       | Open   |
| R-003 | Scope creep during module development                               | Scope     | 2     | 3      | 6 🔴  | Strict adherence to Feature List (docs/03_Feature_List.md); change request process via Customer_Requests.md | Product Manager | Open   |
| R-004 | Single developer dependency / knowledge silo                        | Resource  | 2     | 3      | 6 🔴  | Document all decisions in Decision_Log.md; maintain comprehensive docs; cross-train team members            | Project Manager | Open   |
| R-005 | Performance issues on low-end hardware                              | Technical | 2     | 2      | 4 🟡  | Define and enforce performance budgets; test on target hardware early                                       | Developer       | Open   |
| R-006 | Security vulnerability in third-party dependency                    | Security  | 2     | 3      | 6 🔴  | Regular dependency audits; use Snyk or Dependabot; pin dependency versions                                  | Developer       | Open   |
| R-007 | Database migration issues in production                             | Technical | 2     | 3      | 6 🔴  | Test migrations in staging first; always write rollback scripts; automate migration testing                 | Developer       | Open   |
| R-008 | Customer adoption slower than projected                             | Business  | 2     | 2      | 4 🟡  | Invest in onboarding documentation; offer trial period; collect early adopter feedback                      | Product Manager | Open   |
| R-009 | Regulatory / tax compliance changes                                 | External  | 1     | 3      | 3 🟢  | Build flexible tax engine; monitor regulatory changes; plan for quarterly tax updates                       | Architect       | Open   |
| R-010 | Offline mode complexity underestimated                              | Technical | 2     | 3      | 6 🔴  | Prototype offline sync early; evaluate CRDT or similar conflict resolution strategies                       | Architect       | Open   |

#### Risk Summary

| Category          | Count  |
| ----------------- | ------ |
| 🔴 Critical (6–9) | 6      |
| 🟡 High (4–5)     | 2      |
| 🟢 Medium (2–3)   | 1      |
| ⚪ Low (1)        | 0      |
| **Total**         | **10** |

---

## Risk Closure Log

| #   | Risk | Closed Date | Resolution |
| --- | ---- | ----------- | ---------- |
| —   | —    | —           | —          |

---

_This document is proprietary and confidential. © 2026 SHRANIX Technologies._
