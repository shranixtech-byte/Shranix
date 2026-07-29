import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
console.log('Starting servers from:', rootDir);

// Start backend
console.log('Starting backend...');
const backend = spawn('pnpm', ['--filter', '@shranix/backend', 'start'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

backend.stdout.on('data', (d) => process.stdout.write('[BACKEND] ' + d));
backend.stderr.on('data', (d) => process.stderr.write('[BACKEND-ERR] ' + d));
backend.on('exit', (code) => console.log('[BACKEND] Exited with code', code));

// Wait for backend
await new Promise(r => {
  const check = setInterval(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email:'test',password:'test'}) });
      if (res.status === 401) { clearInterval(check); r(); }
    } catch(e) {}
  }, 1000);
  setTimeout(() => { clearInterval(check); console.log('[BACKEND] Timeout waiting for startup'); r(); }, 20000);
});

// Start frontend
console.log('\nStarting frontend...');
const frontend = spawn('pnpm', ['--filter', '@shranix/frontend', 'dev'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

frontend.stdout.on('data', (d) => process.stdout.write('[FRONTEND] ' + d));
frontend.stderr.on('data', (d) => process.stderr.write('[FRONTEND-ERR] ' + d));
frontend.on('exit', (code) => console.log('[FRONTEND] Exited with code', code));

// Keep running
console.log('\n=== SERVERS RUNNING ===');
console.log('Backend PID:', backend.pid);
console.log('Frontend PID:', frontend.pid);
console.log('\nPress Ctrl+C to stop.');

process.on('SIGINT', () => {
  backend.kill(); frontend.kill();
  process.exit();
});

// Keep alive
await new Promise(() => {});
