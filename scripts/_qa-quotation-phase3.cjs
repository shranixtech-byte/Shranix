// Phase 3 QA — Quotation Line Items (create with items, fetch with items,
// update replaces items, revision copies items, totals persisted, finalize ok).
const path = require('path');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const API = 'http://localhost:4000/api/v1';
const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));

  const api = (method, apiPath, body) =>
    page.evaluate(
      async ({ method, path, body, apiBase }) => {
        const getCookie = (n) => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];
        let csrf = getCookie('csrf_token');
        if (!csrf) { await fetch(apiBase + '/auth/csrf', { method: 'POST', credentials: 'include' }); csrf = getCookie('csrf_token'); }
        let token = null;
        const rr = await fetch(apiBase + '/auth/refresh', { method: 'POST', credentials: 'include' });
        if (rr.ok) token = (await rr.json())?.data?.accessToken || null;
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        if (csrf) h['x-csrf-token'] = csrf;
        const res = await fetch(apiBase + path, { method, headers: h, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
        const text = await res.text();
        return { status: res.status, body: text };
      },
      { method, path: apiPath, body, apiBase: API },
    );

  const parseData = (r) => {
    try { const j = JSON.parse(r.body); return j.data?.data ?? j.data ?? null; } catch { return null; }
  };

  let quoteId = null;
  let revId = null;

  try {
    await page.goto('http://localhost:4000/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('#email', 'admin@shranix.com');
    await page.type('#password', 'admin123');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /sign\s*in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(3500);

    // ── Existing customer + product ──
    const custRes = await api('GET', '/customers?page=1&pageSize=3');
    const cust = Array.isArray(parseData(custRes)) ? parseData(custRes)[0] : null;
    record('Customer available', !!cust?.id, cust?.name || '');

    const prodRes = await api('GET', '/inventory/products?page=1&pageSize=3');
    const prodList = parseData(prodRes);
    const prod = (Array.isArray(prodList) ? prodList[0] : null) || (Array.isArray(prodList?.data) ? prodList.data[0] : null);
    record('Product available', !!prod?.id, prod?.name || prod?.sku || `HTTP ${prodRes.status}`);

    if (!cust?.id || !prod?.id) {
      console.log('\nCannot proceed without customer + product');
      await browser.close();
      return;
    }

    const itemPayload = (over = {}) => ({
      itemId: prod.id,
      description: prod.name || 'Test Product',
      quantity: 2,
      rate: 1500,
      discountPercent: 5,
      discountAmount: 150,
      discountType: 'percent',
      taxableValue: 2850,
      gstRate: 18,
      igst: 513,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalAmount: 3363,
      batchNo: 'B-2026-01',
      hsnCode: prod.hsn || '1001',
      barcode: prod.barcode || '8900000000001',
      freeQty: 1,
      warehouse: 'Main',
      expiryDate: '2027-12-31',
      remarks: 'QA item line',
      ...over,
    });

    // ── 1. Create quotation WITH items ──
    const createRes = await api('POST', '/sales/quotations', {
      customerId: cust.id,
      quoteDate: '2026-08-05',
      validTill: '2026-08-19',
      billingAddress: cust.address || 'Test Billing',
      shippingAddress: 'Test Shipping',
      contactPerson: 'QA Tester',
      paymentTerms: 'credit',
      subTotal: 2850,
      taxAmount: 513,
      discountAmount: 150,
      grandTotal: 3363,
      items: [itemPayload()],
    });
    const quote = parseData(createRes);
    quoteId = quote?.id || null;
    record('Create quote with items', createRes.status < 300 && !!quoteId, quote?.quoteNumber || `HTTP ${createRes.status}`);
    record('Items persisted on create', Array.isArray(quote?.items) && quote.items.length === 1, `${quote?.items?.length || 0} item(s)`);
    const ci = quote?.items?.[0] || {};
    record('Item fields stored (qty/rate/GST)', Number(ci.quantity) === 2 && Number(ci.rate) === 1500 && Number(ci.gstRate) === 18, `qty=${ci.quantity} rate=${ci.rate} gst=${ci.gstRate}`);
    record('Batch/HSN/Barcode stored', ci.batchNo === 'B-2026-01' && ci.hsnCode === (prod.hsn || '1001'), `batch=${ci.batchNo} hsn=${ci.hsnCode}`);
    record('Free qty + remarks stored', Number(ci.freeQty) === 1 && String(ci.remarks || '') === 'QA item line', `free=${ci.freeQty}`);

    // ── 2. Fetch single → items attached ──
    const getRes = await api('GET', `/sales/quotations/${quoteId}`);
    const got = parseData(getRes);
    record('FindOne attaches items', Array.isArray(got?.items) && got.items.length === 1, `${got?.items?.length || 0} item(s)`);
    record('Totals on quote', Number(got?.grandTotal) === 3363 && Number(got?.taxAmount) === 513, `grand=${got?.grandTotal} tax=${got?.taxAmount}`);

    // ── 3. Update → replace items (2 lines) ──
    const item2 = itemPayload({ quantity: 5, rate: 800, discountPercent: 0, discountAmount: 0, taxableValue: 4000, igst: 720, totalAmount: 4720, batchNo: 'B-2026-02', freeQty: 0, remarks: 'updated line' });
    const item3 = itemPayload({ description: 'Second Product Line', quantity: 1, rate: 100, taxableValue: 100, igst: 18, totalAmount: 118, freeQty: 0 });
    const updRes = await api('PUT', `/sales/quotations/${quoteId}`, {
      subTotal: 4100,
      taxAmount: 738,
      discountAmount: 0,
      grandTotal: 4838,
      items: [item2, item3],
    });
    const upd = parseData(updRes);
    record('Update replaces items', updRes.status < 300 && Array.isArray(upd?.items) && upd.items.length === 2, `${upd?.items?.length || 0} item(s)`);

    // ── 4. Revision → copies items ──
    const revRes = await api('POST', `/sales/quotations/${quoteId}/revision`);
    const rev = parseData(revRes);
    revId = rev?.id || null;
    record('Create Revision', revRes.status < 300 && !!revId, rev?.quoteNumber || `HTTP ${revRes.status}`);
    record('Revision copies items', Array.isArray(rev?.items) && rev.items.length === 2, `${rev?.items?.length || 0} item(s)`);
    const revIds = (rev?.items || []).map((i) => i.itemId).sort();
    const updIds = (upd?.items || []).map((i) => i.itemId).sort();
    record('Revision items match parent', JSON.stringify(revIds) === JSON.stringify(updIds), '');

    // ── 5. Finalize still works ──
    const finRes = await api('PUT', `/sales/quotations/${quoteId}/finalize`);
    record('Finalize with items', finRes.status < 300, `HTTP ${finRes.status}`);

    // ── 6. DB-level check ──
    const rows = await new Promise((resolve) => {
      const { DatabaseSync } = require('node:sqlite');
      try {
        const db = new DatabaseSync('data/dev.db');
        const r = db
          .prepare(
            `SELECT quotation_id, item_id, quantity, batch_no, hsn_code, free_qty, remarks
             FROM shranix_quotation_items WHERE quotation_id IN (?, ?) AND is_deleted = 0`,
          )
          .all(quoteId, revId || quoteId);
        db.close();
        resolve(r);
      } catch (e) {
        resolve([{ error: e.message }]);
      }
    });
    record('DB rows exist', Array.isArray(rows) && rows.length >= 2, `${rows.length} rows in shranix_quotation_items`);

    // ── Cleanup ──
    for (const qid of [quoteId, revId]) {
      if (qid) await api('DELETE', `/sales/quotations/${qid}`).catch(() => {});
    }
  } catch (e) {
    record('Script crashed', false, String(e).slice(0, 200));
  }

  await browser.close();

  const passN = results.filter((r) => r.pass).length;
  const failN = results.filter((r) => !r.pass).length;
  console.log(`\n${passN} passed, ${failN} failed`);
  const realErrs = errs.filter((e) => !/Failed to load resource/.test(e));
  console.log(`Console/page errors: ${realErrs.length > 0 ? realErrs.slice(0, 5).join(' | ') : 'none'}`);
  process.exit(failN > 0 ? 1 : 0);
})().catch((e) => {
  console.error('QA script crashed:', e);
  process.exit(1);
});
