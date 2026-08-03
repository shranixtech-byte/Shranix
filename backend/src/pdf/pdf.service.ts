import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

// ── Noto Sans Devanagari — base64 @font-face (server-side embed, system fonts pe depend nahi)
// Container (Docker/Lambda) mein Indic fonts nahi hote — isliye woff2 seedha HTML mein embed karte hain.
// Path resolution: nest build assets se dist/pdf/assets/ mein copy hota hai; dev/watcher mode
// mein src se bhi try karo (dono paths ka fallback).
function resolveFontPath(): string {
  const candidates = [
    join(__dirname, 'assets', 'NotoSansDevanagari.woff2'), // dist/pdf/assets
    join(__dirname, '..', '..', 'src', 'pdf', 'assets', 'NotoSansDevanagari.woff2'), // dev watch
    join(process.cwd(), 'src', 'pdf', 'assets', 'NotoSansDevanagari.woff2'),
    join(process.cwd(), 'dist', 'pdf', 'assets', 'NotoSansDevanagari.woff2'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }
  return candidates[0];
}

const FONT_PATH = resolveFontPath();

const FONT_FACE_TEMPLATE = `
<style>
@font-face {
  font-family: 'Noto Sans Devanagari';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url(data:font/woff2;base64,__FONT_B64__) format('woff2');
}
/* Devanagari chars Noto se, baaki (Latin/digits) Arial se — container mein Nirmala/Mangal nahi hote */
#invoice-preview, #invoice-preview * {
  font-family: 'Noto Sans Devanagari', Arial, Helvetica, sans-serif !important;
}
</style>
`;

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  // ── Chromium executable resolution ─────────────────────
  // 1) CHROME_PATH env (explicit override)
  // 2) Common OS paths (Windows/macOS/Linux system Chrome) — local dev primary
  // 3) @sparticuz/chromium (production Docker/Lambda Linux — binary wahan extract hota hai)
  //    NOTE: sparticuz ka executablePath() Windows par `Temp\chromium` return karta hai
  //    jo exist nahi karta — isliye OS paths ko pehle try karna zaroori hai.
  private async resolveExecutablePath(): Promise<string> {
    if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/headless_shell',
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        return p;
      }
    }
    // Production container (Linux Docker) — system Chrome nahi milega, sparticuz try karo
    try {
      const mod = (await import('@sparticuz/chromium')) as any;
      const chromium = mod?.default ?? mod;
      const exe = await chromium.executablePath();
      if (exe && existsSync(exe)) {
        return exe;
      }
    } catch {
      // @sparticuz/chromium unavailable/unsupported → fall through
    }
    throw new Error(
      'Chromium executable not found. Set CHROME_PATH env (local dev) or install @sparticuz/chromium (production).',
    );
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }
    if (this.launchPromise) {
      return this.launchPromise;
    }
    this.launchPromise = (async () => {
      const executablePath = await this.resolveExecutablePath();
      let args: string[] = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
      try {
        const mod = (await import('@sparticuz/chromium')) as any;
        const chromium = mod?.default ?? mod;
        if (chromium.args) {
          args = chromium.args;
        }
      } catch {
        // local Chrome — defaults fine
      }
      this.logger.log(`Launching Chromium: ${executablePath}`);
      const browser = await puppeteer.launch({
        executablePath,
        args,
        defaultViewport: { width: 794, height: 1123 },
        headless: true,
      });
      this.browser = browser;
      return browser;
    })();
    return this.launchPromise;
  }

  // ── HTML → PDF buffer ─────────────────────────────────
  async generatePdf(
    html: string,
    options: { landscape?: boolean; format?: string } = {},
  ): Promise<Buffer> {
    const fontB64 = readFileSync(FONT_PATH).toString('base64');
    const fontCss = FONT_FACE_TEMPLATE.replace('__FONT_B64__', fontB64);

    // @page A4 margin:0 — invoice apna padding khud rakhta hai (browser print CSS jaisa hi)
    const doc = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
${fontCss}
<style>
  @page { size: ${options.format ?? 'A4'} ${options.landscape ? 'landscape' : 'portrait'}; margin: 0; }
  html, body { margin: 0; padding: 0; }
</style>
</head>
<body>${html}</body>
</html>`;

    const browser = await this.getBrowser();
    const page: Page = await browser.newPage();
    try {
      // SSRF/abuse hardening: invoice HTML mein injected <img src="http://..."> waghera
      // headless Chrome se external URL fetch na kare (font base64 embedded hai, isliye
      // sirf data: URIs chahiye). Deterministic + fast render bhi milta hai.
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().startsWith('data:') || req.url().startsWith('about:blank')) {
          void req.continue();
        } else {
          void req.abort();
        }
      });
      await page.setContent(doc, { waitUntil: 'networkidle0' as any, timeout: 30_000 });
      // Fonts load hone ka wait — Devanagari shaping ke liye zaroori
      await page.evaluateHandle('document.fonts.ready');
      const buffer = await page.pdf({
        format: (options.format as any) ?? 'A4',
        landscape: !!options.landscape,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(buffer);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
      this.launchPromise = null;
    }
  }
}
