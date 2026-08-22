# H36 CHECKPOINT — CLOUDFLARE R2 OBJECT STORAGE PROVISIONING

## 1. Cloudflare/R2 Access Status

| Check                 | Result           |
| --------------------- | ---------------- |
| wrangler CLI          | ❌ NOT INSTALLED |
| CLOUDFLARE_API_TOKEN  | ❌ NOT SET       |
| AWS_ACCESS_KEY_ID     | ❌ NOT SET       |
| AWS_SECRET_ACCESS_KEY | ❌ NOT SET       |
| aws CLI               | ❌ NOT INSTALLED |
| @aws-sdk/client-s3    | ❌ NOT AVAILABLE |

**STATUS: BLOCKED — OPERATOR ACTION REQUIRED**

## 2. Provisioning Steps (Operator Manual)

### Step 1: Create Cloudflare Account (3 minutes)

1. Go to https://dash.cloudflare.com
2. Sign up with GitHub or email (free plan)
3. Go to R2 Object Storage in dashboard

### Step 2: Create R2 Bucket (2 minutes)

1. In Cloudflare Dashboard → R2 Object Storage
2. Click "Create bucket"
3. Bucket name: `shranix-staging`
4. Location: Auto (or closest region)
5. Click "Create bucket"

### Step 3: Generate API Token (2 minutes)

1. In R2 Overview → Manage R2 API Tokens
2. Click "Create API token"
3. Permission: Object Read & Write
4. Scope: Apply to specific bucket → `shranix-staging`
5. Click "Create API Token"
6. Copy Access Key ID and Secret Access Key

### Step 4: Configure Environment (1 minute)

```bash
# Add to .env.staging
STORAGE_ADAPTER=r2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=shranix-staging
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### Step 5: Verify Connection (2 minutes)

```bash
# Start backend
cd backend && node dist/main.js

# Test upload/download via API
curl -X POST http://localhost:4001/api/v1/dms/upload ...
```

## 3. Bucket Configuration

| Property      | Value                                           |
| ------------- | ----------------------------------------------- |
| Provider      | Cloudflare R2                                   |
| Bucket Name   | `shranix-staging`                               |
| Access        | Private (no public access)                      |
| Region        | Auto / closest                                  |
| Pricing       | Free tier: 10 GB storage, 10M Class A ops/month |
| S3-compatible | Yes (use S3 API)                                |

## 4. DMS Storage Mapping

| Module        | Storage Path | R2 Prefix  |
| ------------- | ------------ | ---------- |
| DMS documents | `/dms/`      | `dms/`     |
| Backups       | `/backups/`  | `backups/` |
| Imports       | `/imports/`  | `imports/` |
| Exports       | `/exports/`  | `exports/` |

## 5. Real R2 CRUD Test (NOT RUN)

| Test                 | Status                 |
| -------------------- | ---------------------- |
| Upload test object   | NOT RUN — No R2 access |
| Verify object exists | NOT RUN                |
| Download object      | NOT RUN                |
| Content integrity    | NOT RUN                |
| Metadata read        | NOT RUN                |
| Delete object        | NOT RUN                |
| Verify deletion      | NOT RUN                |

## 6. Private Access Test (NOT RUN)

| Test                       | Status  |
| -------------------------- | ------- |
| Anonymous access denied    | NOT RUN |
| Authenticated access works | NOT RUN |
| Signed URL works           | NOT RUN |
| Unauthorized path denied   | NOT RUN |

## 7. Security Tests (NOT RUN)

| Test                          | Status  |
| ----------------------------- | ------- |
| Path traversal                | NOT RUN |
| Encoded traversal             | NOT RUN |
| Double extension              | NOT RUN |
| Null byte filename            | NOT RUN |
| Content-Disposition injection | NOT RUN |
| Oversized upload              | NOT RUN |
| MIME mismatch                 | NOT RUN |

## 8. Backup Storage Policy

| Aspect        | Staging           | Production            |
| ------------- | ----------------- | --------------------- |
| Bucket        | `shranix-staging` | `shranix-production`  |
| Access        | Private           | Private               |
| Retention     | 7 days            | 30 days               |
| Backup prefix | `backups/`        | `backups/`            |
| Restore       | Isolated DB test  | Never over production |

## 9. Operator Quick-Start

**Total estimated time: 10 minutes**

1. Create Cloudflare account → https://dash.cloudflare.com
2. Enable R2 Object Storage
3. Create `shranix-staging` bucket (private)
4. Generate API token (scoped to bucket)
5. Set R2 environment variables in `.env.staging`
6. Run `bash scripts/staging-bootstrap.sh`
7. Run `bash scripts/staging-readiness.sh`
8. Expected: STORAGE gate changes from BLOCKED to PASS

## 10. Remaining Limitations

| Limitation            | Impact                   | Resolution                             |
| --------------------- | ------------------------ | -------------------------------------- |
| No wrangler CLI       | Cannot manage R2 via CLI | Use Cloudflare dashboard               |
| No aws CLI            | Cannot test S3 commands  | Use Cloudflare dashboard               |
| No @aws-sdk/client-s3 | Cannot test from Node.js | Install: `pnpm add @aws-sdk/client-s3` |
| No R2 bucket          | Cannot test CRUD         | Create bucket first                    |

---

**H36 CHECKPOINT COMMITTED. NO PUSH. NEXT = REAL RAILWAY BACKEND PROVISIONING.**
