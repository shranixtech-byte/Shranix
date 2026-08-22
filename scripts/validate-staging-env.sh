#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX ERP — Staging Environment Validator
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   bash scripts/validate-staging-env.sh
#
# Validates that all required staging environment variables are
# properly configured. Rejects placeholders and unsafe defaults.
#
# Exit code: 0 = valid, 1 = invalid
# Never prints secret values.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

ERRORS=0
WARNINGS=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "  ${YELLOW}!${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
skip() { echo -e "  ${YELLOW}○${NC} $1 (optional)"; }

check_required() {
  local var="$1" desc="$2"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    fail "$desc ($var) is NOT SET"
  elif echo "$val" | grep -qiE "^(change_me|changeme|secret|password|your_|replace|placeholder|example)"; then
    fail "$desc ($var) appears to be a placeholder"
  elif [ ${#val} -lt 10 ]; then
    fail "$desc ($var) is too short (${#val} chars, need 10+)"
  else
    pass "$desc ($var) is configured (${#val} chars)"
  fi
}

check_optional() {
  local var="$1" desc="$2"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    skip "$desc ($var) not set"
  else
    pass "$desc ($var) is configured"
  fi
}

check_url() {
  local var="$1" desc="$2"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    fail "$desc ($var) is NOT SET"
  elif echo "$val" | grep -qE "^https?://"; then
    pass "$desc ($var) has valid URL format"
  else
    fail "$desc ($var) is not a valid URL"
  fi
}

check_origin() {
  local var="$1" desc="$2"
  local val="${!var:-}"
  if [ -z "$val" ]; then
    fail "$desc ($var) is NOT SET"
  elif echo "$val" | grep -qE "^https?://[a-zA-Z0-9.-]+"; then
    pass "$desc ($var) has valid origin format"
  else
    warn "$desc ($var) may not be a valid origin"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " SHRANIX ERP — Staging Environment Validator"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Application ──────────────────────────────────────
echo "1. Application"
check_required "NODE_ENV" "Runtime environment"
check_required "APP_PORT" "Application port"
check_origin "CORS_ORIGINS" "CORS allowed origins"
echo ""

# ── 2. Database (PostgreSQL) ────────────────────────────
echo "2. Database (PostgreSQL)"
check_required "DATABASE_URL" "PostgreSQL connection string"
if echo "${DATABASE_URL:-}" | grep -q "postgresql://"; then
  pass "DATABASE_URL uses PostgreSQL protocol"
elif echo "${DATABASE_URL:-}" | grep -q "file:"; then
  warn "DATABASE_URL uses SQLite (LOCAL ONLY, not staging)"
else
  fail "DATABASE_URL does not appear to be PostgreSQL"
fi
echo ""

# ── 3. Authentication ──────────────────────────────────
echo "3. Authentication (JWT)"
check_required "JWT_SECRET" "JWT signing secret"
check_required "JWT_REFRESH_SECRET" "JWT refresh signing secret"
if [ "${#JWT_SECRET:-0}" -ge 32 ] 2>/dev/null; then
  pass "JWT_SECRET is >= 32 chars"
else
  warn "JWT_SECRET should be >= 32 chars for production"
fi
echo ""

# ── 4. Redis ────────────────────────────────────────────
echo "4. Redis"
if [ -n "${REDIS_URL:-}" ]; then
  pass "REDIS_URL is configured"
else
  warn "REDIS_URL is not set (optional for local dev)"
fi
echo ""

# ── 5. Storage ──────────────────────────────────────────
echo "5. Object Storage"
check_optional "STORAGE_ADAPTER" "Storage adapter"
check_optional "MINIO_ENDPOINT" "MinIO/S3 endpoint"
echo ""

# ── 6. Email (optional) ────────────────────────────────
echo "6. Email (SMTP)"
check_optional "SMTP_HOST" "SMTP host"
echo ""

# ── 7. Security Defaults ───────────────────────────────
echo "7. Security Defaults"
if [ "${NODE_ENV:-}" = "production" ]; then
  if [ "${SWAGGER_ENABLED:-false}" = "true" ]; then
    warn "Swagger enabled in production (consider disabling)"
  else
    pass "Swagger disabled in production"
  fi
else
  skip "Swagger check (not production)"
fi
echo ""

# ── Summary ────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
TOTAL=$((ERRORS + WARNINGS))
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}FAILED: $ERRORS error(s), $WARNINGS warning(s)${NC}"
  echo "═══════════════════════════════════════════════════════════"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}PASSED WITH WARNINGS: $WARNINGS warning(s)${NC}"
  echo "═══════════════════════════════════════════════════════════"
  exit 0
else
  echo -e "${GREEN}PASSED: All checks OK${NC}"
  echo "═══════════════════════════════════════════════════════════"
  exit 0
fi
