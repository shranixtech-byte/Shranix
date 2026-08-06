# Deployment

> **SHRANIX Krushi ERP** — v1.0.0 · Last updated: 2026-08-06

This is the deep-dive deployment guide. For the operational walkthrough (upgrade, rollback, troubleshooting, admin tasks) see [deployment/README.md](../deployment/README.md), [deployment/admin-guide.md](../deployment/admin-guide.md), and [deployment/go-live-checklist.md](../deployment/go-live-checklist.md).

---

## Table of Contents

1. [Deployment Targets](#deployment-targets)
2. [Local Deployment](#local-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Production Linux Server (manual)](#production-linux-server-manual)
5. [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
6. [Process Management (PM2 / systemd)](#process-management-pm2--systemd)
7. [SSL / TLS](#ssl--tls)
8. [Environment Configuration](#environment-configuration)
9. [Health Checks](#health-checks)
10. [Deployment Checklist](#deployment-checklist)

---

## Deployment Targets

| Target                | When                           | Effort      |
| --------------------- | ------------------------------ | ----------- |
| Local (dev)           | Development & testing          | Low         |
| Docker Compose        | Single-host staging/production | Medium      |
| Linux server (manual) | Custom setups, air-gapped      | Medium-High |
| Nginx reverse proxy   | Fronting either of the above   | Included    |

---

## Local Deployment

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed

# Production-style build + run
pnpm build
pnpm --filter @shranix/backend start:prod   # node dist/main (port 4001)
pnpm --filter @shranix/frontend preview      # or serve dist/ via any static host
```

---

## Docker Deployment

### Prerequisites

- Docker Engine + Docker Compose v2
- A `.env` with production values (see [Environment Configuration](#environment-configuration))

### Option A — Development stack

```bash
docker compose up --build
```

Runs PostgreSQL + Redis + MinIO + backend + frontend with healthchecks.

### Option B — Production stack

```bash
cp .env.example .env
# set DATABASE_URL, JWT_SECRET, REDIS_PASSWORD, MINIO_*, SMTP_*

docker compose -f docker-compose.production.yml up -d --build
```

The production stack includes:

- **Nginx** reverse proxy (TLS, security headers, rate limiting, SPA routing)
- **Backend** with 2 replicas (512 MB limit each)
- **Frontend** static build served by Nginx

### Post-start

```bash
curl http://localhost/v1/health
```

**Migrations & seeds** are applied from a machine with the repo checked out (the runner image is a minimal Node runtime — drizzle-kit lives in the repo's `database/` workspace, not in the container):

```bash
# from the repo root, targeting the deployed DB
DATABASE_URL=postgresql://user:pass@host:5432/shranix_erp pnpm db:migrate
DATABASE_URL=postgresql://user:pass@host:5432/shranix_erp pnpm db:seed
```

Alternatively, run them in CI before `up -d` so the first deploy starts with a migrated schema.

### Scaling & updating

```bash
docker compose -f docker-compose.production.yml scale backend=3
export TAG=v1.0.0 && docker compose -f docker-compose.production.yml up -d
docker system prune -f
```

---

## Production Linux Server (manual)

### 1. Provision

```bash
sudo apt update && sudo apt install -y nodejs npm postgresql nginx
corepack enable
```

### 2. Create a deploy user

```bash
sudo adduser --system --group --home /opt/shranix-erp shranix
sudo -u shranix mkdir -p /opt/shranix-erp
```

### 3. Deploy code

```bash
cd /opt/shranix-erp
git clone https://github.com/shranixtech-byte/Shranix.git .
pnpm install --frozen-lockfile
```

### 4. Configure environment

```bash
cp .env.example .env
nano .env        # set production values
```

### 5. Create the database

```bash
sudo -u postgres psql
CREATE USER shranix WITH PASSWORD 'change_me';
CREATE DATABASE shranix_erp OWNER shranix;
\q
```

```bash
# .env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://shranix:change_me@localhost:5432/shranix_erp
```

### 6. Migrate & seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 7. Build

```bash
pnpm build
```

### 8. Run

See [Process Management](#process-management-pm2--systemd) below.

### 9. Configure Nginx + SSL

See [Reverse Proxy](#reverse-proxy-nginx) and [SSL](#ssl--tls).

---

## Reverse Proxy (Nginx)

A production-grade `nginx.conf` is included in the repo root. Key behaviors:

- HTTP → HTTPS redirect
- TLS 1.2/1.3 with security headers (HSTS, CSP, X-Frame-Options, Permissions-Policy)
- Rate limiting (30 r/s per IP with burst)
- `/api/` proxied to the backend upstream (keepalive 64)
- SPA routing (`try_files … /index.html`) with immutable caching of hashed assets
- 100 MB client body limit (file uploads)

```bash
sudo cp nginx.conf /etc/nginx/conf.d/default.conf
sudo nginx -t && sudo systemctl reload nginx
```

Update `server_name`, the `upstream backend` address, and cert paths to match your environment.

---

## Process Management (PM2 / systemd)

### PM2

```bash
npm i -g pm2
cd /opt/shranix-erp

pm2 start backend/dist/main.js --name shranix-backend
pm2 start frontend/node_modules/.bin/vite --name shranix-frontend -- preview --host 0.0.0.0

pm2 save
pm2 startup          # boot on reboot
```

### systemd (alternative)

`/etc/systemd/system/shranix-backend.service`:

```ini
[Unit]
Description=SHRANIX Krushi ERP Backend
After=network.target postgresql.service

[Service]
User=shranix
WorkingDirectory=/opt/shranix-erp/backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/shranix-erp/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shranix-backend
sudo systemctl status shranix-backend
```

---

## SSL / TLS

The bundled Nginx config expects:

```bash
ssl_certificate     /etc/ssl/certs/shranix.crt
ssl_certificate_key /etc/ssl/private/shranix.key
```

### Let's Encrypt (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d erp.example.com
```

Certbot updates the Nginx config automatically and sets up auto-renewal.

### Enforce HTTPS

The config already redirects port 80 → 443 and sets HSTS. Ensure `Strict-Transport-Security` is only sent over HTTPS.

---

## Environment Configuration

Production `.env` minimum:

```bash
NODE_ENV=production
APP_PORT=4001
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://shranix:strong-password@localhost:5432/shranix_erp?sslmode=require
JWT_SECRET=$(openssl rand -base64 48)        # generate & store safely
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=https://erp.example.com
REDIS_URL=redis://:password@redis:6379
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@example.com
```

> **Secrets:** use your platform's secret store (GitHub Actions secrets, Docker secrets, or a vault). Never bake secrets into images or commit them.

---

## Health Checks

| Endpoint                     | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `GET /v1/health`             | Combined status                               |
| `GET /v1/health/live`        | Process liveness (used by Docker HEALTHCHECK) |
| `GET /v1/health/ready`       | Readiness — verifies DB connectivity          |
| `GET /api/v1/health/metrics` | Process metrics (memory, CPU, uptime)         |

Health endpoints are excluded from the `/api` prefix but remain versioned (`/v1/health`). `/health/metrics` is _not_ excluded and is served at `/api/v1/health/metrics`. Prometheus scrapes it on a 10 s interval (see `monitoring/prometheus.yml`).

---

## Deployment Checklist

- [ ] Strong secrets set (`JWT_SECRET` ≥ 32 chars, DB password, Redis password)
- [ ] `DATABASE_URL` uses PostgreSQL with TLS in production
- [ ] `pnpm db:migrate` applied; `pnpm db:seed` run
- [ ] Default admin password changed immediately
- [ ] `NODE_ENV=production`
- [ ] Nginx config validated (`nginx -t`) and reloaded
- [ ] TLS certificates in place + auto-renewal configured
- [ ] Reverse proxy + backend reachable (`curl -I https://erp.example.com/v1/health`)
- [ ] Monitoring: Prometheus scrape targets reachable; Grafana dashboard imported
- [ ] Backups scheduled (cron) with retention verified
- [ ] Go-live checklist completed — [deployment/go-live-checklist.md](../deployment/go-live-checklist.md)

---

_Operational details, upgrade & rollback: [deployment/README.md](../deployment/README.md) · Admin guide: [deployment/admin-guide.md](../deployment/admin-guide.md)_
