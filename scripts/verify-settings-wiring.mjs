// Verify Settings Hub wiring — har tab jo backend endpoint call karta hai, uski status check karta hai.
// Usage: node scripts/verify-settings-wiring.mjs [baseUrl]
const BASE = process.argv[2] || 'http://localhost:4001/api/v1';

const ENDPOINTS = [
  // company & license / fiscal
  ['GET', '/companies'],
  ['GET', '/financial-years'],
  ['GET', '/license'],
  // API settings
  ['GET', '/integrations/settings'],
  ['GET', '/integrations/api-keys'],
  ['GET', '/integrations/webhooks'],
  // financial
  ['GET', '/finance/settings'],
  ['GET', '/finance/chart-of-accounts?ps=200'],
  ['GET', '/tax-groups?pageSize=100'],
  // banking (companyId dynamic — filled later)
  ['GET', '/bank-accounts?companyId=__CID__'],
  // invoice / stock / gst / modules
  ['GET', '/sales/settings'],
  ['GET', '/inventory/settings'],
  ['GET', '/purchase/settings'],
  ['GET', '/gst/config'],
  // backup
  ['GET', '/backup'],
  ['GET', '/backup/settings'],
  // data management
  ['GET', '/data-management/deleted'],
  // audit trail
  ['GET', '/audit-trail?page=1&pageSize=20'],
  // notifications / printer
  ['GET', '/notifications/settings'],
  ['GET', '/printer/settings'],
  // roles / users / security
  ['GET', '/roles'],
  ['GET', '/users'],
  ['GET', '/finance/settings/security/status'],
];

async function main() {
  // 1) CSRF token + cookie
  const csrfRes = await fetch(`${BASE}/auth/csrf`, { method: 'POST' });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const setCookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [csrfRes.headers.get('set-cookie') || ''];
  const cookie = (setCookies[0] || '').split(';')[0];
  const csrfToken = csrfBody?.csrfToken || csrfBody?.data?.csrfToken || csrfRes.headers.get('x-csrf-token') || '';
  if (!csrfToken) {
    console.log('✗ Could not get CSRF token. status=', csrfRes.status, 'body=', JSON.stringify(csrfBody), 'cookies=', JSON.stringify(setCookies));
    process.exit(1);
  }
  console.log('  · CSRF ok, cookie=', cookie.slice(0, 30));

  // 2) Login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  const token =
    loginBody?.data?.tokens?.accessToken ||
    loginBody?.tokens?.accessToken ||
    loginBody?.accessToken ||
    loginBody?.data?.accessToken;
  if (!token) {
    console.log(`✗ Login failed (${loginRes.status}):`, JSON.stringify(loginBody).slice(0, 200));
    process.exit(1);
  }
  console.log(`✓ Logged in as admin (${loginRes.status})`);

  // companyId for bank-accounts
  const coRes = await fetch(`${BASE}/companies`, { headers: { Authorization: `Bearer ${token}` } });
  const coBody = await coRes.json().catch(() => ({}));
  const rows = Array.isArray(coBody) ? coBody : coBody?.data || [];
  const companyId = rows[0]?.id || '';

  let pass = 0, fail = 0;
  for (const [method, path] of ENDPOINTS) {
    const url = `${BASE}${path.replace('__CID__', companyId)}`;
    try {
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
      const ok = res.status >= 200 && res.status < 300;
      if (ok) { pass++; console.log(`  ✓ ${method} ${path} → ${res.status}`); }
      else { fail++; console.log(`  ✗ ${method} ${path} → ${res.status} (${(await res.text()).slice(0, 120)})`); }
    } catch (err) {
      fail++; console.log(`  ✗ ${method} ${path} → NETWORK ERROR ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\nResult: ${pass} passed, ${fail} failed (of ${ENDPOINTS.length})`);
  process.exit(fail > 0 ? 1 : 0);
}

void main();
