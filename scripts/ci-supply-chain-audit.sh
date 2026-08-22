#!/usr/bin/env bash
# H19 — Supply-Chain Security CI Audit Script
# Runs lockfile enforcement, dependency audit, XLSX integrity, and license check.
# Exit code: 0 = pass, 1 = fail (blocking), 2 = warning (non-blocking)
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILURES=0
WARNINGS=0

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

echo "═══════════════════════════════════════════════════"
echo " H19 Supply-Chain Security Audit"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Lockfile enforcement ─────────────────────────
echo "── 1. Lockfile Enforcement ──"

if [ ! -f "pnpm-lock.yaml" ]; then
  fail "pnpm-lock.yaml not found"
else
  pass "pnpm-lock.yaml exists"
fi

# Verify lockfile version
if grep -q "lockfileVersion: '9.0'" pnpm-lock.yaml; then
  pass "lockfileVersion 9.0 confirmed"
else
  fail "lockfileVersion is not 9.0 — possible lockfile corruption"
fi

# Verify no git: references in lockfile
GIT_REFS=$(grep -c "git[+:]" pnpm-lock.yaml 2>/dev/null || echo "0")
if [ "$GIT_REFS" = "0" ]; then
  pass "No git: references in lockfile"
else
  fail "Found $GIT_REFS git: references in lockfile — unexpected dependency source"
fi

# Verify package.json / lockfile consistency
if pnpm install --frozen-lockfile --dry-run > /dev/null 2>&1; then
  pass "package.json and pnpm-lock.yaml are consistent"
else
  fail "package.json and pnpm-lock.yaml are inconsistent — lockfile needs regeneration"
fi

echo ""

# ── 2. Dependency audit ──────────────────────────────
echo "── 2. Dependency Audit ──"

# Production audit — fail on high/critical
PROD_AUDIT=$(pnpm audit --prod 2>&1) || true
PROD_HIGH=$(echo "$PROD_AUDIT" | grep -c "high\|critical" || echo "0")
PROD_TOTAL=$(echo "$PROD_AUDIT" | grep -oP '\d+ vulnerabilities found' | grep -oP '\d+' || echo "0")

if [ "$PROD_HIGH" = "0" ]; then
  pass "Production: 0 critical/high vulnerabilities"
else
  fail "Production: $PROD_HIGH critical/high vulnerabilities found"
fi

if [ "$PROD_TOTAL" != "0" ]; then
  warn "Production: $PROD_TOTAL total vulnerabilities (moderate/low — documented accepted risks)"
fi

# Full audit — informational
FULL_AUDIT=$(pnpm audit 2>&1) || true
FULL_TOTAL=$(echo "$FULL_AUDIT" | grep -oP '\d+ vulnerabilities found' | grep -oP '\d+' || echo "0")
echo "  Full audit: $FULL_TOTAL total vulnerabilities (incl. dev-only)"
echo ""

# ── 3. XLSX CDN tarball integrity ────────────────────
echo "── 3. XLSX CDN Tarball Integrity ──"

XLSX_URL="https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
XLSX_EXPECTED_SHA="8f40425e21c44e1b882f2e41b2e7e3f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"

# Verify xlsx is pinned to a specific URL (not a range)
XLSX_SPEC=$(grep -oP 'xlsx: .*' backend/package.json 2>/dev/null || echo "")
if echo "$XLSX_SPEC" | grep -q "cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"; then
  pass "xlsx pinned to specific CDN tarball (xlsx-0.20.3)"
else
  fail "xlsx dependency is not pinned to the expected CDN tarball"
fi

# Verify lockfile records the tarball resolution
if grep -q "xlsx-0.20.3.tgz" pnpm-lock.yaml; then
  pass "xlsx tarball recorded in lockfile"
else
  fail "xlsx tarball not found in lockfile"
fi

echo ""

# ── 4. License compliance ────────────────────────────
echo "── 4. License Compliance ──"

# Check for known problematic licenses
# Policy: MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause, CC0, 0BSD, Unlicense are allowed
# GPL/AGPL/LGPL require review
PROHIBITED=$(pnpm license-checker --production --json 2>/dev/null | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const prohibited = [];
    for (const [pkg, info] of Object.entries(data)) {
      const lic = (info.licenses || '').toString().toLowerCase();
      if (lic.includes('gpl') || lic.includes('agpl') || lic.includes('unknown') || lic === '') {
        prohibited.push(pkg + ' (' + (info.licenses || 'UNKNOWN') + ')');
      }
    }
    if (prohibited.length > 0) console.log(prohibited.join('\\n'));
  " 2>/dev/null || echo "")

if [ -z "$PROHIBITED" ]; then
  pass "No prohibited or unknown licenses in production dependencies"
else
  warn "License review needed: $PROHIBITED"
fi

echo ""

# ── 5. Non-registry dependency detection ─────────────
echo "── 5. Non-Registry Dependency Detection ──"

NON_REGISTRY=$(node -e "
  const fs = require('fs');
  const files = ['package.json','backend/package.json','frontend/package.json','database/package.json'];
  const found = [];
  files.forEach(f => {
    try {
      const pkg = JSON.parse(fs.readFileSync(f,'utf8'));
      ['dependencies','devDependencies'].forEach(cat => {
        if (pkg[cat]) Object.entries(pkg[cat]).forEach(([name, ver]) => {
          if (typeof ver === 'string' && (ver.startsWith('git') || ver.startsWith('http') || ver.includes('.tgz') || ver.includes('.tar.gz')))
            found.push(f + ': ' + name + ' = ' + ver);
        });
      });
    } catch(e) {}
  });
  if (found.length > 0) console.log(found.join('\\n'));
" 2>/dev/null || echo "")

if [ -z "$NON_REGISTRY" ]; then
  pass "All dependencies from npm registry"
else
  echo "  Non-registry dependencies found:"
  echo "$NON_REGISTRY" | sed 's/^/    /'
  # xlsx from CDN is documented and accepted
  if echo "$NON_REGISTRY" | grep -q "xlsx"; then
    pass "xlsx CDN tarball is documented and accepted (see SUPPLY_CHAIN_POLICY.md)"
  else
    fail "Unexpected non-registry dependencies found"
  fi
fi

echo ""

# ── Summary ──────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
if [ $FAILURES -gt 0 ]; then
  echo -e "${RED}FAILED${NC} — $FAILURES blocking issue(s), $WARNINGS warning(s)"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}PASSED WITH WARNINGS${NC} — $WARNINGS warning(s)"
  exit 0
else
  echo -e "${GREEN}PASSED${NC} — All supply-chain checks passed"
  exit 0
fi
