# API Reference

> **SHRANIX Krushi ERP** — v1.0.0 · Last updated: 2026-08-06

This is the human-readable reference for the REST API. The **authoritative, auto-generated** reference (with request/response schemas for every endpoint) is available via **Swagger** at `/api/docs` when the backend is running.

> **Note:** endpoint tables below are representative, not exhaustive — the running Swagger UI is the complete source of truth for every route, payload and schema.

---

## Table of Contents

- [General Conventions](#general-conventions)
- [Authentication (Auth)](#authentication-auth)
- [Health](#health)
- [Sales](#sales)
- [Purchase](#purchase)
- [Inventory](#inventory)
- [Finance & GL](#finance--gl)
- [GST & Audit](#gst--audit)
- [Masters](#masters)
- [Users, Roles & Permissions](#users-roles--permissions)
- [Workflow](#workflow)
- [Enterprise Suite](#enterprise-suite)
- [Infrastructure](#infrastructure)
- [Status Codes](#status-codes)
- [Error Responses](#error-responses)

---

## General Conventions

### Base URL

```
http://localhost:4001/api/v1
```

- Global prefix: `/api`
- URI versioning: `/v1` (default version)
- In production, requests arrive via the reverse proxy: `https://erp.example.com/api/v1`

### Authentication

All endpoints **except** `POST /auth/login`, `POST /auth/register`, and `GET /health*` require:

```
Authorization: Bearer <access_token>
```

### Response envelope

Every endpoint returns the same shape:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "perPage": 20, "total": 100 },
  "error": null,
  "timestamp": "2026-08-06T12:00:00.000Z",
  "path": "/api/v1/sales/orders",
  "method": "GET"
}
```

### Pagination

List endpoints accept `page` and `pageSize` (or `ps`) query params. Defaults: page 1, 20 per page.

### RBAC

Endpoints are protected with `@Roles(...)` and `@Permissions(...)`. Permission names follow `<module>.<action>` (e.g. `sales.create`, `finance.read`).

---

## Authentication (Auth)

Base: `/auth`

| Method | Route                   | Description                                    | Auth   |
| ------ | ----------------------- | ---------------------------------------------- | ------ |
| POST   | `/auth/register`        | Create a user account                          | Public |
| POST   | `/auth/login`           | Log in, returns access + refresh tokens        | Public |
| POST   | `/auth/refresh`         | Refresh the access token                       | Bearer |
| POST   | `/auth/change-password` | Change password (current password required)    | Bearer |
| POST   | `/auth/logout`          | Log out (revoke refresh token)                 | Bearer |
| POST   | `/auth/logout-all`      | Revoke all refresh tokens for the user         | Bearer |
| POST   | `/auth/csrf`            | Issue a CSRF token for state-changing requests | Bearer |
| GET    | `/auth/me`              | Current user profile                           | Bearer |

### Login

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Request**

```json
{ "email": "admin@shranix.com", "password": "admin123" }
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "admin@shranix.com", "firstName": "Admin", "lastName": "User" },
    "tokens": {
      "accessToken": "<jwt>",
      "refreshToken": "<jwt>"
    }
  }
}
```

**Validation**

- `email` — required, valid email format
- `password` — required, non-empty

**Errors**

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 401  | Invalid credentials                          |
| 403  | Account locked (failed attempts) or inactive |
| 400  | Validation failed                            |

---

## Health

Health endpoints are **excluded from the `/api` prefix** but remain **URI-versioned**, so the base is `/v1/health`. The exception is `/health/metrics`, which is not excluded and therefore lives at `/api/v1/health/metrics`.

| Method | Route                    | Description                           |
| ------ | ------------------------ | ------------------------------------- |
| GET    | `/v1/health`             | Combined health summary               |
| GET    | `/v1/health/live`        | Liveness (process is up)              |
| GET    | `/v1/health/ready`       | Readiness (DB connection checked)     |
| GET    | `/api/v1/health/metrics` | Process metrics (memory, CPU, uptime) |

**Response 200** (`/v1/health`)

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "services": { "database": { "status": "healthy" } },
    "uptime": { "seconds": 42 }
  }
}
```

---

## Sales

Base routes: `/sales/quotations`, `/sales/orders`, `/sales/delivery-challans`, `/sales/invoices`, `/sales/returns`, `/sales/customer-prices`, `/sales/approvals`, `/sales/settings`, `/sales/reports`, `/customers`

### Quotations — `/sales/quotations`

| Method | Route                  | Description                                                                      |
| ------ | ---------------------- | -------------------------------------------------------------------------------- |
| POST   | `/`                    | Create quotation (auto-number `SQ-####` if configured)                           |
| GET    | `/`                    | List quotations (search, pagination)                                             |
| GET    | `/:id`                 | Get quotation with items                                                         |
| PUT    | `/:id`                 | Update quotation / status                                                        |
| DELETE | `/:id`                 | Delete quotation                                                                 |
| POST   | `/:id/revision`        | Create a new revision (Rev-N) linked to the root quote                           |
| PUT    | `/:id/finalize`        | Mark as Final (locked against changes)                                           |
| POST   | `/:id/submit-approval` | Submit for approval (starts the 3-level chain)                                   |
| POST   | `/:id/send`            | Send to customer (`via: manual/email`)                                           |
| POST   | `/:id/convert`         | One-click conversion: Quotation → Order → Challan → Invoice (subset via `steps`) |

**Request (create)**

```json
{
  "customerId": "uuid",
  "quoteDate": "2026-08-06",
  "validTill": "2026-08-21",
  "items": [{ "itemId": "uuid", "quantity": 10, "rate": 250, "gstRate": 18 }],
  "subTotal": 2500,
  "taxAmount": 450,
  "grandTotal": 2950
}
```

`quoteNumber` is optional — when auto-numbering is enabled it is generated server-side.

### Orders — `/sales/orders`

| Method | Route          | Description                                |
| ------ | -------------- | ------------------------------------------ |
| POST   | `/`            | Create order (optionally from a quotation) |
| GET    | `/`            | List orders                                |
| GET    | `/next-number` | Preview next auto order number (`SO-0001`) |
| GET    | `/:id`         | Get order                                  |
| PUT    | `/:id/status`  | Update status                              |
| DELETE | `/:id`         | Delete order                               |
| POST   | `/:id/convert` | Convert order → Delivery Challan           |

### Delivery Challans — `/sales/delivery-challans`

| Method | Route          | Description                               |
| ------ | -------------- | ----------------------------------------- |
| POST   | `/`            | Create challan (partial or full dispatch) |
| GET    | `/`            | List challans                             |
| GET    | `/next-number` | Preview next challan number (`DC-0001`)   |
| GET    | `/:id`         | Get challan                               |
| PUT    | `/:id`         | Update challan (transport, e-way bill)    |
| DELETE | `/:id`         | Delete challan                            |
| POST   | `/:id/convert` | Convert challan → Invoice                 |

**Business rules** (enforced server-side)

- An order with a **full-dispatch** challan cannot get another full challan — create a partial dispatch instead.
- Partial delivery cannot exceed the remaining order quantity (returns 400).

### Invoices — `/sales/invoices`

| Method | Route          | Description                                |
| ------ | -------------- | ------------------------------------------ |
| POST   | `/`            | Create invoice                             |
| GET    | `/`            | List invoices                              |
| GET    | `/next-number` | Preview next invoice number                |
| GET    | `/:id`         | Get invoice                                |
| PUT    | `/:id`         | Update invoice                             |
| DELETE | `/:id`         | Delete invoice                             |
| POST   | `/:id/post`    | Post invoice to Finance (GL + GST entries) |

### Returns — `/sales/returns` (plus `/sales/returns/engine`)

Standard CRUD + the returns engine for stock reversal and credit notes.

### Customers — `/customers`

| Method | Route  | Description                                                       |
| ------ | ------ | ----------------------------------------------------------------- |
| POST   | `/`    | Create customer (ledger)                                          |
| GET    | `/`    | List customers — `?search=&searchField=name\|mobile\|gstin\|code` |
| GET    | `/:id` | Get customer                                                      |
| PUT    | `/:id` | Update customer                                                   |
| DELETE | `/:id` | Delete customer                                                   |

---

## Purchase

Base routes: `/purchase/orders`, `/purchase/quotations`, `/purchase/grn`, `/purchase/invoices`, `/purchase/returns`, `/purchase/supplier-prices`, `/purchase/approvals`, `/purchase/settings`, `/purchase/requisitions`, `/purchase/debit-notes`, `/purchase/dashboard`, `/purchase/reports`, `/purchase/posting`, `/suppliers`

Standard CRUD per resource, plus:

| Method | Route                 | Description                                |
| ------ | --------------------- | ------------------------------------------ |
| POST   | `/purchase/grn`       | Goods Receipt Note                         |
| POST   | `/purchase/posting`   | Auto-post purchase transactions to finance |
| GET    | `/purchase/dashboard` | Purchase KPIs                              |
| GET    | `/purchase/reports`   | Purchase reports                           |
| GET    | `/purchase/search`    | Global purchase search                     |
| CRUD   | `/suppliers`          | Supplier master                            |

---

## Inventory

Base routes: `/inventory/items`, `/inventory/variants`, `/inventory/groups`, `/inventory/pricing`, `/inventory/barcodes`, `/inventory/hsn-codes`, `/inventory/batch-master`, `/inventory/batch-lots`, `/inventory/batches`, `/inventory/serials`, `/inventory/stock-ledger`, `/inventory/stock-movements`, `/inventory/stock-adjustments`, `/inventory/stock-transfers`, `/inventory/transfers`, `/inventory/physical-counts`, `/inventory/reservations`, `/inventory/reversals`, `/inventory/products`, `/inventory/warehouses`, `/inventory/warehouse-locations`, `/inventory/zones`, `/inventory/racks`, `/inventory/shelves`, `/inventory/bins`, `/inventory/warehouse-stock`, `/inventory/uom-conversions`, `/inventory/settings`, plus dashboards and traceability endpoints (`batch-genealogy`, `batch-trace`, `serial-trace`, `serial-history`, `serial-rma`, `serial-service`).

Highlights:

| Method | Route                            | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| CRUD   | `/inventory/items`               | Item master                    |
| CRUD   | `/inventory/batch-lots`          | Batch/lot tracking             |
| CRUD   | `/inventory/serials`             | Serial number tracking         |
| GET    | `/inventory/stock-ledger`        | Stock ledger entries           |
| POST   | `/inventory/stock-adjustments`   | Stock adjustments              |
| GET    | `/inventory/batch-genealogy`     | Batch genealogy / traceability |
| GET    | `/inventory/warehouse-dashboard` | Warehouse KPIs                 |

---

## Finance & GL

Base routes: `/finance/account-groups`, `/finance/chart-of-accounts`, `/finance/ledgers`, `/finance/journal-entries`, `/finance/cash-book`, `/finance/bank-book`, `/finance/cost-centers`, `/finance/settings`, `/gl/entries`, `/gl/posting-rules`, `/gl/fiscal-closing`, `/gl/reports`, `/gl/snapshots`

Standard CRUD per resource, plus:

| Method | Route                           | Description                            |
| ------ | ------------------------------- | -------------------------------------- |
| GET    | `/gl/reports/trial-balance`     | Trial Balance                          |
| GET    | `/gl/reports/profit-loss`       | Profit & Loss                          |
| GET    | `/gl/reports/balance-sheet`     | Balance Sheet                          |
| GET    | `/gl/reports/cash-flow`         | Cash Flow Statement                    |
| GET    | `/gl/reports/day-book`          | Day Book                               |
| GET    | `/gl/reports/account-statement` | Account Statement                      |
| POST   | `/gl/entries`                   | Post GL entry (double-entry validated) |
| POST   | `/finance/journal-entries`      | Create journal voucher                 |

---

## GST & Audit

Base routes: `/gst/registrations`, `/gst/ledger`, `/gst/returns`, `/gst/tax-postings`, `/gst/year-closing`, `/gst/period-locks`, `/gst/opening-balance-transfers`, `/gst/year-end-entries`, `/gst/audit-details`, `/gst/number-series`, `/gst/voucher-approvals`, `/gst/settings`, `/gst/reports`, `/gst/engine`, plus `/audit-trail`.

| Method | Route                     | Description                                                         |
| ------ | ------------------------- | ------------------------------------------------------------------- |
| CRUD   | `/gst/registrations`      | GST registrations (GSTIN, registration type, e-way/e-invoice flags) |
| CRUD   | `/gst/returns`            | GSTR1 / GSTR3B / GSTR9 preparation                                  |
| CRUD   | `/gst/period-locks`       | Period locking (daily/monthly/quarterly/yearly)                     |
| CRUD   | `/gst/year-closing`       | Financial year closing records                                      |
| CRUD   | `/gst/number-series`      | Centralized auto-numbering                                          |
| GET    | `/gst/reports/gstr1` etc. | GST reports                                                         |
| GET    | `/audit-trail`            | Audit log viewer (IP, user-agent, diff, action)                     |

---

## Masters

Base routes: `/companies`, `/branches`, `/warehouses`, `/units`, `/categories`, `/brands`, `/tax-groups`, `/gst-rates`, `/financial-years`

Standard CRUD per resource (admin/manager roles). Example:

| Method | Route             | Description            |
| ------ | ----------------- | ---------------------- |
| POST   | `/companies`      | Create company         |
| GET    | `/warehouses`     | List warehouses        |
| PUT    | `/gst-rates/:id`  | Update GST rate        |
| DELETE | `/categories/:id` | Delete category (soft) |

---

## Users, Roles & Permissions

| Method | Route          | Description           |
| ------ | -------------- | --------------------- |
| POST   | `/users`       | Create user           |
| GET    | `/users`       | List users            |
| GET    | `/users/:id`   | Get user              |
| PUT    | `/users/:id`   | Update user           |
| DELETE | `/users/:id`   | Delete user (soft)    |
| CRUD   | `/roles`       | Role management       |
| CRUD   | `/permissions` | Permission management |

---

## Workflow

Base routes: `/workflow/templates`, `/workflow/instances`, `/workflow/tasks`, `/workflow/approval-matrix`, `/workflow/comments`, `/workflow/notifications`, `/workflow/dashboard`, plus `/sales/approvals/workflow`.

| Method | Route                         | Description                                       |
| ------ | ----------------------------- | ------------------------------------------------- |
| CRUD   | `/workflow/templates`         | Workflow templates (states, transitions, actions) |
| CRUD   | `/workflow/approval-matrix`   | Approval matrices (levels, roles, can-override)   |
| GET    | `/workflow/instances`         | Workflow instances & timeline                     |
| GET    | `/workflow/tasks`             | Pending/completed tasks                           |
| POST   | `/workflow/tasks/:id/approve` | Approve a task                                    |
| POST   | `/workflow/tasks/:id/reject`  | Reject (reason required)                          |
| POST   | `/workflow/tasks/:id/return`  | Return for changes                                |
| GET    | `/workflow/dashboard`         | Workflow KPIs                                     |

---

## Enterprise Suite

| Module          | Base routes                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------- |
| Multi-company   | `/companies`, `/branches`, `/business-units`, `/departments`                                  |
| CRM             | `/crm/leads`, `/crm/opportunities`                                                            |
| HR              | `/hr/employees`, `/hr/designations`, `/hr/leave-requests`                                     |
| Fixed assets    | `/fixed-assets`, `/asset-categories`                                                          |
| Budgets         | `/finance/budgets`                                                                            |
| Governance      | `/governance/legal-holds`, `/governance/retention-policies`                                   |
| Integrations    | `/integrations`, `/integrations/webhooks`, `/integrations/api-keys`, `/integrations/settings` |
| AI              | `/ai/*` (copilot, insights, predictions, usage)                                               |
| DMS             | `/dms` (documents upload/download)                                                            |
| PDF             | `/pdf` (document generation)                                                                  |
| Backup          | `/backup` (admin backup triggers)                                                             |
| Notifications   | `/notifications/settings`                                                                     |
| Dashboard       | `/dashboard` (global KPIs)                                                                    |
| Data management | `/data-management` (import/export)                                                            |

---

## Status Codes

| Code | Meaning                                            |
| ---- | -------------------------------------------------- |
| 200  | OK                                                 |
| 201  | Created                                            |
| 204  | No content (delete)                                |
| 400  | Bad request / validation / business rule violation |
| 401  | Unauthorized — missing/invalid token               |
| 403  | Forbidden — role/permission denied                 |
| 404  | Not found                                          |
| 409  | Conflict                                           |
| 422  | Unprocessable entity                               |
| 429  | Rate limited (100 req / 60 s default)              |
| 500  | Internal server error                              |

---

## Error Responses

Validation / business errors use the standard envelope:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Partial delivery exceeds order quantity for Item X — remaining 4, requested 110",
    "details": []
  },
  "timestamp": "2026-08-06T12:00:00.000Z",
  "path": "/api/v1/sales/delivery-challans",
  "method": "POST"
}
```

**Security note:** internal error details are never leaked to clients — the global exception filter sanitizes responses.

---

_Generated from the backend controllers (164 controller classes). For full request/response schemas, open Swagger at `/api/docs`._
