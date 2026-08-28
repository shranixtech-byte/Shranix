#!/usr/bin/env node
/**
 * Prepare desktop resources for the Tauri build.
 * Copies: backend dist, minimal node_modules, bundled Node.js
 *
 * Usage: node scripts/prepare-desktop-resources.mjs
 */
import { existsSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DESKTOP = join(__dirname, '..');
const DEST = join(DESKTOP, 'resources');

// Minimal node_modules that the backend NEEDS at runtime
const REQUIRED_MODULES = [
  // Core NestJS
  '@nestjs',
  // Express
  'express',
  'body-parser',
  'accepts',
  'cookie',
  'cookie-signature',
  'debug',
  'depd',
  'destroy',
  'ee-first',
  'etag',
  'finalhandler',
  'forwarded',
  'fresh',
  'http-errors',
  'iconv-lite',
  'media-typer',
  'ms',
  'on-finished',
  'parseurl',
  'path-to-regexp',
  'proxy-addr',
  'qs',
  'range-parser',
  'raw-body',
  'safe-buffer',
  'send',
  'serve-static',
  'setprototypeof',
  'shallow-clone',
  'side-channel',
  'snake-case',
  'toid',
  'type-is',
  'unpipe',
  'utils-merge',
  'vary',
  // Database
  '@libsql',
  '@libsql/client',
  'better-sqlite3',
  'drizzle-orm',
  // Security
  'argon2',
  'helmet',
  'passport',
  'passport-jwt',
  'jsonwebtoken',
  'jose',
  // Config / utils
  'class-transformer',
  'class-validator',
  'rxjs',
  'reflect-metadata',
  'uuid',
  'zod',
  'compression',
  'cookie-parser',
  'pino',
  'pino-pretty',
  'nestjs-pino',
  // PDF
  'puppeteer-core',
  '@sparticuz/chromium',
  // Native bindings
  'node-addon-api',
  'node-gyp-build',
  'prebuild-install',
];

function copyDir(src, dest, maxDepth = 4) {
  if (maxDepth <= 0) return;
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      // Skip .cache, .git, test directories
      if (['.cache', '.git', 'test', 'tests', '__tests__'].includes(entry)) continue;
      copyDir(srcPath, destPath, maxDepth - 1);
    } else {
      cpSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('[prepare] Preparing desktop resources...');

  // 1. Clean destination
  if (existsSync(DEST)) {
    cpSync(DEST, join(DEST, '.bak'), { recursive: true });
  }
  mkdirSync(DEST, { recursive: true });

  // 2. Copy backend dist
  const backendDist = join(ROOT, 'backend', 'dist');
  const destDist = join(DEST, 'backend', 'dist');
  console.log('[prepare] Copying backend dist...');
  cpSync(backendDist, destDist, { recursive: true });

  // 3. Copy minimal node_modules
  const srcModules = join(ROOT, 'node_modules');
  const destModules = join(DEST, 'node_modules');
  mkdirSync(destModules, { recursive: true });

  for (const mod of REQUIRED_MODULES) {
    const src = join(srcModules, mod);
    const dest = join(destModules, mod);
    if (existsSync(src) && !existsSync(dest)) {
      console.log(`[prepare] Copying ${mod}...`);
      cpSync(src, dest, { recursive: true });
    }
  }

  // 4. Copy bundled Node.js
  const nodeSrc = join(DESKTOP, 'node', 'win-x64');
  const nodeDest = join(DEST, 'node', 'win-x64');
  if (existsSync(nodeSrc)) {
    console.log('[prepare] Copying bundled Node.js...');
    cpSync(nodeSrc, nodeDest, { recursive: true });
  }

  console.log('[prepare] Desktop resources prepared at:', DEST);
}

main();
