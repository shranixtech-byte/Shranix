# Prompt Guidelines

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SHRANIX-PRM-GUIDE |
| **Project** | SHRANIX Krushi ERP |
| **Version** | 1.0 |
| **Status** | Active |
| **Last Updated** | YYYY-MM-DD |

---

## Purpose

Effective prompts are the foundation of productive AI-assisted development. This document defines the principles, structure, and best practices for crafting prompts that yield consistent, high-quality results.

---

## Guiding Principles

### 1. Be Specific
- **Vague:** "Improve the inventory module"
- **Specific:** "Add low-stock alert functionality to the inventory module that triggers when stock quantity falls below the configured `min_stock_qty` threshold. Include UI notification, email alert, and dashboard widget."

### 2. Provide Context
- Reference existing files, patterns, and conventions.
- Link to relevant documentation (e.g., `docs/02_Development_Rules.md`).
- Mention what has already been done in previous prompts.

### 3. Define Success Criteria
- Every prompt must have clear, measurable deliverables.
- Example: "Create 3 files: `ItemMaster.tsx`, `itemMaster.test.tsx`, and update `navigation.ts`."

### 4. Set Constraints
- Technology boundaries: "Use React 18, TypeScript strict mode, Tailwind CSS only."
- Scope boundaries: "Do not modify backend files."
- Design boundaries: "Follow the UI guidelines in docs/05_UI_Guidelines.md."

### 5. Sequential Dependency
- Prompts should build on each other.
- Each prompt should reference the previous prompt's output.
- Maintain a clear chain: PRM-001 → PRM-002 → PRM-003

---

## Prompt Structure

Every prompt must follow the structure defined in `Prompt_Template.md`:

```
┌──────────────────────────────────────┐
│            METADATA                  │
│  ID, Title, Phase, Version, Author  │
├──────────────────────────────────────┤
│            OBJECTIVE                 │
│  Single paragraph goal statement     │
├──────────────────────────────────────┤
│            CONTEXT                   │
│  Background, references, history     │
├──────────────────────────────────────┤
│            PROMPT                    │
│  Main instruction (numbered steps)   │
├──────────────────────────────────────┤
│         DELIVERABLES                 │
│  Concrete output artifacts           │
├──────────────────────────────────────┤
│        CONSTRAINTS                   │
│  Rules, guardrails, boundaries       │
├──────────────────────────────────────┤
│       EXPECTED OUTPUT                │
│  File list, quality criteria         │
├──────────────────────────────────────┤
│       ACTUAL OUTPUT                  │
│  Filled after execution              │
├──────────────────────────────────────┤
│       REVIEW & LESSONS               │
│  Checklist, learnings, next prompt   │
└──────────────────────────────────────┘
```

---

## Common Pitfalls

| Pitfall | Problem | Solution |
|---|---|---|
| **Ambiguous scope** | AI generates too much or too little | Define exact file boundaries |
| **Missing context** | AI makes wrong assumptions | Always link previous output |
| **No constraints** | AI chooses wrong libraries | Explicitly list allowed tech |
| **Vague success criteria** | Cannot verify completion | List exact files and behaviors |
| **Too many objectives** | Quality drops on each | One major objective per prompt |
| **No dependency chain** | Outputs don't compose | Reference PRM IDs in sequence |

---

## Quality Checklist

Before submitting a prompt, verify:

- [ ] Objective is a single, clear statement
- [ ] Context references previous work (PRM IDs)
- [ ] All technology constraints are stated
- [ ] Deliverables are concrete (files, functions, behaviors)
- [ ] Success criteria are measurable
- [ ] The prompt is self-contained for the executor
- [ ] Security and performance are addressed (if relevant)
- [ ] Expected output section is filled
- [ ] Prompt_Index.md will be updated after execution
- [ ] The prompt has been reviewed by at least one other team member

---

## Prompt Versioning

| Version | When to Use |
|---|---|
| **1.0** | First submission |
| **1.1, 1.2...** | Minor revisions (clarifications, scope adjustments) |
| **2.0** | Major re-write (objective or approach changed significantly) |

---

## Handling Failed Prompts

1. **Document** the failure in the Actual Output section.
2. **Analyze** why it failed (ambiguous instruction? missing context? technical limitation?).
3. **Revise** the prompt addressing the root cause.
4. **Re-submit** as a new version (e.g., PRM-005-v2).
5. **Archive** the failed attempt.

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*
