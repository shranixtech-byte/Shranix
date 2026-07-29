# 07 — API Documentation

## Document Control

| Field | Value |
|---|---|
| **Document ID** | SHRANIX-DOC-007 |
| **Version** | 1.0 |
| **Status** | Draft |
| **Author** | SHRANIX Technologies |
| **Last Updated** | YYYY-MM-DD |

---

## API Overview

- **Base URL:** `http://localhost:3001/api/v1`
- **Protocol:** REST over HTTPS (production)
- **Auth:** JWT Bearer tokens
- **Format:** JSON (request and response)
- **Pagination:** Cursor-based (preferred) / Offset-based

---

## Authentication

All API requests (except login/register) require:
```
Authorization: Bearer <jwt_token>
```

### Standard Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100
  },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## API Endpoints Overview (Placeholder)

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/change-password` | Change user password |

### Master Data
| Method | Endpoint | Description |
|---|---|---|
| GET | `/items` | List items (paginated) |
| POST | `/items` | Create item |
| GET | `/items/:id` | Get item by ID |
| PUT | `/items/:id` | Update item |
| DELETE | `/items/:id` | Soft delete item |
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| GET | `/parties` | List parties (customers/vendors) |
| POST | `/parties` | Create party |
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/purchase-orders` | List purchase orders |
| POST | `/purchase-orders` | Create purchase order |
| GET | `/sales-orders` | List sales orders |
| POST | `/sales-orders` | Create sales order |
| GET | `/invoices` | List invoices |
| POST | `/invoices` | Create invoice |
| GET | `/inventory/stock` | Get current stock |
| POST | `/inventory/adjust` | Adjust inventory |

### Finance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/accounts` | List chart of accounts |
| GET | `/ledger/:accountId` | Get account ledger |
| GET | `/reports/profit-loss` | P&L statement |
| GET | `/reports/balance-sheet` | Balance sheet |
| GET | `/reports/trial-balance` | Trial balance |

---

*Detailed endpoint specifications with request/response schemas to be documented during implementation.*

---

## Related Reports

| Report | Link | Relevance |
|---|---|---|
| Execution Report | [View](../reports/Execution_Report.md) | Logs API implementation actions |
| Technical Debt Register | [View](../reports/Technical_Debt.md) | Tracks pending API schema documentation |
| Decision Log | [View](../reports/Decision_Log.md) | Records API design decisions |

---

*This document is proprietary and confidential. © 2026 SHRANIX Technologies.*
