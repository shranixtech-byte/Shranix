#!/usr/bin/env node
/**
 * Bundle the NestJS backend into a single self-contained JS file.
 * This eliminates the need for node_modules in the distributed app.
 *
 * Usage: node scripts/bundle-backend.mjs
 */
import { build } from 'esbuild';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const BACKEND = join(ROOT, 'backend');
const OUT = join(__dirname, '..', 'backend-dist');

async function main() {
  console.log('[bundle] Starting backend bundle...');

  // Ensure output directory
  if (!existsSync(OUT)) {
    mkdirSync(OUT, { recursive: true });
  }

  // Bundle main.js and all its imports into a single file
  await build({
    entryPoints: [join(BACKEND, 'dist', 'main.js')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: join(OUT, 'main.js'),
    external: [
      // Native modules that can't be bundled
      'argon2',
      'puppeteer-core',
      '@sparticuz/chromium',
      // SQLite native (libsql uses native bindings)
      '@libsql/client',
    ],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    banner: {
      js: '// SHRANIX Krushi ERP — Bundled Backend',
    },
    footer: {
      js: '',
    },
    minify: false,
    sourcemap: false,
    metafile: true,
    logLevel: 'info',
  });

  // Copy native modules that can't be bundled
  const nativeModules = [
    'argon2',
    '@libsql/client',
    '@libsql',
    'node-addon-api',
    'node-gyp-build',
  ];

  const srcNodeModules = join(ROOT, 'node_modules');
  const outNodeModules = join(OUT, 'node_modules');

  if (!existsSync(outNodeModules)) {
    mkdirSync(outNodeModules, { recursive: true });
  }

  for (const mod of nativeModules) {
    const src = join(srcNodeModules, mod);
    const dest = join(outNodeModules, mod);
    if (existsSync(src) && !existsSync(dest)) {
      console.log(`[bundle] Copying native module: ${mod}`);
      cpSync(src, dest, { recursive: true });
    }
  }

  // Also copy @shranix/database if needed
  const dbSrc = join(ROOT, 'database', 'dist');
  const dbDest = join(OUT, 'node_modules', '@shranix', 'database');
  if (existsSync(dbSrc) && !existsSync(dbDest)) {
    mkdirSync(dirname(dbDest), { recursive: true });
    console.log('[bundle] Copying @shranix/database');
    cpSync(dbSrc, dbDest, { recursive: true });
  }

  console.log('[bundle] Backend bundled successfully to:', OUT);
  console.log('[bundle] Output: main.js + node_modules/ (native only)');
}

main().catch((err) => {
  console.error('[bundle] Failed:', err);
  process.exit(1);
});
