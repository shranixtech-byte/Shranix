// Phase 4 QA — Pricing Engine: Basic → Discount → Taxable → CGST/SGST/IGST →
// Round Off → Grand Total. Verifies the full chain is persisted and consistent.
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

  try {
    await page.goto('http://localhost:4000/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('#email', 'admin@shranix.com');
    await page.type('#password', 'admin123');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /sign\s*in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(3500);

    const custRes = await api('GET', '/customers?page=1&pageSize=3');
    const cust = Array.isArray(parseData(custRes)) ? parseData(custRes)[0] : null;
    record('Customer available', !!cust?.id, cust?.name || '');

    const prodRes = await api('GET', '/inventory/products?page=1&pageSize=3');
    const prodRaw = parseData(prodRes);
    const prod = (Array.isArray(prodRaw) ? prodRaw[0] : null) || (Array.isArray(prodRaw?.data) ? prodRaw.data[0] : null);
    record('Product available', !!prod?.id, prod?.name || prod?.sku || '');

    if (!cust?.id || !prod?.id) {
      console.log('\nCannot proceed without customer + product');
      await browser.close();
      return;
    }

    // Line: qty 2 × rate 1500 = basic 3000; 5% item discount = 150 → taxable 2850; 18% GST (CGST 9% + SGST 9%) = 513 → net 3363
    const items = [
      {
        itemId: prod.id,
        description: prod.name || 'Test Product',
        quantity: 2,
        rate: 1500,
        discountPercent: 5,
        discountAmount: 150,
        discountType: 'percent',
        taxableValue: 2850,
        gstRate: 18,
        igst: 0,
        cgst: 256.5,
        sgst: 256.5,
        cess: 0,
        totalAmount: 3363,
      },
    ];

    // ── 1. No invoice discount, round off ON ────────────────
    const createRes = await api('POST', '/sales/quotations', {
      customerId: cust.id,
      quoteDate: '2026-08-05',
      basicTotal: 3000,
      subTotal: 2850,
      discountPercent: 0,
      discountAmount: 150,
      discountMode: 'none',
      taxAmount: 513,
      cgstTotal: 256.5,
      sgstTotal: 256.5,
      igstTotal: 0,
      cessTotal: 0,
      roundOff: 0,
      applyRoundOff: true,
      grandTotal: 3363,
      items,
    });
    const quote = parseData(createRes);
    quoteId = quote?.id || null;
    record('Create quote (pricing chain)', createRes.status < 300 && !!quoteId, quote?.quoteNumber || `HTTP ${createRes.status}`);
    record('Basic stored', Number(quote?.basicTotal) === 3000, `basic=${quote?.basicTotal}`);
    record('Taxable stored', Number(quote?.subTotal) === 2850, `sub=${quote?.subTotal}`);
    record('Discount stored', Number(quote?.discountAmount) === 150, `disc=${quote?.discountAmount}`);
    record('GST totals stored', Number(quote?.taxAmount) === 513 && Number(quote?.cgstTotal) === 256.5 && Number(quote?.sgstTotal) === 256.5, `tax=${quote?.taxAmount} cgst=${quote?.cgstTotal} sgst=${quote?.sgstTotal}`);
    record('Grand total stored', Number(quote?.grandTotal) === 3363, `grand=${quote?.grandTotal}`);

    // ── 2. Invoice-level % discount → chain recomputes ───────
    // 3000 basic − 150 item disc = 2850; 10% invoice disc = 285 → taxable 2565;
    // GST scaled: 513 × (2565/2850) = 461.7 → net 3026.7 → round to 3027
    const updRes = await api('PUT', `/sales/quotations/${quoteId}`, {
      discountPercent: 10,
      discountMode: 'percentage',
      basicTotal: 3000,
      subTotal: 2565,
      discountAmount: 435,
      taxAmount: 461.7,
      roundOff: 0.3,
      applyRoundOff: true,
      grandTotal: 3027,
      items,
    });
    const upd = parseData(updRes);
    record('Invoice % discount update', updRes.status < 300 && !!upd, `HTTP ${updRes.status}`);
    record('Discounted taxable', Number(upd?.subTotal) === 2565, `sub=${upd?.subTotal}`);
    record('Total discount (150+285)', Number(upd?.discountAmount) === 435, `disc=${upd?.discountAmount}`);
    record('GST scaled after discount', Math.abs(Number(upd?.taxAmount) - 461.7) < 0.02, `tax=${upd?.taxAmount}`);
    record('Round off persisted', Number(upd?.roundOff) === 0.3, `roundOff=${upd?.roundOff}`);
    record('Grand total rounded', Number(upd?.grandTotal) === 3027, `grand=${upd?.grandTotal}`);

    // ── 3. Flat discount + round off OFF ─────────────────────
    const upd2Res = await api('PUT', `/sales/quotations/${quoteId}`, {
      discountMode: 'flat',
      discountPercent: 0,
      discountAmount: 300,
      applyRoundOff: false,
      basicTotal: 3000,
      subTotal: 2700,
      taxAmount: 486,
      roundOff: 0,
      grandTotal: 3186,
      items,
    });
    const upd2 = parseData(upd2Res);
    record('Flat discount update', upd2Res.status < 300 && !!upd2, `HTTP ${upd2Res.status}`);
    record('Flat taxable', Number(upd2?.subTotal) === 2700, `sub=${upd2?.subTotal}`);
    record('Round off OFF → 0', Number(upd2?.roundOff) === 0, `roundOff=${upd2?.roundOff}`);
    record('Unrounded grand', Number(upd2?.grandTotal) === 3186, `grand=${upd2?.grandTotal}`);

    // ── Cleanup ──
    if (quoteId) await api('DELETE', `/sales/quotations/${quoteId}`).catch(() => {});
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
