# Release Notes

Release notes summarize the highlights of each public release. For a complete, itemized list of every change, see the [CHANGELOG.md](./CHANGELOG.md).

---

## Version 1.0.0 — _Production Release_ (2026-07-25)

> The first production release of **SHRANIX Krushi ERP** — an enterprise ERP for the agricultural ecosystem.

### 🚀 What's new

- **Complete Sales module** — Quotations (with revisions & 3-level approval chain), Sales Orders (auto numbering, stock reservation), Delivery Challans (partial/full dispatch, transport & e-way bill), Invoices, Returns & Credit Notes, Customer Price Lists.
- **One-click document conversion** — Quotation → Sales Order → Delivery Challan → Invoice with a full audit trail.
- **Enterprise Purchase module** — Orders, Quotations, GRN, Invoices, Returns, Supplier Prices, Approvals, Debit Notes, Requisitions, auto-posting.
- **Enterprise Inventory module** — Items & variants, batch/lot & serial number tracking, stock ledger, transfers, adjustments, physical counts, multi-warehouse with locations/zones/racks/bins, batch genealogy & traceability.
- **Finance & Accounting** — Chart of Accounts, Ledger Master, Journal Entries, Cash & Bank Books, Cost Centers, GST engine (GSTR1/3B/9), Period Locking, Year-End Closing, Opening Balance Transfer, Audit Trail, Number Series, Voucher Approval Workflow.
- **General Ledger & Reporting** — Trial Balance, Profit & Loss, Balance Sheet, Cash Flow, Day Book, Account Statement, 10+ real GL-based reports.
- **Workflow & Approvals** — Universal workflow engine, state machine, approval matrices, tasks, notifications, escalation engine.
- **Authentication & Security** — JWT + refresh tokens, Argon2 hashing, RBAC (roles/permissions), CSRF guard, rate limiting, helmet, environment validation.
- **AI Assistant** — optional LLM provider integration (OpenAI/Claude/Gemini/Ollama) with prompt-injection protection and data masking.
- **Mobile / PWA** — offline-first service worker, IndexedDB sync engine, barcode scanning, camera capture, GPS field visits, push notifications, biometric login (optional).
- **Dockerized deployment** — multi-stage builds, Docker Compose (dev + production), Nginx with TLS, Prometheus + Grafana monitoring, automated backups.

### 📊 At a glance

- **20+** business modules
- **160+** REST API endpoints (auto-documented in Swagger)
- **80+** database tables (SQLite for dev, PostgreSQL for production)
- **150+** automated tests passing

### ⚠️ Upgrade notes

This is the first production release — there is no prior production version to upgrade from.

---

## Upcoming

### v1.1.0 (planned)

- Payroll processing module
- Multi-currency support
- Enhanced dealer/retailer analytics
- Batch expiry-based reorder suggestions

See the [ROADMAP.md](./ROADMAP.md) for the full roadmap.

---

_Full itemized history: [CHANGELOG.md](./CHANGELOG.md)_
