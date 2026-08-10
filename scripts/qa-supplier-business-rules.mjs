/**
 * 🧪 Business-rule QA — blocked supplier cannot create PO; inactive cannot create PI.
 *   node scripts/qa-supplier-business-rules.mjs
 */
const BASE = process.env.BASE_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.QA_EMAIL || 'admin@shranix.com';
const PASSWORD = process.env.QA_PASSWORD || 'admin123';

let token = '';
let cookieJar = '';
let csrfToken = '';

function extractSetCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const eq = sc.indexOf('=');
    if (eq < 0) continue;
    const name = sc.slice(0, eq).trim();
    const value = sc.slice(eq + 1).split(';')[0];
    if (name && value) {
      cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*;? ?`), '');
      cookieJar += `${name}=${value}; `;
    }
  }
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookieJar) headers.Cookie = cookieJar;
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((opts.method || 'GET').toUpperCase())) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  extractSetCookies(res);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  if (res.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes((opts.method || 'GET').toUpperCase()) && !opts.__csrfRetried) {
    await refreshCsrf();
    return api(path, { ...opts, __csrfRetried: true });
  }
  return { status: res.status, body };
}

async function refreshCsrf() {
  const res = await fetch(`${BASE}/auth/csrf`, { method: 'POST', headers: cookieJar ? { Cookie: cookieJar } : {} });
  extractSetCookies(res);
  const m = cookieJar.match(/csrf_token=([^;\s]+)/);
  csrfToken = m ? m[1] : '';
}

function unwrap(b) { return b && typeof b === 'object' && b.success === true && 'data' in b ? b.data : b; }

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const login = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
token = login.body?.data?.tokens?.accessToken || login.body?.accessToken || '';

const gst = `27${'A'.repeat(5)}${String(Math.floor(Math.random() * 9000 + 1000))}${'B'}1Z5`;
const created = await api('/suppliers', {
  method: 'POST',
  body: JSON.stringify({
    name: `Rule QA ${Date.now() % 100000}`,
    gstin: gst,
    mobile: '97' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0'),
    status: 'blocked',
  }),
});
const sid = unwrap(created.body)?.id;
check('create blocked supplier', created.status === 201 && Boolean(sid));

// PO create against blocked supplier must fail
const po = await api('/purchase/orders', {
  method: 'POST',
  body: JSON.stringify({
    supplierId: sid,
    poNumber: `PO-${Date.now() % 100000}`,
    orderDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
  }),
});
check('blocked supplier → PO rejected', po.status === 400, String(po.body?.message || '').slice(0, 90));

// Set status inactive → PI create must fail
await api(`/suppliers/${sid}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) });
const pi = await api('/purchase/invoices', {
  method: 'POST',
  body: JSON.stringify({
    supplierId: sid,
    invoiceNumber: `PINV-${Date.now() % 100000}`,
    invoiceDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
  }),
});
check('inactive supplier → PI rejected', pi.status === 400, String(pi.body?.message || '').slice(0, 90));

// Active supplier → both allowed (draft creation should pass validation)
await api(`/suppliers/${sid}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) });
const po2 = await api('/purchase/orders', {
  method: 'POST',
  body: JSON.stringify({
    supplierId: sid,
    poNumber: `PO-${Date.now() % 100000}`,
    orderDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
  }),
});
check('active supplier → PO allowed', po2.status === 201, `status=${po2.status} ${String(po2.body?.message || '').slice(0, 60)}`);

// Cleanup
await api(`/suppliers/${sid}`, { method: 'DELETE' });

const failed = results.filter((x) => !x.ok);
console.log(`\n📊 BUSINESS RULES QA: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
console.log('🎉 Supplier business rules QA PASSED');
