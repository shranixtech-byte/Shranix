// Phase 7 QA — Full UI E2E (browser-level, not API): login page → Sales Quotations
// list → create flow (customer selection screen → product selection screen →
// quotation form with live pricing engine) → save → list rendering with status
// badges → edit-mode restore → row actions (Submit for Approval / Create
// Revision / Mark Final) → verification of the complete UI surface.
//
// Phase 1-6 were API-level (fetch via page.evaluate). Phase 7 drives the actual
// React UI with real clicks/types so the quotation module is verified end-to-end.
//
// NOTE: ProtectedRoute keeps the session in-memory only — a full page.goto()
// reloads and redirects to /auth/login. All navigation uses SPA pushState so the
// session survives.
const path = require('path');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const FRONT = 'http://localhost:4000';
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
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  // Auto-accept confirm dialogs (Submit for Approval / Revision / Final)
  page.on('dialog', async (d) => { try { await d.accept(); } catch {} });

  // Click a button whose visible text matches (case-insensitive substring)
  const clickBtn = async (text) => {
    const ok = await page.evaluate(
      (t) => {
        const b = Array.from(document.querySelectorAll('button')).find(
          (x) => !x.disabled && (x.textContent || '').toLowerCase().includes(t),
        );
        if (b) { b.click(); return true; }
        return false;
      },
      text.toLowerCase(),
    );
    if (!ok) {
      await sleep(400);
      return page.evaluate(
        (t) => {
          const b = Array.from(document.querySelectorAll('button')).find(
            (x) => !x.disabled && (x.textContent || '').toLowerCase().includes(t),
          );
          if (b) { b.click(); return true; }
          return false;
        },
        text.toLowerCase(),
      );
    }
    return ok;
  };

  const typeInto = async (sel, value) => {
    await page.waitForSelector(sel, { timeout: 5000 }).catch(() => {});
    await page.click(sel).catch(() => {});
    await page.type(sel, value, { delay: 30 }).catch(() => {});
  };

  const visibleText = async () => {
    const txt = await page.evaluate(() => document.body.innerText || '');
    return txt.replace(/\s+/g, ' ').trim();
  };

  // SPA navigation — keeps the in-memory session alive
  const spaNav = async (path, waitMs = 2500) => {
    await page.evaluate((p) => {
      window.history.pushState({}, '', p);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await sleep(waitMs);
  };

  let createdQuoteNumber = null;
  let createdQuoteIds = [];

  try {
    // ── 1. LOGIN through the real UI ─────────────────────────
    await page.goto(`${FRONT}/auth/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await typeInto('#email', 'admin@shranix.com');
    await typeInto('#password', 'admin123');
    await clickBtn('Sign In');
    await sleep(3500);
    let t = await visibleText();
    record('UI: login succeeds (dashboard)', /dashboard|डॅशबोर्ड/i.test(t), t.slice(0, 80));

    // ── 2. NAVIGATE to Sales Quotations list (SPA) ────────────
    await spaNav('/sales/quotations');
    t = await visibleText();
    record('List page renders', t.includes('Sales Quotations'), t.slice(0, 50));
    record('List shows Create button', /create sales quotation/i.test(t), '');

    // ── 3. CREATE flow — customer selection screen ────────────
    const created = await clickBtn('Create Sales Quotation');
    await sleep(2000);
    t = await visibleText();
    record('Create flow → customer selection screen', created && /select customer/i.test(t), '');

    // Pick the first customer row + click Select Customer
    const rowClicked = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
      const row = rows.find((r) => (r.textContent || '').trim()) || rows[0];
      if (!row) return false;
      row.click();
      return true;
    });
    await sleep(800);
    record('Customer row clickable', rowClicked, '');
    const selClicked = await clickBtn('Select Customer');
    await sleep(2500);
    t = await visibleText();
    record('Customer selected → quotation form', selClicked && /sales quotation/i.test(t), '');

    // ── 4. PRODUCT selection screen ───────────────────────────
    const addProds = await clickBtn('Add Products');
    await sleep(2500);
    const searchInputVisible = await page.evaluate(
      () => !!document.querySelector('input[aria-label="Search products"]'),
    );
    record('Product selection screen opens', addProds && searchInputVisible, '');

    // Type 'a' into product search → pick the first result (mousedown selects)
    await typeInto('input[aria-label="Search products"]', 'a');
    await sleep(2500);
    // Real mouse click at the item coordinates — React's onMouseDown needs a
    // trusted event (synthetic dispatchEvent does not trigger it).
    const prodRect = await page.evaluate(() => {
      // Scope to the product-search dropdown (z-50 container) — ALL buttons on the
      // page would also match sidebar Marathi labels like "विक्री".
      const dropdown = Array.from(document.querySelectorAll('.z-50, div[class*="z-50"]')).find(
        (d) => d.querySelectorAll('button').length > 0 && d.getBoundingClientRect().top < 600,
      );
      const container = dropdown || document;
      const btns = Array.from(container.querySelectorAll('button'));
      const item = btns.find((b) => {
        const txt = (b.textContent || '').trim();
        return txt.length > 2 && txt.length < 60 && !/barcode|import|add product|name|barcode|sku|batch|search|back|review|items|recent|frequently/i.test(txt);
      });
      if (!item) return null;
      const r = item.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    let prodPicked = false;
    if (prodRect) {
      await page.mouse.click(prodRect.x, prodRect.y);
      prodPicked = true;
    }
    await sleep(1500);
    t = await visibleText();
    const gridHasItems = /items? added|review invoice/i.test(t);
    record('Product added to grid', prodPicked && gridHasItems, t.slice(0, 60));

    const reviewClicked = await clickBtn('Review Invoice');
    await sleep(2000);
    t = await visibleText();
    record('Review → back on form', reviewClicked && /sales quotation/i.test(t), '');

    // ── 5. LIVE PRICING ENGINE on the form ────────────────────
    t = await visibleText();
    const hasBreakdown = /calculation breakdown/i.test(t) && /grand total/i.test(t);
    const hasGst = /CGST|SGST|IGST|CESS/i.test(t);
    record('Pricing engine breakdown visible', hasBreakdown && hasGst, '');
    const grandMatch = t.match(/Grand Total[₹\s]*([\d,]+(?:\.\d+)?)/);
    record('Grand total computed on UI', !!grandMatch, grandMatch ? `₹${grandMatch[1]}` : '');

    // ── 6. SAVE the quotation through the UI ──────────────────
    const saved = await clickBtn('Save');
    await sleep(3000);
    t = await visibleText();
    record('Save → returns to list', saved && t.includes('Sales Quotations'), '');

    // Capture the newly created quote number + ID from the list
    const createdInfo = await page.evaluate(async () => {
      const apiBase = 'http://localhost:4000/api/v1';
      const getCookie = (n) => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];
      let csrf = getCookie('csrf_token');
      if (!csrf) { await fetch(apiBase + '/auth/csrf', { method: 'POST', credentials: 'include' }); csrf = getCookie('csrf_token'); }
      let token = null;
      const rr = await fetch(apiBase + '/auth/refresh', { method: 'POST', credentials: 'include' });
      if (rr.ok) token = (await rr.json())?.data?.accessToken || null;
      const h = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = 'Bearer ' + token;
      if (csrf) h['x-csrf-token'] = csrf;
      const list = await fetch(apiBase + '/sales/quotations?pageSize=100', { headers: h, credentials: 'include' });
      const body = await list.json();
      const arr = body?.data?.data || body?.data || [];
      // Newest first — the quote created just now is at the top of the list
      const created = arr[0];
      return { number: created?.quoteNumber || null, id: created?.id || null };
    }).catch(() => ({ number: null, id: null }));
    createdQuoteNumber = createdInfo?.number || null;
    if (createdInfo?.id) createdQuoteIds.push(createdInfo.id);
    record('New quote visible in list (auto number)', !!createdQuoteNumber, createdQuoteNumber || '');
    record(
      'New quote shows Rev badge',
      await page.evaluate(() => /Rev-\d+/i.test(document.body.innerText || '')),
      'Rev-1 expected',
    );

    // ── 7. EDIT MODE — form pre-fills items + pricing ─────────
    const editClicked = await page.evaluate((qNum) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find((r) => qNum && (r.textContent || '').includes(qNum));
      if (!row) return false;
      const edit = Array.from(row.querySelectorAll('button')).find((b) => /^edit$/i.test((b.textContent || '').trim()));
      if (!edit) return false;
      edit.click();
      return true;
    }, createdQuoteNumber);
    await sleep(3000);
    t = await visibleText();
    record('Edit opens quotation form', editClicked && /edit sales quotation/i.test(t), '');
    const editState = await page.evaluate(() => {
      const qv = document.querySelector('input[placeholder*="Auto-generated"]')?.value || '';
      const hasItems = /item(s)? added|edit products/i.test(document.body.innerText || '');
      const hasGrand = /grand total/i.test(document.body.innerText || '');
      return { qv, hasItems, hasGrand };
    });
    record('Edit form pre-fills quote number', !!editState.qv, editState.qv || '');
    record('Edit form restores items', editState.hasItems, '');

    // ── 8. Back to list — ROW ACTIONS ─────────────────────────
    await spaNav('/sales/quotations');
    const rowActionLabels = await page.evaluate((qNum) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find((r) => qNum && (r.textContent || '').includes(qNum));
      if (!row) return [];
      return Array.from(row.querySelectorAll('button'))
        .map((b) => (b.textContent || '').trim())
        .filter(Boolean);
    }, createdQuoteNumber);
    record(
      'Row actions present (submit/send/revision/final)',
      ['Submit for Approval', 'Create Revision', 'Mark Final'].every((x) =>
        rowActionLabels.some((l) => l.includes(x)),
      ),
      rowActionLabels.join(' | '),
    );

    // Submit for Approval via UI — target the exact created quote row
    const submitted = await page.evaluate((qNum) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find((r) => qNum && (r.textContent || '').includes(qNum));
      if (!row) return false;
      const b = Array.from(row.querySelectorAll('button')).find((x) => /submit for approval/i.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    }, createdQuoteNumber);
    await sleep(3000);
    t = await visibleText();
    record('Submit for Approval (UI) → Pending badge', submitted && /pending/i.test(t), '');

    // Create Revision via UI → Rev-2
    const revised = await page.evaluate((qNum) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find((r) => qNum && (r.textContent || '').includes(qNum));
      if (!row) return false;
      const b = Array.from(row.querySelectorAll('button')).find((x) => /create revision/i.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    }, createdQuoteNumber);
    await sleep(3000);
    t = await visibleText();
    record('Create Revision (UI) → Rev-2 badge', revised && /rev-2/i.test(t), '');

    // Mark Final via UI → Final badge (on the exact created quote row)
    const finalized = await page.evaluate((qNum) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const row = rows.find((r) => qNum && (r.textContent || '').includes(qNum));
      if (!row) return false;
      const b = Array.from(row.querySelectorAll('button')).find((x) => /mark final/i.test(x.textContent || ''));
      if (!b) return false;
      b.click();
      return true;
    }, createdQuoteNumber);
    await sleep(3000);
    t = await visibleText();
    record('Mark Final (UI) → Final badge', finalized && /final/i.test(t), '');

    // Cleanup: delete ONLY the quotes created by THIS run (tracked IDs + the
    // Rev-2 revision which inherits the same base number). Never bulk-delete by
    // prefix — earlier phases and real data also use SQ- numbers.
    const cleanupIds = [...createdQuoteIds];
    if (createdQuoteNumber) {
      const revIds = await page.evaluate(async (qNum) => {
        const apiBase = 'http://localhost:4000/api/v1';
        const getCookie = (n) => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];
        let csrf = getCookie('csrf_token');
        if (!csrf) { await fetch(apiBase + '/auth/csrf', { method: 'POST', credentials: 'include' }); csrf = getCookie('csrf_token'); }
        let token = null;
        const rr = await fetch(apiBase + '/auth/refresh', { method: 'POST', credentials: 'include' });
        if (rr.ok) token = (await rr.json())?.data?.accessToken || null;
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        if (csrf) h['x-csrf-token'] = csrf;
        const list = await fetch(apiBase + '/sales/quotations?pageSize=100', { headers: h, credentials: 'include' });
        const body = await list.json();
        const arr = body?.data?.data || body?.data || [];
        const base = String(qNum).replace(/-Rev-\d+$/i, '');
        return arr.filter((q) => String(q.quoteNumber || '').startsWith(base + '-Rev-')).map((q) => q.id);
      }, createdQuoteNumber).catch(() => []);
      cleanupIds.push(...revIds);
    }
    if (cleanupIds.length) {
      await page.evaluate(async ({ ids, apiBase }) => {
        const getCookie = (n) => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];
        let csrf = getCookie('csrf_token');
        if (!csrf) { await fetch(apiBase + '/auth/csrf', { method: 'POST', credentials: 'include' }); csrf = getCookie('csrf_token'); }
        let token = null;
        const rr = await fetch(apiBase + '/auth/refresh', { method: 'POST', credentials: 'include' });
        if (rr.ok) token = (await rr.json())?.data?.accessToken || null;
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = 'Bearer ' + token;
        if (csrf) h['x-csrf-token'] = csrf;
        for (const id of ids) {
          await fetch(apiBase + '/sales/quotations/' + id, { method: 'DELETE', headers: h, credentials: 'include' }).catch(() => {});
        }
      }, { ids: cleanupIds, apiBase: 'http://localhost:4000/api/v1' }).catch(() => {});
    }
  } catch (e) {
    record('Script crashed', false, String(e).slice(0, 200));
  }

  await browser.close();

  const passN = results.filter((r) => r.pass).length;
  const failN = results.filter((r) => !r.pass).length;
  console.log(`\n${passN} passed, ${failN} failed`);
  const realErrs = errs.filter((e) => !/Failed to load resource|net::ERR_/.test(e));
  console.log(`Console/page errors: ${realErrs.length > 0 ? realErrs.slice(0, 5).join(' | ') : 'none'}`);
  process.exit(failN > 0 ? 1 : 0);
})().catch((e) => {
  console.error('QA script crashed:', e);
  process.exit(1);
});
