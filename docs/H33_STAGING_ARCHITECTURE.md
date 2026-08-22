# H33 CHECKPOINT — STAGING ARCHITECTURE

## Recommended Minimal Production-Like Architecture

```
Internet
  ↓
DNS (Cloudflare)
  ↓
TLS (Cloudflare — automatic)
  ↓
Frontend (Vercel / Cloudflare Pages)
  ↓
Backend API (Railway / Render / VPS)
  ├── PostgreSQL (Neon)
  ├── Redis (Upstash)
  ├── Object Storage (Cloudflare R2)
  └── Monitoring (Sentry)
```

## Component Selection

| Component        | Recommended   | Free Tier            | Alternative             |
| ---------------- | ------------- | -------------------- | ----------------------- |
| PostgreSQL       | Neon          | 0.5 GB, 24/7 compute | Supabase (500 MB)       |
| Redis            | Upstash       | 10K commands/day     | —                       |
| Object Storage   | Cloudflare R2 | 10 GB                | AWS S3 (12 months free) |
| Backend Hosting  | Railway       | $5 credit            | Render (free tier)      |
| Frontend Hosting | Vercel        | Unlimited hobby      | Cloudflare Pages        |
| DNS              | Cloudflare    | Free plan            | —                       |
| TLS              | Cloudflare    | Included             | Let's Encrypt (free)    |
| Monitoring       | Sentry        | 5K events/month      | —                       |
| Payment          | Razorpay      | Test mode free       | —                       |

## Architecture Requirements

| Requirement             | Supported | Notes                     |
| ----------------------- | --------- | ------------------------- |
| HTTPS                   | ✅        | Cloudflare automatic TLS  |
| Environment isolation   | ✅        | Separate staging env vars |
| Private database        | ✅        | Neon private networking   |
| Private Redis           | ✅        | Upstash password auth     |
| Private storage         | ✅        | R2 private buckets        |
| Secure secret injection | ✅        | Environment variables     |
| Migrations              | ✅        | Drizzle Kit push          |
| Health checks           | ✅        | /v1/health/live, /ready   |
| Rollback                | ✅        | Git revert + redeploy     |
| Backups                 | ✅        | pg_dump + R2 storage      |
| Monitoring              | ✅        | Sentry error tracking     |

## Cost Estimate

| Service            | Free Tier         | Estimated Monthly Cost        |
| ------------------ | ----------------- | ----------------------------- |
| Neon PostgreSQL    | 0.5 GB free       | $0 (staying within free tier) |
| Upstash Redis      | 10K cmds/day free | $0 (staying within free tier) |
| Cloudflare R2      | 10 GB free        | $0 (staying within free tier) |
| Railway            | $5 credit         | ~$5/month (small instance)    |
| Vercel             | Unlimited hobby   | $0                            |
| Cloudflare DNS/TLS | Free plan         | $0                            |
| Sentry             | 5K events/month   | $0 (staying within free tier) |
| **Total**          |                   | **~$5/month**                 |

## Security Boundaries

- PostgreSQL: password-protected, SSL required
- Redis: password-protected
- Object Storage: private bucket, no public access
- TLS: enforced via Cloudflare
- CORS: restricted to staging domain
- JWT: separate staging secrets (32+ chars)
- Monitoring: no secrets in error events
