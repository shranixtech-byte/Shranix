# H34 CHECKPOINT — NEON POSTGRESQL PROVISIONING

## 1. Neon Access Status

| Check             | Result                             |
| ----------------- | ---------------------------------- |
| neonctl CLI       | ❌ NOT INSTALLED                   |
| psql client       | ❌ NOT INSTALLED                   |
| NEON_DATABASE_URL | ❌ NOT SET                         |
| DATABASE_URL      | SQLite only (`file:./data/dev.db`) |
| Node.js pg driver | ❌ NOT AVAILABLE                   |

**STATUS: BLOCKED — OPERATOR ACTION REQUIRED**

## 2. Provisioning Steps (Operator Manual)

### Step 1: Create Neon Account (2 minutes)

1. Go to https://console.neon.tech
2. Sign up with GitHub or email (free, no credit card)
3. Create a new project:
   - Project name: `shranix-staging`
   - PostgreSQL version: 16
   - Region: closest to deployment target

### Step 2: Get Connection String (1 minute)

1. In Neon Console → Dashboard → Connection Details
2. Select "Pooled connection" (required for serverless)
3. Copy the connection string (format: `postgresql://...@ep-xxx.us-east-2.aws.neon.tech/shranix?sslmode=require`)

### Step 3: Configure Environment (1 minute)

```bash
# Copy template
cp .env.staging.template .env.staging

# Edit .env.staging
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://your-connection-string-here"
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
```

### Step 4: Run Migrations (1 minute)

```bash
# Set DATABASE_URL for migration
export DATABASE_URL="postgresql://your-connection-string"

# Run migrations
cd database && pnpm drizzle-kit push

# Verify
pnpm drizzle-kit check
```

### Step 5: Verify Connection (30 seconds)

```bash
# Start backend
cd backend && node dist/main.js

# Check health
curl http://localhost:4001/v1/health/ready
# Expected: {"status":"ready","database":{"status":"healthy"}}
```

## 3. Database Configuration

| Property           | Value                          |
| ------------------ | ------------------------------ |
| Provider           | Neon                           |
| PostgreSQL Version | 16                             |
| SSL/TLS            | Required (`sslmode=require`)   |
| Connection Pooling | Pooled connection required     |
| Database Name      | `shranix` (or project default) |
| Region             | To be selected at provisioning |

## 4. Migration Status

| Check               | Result                            |
| ------------------- | --------------------------------- |
| Migration directory | ✅ `database/src/migrations/`     |
| Migration count     | 28+ (0000-0027)                   |
| Journal version     | 7                                 |
| Destructive reset   | ❌ NOT used                       |
| Idempotent          | ✅ drizzle-kit push is idempotent |

## 5. Real Database Test (NOT RUN)

| Test                  | Status                            |
| --------------------- | --------------------------------- |
| CREATE                | NOT RUN — No PostgreSQL available |
| READ                  | NOT RUN                           |
| UPDATE                | NOT RUN                           |
| DELETE                | NOT RUN                           |
| Transaction commit    | NOT RUN                           |
| Transaction rollback  | NOT RUN                           |
| Reconnect persistence | NOT RUN                           |

## 6. Application Connection (NOT RUN)

| Check                          | Status  |
| ------------------------------ | ------- |
| Backend starts with PostgreSQL | NOT RUN |
| /health/ready returns healthy  | NOT RUN |
| ORM queries work               | NOT RUN |
| Migrations consistent          | NOT RUN |

## 7. Backup/Restore Baseline (NOT RUN)

| Check             | Status                 |
| ----------------- | ---------------------- |
| pg_dump available | NOT RUN — No psql      |
| Backup procedure  | Documented in runbooks |
| Restore procedure | Documented in runbooks |

## 8. Performance Baseline (NOT RUN)

| Metric              | Status  |
| ------------------- | ------- |
| Connection latency  | NOT RUN |
| Simple SELECT       | NOT RUN |
| Indexed SELECT      | NOT RUN |
| Transaction latency | NOT RUN |

## 9. Operator Quick-Start

**Total estimated time: 5 minutes**

1. Create Neon account → https://console.neon.tech
2. Create `shranix-staging` project (PostgreSQL 16)
3. Copy pooled connection string
4. Set `DATABASE_URL` in `.env.staging`
5. Run `bash scripts/staging-bootstrap.sh`
6. Run `bash scripts/staging-readiness.sh`
7. Expected: DATABASE gate changes from BLOCKED to PASS

## 10. Remaining Limitations

| Limitation           | Impact                            | Resolution                               |
| -------------------- | --------------------------------- | ---------------------------------------- |
| No psql client       | Cannot test connectivity directly | Install PostgreSQL client or use Node.js |
| No neonctl CLI       | Cannot manage Neon via CLI        | Install neonctl or use web console       |
| No pg Node.js driver | Cannot test from Node.js          | Install pg: `pnpm add pg @types/pg`      |
| SQLite for local dev | Local ≠ staging                   | Document distinction clearly             |

---

**H34 CHECKPOINT COMMITTED. NO PUSH. NEXT = REAL REDIS PROVISIONING.**
