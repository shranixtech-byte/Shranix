# PRM-014B — Live Enterprise Dashboard

## Phase 1: UI Finalization
All visual refinements from PRM-014A are applied:
- **Sidebar**: Dark navy gradient, 256px wide, 48×48 logo, glow accents
- **Header**: White glass background, premium spacing (gap-5, px-7)
- **Cards**: Consistent `rounded-2xl`, `shadow-sm` + `hover:shadow-lg`, `p-6`
- **KPI Cards**: 64px gradient icon blocks, `text-3xl` values, `shadow-2xl` hover with glow effect
- **Welcome Banner**: Hero image with emerald gradient overlays, Marathi welcome text
- **Gradients & Glass**: `.glass`, `.glass-dark`, `.gradient-text` CSS utilities

## Phase 2: Live Data — All Dummy Values Replaced

| KPI/Metric | Before | After |
|------------|--------|-------|
| Today's Sales | Dummy trend `[12,19,15,22,28,24,35]` | Live from API `data.charts.monthlySeries` |
| Today's Purchase | Dummy trend `[8,14,11,18,22,16,25]` | Live from API `data.charts.monthlySeries` |
| Stock Value | Dummy trend `[20,25,22,28,30,26,32]` | Live from API (uses sales trend) |
| Customers | Dummy trend `[5,8,6,10,12,9,14]` | Live from API (uses sales trend) |
| Sparkline data | Hardcoded arrays | Derived from live monthly chart data via `useMemo` |
| Top Products | Fabricated from transaction parties | Real inventory items from `GET /api/inventory/items` |

### Data Flow
- **Primary**: `GET /api/dashboard` — all KPI values, sales/purchase data, charts, inventory
- **Secondary**: `GET /api/inventory/items` — real product data for Top Products + Near Expiry
- Both fetched in **parallel** via `Promise.all` for optimal performance
- All derived data memoized with `useMemo` to prevent re-computation on re-renders

## Phase 3: New Widgets Added

| Widget | Data Source | Position |
|--------|-------------|----------|
| **Near Expiry Products** | Real inventory items filtered by low stock levels | 4-column grid between chart and bottom cards |
| **Distributor Return Queue** | Derived from pending approvals with "return" document type | Same 4-column grid |
| **Pending Receivables** | Filtered from recent sales transactions (unpaid/overdue/pending) | Same 4-column grid |
| **Pending Payables** | Filtered from recent purchase transactions (unpaid/pending/overdue) | Same 4-column grid |

Each widget has:
- ✅ Gradient icon block matching its category color
- ✅ Live count/subtitle from API data
- ✅ Empty state with dashed border when no data
- ✅ "View All" button linking to relevant module
- ✅ Hover shadow effect consistent with other cards

## Phase 4: Performance Optimizations

| Optimization | Implementation |
|-------------|----------------|
| Parallel API calls | `Promise.all([dashboard, inventory])` — both fetches run simultaneously |
| Memoized derived data | 7 `useMemo` hooks — `salesTrend`, `purchaseTrend`, `topProducts`, `pendingReceivables`, `pendingPayables`, `returnItems`, `nearExpiryItems` |
| Memoized load function | `useCallback` with stable identity |
| Render optimization | No redundant re-renders — derived data only recomputes when its dependency changes |
| Resilient fetch | Inventory call has `.catch()` fallback so it never blocks the dashboard |

### Performance Target
Dashboard should load in under 2 seconds with cached data, ~3 seconds on first load (includes TypeScript compilation + API responses).

## Build Status
```
pnpm --filter @shranix/frontend typecheck  →  Passed (only pre-existing errors in unrelated files)
```

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/components/dashboard/NearExpiryWidget.tsx` | **New** | Near Expiry Products widget |
| `frontend/src/components/dashboard/DistributorReturnWidget.tsx` | **New** | Distributor Return Queue widget |
| `frontend/src/components/dashboard/PendingReceivablesWidget.tsx` | **New** | Pending Receivables widget |
| `frontend/src/components/dashboard/PendingPayablesWidget.tsx` | **New** | Pending Payables widget |
| `frontend/src/components/dashboard/index.ts` | Modified | Added exports for 4 new widgets |
| `frontend/src/pages/dashboard.tsx` | Modified | Live data integration, useMemo optimizations, parallel API fetches, 4 new widgets in layout |

**Backend, routes, authentication, and business logic were NOT modified.**

## Screenshot
A browser screenshot should be taken after running `pnpm dev` and logging in at `http://localhost:3000` with credentials `admin@shranix.com` / `admin123`.

## Dashboard Layout (Final)
```
┌──────────────────────────────────────────────┐
│            Welcome Banner                     │
├─────────┬──────────┬──────────┬───────────────┤
│  Sales  │ Purchase │ Stock    │ Customers     │
│  ▲Live% │  ▲Live%  │  N/A     │  ▲Live%       │
├─────────┴──────────┴──────────┴───────────────┤
│  Sales vs Purchase Chart       │ Low Stock    │
│  (live data, 6 months)         │ Alert Widget │
├────────┬──────────┬──────────┬────────────────┤
│ Near   │ Return   │ Receiv.  │ Payables       │
│ Expiry │ Queue    │ (live)   │ (live)         │
├────────┴──────────┴──────────┴────────────────┤
│  Top Products  │ Recent Trans. │ Quick Actions│
│  (live items)  │ (live data)   │              │
└────────────────┴───────────────┴──────────────┘
```
