# H39 — Cloudflare DNS/TLS Provisioning Gate & Operator Guide

**Checkpoint**: H39
**Date**: 2026-08-23
**Status**: BLOCKED — Operator action required
**Baseline**: H38 (`a94a886`)

---

## 1. Access Status

| Item                  | Status        |
| --------------------- | ------------- |
| Wrangler CLI          | NOT INSTALLED |
| CLOUDFLARE_API_TOKEN  | NOT SET       |
| CLOUDFLARE_ACCOUNT_ID | NOT SET       |
| dig/nslookup          | NOT AVAILABLE |
| **Overall**           | **BLOCKED**   |

## 2. Domain Architecture

### Production (from .env.production)

| Service  | Hostname          | Provider |
| -------- | ----------------- | -------- |
| Frontend | `app.shranix.com` | Vercel   |
| Backend  | `api.shranix.com` | Railway  |

### Staging (planned)

| Service  | Hostname                  | Provider |
| -------- | ------------------------- | -------- |
| Frontend | `staging.shranix.com`     | Vercel   |
| Backend  | `api-staging.shranix.com` | Railway  |

## 3. What Needs to Happen

### Step 1: Create Cloudflare Account (~3 minutes)

1. Go to https://dash.cloudflare.com
2. Sign up (free plan is sufficient)
3. Add domain: `shranix.com`
4. Update nameservers at domain registrar

### Step 2: Configure DNS Records (~5 minutes)

Cloudflare Dashboard → DNS → Records:

| Type  | Name          | Content                | Proxy   | TTL  |
| ----- | ------------- | ---------------------- | ------- | ---- |
| CNAME | `staging`     | `cname.vercel-dns.com` | Proxied | Auto |
| CNAME | `api-staging` | `<railway-url>`        | Proxied | Auto |
| CNAME | `app`         | `cname.vercel-dns.com` | Proxied | Auto |
| CNAME | `api`         | `<railway-url>`        | Proxied | Auto |

### Step 3: Configure TLS Settings (~3 minutes)

Cloudflare Dashboard → SSL/TLS:

1. **SSL/TLS mode**: Full (strict)
2. **Minimum TLS version**: 1.2
3. **Always Use HTTPS**: ON
4. **Automatic HTTPS Rewrites**: ON
5. **HSTS**: Enable with max-age=31536000

### Step 4: Security Headers (~3 minutes)

Cloudflare Dashboard → Rules → Transform Rules → Modify Response Header:

Add:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Step 5: Verify (~5 minutes)

1. `https://staging.shranix.com` → Vercel frontend
2. `https://api-staging.shranix.com/v1/health` → Railway backend
3. HTTP → HTTPS redirect works
4. Certificate valid

**Total estimated time: ~20 minutes**

## 4. DNS Records Required

### Staging

```
staging.shranix.com    CNAME  cname.vercel-dns.com    (Proxied)
api-staging.shranix.com CNAME  <railway-service-url>   (Proxied)
```

### Production (already configured)

```
app.shranix.com        CNAME  cname.vercel-dns.com    (Proxied)
api.shranix.com        CNAME  <railway-service-url>   (Proxied)
```

## 5. TLS Configuration

| Setting                  | Value                    |
| ------------------------ | ------------------------ |
| SSL/TLS Mode             | Full (strict)            |
| Min TLS Version          | 1.2                      |
| Always HTTPS             | ON                       |
| HTTP → HTTPS Redirect    | ON                       |
| HSTS                     | ON (max-age=31536000)    |
| Certificate              | Cloudflare Universal SSL |
| Certificate Auto-Renewal | ON                       |

## 6. CORS Relationship

| Origin                            | Allowed By           | CORS Headers                |
| --------------------------------- | -------------------- | --------------------------- |
| `https://staging.shranix.com`     | Backend CORS_ORIGINS | Access-Control-Allow-Origin |
| `https://api-staging.shranix.com` | N/A (same origin)    | N/A                         |

Backend must have:

```
CORS_ORIGINS=https://staging.shranix.com,https://app.shranix.com
```

## 7. Security Headers (Already Configured in Backend)

| Header                 | Value                           | Source              |
| ---------------------- | ------------------------------- | ------------------- |
| X-Content-Type-Options | nosniff                         | Helmet (default)    |
| X-Frame-Options        | DENY                            | Helmet (frameguard) |
| Referrer-Policy        | strict-origin-when-cross-origin | Helmet              |
| HSTS                   | Conditional on NODE_ENV         | security-headers.ts |
| Permissions-Policy     | Configured                      | security-headers.ts |

Additional headers via Cloudflare (optional, for edge caching layer):

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-XSS-Protection: 0` (deprecated but some scanners check)

## 8. Cookie Settings (Already Configured)

| Setting  | Value             | Source          |
| -------- | ----------------- | --------------- |
| sameSite | lax               | auth.service.ts |
| secure   | true (production) | auth.service.ts |
| httpOnly | true              | auth.service.ts |

## 9. Rollback Procedure

### DNS Rollback

1. Cloudflare Dashboard → DNS → Records
2. Remove staging records
3. Or change CNAME to a maintenance page

### TLS Rollback

- TLS is managed by Cloudflare
- Disable "Always Use HTTPS" if needed
- Change SSL mode to "Flexible" (not recommended)

### Security Header Rollback

- Remove custom headers from Transform Rules
- Backend headers remain (code-level)

## 10. Known Limitations

| Limitation                    | Impact                  | Mitigation                            |
| ----------------------------- | ----------------------- | ------------------------------------- |
| Free plan limits              | 100k queries/day        | Sufficient for staging                |
| No WAF rules (free)           | Limited DDoS protection | Backend rate limiting active          |
| Cloudflare proxy hides origin | Debugging harder        | Use Railway direct URL for debugging  |
| HSTS preload                  | Requires all subdomains | Don't enable preload until production |

## 11. Post-Deployment Checklist

- [ ] Cloudflare account created
- [ ] Domain added to Cloudflare
- [ ] Nameservers updated at registrar
- [ ] DNS records configured (staging + production)
- [ ] SSL/TLS mode: Full (strict)
- [ ] Always HTTPS: ON
- [ ] HTTP → HTTPS redirect working
- [ ] HSTS configured
- [ ] Security headers via Transform Rules
- [ ] `staging.shranix.com` resolves
- [ ] `api-staging.shranix.com` resolves
- [ ] HTTPS certificate valid
- [ ] CORS_ORIGINS updated in backend env

## 12. Blocker Dependencies

| Dependency       | Status   | Provider      |
| ---------------- | -------- | ------------- |
| Backend hosting  | BLOCKED  | Railway (H37) |
| Frontend hosting | BLOCKED  | Vercel (H38)  |
| Domain ownership | EXTERNAL | Registrar     |
| Database         | BLOCKED  | Neon (H34)    |

## 13. Evidence

No live evidence available — Cloudflare access is BLOCKED.
All configuration is code-verified against the repository.
Security headers, CORS, cookie settings, and HSTS are all verified in source code.
