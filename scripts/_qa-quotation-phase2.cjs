// Quotation Master Phase 2 QA — customer search (name/mobile/gstin), billing/shipping
// address, contact person, payment terms, credit limit check.
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
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) errs.push(`HTTP ${r.status()} ${r.url().replace(API, '').slice(0, 70)}`);
  });

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

  let custId = null;
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

    const TS = Date.now().toString().slice(-6);
    const MOBILE = `9${String(TS).slice(0, 9)}`;

    // ── Create a test customer with mobile + gstin + address + contact person ──
    const cust = await api('POST', '/customers', {
      name: `QA Phase2 ${TS}`, code: `QA-P2-${TS}`, mobile: MOBILE,
      gstin: '27ABCDE1234F1Z5', address: 'Billing Rd, Pune', city: 'Pune', state: 'Maharashtra',
      contactPerson: 'QA Contact', paymentTerms: '30_days', creditLimit: 1000,
    });
    const c = parseData(cust);
    custId = c?.id || null;
    record('Create test customer', cust.status < 300 && !!custId, `POST ${cust.status} id=${custId?.slice(0, 8)}`);

    // ── Search by mobile (searchField=mobile) ──
    const byMobile = await api('GET', `/customers?search=${MOBILE}&searchField=mobile`);
    const mList = parseData(byMobile);
    const mHit = Array.isArray(mList) && mList.some((x) => String(x.mobile || '') === MOBILE);
    record('Customer search by MOBILE', byMobile.status < 300 && mHit, `found ${Array.isArray(mList) ? mList.length : 0}`);

    // ── Search by GSTIN ──
    const byGst = await api('GET', `/customers?search=27ABCDE1234F1Z5&searchField=gstin`);
    const gList = parseData(byGst);
    const gHit = Array.isArray(gList) && gList.some((x) => String(x.gstin || '').toUpperCase() === '27ABCDE1234F1Z5');
    record('Customer search by GSTIN', byGst.status < 300 && gHit, `found ${Array.isArray(gList) ? gList.length : 0}`);

    // ── Search by name ──
    const byName = await api('GET', `/customers?search=QA%20Phase2%20${TS}&searchField=name`);
    const nList = parseData(byName);
    const nHit = Array.isArray(nList) && nList.some((x) => String(x.name || '').includes(`QA Phase2 ${TS}`));
    record('Customer search by NAME', byName.status < 300 && nHit, `found ${Array.isArray(nList) ? nList.length : 0}`);

    // ── Quote create with billing/shipping/contact/payment terms ──
    if (custId) {
      const q = await api('POST', '/sales/quotations', {
        customerId: custId, quoteDate: '2026-08-05', grandTotal: 250,
        billingAddress: 'Billing Rd, Pune', shippingAddress: 'Shipping Rd, Mumbai',
        contactPerson: 'QA Contact', paymentTerms: '30_days',
      });
      const quote = parseData(q);
      quoteId = quote?.id || null;
      const ok = q.status < 300 && quote && quote.billingAddress === 'Billing Rd, Pune' && quote.shippingAddress === 'Shipping Rd, Mumbai' && quote.contactPerson === 'QA Contact' && quote.paymentTerms === '30_days';
      record('Quote create with addresses + payment terms', ok, `POST ${q.status} → ${quote?.quoteNumber}`);
    }

    // ── Credit limit check ──
    if (custId) {
      // Set over-limit profile
      await api('POST', `/sales/credit/${custId}/update`, { creditLimit: 1000, outstanding: 5000 });
      // Enable enforceCreditLimit
      await api('PUT', '/sales/settings', { enforceCreditLimit: true, autoQuoteNumber: true });
      const blocked = await api('POST', '/sales/quotations', { customerId: custId, quoteDate: '2026-08-05', grandTotal: 100 });
      record('Credit limit check blocks over-limit', blocked.status === 400, `POST ${blocked.status} (expected 400) — ${blocked.body.slice(0, 90)}`);
      // Disable enforce → should create fine
      await api('PUT', '/sales/settings', { enforceCreditLimit: false });
      const allowed = await api('POST', '/sales/quotations', { customerId: custId, quoteDate: '2026-08-05', grandTotal: 100 });
      const aq = parseData(allowed);
      record('Credit check OFF → quote allowed', allowed.status < 300 && !!aq?.id, `POST ${allowed.status} → ${aq?.quoteNumber}`);
      if (aq?.id) await api('DELETE', `/sales/quotations/${aq.id}`);
      // restore profile
      await api('POST', `/sales/credit/${custId}/update`, { creditLimit: 1000, outstanding: 0 });
    }

    // ── UI: quotation create page shows customer selection ──
    const spaGo = async (href) => {
      await page.evaluate((h) => { window.history.pushState({}, '', h); window.dispatchEvent(new PopStateEvent('popstate')); }, href);
      await sleep(2500);
    };
    await spaGo('/sales/quotations/create');
    const text = await page.evaluate(() => document.body.innerText || '');
    record('UI: customer selection screen', /Select Customer/.test(text), 'search screen visible');

    // ── CLEANUP ──
    if (quoteId) await api('DELETE', `/sales/quotations/${quoteId}`);
    if (custId) await api('DELETE', `/customers/${custId}`);

    console.log('\n===== PHASE 2 SUMMARY =====');
    const fails = results.filter((r) => !r.pass);
    console.log(`PASSED ${results.filter((r) => r.pass === true).length}/${results.length}`);
    console.log('Console/API errors:', errs.length ? errs.slice(0, 8).join(' | ') : 'none');
    if (fails.length) console.log('FAILED:', fails.map((f) => `${f.name} → ${f.detail}`).join(' | '));
  } catch (e) {
    console.log('\nSCRIPT ERROR:', String(e).slice(0, 300));
    console.log('Console/API errors so far:', errs.slice(0, 8).join(' | ') || 'none');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
