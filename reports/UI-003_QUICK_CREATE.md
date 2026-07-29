# UI-003: Quick Create System Report

## Objective
Implement a [+] Quick Create button system on every dropdown that references a master record. Clicking [+] opens a QuickCreateModal popup, which saves the new record, auto-closes, refreshes the dropdown, and auto-selects the new record — all without page reload.

## Status: ✅ Initial Implementation

## Architecture

### QuickCreateModal Component
**File:** `frontend/src/components/ui/QuickCreateModal.tsx`

```
QuickCreateModal
├── Overlay (backdrop-blur, bg-black/50)
├── Header (title + close button)
└── Content area (children)
```

### Sizes & Usage
| Size | Max Width | Target Records |
|---|---|---|
| `sm` | 400px (max-w-md) | Category, Brand, Unit, Tax |
| `md` | 576px (max-w-xl) | Customer, Supplier, Warehouse, Employee |
| `lg` | 768px (max-w-3xl) | Company, Product, Branch |
| `fullscreen` | 95vw x 95vh | Purchase Order, Sales Invoice, GRN, Stock Transfer |

### Quick Create Flow
```
User clicks [+] button
       ↓
QuickCreateModal opens with appropriate size
       ↓
User fills in the quick create form (typically minimal fields)
       ↓
User clicks Save
       ↓
API call creates record in background
       ↓
Modal closes automatically
       ↓
Dropdown refreshes its options list
       ↓
Newly created record is auto-selected in dropdown
       ↓
NO page reload — seamless UX
```

### [+] Button Integration
The `FormSelect` component supports a `quickCreate` prop and `onQuickCreate` callback:

```tsx
<FormSelect
  label="Category"
  options={categories}
  quickCreate
  onQuickCreate={() => openQuickCreateModal('category')}
/>
```

This renders the [+] button:
- Dashed border
- `w-[42px] h-[42px]` (matches input height)
- `hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600`
- Changes to solid green on hover

### Master Records Requiring Quick Create
| Master Record | UI Element | Modal Size |
|---|---|---|
| Customer | Dropdown | Medium (md) |
| Supplier | Dropdown | Medium (md) |
| Category | Dropdown | Small (sm) |
| Brand | Dropdown | Small (sm) |
| Warehouse | Dropdown | Medium (md) |
| Unit | Dropdown | Small (sm) |
| Tax | Dropdown | Small (sm) |
| Payment Terms | Dropdown | Small (sm) |
| Transporter | Dropdown | Small (sm) |
| Employee | Dropdown | Medium (md) |
| Vehicle | Dropdown | Small (sm) |
| Company | Dropdown | Large (lg) |
| Product | Dropdown | Large (lg) |
| Branch | Dropdown | Large (lg) |

### Implementation Details

**File Structure:**
- `frontend/src/components/ui/QuickCreateModal.tsx` — Modal component
- `frontend/src/components/ui/FormSelect.tsx` — [+] button support on dropdowns

**Key Features:**
- ✅ `Escape` key closes modal
- ✅ Click outside overlay closes modal
- ✅ Body scroll lock while modal is open
- ✅ Backdrop blur effect
- ✅ Animated entrance (`animate-in fade-in`)
- ✅ Keyboard accessible
- ✅ Dark mode supported
- ✅ Size variants (sm, md, lg, fullscreen)

### Integration Points
For full Quick Create integration, each form page needs to:
1. Import `QuickCreateModal` and the relevant create form
2. Track a `quickCreateType` state
3. Render `QuickCreateModal` with the appropriate form
4. Pass `onSuccess` callback that refreshes the master data list and auto-selects new record

### Example Usage
```tsx
const [quickCreate, setQuickCreate] = useState<{ type: string; open: boolean }>({ type: '', open: false });

<FormSelect
  label="Category"
  quickCreate
  onQuickCreate={() => setQuickCreate({ type: 'category', open: true })}
/>

<QuickCreateModal
  open={quickCreate.open}
  onClose={() => setQuickCreate({ ...quickCreate, open: false })}
  onSuccess={() => { refreshCategories(); selectNewCategory(); }}
  title="Quick Create Category"
  size="sm"
>
  <CategoryQuickForm onSuccess={() => setQuickCreate({ ...quickCreate, open: false })} />
</QuickCreateModal>
```

### Benefits
- ✅ **Speed** — Create master records without leaving current page
- ✅ **Context preservation** — Never lose your place in a complex form
- ✅ **Seamless UX** — No page reloads, instant dropdown refresh
- ✅ **Enterprise standard** — Matches SAP, Odoo, ERPNext Quick Create behavior
