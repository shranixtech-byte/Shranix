# SHRANIX Krushi ERP — Go-Live Checklist

**Version:** v1.0.0

---

## Pre-Deployment

### Environment Configuration
- [ ] Production environment variables configured in `.env`
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` generated (32+ random characters)
- [ ] `DATABASE_URL` points to production database
- [ ] `CORS_ORIGINS` includes production frontend domain
- [ ] `REDIS_URL` configured with password
- [ ] AI provider API keys configured (if using AI features)
- [ ] SMTP credentials configured for email notifications

### Database
- [ ] Production database created and accessible
- [ ] Database migrations applied successfully
- [ ] Seed data loaded (admin user, default roles, permissions)
- [ ] Database backup taken
- [ ] Database indexes verified
- [ ] Database connection pooling configured

### Security
- [ ] SSL/TLS certificates installed
- [ ] HTTPS configured in Nginx
- [ ] Security headers verified
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CSRF protection verified
- [ ] File upload limits configured
- [ ] Secrets not committed to version control

### Infrastructure
- [ ] Docker images built and tagged
- [ ] Docker Compose configuration verified
- [ ] Persistent volumes created
- [ ] Health endpoints responding (`/health/live`, `/health/ready`)
- [ ] Monitoring configured
- [ ] Logging configured with log rotation
- [ ] Backup automation in place

---

## Deployment Day

### Pre-Launch
- [ ] Final database backup taken
- [ ] Application build validated (`pnpm turbo run build`)
- [ ] TypeScript compilation clean (`pnpm turbo run typecheck`)
- [ ] Tests passing (`pnpm turbo run test`)
- [ ] Lint passing (`pnpm turbo run lint`)
- [ ] Services started: `docker compose up -d`
- [ ] Health endpoint returns 200
- [ ] API responds correctly: `curl http://localhost:3001/api/v1/health`
- [ ] Database migrations confirmed applied

### Verification
- [ ] Authentication flow works (login/register)
- [ ] Dashboard loads without errors
- [ ] API documentation accessible (if enabled)
- [ ] File upload functionality works
- [ ] Email notifications sending (if configured)
- [ ] AI features responding (if configured)
- [ ] PWA installable (browser test)

### Launch
- [ ] DNS records updated
- [ ] CDN configured (if applicable)
- [ ] SSL certificate validated
- [ ] Frontend loads via production domain
- [ ] API accessible via production domain
- [ ] CORS configured correctly
- [ ] Monitoring dashboards active
- [ ] Alerting configured

---

## Post-Launch (24-48 hours)

### Monitoring
- [ ] Error rates within normal range
- [ ] API response times within SLA
- [ ] Database performance acceptable
- [ ] Memory usage stable
- [ ] CPU usage stable
- [ ] No security incidents
- [ ] Backup automation working
- [ ] Log rotation working

### User Acceptance
- [ ] Create test user accounts
- [ ] Verify all modules accessible
- [ ] Verify workflow approvals functional
- [ ] Verify report generation works
- [ ] Verify export/import functionality
- [ ] Verify mobile/PWA experience

---

## Rollback Criteria

**Immediate rollback if:**
- Application fails to start
- Critical API endpoints return 500 errors
- Database corruption detected
- Security vulnerability discovered
- Data loss occurs

**Rollback procedure:**
```bash
# Stop current deployment
docker compose down

# Restore database from backup
psql -h localhost -U shranix shranix_krushi_erp < pre_deploy_backup.sql

# Deploy previous version
git checkout previous-release-tag
pnpm install
pnpm turbo run build
docker compose up -d

# Verify rollback
curl http://localhost:3001/health
```
