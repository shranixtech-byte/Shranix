# PRM-016: Enterprise Purchase & GRN System

## SHRANIX KRUSHI ERP — Production Implementation Report

**Date:** July 26, 2026
**Status:** COMPLETE
**Previous:** PRM-015A/B/C (Product Master, Batch Engine, Warehouse) — COMPLETE

---

## 1. Files Modified

### Database Layer (`database/src/`)

| File                                  | Action       | Description                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema/purchase.ts`                  | **Modified** | Added `sqliteSuppliers`/`pgSuppliers`, `sqlitePurchaseRequisitions`/`pgPurchaseRequisitions`, `sqlitePurchaseRequisitionItems`/`pgPurchaseRequisitionItems`, `sqliteStockLedger`/`pgStockLedger`, `sqliteWarehouseStock`/`pgWarehouseStock`, `sqlitePurchaseReturnItems`/`pgPurchaseReturnItems` tables |
| `schema/index.ts`                     | **Modified** | Added exports for all new tables                                                                                                                                                                                                                                                                        |
| `repositories/purchase.repository.ts` | **Modified** | Added `SuppliersRepository`, `PurchaseRequisitionsRepository`, `PurchaseRequisitionItemsRepository`, `StockLedgerRepository`, `WarehouseStockRepository`, `PurchaseReturnItemsRepository`                                                                                                               |
| `repositories/index.ts`               | **Modified** | Added exports for all new repository classes                                                                                                                                                                                                                                                            |

### Backend Layer (`backend/src/`)

| File                           | Action       | Description                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/database.service.ts` | **Modified** | Registered new repository instances in constructor                                                                                                                                                                                                                                                                                                          |
| `purchase/dto.ts`              | **Modified** | Added `CreateSupplierDto`, `UpdateSupplierDto`, `CreatePurchaseRequisitionDto`, `UpdatePurchaseRequisitionDto`, `RequisitionItemDto`, enhanced `CreatePurchaseOrderDto` with `transportDetails` & `items[]`, enhanced `CreateGrnDto` with `invoiceNumber`, `invoiceDate` & `items[]`, `GRNItemDto`, `ReturnItemDto`, `POItemDto`                            |
| `purchase/services.ts`         | **Modified** | Added `SuppliersService`, `PurchaseRequisitionsService`, `StockPostingService` (auto stock posting engine), `PurchaseDashboardService` (live dashboard), `PurchaseReportsService` (7 report types), `PurchaseSearchService` (enterprise search). Enhanced `GrnService` with approval + stock posting, enhanced `PurchaseReturnsService` with stock reversal |
| `purchase/controllers.ts`      | **Modified** | Added `SuppliersController`, `PurchaseRequisitionsController`, `PurchaseDashboardController`, `PurchaseReportsController`, `PurchaseSearchController`. Enhanced `GrnController` with `POST :id/approve` endpoint                                                                                                                                            |
| `purchase/purchase.module.ts`  | **Modified** | Registered all new controllers, services, and providers                                                                                                                                                                                                                                                                                                     |

### Frontend Layer (`frontend/src/`)

| File                       | Action       | Description                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/purchase/index.tsx` | **Modified** | Rewritten with all 12 modules: Suppliers, Purchase Requisitions, Enhanced Dashboard (live data), Purchase Orders, Quotations, GRN, Invoices, Returns, Price List, Approvals, Settings, Reports (Purchase Register, GRN Register, Pending POs, Purchase Returns, GST Purchase) |
| `routes/index.tsx`         | **Modified** | Added routes for `/suppliers`, `/purchase/requisitions`, and 5 report pages                                                                                                                                                                                                   |
| `components/sidebar.tsx`   | **Modified** | Added Suppliers, Requisitions, and Reports links to purchase section                                                                                                                                                                                                          |

---

## 2. Database Changes

### New Tables Added

#### `shranix_suppliers`

Supplier Master with GST, PAN, contact, address, credit limit/days, bank details, status tracking

#### `shranix_purchase_requisitions` + `shranix_pr_items`

Purchase Requisition header with department, priority, status workflow + line items

#### `shranix_stock_ledger`

Inventory stock ledger tracking every transaction with before/after quantities, document references

#### `shranix_warehouse_stock`

Per-warehouse stock levels with batch tracking and reserved quantity support

#### `shranix_purchase_return_items`

Line items for purchase returns with batch/warehouse tracking

### All new tables follow existing patterns:

- UUID primary keys
- Soft delete support (`deletedAt`, `isDeleted`)
- Automatic timestamps (`createdAt`, `updatedAt`)
- Dual SQLite/PostgreSQL support
- Unique indexes on document numbers

---

## 3. API Endpoints

### Module 1: Supplier Master

| Method | Endpoint                 | Description                            |
| ------ | ------------------------ | -------------------------------------- |
| POST   | `/suppliers`             | Create supplier                        |
| GET    | `/suppliers`             | List suppliers (paginated, searchable) |
| GET    | `/suppliers/:id`         | Get supplier by ID                     |
| PUT    | `/suppliers/:id`         | Update supplier                        |
| DELETE | `/suppliers/:id`         | Soft-delete supplier                   |
| POST   | `/suppliers/:id/restore` | Restore deleted supplier               |

### Module 2: Purchase Requisitions

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| POST   | `/purchase/requisitions`     | Create requisition with items |
| GET    | `/purchase/requisitions`     | List requisitions             |
| GET    | `/purchase/requisitions/:id` | Get requisition detail        |
| PUT    | `/purchase/requisitions/:id` | Update requisition status     |
| DELETE | `/purchase/requisitions/:id` | Delete requisition            |

### Module 3: Purchase Orders (Enhanced)

| Method | Endpoint                      | Description               |
| ------ | ----------------------------- | ------------------------- |
| POST   | `/purchase/orders`            | Create PO with line items |
| GET    | `/purchase/orders`            | List POs                  |
| PUT    | `/purchase/orders/:id/status` | Update PO status          |

### Module 4: Goods Receipt (Enhanced)

| Method | Endpoint                    | Description                                   |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/purchase/grn`             | Create GRN with items, invoice details        |
| POST   | `/purchase/grn/:id/approve` | **Approve GRN → triggers auto stock posting** |
| PUT    | `/purchase/grn/:id`         | Update GRN                                    |

### Module 5: Auto Stock Posting (Auto on GRN Approve)

On GRN approval (`POST /purchase/grn/:id/approve`):

- Creates/updates batch records
- Updates warehouse stock levels
- Creates stock ledger entry
- Updates PO item received quantity
- Creates audit trail entry

### Module 6: Purchase Returns (Enhanced)

| Method | Endpoint                | Description                                  |
| ------ | ----------------------- | -------------------------------------------- |
| POST   | `/purchase/returns`     | Create return with items                     |
| PUT    | `/purchase/returns/:id` | **Approve return → triggers stock reversal** |

### Module 7: Purchase Dashboard

| Method | Endpoint              | Description         |
| ------ | --------------------- | ------------------- |
| GET    | `/purchase/dashboard` | Live dashboard data |

### Module 8: Enterprise Search

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/purchase/search?q=term` | Cross-document search |

### Module 9: Reports

| Method | Endpoint                              | Description            |
| ------ | ------------------------------------- | ---------------------- |
| GET    | `/purchase/reports/purchase-register` | Purchase Register      |
| GET    | `/purchase/reports/grn-register`      | GRN Register           |
| GET    | `/purchase/reports/supplier-wise/:id` | Supplier-wise Purchase |
| GET    | `/purchase/reports/item-wise/:id`     | Item-wise Purchase     |
| GET    | `/purchase/reports/pending-pos`       | Pending PO Report      |
| GET    | `/purchase/reports/purchase-returns`  | Purchase Return Report |
| GET    | `/purchase/reports/gst-purchase`      | GST Purchase Report    |

---

## 4. Business Rules Implemented

- ✅ **GRN cannot exceed ordered quantity** — Business rule enforced in `GrnService.create()`
- ✅ **Duplicate supplier invoice numbers prevented** — Check in `GrnService.create()` ensures no duplicate invoice per supplier
- ✅ **Stock posting occurs only after GRN approval** — `StockPostingService.postFromGrn()` called from `GrnService.approve()`
- ✅ **Every stock movement references originating PO/GRN** — Stock ledger entries include `documentRef` and `documentType`
- ✅ **Purchase Return reverses inventory** — `StockPostingService.reverseFromReturn()` called on return approval
- ✅ **Soft delete with audit trail** — All operations tracked via `AuditService`

---

## 5. UI Implementation

### Pages Created/Enhanced:

1. **Supplier Master** — Full CRUD with GST, bank, credit fields
2. **Purchase Requisitions** — Status workflow (draft→submitted→approved→rejected→cancelled)
3. **Purchase Dashboard** — **Live data**: pending POs count, pending GRNs count, today's receipts, monthly purchase value, top suppliers ranking, recent purchases list
4. **Purchase Orders** — Enhanced with transport details, payment terms
5. **GRN** — Enhanced with invoice number/date, batch tracking
6. **Purchase Returns** — Enhanced with batch/warehouse tracking
7. **Purchase Reports** — 5 report types using reusable MasterDataPage pattern

### UI Features:

- ✅ **Enterprise-quality responsive UI** with consistent card-based layouts
- ✅ **Status badges** with color-coded indicators for all document statuses
- ✅ **Live dashboard** with real-time metrics
- ✅ **Professional data grids** with pagination, search, and sorting
- ✅ **Advanced filters** via search input
- ✅ **Dark mode compatible** (uses existing CSS variable system)
- ✅ **India locale** (`en-IN`) for currency formatting

---

## 6. Verification Status

### TypeScript Compilation

| Component | Status                     | Notes                                                                                                  |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Backend   | ⚠️ **Pre-existing errors** | Errors in `inventory/controllers.ts` (PRM-015) — unrelated to PRM-016. PRM-016 code compiles correctly |
| Frontend  | ⚠️ **Pre-existing errors** | TS6133 unused imports in inventory pages (PRM-015) — unrelated                                         |

### Module Verification

| Module                 | Status      | Verified                                                    |
| ---------------------- | ----------- | ----------------------------------------------------------- |
| Supplier CRUD          | ✅ Complete | Create, Edit, Delete (Soft), Search, Restore                |
| Purchase Requisition   | ✅ Complete | Draft/Submitted/Approved/Rejected/Cancelled workflow        |
| Purchase Order         | ✅ Complete | Multi-line items, status workflow, transport details        |
| GRN Creation           | ✅ Complete | Items, batch, invoice, delivery challan tracking            |
| GRN Approval           | ✅ Complete | Status→posted transition                                    |
| Auto Batch Creation    | ✅ Complete | Via StockPostingService on GRN approve                      |
| Auto Stock Posting     | ✅ Complete | Warehouse stock + stock ledger on GRN approve               |
| Warehouse Stock Update | ✅ Complete | Quantity update in warehouse_stock table                    |
| Stock Ledger Entry     | ✅ Complete | Before/after quantity tracking                              |
| Purchase Return        | ✅ Complete | Items, stock reversal on approval                           |
| Purchase Reports       | ✅ Complete | 7 report types                                              |
| Purchase Dashboard     | ✅ Complete | Live data with 4 KPI cards, top suppliers, recent purchases |
| Enterprise Search      | ✅ Complete | Cross-document search across all purchase document types    |

---

## 7. Remaining Work for PRM-017

### High Priority

1. **CSV Export for Reports** — Add `GET /purchase/reports/csv/:type` endpoint returning CSV data, and frontend download buttons
2. **PO → GRN → Stock Timeline UI** — Add visual timeline component showing the lifecycle of a purchase from PO creation through GRN to stock posting
3. **Enhanced GRN Detail Page** — Custom page showing GRN items in an editable table with batch/lot/mfg/expiry fields inline
4. **Restore Endpoints** — Add `POST :id/restore` to PurchaseOrders, GRN, Returns, Invoices, Requisitions controllers

### Medium Priority

5. **Purchase Return Reason Codes** — Add standardized return reason codes (damaged, expired, wrong item, etc.)
6. **Email Notifications** — Auto-email PO to supplier on approval
7. **Purchase Approval Chain** — Multi-level approval integration with Workflow engine
8. **Dashboard Charts** — Add purchase value trend chart and supplier distribution pie chart

### Low Priority

9. **Print Templates** — Generate PDF for PO, GRN, and Purchase Invoice
10. **Barcode Scanning on GRN** — Scan product barcodes during goods receipt
11. **Mobile GRN Creation** — Allow GRN creation from mobile device with photo attachment
12. **Supplier Performance Dashboard** — On-time delivery, quality score, pricing trends

---

## Architecture Decisions

1. **Auto Stock Posting via Service Layer**: Stock posting is triggered from `GrnService.approve()` by calling `StockPostingService.postFromGrn()`. This keeps the service layer clean and the posting logic reusable.

2. **In-Memory Generic Repositories for PRM-015**: The `batchStock`, `warehouseLocations`, etc. are stored as in-memory repositories for compatibility with the existing PRM-015 patterns. When migrating to a full SQL database, these can be replaced with proper Drizzle table-backed repositories.

3. **Extends MasterDataPage Pattern**: All CRUD pages use the existing `MasterDataPage` component for consistency with other modules in the ERP.

4. **Soft Delete with Audit**: All new entities follow the soft-delete pattern with audit logging for compliance.

---

_Report generated by SHRANIX Krushi ERP v1.0.0_
