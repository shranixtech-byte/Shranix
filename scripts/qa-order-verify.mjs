// Live QA for Sales Order Phase 1 endpoints.
const BASE = 'http://localhost:4001/api/v1';

let csrfToken = '';
let csrfCookie = '';

async function fetchCsrf() {
  const res = await fetch(`${BASE}/auth/csrf`, { method: 'POST' });
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const line of cookies || []) {
    const m = line.match(/csrf_token=([^;]*)/);
    if (m) {
      csrfToken = decodeURIComponent(m[1]);
      csrfCookie = line.split(';')[0];
    }
  }
  return Boolean(csrfToken);
}

async function req(path, opts = {}, withCsrf = false) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (withCsrf && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
    headers['Cookie'] = csrfCookie;
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

// 1. Login
const login = await req('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'admin@shranix.com', password: 'admin123' }),
});
const token = login.body?.data?.tokens?.accessToken || login.body?.data?.accessToken;
if (!token) {
  console.log('LOGIN FAIL', login.status, JSON.stringify(login.body).slice(0, 200));
  process.exit(1);
}
console.log('LOGIN OK');
const auth = { Authorization: `Bearer ${token}` };

// 2. Next order number (preview — must not 404)
const next = await req('/sales/orders/next-number', { headers: auth });
console.log('NEXT-NUMBER', next.status, JSON.stringify(next.body));

// 3. Get a customer for the order
const cust = await req('/customers?page=1&ps=1', { headers: auth });
const customer = cust.body?.data?.data?.[0] || cust.body?.data?.[0];
console.log('CUSTOMER', customer ? customer.name : 'NONE');
if (!customer) {
  process.exit(1);
}

// 4. Get a product for the item
const prod = await req('/inventory/products?page=1&pageSize=1', { headers: auth });
const product = prod.body?.data?.data?.[0] || prod.body?.data?.[0];
console.log('PRODUCT', product ? product.name : 'NONE');
if (!product) {
  process.exit(1);
}

// 4b. CSRF token
await fetchCsrf();
console.log('CSRF', csrfToken ? 'OK' : 'MISSING');

// 5. Create order with items
const create = await req('/sales/orders', {
  method: 'POST',
  headers: auth,
  body: JSON.stringify({
    customerId: customer.id,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentTerms: '30_days',
    isPartial: true,
    status: 'confirmed',
    billingAddress: customer.address || '',
    subTotal: 1000,
    discountAmount: 50,
    taxAmount: 180,
    cgstTotal: 90,
    sgstTotal: 90,
    igstTotal: 0,
    cessTotal: 0,
    roundOff: 0,
    grandTotal: 1130,
    items: [
      {
        itemId: product.id,
        description: product.name,
        quantity: 2,
        rate: 500,
        discountAmount: 25,
        taxableValue: 975,
        gstRate: 18,
        cgst: 87.75,
        sgst: 87.75,
        igst: 0,
        cess: 0,
        totalAmount: 1150.5,
      },
    ],
  }),
},
true);
const created = create.body?.data ?? create.body;
console.log('CREATE', create.status, created?.orderNumber || JSON.stringify(create.body).slice(0, 120));

// 6. Fetch back — verify items attached
const orderId = created?.id;
if (orderId) {
  const got = await req(`/sales/orders/${orderId}`, { headers: auth });
  const rec = got.body?.data ?? got.body;
  console.log(
    'GET-BACK',
    got.status,
    'orderNumber=' + rec?.orderNumber,
    'status=' + rec?.status,
    'isPartial=' + rec?.isPartial,
    'paymentTerms=' + rec?.paymentTerms,
    'items=' + (Array.isArray(rec?.items) ? rec.items.length : 0),
  );
}

// 7. Next number after create — should be a different/higher number
const next2 = await req('/sales/orders/next-number', { headers: auth });
console.log('NEXT-NUMBER-AFTER', next2.status, JSON.stringify(next2.body));
