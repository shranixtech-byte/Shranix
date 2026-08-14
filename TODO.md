# TODO / Working Backlog

> Status of the current development cycle. Completed phases are tracked in the [CHANGELOG.md](./CHANGELOG.md).

## Phase 15 — Security / Anti-Piracy Engine

- [x] Security audit of Phase 12–14 (results in `docs/PHASE15_SECURITY.md`)
- [x] Threat model + layered security architecture documented
- [x] License token hardening: key rotation (kid), algorithm whitelist, nbf, offline device binding
- [x] Security event engine + `shranix_security_events` table (migration `0025_kind_gladiator`) + dashboard API
- [x] Device confidence + installation-clone detection
- [x] Clock-rollback protection (server `serverTime` + client detection + integrity hash)
- [x] Webhook timestamp/replay hardening
- [x] Secret scan (clean) + .gitignore verification
- [x] Tests: security events, token hardening, cloning/confidence (400 total green)
- [ ] Apply migration `0025_kind_gladiator` to existing dev/prod DBs
- [ ] Security-alert thresholds + notification delivery (via communication engine)
- [ ] Security dashboard UI consuming `/security/events*`
- [ ] Production code-signing + KMS/HSM + CI SAST (external infra)

## Phase 16 — Central License Server & Commercial Infrastructure

- [x] Release/version registry: `software_releases`, `release_packages`, `release_channels`, `version_compatibility` (migration `0026`)
- [x] Release lifecycle (DRAFT→PUBLISHED→REVOKED) + publish/revoke permission separation
- [x] Version policy: min/recommended/blocked/critical verdicts (UPDATE_REQUIRED / VERSION_BLOCKED / …)
- [x] Channel isolation + customer-specific releases
- [x] `GET /activation/update` resolves from registry (backward-compat KV fallback)
- [x] Central KPIs (commercial/license/security/update) + 7/30/90-day trends
- [x] Central admin API: `/central/kpis`, `/trends`, `/search`, `/system-health`
- [x] Tests: releases (9) + central KPIs (6) — 415 total green
- [x] Seed `release.*` permissions + admin role mapping (idempotent seed service)
- [x] Apply migrations `0025` + `0026` to dev DB via `drizzle-kit migrate` (tracking drift repaired)
- [x] Authenticated download hosting: HMAC short-lived tokens, revoked-never-downloadable, customer-specific eligibility, checksum/signature preserved
- [x] KPI caching (60 s TTL, data-only) + correctness tests
- [ ] Production code-signing cert/HSM + CDN/object-storage hosting (external infra)

## Phase 17 — Production Deployment, DevOps & Go-Live Engine

- [x] Complete system audit (17.1) — implemented/missing/risk/external mapped
- [x] Frontend test failures fixed: `krushi-bill-template` badge regression → **130/130 green** (17.29)
- [x] Environment separation (dev/staging/prod) + zod fail-fast validation + production secret guards (17.2/17.3/17.4)
- [x] Request ID / correlation ID middleware + `errorId` on 5xx responses + log correlation (17.23/17.25)
- [x] Rate limiting behind proxy (17.26) — ThrottlerBehindProxyGuard global
- [x] CI security job: gitleaks + `scripts/secret-scan.sh --history` + dependency audit + semgrep (17.14/17.15/17.17)
- [x] Dependency audit (17.16): fixed multer 2.2.0, xlsx 0.20.3 (SheetJS CDN), drizzle-orm 0.45.2, react-router 7.18.2, qs 6.15.2; dev-only risks documented
- [x] 13 production runbooks (`docs/runbooks/`) — deploy/rollback/migration/backup/restore/security/license/payment/release/cert/key-rotation/recovery/outage (17.41)
- [x] Customer-safe status page + `GET /health/status` (17.42)
- [x] Full validation: backend 433 + frontend 130 tests green, typecheck/lint/build clean, secret scan clean (17.47)
- [ ] Production TLS + code-signing certs (HSM/KMS), DNS, object storage/CDN — external infra
- [ ] Clean-Windows machine test + load test + backup-restore drill (staging)
- [ ] vitest 3.x upgrade (dev-only advisory, staged)

## Current cycle

### Sales module phase-2 (Delivery Challans — transport & e-way bill)

- [x] DB migration `0006_dc_phase2_transport_eway` (vehicle type, e-way bill, transport details, totals, addresses)
- [x] Backend: Delivery Challan transport fields, partial/full dispatch validation
- [x] Backend: auto numbering (`DC-####`), `next-number` preview endpoint
- [x] Backend: Quotation → Order → Challan → Invoice conversion service
- [x] Backend: Quotation revisions, finalize, submit-for-approval, send-to-customer endpoints
- [x] Frontend: quotation form, sales order form, delivery challan form, conversion modal
- [x] Unit tests for conversion + challan + reports services (25 passing)
- [ ] Frontend wiring QA — routes/sidebar review for the new sales screens
- [ ] E2E test coverage for the conversion flow

## Repository / DX

- [x] Move dev documents (reports/, planning/, prompts/) into `archive/`
- [x] Remove dev databases from version control
- [x] Complete `.env.example`
- [x] Contribution, security & conduct docs
- [x] GitHub issue/PR templates
- [ ] Wire GitHub Actions labels (`.github/labels.yml`)
- [ ] Add Dependabot config for automated dependency updates
- [ ] Publish initial release + tag `v1.0.0`

## Known limitations (see also DEPLOYMENT.md → Troubleshooting)

- `backend/test/auth.e2e.spec.ts` requires a live database — not runnable in CI without a DB service.
- ESLint reports I/O errors on Windows (CI runs on Ubuntu where it passes).
- S3/MinIO storage adapters require additional npm packages to be installed.
- Email/SMS/Push notification providers require third-party credentials to activate.
