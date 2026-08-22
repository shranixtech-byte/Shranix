# H35 CHECKPOINT — UPSTASH REDIS PROVISIONING

## 1. Upstash Access Status

| Check                    | Result           |
| ------------------------ | ---------------- |
| redis-cli                | ❌ NOT INSTALLED |
| REDIS_URL                | ❌ NOT SET       |
| UPSTASH_REDIS_REST_URL   | ❌ NOT SET       |
| UPSTASH_REDIS_REST_TOKEN | ❌ NOT SET       |
| ioredis                  | ❌ NOT AVAILABLE |
| @upstash/redis           | ❌ NOT AVAILABLE |

**STATUS: BLOCKED — OPERATOR ACTION REQUIRED**

## 2. Provisioning Steps (Operator Manual)

### Step 1: Create Upstash Account (2 minutes)

1. Go to https://console.upstash.com
2. Sign up with GitHub or email (free, no credit card)
3. Click "Create Database"
4. Database name: `shranix-staging`
5. Region: closest to deployment target
6. TLS: Enabled (default)

### Step 2: Get Credentials (1 minute)

1. In Upstash Console → Database → Redis
2. Copy "Redis REST API URL"
3. Copy "Redis REST API Token"

### Step 3: Configure Environment (1 minute)

```bash
# Add to .env.staging
REDIS_URL="rediss://..." (or REST API URL for Upstash)
```

### Step 4: Verify Connection (1 minute)

```bash
# Start backend
cd backend && node dist/main.js

# Check health
curl http://localhost:4001/v1/health/ready
# Expected: Redis connectivity confirmed
```

## 3. Redis Configuration

| Property    | Value                                            |
| ----------- | ------------------------------------------------ |
| Provider    | Upstash                                          |
| Protocol    | Redis over REST (Upstash native) or Rediss (TLS) |
| TLS         | Required                                         |
| Password    | Via token                                        |
| Persistence | AOF (Upstash managed)                            |

## 4. Distributed Lock Architecture

| Component              | Status            | Notes                               |
| ---------------------- | ----------------- | ----------------------------------- |
| H5 distributed locking | ✅ Implemented    | Requires Redis for production       |
| SQLite locks           | ✅ Local dev only | NOT suitable for multi-replica      |
| Scheduler              | Uses Redis        | For distributed job coordination    |
| Rate limiting          | Uses Redis        | For distributed rate-limit counters |

## 5. Real Redis Test (NOT RUN)

| Test            | Status                       |
| --------------- | ---------------------------- |
| PING            | NOT RUN — No Redis available |
| SET/GET         | NOT RUN                      |
| DEL             | NOT RUN                      |
| TTL/Expiry      | NOT RUN                      |
| Lock acquire    | NOT RUN                      |
| Lock release    | NOT RUN                      |
| Concurrent lock | NOT RUN                      |

## 6. Failure Behavior (NOT RUN)

| Test                 | Status  |
| -------------------- | ------- |
| Redis unavailable    | NOT RUN |
| Graceful degradation | NOT RUN |
| No silent corruption | NOT RUN |

## 7. Operator Quick-Start

**Total estimated time: 5 minutes**

1. Create Upstash account → https://console.upstash.com
2. Create `shranix-staging` Redis database
3. Copy REST API URL and Token
4. Set `REDIS_URL` in `.env.staging`
5. Run `bash scripts/staging-bootstrap.sh`
6. Run `bash scripts/staging-readiness.sh`
7. Expected: REDIS gate changes from BLOCKED to PASS

## 8. Remaining Limitations

| Limitation          | Impact                   | Resolution                                 |
| ------------------- | ------------------------ | ------------------------------------------ |
| No redis-cli        | Cannot test directly     | Use Node.js or curl                        |
| No ioredis          | Cannot test from Node.js | Install: `pnpm add ioredis @types/ioredis` |
| No @upstash/redis   | Cannot test REST API     | Install: `pnpm add @upstash/redis`         |
| Upstash REST vs TCP | Different client needed  | Use @upstash/redis for REST                |

---

**H35 CHECKPOINT COMMITTED. NO PUSH. NEXT = REAL OBJECT STORAGE PROVISIONING.**
