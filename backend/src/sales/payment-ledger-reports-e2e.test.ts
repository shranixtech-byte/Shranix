/**
 * E2E Payment Collection + Customer Ledger + Sales Reports
 *
 * Tests:
 *   1. Full payment on invoice
 *   2. Partial payment
 *   3. Multiple payments until fully paid
 *   4. Advance payment (no invoice)
 *   5. Apply advance to invoice
 *   6. Payment list with filters
 *   7. Invoice payment history
 *   8. Customer summary (due invoices + advance)
 *   9. Payment dashboard
 *  10. Customer ledger report
 *  11. Sales register report
 *  12. Invoice register report
 *  13. Outstanding report
 *  14. Payment report
 *  15. Validation: zero amount, invalid mode, missing customer
 *  16. Duplicate payment prevention
 */

import { writeFileSync } from 'fs';

import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.API_URL || 'http://localhost:4001/api/v1';
const OUT = 'C:/Project/SHRANIX-KRUSHI-ERP/backend/payment-e2e-debug.txt';
const logs: string[] = [];
function dbg(msg: string) {
  logs.push(msg);
  writeFileSync(OUT, logs.join('\n'));
}

let token = '';
let csrfToken = '';
let customerId = '';
let itemId = '';
let itemSalesRate = 0;
let gstRate = 0;
let userId = '';

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

const PAYMENTS = '/sales/payments';
const REPORTS = '/sales/reports';

describe('E2E Payment Collection + Customer Ledger + Sales Reports', () => {
  beforeAll(async () => {
    const loginResp = await api('POST', '/auth/login', {
      email: 'admin@shranix.com',
      password: 'admin123',
    });
    expect(loginResp.status).toBe(200);
    token = loginResp.data?.data?.tokens?.accessToken || loginResp.data?.tokens?.accessToken || '';
    expect(token).toBeTruthy();
    userId = loginResp.data?.data?.user?.id || '';
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
    const item = allItems.find((i: any) => Number(i.currentStock || i.current_stock || 0) >= 5);
    expect(item).toBeTruthy();
    itemId = item.id;
    itemSalesRate = Number(item.salesRate || item.sales_rate) || 550;

    const gstRateId = item.gstRateId || item.gst_rate_id;
    if (gstRateId) {
      const gstResp = await api('GET', `/gst-rates/${gstRateId}`);
      if (gstResp.status === 200) {gstRate = Number(extractData(gstResp)?.rate) || 0;}
    }
    if (!gstRate) {gstRate = 18;}

    dbg(
      `[SETUP] Customer: ${customerId}, Item: ${itemId}, Rate: ${itemSalesRate}, GST: ${gstRate}%`,
    );
  });

  // Helper: create invoice, get its ID and balance
  async function createInvoice(label: string, qty = 10) {
    const taxable = qty * itemSalesRate;
    const gst = Math.round((taxable * gstRate) / 100);
    const grandTotal = taxable + gst;

    const qResp = await api('POST', '/sales/quotations', {
      customerId,
      quoteDate: new Date().toISOString().split('T')[0],
      subTotal: taxable,
      taxAmount: gst,
      grandTotal,
      items: [
        {
          itemId,
          quantity: qty,
          rate: itemSalesRate,
          taxableValue: taxable,
          gstRate,
          cgst: gst / 2,
          sgst: gst / 2,
          totalAmount: grandTotal,
        },
      ],
    });
    expect(qResp.status).toBe(201);
    const qId = extractData(qResp)?.id;

    const convResp = await api('POST', `/sales/quotations/${qId}/convert`, {
      steps: ['order', 'challan', 'invoice'],
    });
    expect(convResp.status).toBe(200);
    const conv = extractData(convResp);
    const invoiceId = conv.invoice?.id || conv.invoice?.invoiceId;
    expect(invoiceId).toBeTruthy();

    // Post invoice
    await api('POST', `/sales/invoices/${invoiceId}/post`, { userId });

    // Get invoice details
    const invResp = await api('GET', `/sales/invoices/${invoiceId}`);
    const inv = extractData(invResp);
    dbg(
      `  [HELPER] ${label}: Invoice ${inv.invoiceNumber} (${invoiceId}), total=${inv.grandTotal}, balance=${inv.balanceAmount}`,
    );

    return {
      invoiceId,
      invoiceNumber: inv.invoiceNumber,
      grandTotal: Number(inv.grandTotal),
      balanceAmount: Number(inv.balanceAmount || inv.grandTotal),
    };
  }

  // ══════════════════════════════════════════════════════
  // TEST 1: Full payment on invoice
  // ══════════════════════════════════════════════════════
  let fullPaymentInvoiceId = '';

  it('should collect full payment on an invoice', async () => {
    const { invoiceId, grandTotal } = await createInvoice('Full-Payment');
    fullPaymentInvoiceId = invoiceId;

    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: grandTotal,
      notes: 'Full payment E2E',
      invoiceIds: [invoiceId],
    });
    dbg(`  [TEST 1] Collect → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 1] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.settledTotal).toBe(grandTotal);
    expect(result.payments.length).toBeGreaterThanOrEqual(1);

    // Verify invoice status
    const invResp = await api('GET', `/sales/invoices/${invoiceId}`);
    const inv = extractData(invResp);
    expect(inv.paymentStatus).toBe('paid');
    expect(Number(inv.paidAmount)).toBeCloseTo(grandTotal, 0);
    expect(Number(inv.balanceAmount)).toBeCloseTo(0, 0);
    dbg(`  [TEST 1] Invoice paid: paid=${inv.paidAmount}, balance=${inv.balanceAmount}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 2: Partial payment
  // ══════════════════════════════════════════════════════
  let partialInvoiceId = '';

  it('should collect partial payment correctly', async () => {
    const { invoiceId, grandTotal } = await createInvoice('Partial-Payment');
    partialInvoiceId = invoiceId;

    const partialAmount = Math.round(grandTotal / 3);
    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'upi',
      amount: partialAmount,
      referenceNo: 'UPI-REF-001',
      invoiceIds: [invoiceId],
    });
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.settledTotal).toBe(partialAmount);

    // Verify invoice
    const invResp = await api('GET', `/sales/invoices/${invoiceId}`);
    const inv = extractData(invResp);
    expect(inv.paymentStatus).toBe('partial');
    expect(Number(inv.paidAmount)).toBeCloseTo(partialAmount, 0);
    expect(Number(inv.balanceAmount)).toBeCloseTo(grandTotal - partialAmount, 0);
    dbg(
      `  [TEST 2] Partial: paid=${inv.paidAmount}, balance=${inv.balanceAmount}, status=${inv.paymentStatus}`,
    );
  });

  // ══════════════════════════════════════════════════════
  // TEST 3: Second payment to fully pay
  // ══════════════════════════════════════════════════════
  it('should complete payment with second payment (partial → paid)', async () => {
    // Get current balance
    const invResp = await api('GET', `/sales/invoices/${partialInvoiceId}`);
    const inv = extractData(invResp);
    const remaining = Number(inv.balanceAmount);
    expect(remaining).toBeGreaterThan(0);

    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bank',
      amount: remaining,
      referenceNo: 'BANK-REF-001',
      invoiceIds: [partialInvoiceId],
    });
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.settledTotal).toBe(remaining);

    // Verify invoice fully paid
    const invResp2 = await api('GET', `/sales/invoices/${partialInvoiceId}`);
    const inv2 = extractData(invResp2);
    expect(inv2.paymentStatus).toBe('paid');
    expect(Number(inv2.balanceAmount)).toBeCloseTo(0, 0);
    dbg(`  [TEST 3] Completed: paid=${inv2.paidAmount}, balance=${inv2.balanceAmount}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 4: Advance payment (no invoice)
  // ══════════════════════════════════════════════════════
  it('should record advance payment (no invoice allocation)', async () => {
    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 5000,
      notes: 'Advance payment E2E',
      invoiceIds: [], // Empty = all advance
    });
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.advanceAmount).toBe(5000);
    expect(result.payments.length).toBe(1);
    expect(result.payments[0].isAdvance).toBe(true);
    dbg(`  [TEST 4] Advance: ₹${result.advanceAmount}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 5: Apply advance to invoice
  // ══════════════════════════════════════════════════════
  it('should apply advance balance to an invoice', async () => {
    const { invoiceId, grandTotal } = await createInvoice('Apply-Advance');
    const applyAmount = Math.min(5000, grandTotal);

    const resp = await api('POST', `${PAYMENTS}/apply-advance`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      invoiceIds: [invoiceId],
      amount: applyAmount,
      notes: 'Apply advance E2E',
    });
    dbg(`  [TEST 5] Apply advance → ${resp.status}`);
    if (resp.status >= 300) {dbg(`  [TEST 5] Body: ${JSON.stringify(resp.data).slice(0, 300)}`);}
    expect(resp.status).toBe(200);
    const result = extractData(resp);
    expect(result.success).toBe(true);
    expect(result.applied).toBe(applyAmount);

    // Verify invoice updated
    const invResp = await api('GET', `/sales/invoices/${invoiceId}`);
    const inv = extractData(invResp);
    expect(Number(inv.paidAmount)).toBeCloseTo(applyAmount, 0);
    expect(Number(inv.balanceAmount)).toBeCloseTo(grandTotal - applyAmount, 0);
    dbg(`  [TEST 5] Applied ₹${applyAmount} to invoice, balance=${inv.balanceAmount}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 6: Payment list with filters
  // ══════════════════════════════════════════════════════
  it('should list payments with filters', async () => {
    // List all
    const allResp = await api('GET', `${PAYMENTS}?page=1&pageSize=10`);
    expect(allResp.status).toBe(200);
    const allData = extractData(allResp);
    expect(allData.data.length).toBeGreaterThan(0);
    dbg(`  [TEST 6] All payments: ${allData.data.length}`);

    // Filter by customer
    const custResp = await api('GET', `${PAYMENTS}?customerId=${customerId}`);
    expect(custResp.status).toBe(200);

    // Filter by mode
    const modeResp = await api('GET', `${PAYMENTS}?mode=cash`);
    expect(modeResp.status).toBe(200);
    const modeData = extractData(modeResp);
    const allCash = modeData.data.every((p: any) => p.mode === 'cash');
    expect(allCash).toBe(true);
    dbg(`  [TEST 6] Cash payments: ${modeData.data.length}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 7: Invoice payment history
  // ══════════════════════════════════════════════════════
  it('should show payment history for an invoice', async () => {
    const resp = await api('GET', `${PAYMENTS}/invoice/${fullPaymentInvoiceId}`);
    expect(resp.status).toBe(200);
    const payments = extractData(resp);
    expect(Array.isArray(payments)).toBe(true);
    expect(payments.length).toBeGreaterThanOrEqual(1);
    expect(payments[0].amount).toBeGreaterThan(0);
    dbg(`  [TEST 7] Invoice payments: ${payments.length}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 8: Customer summary
  // ══════════════════════════════════════════════════════
  it('should return customer collection summary', async () => {
    const resp = await api('GET', `${PAYMENTS}/customer/${customerId}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data.customer).toBeTruthy();
    expect(data.profile).toBeTruthy();
    expect(Array.isArray(data.dueInvoices)).toBe(true);
    dbg(
      `  [TEST 8] Customer: outstanding=${data.profile.outstanding}, advance=${data.profile.advanceBalance}, dues=${data.dueInvoices.length}`,
    );
  });

  // ══════════════════════════════════════════════════════
  // TEST 9: Payment dashboard
  // ══════════════════════════════════════════════════════
  it('should return payment dashboard', async () => {
    const resp = await api('GET', `${PAYMENTS}/dashboard`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data.summary).toBeTruthy();
    expect(typeof data.summary.totalOutstanding).toBe('number');
    expect(typeof data.summary.totalAdvance).toBe('number');
    expect(typeof data.summary.todayCollection).toBe('number');
    expect(Array.isArray(data.recent)).toBe(true);
    dbg(
      `  [TEST 9] Dashboard: outstanding=${data.summary.totalOutstanding}, advance=${data.summary.totalAdvance}, today=${data.summary.todayCollection}`,
    );
  });

  // ══════════════════════════════════════════════════════
  // TEST 10: Customer ledger report
  // ══════════════════════════════════════════════════════
  it('should return customer ledger report', async () => {
    const resp = await api('GET', `${REPORTS}/customer-ledger`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 10] Ledger keys: ${Object.keys(data).join(', ')}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 11: Customer ledger 360°
  // ══════════════════════════════════════════════════════
  it('should return customer 360° ledger detail', async () => {
    const resp = await api('GET', `${REPORTS}/customer-ledger/${customerId}`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 11] 360° ledger: ${Object.keys(data).join(', ')}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 12: Sales register report
  // ══════════════════════════════════════════════════════
  it('should return sales register report', async () => {
    const resp = await api('GET', `${REPORTS}/register?page=1&pageSize=10`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 12] Register: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 13: Outstanding report
  // ══════════════════════════════════════════════════════
  it('should return outstanding report', async () => {
    const resp = await api('GET', `${REPORTS}/outstanding?page=1&pageSize=10`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 13] Outstanding: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 14: Payment report
  // ══════════════════════════════════════════════════════
  it('should return payment report', async () => {
    const resp = await api('GET', `${REPORTS}/payment`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 14] Payment report: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 15: GST report
  // ══════════════════════════════════════════════════════
  it('should return GST report', async () => {
    const resp = await api('GET', `${REPORTS}/gst`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 15] GST report: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 16: Validation — zero amount
  // ══════════════════════════════════════════════════════
  it('should reject payment with zero amount', async () => {
    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 0,
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    dbg(`  [TEST 16] Zero amount → ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 17: Validation — invalid mode
  // ══════════════════════════════════════════════════════
  it('should reject payment with invalid mode', async () => {
    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId,
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'bitcoin',
      amount: 100,
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    dbg(`  [TEST 17] Invalid mode → ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 18: Validation — missing customer
  // ══════════════════════════════════════════════════════
  it('should reject payment without customer', async () => {
    const resp = await api('POST', `${PAYMENTS}/collect`, {
      customerId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      mode: 'cash',
      amount: 100,
    });
    expect(resp.status).toBeGreaterThanOrEqual(400);
    dbg(`  [TEST 18] No customer → ${resp.status}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 19: Invoice register report
  // ══════════════════════════════════════════════════════
  it('should return invoice register report', async () => {
    const resp = await api('GET', `${REPORTS}/invoices?page=1&pageSize=10`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 19] Invoice register: ${JSON.stringify(data).slice(0, 200)}`);
  });

  // ══════════════════════════════════════════════════════
  // TEST 20: Sales dashboard report
  // ══════════════════════════════════════════════════════
  it('should return sales dashboard report', async () => {
    const resp = await api('GET', `${REPORTS}/dashboard`);
    expect(resp.status).toBe(200);
    const data = extractData(resp);
    expect(data).toBeTruthy();
    dbg(`  [TEST 20] Sales dashboard: ${JSON.stringify(data).slice(0, 200)}`);
  });
});
