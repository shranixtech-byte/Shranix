#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Database Backup & Restore Script
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_URL="${DATABASE_URL:-postgres://shranix:shranix123@localhost:5432/shranix_erp}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/shranix_erp_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# ── Backup ────────────────────────────────────────────────────
backup() {
    log "Starting backup: ${BACKUP_FILE}"

    pg_dump "${DB_URL}" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="${BACKUP_FILE}" 2>>"${LOG_FILE}"

    log "Backup completed: $(du -h "${BACKUP_FILE}" | cut -f1)"
}

# ── Restore ───────────────────────────────────────────────────
restore() {
    local file="${1:-${BACKUP_FILE}}"
    if [[ ! -f "${file}" ]]; then
        log "ERROR: Backup file not found: ${file}"
        exit 1
    fi

    log "Starting restore from: ${file}"

    # Drop existing connections first
    psql "${DB_URL}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"

    pg_restore "${DB_URL}" \
        --clean \
        --if-exists \
        --verbose \
        --file="${file}" 2>>"${LOG_FILE}"

    log "Restore completed from: ${file}"
}

# ── Verify ────────────────────────────────────────────────────
verify() {
    local file="${1:-${BACKUP_FILE}}"
    if [[ ! -f "${file}" ]]; then
        log "ERROR: Backup file not found: ${file}"
        exit 1
    fi

    log "Verifying backup integrity: ${file}"
    pg_restore --list "${file}" > /dev/null 2>>"${LOG_FILE}"
    log "Backup integrity verified: ${file}"
}

# ── List Backups ──────────────────────────────────────────────
list() {
    echo "Available backups:"
    ls -lh "${BACKUP_DIR}"/*.dump 2>/dev/null || echo "No backups found"
}

# ── Cleanup Old Backups ──────────────────────────────────────
cleanup() {
    log "Cleaning backups older than ${RETENTION_DAYS} days"
    find "${BACKUP_DIR}" -name "*.dump" -type f -mtime "+${RETENTION_DAYS}" -delete
    log "Cleanup completed"
}

# ── Main ─────────────────────────────────────────────────────
case "${1:-backup}" in
    backup)
        backup
        verify
        cleanup
        ;;
    restore)
        restore "${2:-}"
        ;;
    verify)
        verify "${2:-}"
        ;;
    list)
        list
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {backup|restore|verify|list|cleanup}"
        echo ""
        echo "  backup              Create a new backup"
        echo "  restore [file]      Restore from backup file"
        echo "  verify  [file]      Verify backup integrity"
        echo "  list                List available backups"
        echo "  cleanup             Remove old backups"
        exit 1
        ;;
esac
