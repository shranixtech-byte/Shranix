// Phase 6 QA — Approval Workflow: Sales Executive → Sales Manager → Owner → Approved → Send Customer
// Verifies: 3-level quotation matrix, submit, approve×3 (level progression), status sync,
// send restrictions (pending blocked, approved allowed), sent_at/sent_via persistence.
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
  const errMsg = (r) => {
    try { const j = JSON.parse(r.body); return j.message || j.error || ''; } catch { return ''; }
  };

  let quoteId = null;
  let approvalId = null;

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

    // ── Create a quotation ───────────────────────────────────
    const createRes = await api('POST', '/sales/quotations', {
      customerId: cust.id,
      quoteDate: '2026-08-05',
      validTill: '2026-09-05',
      basicTotal: 3000,
      subTotal: 2850,
      discountAmount: 150,
      discountMode: 'none',
      taxAmount: 513,
      cgstTotal: 256.5,
      sgstTotal: 256.5,
      grandTotal: 3363,
    });
    const quote = parseData(createRes);
    quoteId = quote?.id || null;
    record('Create quotation', createRes.status < 300 && !!quoteId, quote?.quoteNumber || `HTTP ${createRes.status}`);

    // ── Approval matrix is 3-level for quotations ────────────
    const matrixRes = await api('GET', '/sales/approvals/workflow/settings/matrices');
    const matrices = Array.isArray(parseData(matrixRes)) ? parseData(matrixRes) : [];
    const qMatrix = matrices.find((m) => m.documentType === 'sales_quotation');
    record('3-level quotation matrix', qMatrix && Number(qMatrix.levelCount) === 3, `levels=${qMatrix?.levelCount} approvers=${qMatrix?.approvers}`);

    // ── Send BEFORE approval → blocked ───────────────────────
    const sendEarly = await api('POST', `/sales/quotations/${quoteId}/send`, { via: 'manual' });
    record('Send blocked pre-approval', sendEarly.status >= 400, errMsg(sendEarly) || `HTTP ${sendEarly.status}`);

    // ── Submit for approval → pending, level 1 ───────────────
    const subRes = await api('POST', `/sales/quotations/${quoteId}/submit-approval`);
    const sub = parseData(subRes) || {};
    approvalId = sub?.approval?.id || null;
    record('Submit for approval', subRes.status < 300 && !!approvalId, `approval=${approvalId || 'none'}`);
    record('Approval pending at level 1', sub?.approval?.status === 'pending' && Number(sub?.approval?.currentLevel) === 1, `status=${sub?.approval?.status} level=${sub?.approval?.currentLevel}`);
    record('Total levels = 3', Number(sub?.approval?.totalLevels) === 3, `totalLevels=${sub?.approval?.totalLevels}`);

    // ── Double submit → blocked ──────────────────────────────
    const sub2 = await api('POST', `/sales/quotations/${quoteId}/submit-approval`);
    record('Double submit blocked', sub2.status >= 400, errMsg(sub2) || `HTTP ${sub2.status}`);

    // ── Approve level 1 → under_review, level 2 ──────────────
    const a1 = await api('POST', `/sales/approvals/workflow/${approvalId}/approve`, { comment: 'Level 1 OK (Sales Executive)' });
    const a1d = parseData(a1) || {};
    record('Approve L1 → under_review L2', a1d?.status === 'under_review' && Number(a1d?.currentLevel) === 2, `status=${a1d?.status} level=${a1d?.currentLevel}`);

    // ── Approve level 2 → under_review, level 3 ──────────────
    const a2 = await api('POST', `/sales/approvals/workflow/${approvalId}/approve`, { comment: 'Level 2 OK (Sales Manager)' });
    const a2d = parseData(a2) || {};
    record('Approve L2 → under_review L3', a2d?.status === 'under_review' && Number(a2d?.currentLevel) === 3, `status=${a2d?.status} level=${a2d?.currentLevel}`);

    // ── Quote still mid-chain → send blocked ─────────────────
    const sendMid = await api('POST', `/sales/quotations/${quoteId}/send`, { via: 'manual' });
    record('Send blocked mid-chain (under_review)', sendMid.status >= 400, errMsg(sendMid) || `HTTP ${sendMid.status}`);

    // ── Approve level 3 → approved + quote status synced ─────
    const a3 = await api('POST', `/sales/approvals/workflow/${approvalId}/approve`, { comment: 'Level 3 OK (Owner)' });
    const a3d = parseData(a3) || {};
    record('Approve L3 → approved', a3d?.status === 'approved', `status=${a3d?.status}`);
    const quoteAfter = parseData(await api('GET', `/sales/quotations/${quoteId}`)) || {};
    record('Quote status synced to approved', quoteAfter?.status === 'approved', `quoteStatus=${quoteAfter?.status}`);

    // ── Send to customer → sent + sentAt/sentVia ─────────────
    const sendRes = await api('POST', `/sales/quotations/${quoteId}/send`, { via: 'email' });
    const sent = parseData(sendRes) || {};
    record('Send customer after approval', sendRes.status < 300 && sent?.status === 'sent', `status=${sent?.status}`);
    record('sentAt recorded', !!sent?.sentAt, sent?.sentAt || '');
    record('sentVia recorded', sent?.sentVia === 'email', sent?.sentVia || '');

    // ── Reject path (second quote) ───────────────────────────
    const createRes2 = await api('POST', '/sales/quotations', {
      customerId: cust.id,
      quoteDate: '2026-08-05',
      basicTotal: 1200,
      subTotal: 1200,
      discountAmount: 0,
      grandTotal: 1200,
    });
    const q2 = parseData(createRes2) || {};
    const subRes2 = await api('POST', `/sales/quotations/${q2.id}/submit-approval`);
    const sub2d = parseData(subRes2) || {};
    const rej = await api('POST', `/sales/approvals/workflow/${sub2d?.approval?.id}/reject`, { comment: 'Price too high' });
    const rejD = parseData(rej) || {};
    record('Reject path works', rejD?.status === 'rejected', `status=${rejD?.status}`);
    const q2After = parseData(await api('GET', `/sales/quotations/${q2.id}`)) || {};
    record('Quote status synced to rejected', q2After?.status === 'rejected', `quoteStatus=${q2After?.status}`);
    if (q2?.id) await api('DELETE', `/sales/quotations/${q2.id}`).catch(() => {});

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
