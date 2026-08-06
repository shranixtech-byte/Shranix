# 04 — Database Design

## Document Control

| Field            | Value                |
| ---------------- | -------------------- |
| **Document ID**  | SHRANIX-DOC-004      |
| **Version**      | 1.0                  |
| **Status**       | Draft                |
| **Author**       | SHRANIX Technologies |
| **Last Updated** | YYYY-MM-DD           |

---

## Database Overview

- **Engine:** PostgreSQL 16+
- **ORM:** TBD (Prisma / Drizzle)
- **Naming Convention:** `snake_case` for tables and columns
- **Primary Keys:** UUID v4 (auto-generated)
- **Timestamps:** `created_at`, `updated_at`, `deleted_at` (soft delete)
- **Encoding:** UTF-8
- **Timezone:** UTC (all timestamps stored in UTC)

---

## Entity Relationship Summary

```
companies
   └── branches
         ├── users
         ├── items (products)
         │    ├── item_categories
         │    └── inventory_batches
         ├── warehouses
         │    └── inventory_stock
         ├── parties (customers/vendors)
         ├── purchase_orders
         │    ├── purchase_order_items
         │    └── purchase_receipts
         ├── sales_orders
         │    ├── sales_order_items
         │    └── invoices
         ├── accounts
         │    ├── transactions
         │    └── ledgers
         └── taxes
              └── tax_rates
```

---

## Core Tables (Placeholder Schema)

### `companies`

| Column       | Type               | Description                       |
| ------------ | ------------------ | --------------------------------- |
| `id`         | UUID PK            | Primary key                       |
| `name`       | VARCHAR(255)       | Company legal name                |
| `code`       | VARCHAR(50) UNIQUE | Short code                        |
| `gstin`      | VARCHAR(15)        | GST identification number (India) |
| `pan`        | VARCHAR(10)        | PAN number                        |
| `address`    | TEXT               | Registered address                |
| `phone`      | VARCHAR(20)        | Contact number                    |
| `email`      | VARCHAR(255)       | Contact email                     |
| `logo_url`   | TEXT               | Company logo path                 |
| `is_active`  | BOOLEAN            | Active status                     |
| `created_at` | TIMESTAMPTZ        | Creation timestamp                |
| `updated_at` | TIMESTAMPTZ        | Last update timestamp             |
| `deleted_at` | TIMESTAMPTZ        | Soft delete timestamp             |

### `branches`

| Column           | Type                | Description           |
| ---------------- | ------------------- | --------------------- |
| `id`             | UUID PK             | Primary key           |
| `company_id`     | UUID FK → companies | Parent company        |
| `name`           | VARCHAR(255)        | Branch name           |
| `code`           | VARCHAR(50)         | Branch code           |
| `address`        | TEXT                | Branch address        |
| `phone`          | VARCHAR(20)         | Branch phone          |
| `is_head_office` | BOOLEAN             | Is head office        |
| `created_at`     | TIMESTAMPTZ         | Creation timestamp    |
| `updated_at`     | TIMESTAMPTZ         | Last update timestamp |
| `deleted_at`     | TIMESTAMPTZ         | Soft delete timestamp |

### `users`

| Column          | Type                | Description           |
| --------------- | ------------------- | --------------------- |
| `id`            | UUID PK             | Primary key           |
| `branch_id`     | UUID FK → branches  | Associated branch     |
| `username`      | VARCHAR(100) UNIQUE | Login username        |
| `password_hash` | VARCHAR(255)        | Bcrypt hash           |
| `full_name`     | VARCHAR(255)        | Display name          |
| `email`         | VARCHAR(255)        | Email address         |
| `phone`         | VARCHAR(20)         | Phone number          |
| `role_id`       | UUID FK → roles     | User role             |
| `is_active`     | BOOLEAN             | Active status         |
| `last_login_at` | TIMESTAMPTZ         | Last login time       |
| `created_at`    | TIMESTAMPTZ         | Creation timestamp    |
| `updated_at`    | TIMESTAMPTZ         | Last update timestamp |
| `deleted_at`    | TIMESTAMPTZ         | Soft delete timestamp |

### `items`

| Column          | Type                      | Description            |
| --------------- | ------------------------- | ---------------------- |
| `id`            | UUID PK                   | Primary key            |
| `branch_id`     | UUID FK → branches        | Owning branch          |
| `category_id`   | UUID FK → item_categories | Item category          |
| `name`          | VARCHAR(255)              | Item name              |
| `sku`           | VARCHAR(100) UNIQUE       | Stock keeping unit     |
| `barcode`       | VARCHAR(100)              | Barcode                |
| `unit_id`       | UUID FK → units           | Unit of measure        |
| `rate`          | DECIMAL(12,2)             | Default selling price  |
| `purchase_rate` | DECIMAL(12,2)             | Default purchase price |
| `mrp`           | DECIMAL(12,2)             | Maximum retail price   |
| `gst_hsn_code`  | VARCHAR(10)               | HSN code for GST       |
| `tax_id`        | UUID FK → taxes           | Applicable tax         |
| `min_stock_qty` | DECIMAL(12,3)             | Reorder level          |
| `is_active`     | BOOLEAN                   | Active status          |
| `created_at`    | TIMESTAMPTZ               | Creation timestamp     |
| `updated_at`    | TIMESTAMPTZ               | Last update timestamp  |
| `deleted_at`    | TIMESTAMPTZ               | Soft delete timestamp  |

---

_Full schema with indexes, constraints, and relationships to be defined during implementation phase._

---

## Related Reports

| Report                  | Link                                           | Relevance                                   |
| ----------------------- | ---------------------------------------------- | ------------------------------------------- |
| Technical Debt Register | [View](../archive/reports/Technical_Debt.md)   | Tracks pending schema migration tasks       |
| Decision Log            | [View](../archive/reports/Decision_Log.md)     | Records database design decisions (DEC-002) |
| Execution Report        | [View](../archive/reports/Execution_Report.md) | Logs database migration execution           |

---

_This document is proprietary and confidential. © 2026 SHRANIX Technologies._
