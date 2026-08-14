# Runbook 11 — Key Rotation (License Signing Keys)

**Goal:** Rotate RSA license-signing keys with zero downtime and no mass invalidation (15.6).

## Background

The token service uses a **key ring**: current key (signing) + retired verification keys.
Tokens carry `kid` — verification looks up the key by kid. Old tokens keep validating
after rotation until their natural expiry.

## Steps

1. **Generate the new key** (server-side only, never committed):

   ```bash
   openssl genrsa -out signing-key-2.pem 4096
   # extract kid = short hash of the public key
   openssl rsa -in signing-key-2.pem -pubout | openssl dgst -sha256 | cut -c1-16
   ```

2. **Load the new key into the server secret manager** (`LICENSE_SIGNING_KEY` + `LICENSE_SIGNING_KEY_ID`),
   keeping the old key configured as a verification key.

3. **Add the new kid to the key ring** (admin endpoint `POST /licenses/keys/rotate` or config) —
   server starts signing with the new kid; old kid remains valid for verification.

4. **Verify migration** — a token signed before rotation still validates; new tokens carry the new kid:

   ```bash
   # test: old offline token still accepted on its bound device
   # test: new activation issues tokens with kid=new
   ```

5. **Retire the old key** after the max token lifetime window (e.g., 30d refresh / offline window).

## Emergency rotation (key compromise) — see Runbook 06 §Key compromise procedure (15.50)

1. Stop issuing with the compromised key **immediately**.
2. Generate replacement, publish new kid.
3. Maintain old-key verification window (required for graceful migration).
4. Reissue/revoke affected tokens.
5. Audit events + notify affected customers where appropriate.

## Never

- Never invalidate all tokens at once during normal rotation (15.6).
- Never delete license data during rotation (15.50).
- Never put private keys in git, logs, frontend, or customer responses (15.7).
