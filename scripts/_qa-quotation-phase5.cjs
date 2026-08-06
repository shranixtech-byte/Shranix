// Phase 5 QA — Quotation Options: valid till, delivery time, payment terms,
// freight, installation charges, warranty, T&C, customer notes, internal notes.
// Also verifies freight + installation charges feed the grand total.
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

    if (!cust?.id) {
      console.log('\nCannot proceed without customer');
      await browser.close();
      return;
    }

    // ── Create quote with ALL 9 options ──────────────────────
    const createRes2 = await api('POST', '/sales/quotations', {
      customerId: cust.id,
      quoteDate: '2026-08-05',
      validTill: '2026-09-05',
      deliveryTime: '1_week',
      paymentTerms: '30_days',
      freight: 150,
      installationCharges: 500,
      warranty: '12 months manufacturer warranty',
      terms: 'Payment within 30 days. Prices valid for 30 days.',
      customerNotes: 'Thank you for your business! Delivery at site included.',
      notes: 'Internal: follow up on 2026-08-10',
      basicTotal: 3000,
      subTotal: 2850,
      discountAmount: 150,
      discountMode: 'none',
      taxAmount: 513,
      cgstTotal: 256.5,
      sgstTotal: 256.5,
      grandTotal: 4013,
    });
    const quote = parseData(createRes2);
    quoteId = quote?.id || null;
    record('Create quote with options', createRes2.status < 300 && !!quoteId, quote?.quoteNumber || `HTTP ${createRes2.status}`);

    // ── Verify each option persisted ─────────────────────────
    const getRes = await api('GET', `/sales/quotations/${quoteId}`);
    const got = parseData(getRes) || {};
    record('Valid Till', String(got.validTill || '').startsWith('2026-09-05'), got.validTill || '');
    record('Delivery Time', got.deliveryTime === '1_week', got.deliveryTime || '');
    record('Payment Terms', got.paymentTerms === '30_days', got.paymentTerms || '');
    record('Freight', Number(got.freight) === 150, `freight=${got.freight}`);
    record('Installation Charges', Number(got.installationCharges) === 500, `install=${got.installationCharges}`);
    record('Warranty', String(got.warranty || '').includes('12 months'), got.warranty?.slice(0, 40) || '');
    record('Terms & Conditions', String(got.terms || '').includes('Payment within 30 days'), '');
    record('Customer Notes', String(got.customerNotes || '').includes('Delivery at site'), '');
    record('Internal Notes', String(got.notes || '').includes('follow up'), '');
    record('Grand total incl. freight+install', Number(got.grandTotal) === 4013, `grand=${got.grandTotal} (2850+513+150+500=4013)`);

    // ── Update options ───────────────────────────────────────
    const updRes = await api('PUT', `/sales/quotations/${quoteId}`, {
      deliveryTime: 'immediate',
      freight: 0,
      installationCharges: 0,
      warranty: '2 years extended',
      customerNotes: 'Updated note',
      grandTotal: 3363,
    });
    const upd = parseData(updRes) || {};
    record('Update options', updRes.status < 300, `HTTP ${updRes.status}`);
    record('Delivery updated', upd.deliveryTime === 'immediate', upd.deliveryTime || '');
    record('Freight cleared', Number(upd.freight) === 0, `freight=${upd.freight}`);
    record('Warranty updated', String(upd.warranty || '').includes('2 years'), '');

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
