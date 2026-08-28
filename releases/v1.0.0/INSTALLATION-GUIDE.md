# SHRANIX Krushi ERP — Installation Guide

## Quick Start

1. **Download** `SHRANIX Krushi ERP_1.0.0_x64-setup.exe`
2. **Double-click** the installer
3. **Follow** the installation wizard
4. **Launch** from Desktop shortcut or Start Menu
5. **Activate** your license (one-time, requires internet)
6. **Setup** your admin account and company
7. **Start** using SHRANIX Krushi ERP!

## Detailed Installation

### Step 1: Run the Installer

Double-click `SHRANIX Krushi ERP_1.0.0_x64-setup.exe`. The installer will:

- Install the application to your user profile
- Create Desktop and Start Menu shortcuts
- Set up the bundled runtime (no Node.js installation needed)

### Step 2: Launch the Application

Click the **SHRANIX Krushi ERP** shortcut on your Desktop or in the Start Menu.

The application will:

- Start the local backend server automatically
- Open the ERP in a desktop window
- Show the License Activation screen

### Step 3: License Activation

On first launch, you need to activate your license:

1. Enter your **email** and **password** (your SHRANIX account credentials)
2. Enter your **license number**
3. Click **Activate**
4. The activation completes in a few seconds

**Note:** Internet is required only for this initial activation. After activation, the ERP works completely offline.

### Step 4: First-Run Setup

After activation, the setup wizard guides you through:

1. **Welcome** — Overview of the setup process
2. **Create Administrator** — Set up your admin account:
   - First name and last name
   - Email address
   - Secure password (minimum 8 characters)
3. **Company Information** — Enter your business name
4. **Financial Year** — Set your financial year start and end dates
5. **Complete** — Setup is done!

### Step 5: Start Using ERP

After setup, you can:

- Log in with your admin credentials
- Access the Dashboard
- Start adding customers, products, and making transactions

## What You DON'T Need to Install

| Software           | Required?                      |
| ------------------ | ------------------------------ |
| Node.js            | ❌ No — bundled with installer |
| npm                | ❌ No — bundled with installer |
| PostgreSQL         | ❌ No — uses local SQLite      |
| Python             | ❌ No                          |
| Git                | ❌ No                          |
| Any command prompt | ❌ No                          |

## System Requirements

| Requirement | Minimum             | Recommended                 |
| ----------- | ------------------- | --------------------------- |
| Windows     | 10/11 x64           | 11 x64                      |
| RAM         | 4 GB                | 8 GB                        |
| Disk Space  | 500 MB + data       | 1 GB + data                 |
| Display     | 1024x600            | 1280x800 or higher          |
| Internet    | For activation only | Not needed after activation |

## Data Location

All ERP data is stored locally on your computer:

- Database: `%LOCALAPPDATA%\com.shranix.krushi-erp\data\erp.db`
- Backups: `%LOCALAPPDATA%\com.shranix.krushi-erp\data\backups\`

## Uninstallation

1. Open **Windows Settings** → **Apps** → **Installed apps**
2. Find **SHRANIX Krushi ERP**
3. Click **Uninstall**
4. Follow the uninstaller prompts

**Note:** Uninstalling removes the application but preserves your data directory for safety.

## Reinstallation

1. Run the installer again
2. The installer will update the application
3. Your existing data is preserved
4. Launch and continue working

## Troubleshooting

### Application doesn't start

- Ensure Windows 10/11 x64
- Check that the installation completed successfully
- Try running as administrator

### Backend doesn't start

- The application automatically selects an available port
- Check if another instance is already running
- Restart the application

### License activation fails

- Check your internet connection
- Verify your email and password
- Contact support@shranix.com if issues persist

### Database issues

- The application auto-creates the database on first run
- If the database is corrupted, use the Backup/Restore feature
- Never delete the database file manually

---

_SHRANIX Krushi ERP V1.0.0_
