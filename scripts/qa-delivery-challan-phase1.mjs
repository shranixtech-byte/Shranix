// Live QA for Delivery Challan Phase 2 endpoints.
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

let pass = 0;
let fail = 0;
function check(label, ok, extra = '') {
  if (ok) {
    pass += 1;
    console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

// ── 1. Login ─────────────────────────────────────────────
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

// ── 2. Next challan number (preview) ────────────────────
const next = await req('/sales/delivery-challans/next-number', { headers: auth });
console.log('NEXT-NUMBER', next.status, JSON.stringify(next.body));
check('next-number returns challanNumber', next.status === 200 && Boolean(next.body?.data?.challanNumber));

// ── 3. Create a FRESH sales order to link (deterministic —
//    existing orders may already be fully dispatched from prior runs) ──
const cust = await req('/customers?page=1&ps=1', { headers: auth });
const customer = cust.body?.data?.data?.[0] || cust.body?.data?.[0];
const prod = await req('/inventory/products?page=1&pageSize=1', { headers: auth });
const product = prod.body?.data?.data?.[0] || prod.body?.data?.[0];

let order = null;
if (customer && product) {
  await fetchCsrf();
  const create = await req(
    '/sales/orders',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        customerId: customer.id,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'confirmed',
        isPartial: true,
        subTotal: 1000,
        taxAmount: 180,
        grandTotal: 1180,
        items: [
          {
            itemId: product.id,
            description: product.name,
            quantity: 10,
            rate: 100,
            taxableValue: 1000,
            gstRate: 18,
            cgst: 90,
            sgst: 90,
            totalAmount: 1180,
          },
        ],
      }),
    },
    true,
  );
  const created = create.body?.data ?? create.body;
  if (created?.id) {
    order = created;
    console.log('ORDER CREATED', created.orderNumber);
  } else {
    console.log('ORDER CREATE FAIL', create.status, JSON.stringify(create.body).slice(0, 150));
  }
}

if (!order) {
  console.log('NO ORDER AVAILABLE — cannot continue');
  process.exit(1);
}

// fetch order items with ids
const orderDetail = await req(`/sales/orders/${order.id}`, { headers: auth });
const orderRec = orderDetail.body?.data ?? orderDetail.body;
const orderItems = orderRec?.items || [];
const firstOi = orderItems[0] || null;
console.log('ORDER ITEMS', orderItems.length, firstOi ? `qty=${firstOi.quantity}` : '');
check('order has at least one item', orderItems.length > 0);

// ── 4. CSRF ─────────────────────────────────────────────
await fetchCsrf();
console.log('CSRF', csrfToken ? 'OK' : 'MISSING');
check('csrf token', Boolean(csrfToken));

// ── 5. Create PARTIAL challan with transport + e-way bill ─
const partialQty = Math.max(1, Math.floor(Number(firstOi?.quantity || 2) / 2));
const create = await req(
  '/sales/delivery-challans',
  {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      orderId: order.id,
      customerId: order.customerId || customer?.id,
      dispatchDate: new Date().toISOString().split('T')[0],
      dispatchType: 'partial',
      status: 'dispatched',
      vehicleNo: 'MH-12-AB-1234',
      vehicleType: 'Container',
      driverName: 'Ramesh Kumar',
      driverMobile: '9876543210',
      transporterName: 'XYZ Logistics',
      lrNo: 'LR-7788',
      ewayBillNo: '551234567891',
      ewayBillDate: new Date().toISOString().split('T')[0],
      transportDetails: 'Route: Mumbai → Nashik, 2 pallets',
      notes: 'Phase 2 QA — partial dispatch',
      items: [
        {
          itemId: firstOi.itemId,
          orderItemId: firstOi.id,
          description: firstOi.description || 'QA item',
          quantity: partialQty,
          rate: Number(firstOi.rate) || 100,
        },
      ],
    }),
  },
  true,
);
const created = create.body?.data ?? create.body;
console.log('CREATE PARTIAL DC', create.status, created?.challanNumber || JSON.stringify(create.body).slice(0, 150));
check('partial challan created', create.status === 201 && Boolean(created?.id), created?.challanNumber);
check('challanNumber auto-generated', Boolean(created?.challanNumber));
check('vehicleNo saved', created?.vehicleNo === 'MH-12-AB-1234');
check('driverName saved', created?.driverName === 'Ramesh Kumar');
check('ewayBillNo saved', created?.ewayBillNo === '551234567891');
check('dispatchType=partial', created?.dispatchType === 'partial');

// ── 6. Fetch back — verify items attached ───────────────
if (created?.id) {
  const got = await req(`/sales/delivery-challans/${created.id}`, { headers: auth });
  const rec = got.body?.data ?? got.body;
  console.log('GET-BACK', got.status, 'items=' + (Array.isArray(rec?.items) ? rec.items.length : 0));
  check('get-back 200', got.status === 200);
  check(
    'items attached',
    Array.isArray(rec?.items) && rec.items.length === 1,
    `items=${Array.isArray(rec?.items) ? rec.items.length : 0}`,
  );
  check('item qty = dispatched qty', rec?.items?.[0]?.quantity === partialQty);
  check('item orderItemId linked', Boolean(rec?.items?.[0]?.orderItemId));

  // ── 7. Order status synced → partial ──────────────────
  const orderAfter = await req(`/sales/orders/${order.id}`, { headers: auth });
  const oa = orderAfter.body?.data ?? orderAfter.body;
  check('order synced to partial', String(oa?.status) === 'partial', `status=${oa?.status}`);

  // ── 8. Second partial challan (multiple DC) allowed ───
  const create2 = await req(
    '/sales/delivery-challans',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        orderId: order.id,
        customerId: order.customerId || customer?.id,
        dispatchDate: new Date().toISOString().split('T')[0],
        dispatchType: 'partial',
        vehicleNo: 'GJ-01-CD-5678',
        ewayBillNo: '998877665544',
        items: [
          {
            itemId: firstOi.itemId,
            orderItemId: firstOi.id,
            description: firstOi.description || 'QA item',
            quantity: 1,
            rate: Number(firstOi.rate) || 100,
          },
        ],
      }),
    },
    true,
  );
  const created2 = create2.body?.data ?? create2.body;
  console.log('SECOND PARTIAL DC', create2.status, created2?.challanNumber || JSON.stringify(create2.body).slice(0, 120));
  check('multiple partial DCs allowed', create2.status === 201, created2?.challanNumber);

  // ── 9. Over-delivery blocked (exceeds remaining) ──────
  const overQty = Number(firstOi?.quantity || 2) + 100;
  const create3 = await req(
    '/sales/delivery-challans',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        orderId: order.id,
        customerId: order.customerId || customer?.id,
        dispatchDate: new Date().toISOString().split('T')[0],
        dispatchType: 'partial',
        items: [
          {
            itemId: firstOi.itemId,
            orderItemId: firstOi.id,
            description: firstOi.description || 'QA item',
            quantity: overQty,
            rate: Number(firstOi.rate) || 100,
          },
        ],
      }),
    },
    true,
  );
  console.log('OVER-DELIVERY', create3.status, JSON.stringify(create3.body).slice(0, 150));
  check('over-delivery blocked (400)', create3.status === 400, create3.body?.message?.slice(0, 60));

  // ── 10. Update challan transport + e-way bill ─────────
  const upd = await req(
    `/sales/delivery-challans/${created.id}`,
    {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({
        driverName: 'Suresh Patil',
        driverMobile: '9123456780',
        transporterName: 'ABC Transport',
        lrNo: 'LR-9999',
        ewayBillNo: '123456789012',
        transportDetails: 'Updated route details',
      }),
    },
    true,
  );
  const updated = upd.body?.data ?? upd.body;
  console.log('UPDATE', upd.status, updated?.driverName || JSON.stringify(upd.body).slice(0, 120));
  check('update 200', upd.status === 200);
  check('driverName updated', updated?.driverName === 'Suresh Patil');
  check('ewayBillNo updated', updated?.ewayBillNo === '123456789012');
}

// ── 11. Full dispatch → duplicate block (fresh order) ───
// NOTE: the partial tests above may have exhausted `order`, so create a FRESH
// order for the full-dispatch + duplicate-block assertions.
let fullOrder = null;
if (customer && product) {
  const fo = await req(
    '/sales/orders',
    {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        customerId: customer.id,
        orderDate: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        isPartial: false,
        subTotal: 500,
        taxAmount: 90,
        grandTotal: 590,
        items: [
          {
            itemId: product.id,
            description: product.name,
            quantity: 3,
            rate: 100,
            taxableValue: 300,
            gstRate: 18,
            cgst: 27,
            sgst: 27,
            totalAmount: 354,
          },
        ],
      }),
    },
    true,
  );
  const created = fo.body?.data ?? fo.body;
  if (created?.id) {
    fullOrder = created;
    const foDetail = await req(`/sales/orders/${created.id}`, { headers: auth });
    const foRec = foDetail.body?.data ?? foDetail.body;
    const foItems = foRec?.items || [];
    const foRes = await req(
      '/sales/delivery-challans',
      {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          orderId: created.id,
          customerId: customer.id,
          dispatchDate: new Date().toISOString().split('T')[0],
          dispatchType: 'full',
          items: foItems.map((oi) => ({
            itemId: oi.itemId,
            orderItemId: oi.id,
            description: oi.description || 'QA item',
            quantity: Number(oi.quantity),
            rate: Number(oi.rate) || 100,
          })),
        }),
      },
      true,
    );
    const fullBody = foRes.body?.data ?? foRes.body;
    console.log('FULL DC', foRes.status, fullBody?.challanNumber || foRes.body?.message || JSON.stringify(foRes.body).slice(0, 150));
    const fullAllowed = foRes.status === 201;
    check('full dispatch allowed', fullAllowed, fullBody?.challanNumber);

    if (fullAllowed) {
      const foDetail2 = await req(`/sales/orders/${created.id}`, { headers: auth });
      const foRec2 = foDetail2.body?.data ?? foDetail2.body;
      const foItems2 = foRec2?.items || [];
      // second full dispatch → must be blocked
      const full2 = await req(
        '/sales/delivery-challans',
        {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({
            orderId: created.id,
            customerId: customer.id,
            dispatchDate: new Date().toISOString().split('T')[0],
            dispatchType: 'full',
            items: foItems2.map((oi) => ({
              itemId: oi.itemId,
              orderItemId: oi.id,
              quantity: Number(oi.quantity),
            })),
          }),
        },
        true,
      );
      console.log('DUP FULL DC', full2.status, JSON.stringify(full2.body).slice(0, 140));
      check('duplicate full dispatch blocked (400)', full2.status === 400, full2.body?.message?.slice(0, 60));
    }
  } else {
    console.log('FULL ORDER CREATE FAIL', fo.status, JSON.stringify(fo.body).slice(0, 150));
    check('full dispatch allowed', false, 'order create failed');
  }
} else {
  check('full dispatch allowed', false, 'no customer/product for fresh order');
}

// ── 12. Next number after creates — different/higher ────
const next2 = await req('/sales/delivery-challans/next-number', { headers: auth });
console.log('NEXT-NUMBER-AFTER', next2.status, JSON.stringify(next2.body));
check(
  'next-number advances',
  next2.status === 200 && next2.body?.data?.challanNumber !== next.body?.data?.challanNumber,
  `${next.body?.data?.challanNumber} → ${next2.body?.data?.challanNumber}`,
);

console.log(`\n════════════════════════════════════════`);
console.log(`DELIVERY CHALLAN PHASE 1: ${pass} passed, ${fail} failed`);
console.log('════════════════════════════════════════');
process.exit(fail > 0 ? 1 : 0);
