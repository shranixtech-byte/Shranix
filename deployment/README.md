# SHRANIX Krushi ERP — Deployment Guide

**Version:** v1.0.0  
**Last Updated:** 2026-07-25  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Production Deployment](#production-deployment)
7. [HTTPS & SSL](#https--ssl)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Backup & Restore](#backup--restore)
10. [Upgrade Guide](#upgrade-guide)
11. [Rollback Guide](#rollback-guide)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js:** >= 18.x
- **pnpm:** >= 8.x
- **Database:** SQLite (dev) or PostgreSQL 14+ (prod)
- **Redis:** >= 6.x (for caching & queues)
- **Docker:** Latest (for containerized deployment)

---

## Quick Start (Docker)

```bash
# Clone repository
git clone <repo-url> shranix-krushi-erp
cd shranix-krushi-erp

# Copy production environment template
cp .env.production .env

# Edit .env with your configuration
# At minimum set:
# - JWT_SECRET (min 32 chars)
# - DATABASE_URL

# Start all services
docker compose -f docker-compose.production.yml up -d

# Run database migrations
docker compose exec backend pnpm run db:migrate

# Seed initial data
docker compose exec backend pnpm run db:seed

# Verify health
curl http://localhost:3001/health
```

---

## Manual Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm turbo run build

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
pnpm run db:migrate

# Seed data (optional)
pnpm run db:seed

# Start production server
pnpm run start:prod
```

---

## Configuration

### Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `APP_PORT` | Application port | `3001` |
| `DATABASE_URL` | Database connection string | `sqlite://./data/shranix.db` |
| `JWT_SECRET` | JWT signing key (32+ chars) | Required |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis password | — |
| `SWAGGER_ENABLED` | Enable API docs | `true` |
| `SWAGGER_PATH` | Swagger UI path | `api/docs` |
| `APP_LOG_LEVEL` | Logging level | `info` |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `MAX_UPLOAD_SIZE` | Max upload size (MB) | `10` |

### AI Provider Configuration

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | Provider: `openai`, `gemini`, `claude`, `ollama` |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLAUDE_API_KEY` | Anthropic Claude API key |
| `OLLAMA_BASE_URL` | Ollama server URL |

---

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
createdb shranix_krushi_erp

# Run migrations
pnpm run db:migrate

# Seed data
pnpm run db:seed
```

### SQLite (Development)

```bash
# Migrations run automatically on first start
pnpm run db:migrate
```

### Migration Management

```bash
# Generate migration
pnpm run db:generate

# Apply migrations
pnpm run db:migrate

# Rollback last migration
pnpm run db:rollback
```

---

## Production Deployment

### Docker Compose (Recommended)

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/shranix
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=shranix
      - POSTGRES_USER=shranix
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'" always;

    # API proxy
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Frontend SPA
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Monitoring & Health Checks

### Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | Overall health status |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe (includes DB check) |

### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2026-07-25T12:00:00.000Z",
  "services": {
    "database": { "status": "ok", "responseTime": "2ms" },
    "redis": { "status": "ok", "responseTime": "1ms" },
    "storage": { "status": "ok" }
  }
}
```

### Logging

- **Structured JSON logging** via nestjs-pino
- Log level configurable via `APP_LOG_LEVEL`
- Audit logs stored in database

---

## Backup & Restore

### PostgreSQL Backup

```bash
# Create backup
pg_dump -h localhost -U shranix shranix_krushi_erp > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -h localhost -U shranix shranix_krushi_erp < backup_20260725.sql
```

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/var/backups/shranix"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz /data/uploads

# Retain only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

---

## Upgrade Guide

### Steps

1. **Backup database** before upgrade
2. Pull latest code: `git pull`
3. Install dependencies: `pnpm install`
4. Build: `pnpm turbo run build`
5. Run migrations: `pnpm run db:migrate`
6. Restart services: `docker compose restart`

### Version Compatibility

| From | To | Migration Notes |
|------|----|-----------------|
| v0.x | v1.0 | Major schema changes, run all migrations sequentially |

---

## Rollback Guide

### Container Rollback

```bash
# Rollback to previous Docker image
docker compose down
docker compose -f docker-compose.production.yml up -d --build

# Or use specific version tag
docker compose -f docker-compose.production.yml up -d backend:previous-tag
```

### Database Rollback

```bash
# Rollback last migration
pnpm run db:rollback

# Or restore from backup
psql -h localhost -U shranix shranix_krushi_erp < backup_file.sql
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` for database | Ensure database is running and accessible |
| `JWT_SECRET not set` | Set JWT_SECRET environment variable (min 32 chars) |
| Migration failures | Run `pnpm run db:rollback` then re-apply |
| CORS errors | Check `CORS_ORIGINS` includes your frontend URL |
| Upload size errors | Increase `MAX_UPLOAD_SIZE` or check `10mb` express limit |
| Redis connection | Verify Redis is running and `REDIS_URL` is correct |
| AI provider errors | Check API keys and network access to provider endpoints |

### Health Check Failures

If health endpoint returns non-200:

1. Check database connectivity: `nc -zv localhost 5432`
2. Check Redis connectivity: `redis-cli ping`
3. Verify environment variables
4. Check application logs
5. Restart service: `docker compose restart backend`

---

## Deployment Checklist

### Pre-Deployment

- [ ] Database backup created
- [ ] Environment variables configured
- [ ] JWT_SECRET set (32+ random characters)
- [ ] CORS origins configured
- [ ] HTTPS/SSL certificates installed
- [ ] Redis configured with password

### Post-Deployment

- [ ] Health endpoint returns 200
- [ ] API responds correctly
- [ ] Frontend loads without errors
- [ ] Authentication flow works
- [ ] Database migrations applied
- [ ] Monitoring dashboards available
- [ ] Backup automation configured
