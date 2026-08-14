#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SHRANIX Krushi ERP — Secret Scanner (Phase 17.17)
# Dependency-free: uses grep + git. Intended for local + CI use.
# Detects private keys, passwords, API keys, JWT secrets, DB creds,
# webhook secrets, payment credentials in the working tree and git history.
#
# Usage:
#   ./scripts/secret-scan.sh            # scan working tree
#   ./scripts/secret-scan.sh --history  # also scan full git history (slow)
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
FOUND_FILE="$(mktemp)"
echo 0 > "$FOUND_FILE"

# ── Patterns (high-signal only — keep false positives low) ────────────
PATTERNS=(
  '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
  'AKIA[0-9A-Z]{16}'                       # AWS access key id
  'sk_live_[0-9a-zA-Z]{20,}'               # Stripe live secret
  'rzp_live_[0-9a-zA-Z]{20,}'              # Razorpay live key
  'SG\.[0-9a-zA-Z_-]{20,}'                 # SendGrid key
  'ghp_[0-9A-Za-z]{30,}'                   # GitHub PAT
  'xox[baprs]-[0-9A-Za-z-]{20,}'           # Slack token
  '(JWT|PASSWORD|PASSWD|API[_-]?KEY|WEBHOOK[_-]?SECRET)[=:]["'"'"'][^"'"'"']{16,}["'"'"']'
  'postgres(ql)?://[^:/\s]+:[^@\s]+@'      # DB URL with embedded password
  'redis://:[^@\s]+@'                      # Redis URL with password
)

# ── Allowlist (documented dev/test defaults, CI refs — NOT secrets) ───
ALLOWLIST=(
  'change_me'
  'change-me'
  'dev-secret'
  'dev-secret-change-in-production'
  'shranix123'
  'example.com'
  'localhost'
  'smtp.example.com'
  'your-domain.com'
  'REPLACE_ME'
  'replace-me'
  'secrets.'               # GitHub Actions ${{ secrets.X }} references
  'process.env.'
  '${'                     # shell/docker env-var interpolation (e.g. ${REDIS_PASSWORD})
)

should_allow() {
  local line="$1"
  for a in "${ALLOWLIST[@]}"; do
    if [[ "$line" == *"$a"* ]]; then
      return 0
    fi
  done
  return 1
}

redact() {
  # sed with '|' delimiter — patterns contain '/'
  sed -E "s|($1)|<REDACTED>|g"
}

scan_files() {
  local files="$1"
  local label="$2"
  local pat
  for pat in "${PATTERNS[@]}"; do
    # shellcheck disable=SC2086
    grep -rEn "$pat" $files 2>/dev/null | while IFS= read -r line; do
      if should_allow "$line"; then
        continue
      fi
      echo -e "${RED}[SECRET]${NC} ($label) $(echo "$line" | redact "$pat")"
      echo $(( $(cat "$FOUND_FILE") + 1 )) > "$FOUND_FILE"
    done
  done
}

echo "── Scanning working tree (tracked files only) ──"
TRACKED="$(git ls-files | grep -vE '\.(lock|png|jpg|jpeg|pdf|ico|gif|woff2?|ttf|eot)$' | tr '\n' ' ')"
scan_files "$TRACKED" "tree"

if [[ "${1:-}" == "--history" ]]; then
  echo "── Scanning git history (all commits) ──"
  git rev-list --all | while IFS= read -r commit; do
    git grep -E -n --no-color 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|rzp_live_|sk_live_|ghp_[0-9A-Za-z]{30,}' "$commit" -- ':!*.lock' ':!*.png' ':!*.jpg' ':!*.pdf' 2>/dev/null | while IFS= read -r line; do
      if should_allow "$line"; then
        continue
      fi
      echo -e "${RED}[SECRET]${NC} (history) $line"
      echo $(( $(cat "$FOUND_FILE") + 1 )) > "$FOUND_FILE"
    done
  done
fi

FOUND="$(cat "$FOUND_FILE")"
rm -f "$FOUND_FILE"

if [[ "$FOUND" -gt 0 ]]; then
  echo -e "${RED}✗ ${FOUND} potential secret(s) found. Review and remove them.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ No high-signal secrets found in repository.${NC}"
  exit 0
fi
