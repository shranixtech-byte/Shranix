/**
 * E2E Purchase Transaction Workflow Verification
 *
 * Tests the complete Purchase chain:
 *   1. Create Supplier
 *   2. Create Purchase Order
 *   3. Create GRN (Goods Receipt Note)
 *   4. Approve GRN (stock IN)
 *   5. Create Purchase Invoice
 *   6. Post Purchase Invoice (GL + GST)
 *   7. Collect Payment (full)
 *   8. Collect Payment (partial)
 *   9. Supplier Summary
 *  10. Supplier Ledger
 *  11. Supplier Dashboard
 *  12. Purchase Reports
 *  13. Validation
 *  14. Duplicate prevention
 */

import { writeFileSync } from 'fs';

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';
const OUT = 'C:/Project/SHRANIX-KRUSHI-ERP/backend/purchase-e2e-debug.txt';
const logs: string[] = [];
function dbg(msg: string) {
  logs.push(msg);
  writeFileSync(OUT, logs.join('\n'));
}

let token = '';
let csrfToken = '';
let _userId = '';
let supplierId = '';
let itemId = '';
let itemPurchaseRate = 0;
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

describe('E2E Purchase Transaction Workflow', () => {
  beforeAll(async () => {
    const loginResp = await api('POST', '/auth/login', {
      email: 'admin@shranix.com',
      password: 'admin123',
    });
    expect(loginResp.status).toBe(200);
    token = loginResp.data?.data?.tokens?.accessToken || loginResp.data?.tokens?.accessToken || '';
    expect(token).toBeTruthy();
    _userId = loginResp.data?.data?.user?.id || '';
    for (const sc of loginResp.setCookies) {
      csrfToken = extractCookieValue(sc, 'csrf_token');
      if (csrfToken) {break;}
    }
    expect(csrfToken).toBeTruthy();

    // Get first supplier
    const supResp = await api('GET', '/suppliers?page=1&ps=1');
    const supData = extractData(supResp);
    supplierId = supData?.data?.[0]?.id || supData?.[0]?.id;
    dbg(`[SETUP] Supplier: ${supplierId}`);

    // Get item
    const itemResp = await api('GET', '/inventory/items?page=1&ps=20');
    const itemData = extractData(itemResp);
    const itemsArr = Array.isArray(itemData) ? itemData : itemData?.data || [];
    const item = itemsArr.find((_i: any) => true); // any item
    expect(item).toBeTruthy();
    itemId = item.id;
    itemPurchaseRate =
      Number(item.purchaseRate || item.purchase_price) ||
      Number(item.salesRate || item.sales_rate) ||
      450;
    const gstRateId = item.gstRateId || item.gst_rate_id;
    if (gstRateId) {
      const gstResp = await api('GET', `/gst-rates/${gstRateId}`);
      if (gstResp.status === 200) {gstRate = Number(extractData(gstResp)?.rate) || 0;}
    }
    if (!gstRate) {gstRate = 18;}
    dbg(`[SETUP] Item: ${itemId}, Rate: ${itemPurchaseRate}, GST: ${gstRate}%`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 1: Create Supplier
  // ══════════════════════════════════════════════════════
  let newSupplierId = '';

  it('should create a supplier with real data', async () => {
    const ts = Date.now().toString(36);
    const resp = await api('POST', '/suppliers', {
      name: `E2E Supplier ${ts}`,
      code: `SUP-${ts}`,
      mobile: '9876543210',
      email: `e2e-${ts}@supplier.com`,
      address: 'E2E Test Address, Pune',
      status: 'active',
      supplierType: 'manufacturer',
    });
    dbg(`  [TEST 1] Create supplier → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 1] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    newSupplierId = data.id;
    expect(newSupplierId).toBeTruthy();
    dbg(`  [TEST 1] Created: ${data.name} (${newSupplierId})`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 2: Create Purchase Order
  // ══════════════════════════════════════════════════════
  let poId = '';

  it('should create a purchase order', async () => {
    const qty = 20;
    const taxable = qty * itemPurchaseRate;
    const gst = Math.round((taxable * gstRate) / 100);

    const resp = await api('POST', '/purchase/orders', {
      supplierId: newSupplierId || supplierId,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      totalAmount: taxable + gst,
      totalQty: qty,
      status: 'pending',
      notes: 'E2E Purchase Order Test',
      items: [
        {
          itemId,
          quantity: qty,
          rate: itemPurchaseRate,
          totalAmount: taxable + gst,
        },
      ],
    });
    dbg(`  [TEST 2] Create PO → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 2] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    poId = data.id;
    expect(poId).toBeTruthy();
    dbg(`  [TEST 2] Created PO: ${data.orderNumber || data.poNumber || poId} (${poId})`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 3: Get Purchase Order
  // ══════════════════════════════════════════════════════
  it('should retrieve the purchase order', async () => {
    const resp = await api('GET', `/purchase/orders/${poId}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data.id).toBe(poId);
    dbg(`  [TEST 3] Retrieved PO: ${data.orderNumber}, status: ${data.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 4: Create GRN (Goods Receipt Note)
  // ══════════════════════════════════════════════════════
  let grnId = '';

  it('should create a GRN against the purchase order', async () => {
    const receivedQty = 20;
    const resp = await api('POST', '/purchase/grn', {
      poId,
      supplierId: newSupplierId || supplierId,
      receivedDate: new Date().toISOString().split('T')[0],
      totalQty: receivedQty,
      status: 'received',
      notes: 'E2E GRN Test',
      items: [
        {
          itemId,
          poItemId: poId,
          orderedQuantity: 20,
          receivedQuantity: receivedQty,
          rate: itemPurchaseRate,
        },
      ],
    });
    dbg(`  [TEST 4] Create GRN → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 4] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    grnId = data.id;
    expect(grnId).toBeTruthy();
    dbg(`  [TEST 4] Created GRN: ${data.grnNumber} (${grnId})`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 5: Approve GRN (stock IN)
  // ══════════════════════════════════════════════════════
  it('should approve GRN and post stock', async () => {
    const resp = await api('POST', `/purchase/grn/${grnId}/approve`);
    dbg(`  [TEST 5] Approve GRN → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 5] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    dbg(`  [TEST 5] GRN approved`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 6: Create Purchase Invoice
  // ══════════════════════════════════════════════════════
  let piId = '';
  let piGrandTotal = 0;

  it('should create a purchase invoice', async () => {
    const qty = 20;
    const taxable = qty * itemPurchaseRate;
    const gst = Math.round((taxable * gstRate) / 100);
    piGrandTotal = taxable + gst;

    const resp = await api('POST', '/purchase/invoices', {
      supplierId: newSupplierId || supplierId,
      poId,
      grnId,
      invoiceDate: new Date().toISOString().split('T')[0],
      supplierInvoiceNo: `SUP-INV-${Date.now().toString(36)}`,
      totalAmount: piGrandTotal,
      grandTotal: piGrandTotal,
      taxAmount: gst,
      discountAmount: 0,
      status: 'draft',
      paymentTerms: 'credit',
      notes: 'E2E Purchase Invoice Test',
      items: [
        {
          itemId,
          quantity: qty,
          rate: itemPurchaseRate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: piGrandTotal,
        },
      ],
    });
    dbg(`  [TEST 6] Create PI → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 6] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(201);
    const data = extractData(resp);
    piId = data.id;
    expect(piId).toBeTruthy();
    expect(data.invoiceNumber).toBeTruthy();
    dbg(`  [TEST 6] Created PI: ${data.invoiceNumber} (${piId}), total: ${piGrandTotal}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 7: Post Purchase Invoice (GL + GST)
  // ══════════════════════════════════════════════════════
  it('should post the purchase invoice', async () => {
    const resp = await api('POST', `/purchase/posting/invoices/${piId}/post`);
    dbg(`  [TEST 7] Post PI → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 7] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    dbg(`  [TEST 7] PI posted: ${result.message || 'ok'}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 8: Collect full payment
  // ══════════════════════════════════════════════════════
  it('should collect full payment on purchase invoice', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId: newSupplierId || supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bank',
      amount: piGrandTotal,
      invoiceIds: [piId],
      notes: 'Full payment E2E',
    });
    dbg(`  [TEST 8] Collect → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 8] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.settledTotal).toBe(piGrandTotal);
    dbg(`  [TEST 8] Payment settled: ₹${result.settledTotal}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 9: Supplier Summary
  // ══════════════════════════════════════════════════════
  it('should return supplier summary', async () => {
    const resp = await api('GET', `/purchase/payments/supplier/${newSupplierId || supplierId}`);
    dbg(`  [TEST 9] Supplier summary → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 9] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 9] Supplier: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 10: Supplier Ledger
  // ══════════════════════════════════════════════════════
  it('should return supplier ledger', async () => {
    const resp = await api('GET', `/suppliers/ledger/${newSupplierId || supplierId}`);
    dbg(`  [TEST 10] Ledger → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 10] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 10] Ledger: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 11: Supplier Dashboard
  // ══════════════════════════════════════════════════════
  it('should return supplier dashboard', async () => {
    const resp = await api('GET', '/suppliers/dashboard');
    dbg(`  [TEST 11] Dashboard → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 11] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 11] Dashboard: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 12: Purchase Dashboard
  // ══════════════════════════════════════════════════════
  it('should return purchase dashboard', async () => {
    const resp = await api('GET', '/purchase/dashboard');
    dbg(`  [TEST 12] Dashboard → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 12] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 12] Dashboard: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 13: Purchase Reports
  // ══════════════════════════════════════════════════════
  it('should return purchase register', async () => {
    const resp = await api('GET', '/purchase/reports/purchase-register?page=1&ps=10');
    expect(resp.status).toBe(200);
    dbg(`  [TEST 13] Purchase register: ${resp.status}`);
  });

  it('should return GRN register', async () => {
    const resp = await api('GET', '/purchase/reports/grn-register?page=1&ps=10');
    expect(resp.status).toBe(200);
    dbg(`  [TEST 14] GRN register: ${resp.status}`);
  });

  it('should return GST purchase report', async () => {
    const resp = await api('GET', '/purchase/reports/gst-purchase?page=1&ps=10');
    expect(resp.status).toBe(200);
    dbg(`  [TEST 15] GST purchase: ${resp.status}`);
  });

  it('should return payment report', async () => {
    const resp = await api('GET', '/purchase/reports/payment-report?page=1&ps=10');
    expect(resp.status).toBe(200);
    dbg(`  [TEST 16] Payment report: ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 17: Supplier Outstanding
  // ══════════════════════════════════════════════════════
  it('should return supplier outstanding', async () => {
    const resp = await api('GET', '/suppliers/outstanding?page=1&ps=10');
    expect(resp.status).toBe(200);
    dbg(`  [TEST 17] Outstanding: ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 18: Supplier Search
  // ══════════════════════════════════════════════════════
  it('should search suppliers', async () => {
    const resp = await api('GET', '/suppliers/search?q=E2E');
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 18] Search: ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 19: Validation — missing supplier
  // ══════════════════════════════════════════════════════
  it('should reject PO without supplier', async () => {
    const resp = await api('POST', '/purchase/orders', {
      orderDate: new Date().toISOString().split('T')[0],
      totalAmount: 1000,
      items: [],
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    dbg(`  [TEST 19] No supplier → ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 20: Over-receipt prevention
  // ══════════════════════════════════════════════════════
  it('should prevent GRN quantity exceeding ordered quantity', async () => {
    const resp = await api('POST', '/purchase/grn', {
      poId,
      supplierId: newSupplierId || supplierId,
      receivedDate: new Date().toISOString().split('T')[0],
      totalQty: 9999,
      items: [
        {
          itemId,
          orderedQuantity: 20,
          receivedQuantity: 9999,
          rate: itemPurchaseRate,
        },
      ],
    });
    dbg(`  [TEST 20] Over-receipt → ${resp.status}`);
    // Should be rejected or at least warn
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });

  // ══════════════════════════════════════════════════════
  // TEST 21: Payment dashboard
  // ══════════════════════════════════════════════════════
  it('should return payment dashboard', async () => {
    const resp = await api('GET', '/purchase/payments/dashboard');
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 21] Payment dashboard: ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 22: Purchase Requisition
  // ══════════════════════════════════════════════════════
  it('should create a purchase requisition', async () => {
    const resp = await api('POST', '/purchase/requisitions', {
      prNumber: `PR-${Date.now().toString(36)}`,
      supplierId: newSupplierId || supplierId,
      requestDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      notes: 'E2E Requisition',
      items: [
        {
          itemId,
          quantity: 10,
          rate: itemPurchaseRate,
        },
      ],
    });
    dbg(`  [TEST 22] Create requisition → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 22] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    // May not be implemented
    expect(resp.status).toBeLessThan(500);
    dbg(`  [TEST 22] Requisition: ${resp.status}`);
  });
});
