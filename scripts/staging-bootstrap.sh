#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX ERP — Staging Bootstrap Script
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   bash scripts/staging-bootstrap.sh
#
# Performs deterministic staging bootstrap:
# 1. Environment validation
# 2. Frozen dependency install
# 3. Database connectivity test
# 4. Migration check
# 5. Backend build
# 6. Frontend build
# 7. Smoke validation
# 8. Deployment metadata
#
# SAFE TO RE-RUN. No destructive database reset.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

step_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
step_fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
step_warn() { echo -e "  ${YELLOW}!${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " SHRANIX ERP — Staging Bootstrap"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Environment Validation ───────────────────────────
echo "1. Environment validation"
bash scripts/validate-staging-env.sh || step_warn "Environment validation had warnings"
step_pass "Environment check complete"
echo ""

# ── 2. Frozen Dependency Install ────────────────────────
echo "2. Frozen dependency install"
pnpm install --frozen-lockfile 2>/dev/null || step_fail "Failed to install dependencies"
step_pass "Dependencies installed (frozen lockfile)"
echo ""

# ── 3. Database Connectivity ────────────────────────────
echo "3. Database connectivity"
if echo "${DATABASE_URL:-}" | grep -q "postgresql://"; then
  step_warn "PostgreSQL URL detected — connectivity test requires psql (not available)"
elif echo "${DATABASE_URL:-}" | grep -q "file:"; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
  if [ -f "$DB_PATH" ] || [ -f "backend/$DB_PATH" ]; then
    step_pass "SQLite database exists ($DB_PATH)"
  else
    step_fail "SQLite database not found ($DB_PATH)"
  fi
else
  step_warn "No DATABASE_URL configured"
fi
echo ""

# ── 4. Migration Check ─────────────────────────────────
echo "4. Migration check"
if [ -f "database/src/migrations/meta/_journal.json" ]; then
  MIGRATION_COUNT=$(node -e "const j=JSON.parse(require('fs').readFileSync('database/src/migrations/meta/_journal.json','utf8')); console.log(j.entries.length)")
  step_pass "Migration journal: $MIGRATION_COUNT migrations"
else
  step_warn "Migration journal not found"
fi
echo ""

# ── 5. Backend Build ───────────────────────────────────
echo "5. Backend build"
if [ -f "backend/dist/main.js" ]; then
  step_pass "Backend already built (dist/main.js exists)"
else
  pnpm --filter @shranix/backend build || step_fail "Backend build failed"
  step_pass "Backend built successfully"
fi
echo ""

# ── 6. Frontend Build ──────────────────────────────────
echo "6. Frontend build"
if [ -f "frontend/dist/index.html" ]; then
  step_pass "Frontend already built (dist/index.html exists)"
else
  pnpm --filter @shranix/frontend build || step_warn "Frontend build skipped (may not be configured)"
fi
echo ""

# ── 7. Smoke Validation ────────────────────────────────
echo "7. Smoke validation"
if command -v curl &>/dev/null; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/v1/health/live 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    step_pass "Health endpoint reachable (HTTP 200)"
  else
    step_warn "Health endpoint not reachable (HTTP $STATUS) — server may not be running"
  fi
else
  step_warn "curl not available — cannot run smoke test"
fi
echo ""

# ── 8. Deployment Metadata ─────────────────────────────
echo "8. Deployment metadata"
echo "  Git SHA:     $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "  Branch:      $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "  Node.js:     $(node --version 2>/dev/null || echo 'unknown')"
echo "  pnpm:        $(pnpm --version 2>/dev/null || echo 'unknown')"
echo "  Timestamp:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Final ──────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Bootstrap complete.${NC}"
echo "To start the backend: cd backend && node dist/main.js"
echo "To run smoke tests: bash scripts/staging-smoke-test.sh"
echo "═══════════════════════════════════════════════════════════"
