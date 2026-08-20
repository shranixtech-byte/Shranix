# H11 — Accessible Controllers Functional + Authorization Audit

## Executive Summary

After H10 restored access to 22 controller classes (8 files) that were previously inaccessible due to missing `JwtAuthGuard`, H11 performed a deep functional, authorization, and audit-trail audit of all restored controllers.

**Key findings:**

- **P2-1**: 13 GST controller classes (CRUD operations) did not pass `@CurrentUser()` userId to `BaseMasterService.create/update/delete`, causing all audit trail records to have null userId.
- **P2-2**: `DataManagementController` file upload accepted any MIME type/file extension with no size limit, unlike the DMS module which enforces 50MB + file filter.

**Fixes applied:**

1. Added `@CurrentUser() u: { id: string }` to all 39 create/update/delete methods across 13 GST controllers, passing `u?.id` to service methods.
2. Added file filter (MIME + extension validation) and 50MB size limit to `DataManagementController` `FileInterceptor`.

---

## Controller Inventory (H10 Restored)

### 1. AuditTrailController (`audit/audit-trail.controller.ts`)

| Endpoint              | Method | Guard                           | Permission     |
| --------------------- | ------ | ------------------------------- | -------------- |
| `/audit-trail`        | GET    | JwtAuthGuard + PermissionsGuard | companies.read |
| `/audit-trail/meta`   | GET    | JwtAuthGuard + PermissionsGuard | companies.read |
| `/audit-trail/export` | GET    | JwtAuthGuard + PermissionsGuard | companies.read |

- **CurrentUser**: Not used (read-only, no mutation)
- **Service**: AuditTrailService (read-only)
- **Audit finding**: None — read-only controller

### 2. BackupController (`backup/backup.controller.ts`)

| Endpoint                 | Method | Guard                           | Permission       |
| ------------------------ | ------ | ------------------------------- | ---------------- |
| `/backup`                | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/backup`                | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/backup/settings`       | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/backup/settings`       | PUT    | JwtAuthGuard + PermissionsGuard | companies.update |
| `/backup/:name/download` | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/backup/:name/restore`  | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/backup/:name`          | DELETE | JwtAuthGuard + PermissionsGuard | companies.update |

- **CurrentUser**: Not used (destructive ops lack audit trail — P3, deferred)
- **Service**: BackupService
- **Path safety**: `safeName()` validates backup names

### 3. DataManagementController (`data-management/data-management.controller.ts`)

| Endpoint                           | Method | Guard                           | Permission       |
| ---------------------------------- | ------ | ------------------------------- | ---------------- |
| `/data-management/meta`            | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/data-management/export`          | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/data-management/import`          | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/data-management/deleted`         | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/data-management/deleted/list`    | GET    | JwtAuthGuard + PermissionsGuard | companies.read   |
| `/data-management/deleted/restore` | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/data-management/deleted/purge`   | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/data-management/cleanup`         | POST   | JwtAuthGuard + PermissionsGuard | companies.update |
| `/data-management/archive`         | POST   | JwtAuthGuard + PermissionsGuard | companies.update |

- **H11 fix**: Added file MIME/extension validation + 50MB size limit on import

### 4. GST Controllers (`gst_audit/controllers.ts`) — 16 controller classes

All 13 CRUD-based controllers:

- GstRegistrationsController
- GstLedgerController
- GstReturnsController
- TaxPostingsController
- YearClosingController
- PeriodLocksController
- OpeningBalanceTransfersController
- YearEndEntriesController
- AuditDetailsController
- NumberSeriesController
- VoucherApprovalsController
- FinanceAnalyticsController
- GstAuditSettingsController

Plus 3 non-CRUD controllers:

- GstConfigController (KV settings)
- GstReportsController (read-only reports)
- GstEngineController (engine delegates)

- **H11 fix**: Added `@CurrentUser() u: { id: string }` to all 39 create/update/delete methods across 13 controllers, passing `u?.id` to service

### 5. ApiSettingsController (`integrations/controllers/api-settings.controller.ts`)

| Endpoint                 | Method | Guard                           | Permission     |
| ------------------------ | ------ | ------------------------------- | -------------- |
| `/integrations/settings` | GET    | JwtAuthGuard + PermissionsGuard | finance.read   |
| `/integrations/settings` | PUT    | JwtAuthGuard + PermissionsGuard | finance.update |

- **Service**: ApiSettingsService — has secret masking on GET

### 6. LicenseSettingsController (`license/settings.controller.ts`)

| Endpoint         | Method | Guard                           | Permission     |
| ---------------- | ------ | ------------------------------- | -------------- |
| `/license`       | GET    | JwtAuthGuard + PermissionsGuard | finance.read   |
| `/license`       | PUT    | JwtAuthGuard + PermissionsGuard | finance.update |
| `/license/renew` | POST   | JwtAuthGuard + PermissionsGuard | finance.update |

### 7. NotificationSettingsController (`notifications/settings.controller.ts`)

| Endpoint                  | Method | Guard                           | Permission     |
| ------------------------- | ------ | ------------------------------- | -------------- |
| `/notifications/settings` | GET    | JwtAuthGuard + PermissionsGuard | finance.read   |
| `/notifications/settings` | PUT    | JwtAuthGuard + PermissionsGuard | finance.update |

### 8. PrinterSettingsController (`printer/settings.controller.ts`)

| Endpoint            | Method | Guard                           | Permission     |
| ------------------- | ------ | ------------------------------- | -------------- |
| `/printer/settings` | GET    | JwtAuthGuard + PermissionsGuard | finance.read   |
| `/printer/settings` | PUT    | JwtAuthGuard + PermissionsGuard | finance.update |

---

## Findings

### P2-1: GST Controllers — No Audit Trail userId Attribution (FIXED)

**Evidence:**

- 13 GST controller classes called `this.service.create(dto as any)` without passing userId
- `BaseMasterService.create(data, userId?)` logs audit records only when userId is provided
- Without userId, all GST create/update/delete audit records had `null` userId
- The established pattern (see `gl/controllers.ts`) uses `@CurrentUser() u: { id: string }` and passes `u?.id`

**Impact:** Security team cannot identify who made changes to GST compliance records. Audit trail is non-functional for accountability.

**Fix:** Added `@CurrentUser() u: { id: string }` to all 39 CRUD methods across 13 controllers, passing `u?.id` to service.

### P2-2: DataManagement Import — No File Type/Size Validation (FIXED)

**Evidence:**

- `DataManagementController` used `FileInterceptor('file')` without any limits or fileFilter
- DMS module already has `MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } })`
- An attacker could upload arbitrarily large files or malicious file types

**Impact:** Denial of service via large files; potential storage of malicious content.

**Fix:** Added fileFilter (allows .csv, .json, .xlsx, .xls) and 50MB fileSize limit to FileInterceptor.

### P3-1: Backup/DMS Controllers — No Audit Logging for Destructive Operations (DEFERRED)

**Evidence:**

- BackupController.create/delete/restore operations have no audit trail
- DataManagementController import/export/purge/restore/archive have no audit trail
- Fix requires injecting AuditService into controllers and modifying service interfaces

**Impact:** Security team cannot track who created/restored/deleted backups or imported/purged data.

**Limitation:** Deferred — requires more invasive changes to controller constructors and service interfaces.

### P3-2: BackupController — Backup Restore Lacks Admin-Only Restriction (DEFERRED)

**Evidence:**

- `POST /backup/:name/restore` only requires `companies.update` permission
- Database restore is the most destructive operation in the system
- Should arguably require admin role

**Impact:** Any user with `companies.update` can wipe and replace the entire database.

**Limitation:** Deferred — requires clarification of intended business rules.

### P3-3: AuditTrailController — No Pagination Limit on CSV Export (DEFERRED)

**Evidence:**

- `exportCsv()` paginates through all audit records (500 at a time) without a total limit
- Very large audit logs could cause memory exhaustion

**Impact:** Denial of service on systems with large audit logs.

**Limitation:** Deferred — requires max-rows limit or streaming approach.

---

## Tests

H11 test file: `backend/src/gst_audit/h11-gst-audit-trail.test.ts`

- 14 tests covering:
  - userId propagation in create/update/delete
  - BaseMasterService audit integration (with/without userId)
  - DataManagement file type validation (accept/reject patterns)

---

## H1-H10 Regression Status

| Commit | Hash          | Status       |
| ------ | ------------- | ------------ |
| H1     | 89100cf       | ✅ Untouched |
| H2     | 9ccc4f5       | ✅ Untouched |
| H3     | 4f26a44       | ✅ Untouched |
| H4     | 759d560       | ✅ Untouched |
| H5     | 0b911b1       | ✅ Untouched |
| H6     | c7b4ee8       | ✅ Untouched |
| H7     | 2e488c9       | ✅ Untouched |
| H8     | ea2ac91       | ✅ Untouched |
| H9     | fd33d12       | ✅ Untouched |
| H10    | (uncommitted) | ✅ Untouched |

All H1-H10 commit hashes intact. No H1-H10 files modified by H11.
