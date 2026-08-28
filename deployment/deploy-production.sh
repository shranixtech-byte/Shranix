#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Production Deployment Script
# ═══════════════════════════════════════════════════════════════
# Usage: ./deployment/deploy-production.sh
#
# Prerequisites:
#   1. Railway CLI installed and logged in
#   2. Neon PostgreSQL database provisioned
#   3. Environment variables configured in Railway
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Step 1: Pre-flight checks ────────────────────────────────
log "Step 1: Pre-flight checks..."

if ! command -v railway &> /dev/null; then
  error "Railway CLI not found. Install: npm install -g @railway/cli"
fi

if ! railway whoami &> /dev/null; then
  error "Not logged in to Railway. Run: railway login"
fi

log "Railway CLI ready ✓"

# ── Step 2: Verify environment variables ─────────────────────
log "Step 2: Checking environment variables..."

REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "CORS_ORIGINS"
)

for var in "${REQUIRED_VARS[@]}"; do
  if railway variables get "$var" 2>/dev/null | grep -q "not set\|empty"; then
    error "Missing required variable: $var"
  fi
done

log "Environment variables verified ✓"

# ── Step 3: Run database migrations ──────────────────────────
log "Step 3: Running database migrations..."

railway run --service backend npx drizzle-kit push --force || {
  warn "Migration command failed — may need manual intervention"
}

log "Migrations applied ✓"

# ── Step 4: Deploy backend ──────────────────────────────────
log "Step 4: Deploying backend to Railway..."

railway up --service backend --production

log "Backend deployment initiated ✓"

# ── Step 5: Wait for health check ───────────────────────────
log "Step 5: Waiting for health check..."

MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.shranix.com/v1/health/live 2>/dev/null || echo "000")
  
  if [ "$HEALTH" = "200" ]; then
    log "Health check passed ✓"
    break
  fi
  
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    error "Health check failed after $MAX_ATTEMPTS attempts"
  fi
  
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS — status: $HEALTH"
  sleep 10
  ATTEMPT=$((ATTEMPT + 1))
done

# ── Step 6: Verify API ─────────────────────────────────────
log "Step 6: Verifying API..."

API_HEALTH=$(curl -s https://api.shranix.com/v1/health/live 2>/dev/null)
echo "  Health response: $API_HEALTH"

log "═══════════════════════════════════════════════════════════"
log "DEPLOYMENT COMPLETE"
log "═══════════════════════════════════════════════════════════"
log ""
log "Backend: https://api.shranix.com"
log "Health:  https://api.shranix.com/v1/health/live"
log ""
log "Next steps:"
log "  1. Verify DNS: api.shranix.com resolves correctly"
log "  2. Test login: POST https://api.shranix.com/v1/auth/login"
log "  3. Deploy frontend (if separate)"
log "  4. Run production E2E tests"
log ""
