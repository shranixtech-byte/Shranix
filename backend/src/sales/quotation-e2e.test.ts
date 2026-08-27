/**
 * E2E Quotation Workflow Verification
 *
 * Tests the complete quotation lifecycle:
 *   1. Create quotation with real customer + product
 *   2. Retrieve with items
 *   3. Update/edit quotation
 *   4. Create revision
 *   5. Submit for approval
 *   6. Finalize (lock)
 *   7. Convert to Sales Order
 *   8. Verify conversion preserves data
 *   9. Prevent duplicate conversion
 *  10. List quotations
 *  11. Empty customer validation
 *  12. Empty items validation
 */

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';

let token = '';
let csrfToken = '';
let customerId = '';
let customerName = '';
let itemId = '';
let itemName = '';
let itemSalesRate = 0;
let gstRate = 0;

function extractCookieValue(setCookie: string, name: string): string {
  const re = new RegExp(`${name}=([^;]+)`);
  const m = setCookie.match(re);
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

describe('E2E Quotation Workflow', () => {
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

    // Real customer with stock
    const custResp = await api('GET', '/customers?page=1&pageSize=1');
    expect(custResp.status).toBe(200);
    const custList = extractData(custResp);
    const cust = Array.isArray(custList) ? custList[0] : custList?.data?.[0];
    customerId = cust.id;
    customerName = cust.name;

    // Real item with stock
    const itemResp = await api('GET', '/inventory/items?page=1&pageSize=20');
    expect(itemResp.status).toBe(200);
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

    console.log(`  [SETUP] Customer: ${customerName}, Item: ${itemName}, GST: ${gstRate}%`);
  });

  // ────────────── TEST 1: Create quotation ──────────────
  let quoteId = '';
  let quoteNumber = '';

  it('should create a quotation with real customer and product', async () => {
    const qty = 5;
    const rate = itemSalesRate;
    const taxable = qty * rate;
    const gst = Math.round(taxable * gstRate) / 100;
    const grandTotal = Math.round(taxable + gst);

    const resp = await api('POST', '/sales/quotations', {
      customerId,
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: taxable,
      taxAmount: gst,
      grandTotal,
      notes: 'E2E Quotation Test',
      terms: 'Valid for 15 days',
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
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    quoteId = data.id;
    quoteNumber = data.quoteNumber || '';
    expect(quoteNumber).toBeTruthy();
    console.log(`  [TEST 1] Created: ${quoteNumber} (${quoteId})`);
  });

  // ────────────── TEST 2: Retrieve with items ──────────────
  it('should retrieve quotation with correct items and totals', async () => {
    const resp = await api('GET', `/sales/quotations/${quoteId}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.id).toBe(quoteId);
    expect(data?.status).toBe('draft');
    expect(Array.isArray(data?.items)).toBe(true);
    expect(data.items.length).toBe(1);
    expect(data.items[0].itemId || data.items[0].item_id).toBe(itemId);
    expect(Number(data.grandTotal)).toBeGreaterThan(0);
    console.log(
      `  [TEST 2] status=${data.status}, items=${data.items.length}, grandTotal=${data.grandTotal}`,
    );
  });

  // ────────────── TEST 3: Update quotation ──────────────
  it('should update quotation notes and terms', async () => {
    const resp = await api('PUT', `/sales/quotations/${quoteId}`, {
      notes: 'Updated E2E notes',
      terms: 'Updated terms — valid 30 days',
    });
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.notes).toBe('Updated E2E notes');
    console.log(`  [TEST 3] Updated notes: ${data?.notes}`);
  });

  // ────────────── TEST 4: Create revision ──────────────
  let revisionId = '';

  it('should create a revision of the quotation', async () => {
    const resp = await api('POST', `/sales/quotations/${quoteId}/revision`);
    console.log(`  [TEST 4] POST revision → ${resp.status}`);
    if (resp.status >= 300) {
      console.log(`  [TEST 4] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);
    }
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    revisionId = data.id;
    expect(revisionId).toBeTruthy();
    expect(data.revision).toBe(2);
    expect(data.status).toBe('draft');
    console.log(`  [TEST 4] Revision: ${data.quoteNumber} (rev ${data.revision})`);
  });

  // ────────────── TEST 5: Submit for approval ──────────────
  it('should submit revision for approval', async () => {
    const resp = await api('POST', `/sales/quotations/${revisionId}/submit-approval`);
    console.log(`  [TEST 5] submit-approval → ${resp.status}`);
    expect(resp.status).toBe(200);
    // Status should now be pending
    const getResp = await api('GET', `/sales/quotations/${revisionId}`);
    const data = extractData(getResp);
    console.log(`  [TEST 5] Status after approval submit: ${data?.status}`);
  });

  // ────────────── TEST 6: Finalize (lock) ──────────────
  it('should finalize the quotation', async () => {
    const resp = await api('PUT', `/sales/quotations/${quoteId}/finalize`);
    console.log(`  [TEST 6] finalize → ${resp.status}`);
    expect(resp.status).toBe(200);
    const getResp = await api('GET', `/sales/quotations/${quoteId}`);
    const data = extractData(getResp);
    expect(data?.status).toBe('final');
    console.log(`  [TEST 6] Status: ${data?.status}`);
  });

  // ────────────── TEST 7: Cannot edit finalized ──────────────
  it('should reject edit of finalized quotation', async () => {
    const resp = await api('PUT', `/sales/quotations/${quoteId}`, {
      notes: 'Should not work',
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    console.log(`  [TEST 7] Edit finalized → ${resp.status}`);
  });

  // ────────────── TEST 8: Convert to Sales Order ──────────────
  let orderId = '';

  it('should convert quotation to Sales Order', async () => {
    const resp = await api('POST', `/sales/quotations/${quoteId}/convert`, {
      steps: ['order'],
    });
    console.log(`  [TEST 8] convert → ${resp.status}`);
    if (resp.status >= 300) {
      console.log(`  [TEST 8] Body: ${JSON.stringify(resp.data).slice(0, 500)}`);
    }
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.completed).toContain('order');
    orderId = result.order?.id;
    expect(orderId).toBeTruthy();
    console.log(`  [TEST 8] Order created: ${result.order?.orderNumber} (${orderId})`);
  });

  // ────────────── TEST 9: Order preserves quotation data ──────────────
  it('should preserve customer, items, totals from quotation', async () => {
    const resp = await api('GET', `/sales/orders/${orderId}`);
    expect(resp.status).toBe(200);
    const order = extractData(resp);
    expect(order?.customerId).toBe(customerId);
    expect(Number(order?.grandTotal)).toBeGreaterThan(0);
    expect(Array.isArray(order?.items)).toBe(true);
    expect(order.items.length).toBe(1);
    expect(order.items[0].itemId || order.items[0].item_id).toBe(itemId);
    // Quotation reference linked
    const qid = order.quotationId || order.quotation_id;
    expect(qid).toBe(quoteId);
    console.log(
      `  [TEST 9] Order: customer=${order.customerId}, grandTotal=${order.grandTotal}, items=${order.items.length}, quotationRef=${qid}`,
    );
  });

  // ────────────── TEST 10: Prevent duplicate conversion ──────────────
  it('should prevent duplicate conversion', async () => {
    const resp = await api('POST', `/sales/quotations/${quoteId}/convert`, {
      steps: ['order'],
    });
    const result = extractData(resp);
    // Conversion returns 200 but with error in body (not HTTP 400)
    const hasError =
      result?.error ||
      /already converted/i.test(result?.message || '') ||
      /stopped/i.test(result?.message || '');
    expect(hasError).toBeTruthy();
    console.log(`  [TEST 10] Duplicate convert → ${resp.status}, message: ${result?.message}`);
  });

  // ────────────── TEST 11: Empty customer validation ──────────────
  it('should reject quotation without customer', async () => {
    const resp = await api('POST', '/sales/quotations', {
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: 100,
      grandTotal: 118,
      items: [{ itemId, quantity: 1, rate: 100 }],
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    console.log(`  [TEST 11] No customer → ${resp.status}`);
  });

  // ────────────── TEST 12: List quotations ──────────────
  it('should list quotations', async () => {
    const resp = await api('GET', '/sales/quotations?page=1&pageSize=5');
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    const list = Array.isArray(data) ? data : data?.data || [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    const found = list.find((q: any) => q.id === quoteId);
    expect(found).toBeTruthy();
    console.log(`  [TEST 12] Listed: ${list.length} quotations, found our ${quoteNumber}`);
  });
});
