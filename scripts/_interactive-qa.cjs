// Interactive functional QA — quick throwaway script (deleted after run).
const path = require('path');
const puppeteer = require(path.resolve('backend/node_modules/puppeteer-core'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrs.push(String(e).slice(0, 200)));

  const contentText = () => page.evaluate(() => {
    const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
    return c.innerText || '';
  });
  const clickTab = (label) => page.evaluate((txt) => {
    const nav = document.querySelector('nav[aria-label="Settings sections"]');
    const btn = Array.from(nav.querySelectorAll('button')).find((b) => {
      const lbl = b.querySelector('span.text-sm');
      return lbl && lbl.textContent.trim() === txt;
    });
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
  const clickBtn = (txt) => page.evaluate((t) => {
    const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
    const btn = Array.from(c.querySelectorAll('button')).find((b) => (b.textContent || '').trim().includes(t));
    if (btn) { btn.click(); return true; }
    return false;
  }, txt);

  // Login
  await page.goto('http://localhost:4000/auth/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.type('#email', 'admin@shranix.com');
  await page.type('#password', 'admin123');
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /sign\s*in/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(4000);
  // SPA to settings
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.querySelector('[class*="bg-gradient-to-br"]') && b.querySelector('svg') && b.offsetParent !== null);
    if (btn) btn.click();
  });
  await sleep(800);
  await page.evaluate(() => { const a = document.querySelector('a[href="/finance/settings"]'); if (a) a.click(); });
  await sleep(1800);
  await page.type('input[placeholder="Settings password"]', 'qa1234');
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /unlock settings/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(1800);
  console.log('Hub loaded:', await page.evaluate(() => !!document.querySelector('nav[aria-label="Settings sections"]')));

  const results = [];

  // ---- 1. Financial save round-trip ----
  await clickTab('Financial');
  await sleep(1200);
  const finBefore = await contentText();
  await clickBtn('Save Financial Settings');
  await sleep(2500);
  const finAfter = await contentText();
  const finSaved = /saved/i.test(finAfter) && !/save financial settings/i.test(finAfter.replace(/saved/i, ''));
  results.push({ test: 'Financial — Save button', pass: /saved/i.test(finAfter), detail: finAfter.match(/saved[^\n]*/i)?.[0] || '(no Saved text)', beforeLen: finBefore.length });

  // ---- 2. Backup Now (the button is labelled "Create Backup"; "Backup Now" is the card title) ----
  await clickTab('Backup & Restore');
  await sleep(1500);
  const bkpBefore = await contentText();
  await clickBtn('Create Backup');
  await sleep(4000);
  const bkpAfter = await contentText();
  const bkpNew = bkpAfter.replace(bkpBefore, '');
  results.push({
    test: 'Backup & Restore — Backup Now',
    pass: /success|backup created|✅|created/i.test(bkpNew),
    detail: (bkpNew.trim().slice(0, 160) || '(no visible feedback)'),
  });

  // ---- 3. Notifications — channel toggle ----
  await clickTab('Notifications');
  await sleep(1500);
  const toggleInfo = await page.evaluate(() => {
    const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
    const sw = c.querySelector('[role="switch"]');
    return sw ? { checked: sw.getAttribute('aria-checked'), label: (sw.closest('div.rounded-xl')?.querySelector('p')?.textContent || '').trim().slice(0, 30) } : null;
  });
  if (toggleInfo) {
    await page.evaluate(() => {
      const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
      const sw = c.querySelector('[role="switch"]');
      if (sw) sw.click();
    });
    await sleep(900);
    const afterToggle = await page.evaluate(() => {
      const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
      const sw = c.querySelector('[role="switch"]');
      return sw ? sw.getAttribute('aria-checked') : null;
    });
    results.push({
      test: 'Notifications — channel toggle',
      pass: afterToggle !== toggleInfo.checked,
      detail: `${toggleInfo.label || 'switch'} → ${toggleInfo.checked} → ${afterToggle}`,
    });
    // revert
    await page.evaluate(() => {
      const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
      const sw = c.querySelector('[role="switch"]');
      if (sw) sw.click();
    });
    await sleep(600);
  } else {
    results.push({ test: 'Notifications — channel toggle', pass: false, detail: '(no switch found)' });
  }

  // ---- 4. Audit Trail — data rows ----
  await clickTab('Audit Trail');
  await sleep(2500);
  const audit = await page.evaluate(() => {
    const c = document.querySelector('nav[aria-label="Settings sections"] + div') || document.body;
    const rows = c.querySelectorAll('table tbody tr, [class*="grid"] > [class*="rounded"]').length;
    const text = c.innerText || '';
    const hasEntries = /login|update|create|change|user/i.test(text);
    return { rows, hasEntries, snippet: text.replace(/\n+/g, ' | ').slice(0, 250) };
  });
  results.push({ test: 'Audit Trail — list loads', pass: audit.hasEntries, detail: `rows~${audit.rows} | ${audit.snippet.slice(0, 140)}` });

  console.log('\n===== INTERACTIVE QA RESULTS =====');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.test}`);
    console.log(`     ${r.detail}`);
  }
  console.log('Console errors during run:', consoleErrs.length ? consoleErrs.slice(0, 5).join(' | ') : 'none');
  await browser.close();
})().catch((e) => { console.error('ERR', e); process.exit(1); });
