# Phase 15 — Security / Anti-Piracy Engine

> **Status:** core engine implemented · hardening + event engine + tests green ·
> production gate items (external infra) documented below
> **Branch:** `main` · **Commit:** (Phase 15 work on top of `5d44506`)

Phase 15 strengthens Phase 12 (Subscription), Phase 13 (License) and Phase 14
(Installer + Online Activation) **without rebuilding them**. The server remains
the ultimate licensing authority; client-side checks are defense-in-depth only.

**Anti-piracy is never destructive.** No customer data is deleted, no
databases are corrupted, no hardware is permanently banned on a single signal,
and no ransomware-like behavior is introduced. Legitimate customers always
have a recovery path (online verification → device transfer → admin review).

---

## 1. Security audit results (15.1)

Audit of the Phase 12–14 codebase (auth, license, activation, tokens, devices,
webhooks, headers, secrets, local state):

| Area                                     | Verdict                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| RSA-2048 signed tokens (Phase 13)        | ✅ IMPLEMENTED — asymmetric, versioned                                                    |
| Token key rotation / kid                 | ❌ MISSING → **added in Phase 15**                                                        |
| Algorithm-confusion protection           | ⚠️ PARTIALLY — hardcoded alg, no explicit policy → **hardened**                           |
| Token nbf / not-before                   | ❌ MISSING → **added**                                                                    |
| Offline token installation binding       | ❌ MISSING → **added**                                                                    |
| Device registration (hashed identifiers) | ✅ IMPLEMENTED                                                                            |
| Device cloning detection                 | ❌ MISSING → **added**                                                                    |
| Device-confidence model                  | ❌ MISSING → **added**                                                                    |
| Device-limit atomicity                   | ✅ IMPLEMENTED (SQL guard)                                                                |
| Customer isolation (404, no leak)        | ✅ IMPLEMENTED + tested                                                                   |
| Security event engine                    | ❌ MISSING → **added**                                                                    |
| Security dashboard                       | ❌ MISSING → **added** (API)                                                              |
| Clock-rollback protection                | ❌ MISSING → **added** (server + client)                                                  |
| Payment webhook signature + idempotency  | ✅ IMPLEMENTED → **+ timestamp window**                                                   |
| Security headers / CORS                  | ✅ IMPLEMENTED (helmet, origin allowlist)                                                 |
| Secret hygiene (git, env)                | ✅ CLEAN — no keys/creds committed                                                        |
| Local activation state                   | ⚠️ localStorage (documented non-boundary) → **integrity hash + rollback detection added** |
| Rate limiting (activation/portal)        | ✅ IMPLEMENTED (global + per-route)                                                       |
| Debug/dev bypasses in production         | ✅ none found in source; QA scripts use dev defaults (see accepted risks)                 |

---

## 2. Threat model (15.2)

| #   | Threat                           | Expected                                        | Control                                                           |
| --- | -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Copy installation to another PC  | New device needs valid activation               | Device/installation registration per license                      |
| 2   | Copy local activation file       | Copied state must not authorize another install | Token binding + server revalidation; integrity hash flags edits   |
| 3   | Modify local license expiry      | Rejected                                        | Server/token validation; tampered local state forces revalidation |
| 4   | Modify license token             | Crypto verification fails                       | RSA signature + kid resolution                                    |
| 5   | Forge activation response        | Signature fails                                 | RSA public-key verification                                       |
| 6   | Replay activation request        | Deduplicated / rejected                         | Idempotency key (`activationReference`)                           |
| 7   | Exceed device limit              | Server rejects                                  | Atomic SQL slot claim (`active_devices < max_devices`)            |
| 8   | Customer A uses B's license      | 403/404, no existence leak                      | Ownership check by `customerId` → 404                             |
| 9   | Revoked license via cached state | Eventually requires server validation           | Terminal verdicts clear local state; 12 h revalidation            |
| 10  | Bypass activation gate           | Critical ops stay server-authorized             | Server-side license/entitlement checks on all flows               |

---

## 3. Security architecture (15.3) — layered

1. Authentication (portal credentials / JWT)
2. Authorization (RBAC + permissions)
3. Subscription validation (Phase 12 = commercial truth)
4. License validation (Phase 13)
5. Signed token validation (RSA-2048 + kid + nbf)
6. Device/installation binding (hashed identity)
7. Server-side entitlement checks
8. Integrity validation (local state hash + clock reference)
9. Rate limiting (global + per-route)
10. Security event engine + audit

No single layer is the only control.

---

## 4. What Phase 15 added

### 4.1 License token hardening (15.4–15.6, 15.36)

`backend/src/license/services/license-tokens.service.ts`

- **Key rotation with kid** — a key ring (`current` + up to 3 `previous`
  verification keys) persisted in the `license_keys` KV group. New tokens are
  signed with the current key and carry `kid`; verification resolves the
  public key **by kid**, so tokens issued under a retired key keep validating
  (graceful migration — rotation never invalidates legitimate tokens).
  `rotateSigningKey()` retires the current key, generates the next, and emits
  a `KEY_ROTATED` security event. Admin endpoint:
  `POST /api/v1/security/keys/rotate` (see §5).
- **Algorithm whitelist** — `ALLOWED_ALGORITHMS = ['rsa-sha256']` is a fixed
  server policy. The verification algorithm is **never** taken from token
  metadata; a token declaring `none`, `HS256`, etc. is rejected
  (`INVALID_TOKEN` event). `alg` is embedded only as an audit hint.
- **nbf (not-before)** — issued on every token and enforced at verification.
- **Unknown kid** → rejected (`INVALID_TOKEN`, HIGH).
- **Offline token device binding** — `issueOfflineLicenseToken` embeds
  `sha-256(deviceIdentifierHash)` as `dev`; `verifyOfflineLicenseToken` rejects
  a token presented with a different device (`DEVICE_MISMATCH`, HIGH). Copying
  an offline token to another installation fails locally.
- Version policy: v2 tokens issued; v1 tokens still verifiable.

### 4.2 Security event engine (15.30–15.32)

New `backend/src/security/` module + `shranix_security_events` table
(migration `0025_kind_gladiator`, both SQLite and PostgreSQL schemas).

- Append-only log; new facts are new rows.
- Event types: `INVALID_LICENSE`, `INVALID_TOKEN`, `TOKEN_TAMPER`,
  `SIGNATURE_FAILURE`, `ACTIVATION_LIMIT_REACHED`, `DUPLICATE_ACTIVATION`,
  `REPLAY_DETECTED`, `DEVICE_MISMATCH`, `CLOCK_ROLLBACK`,
  `RATE_LIMIT_TRIGGERED`, `UNAUTHORIZED_LICENSE_ACCESS`,
  `UNAUTHORIZED_DEVICE_ACCESS`, `ADMIN_OVERRIDE`, `INTEGRITY_FAILURE`,
  `UPDATE_SIGNATURE_FAILURE`, `SUSPICIOUS_ACTIVATION`, `KEY_ROTATED`,
  `LICENSE_REVOKED_EMERGENCY`, `WEBHOOK_SIGNATURE_FAILURE`.
- Severity: `INFO | LOW | MEDIUM | HIGH | CRITICAL`; configurable.
- Response policy levels (15.34): 1 log-only · 2 require online validation ·
  3 require reauthentication · 4 require device recovery · 5 admin review ·
  6 license suspension (**only when authorized and justified — never
  automatic**).
- **Safe metadata only** — `password`/`token`/`privateKeyPem`/`machine`/
  `fingerprint` keys are masked; IPs are stored as masked prefixes
  (`203.0.113.0/24`); references are masked (`SHR-LIC-****`).
- Admin API (permission `security.view`):
  - `GET /api/v1/security/events` — filters: severity, eventType, customerId,
    licenseId, deviceRef, source, date range, search, pagination
  - `GET /api/v1/security/events/summary?days=7` — by-severity counts, top
    types, recent critical/high
  - `GET /api/v1/security/events/types`

### 4.3 Event wiring (15.14, 15.16, 15.29, 15.34)

- `ActivationService.activate` → cross-customer access records
  `UNAUTHORIZED_LICENSE_ACCESS` (HIGH) while still returning a generic 404;
  device-limit rejections record `ACTIVATION_LIMIT_REACHED`; cloned
  installations record `SUSPICIOUS_ACTIVATION` (HIGH).
- `LicenseTokensService.verifyToken` → `TOKEN_TAMPER`, `SIGNATURE_FAILURE`,
  `INVALID_TOKEN`, `INVALID_LICENSE` events with the failing stage.
- `LicenseValidationService` → `CLOCK_ROLLBACK` (MEDIUM) when a device's stored
  `lastValidationAt` is in the future (roll-forward signal).
- `BillingPaymentsService.webhook` → `WEBHOOK_SIGNATURE_FAILURE` (HIGH) and
  `REPLAY_DETECTED` (MEDIUM) on out-of-window timestamps.

### 4.4 Device confidence + cloning (15.13, 15.14)

`ActivationService.deviceConfidence()` — strong signal = installation-bound
identity; supporting signals (device hash, fingerprint hash, platform) raise
confidence (`high | medium | low`), returned as `deviceConfidence` in the
activation response. A single changed hardware component **never** invalidates
a device. `detectDeviceCloning()` flags the same installation secret
registered under two different device identities on one license.

### 4.5 Clock-rollback protection (15.9)

- Server returns `serverTime` on activate/revalidate/offline-verify.
- Frontend stores `lastServerTime`; `hasClockRollback()` detects local time
  behind the server reference by > 15 min and forces online revalidation.
- Server records `CLOCK_ROLLBACK` when a device previously validated with a
  clock ahead of the server.

### 4.6 Local activation integrity (15.8)

`frontend/src/lib/activation-state.ts` now stores a sha-256 over the
security-relevant fields + device context. Casual edits (expiresAt, status,
token) are detected and force online revalidation. No client secret exists —
this is cosmetic defense-in-depth; the server remains the authority.

### 4.7 Webhook hardening (15.22)

Payment webhooks already verified HMAC signature (timing-safe compare), event
type, amount + currency reconciliation and idempotency. Phase 15 added a
**timestamp window** check (rejects stale/far-future events, i.e. replay) and
signature-failure security events. Webhook endpoints are signature-authenticated,
never activated by an unverified webhook.

### 4.8 Secret scanning (15.28)

Scanned tracked files: **no private keys, no PEM/keystore files, no AWS keys,
no real credentials in source or `.env.example`** (all `change_me` placeholders).
`.gitignore` covers `.env*`, `*.pem`, `*.key`, `secrets/`, `credentials/`.
Only `.env.example` and `deployment/.env.production.template` are tracked.

---

## 5. Key management & rotation

- Private key NEVER leaves the server: env override
  (`LICENSE_TOKEN_PRIVATE_KEY` / `LICENSE_TOKEN_PUBLIC_KEY`) or the
  `license_keys` KV group. Never in frontend, installer, logs, git or API
  responses.
- Rotation:
  ```
  POST /api/v1/licenses/keys/rotate   (permission: license.manage)   (permission: security.manage)
  ```
  Retires the current key, generates the next, keeps previous verification
  keys. In-app rotation is disabled while env-configured keys are in use
  (that deployment manages keys externally / via KMS).
- **Key-compromise procedure (15.50)** — see §7.

---

## 6. Testing (15.48, 15.53)

New real-DB test files (all passing; full backend suite **42 files / 400 tests
green, zero regressions**):

- `backend/src/security/security-events.test.ts` — record/severity/response
  level, masked IP, metadata sanitization, filters, dashboard summary.
- `backend/src/license/services/license-tokens.security.test.ts` — v2 kid
  tokens, tamper rejection + event, algorithm confusion (`none`/`HS256`),
  unknown kid, future nbf, **key rotation** (old token still verifies after
  rotation), offline device binding + `DEVICE_MISMATCH`, revoked-license token
  rejection, device-hash binding (raw value never in payload).
- `backend/src/activation/activation.test.ts` (+1) — device confidence + cloned
  installation flagging.

Security test matrix status (15.48): modified expiry/status/max_devices/
customer_id/license_id/device_id → rejected server-side (client values never
trusted); forged/tampered/expired/wrong-issuer/wrong-audience/wrong-kid tokens
→ rejected; algorithm confusion → rejected; replay → idempotency; concurrent
activation → device-limit race safe; cross-customer → 404; webhook spoof →
signature fails; offline token copying → device binding fails; local state
tampering → integrity hash forces revalidation.

---

## 7. Incident response (15.49) & key compromise (15.50)

Documented procedures live in `docs/` alongside this file; summary:

- **Compromised license/device/account** → verify identity → suspend only when
  justified (never automatic) → revoke outstanding tokens → record
  `LICENSE_REVOKED_EMERGENCY` / `ADMIN_OVERRIDE` events with actor, reason,
  before/after state.
- **Compromised signing key**:
  1. Stop issuing with the compromised key.
  2. Generate a replacement (rotation endpoint).
  3. Publish the new key id.
  4. Keep the old-key verification window (retired keys remain verifiable).
  5. Reissue affected tokens.
  6. Revoke compromised tokens where necessary.
  7. Record `KEY_ROTATED` audit events.
  8. Notify affected customers where appropriate.
     Never delete license data.
- **Malicious update** → never execute unsigned downloads; banner delegates to
  the Tauri updater (HTTPS + integrity verification).

---

## 8. Recovery (15.51)

Legitimate customers changing SSD/motherboard/Windows/reinstalling/PC
replacement always have a path: online verification → customer authentication
→ device transfer → admin review. Security controls **escalate**, they never
permanently lock out based on weak or single signals.

---

## 9. Accepted risks / remaining production-gate items

Implemented in this phase and verified: threat model, security architecture,
token hardening, key rotation, private-key protection, local activation
protection, clock-rollback protection, replay protection, activation/device
security, customer isolation, admin security, API security, rate limiting,
webhook security, secret scanning, security event engine, security dashboard
API, offline security, debug-bypass audit.

**Requires external infrastructure / deployment (documented, not run here):**

- **Code signing (15.26/15.27)** — production installer/exe/update signing
  needs a real certificate from a secure signing environment. Private certs
  never enter the repo.
- **KMS/HSM (15.7)** — currently env/KV storage with hardened permissions;
  move to a dedicated secret manager for production.
- **SAST/container scans (15.46)** — run gitleaks/trivy/npm-audit in CI before
  production (secret scan above was done locally).
- **QA scripts** (`scripts/*.mjs`) contain dev-default credentials
  (`admin@shranix.com`/`admin123`) — local-only tooling, acceptable; do not
  ship them in production images.
- **Security dashboard UI** — the API is live; the admin screen can consume
  `/api/v1/security/events*`.
- **Security alerts (15.33)** — event thresholds + notifications via the
  existing communication engine are wired conceptually (severity/response
  levels); threshold config + delivery are a follow-up.
- **Live dev/prod DB** — apply migration `0025_kind_gladiator` to existing
  databases:
  ```bash
  cd database && pnpm db:migrate     # or: node sync-schema.mjs equivalent
  ```
  Until applied, the event engine degrades gracefully (best-effort, never
  blocks business flows).

**Production gate (15.55) checklist status:** ✅ no critical/high findings in
code audit · ✅ no private keys in repo · ✅ no test/master activation keys ·
✅ no dev bypasses/debug endpoints in source · ✅ no credentials in source ·
✅ no unrestricted CORS · ⏳ unsigned production update/installer (needs code
signing infra) · ⏳ real deployment validation (HTTPS, TLS-terminated API for
the desktop client).
