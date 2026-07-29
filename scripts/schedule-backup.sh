#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Scheduled Backup Runner
# ═══════════════════════════════════════════════════════════════════
# Intended to be run via cron:
#   0 2 * * * /opt/shranix-erp/scripts/schedule-backup.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export BACKUP_DIR="${BACKUP_DIR:-/opt/shranix-erp/backups}"
export DATABASE_URL="${DATABASE_URL:-postgres://shranix:shranix123@localhost:5432/shranix_erp}"
export RETENTION_DAYS="${RETENTION_DAYS:-30}"

LOG_FILE="${BACKUP_DIR}/scheduler.log"
mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scheduled backup started" >> "${LOG_FILE}"

"${SCRIPT_DIR}/backup.sh" backup >> "${LOG_FILE}" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scheduled backup completed" >> "${LOG_FILE}"
