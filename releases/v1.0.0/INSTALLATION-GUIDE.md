# SHRANIX Krushi ERP — Installation Guide

**Version:** 1.0.0
**Platform:** Windows x64

---

## System Requirements

| Requirement      | Minimum             | Recommended        |
| ---------------- | ------------------- | ------------------ |
| Operating System | Windows 10 (64-bit) | Windows 11         |
| RAM              | 4 GB                | 8 GB               |
| Disk Space       | 100 MB              | 500 MB             |
| Display          | 1024×600            | 1920×1080          |
| Network          | Internet connection | Broadband internet |

---

## Important: Backend Requirement

> **SHRANIX Krushi ERP Desktop requires a running ERP backend server.**
>
> The desktop application connects to the SHRANIX cloud backend over the internet.
> You must have:
>
> - Active internet connection
> - Valid SHRANIX ERP account (provided by your administrator)
> - Backend server accessible at `https://api.shranix.com`
>
> The desktop application does NOT work offline.

---

## Step 1: Download

Download the installer from your SHRANIX account or from the link provided by your administrator.

You will receive one of these files:

- `SHRANIX Krushi ERP_1.0.0_x64-setup.exe` (Installer — recommended)
- `shranix-krushi-erp.exe` (Portable — runs directly)

---

## Step 2: Verify Checksum (Optional)

For security, verify the downloaded file matches the official checksum:

1. Open Command Prompt
2. Run: `certutil -hashfile "SHRANIX Krushi ERP_1.0.0_x64-setup.exe" SHA256`
3. Compare the output with the checksum in `SHA256SUMS.txt`

Expected checksum for installer:

```
f5c4f4b02f3fd5320dfc975905b52166ab6f00ecac6d11fb27038f125c3a0151
```

---

## Step 3: Install

1. Double-click `SHRANIX Krushi ERP_1.0.0_x64-setup.exe`
2. If Windows SmartScreen appears, click "More info" → "Run anyway"
3. Follow the installation wizard:
   - Choose installation folder (default: `%LOCALAPPDATA%\Programs\SHRANIX Krushi ERP`)
   - Choose Start Menu folder
   - Click "Install"
4. Click "Finish" when installation completes

### What Gets Installed

- Application executable
- Start Menu shortcut
- Desktop shortcut (optional)
- System tray icon

---

## Step 4: Launch

### Option A: From Start Menu

1. Click Start Menu
2. Find "SHRANIX Krushi ERP"
3. Click to launch

### Option B: From Desktop

1. Double-click the "SHRANIX Krushi ERP" desktop shortcut

### Option C: Portable

1. Double-click `shranix-krushi-erp.exe` directly

---

## Step 5: Login

1. The application opens with the login screen
2. Enter your email and password (provided by your administrator)
3. Click "Login"
4. You will see the ERP Dashboard

---

## Step 6: Using the Application

Once logged in, you can access all ERP modules:

- **Dashboard** — Overview of business metrics
- **Sales** — Create quotations, orders, invoices
- **Purchase** — Manage purchase orders, GRN, invoices
- **Inventory** — Track stock, warehouses, products
- **Finance** — Charts of accounts, journals, reports
- **HR** — Employee management, payroll
- **Reports** — Business analytics and reports

---

## Uninstall

### If Installed via Installer:

1. Open Windows Settings → Apps → Installed Apps
2. Find "SHRANIX Krushi ERP"
3. Click "Uninstall"
4. Follow the uninstallation wizard

### If Using Portable:

1. Close the application
2. Delete the `shranix-krushi-erp.exe` file
3. Delete any associated files in the same directory

> **Note:** Uninstalling does NOT delete your business data.
> Business data is stored on the server, not on your local machine.

---

## Troubleshooting

### "Application can't start" or "Missing DLL"

- Install [Microsoft WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- WebView2 is included in Windows 11 and recent Windows 10 updates

### "Login failed" or "Cannot connect"

- Check your internet connection
- Verify the backend server is running
- Contact your system administrator

### Application is slow

- Close other applications to free up memory
- Ensure stable internet connection
- Restart the application

### Black screen on launch

- Close the application (right-click tray icon → Quit)
- Re-launch

---

## Network Configuration

The application communicates with:

- **Backend API:** `https://api.shranix.com` (port 443)
- **Update Server:** `https://updates.shranix.com` (currently disabled)

If your network has a firewall/proxy, ensure these domains are allowed.

---

## Support

- **Email:** support@shranix.com
- **Phone:** Contact your administrator
- **Website:** https://shranix.com/support

---

_SHRANIX Krushi ERP v1.0.0 — Built with Tauri v2_
