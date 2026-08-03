import { apiUrl } from '@/services/api-client';
import { authService } from '@/services/auth.service';

/**
 * Invoice → PDF (server-side Puppeteer)
 *
 * Flow:
 *  1. `captureInvoiceHtml()` — wahi HTML/CSS capture karta hai jo print preview
 *     (#invoice-preview) mein rendered hota hai. Koi layout redesign NAHI —
 *     exact wahi DOM string backend ko bheja jata hai.
 *  2. Backend `/api/v1/pdf/generate` Puppeteer se A4 PDF banata hai
 *     (Noto Sans Devanagari embedded — Marathi text sahi render hota hai).
 *  3. Resulting PDF buffer download/attach ke liye milta hai.
 */

/** Current screen se invoice preview ka standalone HTML capture karo. */
export function captureInvoiceHtml(): string {
  const node = document.getElementById('invoice-preview');
  if (!node) {
    throw new Error('Invoice preview render nahi hua — pehle preview kholo');
  }
  const clone = node.cloneNode(true) as HTMLElement;
  // Screen zoom (transform scale 70%) ko hatao — PDF 1:1 render chahiye.
  // Inner auto-fit transform (fitScale) apne aap inline style mein aata hai,
  // isliye woh preserve rehta hai aur page exactly bhar jata hai.
  clone.style.transform = 'none';
  clone.style.width = 'auto';
  const css = `
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    * { box-sizing: border-box; }
  `;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${css}</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;
}

/** Backend se real PDF buffer generate karo (Puppeteer + embedded Devanagari font).
 *  NOTE: raw fetch use karte hain kyunki response PDF buffer hai (JSON nahi) —
 *  apiRequest JSON unwrap karta hai isliye yahan direct fetch + credentials. */
export async function generateInvoicePdf(opts?: {
  html?: string;
  landscape?: boolean;
  signal?: AbortSignal;
}): Promise<Blob> {
  const html = opts?.html ?? captureInvoiceHtml();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Endpoint global JwtAuthGuard se protected hai — bearer token bhejna zaroori
  const token = authService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const csrf = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)?.[1];
  if (csrf) {
    headers['x-csrf-token'] = csrf;
  }
  const res = await fetch(apiUrl('/pdf/generate'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ html, landscape: opts?.landscape }),
    signal: opts?.signal,
  });
  if (!res.ok) {
    let msg = `PDF generation failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) {
        msg = body.message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }
  return res.blob();
}

/** Blob ko browser download kar do. */
export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Ek call mein: capture → backend PDF → download. */
export async function downloadInvoicePdf(fileName: string): Promise<void> {
  const blob = await generateInvoicePdf();
  downloadPdfBlob(blob, fileName);
}
