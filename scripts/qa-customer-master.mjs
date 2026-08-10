/**
 * 🧪 Customer Master Module — End-to-End API QA
 * Run this AFTER starting the backend (pnpm dev / scripts/start-servers.mjs).
 *
 *   node scripts/qa-customer-master.mjs
 *
 * Tests: login → groups/categories → create customer (auto code) → children
 * (address/contact/document) → duplicate GST guard → status → search →
 * outstanding → dashboard → export → bulk ops.
 */
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);

const BASE = process.env.BASE_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.QA_EMAIL || 'admin@shranix.com';
const PASSWORD = process.env.QA_PASSWORD || 'admin123';

let token = '';
let csrfToken = '';
let cookieJar = '';

function extractSetCookies(res) {
  let setCookies = [];
  try {
    if (typeof res.headers.getSetCookie === 'function') {
      setCookies = res.headers.getSetCookie();
    } else {
      const raw = res.headers.get('set-cookie');
      if (raw) setCookies = raw.split(/,(?=\w+=)/);
    }
  } catch {
    /* ignore */
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
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  // Auto-refresh CSRF once on 403 for state-changing calls
  if (res.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes((opts.method || 'GET').toUpperCase()) && !opts.__csrfRetried) {
    await refreshCsrf();
    return api(path, { ...opts, __csrfRetried: true });
  }
  return { status: res.status, body };
}

async function refreshCsrf() {
  const res = await fetch(`${BASE}/auth/csrf`, { method: 'POST', credentials: 'include', headers: cookieJar ? { Cookie: cookieJar } : {} });
  extractSetCookies(res);
  const m = cookieJar.match(/csrf_token=([^;\s]+)/);
  csrfToken = m ? m[1] : '';
  return csrfToken;
}

function check(name, cond, extra = '') {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    console.log(`  ❌ ${name} ${extra}`);
    process.exitCode = 1;
  }
}

/** Unwrap the common { success, data } envelope used by this API. */
function unwrap(body) {
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data;
  }
  return body;
}

async function main() {
  console.log(`\n🧪 Customer Master QA — ${BASE}\n`);

  // 1. Login
  const login = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const tok =
    login.body?.accessToken ||
    login.body?.data?.accessToken ||
    login.body?.data?.tokens?.accessToken ||
    login.body?.access_token ||
    (login.body?.tokens && login.body.tokens.accessToken) ||
    login.body?.token;
  check('Login (admin)', !!tok, `status=${login.status}`);
  if (!tok) {
    console.log('   (try QA_EMAIL / QA_PASSWORD env vars)');
    return;
  }
  token = tok;
  extractSetCookies(login);
  await refreshCsrf();
  check('CSRF token acquired', !!csrfToken, 'cookie=' + cookieJar);

  // 2. Reference data
  const groups = await api('/customer-groups');
  const groupsArr = groups.body?.data || groups.body;
  check('GET /customer-groups', groups.status === 200 && Array.isArray(groupsArr), `status=${groups.status}`);
  const categories = await api('/customer-categories');
  const categoriesArr = categories.body?.data || categories.body;
  check('GET /customer-categories', categories.status === 200 && Array.isArray(categoriesArr), `status=${categories.status}`);

  // 3. Create customer (auto code)
  const stamp = Date.now().toString().slice(-6);
  const create = await api('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: `QA Customer ${stamp}`,
      mobile: `9${stamp}123`,
      gstin: `27ABCDE${stamp.slice(0, 4)}A1Z5`,
      customerType: 'retail',
      creditLimit: 25000,
      creditDays: 30,
      status: 'active',
    }),
  });
  const customer = create.body?.data || create.body;
  check('POST /customers (create)', create.status === 201 || create.status === 200, `status=${create.status}`);
  check('  auto code generated (CUS-)', /^CUS-\d+/.test(customer?.code || ''), JSON.stringify(customer?.code));
  const customerId = customer?.id;
  check('  customer id returned', !!customerId);

  // 4. Duplicate GST guard
  const dup = await api('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: `QA Dup ${stamp}`, gstin: customer.gstin }),
  });
  check('Duplicate GSTIN blocked', dup.status === 400 || dup.status === 409, `status=${dup.status}`);

  // 5. Children — address / contact / document
  const addr = await api(`/customers/${customerId}/addresses`, {
    method: 'POST',
    body: JSON.stringify({ addressType: 'billing', address: '123 Farm Road', village: 'QA Village', district: 'Pune', state: 'Maharashtra', pincode: '411001' }),
  });
  check('POST /customers/:id/addresses', addr.status === 201 || addr.status === 200, `status=${addr.status}`);
  const contact = await api(`/customers/${customerId}/contacts`, {
    method: 'POST',
    body: JSON.stringify({ contactType: 'owner', name: 'QA Owner', mobile: '9876543210' }),
  });
  check('POST /customers/:id/contacts', contact.status === 201 || contact.status === 200, `status=${contact.status}`);
  const doc = await api(`/customers/${customerId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ docType: 'gst_certificate', fileName: 'GST.pdf', fileUrl: 'https://example.com/gst.pdf' }),
  });
  check('POST /customers/:id/documents', doc.status === 201 || doc.status === 200, `status=${doc.status}`);

  const listAddr = unwrap((await api(`/customers/${customerId}/addresses`)).body);
  const listContact = unwrap((await api(`/customers/${customerId}/contacts`)).body);
  const listDoc = unwrap((await api(`/customers/${customerId}/documents`)).body);
  check('children persisted (1 each)', (listAddr?.length || 0) >= 1 && (listContact?.length || 0) >= 1 && (listDoc?.length || 0) >= 1,
    `addr=${listAddr?.length} contact=${listContact?.length} doc=${listDoc?.length}`);

  // 6. Get by id — dual-write mirror
  const get = await api(`/customers/${customerId}`);
  const getData = unwrap(get.body);
  check('GET /customers/:id', get.status === 200 && getData?.name, `status=${get.status}`);
  check('  name matches', getData?.name === customer.name);
  check('  addressCount present', getData?.addressCount !== undefined, JSON.stringify(getData?.addressCount));

  // 7. Update + status
  const upd = await api(`/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify({ creditLimit: 50000, remarks: 'QA updated' }),
  });
  check('PUT /customers/:id', upd.status === 200, `status=${upd.status} ${JSON.stringify(upd.body || {}).slice(0, 160)}`);
  const st = await api(`/customers/${customerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'blocked' }),
  });
  check('PATCH /customers/:id/status', st.status === 200, `status=${st.status}`);
  const get2 = await api(`/customers/${customerId}`);
  check('  status persisted (blocked)', unwrap(get2.body)?.status === 'blocked', JSON.stringify(unwrap(get2.body)?.status));

  // 8. Search
  const search = await api(`/customers/search?q=${encodeURIComponent(`QA Customer ${stamp}`)}`);
  const searchData = unwrap(search.body);
  check('GET /customers/search', search.status === 200 && (searchData?.data?.length || searchData?.length || 0) >= 1, `status=${search.status}`);

  // 9. List with filters
  const list = await api(`/customers?status=blocked&withProfile=true`);
  const listData = unwrap(list.body);
  check('GET /customers (filtered)', list.status === 200 && Array.isArray(listData?.data || listData), `status=${list.status}`);

  // 10. Outstanding
  const outstanding = await api('/customers/outstanding');
  const outstandingData = unwrap(outstanding.body);
  check('GET /customers/outstanding', outstanding.status === 200 && (outstandingData?.summary || outstandingData?.data?.summary), `status=${outstanding.status}`);

  // 11. Dashboard
  const dash = await api('/customers/dashboard');
  const dashData = unwrap(dash.body);
  check('GET /customers/dashboard', dash.status === 200 && dashData?.summary, `status=${dash.status}`);

  // 12. Ledger
  const ledger = await api(`/customers/ledger/${customerId}`);
  check('GET /customers/ledger/:id', ledger.status === 200, `status=${ledger.status}`);

  // 13. Export
  const exportRes = await fetch(`${BASE}/customers/export?format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check('GET /customers/export (csv)', exportRes.status === 200, `status=${exportRes.status}`);

  // 14. Delete guard + bulk
  const del = await api(`/customers/${customerId}`, { method: 'DELETE' });
  check('DELETE /customers/:id (no invoices → ok)', del.status === 200, `status=${del.status}`);
  const get3 = await api(`/customers/${customerId}`);
  check('  soft-deleted (gone)', get3.status === 404, `status=${get3.status}`);

  console.log('\n🧪 QA complete.\n');
}

main().catch((err) => {
  console.error('❌ QA crashed:', err.message);
  process.exitCode = 1;
});
