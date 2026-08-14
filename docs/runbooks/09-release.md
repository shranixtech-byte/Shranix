# Runbook 09 — Release

**Goal:** Publish a software release through the controlled pipeline (17.13).
**Rule:** Production publishing requires authorization; a revoked release is never offered as an update (16.1).

## Pipeline (17.13)

```
Code → Build → Unit tests → Integration tests → Typecheck → Lint → Security scan
  → Build artifact → Sign → Checksum → Staging → Smoke test → Approval → Production release
```

## Steps

1. **Cut a tag** → `Release` workflow builds + pushes images (ci.yml gates: lint/typecheck/test/build/security).

2. **Create the release record** (Phase 16 registry):
   - `POST /releases` (status DRAFT) → upload package (checksum + signature metadata)
   - `POST /releases/:id/publish` (requires `release.publish` permission)
   - Set min/recommended/blocked versions + critical flag (16.1)

3. **Verify update metadata** from a client perspective:

   ```bash
   curl -fsS -H "authorization: Bearer $CLIENT_TOKEN" https://api.shranix.in/v1/activation/update
   ```

   → expect `UPDATE_AVAILABLE` / correct `latestVersion` / `checksum` / `signatureMetadata`.

4. **Staging smoke test** — install the staged package on a clean staging machine, validate activation + update path.

5. **Approval** — release manager approves publish to production.

6. **Production publish** → monitor update adoption + error rates (16.2 update KPIs).

## Deprecation / revocation

- Deprecate: stops being _recommended_.
- Revoke: never offered as a valid update; download tokens for it fail (Phase 16).
- Always record reason + audit (16.9).

## Never

- Never publish without the checksum + signature metadata.
- Never overwrite an immutable published artifact (17.19).
