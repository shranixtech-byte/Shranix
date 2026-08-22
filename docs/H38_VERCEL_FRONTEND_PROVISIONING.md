# H38 — Vercel Frontend Provisioning Gate & Operator Guide

**Checkpoint**: H38
**Date**: 2026-08-23
**Status**: BLOCKED — Operator action required
**Baseline**: H37 (`77a1de7`)

---

## 1. Access Status

| Item         | Status                          |
| ------------ | ------------------------------- |
| Vercel CLI   | NOT INSTALLED                   |
| VERCEL_TOKEN | NOT SET                         |
| vercel.json  | NOT PRESENT (auto-detect works) |
| **Overall**  | **BLOCKED**                     |

## 2. Frontend Architecture

| Feature    | Value                                      |
| ---------- | ------------------------------------------ |
| Framework  | React 19 + Vite                            |
| Type       | SPA (Single Page Application)              |
| Routing    | react-router-dom                           |
| State      | Redux Toolkit + Zustand                    |
| UI         | Radix UI + Tailwind                        |
| PWA        | vite-plugin-pwa (service worker, manifest) |
| Build      | `tsc && vite build`                        |
| Output     | `frontend/dist/` (25MB)                    |
| Port (dev) | 4000 (strictPort)                          |
| API proxy  | `/api` → `localhost:4001`                  |

## 3. What Needs to Happen

### Step 1: Create Vercel Account (~2 minutes)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Verify email

### Step 2: Import Project (~3 minutes)

1. Click "Add New Project"
2. Import `shranixtech-byte/Shranix`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install --frozen-lockfile`

### Step 3: Configure Environment Variables (~3 minutes)

Vercel Dashboard → Project → Settings → Environment Variables:

```
# Staging
VITE_API_URL=https://api-staging.yourdomain.com/api/v1
NODE_ENV=production

# Production (when ready)
VITE_API_URL=https://api.yourdomain.com/api/v1
```

### Step 4: Configure Domains (~5 minutes)

Vercel Dashboard → Project → Settings → Domains:

- Add: `staging.yourdomain.com` (staging)
- Add: `www.yourdomain.com` (production)

Configure DNS CNAME records at Cloudflare (H39).

### Step 5: Deploy (~5 minutes)

1. Push to `main` → Vercel auto-deploys
2. Or use Vercel CLI: `vercel --prod`
3. Wait for build to complete
4. Check: `https://staging.yourdomain.com`

**Total estimated time: ~15 minutes**

## 4. Environment Variables

| Variable       | Required | Purpose         | Secret? |
| -------------- | -------- | --------------- | ------- |
| `VITE_API_URL` | Yes      | Backend API URL | No      |
| `NODE_ENV`     | Yes      | production      | No      |

**Note**: `VITE_` prefix means Vite inlines these at build time. Changing them requires a redeploy.

## 5. SPA Routing

Vercel automatically handles SPA routing for Vite projects:

- All routes fall back to `index.html`
- No manual vercel.json rewrite rules needed
- Direct URL navigation works (e.g., `/dashboard`, `/login`)

## 6. Build Configuration

### vite.config.ts highlights:

- `envDir`: Project root (monorepo support)
- Manual chunks: vendor, ui, state
- PWA: service worker, offline support
- Sourcemaps: enabled
- Port: 4000 (strict, dev only)

### Build output:

- `dist/index.html` — SPA entry
- `dist/assets/` — JS/CSS bundles
- `dist/manifest.json` — PWA manifest
- `dist/sw.js` — Service worker
- Total: ~25MB

## 7. Security Controls

| Control              | Status                                    |
| -------------------- | ----------------------------------------- |
| No hardcoded secrets | ✅ Verified                               |
| URL validation       | ✅ `resolveApiBase()` validates format    |
| Safe fallbacks       | ✅ localhost for desktop, /api/v1 for web |
| CSP                  | Configured via Vercel headers or meta     |
| CORS                 | Handled by backend                        |
| Authentication       | JWT via backend, tokens in memory         |

## 8. CORS / Backend Integration

The frontend connects to the backend via:

1. **Development**: Vite proxy `/api` → `localhost:4001`
2. **Staging**: `VITE_API_URL=https://api-staging.yourdomain.com/api/v1`
3. **Production**: `VITE_API_URL=https://api.yourdomain.com/api/v1`

Backend CORS must allow:

```
CORS_ORIGINS=https://staging.yourdomain.com,https://www.yourdomain.com
```

## 9. Rollback Procedure

### Vercel Rollback

1. Vercel Dashboard → Deployments
2. Select previous successful deployment
3. Click "Promote to Production"

### Configuration Rollback

1. Revert `VITE_API_URL` to previous value
2. Redeploy (Vite inlines env vars at build time)

### No Database Rollback Needed

Frontend has no direct database access.

## 10. Known Limitations

| Limitation                     | Impact                       | Mitigation                    |
| ------------------------------ | ---------------------------- | ----------------------------- |
| VITE_API_URL baked at build    | Env change requires redeploy | Use domain-based routing      |
| No server-side rendering       | SEO limited for public pages | Acceptable for ERP            |
| 25MB bundle                    | Initial load may be slow     | PWA caches after first load   |
| Service worker may cache stale | Users see old version        | Auto-update plugin configured |

## 11. Post-Deployment Checklist

- [ ] Vercel project created
- [ ] Root directory set to `frontend`
- [ ] Build command configured
- [ ] `VITE_API_URL` set correctly
- [ ] Custom domain configured
- [ ] HTTPS active
- [ ] SPA routing works (direct URL navigation)
- [ ] Login page loads
- [ ] Dashboard loads after login
- [ ] Static assets load (logo, favicon)
- [ ] PWA manifest valid
- [ ] Service worker registered
- [ ] No console errors
- [ ] No leaked secrets

## 12. Blocker Dependencies

| Dependency    | Status  | Provider         |
| ------------- | ------- | ---------------- |
| Backend URL   | BLOCKED | Railway (H37)    |
| DNS/TLS       | BLOCKED | Cloudflare (H39) |
| Custom domain | BLOCKED | Cloudflare DNS   |

## 13. Evidence

No live evidence available — Vercel access is BLOCKED.
All configuration is code-verified against the repository.
Build verified: `pnpm build` produces 25MB dist with valid HTML, PWA, and service worker.
