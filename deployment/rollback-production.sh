#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Production Rollback Script
# ═══════════════════════════════════════════════════════════════
# Usage: ./deployment/rollback-production.sh [previous-version]
#
# This script rolls back the production deployment to a previous
# version. Use this when the current deployment has issues.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[ROLLBACK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

PREVIOUS_VERSION="${1:-}"

if [ -z "$PREVIOUS_VERSION" ]; then
  error "Usage: $0 <previous-version-tag>"
  echo ""
  echo "Available Railway deployments:"
  railway status
  echo ""
  echo "Example: $0 abc123def456"
fi

# ── Step 1: Verify rollback target ──────────────────────────
log "Step 1: Verifying rollback target..."

if ! railway whoami &> /dev/null; then
  error "Not logged in to Railway"
fi

log "Rolling back to: $PREVIOUS_VERSION"

# ── Step 2: Take backup reminder ────────────────────────────
log "Step 2: Taking pre-rollback backup reminder..."
warn "IMPORTANT: Ensure you have a database backup before rollback!"
warn "Run: pg_dump if needed, or verify recent backup exists."

# ── Step 3: Deploy previous version ─────────────────────────
log "Step 3: Deploying previous version..."

railway variables set RAILWAY_DEPLOYMENT_VERSION="$PREVIOUS_VERSION" --service backend

log "Rollback deployment initiated ✓"

# ── Step 4: Wait for health check ───────────────────────────
log "Step 4: Waiting for health check..."

MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.shranix.com/v1/health/live 2>/dev/null || echo "000")
  
  if [ "$HEALTH" = "200" ]; then
    log "Health check passed ✓"
    break
  fi
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    error "Health check failed after $MAX_ATTEMPTS attempts — manual intervention required"
  fi
  
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS — status: $HEALTH"
  sleep 10
  ATTEMPT=$((ATTEMPT + 1))
done

log "═══════════════════════════════════════════════════════════"
log "ROLLBACK COMPLETE"
log "═══════════════════════════════════════════════════════════"
log ""
log "Rolled back to: $PREVIOUS_VERSION"
log "Backend: https://api.shranix.com"
log "Health:  https://api.shranix.com/v1/health/live"
log ""
log "If issues persist:"
log "  1. Check Railway logs: railway logs --service backend"
log "  2. Check database connectivity"
log "  3. Contact support"
log ""
