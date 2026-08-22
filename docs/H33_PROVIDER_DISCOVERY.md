# H33 CHECKPOINT — PROVIDER DISCOVERY

## System Tools

| Tool      | Status           | Version |
| --------- | ---------------- | ------- |
| Node.js   | ✅ AVAILABLE     | 24.18.0 |
| pnpm      | ✅ AVAILABLE     | 9.15.0  |
| Git       | ✅ AVAILABLE     | 2.55.0  |
| curl      | ✅ AVAILABLE     | 8.21.0  |
| OpenSSL   | ✅ AVAILABLE     | 3.5.7   |
| Docker    | ❌ NOT INSTALLED | —       |
| psql      | ❌ NOT INSTALLED | —       |
| redis-cli | ❌ NOT INSTALLED | —       |
| Terraform | ❌ NOT INSTALLED | —       |

## Cloud CLIs

| Provider     | CLI      | Installed | Authenticated | Provision Possible | Status        |
| ------------ | -------- | --------- | ------------- | ------------------ | ------------- |
| Google Cloud | gcloud   | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| AWS          | aws      | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Azure        | az       | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Fly.io       | flyctl   | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Railway      | railway  | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Heroku       | heroku   | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Supabase     | supabase | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Vercel       | vercel   | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Cloudflare   | wrangler | ❌ NO     | —             | ❌ No              | NOT INSTALLED |
| Neon         | neonctl  | ❌ NO     | —             | ❌ No              | NOT INSTALLED |

## Environment Variables

| Variable               | Status         | Format                        |
| ---------------------- | -------------- | ----------------------------- |
| DATABASE_URL           | SET (18 chars) | `file:./data/dev.db` (SQLite) |
| REDIS_URL              | NOT SET        | —                             |
| SENTRY_DSN             | NOT SET        | —                             |
| RAZORPAY_KEY_ID        | NOT SET        | —                             |
| RAZORPAY_KEY_SECRET    | NOT SET        | —                             |
| UPSTASH_REDIS_REST_URL | NOT SET        | —                             |
| NEON_DATABASE_URL      | NOT SET        | —                             |
| SUPABASE_URL           | NOT SET        | —                             |
| SUPABASE_ANON_KEY      | NOT SET        | —                             |
| CLOUDFLARE_API_TOKEN   | NOT SET        | —                             |
| AWS_ACCESS_KEY_ID      | NOT SET        | —                             |

## Summary

**No cloud provider access is available on this machine.** All provisioning remains BLOCKED / EXTERNAL. The operator must provision cloud resources manually or install cloud CLIs and authenticate.
