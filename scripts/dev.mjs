#!/usr/bin/env node
/**
 * Development startup script
 * Kills lingering processes, starts backend first, waits for it to be ready,
 * then starts frontend. Prevents race conditions and port conflicts.
 */

import { spawn, execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const BACKEND_PORT = 4001;
const FRONTEND_PORT = 4000;
// Health is excluded from global prefix (api) but URI versioning (v1) applies.
// Routes: GET /v1/health, GET /v1/health/live, GET /v1/health/ready
// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution delays on Windows.
const BACKEND_HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/v1/health`;

function killProcessOnPort(port) {
  try {
    if (os.platform() === 'win32') {
      const result = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: 'utf8',
        timeout: 5000,
      });
      const lines = result.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid))) {
          try {
            // NOTE: `taskkill /PID x /F` ko bash mein template-string se mat chalao —
            // Git Bash `/PID` ko path samajh kar mangle kar deta hai (`//PID` error).
            // spawnSync + args array = koi shell nahi → arguments seedhe taskkill.exe ko jaate hain.
            const kill = spawnSync('taskkill', ['/PID', String(pid), '/F'], { timeout: 3000, stdio: 'ignore' });
            if (kill.status === 0) {
              console.log(`  Killed PID ${pid} on port ${port}`);
            }
          } catch {}
        }
      }
    }
  } catch {
    // No process on this port - that's fine
  }
}

async function waitForBackend(maxWaitMs = 60000) {
  const start = Date.now();
  // Give the OS a moment after spawn before polling.
  await new Promise(r => setTimeout(r, 2000));
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(BACKEND_HEALTH_URL, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        console.log(`\n✓ Backend ready after ${Date.now() - start}ms`);
        await new Promise(r => setTimeout(r, 1000));
        return true;
      }
    } catch {
      // Backend not ready yet — retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.error(`\n✗ Backend did not become ready within ${maxWaitMs}ms`);
  console.error('  The backend may still be starting. Check with: curl http://127.0.0.1:4001/v1/health');
  return false;
}

async function main() {
  console.log('🚀 Starting SHRANIX Krushi ERP development servers...\n');

  // Step 1: Kill lingering processes
  console.log(`📡 Cleaning ports ${BACKEND_PORT} (backend) and ${FRONTEND_PORT} (frontend)...`);
  killProcessOnPort(BACKEND_PORT);
  killProcessOnPort(FRONTEND_PORT);
  await new Promise(r => setTimeout(r, 1000));
  console.log('  Ports cleared.\n');

  // Step 2: Build database + backend (fresh compilation, prevents stale-dist race)
  console.log('🔧 Building database + backend...');
  try {
    execSync('pnpm --filter @shranix/database build', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'inherit'],
      timeout: 60000,
    });
    execSync('pnpm --filter @shranix/backend build', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'inherit'],
      timeout: 60000,
    });
    console.log('  Build complete.\n');
  } catch {
    console.error('\n✗ Backend build failed. Check for compilation errors.');
    process.exit(1);
  }

  // Step 3: Start backend (directly run dist/main.js — no watch mode to avoid double spawn)
  console.log('🔧 Starting backend...');
  const backend = spawn('node', ['backend/dist/main.js'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  backend.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Error') || text.includes('error') || text.includes('listening') || text.includes('Nest application') || text.includes('Application is running')) {
      process.stdout.write(`[BACKEND] ${text}`);
    }
  });
  backend.stderr.on('data', (d) => process.stderr.write(`[BACKEND] ${d}`));
  backend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n⚠ Backend exited with code ${code}`);
    }
  });

  // Step 4: Wait for backend health check
  const backendReady = await waitForBackend();
  if (!backendReady) {
    console.error('\n✗ Backend failed to start. Check the logs above.');
    backend.kill();
    process.exit(1);
  }

  // Step 5: Start frontend
  console.log('\n🎨 Starting frontend...');
  const frontend = spawn('pnpm', ['--filter', '@shranix/frontend', 'dev'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  frontend.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('ready') || text.includes('Local') || text.includes('Error') || text.includes('error')) {
      process.stdout.write(`[FRONTEND] ${text}`);
    }
  });
  frontend.stderr.on('data', (d) => process.stderr.write(`[FRONTEND] ${d}`));
  frontend.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n⚠ Frontend exited with code ${code}`);
    }
  });

  // Step 6: Wait briefly for frontend
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n✅ Development servers running!');
  console.log(`   Frontend: http://localhost:${FRONTEND_PORT}`);
  console.log(`   Backend:  http://localhost:${BACKEND_PORT}`);
  console.log('\n   Press Ctrl+C to stop.\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

  await new Promise(() => {}); // Keep alive
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
