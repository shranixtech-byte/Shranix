# SHRANIX Krushi ERP — Admin & Deployment Guide

**Version:** 1.0.0

---

## Architecture Overview

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  Desktop App    │ ────────────── │  Backend API     │
│  (Tauri/React)  │                │  (NestJS)        │
│  Port: N/A      │                │  Port: 443       │
└─────────────────┘                └────────┬─────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  Database         │
                                   │  (PostgreSQL/     │
                                   │   SQLite)         │
                                   └──────────────────┘
```

---

## Production Backend Requirements

### Server

- **Runtime:** Node.js 20+ or compatible
- **Framework:** NestJS
- **Port:** 443 (HTTPS) or 4001 (HTTP behind reverse proxy)
- **Process Manager:** PM2 or systemd

### Database

- **Development:** SQLite (`data/dev.db`)
- **Production:** PostgreSQL (recommended) or SQLite
- **Connection:** Via `DATABASE_URL` environment variable

### Environment Variables

| Variable       | Required | Description                | Example                               |
| -------------- | -------- | -------------------------- | ------------------------------------- |
| `DATABASE_URL` | Yes      | Database connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET`   | Yes      | JWT signing secret         | Random 64+ char string                |
| `APP_URL`      | Yes      | Backend API URL            | `https://api.shranix.com`             |
| `CORS_ORIGINS` | Yes      | Allowed frontend origins   | `https://app.shranix.com`             |
| `NODE_ENV`     | Yes      | Environment                | `production`                          |
| `PORT`         | No       | Server port                | `4001`                                |

### HTTPS

Production MUST use HTTPS. Configure via:

- Nginx/Caddy reverse proxy with SSL
- AWS ALB with ACM certificate
- Cloudflare SSL

---

## Desktop Application Configuration

### API Connection

The desktop application connects to the backend via:

- **Production:** `https://api.shranix.com/api/v1` (set via `VITE_API_URL`)
- **Development:** `http://localhost:4001/api/v1` (auto-detected)

The API URL is baked into the frontend at build time. To change it:

1. Set `VITE_API_URL` in `.env.production`
2. Rebuild the frontend: `pnpm --filter @shranix/frontend build`
3. Rebuild the desktop: `cd desktop && pnpm build`

### CSP (Content Security Policy)

Current production CSP:

```
default-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
script-src 'self' 'unsafe-eval';
connect-src 'self' https://api.shranix.com https://updates.shranix.com;
img-src 'self' data: asset:;
media-src 'self'
```

Allowed external domains:

- `api.shranix.com` — Backend API
- `updates.shranix.com` — Update server (currently disabled)
- `fonts.googleapis.com` — Google Fonts
- `fonts.gstatic.com` — Google Fonts

---

## Backup Requirements

### Database

- **Frequency:** Daily minimum, hourly recommended
- **Method:** `pg_dump` for PostgreSQL, file copy for SQLite
- **Retention:** 30 days minimum
- **Location:** Off-site/cloud storage

### Application Data

- Business data is stored in the database
- No local data on client machines (except session/token)
- Backup the database to ensure data safety

---

## Deployment Checklist

### Backend

- [ ] Server provisioned (Linux recommended)
- [ ] Node.js 20+ installed
- [ ] PostgreSQL/SQLite configured
- [ ] Environment variables set
- [ ] HTTPS configured (SSL certificate)
- [ ] Reverse proxy configured (Nginx/Caddy)
- [ ] Process manager configured (PM2/systemd)
- [ ] Firewall rules applied
- [ ] Database backups configured
- [ ] Monitoring configured
- [ ] Logs configured

### Frontend/Desktop

- [ ] Production build generated
- [ ] API URL configured correctly
- [ ] Installer tested
- [ ] Installation guide reviewed
- [ ] Support contact information updated

---

## Monitoring

### Backend Health

- Monitor API response times
- Monitor database connection pool
- Monitor memory/CPU usage
- Set up alerts for downtime

### Key Metrics

- Login success/failure rate
- API error rates (4xx, 5xx)
- Database query performance
- Active user sessions

---

## Update Strategy (V1)

### Current Status

- **Auto-update:** DISABLED (no signing key)
- **Manual update:** Users download new installer

### Future (V2+)

- Generate signing key pair
- Set up update server
- Sign release artifacts
- Enable auto-update in Tauri config
- Test update flow end-to-end

---

## Security

### Production Security Checklist

- [ ] HTTPS enforced (no HTTP)
- [ ] JWT tokens have expiration
- [ ] Passwords hashed with bcrypt
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (ORM)
- [ ] XSS protection (CSP headers)
- [ ] CSRF protection (SameSite cookies)
- [ ] DevTools disabled in release builds
- [ ] No secrets in frontend bundle
- [ ] No localhost in production CSP

### Desktop Security

- DevTools disabled in release builds
- CSP enforced by Tauri
- No local database (data on server)
- Session tokens stored securely

---

## Support

- **Technical Support:** support@shranix.com
- **Emergency:** Contact system administrator
- **Documentation:** https://docs.shranix.com

---

_SHRANIX Krushi ERP v1.0.0 — Admin Guide_
