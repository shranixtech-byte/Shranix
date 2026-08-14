# Phase 16 — Central SHRANIX License Server & Commercial Infrastructure

> **Status:** implemented + tested (44 files / 415 tests green, zero
> regressions) · production-gate items (release-seeding, real download/CDN
> hosting, scheduler health detail) documented below
> **Audit:** completed before implementation (see §1) — existing Phase 12–15
> engines reused, nothing rebuilt.

---

## 1. Audit summary

The existing system already matches the Phase-16 target architecture:

```
Commercial Engine (backend/src/commercial)   → plans, subscriptions, billing,
                                               payments, coupons, entitlements
License Engine (backend/src/license)         → devices, installations,
                                               activations, validation, tokens
Security Engine (backend/src/security)       → events, dashboard API (Ph.15)
Customer Portal (backend/src/portal)         → tenant-isolated (assertOwned)
SHRANIX Client APIs (backend/src/activation) → activate/validate/offline/update
```

Phase 16 closed the three identified gaps:

1. **Software version / release management** — new persistent registry
2. **Central commercial / license monitoring KPIs** — new aggregation layer
3. **Central commercial administration surface** — new admin API

**Reused (not rebuilt):** Commercial Engine, Subscription, Billing, Payment,
Coupons, Entitlements, License Engine, Devices, Installations, Activations,
Validation, Tokens, Transfers, Security Engine, Customer Portal, ERP + Portal
auth, tenant isolation, activation APIs, license APIs.

---

## 2. New modules

| Module               | Path                    | Purpose                                |
| -------------------- | ----------------------- | -------------------------------------- |
| **Release registry** | `backend/src/releases/` | Persistent release/version management  |
| **Central KPIs**     | `backend/src/central/`  | Monitoring aggregation + admin surface |

---

## 3. Database (16.7) — migration `0026_complete_living_lightning`

Four new tables (SQLite + PostgreSQL schemas, FKs/uniques/indexes/audit
columns included). Existing commercial/license tables untouched.

| Table                           | Purpose                                                                                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shranix_software_releases`     | One row per build: releaseId, version, buildNumber, platform, architecture, channel, status (DRAFT/TESTING/STAGED/PUBLISHED/DEPRECATED/REVOKED), critical flag, release notes, publish/deprecate/revoke timestamps + reasons. Unique (version, channel, platform, architecture). |
| `shranix_release_packages`      | Downloadable artifacts: fileName, packageUrl, size, **sha-256 checksum**, signature + algorithm + signature metadata. Unique (releaseId, platform, architecture).                                                                                                                |
| `shranix_release_channels`      | Channel definitions (STABLE/BETA/INTERNAL/CUSTOMER_SPECIFIC) with per-channel min/recommended version policy.                                                                                                                                                                    |
| `shranix_version_compatibility` | Explicit per-version policy: minSupportedVersion, recommendedVersion, **blocked** + reason, **critical** flag. Unique (version, channel).                                                                                                                                        |

---

## 4. Release architecture (16.1)

- **Lifecycle:** DRAFT → TESTING/STAGED → PUBLISHED → DEPRECATED / REVOKED.
  Only DRAFT is editable; only non-published states can be published; a
  **REVOKED release is never offered** as an update (resolution skips it).
- **Admin endpoints** (`/api/v1/releases`, permission-separated):
  - `GET /releases`, `GET /releases/:id` — `release.view`
  - `POST /releases`, `PATCH /releases/:id`, `POST /releases/:id/packages`,
    `POST /releases/channels`, `POST /releases/version-policy`,
    `POST /releases/:id/deprecate` — `release.manage`
  - `POST /releases/:id/publish` — `release.publish`
  - `POST /releases/:id/revoke` — `release.revoke`
- **Package security:** the client never supplies download URLs/versions.
  Update responses carry the package's sha-256 checksum + signature metadata;
  the client must verify integrity before executing. Arbitrary URLs from the
  client are never accepted.

## 5. Version architecture (16.1)

`resolveUpdate()` derives everything server-side:

- Latest PUBLISHED release for (platform, architecture, channel).
- Policy precedence: `version_compatibility` row for (currentVersion,
  channel) → channel `minVersion`/`recommendedVersion`.
- **Verdicts:** `UPDATE_AVAILABLE` · `UPDATE_RECOMMENDED` · `UPDATE_REQUIRED`
  (critical flag or below minimum) · `VERSION_SUPPORTED` · `VERSION_BLOCKED`
  (blocked versions are never offered a bypass).
- **Channel isolation:** BETA/INTERNAL/CUSTOMER_SPECIFIC releases never leak
  into STABLE resolution.
- **Customer-specific releases** are served only to authorized customers
  (`assignedCustomerIds`); unauthorized access records
  `UNAUTHORIZED_LICENSE_ACCESS` and returns nothing.

## 6. Update API (16.5, 16.6)

`GET /activation/update?currentVersion=x` now resolves from the registry and
returns the Phase-16 contract (`verdict`, `releaseId`, `releaseChannel`,
`minimumSupportedVersion`, `recommendedVersion`, `updateRequired`,
`updateAvailable`, `packageMetadata` incl. checksum + signature, …) **plus**
the legacy Phase-14 fields (`ok`, `channel`, `latestVersion`, `minVersion`,
`updateUrl`, `signatureRequired`) so existing clients keep working. When the
registry is empty it falls back to the old KV configuration — backward
compatible by design. No private storage paths or internal infrastructure are
exposed.

## 7. Commercial / License KPI architecture (16.2)

`backend/src/central/central-kpis.service.ts` — real aggregations over
existing tables, all date-scoped and capped (no unbounded queries; filter
columns are indexed):

- **Commercial:** customers, subscriptions (trial/active/past-due/grace/
  suspended/expired/cancelled + expiring ≤30d), **MRR/ARR** (normalized by
  billing cycle), successful/failed payments + amounts, refunds, outstanding
  billing, upgrades/downgrades/cancellations/renewals (subscription events).
- **License:** licenses by status, active devices, **available device slots**
  (Σ max − active over ACTIVE licenses), activations today/total/failed,
  transfers, deactivations, validation failures, expiries.
- **Security:** total + by severity, token failures, replay attempts,
  activation abuse, device mismatches, rate-limit events, unauthorized access.
- **Update:** release counts by channel, latest stable, **version adoption**,
  outdated installations, blocked installations, critical-update pending.
- **Trends:** 7/30/90-day daily series — activations/day, new subscriptions/
  day, payments/day, failed payments/day, license expiries/day, security
  events/day.

## 8. Admin surface (16.3)

`/api/v1/central/*` (requires `license.view` — the guard maps `license.*` →
`central.*`; super-admin `*.*` also passes):

- `GET /central/kpis` — all four KPI groups
- `GET /central/trends?days=7|30|90`
- `GET /central/search?q=&type=` — customers, licenses, subscriptions,
  devices, installations, activations, payments, releases
- `GET /central/system-health` — API, database, payment webhooks, license
  validation, activation service

## 9. Permissions (16.8)

- `release.view` / `release.manage` / `release.publish` / `release.revoke` —
  separate resource; NOT auto-granted by `license.*`, so ordinary support
  users cannot publish or revoke production releases (only super-admin
  `*.*` or explicitly granted `release.*`).
- `central.*` and `security.*` are granted via the `license.*` family for
  license admins.
- Seed requirement (see limitations): grant `release.*` to the publishing
  role.

## 10. Security changes (16.11)

- Customer cannot manipulate version/channel/customer_id/license_id/release_id
  — resolution is 100% server-derived; client inputs only pick the target
  platform/arch/channel and current version.
- Blocked versions cannot bypass the policy via client-side changes — the
  verdict is computed server-side from the registry.
- Revoked releases are excluded from resolution — cannot be downloaded as a
  trusted production release.
- Unauthorized customer-specific access → `UNAUTHORIZED_LICENSE_ACCESS` event
  (HIGH).
- Release create/publish/revoke → `ADMIN_OVERRIDE` / `LICENSE_REVOKED_EMERGENCY`
  audit events (16.9).

## 11. Tests (16.10, 16.11)

New real-DB test files (all passing):

- `backend/src/releases/releases.test.ts` (9 tests) — duplicate-version
  rejection, publish + package checksum metadata, min→UPDATE_REQUIRED,
  recommended→UPDATE_RECOMMENDED, blocked→VERSION_BLOCKED, channel isolation,
  customer-specific authorization, revoked-never-offered, update API registry
  path + KV fallback (backward compat).
- `backend/src/central/central-kpis.test.ts` (6 tests) — commercial/license/
  security KPI aggregation, 7-day trend bucketing, admin search, system
  health.

**Full suite: 44 files / 415 tests — all pass, zero regressions** (Phase
1–15 regression confirmed; Phase 12–15 suites unchanged and green).

## 12. Known limitations / production-gate items

- **Release seeding** — channels are created on demand (`ensureChannel`) and
  releases are managed via admin API; seed `release.*` permissions into the
  publishing role in your environment.
- **Live DB** — apply migration `0026_complete_living_lightning` to existing
  databases (`cd database && pnpm db:migrate`).
- **Trend queries** are capped client-side (5000 rows/window); at very large
  scale, move to SQL `GROUP BY` aggregation (indexes already exist).
- **Scheduler health** — system health reports service liveness via table
  probes; job-run latencies are a monitoring follow-up.
- **Real download hosting / CDN** — `packageUrl` is the artifact reference;
  production should point at an authenticated, HTTPS, checksum-verified CDN
  and code-sign packages (Phase 15 signing infra).
- **KPI caching** — aggregation runs live; add a short TTL cache (e.g. 60 s)
  if load demands it.

## 13. Production-gate completion (added after initial implementation)

### 13.1 Release permissions seeded (16.8)

New `backend/src/releases/services/release-permission-seed.service.ts`
(`OnModuleInit`) seeds `release.view`, `release.manage`, `release.publish`,
`release.revoke`, `release.download` and maps them to the **admin role**
(idempotent). `release.*` stays OUT of the `license.*` guard family, so
ordinary support users holding `license.*` can never publish/revoke. Tests:
`releases/release-permissions.test.ts` (grants matrix, controller metadata,
seed idempotency, support-role isolation).

### 13.2 Migration 0026 applied to the development database

Root dev DB (`data/dev.db`, the backend's configured `DATABASE_URL`) had
legacy drizzle tracking drift (only 0000–0002 tracked; 0003–0024 applied via
the historical `sync-schema.mjs` path). Migration tracking was repaired
(sha-256 hashes verified against drizzle's own algorithm, then recorded for
0003–0024) and `drizzle-kit migrate` (the project's normal workflow) applied
`0025` + `0026` cleanly. All five new tables now exist in dev.db
(`shranix_security_events`, `shranix_software_releases`,
`shranix_release_packages`, `shranix_release_channels`,
`shranix_version_compatibility`); 27 migrations tracked.

### 13.3 Authenticated release download hosting

`ReleasesService.createDownloadAccess()` issues a short-lived (default 15 min)
**HMAC-signed download token** (`relDl.<releaseId>.<exp>.<hmac>`) — the client
never sees internal storage paths. `resolveDownloadAccess()` verifies
signature + expiry, and re-checks the release is still **PUBLISHED** (revoked
releases are never downloadable, even with a previously valid token).
Customer-specific releases enforce eligibility **at issuance** (unauthorized
→ `UNAUTHORIZED_LICENSE_ACCESS` event).

- Endpoint: `GET /api/v1/releases/download/:token` (public route — the token
  IS the authorization).
- `GET /activation/update` package metadata now includes `downloadToken` +
  `downloadTokenExpiresAt`.
- Checksum + signature metadata are preserved end-to-end — the client verifies
  before executing.

### 13.4 KPI caching (16.12)

`CentralKpisService` now wraps aggregations in a 60 s TTL cache (injectable
clock for tests). **Caches data only** — authorization decisions are made by
guards before the service and are never cached. Date-filtered queries remain
bounded (capped page sizes) and indexed. Tests: same-result-within-TTL,
recompute-after-expiry, and fresh-instance independence.

### 13.5 Code-signing integration architecture (documented — external infra)

Production signing requires a real code-signing certificate/HSM which is NOT
available in this environment — **not faked**. The architecture:

- **Sign** installer + packages with Authenticode (Windows `signtool` or
  `osslsigncode`) and the Tauri updater signing key.
- **Store** the private certificate in a secure signing environment / HSM;
  the private key NEVER enters the repository (`.gitignore` already excludes
  `*.pem`/`*.key`; env-configured `RELEASE_DOWNLOAD_SECRET` follows the same
  rule).
- **Verify** (client-side, before execute): package sha-256 checksum
  (registry `checksum`/`checksumAlgorithm`) + Authenticode/signature
  (`signature`/`signatureAlgorithm`/`signatureMetadata`) + trusted signer.
- **Config surface**: `RELEASE_DOWNLOAD_SECRET` (download tokens) and the
  package `signature*` fields are ready; the actual cert/HSM wiring is a
  deployment step.

## 14. Final validation (16.13)

✅ Backend tests (**45 files / 424 tests** — incl. release permissions,
download tokens, KPI cache) · ✅ Migrations applied to dev DB · ✅ Typecheck
backend + frontend + database · ✅ ESLint (0 errors on new modules) ·
✅ Backend build (`nest build`) · ✅ Frontend build (`vite build` — PWA
precache limit raised to 6 MB for the main bundle) · ✅ Regression (Ph.12–15).

## 15. Readiness statement

**A. Engineering Complete** — release registry, version policy, update API,
central KPIs, admin surface, permissions, download hosting, caching: all
implemented and tested (424 tests green, zero regressions).

**B. Staging Ready** — migration 0025/0026 applied to the dev DB; new modules
run against the real configured database; seed + permission mapping verified.

**C. Production Infrastructure Pending** — production code-signing
certificate + HSM/KMS signing environment, authenticated CDN/object storage
behind `packageUrl`, HTTPS deployment of the license server, CI lint/SAST,
release/role seeding in the production DB, KPI caching TTL tuning at scale.

**D. Actual Production Ready** — NOT claimed: the items in (C) require real
infrastructure (signing cert, CDN, KMS, production deployment) that is not
configured in this environment.
