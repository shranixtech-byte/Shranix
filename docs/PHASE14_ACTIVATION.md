# Phase 14 — Installer + Online Activation Engine

## 1. Architecture

```
Customer purchases SHRANIX
        ↓
Phase-12 Subscription (commercial source of truth)
        ↓
Phase-13 License (usage authorization, derived from subscription)
        ↓
SHRANIX installer (Tauri shell + this activation client)
        ↓
First launch → /activate activation screen
        ↓
POST /api/v1/activation/activate   (Phase-14 engine)
        ↓
Portal-auth login → server-side license ownership check →
Phase-13 device registration + activation slot claim →
signed token (RSA-2048) → secure local activation state
        ↓
ERP unlocked → periodic online revalidation (throttled)
```

**The server is the authority.** The installer is not a security boundary.
The Phase-14 engine (`backend/src/activation/`) consumes the Phase-13 engine
(`LicensesService`, `LicenseDevicesService`, `LicenseActivationsService`,
`LicenseValidationService`, `LicenseTokensService`) — nothing is duplicated.

## 2. Activation API (all public, rate-limited)

| Endpoint                           | Purpose                                          | Rate limit |
| ---------------------------------- | ------------------------------------------------ | ---------- |
| `POST /activation/activate`        | Online activation (primary)                      | 5/min      |
| `POST /activation/validate`        | Periodic revalidation                            | 30/min     |
| `POST /activation/trial`           | Continue trial (only if a Phase-12 trial exists) | 5/min      |
| `POST /activation/offline/request` | Exceptional offline recovery token               | 3/hour     |
| `POST /activation/offline/verify`  | Verify offline token locally                     | 20/min     |
| `GET /activation/public-key`       | RSA public key for client token verification     | 60/min     |
| `GET /activation/ping`             | Server availability probe                        | global     |
| `GET /activation/update`           | Update-channel metadata                          | 60/min     |

Every route is marked `@Public()` (both the JWT and CSRF global guards skip
it) and carries a tighter `@Throttle` than the global limit. Endpoints never
expose stack traces — errors map to controlled `reason` codes
(`LICENSE_NOT_FOUND`, `DEVICE_LIMIT_REACHED`, `LICENSE_REVOKED`, …) with
customer-safe messages.

## 3. Security model

- **Identity is always server-derived.** The activation screen collects
  customer portal credentials (email + password) and the license number. The
  server calls the existing `PortalAuthService.login()` (argon2 password,
  lockout after 5 failed attempts) and resolves the license **by
  customerId** — a cross-customer license returns 404, never revealing that
  it exists.
- **Client values are never trusted.** `customer_id`, `license_id`,
  `max_devices`, `status` and `expiry` are all ignored/recomputed server-side.
- **Idempotency.** Every activation carries a client-generated
  `activationReference`; Phase 13 dedupes identical references, so retries can
  never consume extra device slots.
- **Concurrency.** Phase 13's atomic SQL slot claim guarantees
  `active_devices < max_devices` even when two PCs activate simultaneously.
- **Tokens.** RSA-2048 signed (`SHRNXT1.<payload>.<signature>`). The private
  key never leaves the server (env override or the `license_keys` KV group).
  Verification checks signature, version, issuer, audience, expiry, JTI
  revocation **and live license status** — revoking/suspending a license
  immediately invalidates outstanding tokens.
- **Rate limiting.** Global throttler + per-route overrides on activation
  endpoints prevent brute-force/license probing.
- **No secrets in the installer.** No private keys, DB credentials, admin
  credentials or payment data ship with the app.

## 4. Device identity (STEP 8–9)

The client generates and persists a **device identity** combining a random
installation secret + coarse platform signal, plus a separate installation
id. The server receives only these values and stores **sha-256 hashes**.
No single hardware component is depended on, so an SSD/motherboard/RAM
replacement does not lock out a legitimate customer — device confidence is
resilient by design (Phase 15 will add advanced fingerprint policy).

## 5. Local activation state (STEP 12–14)

`frontend/src/lib/activation-state.ts` stores a signed token plus license
metadata in localStorage. It is **not** a security boundary:

- App launch → local state usable (token + license window valid) → start,
  then revalidate online **only when due** (default every 12 h, configurable
  via `revalidateHours`).
- Server unreachable → controlled grace: local state stays usable until token
  or license expiry (bounded by the server, never indefinite).
- Terminal verdicts (`LICENSE_REVOKED`, `LICENSE_EXPIRED`,
  `LICENSE_SUSPENDED`) clear local state immediately → user lands on
  `/activate`.

## 6. Recovery paths

- **Device limit reached** → friendly message with _Manage Devices_ /
  _Upgrade Plan_ / _Contact Support_; no device is ever deactivated
  automatically.
- **Device configuration changed** → re-activate (idempotent) or request a
  device transfer from the Customer Portal (`/portal/license`).
- **PC replacement / Windows reinstall** → deactivate the old device in the
  portal (history preserved) and activate the new PC; or use the
  Phase-13 transfer flow.
- **Offline** → `POST /activation/offline/request` issues a **bounded**
  signed offline token (default 7 days, configurable). It always expires —
  offline mode can never become an unlimited bypass. This is an exceptional
  recovery path, not the primary workflow.

## 7. Update mechanism (STEP 37)

`GET /activation/update?currentVersion=x` returns channel + latest/min
versions + download URL from server configuration (KV group `activation` or
env overrides). The desktop app shows a dismissible banner; actual download/
install is delegated to the Tauri updater (authenticated HTTPS, package
integrity verification). No arbitrary executables are downloaded from the
banner itself.

## 8. Configuration & environments (STEP 39–40)

KV group `activation` (table `shranix_gst_audit_settings`):

| Key                            | Default | Meaning                          |
| ------------------------------ | ------- | -------------------------------- |
| `offlineTtlDays`               | 7       | Offline token validity (bounded) |
| `trialEnabled`                 | false   | Show "Continue Trial" flow       |
| `trialTtlDays`                 | 14      | Trial token validity             |
| `revalidateHours`              | 12      | Online revalidation throttle     |
| `updateChannel`                | stable  | Update channel                   |
| `latestVersion` / `minVersion` | —       | Update metadata                  |
| `updateUrl`                    | —       | Download URL                     |

Environment overrides: `ACTIVATION_OFFLINE_TTL_DAYS`,
`ACTIVATION_TRIAL_ENABLED`, `ACTIVATION_REVALIDATE_HOURS`, `UPDATE_CHANNEL`,
`UPDATE_LATEST_VERSION`, `UPDATE_MIN_VERSION`, `UPDATE_URL`. Production
deployments must point the desktop `resolveApiBase()` (Tauri builds already
default to `http://localhost:4001/api/v1`) at the production API and use
HTTPS; the Tauri CSP already allows the production API/update hosts.

## 9. Installer build

```powershell
# Requires Rust toolchain + pnpm (not available in the CI sandbox)
powershell -ExecutionPolicy Bypass -File desktop/scripts/build-installer.ps1
```

This builds the frontend, bundles the Tauri shell and produces NSIS (`*.exe`)
and MSI installers (`desktop/src-tauri/target/release/bundle/`). Production
installers must be code-signed from a secure signing environment — the
private certificate never enters the repository. A clean-Windows install/
upgrade/repair/uninstall test pass (STEP 51) is required before declaring the
installer production-ready.

## 10. Testing

`backend/src/activation/activation.test.ts` — real-DB integration tests:
online activation happy path, cross-customer isolation (404), invalid
credentials, unknown license, device-limit enforcement, concurrent activation
race, idempotent duplicate activation, revalidation (valid/unknown/revoked),
bounded offline tokens + tamper rejection, public-key exposure, trial flow
with/without trial, update metadata, and ping. All 15 tests pass; the full
backend suite (Phase 1–14) passes with zero regressions.

## 11. Known limitations

- The real NSIS/MSI build + clean-machine test cannot run in this sandbox
  (no Rust toolchain) — `desktop/scripts/build-installer.ps1` is provided.
- Offline recovery returns a raw offline token for the user to save; a
  file-export/import offline flow is a Phase-14 polish item.
- The activation screen's "Continue Trial" requires an existing Phase-12
  trial subscription for the account.
