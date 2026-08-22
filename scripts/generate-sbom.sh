#!/usr/bin/env bash
# H20 — Software Bill of Materials (SBOM) Generation
# Generates a CycloneDX-compatible JSON SBOM from the pnpm dependency graph.
set -euo pipefail

OUTPUT_DIR="${1:-./sbom}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
SBOM_FILE="$OUTPUT_DIR/sbom-${TIMESTAMP}.json"

echo "── Generating SBOM ──"

# Method: Use pnpm's built-in dependency listing + node to build CycloneDX JSON
node -e "
const fs = require('fs');
const { execSync } = require('child_process');

// Get all workspace packages
const workspaces = ['backend', 'frontend', 'database'];
const packages = [];

// Root package
try {
  const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packages.push({
    name: rootPkg.name || 'root',
    version: rootPkg.version || '0.0.0',
    type: 'application',
    scope: 'required'
  });
} catch(e) {}

// Workspace packages
workspaces.forEach(ws => {
  try {
    const pkg = JSON.parse(fs.readFileSync(ws + '/package.json', 'utf8'));
    packages.push({
      name: pkg.name || ws,
      version: pkg.version || '0.0.0',
      type: 'application',
      scope: 'required'
    });

    // Add all dependencies
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    Object.entries(allDeps).forEach(([name, version]) => {
      packages.push({
        name,
        version: version.replace(/[^\\d.]/g, ''),
        type: 'library',
        scope: pkg.dependencies?.[name] ? 'required' : 'optional'
      });
    });
  } catch(e) {}
});

// Deduplicate
const seen = new Set();
const unique = packages.filter(p => {
  const key = p.name + '@' + p.version;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Build CycloneDX JSON
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [
      {
        vendor: 'shranix',
        name: 'generate-sbom.sh',
        version: '1.0.0'
      }
    ],
    component: {
      name: 'shranix-krushi-erp',
      version: '1.0.0',
      type: 'application'
    }
  },
  components: unique.map(p => ({
    type: p.type === 'application' ? 'application' : 'library',
    name: p.name,
    version: p.version,
    scope: p.scope
  }))
};

fs.writeFileSync(process.argv[1], JSON.stringify(sbom, null, 2));
console.log('SBOM written to: ' + process.argv[1]);
console.log('Components: ' + unique.length);
" "$SBOM_FILE"

echo "✓ SBOM generated: $SBOM_FILE"
echo "  Format: CycloneDX 1.5 JSON"
echo "  Components: $(node -e "console.log(JSON.parse(require('fs').readFileSync('$SBOM_FILE','utf8')).components.length)")"
