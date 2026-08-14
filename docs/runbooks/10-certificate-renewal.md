# Runbook 10 — Certificate Renewal

**Goal:** Renew TLS + code-signing certificates before expiry without downtime (17.8/17.12/17.26).

## TLS certificate (nginx)

1. **Check expiry** (alert at T-30d, 17.24):

   ```bash
   openssl s_client -connect api.shranix.in:443 -servername api.shranix.in </dev/null 2>/dev/null \
     | openssl x509 -noout -dates -enddate
   ```

2. **Renew** (certbot recommended):

   ```bash
   ssh "certbot renew --nginx" && ssh "nginx -t && nginx -s reload"
   ```

3. **Verify**: HTTPS + HSTS header + no mixed content (17.8):
   ```bash
   curl -sI https://api.shranix.in | grep -i "strict-transport-security"
   ```

## Code-signing certificate (Windows installer/updates, 17.12)

1. Renew the Authenticode / Tauri signing cert **from the HSM/KMS** — private key never leaves secure storage.
2. Re-import the new cert into the signing pipeline (HashiCorp Vault / Azure Key Vault / HSM).
3. Publish the new cert thumbprint to the release registry.
4. **Timestamping**: sign with RFC3161 timestamp so signatures survive cert expiry.
5. Verify a signed artifact: `signtool verify /pa /tw installer.exe`.

## Key rotation for the cert

- Old cert remains valid until its natural expiry — do not invalidate legitimately signed artifacts.
- Document both thumbprints in the security runbook appendix (15.6 key ring philosophy applies).

## Never

- Never store the private key in the repo or on build agents (17.12).
