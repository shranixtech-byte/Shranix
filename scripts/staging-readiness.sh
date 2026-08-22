#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX ERP — Single-Command Staging Readiness Check
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   bash scripts/staging-readiness.sh [BASE_URL]
#
# Default BASE_URL: http://localhost:4001
#
# Produces a definitive staging readiness classification.
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

BASE_URL="${1:-http://localhost:4001}"
PASS_COUNT=0
BLOCK_COUNT=0
NOTRUN_COUNT=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

check_pass() { echo -e "  ${GREEN}PASS${NC}   $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
check_blocked() { echo -e "  ${RED}BLOCKED${NC} $1"; BLOCK_COUNT=$((BLOCK_COUNT + 1)); }
check_notrun() { echo -e "  ${YELLOW}NOT RUN${NC} $1"; NOTRUN_COUNT=$((NOTRUN_COUNT + 1)); }

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " SHRANIX ERP — Staging Readiness Gate"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. CODE ─────────────────────────────────────────────
echo "1. CODE"
if [ -f "backend/dist/main.js" ]; then
  check_pass "Backend built (dist/main.js exists)"
else
  check_blocked "Backend not built (run: pnpm --filter @shranix/backend build)"
fi

if [ -f "backend/data/dev.db" ] || [ -f "backend/data/prod.db" ]; then
  check_pass "Database file exists"
else
  check_blocked "No database file found"
fi
echo ""

# ── 2. DEPENDENCIES ─────────────────────────────────────
echo "2. DEPENDENCIES"
if [ -f "pnpm-lock.yaml" ]; then
  check_pass "Lockfile exists"
else
  check_blocked "No lockfile (run: pnpm install)"
fi
echo ""

# ── 3. DATABASE ─────────────────────────────────────────
echo "3. DATABASE"
if [ -n "${DATABASE_URL:-}" ]; then
  if echo "$DATABASE_URL" | grep -q "postgresql://"; then
    check_pass "PostgreSQL configured"
  elif echo "$DATABASE_URL" | grep -q "file:"; then
    check_blocked "SQLite only (LOCAL, not staging)"
  else
    check_blocked "Unknown database URL format"
  fi
else
  check_blocked "DATABASE_URL not set"
fi
echo ""

# ── 4. REDIS ────────────────────────────────────────────
echo "4. REDIS"
if [ -n "${REDIS_URL:-}" ]; then
  check_pass "REDIS_URL configured"
else
  check_blocked "REDIS_URL not set"
fi
echo ""

# ── 5. STORAGE ──────────────────────────────────────────
echo "5. STORAGE"
if [ -n "${MINIO_ENDPOINT:-}" ] || [ -n "${STORAGE_ADAPTER:-}" ]; then
  check_pass "Object storage configured"
else
  check_blocked "Object storage not configured"
fi
echo ""

# ── 6. TLS ──────────────────────────────────────────────
echo "6. TLS"
if echo "$BASE_URL" | grep -q "^https://"; then
  check_pass "HTTPS configured"
else
  check_blocked "HTTP only (no TLS)"
fi
echo ""

# ── 7. HEALTH ───────────────────────────────────────────
echo "7. HEALTH"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/v1/health/live" 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  check_pass "Health endpoint reachable (HTTP 200)"
else
  check_notrun "Health endpoint not reachable (HTTP $HEALTH_STATUS)"
fi
echo ""

# ── 8. MONITORING ──────────────────────────────────────
echo "8. MONITORING"
if [ -n "${SENTRY_DSN:-}" ]; then
  check_pass "Sentry DSN configured"
else
  check_blocked "No Sentry DSN"
fi
echo ""

# ── 9. PAYMENT ──────────────────────────────────────────
echo "9. PAYMENT"
if [ -n "${RAZORPAY_KEY_ID:-}" ]; then
  check_pass "Razorpay configured"
else
  check_blocked "No Razorpay credentials"
fi
echo ""

# ── 10. LOAD TESTING ───────────────────────────────────
echo "10. LOAD TESTING"
if command -v k6 &>/dev/null; then
  check_pass "k6 installed"
else
  check_blocked "k6 not installed"
fi
echo ""

# ── Summary ────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
TOTAL=$((PASS_COUNT + BLOCK_COUNT + NOTRUN_COUNT))
echo -e " Total: $TOTAL | ${GREEN}PASS: $PASS_COUNT${NC} | ${RED}BLOCKED: $BLOCK_COUNT${NC} | ${YELLOW}NOT RUN: $NOTRUN_COUNT${NC}"
echo ""

if [ "$BLOCK_COUNT" -eq 0 ] && [ "$NOTRUN_COUNT" -eq 0 ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  STAGING READY                        ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
elif [ "$PASS_COUNT" -gt 0 ] && [ "$BLOCK_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}╔═══════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  STAGING PARTIAL                      ║${NC}"
  echo -e "${YELLOW}╚═══════════════════════════════════════╝${NC}"
else
  echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
  echo -e "${RED}║  STAGING BLOCKED                      ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
fi
echo ""
