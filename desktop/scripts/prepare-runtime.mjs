#!/usr/bin/env node
/**
 * prepare-runtime.mjs
 *
 * Assembles a self-contained runtime directory for the desktop app.
 * Uses npm install (not pnpm) to avoid symlink issues.
 */
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const DESKTOP_DIR = resolve(import.meta.dirname, '..');
const ROOT_DIR = resolve(DESKTOP_DIR, '..');
const RUNTIME_DIR = join(DESKTOP_DIR, 'runtime');
const NODE_SRC = join(DESKTOP_DIR, 'node', 'win-x64', 'node.exe');
const BACKEND_DIR = join(ROOT_DIR, 'backend');
const DATABASE_DIR = join(ROOT_DIR, 'database');

console.log('[prepare-runtime] Starting...');

// 1. Clean
if (existsSync(RUNTIME_DIR)) {
  rmSync(RUNTIME_DIR, { recursive: true, force: true });
}
mkdirSync(RUNTIME_DIR, { recursive: true });

// 2. Copy node.exe
const nodeDest = join(RUNTIME_DIR, 'node', 'node.exe');
mkdirSync(join(RUNTIME_DIR, 'node'), { recursive: true });
cpSync(NODE_SRC, nodeDest);
console.log(`[prepare-runtime] node.exe ${(statSync(nodeDest).size / 1024 / 1024).toFixed(1)} MB`);

// 3. Create backend directory with cleaned package.json
const backendDest = join(RUNTIME_DIR, 'backend');
mkdirSync(backendDest, { recursive: true });

const pkg = JSON.parse(readFileSync(join(BACKEND_DIR, 'package.json'), 'utf8'));

// Remove workspace:* references (we copy them manually later)
for (const [dep, ver] of Object.entries(pkg.dependencies || {})) {
  if (ver.startsWith('workspace:')) {
    delete pkg.dependencies[dep];
  }
}
// xlsx CDN URL doesn't work with npm — use a compatible published version
if (pkg.dependencies.xlsx && pkg.dependencies.xlsx.includes('cdn.sheetjs.com')) {
  pkg.dependencies.xlsx = '0.18.5';
}
delete pkg.devDependencies;
writeFileSync(join(backendDest, 'package.json'), JSON.stringify(pkg, null, 2));
console.log('[prepare-runtime] Wrote cleaned package.json');

// 4. Install production deps with npm
console.log('[prepare-runtime] Installing production node_modules via npm...');
try {
  execSync('npm install --omit=dev --no-audit --no-fund', {
    cwd: backendDest,
    stdio: 'inherit',
    timeout: 180000,
  });
  console.log('[prepare-runtime] npm install complete');
} catch (e) {
  console.error(`[prepare-runtime] ERROR: npm install failed: ${e.message}`);
  process.exit(1);
}

// 5. Copy @shranix/database workspace package (AFTER npm install, so it's not overwritten)
const databaseDest = join(backendDest, 'node_modules', '@shranix', 'database');
mkdirSync(join(backendDest, 'node_modules', '@shranix'), { recursive: true });
cpSync(DATABASE_DIR, databaseDest, { recursive: true });
console.log('[prepare-runtime] Copied @shranix/database');

// 6. Install database package's own deps
console.log('[prepare-runtime] Installing @shranix/database deps...');
try {
  execSync('npm install --omit=dev --no-audit --no-fund', {
    cwd: databaseDest,
    stdio: 'inherit',
    timeout: 120000,
  });
  console.log('[prepare-runtime] Database deps installed');
} catch (e) {
  console.log(`[prepare-runtime] WARNING: Database deps install failed: ${e.message}`);
}

// 7. Copy backend dist (compiled JS)
mkdirSync(join(backendDest, 'dist'), { recursive: true });
cpSync(join(BACKEND_DIR, 'dist'), join(backendDest, 'dist'), { recursive: true });
console.log('[prepare-runtime] Copied backend/dist/');

// 8. Manifest
function countFiles(dir) {
  let count = 0;
  try {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      if (statSync(fp).isDirectory()) count += countFiles(fp);
      else count++;
    }
  } catch {}
  return count;
}
function dirSize(dir) {
  let size = 0;
  try {
    for (const f of readdirSync(dir)) {
      const fp = join(dir, f);
      const st = statSync(fp);
      if (st.isDirectory()) size += dirSize(fp);
      else size += st.size;
    }
  } catch {}
  return size;
}
const totalMB = (dirSize(RUNTIME_DIR) / 1024 / 1024).toFixed(1);
const manifest = { timestamp: new Date().toISOString(), nodeVersion: 'v24.18.0', totalSizeMB: totalMB };
writeFileSync(join(RUNTIME_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[prepare-runtime] Runtime: ${totalMB} MB`);
console.log('[prepare-runtime] Done.');
