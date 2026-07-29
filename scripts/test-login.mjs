import { spawn } from 'child_process';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ── Step 1: Query Database ─────────────────────────────
console.log('=== STEP 1: DATABASE VERIFICATION ===');
const dbPath = path.resolve(rootDir, 'database', 'data', 'dev.db');
let dbClient;
try {
  dbClient = createClient({ url: 'file:' + dbPath });
  const users = await dbClient.execute({
    sql: 'SELECT id, email, is_active, is_email_verified, failed_login_attempts, locked_until, refresh_token_version, last_login_at FROM shranix_users',
    args: []
  });
  console.log('Users found:', users.rows.length);
  users.rows.forEach(u => console.log('  -', u.email, '| active:', u.is_active, '| verified:', u.is_email_verified, '| attempts:', u.failed_login_attempts, '| locked:', u.locked_until, '| last_login:', u.last_login_at));
} catch(e) {
  console.log('DB Error:', e.message);
}
if (dbClient) dbClient.close();

// ── Step 2: Start Backend ──────────────────────────────
console.log('\n=== STEP 2: STARTING BACKEND ===');
const backend = spawn('pnpm', ['--filter', '@shranix/backend', 'start'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

let backendOutput = '';
let backendReady = false;

await new Promise((resolve) => {
  const timeout = setTimeout(() => {
    console.log('Backend start timeout (25s)');
    resolve();
  }, 25000);

  backend.stdout.on('data', (data) => {
    const text = data.toString();
    backendOutput += text;
    process.stdout.write(text);
    if (text.includes('Nest application successfully started')) {
      backendReady = true;
      console.log('\n✓ Backend ready!');
      clearTimeout(timeout);
      setTimeout(resolve, 1000); // Wait 1 more second for stability
    }
  });

  backend.stderr.on('data', (data) => {
    const text = data.toString();
    backendOutput += text;
    process.stderr.write(text);
  });

  backend.on('error', (err) => {
    console.log('Backend spawn error:', err.message);
    clearTimeout(timeout);
    resolve();
  });
});

// ── Step 3: Test Login API ────────────────────────────
console.log('\n=== STEP 3: TESTING LOGIN API ===');
if (backendReady) {
  try {
    const res = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' })
    });
    
    console.log('HTTP Status:', res.status, res.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(res.headers), null, 2));
    
    const body = await res.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));
    
    if (res.ok && body.success && body.data && body.data.tokens) {
      console.log('\n✓ LOGIN SUCCESSFUL');
      console.log('Access Token:', body.data.tokens.accessToken.substring(0, 50) + '...');
      console.log('Refresh Token:', body.data.tokens.refreshToken.substring(0, 50) + '...');
      console.log('User:', body.data.user.email, '-', body.data.user.firstName, body.data.user.lastName);
      
      // Decode JWT to see payload
      const payload = JSON.parse(Buffer.from(body.data.tokens.accessToken.split('.')[1], 'base64').toString());
      console.log('JWT Payload:', JSON.stringify(payload, null, 2));
    } else {
      console.log('\n✗ LOGIN FAILED');
    }
  } catch(e) {
    console.log('Login Error:', e.message);
    if (e.cause) console.log('Cause:', e.cause);
  }
} else {
  console.log('Backend not ready, cannot test login');
  console.log('Last 500 chars of backend output:', backendOutput.slice(-500));
}

// ── Step 4: Cleanup ────────────────────────────────────
console.log('\n=== STEP 4: CLEANUP ===');
backend.kill('SIGTERM');
console.log('Backend process terminated');
console.log('\n=== REPORT END ===');
