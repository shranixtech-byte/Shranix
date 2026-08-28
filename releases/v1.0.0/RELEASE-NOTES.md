# SHRANIX Krushi ERP — v1.0.0 Release Notes

**Release Date:** August 28, 2026
**Version:** 1.0.0
**Platform:** Windows x64

---

## What's New

### Desktop Application

- First production Windows desktop application built with Tauri v2
- Native Windows installer (NSIS) with Start Menu integration
- System tray support with minimize-to-tray
- Application menu (File, Edit, View, Help)
- Splash screen on launch

### ERP Modules (Verified & Frozen)

- **Dashboard** — Real-time KPIs, charts, alerts, recent transactions
- **Sales** — Quotation → Sales Order → Delivery Challan → Invoice → Payment → Returns/Credit Notes
- **Purchase** — Purchase Order → GRN → Purchase Invoice → Payment → Returns/Debit Notes
- **Inventory** — Stock management, warehouse tracking, batch/expiry, adjustments, transfers
- **Finance** — Chart of Accounts, Journal Entries, Cash/Bank Book, Trial Balance, P&L, Balance Sheet
- **GST** — Tax calculations, CGST/SGST/IGST, GST returns, audit
- **HR** — Employees, Payroll, Attendance, Leave, Expenses
- **Assets** — Asset management, Depreciation, Disposal
- **DMS** — Document management, OCR, Signatures

### Cross-Module Integration

- Purchase → Stock IN verified
- Sales → Stock OUT verified
- Sales Return → Stock reversal verified
- Purchase Return → Stock reversal verified
- Financial integrity (GL balanced, Debit = Credit) verified
- Stock reconciliation verified

---

## System Requirements

- **OS:** Windows 10 (64-bit) or later
- **RAM:** 4 GB minimum, 8 GB recommended
- **Disk:** 100 MB for application
- **Network:** Internet connection required (connects to ERP backend)
- **Backend:** SHRANIX Krushi ERP backend must be running and accessible

---

## Installation

See [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md) for detailed instructions.

---

## Known Limitations (V1)

- Desktop requires backend connectivity — no offline mode
- Auto-update not yet enabled (pending signing key)
- OCR uses basic implementation
- AI features are placeholder
- Payment gateway integration deferred
- Multi-tenant architecture deferred

---

## SHA-256 Checksums

```
ce64aefaacd07a4a14a22553b3ac0af8abe3a69bbf7514efd77fb891654efa17  shranix-krushi-erp.exe
f5c4f4b02f3fd5320dfc975905b52166ab6f00ecac6d11fb27038f125c3a0151  SHRANIX Krushi ERP_1.0.0_x64-setup.exe
```

---

## Support

- **Email:** support@shranix.com
- **Website:** https://shranix.com
- **Documentation:** https://docs.shranix.com

---

_Built with Tauri v2 + React + NestJS + SQLite_
