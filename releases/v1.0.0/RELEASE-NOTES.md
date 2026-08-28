# SHRANIX Krushi ERP — V1.0.0 Release Notes

**Release Date:** August 28, 2026
**Version:** 1.0.0
**Status:** 🟡 RELEASE CANDIDATE — CONDITIONALLY READY

---

## What Is SHRANIX Krushi ERP

SHRANIX Krushi ERP is an **offline-first Windows desktop ERP** designed for agricultural businesses. It runs entirely on your local computer with no internet connection required for daily business operations.

## Key Features

### Offline-First Architecture

- **No internet required** for normal ERP operations
- Local SQLite database stored on your computer
- Local backend server (bundled with the application)
- Bundled Node.js runtime — no external software installation needed

### Complete ERP Modules

- **Sales:** Quotations → Orders → Delivery Challans → Invoices → Payments → Returns → Credit Notes
- **Purchase:** Quotations → Orders → GRN → Invoices → Payments → Returns → Debit Notes
- **Inventory:** Products, Stock, Warehouses, Batch Tracking
- **Finance:** Chart of Accounts, Journal Entries, GL, Cash/Bank Books
- **GST:** CGST, SGST, IGST, GST Returns
- **HR:** Employees, Payroll, Departments, Designations
- **CRM:** Contacts, Leads, Activities
- **Assets:** Asset Register, Depreciation
- **DMS:** Document Management, OCR, Digital Signatures
- **Reports:** Sales, Purchase, Inventory, Finance, GST, HR Reports
- **PDF Generation:** Quotations, Invoices, Credit/Debit Notes

### Desktop Application

- Native Windows desktop application (Tauri + React)
- System tray integration
- Automatic backend startup
- Local backup and restore
- First-run setup wizard

### License Activation

- One-time online activation required
- RSA-2048 signed license tokens
- Offline verification after activation
- Grace periods for temporary internet loss

## System Requirements

| Requirement | Specification                                |
| ----------- | -------------------------------------------- |
| OS          | Windows 10/11 x64                            |
| RAM         | 4 GB minimum, 8 GB recommended               |
| Disk        | 500 MB for application + data space          |
| Display     | 1024x600 minimum, 1280x800 recommended       |
| Internet    | Required only for initial license activation |
| Node.js     | **NOT REQUIRED** — bundled with installer    |
| PostgreSQL  | **NOT REQUIRED** — uses local SQLite         |

## What's Included

| Component   | Details                                           |
| ----------- | ------------------------------------------------- |
| Application | Tauri EXE (37.1 MB)                               |
| Installer   | NSIS Installer (138.5 MB)                         |
| Runtime     | Bundled Node.js v24.18.0 + backend + dependencies |
| Database    | Local SQLite (auto-created)                       |
| License     | RSA-2048 signed activation system                 |

## Verification Status

| Area                       | Status                                      |
| -------------------------- | ------------------------------------------- |
| Sales workflows            | ✅ VERIFIED & FROZEN                        |
| Purchase workflows         | ✅ VERIFIED & FROZEN                        |
| Finance/GL/GST             | ✅ VERIFIED & FROZEN                        |
| Cross-module integration   | ✅ VERIFIED                                 |
| Data consistency           | ✅ VERIFIED                                 |
| Dashboard                  | ✅ VERIFIED & FROZEN                        |
| Offline-first architecture | ✅ VERIFIED                                 |
| Bundled Node.js            | ✅ VERIFIED                                 |
| License activation         | ✅ VERIFIED                                 |
| Local backup/restore       | ✅ VERIFIED                                 |
| Frontend tests             | ✅ 135/135 PASS                             |
| Clean Windows machine      | ⏳ NOT TESTED (Windows Sandbox unavailable) |

## Known Limitations

1. **Clean Windows machine test not performed** — Windows Sandbox is unavailable on the current Windows Home development machine
2. **Auto-updater** — Not enabled pending real signing key
3. **Cloud backup** — Future paid add-on
4. **Cloud sync** — Future paid add-on
5. **Payment gateway** — Future integration (Razorpay/etc.)
6. **Multi-device sync** — Future feature

## SHA-256 Checksums

```
5cce5d49db58fb1064625c8b9888cbef947584765fc9e49ad3d659779daccfb0  shranix-krushi-erp.exe
b8d517c9abea82909a9ee5766279cefea03bc5592640a9227ed24c2401f2e703  SHRANIX Krushi ERP_1.0.0_x64-setup.exe
```

---

_SHRANIX Krushi ERP — Built with Codebuff_
