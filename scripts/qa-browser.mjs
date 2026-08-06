#!/usr/bin/env node
/**
 * qa-browser.mjs — Real-browser QA of the SHRANIX Settings Hub
 *
 * NOTE: ProtectedRoute deliberately does NOT auto-restore sessions on a full
 * page load (security by design). Therefore all in-app navigation must be SPA
 * (React Router clicks) — never page.goto on a protected route.
 *
 * Flow:
 *   1. Login via the real UI (admin@shranix.com / admin123)
 *   2. Deterministically set the settings password to "qa1234" via API (in-page
 *      fetch; access token is in-memory only, so acquire one via /auth/refresh)
 *   3. SPA-navigate to /finance/settings via header user menu
 *   4. Test the password gate: wrong password → error; correct → unlocks
 *   5. Test the Lock button (reload → back to login by design → login → unlock)
 *   6. Sweep all 19 tabs: click, wait for load, capture headings/fields/errors, screenshot
 *   7. Aggregate console errors + failed network requests per section
 *
 * Usage:  node scripts/qa-browser.mjs
 * Screenshots: scripts/qa-screenshots/<tab>.png
 * Report: scripts/qa-browser-report.json
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PUPPETEER_PATH = path.resolve(__dirname, '..', 'backend', 'node_modules', 'puppeteer-core');
const puppeteer = require(PUPPETEER_PATH);

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const APP = 'http://localhost:4000';
const API = 'http://localhost:4000/api/v1';
const EMAIL = 'admin@shranix.com';
const PASSWORD = 'admin123';
const SETTINGS_PW = 'qa1234';
const SHOT_DIR = path.resolve(__dirname, 'qa-screenshots');
const REPORT_PATH = path.resolve(__dirname, 'qa-browser-report.json');

const TABS = [
  'Company & License',
  'Financial Year',
  'License Management',
  'API Settings',
  'Financial',
  'Banking',
  'Invoice',
  'Stock',
  'GST',
  'Dashboard',
  'Backup & Restore',
  'Data Management',
  'Audit Trail',
  'Notifications',
  'Printer',
  'User Roles',
  'Users',
  'Module Settings',
  'Security',
];

// Content area: the sibling div right after the settings nav rail.
// (A bare `.min-w-0.flex-1` selector also matches the label span inside
// each nav button — the first match would be empty/wrong.)
const CONTENT_SEL = 'nav[aria-label="Settings sections"] + div';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, timeoutMs = 20000, label = 'condition') {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e;
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label} (last: ${String(last).slice(0, 120)})`);
}

async function pageText(page) {
  return page.evaluate(() => document.body ? document.body.innerText : '');
}

async function hasText(page, txt) {
  const t = await pageText(page);
  return t.includes(txt);
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(
    (sel, txt) => {
      const els = Array.from(document.querySelectorAll(sel));
      const el = els.find((e) => (e.textContent || '').trim().includes(txt));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
  if (!clicked) throw new Error(`Could not find "${text}" in ${selector}`);
  return true;
}

async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 8000 });
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value,
  );
}

/** Authenticated in-page API call (token from /auth/refresh, CSRF from cookie). */
async function apiCall(page, method, apiPath, body) {
  return page.evaluate(
    async ({ method, apiPath, body, apiBase }) => {
      const getCookie = (n) => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];
      let csrf = getCookie('csrf_token');
      if (!csrf) {
        await fetch(apiBase + '/auth/csrf', { method: 'POST', credentials: 'include' });
        csrf = getCookie('csrf_token');
      }
      let token = null;
      try {
        const rr = await fetch(apiBase + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (rr.ok) {
          const t = await rr.json();
          token = t?.data?.accessToken || null;
        }
      } catch { /* token stays null */ }
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (csrf) headers['x-csrf-token'] = csrf;
      const res = await fetch(apiBase + apiPath, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 300) };
    },
    { method, apiPath, body, apiBase: API },
  );
}

/** Open header user menu and click the Settings link (SPA navigation). */
async function spaNavigateToSettings(page) {
  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.querySelector('[class*="bg-gradient-to-br"]') && b.querySelector('svg') && b.offsetParent !== null,
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!opened) throw new Error('Could not open user menu');
  await waitFor(page, () => page.evaluate(() => !!document.querySelector('a[href="/finance/settings"]')), 5000, 'settings link');
  const clicked = await page.evaluate(() => {
    const a = document.querySelector('a[href="/finance/settings"]');
    if (!a) return false;
    a.click();
    return true;
  });
  if (!clicked) throw new Error('Settings link not found');
  return true;
}

async function loginViaUi(page) {
  await page.goto(`${APP}/auth/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await waitFor(page, () => page.evaluate(() => !!document.querySelector('#email')), 15000, 'login form');
  await fillInput(page, '#email', EMAIL);
  await fillInput(page, '#password', PASSWORD);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /sign\s*in/i.test(b.textContent || ''));
    if (btn) btn.click();
    return !!btn;
  });
  await waitFor(
    page,
    () => page.evaluate(() => localStorage.getItem('shranix_session') !== null && !location.pathname.includes('/auth/login')),
    25000,
    'post-login redirect',
  );
}

/** Enter the settings password on the gate and expect Settings Hub. */
async function unlockSettings(page, password) {
  await fillInput(page, 'input[placeholder="Settings password"]', password);
  await clickByText(page, 'button', 'Unlock Settings');
  await waitFor(page, () => hasText(page, 'Settings Hub'), 15000, 'settings hub after unlock');
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const report = { ts: new Date().toISOString(), login: null, gate: null, sections: [], consoleIssues: [] };

  const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
  if (!chromePath) throw new Error('Chrome not found');
  console.log('Chrome:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // ---- Console / network error capture ----
    let sectionErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        const text = msg.text();
        if (/Download the React DevTools|Sourcemap for|Autofill|favicon/i.test(text)) return;
        sectionErrors.push(`console.${msg.type()}: ${text.slice(0, 220)}`);
      }
    });
    page.on('pageerror', (err) => sectionErrors.push(`pageerror: ${String(err).slice(0, 220)}`));
    page.on('response', (res) => {
      if (res.status() >= 400) {
        sectionErrors.push(`HTTP ${res.status()} ${res.url().replace(API, '').slice(0, 120)}`);
      }
    });
    page.on('requestfailed', (req) => {
      sectionErrors.push(`requestfailed: ${req.url().replace(API, '').slice(0, 120)}`);
    });
    const snapshotSectionErrors = () => {
      const errs = [...sectionErrors];
      sectionErrors = [];
      return errs;
    };

    // ============ 1. LOGIN ============
    console.log('\n=== 1. LOGIN ===');
    await loginViaUi(page);
    report.login = { success: true, url: page.url() };
    console.log('  ✅ Login OK →', page.url());

    // ============ 2. DETERMINISTIC SETTINGS PASSWORD ============
    console.log('\n=== 2. SETTINGS PASSWORD (deterministic) ===');
    const setRes = await apiCall(page, 'POST', '/finance/settings/security/set', { password: SETTINGS_PW });
    console.log('  set status:', setRes.status, setRes.body.slice(0, 120));
    report.gate = { deterministicSet: setRes };

    // ============ 3. SPA-NAVIGATE TO SETTINGS + GATE FLOW ============
    console.log('\n=== 3. PASSWORD GATE FLOW ===');
    sectionErrors = [];
    await spaNavigateToSettings(page);
    await waitFor(
      page,
      () => hasText(page, 'Settings is Protected') || hasText(page, 'Set a Password for Settings'),
      15000,
      'gate screen',
    );
    const gateShown = await page.evaluate(() => document.body.innerText.includes('Settings is Protected') ? 'enter' : 'set');
    console.log('  Gate screen:', gateShown === 'enter' ? 'EnterPassword' : 'SetPassword');

    if (gateShown === 'set') {
      // First-time flow — set via UI (covers set→lock→enter cycle)
      await fillInput(page, 'input[placeholder="New password (min 4 characters)"]', SETTINGS_PW);
      await fillInput(page, 'input[placeholder="Confirm password"]', SETTINGS_PW);
      await clickByText(page, 'button', 'Set Password');
      await waitFor(page, () => hasText(page, 'Settings Hub'), 15000, 'settings hub after set-password');
      console.log('  ✅ Set-password UI flow worked');
      report.gate.uiSetFlow = true;
      report.gate.wrongPasswordRejected = 'n/a';
      await page.screenshot({ path: path.join(SHOT_DIR, 'gate-set-password.png'), fullPage: true });
    } else {
      // 3a. Wrong password → error
      await fillInput(page, 'input[placeholder="Settings password"]', 'wrongpass123');
      await clickByText(page, 'button', 'Unlock Settings');
      await waitFor(page, () => hasText(page, 'Incorrect password'), 8000, 'wrong-password error');
      const wrongPwErrors = snapshotSectionErrors();
      console.log('  ✅ Wrong password rejected:', wrongPwErrors.length === 0 ? '(no console errors)' : wrongPwErrors.join(' | '));
      report.gate.wrongPasswordRejected = true;

      // 3b. Correct password → unlock
      await unlockSettings(page, SETTINGS_PW);
      console.log('  ✅ Correct password unlocked Settings Hub');
      report.gate.unlockOk = true;
    }

    // ============ 4. LOCK BUTTON ============
    // Lock clears the unlock key + reloads. Per app design, a full reload drops
    // the in-memory session → back to the login page. Then re-login + unlock.
    console.log('\n=== 4. LOCK BUTTON (reload → login by design) ===');
    await page.click('button[aria-label="Lock Settings"]');
    const lockOutcome = await waitFor(
      page,
      () => page.evaluate(() => {
        const t = document.body.innerText;
        if (location.pathname.includes('/auth/login')) return 'login';
        if (t.includes('Settings is Protected')) return 'gate';
        if (t.includes('Settings Hub')) return 'hub';
        return null;
      }),
      12000,
      'lock outcome',
    );
    console.log('  Lock →', lockOutcome === 'login' ? 'redirected to login page (expected by design)' : lockOutcome);
    report.gate.lockBehavior = lockOutcome;

    if (lockOutcome === 'login') {
      await loginViaUi(page);
      await spaNavigateToSettings(page);
      await waitFor(page, () => hasText(page, 'Settings is Protected'), 15000, 'gate after relogin');
      await unlockSettings(page, SETTINGS_PW);
      console.log('  ✅ Re-login → settings → unlock works');
      report.gate.reloginUnlockOk = true;
    }

    // ============ 5. TAB SWEEP ============
    console.log('\n=== 5. SECTION SWEEP ===');
    for (const label of TABS) {
      const tabId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      console.log(`\n  --- ${label} ---`);
      sectionErrors = [];
      const t0 = Date.now();
      try {
        const clicked = await page.evaluate((txt) => {
          const nav = document.querySelector('nav[aria-label="Settings sections"]');
          if (!nav) return false;
          // Match the exact label span (text-sm) — matching whole textContent would
          // also hit hint text (e.g. "GSTIN" contains "GST").
          const btn = Array.from(nav.querySelectorAll('button')).find((b) => {
            const lbl = b.querySelector('span.text-sm');
            return lbl && lbl.textContent.trim() === txt;
          });
          if (!btn) return false;
          btn.click();
          return true;
        }, label);
        if (!clicked) throw new Error(`Tab not found in nav: ${label}`);

        // Wait for loading to settle (spinner gone), up to 8s
        await waitFor(
          page,
          () => page.evaluate((sel) => {
            const content = document.querySelector(sel) || document.body;
            return !content.querySelector('.animate-spin');
          }, CONTENT_SEL),
          8000,
          `spinner settle (${label})`,
        ).catch(() => { /* still loading — record below */ });

        const snapshot = await page.evaluate((sel) => {
          const content = document.querySelector(sel) || document.body;
          const text = content.innerText || '';
          const heads = Array.from(content.querySelectorAll('h2,h3,h4')).map((h) => h.textContent.trim()).filter(Boolean).slice(0, 6);
          const inputs = content.querySelectorAll('input,select,textarea').length;
          const buttons = Array.from(content.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 12);
          const spinner = !!content.querySelector('.animate-spin');
          const errorText = /error|failed|something went wrong|unable to load|not found|permission denied/i.test(text)
            ? (text.match(/(?:error|failed|something went wrong|unable to load|not found|permission denied)[^\n]{0,120}/gi) || []).slice(0, 3)
            : [];
          return { heads, inputs, buttons, spinner, errorText, textSample: text.slice(0, 500) };
        }, CONTENT_SEL);

        await page.screenshot({ path: path.join(SHOT_DIR, `${tabId}.png`), fullPage: true });

        const errs = snapshotSectionErrors();
        const ms = Date.now() - t0;
        const ok = !snapshot.spinner && snapshot.heads.length > 0 && errs.length === 0;
        report.sections.push({
          tab: label, ok, ms,
          headings: snapshot.heads, inputs: snapshot.inputs, buttons: snapshot.buttons.slice(0, 6),
          errorText: snapshot.errorText, consoleIssues: errs.slice(0, 6),
          screenshot: `${tabId}.png`,
        });
        console.log(
          `  ${ok ? '✅' : '⚠️'} headings=${snapshot.heads.join(' | ').slice(0, 100)} inputs=${snapshot.inputs} btns=${snapshot.buttons.length} issues=${errs.length} (${ms}ms)`,
        );
        if (snapshot.errorText.length) console.log('     errorText:', snapshot.errorText.join(' ⚡ '));
        if (errs.length) console.log('     issues:', errs.slice(0, 4).join(' | '));
        if (snapshot.spinner) console.log('     ⚠️ still loading spinner after settle-wait');
      } catch (err) {
        const errs = snapshotSectionErrors();
        report.sections.push({ tab: label, ok: false, error: String(err).slice(0, 200), consoleIssues: errs.slice(0, 6) });
        console.log('  ❌', String(err).slice(0, 160));
      }
    }

    // ============ 6. SUMMARY ============
    const failed = report.sections.filter((s) => !s.ok);
    report.summary = { total: report.sections.length, passed: report.sections.length - failed.length, failed: failed.length };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log('\n══════════════════════════════════════');
    console.log(`RESULT: ${report.summary.passed}/${report.summary.total} sections OK`);
    if (failed.length) {
      console.log('FAILED:', failed.map((f) => f.tab).join(', '));
      for (const f of failed) {
        console.log('  -', f.tab, '→', f.error || f.errorText?.join(';') || f.consoleIssues?.join(' | '));
      }
    }
    console.log('Report:', REPORT_PATH);
    console.log('Screenshots:', SHOT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('QA script failed:', err);
  process.exit(1);
});
