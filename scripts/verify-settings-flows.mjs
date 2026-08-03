// Functional wiring test for API Settings — cookie jar ke saath (CSRF round-trip).
// Usage: node scripts/verify-settings-flows.mjs [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4001/api/v1';

// ── Tiny cookie jar ──
let jar = new Map();
function absorb(res) {
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
  for (const c of cookies) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) { jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1)); }
  }
}
function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-csrf-token': jar.get('csrf_token') || '', Cookie: cookieHeader() };
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  absorb(res);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json?.data ?? json };
}

async function main() {
  // 1) CSRF + login
  let r = await req('POST', '/auth/csrf');
  if (!jar.get('csrf_token')) { console.log('✗ no csrf cookie'); process.exit(1); }
  r = await req('POST', '/auth/login', { email: 'admin@shranix.com', password: 'admin123' });
  const token = r.data?.tokens?.accessToken || r.data?.accessToken;
  if (!token) { console.log('✗ login failed:', r.status); process.exit(1); }
  console.log('✓ login ok');

  const auth = (m, p, b) => {
    const headers = { 'Content-Type': 'application/json', 'x-csrf-token': jar.get('csrf_token') || '', Cookie: cookieHeader(), Authorization: `Bearer ${token}` };
    return fetch(`${BASE}${p}`, { method: m, headers, body: b ? JSON.stringify(b) : undefined }).then(async (res) => {
      absorb(res);
      const j = await res.json().catch(() => ({}));
      return { status: res.status, data: j?.data ?? j };
    });
  };

  // 2) API key: create → list → delete
  let k = await auth('POST', '/integrations/api-keys', { name: 'wiring-test' });
  console.log('create api-key:', k.status, k.status < 300 ? `key=${String(k.data?.key || '').slice(0, 8)}…` : JSON.stringify(k.data).slice(0, 100));
  const kid = k.data?.id;
  if (kid) {
    const kl = await auth('GET', '/integrations/api-keys');
    console.log('list api-keys:', kl.status, 'count=', (kl.data?.data || kl.data || []).length);
    const del = await auth('DELETE', `/integrations/api-keys/${kid}`);
    console.log('delete api-key:', del.status);
  }

  // 3) Webhook: create → test (fake URL → structured failure) → delete
  let w = await auth('POST', '/integrations/webhooks', { name: 'wiring-hook', url: 'http://localhost:1/nope', events: 'invoice.created', isActive: true });
  console.log('create webhook:', w.status, w.status < 300 ? '' : JSON.stringify(w.data).slice(0, 100));
  const wid = w.data?.id;
  if (wid) {
    const t = await auth('POST', `/integrations/webhooks/${wid}/test`);
    console.log('test webhook:', t.status, '→', JSON.stringify(t.data).slice(0, 100));
    const del = await auth('DELETE', `/integrations/webhooks/${wid}`);
    console.log('delete webhook:', del.status);
  }

  // 4) Settings KV: PUT → GET round-trip (OAuth + secret mask)
  let s = await auth('PUT', '/integrations/settings', { oauthEnabled: true, oauthClientId: 'test-client', oauthClientSecret: 'super-secret' });
  console.log('PUT settings:', s.status);
  const g = await auth('GET', '/integrations/settings');
  console.log('GET settings: oauthEnabled=', g.data?.oauthEnabled, 'clientId=', g.data?.oauthClientId, 'secret(masked)=', JSON.stringify(g.data?.oauthClientSecret));
  // PUT mask round-trip — mask wapas bheja to value badle nahi
  const g2 = await auth('PUT', '/integrations/settings', { oauthClientSecret: g.data?.oauthClientSecret || '' });
  const g3 = await auth('GET', '/integrations/settings');
  console.log('mask round-trip: still masked =', JSON.stringify(g3.data?.oauthClientSecret));
  // cleanup
  await auth('PUT', '/integrations/settings', { oauthEnabled: false, oauthClientId: '', oauthClientSecret: '' });
  console.log('✓ cleanup done');
}

void main();
