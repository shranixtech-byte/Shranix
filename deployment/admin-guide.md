# SHRANIX Krushi ERP — Administrator Guide

**Version:** v1.0.0  
**Last Updated:** 2026-07-25  

---

## 1. System Overview

SHRANIX Krushi ERP is a full-featured Enterprise Resource Planning system built for agricultural and farming operations management.

### Architecture

```
Frontend (React + Vite + PWA)
    ↓ HTTPS/API
Backend (NestJS + TypeScript)
    ↓
Database (SQLite/PostgreSQL) + Redis (Cache/Queue)
```

### Module Architecture

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | React, Vite, Tailwind CSS | 3000 |
| Backend API | NestJS, TypeScript | 3001 |
| Database | SQLite / PostgreSQL | 5432 |
| Cache | Redis | 6379 |
| Reverse Proxy | Nginx | 80/443 |

---

## 2. System Administration

### Access Control

**Default Administrator:**
- Email: `admin@shranix.com` (created during seed)
- Password: Set via `ADMIN_PASSWORD` env variable

### Role Management

Pre-configured roles:
- **Super Administrator** — Full system access
- **Administrator** — All administrative functions
- **Manager** — Department/unit management
- **User** — Standard operations

### Permission System

Permissions are granular (create/read/update/delete per module):
```
auth.*, masters.*, inventory.*, purchase.*, sales.*,
finance.*, gst.*, workflow.*, reports.*, dms.*,
ai.*, multicompany.*, hr.*, crm.*, assets.*,
integrations.*, governance.*
```

---

## 3. Module Administration

### Multi-Company Management

- Create and manage companies
- Configure branches and business units
- Set fiscal year parameters
- Manage department hierarchies

### User & Role Administration

- Create/manage users
- Assign roles and permissions
- Configure department access
- Set company-level visibility

### Financial Administration

- Chart of Accounts management
- Financial year setup and closing
- Period locking (daily/monthly/quarterly)
- Budget creation and approval
- Fixed asset depreciation configuration

### Workflow Administration

- Create workflow templates
- Configure approval matrices
- Set escalation rules
- Define notification templates
- Monitor workflow instances

### DMS Administration

- Document categories and types
- Retention policy configuration
- Storage quota management
- OCR queue monitoring
- Digital signature management

### AI Administration

- Provider configuration (OpenAI, Gemini, Claude, Ollama)
- Prompt template management
- Token usage monitoring
- Cost tracking
- Model selection

---

## 4. Monitoring & Maintenance

### Health Endpoints

```bash
# Overall health
curl http://localhost:3001/health

# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready
```

### Audit Logs

All critical operations are logged:
- User authentication events
- Data modifications
- Workflow actions
- Financial postings
- Permission changes
- AI interactions

### Database Maintenance

```bash
# Analyze tables for query optimization
ANALYZE;

# Vacuum (PostgreSQL)
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('shranix_krushi_erp'));
```

### Log Management

Logs are stored in JSON format:
- Application logs: `logs/app-*.json`
- Error logs: `logs/error-*.json`
- Audit logs: Database `audit_logs` table

---

## 5. Security Administration

### JWT Configuration

- Token expiry: Configurable via `JWT_EXPIRY` (default: 15m)
- Refresh token expiry: Configurable via `REFRESH_TOKEN_EXPIRY` (default: 7d)
- Secret rotation: Update `JWT_SECRET` and restart

### Rate Limiting

Default limits (configurable):
- API: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP
- AI endpoints: 30 requests/minute per user

### Session Management

- Sessions tracked via JWT
- Refresh token rotation on each use
- Remote logout capability via token blacklist

---

## 6. Financial Administration

### Financial Year

- Create financial years with start/end dates
- Open/close/lock financial years
- Opening balance transfers
- Year-end closing entries

### Period Locking

- Daily, monthly, quarterly, annual locks
- Role-based unlock permissions
- Prevents posting to locked periods

### Audit Trail

- All journal entries immutable after posting
- Reverse entries create audit trail
- Full GL posting history

---

## 7. Reporting Administration

### Report Types

- Financial: Trial Balance, P&L, Balance Sheet, Cash Flow
- Sales: Sales Register, Customer Ledger, GST Summary
- Purchase: Purchase Register, Supplier Ledger
- Inventory: Stock Report, Movement Analysis
- GST: GSTR-1, GSTR-3B preparation

### Export Options

- PDF (print-ready)
- Excel (.xlsx)
- CSV
- JSON (API)

---

## 8. Troubleshooting

### Common Admin Tasks

| Task | Command/Path |
|------|-------------|
| Check application status | `docker compose ps` |
| View logs | `docker compose logs -f backend` |
| Restart backend | `docker compose restart backend` |
| Run migrations | `docker compose exec backend pnpm run db:migrate` |
| Reset admin password | Update `ADMIN_PASSWORD` env and restart |
| Clear cache | `docker compose exec redis redis-cli FLUSHALL` |
| View audit logs | `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;` |

### Database Recovery

```bash
# Stop application
docker compose down

# Restore database
psql -h localhost -U shranix shranix_krushi_erp < backup_file.sql

# Re-apply migrations if needed
docker compose run --rm backend pnpm run db:migrate

# Start application
docker compose up -d
```

---

## 9. Backup Strategy

### Recommended Schedule

| Data | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 30 days |
| Uploads | Daily | 30 days |
| Configuration | Weekly | 90 days |
| Full system | Monthly | 12 months |

### Automated Backup Script

See `scripts/backup.sh` for the automated backup routine.
