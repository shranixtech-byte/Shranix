# SHRANIX Krushi ERP — Offline Operation Guide

## Core Principle

**SHRANIX Krushi ERP is designed to work completely offline.** After the initial license activation (one-time internet connection), the entire ERP runs locally on your computer with zero internet dependency.

## What Works Offline (100%)

| Module                 | Offline Status |
| ---------------------- | -------------- |
| Login / Authentication | ✅ Full        |
| Dashboard              | ✅ Full        |
| Customers              | ✅ Full        |
| Suppliers              | ✅ Full        |
| Products               | ✅ Full        |
| Inventory / Stock      | ✅ Full        |
| Warehouses             | ✅ Full        |
| Sales Quotations       | ✅ Full        |
| Sales Orders           | ✅ Full        |
| Delivery Challans      | ✅ Full        |
| Sales Invoices         | ✅ Full        |
| Sales Payments         | ✅ Full        |
| Sales Returns          | ✅ Full        |
| Credit Notes           | ✅ Full        |
| Purchase Quotations    | ✅ Full        |
| Purchase Orders        | ✅ Full        |
| GRN (Goods Receipt)    | ✅ Full        |
| Purchase Invoices      | ✅ Full        |
| Purchase Payments      | ✅ Full        |
| Purchase Returns       | ✅ Full        |
| Debit Notes            | ✅ Full        |
| Finance / GL           | ✅ Full        |
| Chart of Accounts      | ✅ Full        |
| Journal Entries        | ✅ Full        |
| Cash Book              | ✅ Full        |
| Bank Book              | ✅ Full        |
| GST (CGST/SGST/IGST)   | ✅ Full        |
| HR / Employees         | ✅ Full        |
| Payroll                | ✅ Full        |
| CRM                    | ✅ Full        |
| Assets                 | ✅ Full        |
| Expenses               | ✅ Full        |
| Document Management    | ✅ Full        |
| PDF Generation         | ✅ Full        |
| Reports (all)          | ✅ Full        |
| Local Backup           | ✅ Full        |
| Local Restore          | ✅ Full        |

## What Requires Internet (One-Time Only)

| Feature                    | Internet Required              |
| -------------------------- | ------------------------------ |
| Initial license activation | ✅ One-time only               |
| License revalidation       | ✅ Periodic (auto, background) |
| License expiry renewal     | ✅ When license expires        |
| Auto-update check          | ✅ Future feature              |

## How Offline Works

### Architecture

```
Your Computer (no internet needed)
├── SHRANIX Krushi ERP Desktop App
│   ├── Tauri EXE (desktop shell)
│   ├── Local Backend Server (Node.js)
│   ├── Local SQLite Database
│   └── Local File Storage
└── All data stored locally
```

### Data Storage

All your business data is stored in:

- **Database:** `%LOCALAPPDATA%\com.shranix.krushi-erp\data\erp.db`
- **Backups:** `%LOCALAPPDATA%\com.shranix.krushi-erp\data\backups\`
- **Documents:** Local file storage

### No Cloud Dependency

- ❌ No cloud database
- ❌ No cloud backup (V1)
- ❌ No cloud sync (V1)
- ❌ No external API calls for business operations
- ❌ No telemetry or analytics

## License Behavior Offline

### After Activation

1. Your license is stored locally as a signed token
2. The ERP verifies the token locally on every launch
3. No internet check is performed for normal operations

### Periodic Revalidation

- The ERP attempts to revalidate your license every 12 hours
- If internet is available: revalidation happens silently in the background
- If internet is unavailable: the ERP continues working normally
- Revalidation only matters when your license is about to expire

### Grace Period

- If your license expires, you have a configurable grace period
- During grace period, the ERP continues working
- After grace period, you need to renew your license

### Offline Token

- If you need extended offline operation, request an offline token
- Offline tokens are valid for 7 days (configurable)
- Use the "Offline Recovery" option on the activation screen

## Backup and Restore

### Manual Backup

1. Go to **Settings** → **Backup**
2. Click **Create Backup**
3. Choose a safe location
4. Backup includes: database + documents

### Automatic Backup

- The ERP creates hourly backups automatically
- Backups are stored in the local backup directory
- Old backups are cleaned up automatically

### Restore

1. Go to **Settings** → **Backup**
2. Click **Restore**
3. Select a backup file
4. Confirm restoration
5. The ERP restarts with restored data

## Network Configuration

### No Network Required

The ERP binds to `127.0.0.1` (localhost) only:

- Backend server: `http://127.0.0.1:{port}/api/v1`
- Frontend connects to local backend
- No external network access needed

### Firewall

The ERP does NOT require any firewall exceptions because:

- It only listens on localhost (127.0.0.1)
- It does NOT connect to external servers for business operations
- Only the initial license activation requires internet

## Data Safety

### Local Only

- Your data never leaves your computer
- No data is sent to any server
- No analytics or telemetry
- Complete data privacy

### Backup Recommendation

- Create regular backups
- Store backups on external drives or network shares
- Test restore occasionally
- Keep at least 3 recent backups

## Troubleshooting Offline

### "Backend not responding"

- The application auto-starts the backend
- Wait 10-15 seconds for startup
- If persistent, restart the application

### "Database locked"

- Close all ERP windows
- Wait 5 seconds
- Reopen the application

### "License validation failed"

- This usually means the license has expired
- Connect to internet and revalidate
- Or request an offline token before going offline

---

_SHRANIX Krushi ERP V1.0.0 — Your data stays on your computer_
