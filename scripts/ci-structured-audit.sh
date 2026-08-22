#!/usr/bin/env bash
# H20 — Structured Dependency Audit (machine-readable)
# Produces JSON output for CI integration and policy enforcement.
set -euo pipefail

OUTPUT_DIR="${1:-./audit-reports}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
REPORT_FILE="$OUTPUT_DIR/audit-${TIMESTAMP}.json"

echo "── Running Structured Dependency Audit ──"

# Run pnpm audit and capture output
AUDIT_OUTPUT=$(pnpm audit --json 2>&1) || true

# Parse and structure the output
node -e "
const fs = require('fs');
const auditRaw = fs.readFileSync('/dev/stdin', 'utf8').trim();

let auditData;
try {
  auditData = JSON.parse(auditRaw);
} catch(e) {
  // pnpm audit --json may not be supported; create structured report from CLI output
  auditData = null;
}

const report = {
  timestamp: new Date().toISOString(),
  tool: 'pnpm-audit',
  policy: {
    critical: 'block',
    high: 'block',
    moderate: 'warn',
    low: 'info'
  },
  summary: {
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0
  },
  vulnerabilities: [],
  verdict: 'PASS'
};

if (auditData && auditData advisories) {
  // pnpm audit JSON format
  for (const [id, advisory] of Object.entries(auditData.advisories)) {
    const vuln = {
      id,
      package: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title,
      vulnerable_range: advisory.vulnerable_versions,
      patched_range: advisory.patched_versions,
      paths: advisory.findings?.map(f => f.paths).flat() || [],
      url: advisory.url
    };
    report.vulnerabilities.push(vuln);
    report.summary.total++;
    report.summary[advisory.severity] = (report.summary[advisory.severity] || 0) + 1;
  }
} else {
  // Fallback: parse human-readable output
  const lines = auditRaw.split('\n');
  let current = {};
  for (const line of lines) {
    if (line.includes('│ critical')) report.summary.critical++;
    else if (line.includes('│ high')) report.summary.high++;
    else if (line.includes('│ moderate')) report.summary.moderate++;
    else if (line.includes('│ low')) report.summary.low++;
  }
  report.summary.total = report.summary.critical + report.summary.high + report.summary.moderate + report.summary.low;

  if (auditRaw.includes('No known vulnerabilities found')) {
    report.summary.total = 0;
  }
}

// Apply policy
if (report.summary.critical > 0 || report.summary.high > 0) {
  report.verdict = 'FAIL';
} else if (report.summary.moderate > 0) {
  report.verdict = 'WARN';
} else {
  report.verdict = 'PASS';
}

fs.writeFileSync(process.argv[1], JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log('Verdict: ' + report.verdict);
console.log('Report: ' + process.argv[1]);
" "$REPORT_FILE"

echo ""
echo "✓ Audit report: $REPORT_FILE"
