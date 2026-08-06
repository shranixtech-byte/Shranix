// Quotation Master functional QA — auto/manual numbering, FY & branch prefix, revision, finalize.
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
    if (r.status() >= 400 && r.url().includes('/api/')) errs.push(`HTTP ${r.status()} ${r.url().replace(API, '').slice(0, 80)}`);
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

  try {
    // LOGIN via real UI
    await page.goto('http://localhost:4000/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('#email', 'admin@shranix.com');
    await page.type('#password', 'admin123');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /sign\s*in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await sleep(3500);
    const hub = await page.evaluate(() => !!document.querySelector('nav, aside, [class*="sidebar"], a[href*="dashboard"]'));
    record('Login', hub, 'session established');

    // ── Settings row: ensure exists with known values ──
    let setRes = await api('GET', '/sales/settings');
    let settings = null;
    try { settings = JSON.parse(setRes.body).data?.data?.[0] || JSON.parse(setRes.body).data?.[0] || null; } catch {}
    if (!settings) {
      const c = await api('POST', '/sales/settings', {
        autoQuoteNumber: true, quotePrefix: 'SQ-', quoteNextNumber: 1, quoteFyPrefix: false, quoteBranchPrefix: false,
      });
      record('Create sales settings row', c.status < 300, `POST ${c.status}`);
      try { settings = JSON.parse(c.body).data?.data || JSON.parse(c.body).data || null; } catch {}
    } else {
      record('Sales settings row exists', true, `prefix=${settings.quotePrefix} next=${settings.quoteNextNumber}`);
      const u = await api('PUT', `/sales/settings`, { autoQuoteNumber: true, quotePrefix: 'SQ-', quoteNextNumber: 1, quoteFyPrefix: false, quoteBranchPrefix: false });
      record('Reset settings (auto ON, SQ-, 1)', u.status < 300, `PUT ${u.status}`);
    }

    const TS = Date.now().toString().slice(-6);

    // ── AUTO NUMBERING ──
    const auto = await api('POST', '/sales/quotations', { customerId: `qa-cust-${TS}`, quoteDate: '2026-08-05', grandTotal: 100 });
    let autoQuote = null;
    try { autoQuote = JSON.parse(auto.body).data?.data || JSON.parse(auto.body).data || null; } catch {}
    record('Auto numbering', auto.status < 300 && autoQuote && /^SQ-\d{4}$/.test(autoQuote.quoteNumber), `POST ${auto.status} → ${autoQuote?.quoteNumber} (rev ${autoQuote?.revision})`);

    // ── REVISION HISTORY ──
    let revQuote = null;
    if (autoQuote?.id) {
      const rev = await api('POST', `/sales/quotations/${autoQuote.id}/revision`);
      try { revQuote = JSON.parse(rev.body).data?.data || JSON.parse(rev.body).data || null; } catch {}
      const ok = rev.status < 300 && revQuote && /-Rev-2$/.test(revQuote.quoteNumber) && revQuote.revision === 2 && revQuote.parentQuoteId === autoQuote.id && revQuote.status === 'draft';
      record('Create revision (Rev-2)', ok, `POST ${rev.status} → ${revQuote?.quoteNumber}, rev=${revQuote?.revision}, parent linked=${revQuote?.parentQuoteId === autoQuote.id}`);
    }

    // ── FINAL STATUS ──
    let finalQuote = null;
    if (autoQuote?.id) {
      const fin = await api('PUT', `/sales/quotations/${autoQuote.id}/finalize`);
      try { finalQuote = JSON.parse(fin.body).data?.data || JSON.parse(fin.body).data || null; } catch {}
      record('Finalize status', fin.status < 300 && finalQuote?.status === 'final', `PUT ${fin.status} → status=${finalQuote?.status}`);
    }

    // ── FINAL LOCK (server-side) ──
    if (autoQuote?.id) {
      const upd = await api('PUT', `/sales/quotations/${autoQuote.id}`, { notes: 'should fail' });
      const revOnFinal = await api('POST', `/sales/quotations/${autoQuote.id}/revision`);
      record('Final lock: update rejected', upd.status === 400, `PUT ${upd.status} (expected 400)`);
      record('Final lock: revision rejected', revOnFinal.status === 400, `POST rev ${revOnFinal.status} (expected 400)`);
    }

    // ── FY PREFIX ──
    const fyRes = await api('GET', '/financial-years?pageSize=5');
    let fyList = [];
    try { const j = JSON.parse(fyRes.body); fyList = j.data?.data || j.data || []; } catch {}
    if (Array.isArray(fyList) && fyList.length > 0 && settings?.id) {
      const fy = fyList[0];
      await api('PUT', `/sales/settings`, { autoQuoteNumber: true, quotePrefix: 'SQ-', quoteNextNumber: 1, quoteFyPrefix: true, quoteBranchPrefix: false });
      const withFy = await api('POST', '/sales/quotations', { customerId: `qa-fy-${TS}`, quoteDate: '2026-08-05', financialYearId: fy.id, grandTotal: 50 });
      let q = null;
      try { q = JSON.parse(withFy.body).data?.data || JSON.parse(withFy.body).data || null; } catch {}
      const fyMatch = String(fy.name || '').match(/(\d{2,4})\s*[-/]\s*(\d{2,4})/);
      const fyPart = fyMatch ? fyMatch[1].slice(-2) + '-' + fyMatch[2].slice(-2) : String(fy.startDate || '').slice(0, 4);
      record('FY prefix in number', !!q && q.quoteNumber.includes(fyPart), `FY=${fy.name} → ${q?.quoteNumber}`);
      if (q?.id) await api('DELETE', `/sales/quotations/${q.id}`);
    } else {
      record('FY prefix in number', 'SKIP', 'no financial year found');
    }

    // ── BRANCH PREFIX ──
    const brRes = await api('GET', '/branches?pageSize=5');
    let brList = [];
    try { const j = JSON.parse(brRes.body); brList = j.data?.data || j.data || []; } catch {}
    if (Array.isArray(brList) && brList.length > 0 && settings?.id) {
      const br = brList[0];
      await api('PUT', `/sales/settings`, { autoQuoteNumber: true, quotePrefix: 'SQ-', quoteNextNumber: 1, quoteFyPrefix: false, quoteBranchPrefix: true });
      const withBr = await api('POST', '/sales/quotations', { customerId: `qa-br-${TS}`, quoteDate: '2026-08-05', branchId: br.id, grandTotal: 50 });
      let q = null;
      try { q = JSON.parse(withBr.body).data?.data || JSON.parse(withBr.body).data || null; } catch {}
      record('Branch prefix in number', !!q && q.quoteNumber.includes(br.code), `branch=${br.code} → ${q?.quoteNumber}`);
      if (q?.id) await api('DELETE', `/sales/quotations/${q.id}`);
    } else {
      record('Branch prefix in number', 'SKIP', 'no branch found');
    }

    // ── MANUAL NUMBERING ──
    if (settings?.id) {
      await api('PUT', `/sales/settings`, { autoQuoteNumber: false, quotePrefix: 'SQ-', quoteNextNumber: 1, quoteFyPrefix: false, quoteBranchPrefix: false });
      const manual = await api('POST', '/sales/quotations', { quoteNumber: `QA-MANUAL-${TS}`, customerId: `qa-man-${TS}`, quoteDate: '2026-08-05', grandTotal: 25 });
      let q = null;
      try { q = JSON.parse(manual.body).data?.data || JSON.parse(manual.body).data || null; } catch {}
      record('Manual numbering (auto OFF)', manual.status < 300 && q?.quoteNumber === `QA-MANUAL-${TS}`, `POST ${manual.status} → ${q?.quoteNumber}`);
      if (q?.id) await api('DELETE', `/sales/quotations/${q.id}`);
      const miss = await api('POST', '/sales/quotations', { customerId: `qa-miss-${TS}`, quoteDate: '2026-08-05' });
      record('Manual mode rejects missing number', miss.status === 400, `POST ${miss.status} (expected 400)`);
      await api('PUT', `/sales/settings`, { autoQuoteNumber: true });
    }

    // ── CLEANUP ──
    if (autoQuote?.id) await api('DELETE', `/sales/quotations/${autoQuote.id}`);
    if (revQuote?.id) await api('DELETE', `/sales/quotations/${revQuote.id}`);
    if (settings?.id) await api('PUT', `/sales/settings`, { autoQuoteNumber: true, quoteFyPrefix: false, quoteBranchPrefix: false });

    // ── SUMMARY ──
    console.log('\n===== QUOTATION MASTER SUMMARY =====');
    const real = results.filter((r) => r.pass !== 'SKIP');
    console.log(`PASSED ${real.filter((r) => r.pass === true).length}/${real.length}`);
    console.log('Console/API errors:', errs.length ? errs.slice(0, 8).join(' | ') : 'none');
    const fails = real.filter((r) => !r.pass);
    if (fails.length) console.log('FAILED:', fails.map((f) => `${f.name} → ${f.detail}`).join(' | '));
  } catch (e) {
    console.log('\nSCRIPT ERROR:', String(e).slice(0, 300));
    console.log('Console/API errors so far:', errs.slice(0, 8).join(' | ') || 'none');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
