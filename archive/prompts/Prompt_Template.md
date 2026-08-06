# Prompt Template

## Document Control

| Field            | Value              |
| ---------------- | ------------------ |
| **Document ID**  | SHRANIX-PRM-TPL    |
| **Project**      | SHRANIX Krushi ERP |
| **Version**      | 1.0                |
| **Status**       | Active             |
| **Last Updated** | YYYY-MM-DD         |

---

## Template

```markdown
# [Prompt ID]: [Title]

## Metadata

| Field              | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Prompt ID**      | PRM-XXX                                                           |
| **Title**          | [Short descriptive title]                                         |
| **Phase**          | [Foundation / Core / Finance / Advanced / Release]                |
| **Version**        | 1.0                                                               |
| **Date Submitted** | YYYY-MM-DD                                                        |
| **Author**         | [Name / Role]                                                     |
| **AI Agent**       | [Agent name if applicable]                                        |
| **Priority**       | [Critical / High / Medium / Low]                                  |
| **Status**         | [Draft / Submitted / In Progress / Completed / Failed / Archived] |

---

## Objective

[Clear, concise statement of what this prompt aims to accomplish. One paragraph maximum.]

---

## Context

[Background information required for successful execution. Include references to:

- Previous prompts and their outputs
- Relevant documentation files
- Business or technical constraints
- Stakeholder requirements]

---

## Prompt

[The full instruction text. This should be:

- Specific and unambiguous
- Structured with numbered steps if sequential
- Self-contained (assume minimal prior context)
- Include success criteria]

---

## Deliverables

- [Deliverable 1]: [Description]
- [Deliverable 2]: [Description]
- [Deliverable 3]: [Description]

---

## Constraints & Guardrails

- [Constraint 1]: e.g., 'Do not modify existing working code'
- [Constraint 2]: e.g., 'Must use TypeScript strict mode'
- [Constraint 3]: e.g., 'Follow the naming conventions in docs/02_Development_Rules.md'

---

## Expected Output

[Detailed description of what the output should look like. Include:

- File paths and names expected
- Key content sections
- Quality criteria
- Validation checkpoints]

---

## Actual Output

_To be filled after execution._

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Execution Date** | YYYY-MM-DD                            |
| **Executor**       | [AI Agent / Developer]                |
| **Result**         | [Success / Partial / Failed]          |
| **Notes**          | [Any deviations from expected output] |

### Files Created

| #   | File Path | Description   |
| --- | --------- | ------------- |
| 1   | [path]    | [description] |

### Files Modified

| #   | File Path | Change Summary |
| --- | --------- | -------------- |
| 1   | [path]    | [what changed] |

### Files Deleted

| #   | File Path | Reason   |
| --- | --------- | -------- |
| 1   | [path]    | [reason] |

---

## Review Notes

- [ ] All deliverables completed
- [ ] Code review passed
- [ ] Documentation updated
- [ ] Tests pass (if applicable)
- [ ] Security reviewed
- [ ] Stakeholder approved

---

## Lessons Learned

- [Lesson 1]
- [Lesson 2]

---

## Next Prompt

[PRM-XXX]: [Title of next prompt in sequence]
```

---

## Usage Instructions

1. **Copy** the template above for each new prompt.
2. **Fill** the Metadata section completely before submission.
3. **Complete** the Objective, Context, and Prompt sections with maximum specificity.
4. **Define** clear deliverables and success criteria.
5. **Fill** the Actual Output section after execution.
6. **Update** Prompt_Index.md with the new entry.
7. **Archive** completed prompts to `archive/old_prompts/` after phase completion.

---

_This document is proprietary and confidential. © 2026 SHRANIX Technologies._
