# SHRANIX Krushi ERP — Production Runbooks (Phase 17.41)

Operational procedures for the SHRANIX Central License Server and ERP deployment.
Each runbook is a step-by-step checklist with concrete commands. Runbooks assume:

- Docker Compose deployment (`docker-compose.yml` + `docker-compose.production.yml`)
- PostgreSQL production database
- Backups in `/opt/shranix-erp/backups` (or `BACKUP_DIR` env)
- SSH access to the deployment host (`DEPLOY_USER@DEPLOY_HOST`)

## Runbook Index

| #   | Runbook                                          | When to use                                |
| --- | ------------------------------------------------ | ------------------------------------------ |
| 01  | [Deployment](01-deployment.md)                   | Shipping a new build to staging/production |
| 02  | [Rollback](02-rollback.md)                       | A deployed version is broken               |
| 03  | [Database Migration](03-database-migration.md)   | Applying schema changes safely             |
| 04  | [Backup](04-backup.md)                           | Creating/verifying backups                 |
| 05  | [Restore](05-restore.md)                         | Restoring from a backup                    |
| 06  | [Security Incident](06-security-incident.md)     | Breach, key compromise, abuse detected     |
| 07  | [License Incident](07-license-incident.md)       | License/activation anomalies               |
| 08  | [Payment Incident](08-payment-incident.md)       | Payment/webhook problems                   |
| 09  | [Release](09-release.md)                         | Publishing a software release              |
| 10  | [Certificate Renewal](10-certificate-renewal.md) | TLS cert expiry                            |
| 11  | [Key Rotation](11-key-rotation.md)               | Rotating license signing keys              |
| 12  | [Customer Recovery](12-customer-recovery.md)     | Legitimate customer recovery               |
| 13  | [Central Server Outage](13-central-outage.md)    | Server down / DR activation                |

## Common Prerequisites

```bash
export DEPLOY_USER=deploy
export DEPLOY_HOST=erp.shranix.in
export APP_DIR=/opt/shranix-erp

# SSH alias used by all runbooks
ssh() { command ssh -i ~/.ssh/deploy_key "$DEPLOY_USER@$DEPLOY_HOST" "$@"; }
```

## Golden Rules

1. **Backup before any destructive/migratory operation.**
2. **A backup is not complete until restore is tested** (17.6).
3. **Never edit production schema by hand — migrations only** (17.5).
4. **Never run `git push`/destructive commands against production from this repo.**
5. **Security incidents: preserve evidence before fixing.**
