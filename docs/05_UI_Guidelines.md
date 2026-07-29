# 05 — UI Guidelines

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SHRANIX-DOC-005 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | SHRANIX Technologies |
| **Last Updated** | YYYY-MM-DD |

---

## Design Philosophy

> *"Professional, not flashy. Powerful, not complex. Modern, not trendy."*

The SHRANIX Krushi ERP interface is designed for **productivity-first** usage. Every pixel serves a purpose. The UI must feel **premium** but never intimidating — our users are agribusiness professionals, not software engineers.

## Core Principles

1. **Clarity over Creativity** — Users should never wonder where to click next.
2. **Consistency** — One pattern, one behavior, everywhere.
3. **Efficiency** — Minimize clicks for common tasks. Keyboard shortcuts matter.
4. **Accessibility** — WCAG 2.1 AA compliance is mandatory.
5. **Performance** — UI must feel instant; no spinners for local operations.

## Design Tokens

### Color Palette
| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#1B5E20` | Primary actions, active states |
| `--color-primary-light` | `#4CAF50` | Hover, secondary accents |
| `--color-primary-dark` | `#0A3D0F` | Pressed states, headers |
| `--color-surface` | `#FFFFFF` | Card backgrounds, modals |
| `--color-background` | `#F5F7FA` | Page backgrounds |
| `--color-text-primary` | `#1A1A2E` | Primary text |
| `--color-text-secondary` | `#6B7280` | Secondary/label text |
| `--color-border` | `#E5E7EB` | Borders, dividers |
| `--color-error` | `#DC2626` | Errors, destructive actions |
| `--color-warning` | `#F59E0B` | Warnings, alerts |
| `--color-success` | `#16A34A` | Success states |
| `--color-info` | `#2563EB` | Informational |

### Typography
| Token | Value |
|---|---|
| Font Family | `Inter`, system-ui, sans-serif |
| Font (monospace) | `JetBrains Mono`, monospace |
| Base Size | 14px |
| Scale | 1.25 (major third) |
| Heading 1 | 28px / 700 |
| Heading 2 | 22px / 600 |
| Heading 3 | 18px / 600 |
| Body | 14px / 400 |
| Small | 12px / 400 |
| Caption | 11px / 500 |

### Spacing
| Token | Value |
|---|---|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

## Layout Guidelines

- **Application Shell:** Sidebar (240px) + Header (56px) + Content Area
- **Sidebar:** Navigation only. Icons + labels. Active item highlighted.
- **Header:** Breadcrumb, page title, global actions (notifications, profile).
- **Content:** Responsive but optimized for 1280×800 minimum.
- **Modals:** Centered, backdrop blur, max-width 600px.
- **Data Tables:** Sticky header, row hover, pagination at bottom.

## Component States

Every interactive component must define these states:
- **Default** — Resting state
- **Hover** — Slight elevation/color change (transition: 150ms)
- **Active/Pressed** — Darker shade or scale(0.98)
- **Focus** — Visible focus ring (2px offset)
- **Disabled** — 50% opacity, no pointer events
- **Loading** — Skeleton or spinner, never blank
- **Error** — Red border + helper text below

---

## Related Reports

| Report | Link | Relevance |
|---|---|---|
| Progress Dashboard | [View](../reports/Progress_Dashboard.md) | Visual progress tracking follows UI guidelines |
| Decision Log | [View](../reports/Decision_Log.md) | Records UI architecture decisions |

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*
