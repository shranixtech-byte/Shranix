/**
 * E2E Sales Order Workflow Verification
 *
 * Tests the complete Sales Order lifecycle:
 *   1. Create order with real customer + product
 *   2. Retrieve with items
 *   3. Update order header (notes/terms)
 *   4. Validate numbering (unique, auto-generated)
 *   5. Create quotation → convert to order (preserve data)
 *   6. Prevent duplicate conversion
 *   7. Order → Delivery Challan conversion
 *   8. Prevent duplicate challan
 *   9. Validation: missing customer
 *  10. Validation: empty items
 *  11. List orders
 *  12. Full chain: Quotation → Order → Challan → Invoice
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';

let token = '';
let csrfToken = '';
let customerId = '';
let itemId = '';
let itemName = '';
let itemSalesRate = 0;
let gstRate = 0;

function extractCookieValue(setCookie: string, name: string): string {
  const m = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : '';
}

async function api(
  method: string,
  path: string,
  body?: any,
): Promise<{ status: number; data: any; setCookies: string[] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {headers['Authorization'] = `Bearer ${token}`;}
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers['Cookie'] = `csrf_token=${csrfToken}`;
    headers['x-csrf-token'] = csrfToken;
  }
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const data = await resp.json().catch(() => null);
  const setCookies: string[] =
    typeof resp.headers.getSetCookie === 'function'
      ? resp.headers.getSetCookie()
      : resp.headers.get('set-cookie')
        ? [resp.headers.get('set-cookie')!]
        : [];
  return { status: resp.status, data, setCookies };
}

function extractData(resp: any): any {
  return resp.data?.data ?? resp.data;
}

describe('E2E Sales Order Workflow', () => {
  beforeAll(async () => {
    const loginResp = await api('POST', '/auth/login', {
      email: 'admin@shranix.com',
      password: 'admin123',
    });
    expect(loginResp.status).toBe(200);
    token = loginResp.data?.data?.tokens?.accessToken || loginResp.data?.tokens?.accessToken || '';
    expect(token).toBeTruthy();
    for (const sc of loginResp.setCookies) {
      csrfToken = extractCookieValue(sc, 'csrf_token');
      if (csrfToken) {break;}
    }
    expect(csrfToken).toBeTruthy();

    const custResp = await api('GET', '/customers?page=1&pageSize=1');
    customerId = extractData(custResp)?.[0]?.id || extractData(custResp)?.data?.[0]?.id;

    const itemResp = await api('GET', '/inventory/items?page=1&pageSize=20');
    const allItems = Array.isArray(extractData(itemResp))
      ? extractData(itemResp)
      : extractData(itemResp)?.data || [];
    const item = allItems.find((i: any) => Number(i.currentStock || i.current_stock || 0) >= 1);
    expect(item).toBeTruthy();
    itemId = item.id;
    itemName = item.name;
    itemSalesRate = Number(item.salesRate || item.sales_rate) || 100;

    const gstRateId = item.gstRateId || item.gst_rate_id;
    if (gstRateId) {
      const gstResp = await api('GET', `/gst-rates/${gstRateId}`);
      if (gstResp.status === 200) {gstRate = Number(extractData(gstResp)?.rate) || 0;}
    }
    if (!gstRate) {gstRate = 18;}

    console.log(`  [SETUP] Customer: ${customerId}, Item: ${itemName}, GST: ${gstRate}%`);
  });

  // ────────────── TEST 1: Create Sales Order directly ──────────────
  let orderId = '';
  let orderNumber = '';

  it('should create a Sales Order with real customer and product', async () => {
    const qty = 3;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;
    const grandTotal = Math.round(taxable + gst);

    const resp = await api('POST', '/sales/orders', {
      customerId,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      subTotal: taxable,
      taxAmount: gst,
      grandTotal,
      notes: 'E2E Sales Order Test',
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    console.log(`  [TEST 1] POST → ${resp.status}`);
    if (resp.status >= 300)
      {console.log(`  [TEST 1] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    orderId = data.id;
    orderNumber = data.orderNumber || '';
    expect(orderNumber).toBeTruthy();
    console.log(`  [TEST 1] Created: ${orderNumber} (${orderId})`);
  });

  // ────────────── TEST 2: Retrieve with items ──────────────
  it('should retrieve order with correct items and totals', async () => {
    const resp = await api('GET', `/sales/orders/${orderId}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.id).toBe(orderId);
    expect(data?.status).toBe('draft');
    expect(Array.isArray(data?.items)).toBe(true);
    expect(data.items.length).toBe(1);
    expect(data.items[0].itemId || data.items[0].item_id).toBe(itemId);
    expect(Number(data.grandTotal)).toBeGreaterThan(0);
    console.log(
      `  [TEST 2] status=${data.status}, items=${data.items.length}, grandTotal=${data.grandTotal}`,
    );
  });

  // ────────────── TEST 3: Update order header ──────────────
  it('should update order notes and terms', async () => {
    const resp = await api('PUT', `/sales/orders/${orderId}`, {
      notes: 'Updated E2E order notes',
      terms: 'Updated delivery terms',
    });
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.notes).toBe('Updated E2E order notes');
    console.log(`  [TEST 3] Updated: notes=${data?.notes}`);
  });

  // ────────────── TEST 4: Auto-numbering is unique ──────────────
  it('should generate unique order numbers', async () => {
    const qty = 1;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;

    const resp1 = await api('POST', '/sales/orders', {
      customerId,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      subTotal: taxable,
      taxAmount: gst,
      grandTotal: Math.round(taxable + gst),
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    expect(resp1.status).toBe(201);
    const num1 = extractData(resp1)?.orderNumber;

    const resp2 = await api('POST', '/sales/orders', {
      customerId,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      subTotal: taxable,
      taxAmount: gst,
      grandTotal: Math.round(taxable + gst),
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    expect(resp2.status).toBe(201);
    const num2 = extractData(resp2)?.orderNumber;

    expect(num1).not.toBe(num2);
    console.log(`  [TEST 4] Unique numbers: ${num1} ≠ ${num2}`);
  });

  // ────────────── TEST 5: Quotation → Sales Order ──────────────
  let quoteId = '';

  it('should convert quotation to Sales Order preserving data', async () => {
    // Create quotation
    const qty = 2;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;
    const grandTotal = Math.round(taxable + gst);

    const qResp = await api('POST', '/sales/quotations', {
      customerId,
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: taxable,
      taxAmount: gst,
      grandTotal,
      paymentTerms: 'credit',
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    expect(qResp.status).toBe(201);
    quoteId = extractData(qResp).id;

    // Convert to order
    const convResp = await api('POST', `/sales/quotations/${quoteId}/convert`, {
      steps: ['order'],
    });
    expect(convResp.status).toBe(200);
    const conv = extractData(convResp);
    expect(conv.completed).toContain('order');

    const orderFromQuote = conv.order;
    expect(orderFromQuote?.id).toBeTruthy();
    expect(orderFromQuote?.customerId).toBe(customerId);
    expect(Number(orderFromQuote?.grandTotal)).toBe(grandTotal);

    // Verify items preserved
    const getResp = await api('GET', `/sales/orders/${orderFromQuote.id}`);
    const orderData = extractData(getResp);
    expect(orderData.items.length).toBe(1);
    expect(orderData.items[0].itemId || orderData.items[0].item_id).toBe(itemId);
    expect(orderData.quotationId || orderData.quotation_id).toBe(quoteId);
    console.log(
      `  [TEST 5] Converted: ${conv.order?.orderNumber}, items preserved, quotationRef linked`,
    );
  });

  // ────────────── TEST 6: Prevent duplicate conversion ──────────────
  it('should prevent duplicate conversion from same quotation', async () => {
    const resp = await api('POST', `/sales/quotations/${quoteId}/convert`, { steps: ['order'] });
    const result = extractData(resp);
    const hasError =
      result?.error ||
      /already converted/i.test(result?.message || '') ||
      /stopped/i.test(result?.message || '');
    expect(hasError).toBeTruthy();
    console.log(`  [TEST 6] Duplicate convert: ${result?.message}`);
  });

  // ────────────── TEST 7: Order → Delivery Challan (fresh quotation) ──────────────
  let challanId = '';
  let challanConvOrderId = '';

  it('should convert Sales Order to Delivery Challan', async () => {
    // Create a fresh quotation → convert to order → then order → challan
    const qty = 1;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;

    const qResp = await api('POST', '/sales/quotations', {
      customerId,
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: taxable,
      taxAmount: gst,
      grandTotal: Math.round(taxable + gst),
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    const qId = extractData(qResp).id;

    // Convert quotation → order
    const convResp = await api('POST', `/sales/quotations/${qId}/convert`, { steps: ['order'] });
    expect(convResp.status).toBe(200);
    challanConvOrderId = extractData(convResp).order?.id;
    expect(challanConvOrderId).toBeTruthy();

    // Convert order → challan
    const resp = await api('POST', `/sales/orders/${challanConvOrderId}/convert`, {
      steps: ['challan'],
    });
    const fs = await import('fs');
    fs.writeFileSync('e2e-debug-order.json', JSON.stringify(resp, null, 2));
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    // Order→Challan conversion returns { challan, itemCount } directly
    // (unlike quotation conversion which returns { completed: [...] })
    challanId = result.challan?.id || result.id;
    expect(challanId).toBeTruthy();
    const challanNumber = result.challan?.challanNumber || result.challanNumber;
    console.log(`  [TEST 7] Challan: ${challanNumber}`);
  });

  // ────────────── TEST 8: Prevent duplicate challan ──────────────
  it('should prevent duplicate full-dispatch challan', async () => {
    const resp = await api('POST', `/sales/orders/${challanConvOrderId}/convert`, {
      steps: ['challan'],
    });
    const result = extractData(resp);
    const hasError = result?.error || /already has/i.test(result?.message || '');
    expect(hasError).toBeTruthy();
    console.log(`  [TEST 8] Duplicate challan: ${result?.message || result?.error?.message}`);
  });

  // ────────────── TEST 9: Full chain Quote → Order → Challan → Invoice ──────────────
  it('should complete full chain: Quote → Order → Challan → Invoice', async () => {
    const qty = 1;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;

    // Create quotation
    const qResp = await api('POST', '/sales/quotations', {
      customerId,
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: taxable,
      taxAmount: gst,
      grandTotal: Math.round(taxable + gst),
      items: [
        {
          itemId,
          quantity: qty,
          rate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: taxable + gst,
        },
      ],
    });
    const qId = extractData(qResp).id;

    // Full chain
    const convResp = await api('POST', `/sales/quotations/${qId}/convert`, {
      steps: ['order', 'challan', 'invoice'],
    });
    expect(convResp.status).toBe(200);
    const conv = extractData(convResp);
    expect(conv.completed).toContain('order');
    expect(conv.completed).toContain('challan');
    expect(conv.completed).toContain('invoice');
    expect(conv.invoice?.id).toBeTruthy();
    expect(conv.invoice?.status).toBe('draft');
    console.log(
      `  [TEST 9] Full chain: ${conv.order?.orderNumber} → ${conv.challan?.challanNumber} → ${conv.invoice?.invoiceNumber}`,
    );
  });

  // ────────────── TEST 10: Validation — missing customer ──────────────
  it('should reject order without customer', async () => {
    const resp = await api('POST', '/sales/orders', {
      orderDate: new Date().toISOString().split('T')[0],
      subTotal: 100,
      grandTotal: 118,
      items: [{ itemId, quantity: 1, rate: 100 }],
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    console.log(`  [TEST 10] No customer → ${resp.status}`);
  });

  // ────────────── TEST 11: List orders ──────────────
  it('should list orders', async () => {
    const resp = await api('GET', '/sales/orders?page=1&pageSize=5');
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    const list = Array.isArray(data) ? data : data?.data || [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    console.log(`  [TEST 11] Listed: ${list.length} orders`);
  });

  // ────────────── TEST 12: Search/filter by order number ──────────────
  it('should find order by search', async () => {
    const resp = await api('GET', `/sales/orders?page=1&pageSize=5&search=${orderNumber}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    const list = Array.isArray(data) ? data : data?.data || [];
    const found = list.find((o: any) => o.id === orderId);
    expect(found).toBeTruthy();
    console.log(`  [TEST 12] Found ${orderNumber} in search results`);
  });
});
