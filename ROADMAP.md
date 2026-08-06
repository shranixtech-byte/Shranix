# Roadmap

> **Status:** v1.0.0 released · v1.1.0 in planning
> **Last updated:** 2026-08-06

This roadmap reflects the public product direction of **SHRANIX Krushi ERP**. Items are indicative, not commitments — priorities shift based on customer feedback and business needs.

---

## ✅ Released — Version 1.0.0 (2026-07-25)

The **Production Release** includes:

| Area              | Delivered                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sales**         | Quotations (revisions, 3-level approval), Sales Orders, Delivery Challans (partial/full dispatch, e-way bill, transport), Invoices, Returns/Credit Notes, Customer Price Lists, one-click Quotation→Order→Challan→Invoice conversion |
| **Purchase**      | Orders, Quotations, GRN, Invoices, Returns, Supplier Prices, Approvals, Debit Notes, Requisitions, auto-posting                                                                                                                      |
| **Inventory**     | Item master, variants, batch/lot & serial tracking, stock ledger, transfers, adjustments, physical counts, multi-warehouse (zones/racks/bins), batch genealogy                                                                       |
| **Finance & GST** | Chart of Accounts, Ledgers, Journal, Cash/Bank Books, Cost Centers, GST engine (GSTR1/3B/9), Period Locking, Year-End Closing, Opening Balances, Audit Trail, Number Series                                                          |
| **GL & Reports**  | Trial Balance, P&L, Balance Sheet, Cash Flow, Day Book, Account Statement, 10+ GL reports                                                                                                                                            |
| **Workflow**      | Universal workflow engine, approval matrices, tasks, notifications, escalation                                                                                                                                                       |
| **Platform**      | JWT auth + RBAC, Docker, Nginx/TLS, Prometheus + Grafana, automated backups, PWA offline mode, AI assistant                                                                                                                          |

---

## 🔭 In Progress

- **Sales module hardening** — Delivery Challan phase-2 (transport & e-way bill) front-end wiring and QA.
- **Production repository cleanup** — open-source-ready documentation and CI polish.

---

## 🗺️ Planned

### v1.1.0 — Operational Excellence

- Payroll processing (salary structures, deductions, payslips, statutory reports)
- Multi-currency support with daily exchange rates
- Batch expiry–based reorder suggestions and stock rotation alerts
- Dealer/retailer analytics dashboards
- Data import/export wizards (Excel/CSV) for masters and transactions

### v1.2.0 — Field Intelligence

- Offline-first mobile app hardening (faster sync engine, conflict resolution UI)
- GPS route planning for field sales teams
- E-invoice (IRN) generation for GST compliance
- E-way bill API integration

### v1.3.0 — Enterprise Scale

- Multi-company consolidation reporting
- Advanced permissioning (field-level access control)
- Horizontal scaling of background job processing
- Multi-tenant SaaS packaging (optional)

---

## Release Cadence

| Type       | Frequency | Description                 |
| ---------- | --------- | --------------------------- |
| **Alpha**  | Bi-weekly | Internal builds for testing |
| **Beta**   | Monthly   | Customer preview builds     |
| **Stable** | Quarterly | Production releases         |
| **Patch**  | As needed | Critical bug fixes          |

## Versioning

Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking API or database changes
- **MINOR** — new features, backward-compatible
- **PATCH** — bug fixes and minor improvements

Pre-release suffixes: `-alpha.1`, `-beta.2`, `-rc.3`.

---

_See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for what shipped, and [TODO.md](./TODO.md) for the working backlog._
