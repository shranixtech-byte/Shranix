# UI-002: Enterprise Design System Report

## Objective
Create ONE consistent enterprise design system that establishes a professional, modern, and uniform UI language across the entire ERP, inspired by SAP, ERPNext, Odoo, and Zoho Books.

## Status: ✅ Complete

## Design System Architecture

```
frontend/src/components/ui/
├── Button.tsx          # Primary (green), Secondary (white), Danger (red), Ghost, Outline
├── FormInput.tsx       # 42px height, label, error/hint states, dark mode
├── FormSelect.tsx      # 42px height, custom chevron, quick-create [+] button support
├── FormTextarea.tsx    # 3 rows default, label, error/hint states
├── FormCard.tsx        # Title + divider + content, 24px padding, rounded-2xl
├── FormPageLayout.tsx  # Full page shell: breadcrumb + title + actions + 2-col grid
├── Breadcrumb.tsx      # Home icon + chevron-separated breadcrumb trail
├── QuickCreateModal.tsx # Modal with sm/md/lg/fullscreen sizes
├── CreateEditPage.tsx  # Standardized create/edit form page with sections
```

## Global Design Rules

### 🎨 Colors
| Token | Value | Usage |
|---|---|---|
| Primary | `#059669` (emerald-600) | Primary buttons, active states |
| Primary Hover | `#047857` (emerald-700) | Button hover |
| Secondary | White/border | Secondary buttons |
| Danger | `#dc2626` (red-600) | Delete/destructive actions |
| Background | `#ffffff` / `#1e293b` (dark) | Card backgrounds |
| Text | `#0f172a` / `#f1f5f9` (dark) | Body text |

### 📐 Typography
| Level | Size | Weight |
|---|---|---|
| Page Title | 24px (text-2xl) | Bold (700) |
| Card Title | 16px (text-base) | Semibold (600) |
| Input Label | 14px (text-sm) | Medium (500) |
| Body Text | 14px (text-sm) | Normal (400) |
| Error Text | 12px (text-xs) | Normal (400) |

### 📏 Spacing
| Token | Value |
|---|---|
| Page Top Margin | 24px (space-y-6) |
| Card Padding | 24px (p-6) |
| Field Gap | 16px (gap-4) |
| Section Gap | 24px (gap-6) |
| Input Height | 42px |
| Border Radius | 12px (rounded-xl) / 16px (rounded-2xl) |
| Card Shadow | `shadow-sm` + `dark:border-slate-700` |

### 🧱 Layout Rules
| Device | Layout |
|---|---|
| Desktop (≥1024px) | **2-column grid** for form cards |
| Tablet (640-1024px) | **2-column grid** auto-flow |
| Mobile (<640px) | **1-column** single card per row |

### 🎯 Button Specifications
| Variant | Style |
|---|---|
| **Primary** | Green (`bg-emerald-600`), white text, shadow |
| **Secondary** | White bg, border, slate text |
| **Danger** | Red (`bg-red-600`), white text |
| **Ghost** | Transparent bg |
| **Outline** | Transparent bg, border |

### 📝 Form Specifications
| Element | Style |
|---|---|
| Input Height | 42px (h-[42px]) |
| Input Border | `border-slate-200`, `dark:border-slate-600` |
| Input Focus | `ring-2 ring-emerald-500/20` |
| Label Position | Above input, `text-sm font-medium` |
| Placeholder | `text-slate-400` |
| Validation | `text-xs text-red-500` below input |

### 🃏 Card Design
| Property | Value |
|---|---|
| Background | White / Slate-800 (dark) |
| Border Radius | 16px (rounded-2xl) |
| Border | `border-slate-200` / `border-slate-700` (dark) |
| Shadow | `shadow-sm` |
| Padding | 24px (p-6) |
| Title Divider | `border-t border-slate-100` with 4px margin |

## Quick Create (QuickCreateModal)
| Size | Width | Use Case |
|---|---|---|
| Small (sm) | `max-w-md` | Category, Brand, Unit, Tax |
| Medium (md) | `max-w-xl` | Customer, Supplier, Warehouse, Employee |
| Large (lg) | `max-w-3xl` | Company, Product, Branch |
| Fullscreen | `max-w-[95vw] max-h-[95vh]` | Purchase Order, Sales Invoice, GRN, Stock Transfer |

## Components Created
| Component | File | Lines |
|---|---|---|
| Button | `Button.tsx` | ~60 |
| FormInput | `FormInput.tsx` | ~55 |
| FormSelect | `FormSelect.tsx` | ~85 |
| FormTextarea | `FormTextarea.tsx` | ~55 |
| FormCard | `FormCard.tsx` | ~40 |
| FormPageLayout | `FormPageLayout.tsx` | ~75 |
| Breadcrumb | `Breadcrumb.tsx` | ~45 |
| QuickCreateModal | `QuickCreateModal.tsx` | ~85 |
| CreateEditPage | `CreateEditPage.tsx` | ~160 |
| cn utility | `utils.ts` | ~8 |

## Design System Benefits
✅ **Consistency** — Every page/component follows exact same design language
✅ **Speed** — New pages can be built in minutes using existing components
✅ **Maintainability** — Changes cascade through shared components
✅ **Professional appearance** — Matches SAP/ERPNext/Odoo enterprise quality
✅ **Dark mode** — All components support dark mode natively
