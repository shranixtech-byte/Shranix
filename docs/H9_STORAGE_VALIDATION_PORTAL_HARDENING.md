# H9 — Storage, Validation & Portal Hardening

## 1. Executive Summary

H9 hardened four security/reliability areas outside the H1–H8 scope: path traversal in the storage service, global input validation, portal password-reset rate limiting, and DMS download efficiency.

## 2. H9 Findings

| ID   | Finding                                                                                        | Severity | Status                  |
| ---- | ---------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| P1-1 | `StorageService.LocalStorageAdapter` — no path traversal protection on save/read/delete/exists | P1       | ✅ **FIXED**            |
| P2-1 | `ValidationPipe` `whitelist: false` — extra properties not stripped (mass assignment risk)     | P2       | ✅ **FIXED**            |
| P2-2 | `forgotPassword` — no rate limit (token flooding, email spam)                                  | P2       | ✅ **FIXED**            |
| P2-3 | `DMS downloadDocument` — returns base64 JSON (memory pressure for large files)                 | P2       | ✅ **FIXED**            |
| P3-1 | `uploadMultipleFiles` — no MIME type validation                                                | P3       | ⚠️ Not fixed (low risk) |
| P3-2 | `analytics()` — loads all records into memory                                                  | P3       | ⚠️ Not fixed (low risk) |

## 3. Files Changed

| File                                                 | Type     | Change                                          |
| ---------------------------------------------------- | -------- | ----------------------------------------------- |
| `backend/src/storage/storage.service.ts`             | MODIFIED | Added `assertWithinBase()` path traversal guard |
| `backend/src/main.ts`                                | MODIFIED | `whitelist: true`                               |
| `backend/src/portal/services/portal-auth.service.ts` | MODIFIED | Added 60s rate limit on forgotPassword          |
| `backend/src/dms/controllers/dms.controller.ts`      | MODIFIED | Stream as binary instead of base64 JSON         |
| `backend/src/storage/h9-storage-security.test.ts`    | **NEW**  | 10 tests                                        |

## 4. Test Results

```
H9 targeted:     10/10 passed
Backend (full):  55 files, 549 tests — ALL PASSED
Frontend (full): 13 files, 130 tests — ALL PASSED
Total:           69 files, 689 tests — ALL PASSED
```

## 5. Typecheck/Lint/Build

| Check              | Result                |
| ------------------ | --------------------- |
| Database typecheck | ✅ Clean              |
| Backend typecheck  | ✅ Clean              |
| Frontend typecheck | ✅ Clean              |
| Backend lint       | ✅ 0 errors           |
| Frontend lint      | ✅ 0 errors           |
| Frontend build     | ✅ Built successfully |

## 6. H1–H8 Untouched

| Checkpoint | Hash      | Status       |
| ---------- | --------- | ------------ |
| H1         | `89100cf` | ✅ Untouched |
| H2         | `9ccc4f5` | ✅ Untouched |
| H3         | `4f26a44` | ✅ Untouched |
| H4         | `759d560` | ✅ Untouched |
| H5         | `0b911b1` | ✅ Untouched |
| H6         | `c7b4ee8` | ✅ Untouched |
| H7         | `2e488c9` | ✅ Untouched |
| H8         | `ea2ac91` | ✅ Untouched |

## 7. Remaining Limitations

1. **StorageService is currently unused** — `StorageModule` is not imported by any other module. The fix is preventive (P1-1 fixed before it becomes exploitable).
2. **ValidationPipe whitelist is low-risk** — most controllers use `@Body() any`, so whitelist only affects future DTO-based controllers.
3. **forgotPassword rate limit is in-memory** — resets on server restart; sufficient for single-process deployment.
4. **DMS download format changed** — from base64 JSON to binary stream. Frontend download handlers may need to update from `response.data.data` to blob handling.
5. **P3-1 and P3-2 not fixed** — lower priority, can be addressed in future checkpoint.
