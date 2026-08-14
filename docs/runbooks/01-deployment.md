# Runbook 01 — Deployment

**Goal:** Ship a tested build to staging or production without downtime.
**Preconditions:** CI passed (tests, typecheck, lint, build, security scan). Tagged release exists.

## Steps

1. **Freeze a release tag**

   ```bash
   git tag vX.Y.Z && git push origin vX.Y.Z
   ```

   The `Release` GitHub Action builds + pushes `ghcr.io/...-backend` / `-frontend` images and creates a GitHub Release.

2. **Choose environment** — never deploy a staging image to production and vice versa (17.2).

3. **Trigger deploy** (protected: requires approval for production)

   ```bash
   # GitHub UI → Actions → Deploy → Run workflow
   # environment: staging | production
   # tag: the vX.Y.Z tag
   ```

4. **Apply migrations** — always _before_ restarting the app (see Runbook 03):

   ```bash
   ssh "cd $APP_DIR && ./scripts/run-migrations.sh production"
   ```

5. **Smoke test after deploy**

   ```bash
   curl -fsS https://api.shranix.in/v1/health        # 200
   curl -fsS https://api.shranix.in/v1/health/ready  # status: ready
   curl -fsS https://portal.shranix.in/               # 200
   ```

6. **Verify a real license validation** (dev license reference):

   ```bash
   curl -fsS -X POST https://api.shranix.in/v1/activation/validate \
     -H 'content-type: application/json' \
     -d '{"licenseReference":"SHR-LIC-XXXX","deviceId":"smoke-test"}'
   ```

7. **Watch metrics** for 30 min: error rate, latency, activation failures (17.22/17.24).

## Success criteria

- Health endpoints 200/ready
- No new 5xx spikes
- License validation + one activation succeed
- Logs show no `[CONFIG]` boot errors (env validation passed, 17.3)

## Escalation

Any step fails → **Runbook 02 (Rollback)**.
