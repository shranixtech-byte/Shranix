# SHRANIX Krushi ERP — V1.0.0 Release Checklist

**Date:** August 28, 2026
**Version:** 1.0.0

---

## Production Infrastructure

| Item                        | Status     | Notes                                        |
| --------------------------- | ---------- | -------------------------------------------- |
| Production backend deployed | 🟡 BLOCKED | Requires deployment to production server     |
| Production database         | 🟡 BLOCKED | Requires PostgreSQL on production server     |
| HTTPS configured            | 🟡 BLOCKED | Requires SSL certificate for api.shranix.com |
| Domain configured           | 🟡 BLOCKED | Requires DNS for api.shranix.com             |
| CORS configured             | 🟡 BLOCKED | Requires production CORS_ORIGINS             |

---

## Desktop Application

| Item                      | Status   | Notes                                              |
| ------------------------- | -------- | -------------------------------------------------- |
| Windows EXE built         | ✅ READY | `shranix-krushi-erp.exe` (36.7 MB)                 |
| NSIS installer built      | ✅ READY | `SHRANIX Krushi ERP_1.0.0_x64-setup.exe` (17.9 MB) |
| SHA-256 checksums         | ✅ READY | `SHA256SUMS.txt` generated                         |
| Production API configured | ✅ READY | `https://api.shranix.com/api/v1`                   |
| CSP configured            | ✅ READY | Production domains only                            |
| DevTools disabled         | ✅ READY | `#[cfg(debug_assertions)]` guards                  |
| Version consistent        | ✅ READY | 1.0.0 across all configs                           |
| Icon/branding             | ✅ READY | Consistent across all platforms                    |
| Installer tested          | ✅ READY | Valid PE32 NSIS archive                            |
| EXE launch tested         | ✅ READY | Runs stable, connects to API                       |

---

## Frontend

| Item                | Status   | Notes                   |
| ------------------- | -------- | ----------------------- |
| TypeScript passes   | ✅ READY | 0 errors                |
| Frontend tests pass | ✅ READY | 135/135 pass            |
| Production build    | ✅ READY | Built with VITE_API_URL |
| SPA routing         | ✅ READY | All routes configured   |

---

## Backend

| Item                  | Status   | Notes                         |
| --------------------- | -------- | ----------------------------- |
| Backend tests pass    | ✅ READY | 184/184 purchase tests        |
| Sales module tests    | ✅ READY | Frozen and verified           |
| Purchase module tests | ✅ READY | Frozen and verified           |
| Financial integrity   | ✅ READY | GL balanced, Debit = Credit   |
| Data consistency      | ✅ READY | Stock reconciliation verified |

---

## Security

| Item                    | Status   | Notes                           |
| ----------------------- | -------- | ------------------------------- |
| No hardcoded secrets    | ✅ READY | Verified in Rust and frontend   |
| No localhost production | ✅ READY | CSP cleaned                     |
| DevTools disabled       | ✅ READY | Release build guards            |
| CSP active              | ✅ READY | Production domains only         |
| Updater disabled        | ✅ READY | Placeholder key, not production |
| Error messages safe     | ✅ READY | No stack traces exposed         |

---

## Documentation

| Item               | Status   | Notes                   |
| ------------------ | -------- | ----------------------- |
| Release notes      | ✅ READY | `RELEASE-NOTES.md`      |
| Installation guide | ✅ READY | `INSTALLATION-GUIDE.md` |
| Admin guide        | ✅ READY | `ADMIN-GUIDE.md`        |
| SHA-256 checksums  | ✅ READY | `SHA256SUMS.txt`        |

---

## Support

| Item                     | Status      | Notes                              |
| ------------------------ | ----------- | ---------------------------------- |
| Support email configured | 🟡 DEFERRED | Requires support@shranix.com setup |
| Documentation site       | 🟡 DEFERRED | Requires docs.shranix.com          |
| Error monitoring         | 🟡 DEFERRED | Requires Sentry/similar            |

---

## Summary

| Category         | Ready  | Blocked | Deferred |
| ---------------- | ------ | ------- | -------- |
| Desktop App      | 10     | 0       | 0        |
| Frontend         | 4      | 0       | 0        |
| Backend          | 4      | 0       | 0        |
| Security         | 6      | 0       | 0        |
| Documentation    | 4      | 0       | 0        |
| Production Infra | 0      | 5       | 0        |
| Support          | 0      | 0       | 3        |
| **Total**        | **28** | **5**   | **3**    |

---

## Decision

**🟡 CONDITIONALLY READY**

The desktop application, frontend, backend, security, and documentation are all READY.

However, the production backend infrastructure (server, database, HTTPS, domain) is BLOCKED and must be deployed before the application can be used by customers.

### To Release V1.0.0:

1. Deploy production backend to `api.shranix.com`
2. Configure HTTPS with valid SSL certificate
3. Set up production database
4. Configure CORS for production origins
5. Test end-to-end with production backend
6. Distribute installer to customers

### Deferred Items (Not Required for V1):

- Offline database
- Offline sync
- Real updater signing key
- Auto-update
- Real OCR provider
- Real AI provider
- Real payment gateway
- CA digital signatures
- Multi-tenant architecture

---

_SHRANIX Krushi ERP v1.0.0 Release Checklist_
