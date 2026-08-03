// End-to-end verification: login → create invoice (draft) → post (Save & Print flow)
// Run against a TEMP backend on port 4002 (fresh dist build).
// Usage from repo root: node scripts/verify-post-flow.mjs
import { DatabaseSync } from 'node:sqlite';

const BASE = 'http://localhost:4002';
const db = new DatabaseSync('data/dev.db', { readOnly: true });

// ── Real data from dev.db ────────────────────────────────
const customer = db.prepare('SELECT customer_id FROM shranix_credit_profiles LIMIT 1').get();
const item = db.prepare('SELECT id, name FROM shranix_items LIMIT 1').get();
const stock = item ? db.prepare('SELECT quantity FROM shranix_warehouse_stock WHERE item_id = ?').get(item.id) : null;
console.log('▶ Using customer:', customer?.customer_id, '| item:', item?.id, item?.name, '| stock:', stock?.quantity);
if (!customer || !item || !stock || Number(stock.quantity) <= 0) {
  console.error('✗ Missing prerequisite data (credit profile customer, item with stock)');
  process.exit(2);
}

// ── Tiny cookie jar ─────────────────────────────────────
const cookies = new Map();
function storeCookies(res) {
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of setCookie) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) { cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()); }
  }
}
function cookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path, { method = 'GET', body, token, useCsrf = false } = {}) {
  const headers = {};
  if (body) { headers['Content-Type'] = 'application/json'; }
  if (token) { headers.Authorization = `Bearer ${token}`; }
  if (useCsrf) {
    const csrf = cookies.get('csrf_token');
    if (csrf) { headers['x-csrf-token'] = csrf; }
    if (cookies.size > 0) { headers.Cookie = cookieHeader(); }
  }
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  storeCookies(res);
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`  [${res.status}] ${method} ${path}`);
  return { status: res.status, body: parsed };
}

// ── 1. Login (public — no CSRF) ─────────────────────────
let token = null;
let loginBody = null;
for (const p of ['/api/v1/auth/login', '/api/auth/login']) {
  const r = await req(p, { method: 'POST', body: { email: 'admin@shranix.com', password: 'admin123' } });
  if (r.status === 200) {
    loginBody = r.body;
    token = r.body?.access_token || r.body?.accessToken || r.body?.data?.access_token || r.body?.data?.accessToken || r.body?.data?.tokens?.accessToken || r.body?.token || r.body?.data?.token || null;
    if (token) {
      console.log('✓ LOGIN OK via', p, '(csrf cookie set:', cookies.has('csrf_token') + ')');
      break;
    }
  }
}
if (!token) {
  console.error('✗ LOGIN FAILED. loginBody:', JSON.stringify(loginBody).slice(0, 300));
  process.exit(1);
}

// ── 2. Create invoice (draft) — CSRF protected ───────────
const invoiceNumber = `VERIFY-${Date.now().toString(36).toUpperCase()}`;
const create = await req('/api/v1/sales/invoices', {
  method: 'POST',
  token,
  useCsrf: true,
  body: {
    invoiceNumber,
    customerId: customer.customer_id,
    invoiceDate: '2026-08-01',
    status: 'draft',
    paymentTerms: 'cash',
    subTotal: 100,
    discountPercent: 0,
    discountAmount: 0,
    freight: 0,
    taxAmount: 18,
    roundOff: 0,
    grandTotal: 118,
    paidAmount: 118,
    balanceAmount: 0,
    paymentStatus: 'paid',
    cgstTotal: 9,
    sgstTotal: 9,
    igstTotal: 0,
    cessTotal: 0,
    items: [
      {
        itemId: item.id,
        description: item.name,
        quantity: 1,
        rate: 100,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 100,
        gstRate: 18,
        igst: 0,
        cgst: 9,
        sgst: 9,
        cess: 0,
        totalAmount: 118,
      },
    ],
  },
});
const invoiceId = create.body?.data?.id || create.body?.id || (Array.isArray(create.body) ? create.body[0]?.id : null);
console.log(create.status === 201 || create.status === 200 ? '✓ INVOICE CREATED' : '✗ INVOICE CREATE', '| invoiceId:', invoiceId, '| number:', invoiceNumber);
if (!invoiceId) {
  console.error('✗ Could not extract invoice id. body:', JSON.stringify(create.body).slice(0, 400));
  process.exit(1);
}

// ── 3. Post invoice (the Save & Print / F6 action) ───────
const post = await req(`/api/v1/sales/invoices/${invoiceId}/post`, {
  method: 'POST',
  token,
  useCsrf: true,
  body: { userId: '', userEmail: '' },
});

console.log('');
console.log('════════ POST RESULT ════════');
console.log('HTTP status:', post.status);
console.log('Response:', JSON.stringify(post.body).slice(0, 600));
if (post.status === 200) {
  const ok = post.body?.success === true;
  console.log(ok ? '✅ PASS — invoice posted successfully (no 500!)' : '⚠️ HTTP 200 but success=false (see message)');
} else if (post.status === 500) {
  console.log('❌ FAIL — 500 Internal Server Error. Body:', JSON.stringify(post.body));
} else {
  console.log('⚠️ Unexpected status:', post.status);
}

// ── 4. Fetch the invoice list (used by the invoice page) ─
const list = await req(`/api/v1/sales/invoices?page=1&ps=5`, { token });
console.log('Invoice list fetch:', list.status === 200 ? 'OK' : `FAIL (${list.status})`);

console.log('\nVERIFY_INVOICE_NUMBER=' + invoiceNumber);
console.log('VERIFY_INVOICE_ID=' + invoiceId);
