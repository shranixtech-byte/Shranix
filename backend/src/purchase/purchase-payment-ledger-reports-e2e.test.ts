/**
 * E2E Purchase Payment Collection + Supplier Ledger + Reports Verification
 *
 * Tests the complete purchase payment lifecycle:
 *   1-6. Create full purchase chain (supplier → PO → GRN → invoice → post)
 *   7. Collect full payment → verify invoice paid
 *   8. Collect partial payment on second invoice
 *   9. Second partial payment → verify fully paid
 *  10. Advance payment (no invoice)
 *  11. Apply advance to invoice
 *  12. Payment list with filters
 *  13. Invoice payment history
 *  14. Supplier summary
 *  15. Supplier ledger (360°)
 *  16. Supplier outstanding
 *  17. Payment dashboard
 *  18. Purchase register
 *  19. GRN register
 *  20. GST purchase report
 *  21. Payment report
 *  22. Purchase returns report
 *  23. Validation: zero payment
 *  24. Validation: invalid mode
 *  25. Purchase dashboard
 */

import { writeFileSync } from 'fs';

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';
const OUT = 'C:/Project/SHRANIX-KRUSHI-ERP/backend/payment-ledger-debug.txt';
const logs: string[] = [];
function dbg(msg: string) {
  logs.push(msg);
  writeFileSync(OUT, logs.join('\n'));
}

let token = '';
let csrfToken = '';
let supplierId = '';
let itemId = '';
let poId = '';
let grnId = '';
let invoiceId1 = '';
let invoiceId2 = '';
const ts = Date.now().toString(36).toUpperCase();

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
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
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

function extractPaged(resp: any): { items: any[]; total: number } {
  const d = resp.data?.data ?? resp.data;
  if (d && typeof d === 'object' && Array.isArray(d.data)) {
    return { items: d.data, total: d.total || d.data.length };
  }
  return { items: Array.isArray(d) ? d : [], total: Array.isArray(d) ? d.length : 0 };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('E2E Purchase Payment + Ledger + Reports', () => {
  beforeAll(async () => {
    // Login
    const loginResp = await api('POST', '/auth/login', {
      email: 'admin@shranix.com',
      password: 'admin123',
    });
    dbg(`[LOGIN] Status: ${loginResp.status}`);
    expect(loginResp.status).toBe(200);
    token = loginResp.data?.data?.tokens?.accessToken || loginResp.data?.tokens?.accessToken || '';
    expect(token).toBeTruthy();
    for (const sc of loginResp.setCookies) {
      csrfToken = extractCookieValue(sc, 'csrf_token');
      if (csrfToken) {
        break;
      }
    }
    expect(csrfToken).toBeTruthy();
    dbg(`[LOGIN] Token + CSRF obtained`);

    // Get existing item
    const itemsResp = await api('GET', '/inventory/items?page=1&ps=5');
    const { items } = extractPaged(itemsResp);
    if (items.length > 0) {
      itemId = items[0].id;
      dbg(`[ITEM] Using item: ${itemId}`);
    } else {
      throw new Error('No items found in database');
    }
  }, 30000);

  // ── STEP 1: Create Supplier ──
  it('should create a supplier', async () => {
    const resp = await api('POST', '/suppliers', {
      name: `Payment Test Supplier ${ts}`,
      code: `SUP-PAY-${ts}`,
      mobile: '9876543211',
      email: `pay-${ts.toLowerCase()}@example.com`,
      status: 'active',
    });
    dbg(`[STEP 1] POST /suppliers → ${resp.status}`);
    expect(resp.status).toBe(201);
    supplierId = extractData(resp)?.id;
    expect(supplierId).toBeTruthy();
    dbg(`  Supplier created: ${supplierId}`);
  });

  // ── STEP 2: Create PO #1 ──
  it('should create a purchase order #1', async () => {
    const resp = await api('POST', '/purchase/orders', {
      supplierId,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [{ itemId, quantity: 10, rate: 100, gstRate: 18 }],
      subTotal: 1000,
      grandTotal: 1180,
    });
    dbg(`[STEP 2] POST /purchase/orders → ${resp.status}`);
    expect(resp.status).toBe(201);
    poId = extractData(resp)?.id;
    expect(poId).toBeTruthy();
  });

  // ── STEP 3: Create GRN ──
  it('should create a GRN', async () => {
    const resp = await api('POST', '/purchase/grn', {
      poId,
      supplierId,
      receivedDate: new Date().toISOString().split('T')[0],
      items: [{ itemId, receivedQuantity: 10, acceptedQuantity: 10, purchaseRate: 100 }],
    });
    dbg(`[STEP 3] POST /purchase/grn → ${resp.status}`);
    expect(resp.status).toBe(201);
    grnId = extractData(resp)?.id;
    expect(grnId).toBeTruthy();
  });

  // ── STEP 4: Approve GRN ──
  it('should approve GRN and post stock', async () => {
    await wait(1500);
    const resp = await api('POST', `/purchase/grn/${grnId}/approve`);
    dbg(`[STEP 4] POST approve → ${resp.status}`);
    expect(resp.status).toBe(200);
  });

  // ── STEP 5: Create Purchase Invoice #1 (₹1180) ──
  it('should create purchase invoice #1', async () => {
    const resp = await api('POST', '/purchase/invoices', {
      supplierId,
      poId,
      grnId,
      invoiceDate: new Date().toISOString().split('T')[0],
      subTotal: 1000,
      taxAmount: 180,
      grandTotal: 1180,
      items: [
        {
          itemId,
          quantity: 10,
          rate: 100,
          gstRate: 18,
          cgst: 90,
          sgst: 90,
          totalAmount: 1180,
        },
      ],
    });
    dbg(`[STEP 5] POST /purchase/invoices → ${resp.status}`);
    expect(resp.status).toBe(201);
    invoiceId1 = extractData(resp)?.id;
    expect(invoiceId1).toBeTruthy();
  });

  // ── STEP 6: Post Invoice #1 ──
  it('should post purchase invoice #1', async () => {
    await wait(1500);
    const resp = await api('POST', `/purchase/posting/invoices/${invoiceId1}/post`);
    dbg(`[STEP 6] POST invoice #1 → ${resp.status}`);
    expect(resp.status).toBe(200);
  });

  // ── STEP 7: Create Invoice #2 (₹2360) for partial payment testing ──
  it('should create and post purchase invoice #2 for partial payment test', async () => {
    // Create another PO + GRN + Invoice
    const poResp = await api('POST', '/purchase/orders', {
      supplierId,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [{ itemId, quantity: 20, rate: 100, gstRate: 18 }],
      subTotal: 2000,
      grandTotal: 2360,
    });
    const po2Id = extractData(poResp)?.id;

    await wait(500);
    const grnResp = await api('POST', '/purchase/grn', {
      poId: po2Id,
      supplierId,
      receivedDate: new Date().toISOString().split('T')[0],
      items: [{ itemId, receivedQuantity: 20, acceptedQuantity: 20, purchaseRate: 100 }],
    });
    const grn2Id = extractData(grnResp)?.id;

    await wait(1500);
    await api('POST', `/purchase/grn/${grn2Id}/approve`);

    const invResp = await api('POST', '/purchase/invoices', {
      supplierId,
      poId: po2Id,
      grnId: grn2Id,
      invoiceDate: new Date().toISOString().split('T')[0],
      subTotal: 2000,
      taxAmount: 360,
      grandTotal: 2360,
      items: [
        {
          itemId,
          quantity: 20,
          rate: 100,
          gstRate: 18,
          cgst: 180,
          sgst: 180,
          totalAmount: 2360,
        },
      ],
    });
    invoiceId2 = extractData(invResp)?.id;

    await wait(1500);
    const postResp = await api('POST', `/purchase/posting/invoices/${invoiceId2}/post`);
    dbg(`[STEP 7] Invoice #2 posted: ${postResp.status}`);
    expect(postResp.status).toBe(200);
  }, 60000);

  // ═══════════════════════════════════════════════════════════
  // PAYMENT COLLECTION TESTS
  // ═══════════════════════════════════════════════════════════

  // ── STEP 8: Full Payment on Invoice #1 ──
  it('should collect full payment on invoice #1', async () => {
    await wait(1500);
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bank',
      amount: 1180,
      invoiceIds: [invoiceId1],
      referenceNo: `UTR-${ts}`,
      bankName: 'HDFC Bank',
      notes: 'Full payment for PI-1',
    });
    dbg(`[STEP 8] Full payment → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.success).toBe(true);
    expect(data?.payments?.length).toBeGreaterThanOrEqual(1);
    expect(data?.settledTotal).toBe(1180);
    expect(data?.advanceAmount).toBe(0);
    dbg(`  Full payment: settled=₹${data?.settledTotal}, advance=₹${data?.advanceAmount}`);
  });

  // ── STEP 9: Partial Payment on Invoice #2 (₹800) ──
  it('should collect partial payment on invoice #2', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 800,
      invoiceIds: [invoiceId2],
      notes: 'Partial payment',
    });
    dbg(`[STEP 9] Partial payment → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.success).toBe(true);
    expect(data?.settledTotal).toBe(800);
    dbg(`  Partial payment: settled=₹${data?.settledTotal}`);

    // Verify invoice balance
    const invResp = await api('GET', `/purchase/invoices/${invoiceId2}`);
    const inv = extractData(invResp);
    const paid = Number(inv?.paidAmount) || 0;
    const balance = Number(inv?.balanceAmount) || 0;
    dbg(`  Invoice #2: paid=₹${paid}, balance=₹${balance}, status=${inv?.paymentStatus}`);
    expect(paid).toBeGreaterThanOrEqual(800);
    expect(balance).toBeLessThanOrEqual(1560); // 2360 - 800 = 1560
    expect(inv?.paymentStatus).toBe('partial');
  });

  // ── STEP 10: Second Payment → Fully Paid ──
  it('should complete payment on invoice #2 (remaining ₹1560)', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'upi',
      amount: 1560,
      invoiceIds: [invoiceId2],
      referenceNo: `UPI-${ts}`,
    });
    dbg(`[STEP 10] Second payment → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.success).toBe(true);
    expect(data?.settledTotal).toBe(1560);
    dbg(`  Final payment: settled=₹${data?.settledTotal}`);

    // Verify invoice is now paid
    const invResp = await api('GET', `/purchase/invoices/${invoiceId2}`);
    const inv = extractData(invResp);
    dbg(
      `  Invoice #2: paid=₹${inv?.paidAmount}, balance=₹${inv?.balanceAmount}, status=${inv?.paymentStatus}`,
    );
    expect(inv?.paymentStatus).toBe('paid');
    expect(Number(inv?.balanceAmount) || 0).toBeLessThanOrEqual(0.01);
  });

  // ── STEP 11: Advance Payment (no invoice) ──
  it('should record advance payment (no invoice allocation)', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bank',
      amount: 5000,
      invoiceIds: [], // empty = pure advance
      notes: 'Supplier advance',
    });
    dbg(`[STEP 11] Advance payment → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.success).toBe(true);
    expect(data?.advanceAmount).toBe(5000);
    dbg(`  Advance: ₹${data?.advanceAmount}`);
  });

  // ── STEP 12: Apply Advance to Invoice #3 (create new invoice first) ──
  it('should create invoice #3 and apply advance to it', async () => {
    // Create quick invoice
    const poResp = await api('POST', '/purchase/orders', {
      supplierId,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [{ itemId, quantity: 5, rate: 100, gstRate: 18 }],
      subTotal: 500,
      grandTotal: 590,
    });
    const po3Id = extractData(poResp)?.id;

    await wait(500);
    const grnResp = await api('POST', '/purchase/grn', {
      poId: po3Id,
      supplierId,
      receivedDate: new Date().toISOString().split('T')[0],
      items: [{ itemId, receivedQuantity: 5, acceptedQuantity: 5, purchaseRate: 100 }],
    });
    const grn3Id = extractData(grnResp)?.id;

    await wait(1500);
    await api('POST', `/purchase/grn/${grn3Id}/approve`);

    const invResp = await api('POST', '/purchase/invoices', {
      supplierId,
      poId: po3Id,
      grnId: grn3Id,
      invoiceDate: new Date().toISOString().split('T')[0],
      subTotal: 500,
      taxAmount: 90,
      grandTotal: 590,
      items: [
        { itemId, quantity: 5, rate: 100, gstRate: 18, cgst: 45, sgst: 45, totalAmount: 590 },
      ],
    });
    const inv3Id = extractData(invResp)?.id;

    await wait(1500);
    await api('POST', `/purchase/posting/invoices/${inv3Id}/post`);

    // Now apply advance
    await wait(500);
    const advResp = await api('POST', '/purchase/payments/apply-advance', {
      supplierId,
      invoiceIds: [inv3Id],
      amount: 590,
      notes: 'Settling with advance',
    });
    dbg(`[STEP 12] Apply advance → ${advResp.status}`);
    expect(advResp.status).toBe(200);
    const data = extractData(advResp);
    expect(data?.success).toBe(true);
    expect(data?.applied).toBe(590);
    dbg(`  Advance applied: ₹${data?.applied}`);

    // Verify invoice is paid
    const invCheck = await api('GET', `/purchase/invoices/${inv3Id}`);
    const inv = extractData(invCheck);
    expect(inv?.paymentStatus).toBe('paid');
    dbg(`  Invoice #3 payment status: ${inv?.paymentStatus}`);
  }, 60000);

  // ═══════════════════════════════════════════════════════════
  // PAYMENT LIST + FILTERS
  // ═══════════════════════════════════════════════════════════

  // ── STEP 13: Payment list with filters ──
  it('should list payments with supplier and mode filters', async () => {
    // All payments
    const allResp = await api('GET', '/purchase/payments?page=1&pageSize=50');
    dbg(`[STEP 13] All payments → ${allResp.status}`);
    expect(allResp.status).toBe(200);
    const allData = extractPaged(allResp);
    expect(allData.items.length).toBeGreaterThanOrEqual(1);
    dbg(`  Total payments: ${allData.items.length}`);

    // Filter by supplier
    const supResp = await api('GET', `/purchase/payments?supplierId=${supplierId}&pageSize=50`);
    expect(supResp.status).toBe(200);
    const supData = extractPaged(supResp);
    expect(supData.items.length).toBeGreaterThanOrEqual(1);
    dbg(`  Supplier payments: ${supData.items.length}`);

    // Filter by mode
    const modeResp = await api('GET', '/purchase/payments?mode=cash&pageSize=50');
    expect(modeResp.status).toBe(200);
    dbg(`  Cash payments: ${extractPaged(modeResp).items.length}`);
  });

  // ── STEP 14: Invoice payment history ──
  it('should return payment history for an invoice', async () => {
    const resp = await api('GET', `/purchase/payments/invoice/${invoiceId1}`);
    dbg(`[STEP 14] Invoice payments → ${resp.status}`);
    expect(resp.status).toBe(200);
    const payments = Array.isArray(extractData(resp)) ? extractData(resp) : [];
    expect(payments.length).toBeGreaterThanOrEqual(1);
    expect(payments[0].amount).toBe(1180);
    expect(payments[0].mode).toBe('bank');
    dbg(`  Invoice #1 payments: ${payments.length}`);
  });

  // ── STEP 15: Supplier summary ──
  it('should return supplier payment summary', async () => {
    const resp = await api('GET', `/purchase/payments/supplier/${supplierId}`);
    dbg(`[STEP 15] Supplier summary → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.supplier).toBeTruthy();
    expect(data?.profile).toBeTruthy();
    expect(data?.dueInvoices).toBeDefined();
    expect(data?.payments).toBeDefined();
    dbg(`  Supplier: ${data?.supplier?.name}`);
    dbg(`  Outstanding: ₹${data?.profile?.outstanding}`);
    dbg(`  Advance: ₹${data?.profile?.advanceBalance}`);
    dbg(`  Due invoices: ${data?.dueInvoices?.length}`);
  });

  // ═══════════════════════════════════════════════════════════
  // SUPPLIER LEDGER + OUTSTANDING
  // ═══════════════════════════════════════════════════════════

  // ── STEP 16: Supplier 360° Ledger ──
  it('should return supplier ledger', async () => {
    const resp = await api('GET', `/suppliers/ledger/${supplierId}`);
    dbg(`[STEP 16] Supplier ledger → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Ledger data keys: ${Object.keys(data || {}).join(', ')}`);
  });

  // ── STEP 17: Supplier outstanding ──
  it('should return supplier outstanding', async () => {
    const resp = await api('GET', '/suppliers/outstanding?page=1&pageSize=50');
    dbg(`[STEP 17] Supplier outstanding → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Outstanding report verified`);
  });

  // ═══════════════════════════════════════════════════════════
  // PAYMENT DASHBOARD
  // ═══════════════════════════════════════════════════════════

  // ── STEP 18: Payment dashboard ──
  it('should return payment dashboard', async () => {
    const resp = await api('GET', '/purchase/payments/dashboard');
    dbg(`[STEP 18] Payment dashboard → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data?.summary).toBeTruthy();
    expect(typeof data?.summary?.totalPayable).toBe('number');
    expect(typeof data?.summary?.totalOverdue).toBe('number');
    expect(typeof data?.summary?.todayCollection).toBe('number');
    dbg(`  Payable: ₹${data?.summary?.totalPayable}`);
    dbg(`  Overdue: ₹${data?.summary?.totalOverdue}`);
    dbg(`  Today: ₹${data?.summary?.todayCollection}`);
    dbg(`  Suppliers with due: ${data?.summary?.suppliersWithDue}`);
    expect(data?.recent).toBeDefined();
    expect(data.recent.length).toBeGreaterThanOrEqual(1);
    dbg(`  Recent payments: ${data.recent.length}`);
  });

  // ═══════════════════════════════════════════════════════════
  // PURCHASE REPORTS
  // ═══════════════════════════════════════════════════════════

  // ── STEP 19: Purchase register ──
  it('should return purchase register', async () => {
    const resp = await api('GET', '/purchase/reports/purchase-register?page=1&ps=10');
    dbg(`[STEP 19] Purchase register → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Purchase register verified`);
  });

  // ── STEP 20: GRN register ──
  it('should return GRN register', async () => {
    const resp = await api('GET', '/purchase/reports/grn-register?page=1&ps=10');
    dbg(`[STEP 20] GRN register → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  GRN register verified`);
  });

  // ── STEP 21: GST purchase report ──
  it('should return GST purchase report', async () => {
    const resp = await api('GET', '/purchase/reports/gst-purchase?page=1&ps=10');
    dbg(`[STEP 21] GST purchase → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  GST purchase report verified`);
  });

  // ── STEP 22: Payment report ──
  it('should return payment report', async () => {
    const resp = await api('GET', '/purchase/reports/payment-report?page=1&ps=10');
    dbg(`[STEP 22] Payment report → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Payment report verified`);
  });

  // ── STEP 23: Purchase returns report ──
  it('should return purchase returns report', async () => {
    const resp = await api('GET', '/purchase/reports/purchase-returns?page=1&ps=10');
    dbg(`[STEP 23] Purchase returns → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Purchase returns report verified`);
  });

  // ── STEP 24: Pending POs report ──
  it('should return pending POs report', async () => {
    const resp = await api('GET', '/purchase/reports/pending-pos?page=1&ps=10');
    dbg(`[STEP 24] Pending POs → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Pending POs report verified`);
  });

  // ── STEP 25: Supplier-wise report ──
  it('should return supplier-wise purchase report', async () => {
    const resp = await api('GET', `/purchase/reports/supplier-wise/${supplierId}?page=1&ps=10`);
    dbg(`[STEP 25] Supplier-wise → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Supplier-wise report verified`);
  });

  // ═══════════════════════════════════════════════════════════
  // PURCHASE DASHBOARD
  // ═══════════════════════════════════════════════════════════

  // ── STEP 26: Purchase dashboard ──
  it('should return purchase dashboard', async () => {
    const resp = await api('GET', '/purchase/dashboard');
    dbg(`[STEP 26] Purchase dashboard → ${resp.status}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  Purchase dashboard verified`);
  });

  // ═══════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════

  // ── STEP 27: Validation: zero payment ──
  it('should reject payment with zero amount', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 0,
    });
    dbg(`[STEP 27] Zero payment → ${resp.status}`);
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });

  // ── STEP 28: Validation: invalid mode ──
  it('should reject payment with invalid mode', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      supplierId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bitcoin',
      amount: 100,
    });
    dbg(`[STEP 28] Invalid mode → ${resp.status}`);
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });

  // ── STEP 29: Validation: missing supplier ──
  it('should reject payment without supplier', async () => {
    const resp = await api('POST', '/purchase/payments/collect', {
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 100,
    });
    dbg(`[STEP 29] Missing supplier → ${resp.status}`);
    expect(resp.status).toBeGreaterThanOrEqual(400);
  });
});
