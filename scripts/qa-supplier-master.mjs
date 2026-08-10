/**
 * 🧪 E2E QA — Supplier Master endpoints.
 *   node scripts/qa-supplier-master.mjs
 * Requires the backend running on http://localhost:4001/api/v1
 */
const BASE = process.env.BASE_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.QA_EMAIL || 'admin@shranix.com';
const PASSWORD = process.env.QA_PASSWORD || 'admin123';

let token = '';
let cookieJar = '';
let csrfToken = '';

function extractSetCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (!setCookies.length && res.headers.get('set-cookie')) {
    for (const sc of res.headers.get('set-cookie').split(/,(?=\\s*[^\\s=;]+=)/)) {
      setCookies.push(sc);
    }
  }
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
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (res.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes((opts.method || 'GET').toUpperCase()) && !opts.__csrfRetried) {
    await refreshCsrf();
    return api(path, { ...opts, __csrfRetried: true });
  }
  return { status: res.status, body };
}

async function refreshCsrf() {
  const res = await fetch(`${BASE}/auth/csrf`, {
    method: 'POST',
    credentials: 'include',
    headers: cookieJar ? { Cookie: cookieJar } : {},
  });
  extractSetCookies(res);
  const m = cookieJar.match(/csrf_token=([^;\\s]+)/);
  csrfToken = m ? m[1] : '';
  return csrfToken;
}

function unwrap(body) {
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── Login ────────────────────────────────────────────────
const login = await api('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
token =
  login.body?.accessToken ||
  login.body?.data?.accessToken ||
  login.body?.data?.tokens?.accessToken ||
  login.body?.token ||
  '';
check('login', Boolean(token), token ? 'got access token' : JSON.stringify(login.body || {}).slice(0, 120));

if (!token) {
  console.log('Cannot continue without a token');
  process.exit(1);
}

// 1. Dashboard
let r = await api('/suppliers/dashboard');
const d = unwrap(r.body);
check('GET /suppliers/dashboard', r.status === 200, `summary=${JSON.stringify(d?.summary || {}).slice(0, 120)}`);

// 2. Groups & categories reference
r = await api('/supplier-groups');
check('GET /supplier-groups', r.status === 200 && Array.isArray(unwrap(r.body)), `count=${unwrap(r.body)?.length}`);
r = await api('/supplier-categories');
check('GET /supplier-categories', r.status === 200 && Array.isArray(unwrap(r.body)), `count=${unwrap(r.body)?.length}`);
const groupId = unwrap((await api('/supplier-groups')).body)?.[0]?.id || null;

// 3. Create supplier
const gst = `27${'A'.repeat(5)}${String(Math.floor(Math.random() * 9000 + 1000))}${'B'}1Z5`;
const created = await api('/suppliers', {
  method: 'POST',
  body: JSON.stringify({
    name: `QA Supplier ${Date.now() % 100000}`,
    firmName: 'QA Trading Co',
    supplierType: 'distributor',
    gstin: gst,
    pan: 'ABCDE1234F',
    mobile: '98' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0'),
    email: `qa${Date.now() % 100000}@test.in`,
    creditLimit: 50000,
    creditDays: 30,
    status: 'active',
    groupId,
  }),
});
const createdData = unwrap(created.body);
check('POST /suppliers (create)', created.status === 201, `code=${createdData?.code}`);
const supplierId = createdData?.id;
if (!supplierId) {
  console.log('Create failed:', JSON.stringify(created.body || {}).slice(0, 300));
  process.exit(1);
}

// 4. List with filters
r = await api('/suppliers?page=1&ps=10&status=active&sortBy=name');
check('GET /suppliers (list+filter)', r.status === 200, `total=${unwrap(r.body)?.total}`);

// 5. Search
r = await api('/suppliers/search?q=QA');
check('GET /suppliers/search', r.status === 200 && unwrap(r.body)?.total >= 1);

// 6. Find by id
r = await api(`/suppliers/${supplierId}`);
const found = unwrap(r.body);
check('GET /suppliers/:id', r.status === 200 && found?.name?.startsWith('QA'), `code=${found?.code}, groupName=${found?.groupName}`);

// 7. Duplicate GSTIN blocked
const dup = await api('/suppliers', {
  method: 'POST',
  body: JSON.stringify({ name: 'Dup GST', gstin: gst }),
});
check('Duplicate GSTIN blocked', dup.status === 400, String(dup.body?.message || '').slice(0, 60));

// 8. Update supplier
r = await api(`/suppliers/${supplierId}`, {
  method: 'PUT',
  body: JSON.stringify({ creditLimit: 75000, email: 'updated@test.in' }),
});
const updated = unwrap(r.body);
check('PUT /suppliers/:id', r.status === 200 && updated?.creditLimit === 75000);

// 9. Status change
r = await api(`/suppliers/${supplierId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'blocked' }),
});
check('PATCH status → blocked', r.status === 200 && unwrap(r.body)?.status === 'blocked');
r = await api(`/suppliers/${supplierId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'active' }),
});
check('PATCH status → active', r.status === 200);

// 10. Addresses / contacts / documents children
r = await api(`/suppliers/${supplierId}/addresses`, {
  method: 'POST',
  body: JSON.stringify({ addressType: 'billing', address: '12 Main Road', state: 'Maharashtra', pincode: '411001' }),
});
check('POST addresses', r.status === 201, `id=${unwrap(r.body)?.id}`);
const addressId = unwrap(r.body)?.id;
r = await api(`/suppliers/${supplierId}/contacts`, {
  method: 'POST',
  body: JSON.stringify({ contactType: 'sales', name: 'Ravi Kumar', mobile: '9000000001' }),
});
check('POST contacts', r.status === 201);
r = await api(`/suppliers/${supplierId}/documents`, {
  method: 'POST',
  body: JSON.stringify({ docType: 'gst_certificate', fileName: 'gst.pdf' }),
});
check('POST documents', r.status === 201);
const docId = unwrap(r.body)?.id;

r = await api(`/suppliers/${supplierId}/addresses`);
check('GET addresses', r.status === 200 && unwrap(r.body)?.length === 1);
if (addressId) {
  r = await api(`/suppliers/${supplierId}/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify({ pincode: '400001' }),
  });
  check('PUT address', r.status === 200 && unwrap(r.body)?.pincode === '400001');
}

// 11. Ledger 360
r = await api(`/suppliers/ledger/${supplierId}`);
check('GET /suppliers/ledger/:id', r.status === 200, `summary=${JSON.stringify(unwrap(r.body)?.summary || {})}`);

// 12. Outstanding report
r = await api('/suppliers/outstanding');
check('GET /suppliers/outstanding', r.status === 200, `summary=${JSON.stringify(unwrap(r.body)?.summary || {})}`);

// 13. Export CSV
r = await api('/suppliers/export?format=csv');
check('GET /suppliers/export (csv)', r.status === 200, `bytes=${String(r.body || '').length}`);

// 14. Bulk status
r = await api('/suppliers/bulk-status', {
  method: 'POST',
  body: JSON.stringify({ ids: [supplierId], status: 'inactive' }),
});
check('POST bulk-status', r.status === 200 && unwrap(r.body)?.updated === 1);

// 15. Soft delete (should work — no purchase docs)
r = await api(`/suppliers/${supplierId}`, { method: 'DELETE' });
check('DELETE /suppliers/:id', r.status === 200, unwrap(r.body)?.message || '');

// 16. Soft-deleted supplier gone
r = await api(`/suppliers/${supplierId}`);
check('Soft-deleted supplier gone', r.status === 404);

// 17. Document delete
if (docId) {
  r = await api(`/suppliers/${supplierId}/documents/${docId}`, { method: 'DELETE' });
  check('DELETE document (after supplier delete → 404 acceptable)', [200, 404].includes(r.status));
}

const failed = results.filter((x) => !x.ok);
console.log(`\n📊 QA SUMMARY: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('Failed:', failed.map((x) => x.name).join(' | '));
  process.exit(1);
}
console.log('🎉 Supplier Master E2E QA PASSED');
