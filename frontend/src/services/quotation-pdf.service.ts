import { buildUpiPayload } from '@/components/ui/UpiQrCode';
import { code39Svg } from '@/pages/sales/krushi-bill-template';
import {
  QUOTATION_PDF_CSS,
  renderQuotationPdfWithCopies,
  type QuotationPdfBankData,
  type QuotationPdfData,
  type QuotationPdfItemData,
} from '@/pages/sales/quotation-pdf-template';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob, generateInvoicePdf } from '@/services/invoice-pdf.service';

/**
 * Phase 7 — Quotation → Professional PDF
 *
 * Flow:
 *  1. Load the quotation (with line items), customer, active company (logo /
 *     GSTIN / signature branding), default bank account and the shop UPI ID.
 *  2. Generate a scannable UPI payment QR (amount-embedded) as a data URL.
 *  3. Render the professional A4 template (logo, GST, QR, signature, DRAFT
 *     watermark, terms, bank details, barcode) as HTML.
 *  4. Send the HTML to the existing backend Puppeteer engine (`/pdf/generate`)
 *     and download the resulting PDF buffer.
 */

// ── Helpers ──────────────────────────────────────────────
function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res as T[];
  }
  const r = res as { data?: T[] } | null;
  return Array.isArray(r?.data) ? (r.data as T[]) : [];
}

function pickRecord<T>(res: unknown, fallback: T): T {
  const r = res as { data?: T } | null;
  return (r?.data ?? (res as T)) || fallback;
}

/** UPI payment QR → data URL (client-side, same qrcode lib as the settings UI). */
async function buildUpiQrDataUrl(
  upiId: string,
  amount: number,
  name: string,
  note: string,
): Promise<string> {
  const payload = buildUpiPayload({ upiId, name, amount, note });
  const mod = await import('qrcode');
  const QRCode = (mod as any).default ?? mod;
  return QRCode.toDataURL(payload, {
    width: 240,
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

/** Full standalone HTML document for the backend PDF engine. */
function wrapDocument(inner: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  * { box-sizing: border-box; }
</style>
<style>${QUOTATION_PDF_CSS}</style>
</head>
<body>
${inner}
</body>
</html>`;
}

// ── Builders ─────────────────────────────────────────────
/** Phase 8 — duplicate-copy option for Print/PDF (OFFICE + CUSTOMER copies). */
export interface QuotationPdfRenderOptions {
  duplicate?: boolean;
}

/** Load every ingredient and return the rendered quotation data. */
export async function loadQuotationPdfData(
  quoteId: string,
): Promise<{ data: QuotationPdfData; quoteNumber: string }> {
  // 1. Quotation (with items)
  const q = await apiRequest<unknown>(`/sales/quotations/${quoteId}`);
  const quote = pickRecord<Record<string, any>>(q, {}) as Record<string, any>;

  // 2. Customer
  let customer: Record<string, any> = {};
  if (quote.customerId) {
    try {
      const c = await apiRequest<unknown>(`/customers/${quote.customerId}`);
      customer = pickRecord<Record<string, any>>(c, {}) as Record<string, any>;
    } catch {
      /* non-fatal: customer details stay empty */
    }
  }

  // 3. Company (active/first — logo, GSTIN, signature, footer)
  let company: Record<string, any> = {};
  try {
    const res = await apiRequest<unknown>('/companies');
    const rows = unwrapList<Record<string, any>>(res);
    company = rows.find((r) => r.isActive !== false) ?? rows[0] ?? {};
  } catch {
    /* non-fatal */
  }

  // 4. Bank account (default first) + UPI ID (settings, then bank fallback)
  let bank: Record<string, any> = {};
  try {
    const res = await apiRequest<unknown>('/bank-accounts');
    const rows = unwrapList<Record<string, any>>(res);
    bank = rows.find((r) => r.isDefault) ?? rows[0] ?? {};
  } catch {
    /* non-fatal */
  }

  let upiId = String((bank as any)?.upiId || '').trim();
  try {
    const upiRes = (await apiRequest<{ upiId?: string }>('/sales/settings/upi')) as
      { upiId?: string } | undefined;
    upiId = String(upiRes?.upiId || upiId || '').trim();
  } catch {
    /* non-fatal */
  }

  // 5. Items mapping
  const items: QuotationPdfItemData[] = (Array.isArray(quote.items) ? quote.items : []).map(
    (it: any) => ({
      description: it.description || it.itemName || '',
      hsn: it.hsnCode || '',
      qty: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      discountAmount: Number(it.discountAmount) || 0,
      discountPercent: Number(it.discountPercent) || 0,
      taxableValue: Number(it.taxableValue) || 0,
      gstRate: Number(it.gstRate) || 0,
      cgst: Number(it.cgst) || 0,
      sgst: Number(it.sgst) || 0,
      igst: Number(it.igst) || 0,
      cess: Number(it.cess) || 0,
      totalAmount: Number(it.totalAmount) || 0,
    }),
  );

  // 6. Totals (authoritative stored values)
  const taxable = Number(quote.subTotal) || 0;
  const gstTotal = Number(quote.taxAmount) || 0;
  const freight = Number(quote.freight) || 0;
  const installationCharges = Number(quote.installationCharges) || 0;

  const companyName = String(company.name || 'Company');
  const companyAddress = [company.address, company.city, company.state, company.pincode]
    .filter((p): p is string => Boolean(p))
    .join(', ');

  const bankAccount: QuotationPdfBankData | undefined =
    bank && Object.keys(bank).length > 0
      ? {
          bankName: String(bank.bankName || ''),
          accountHolderName: String(bank.accountHolderName || ''),
          accountNumber: String(bank.accountNumber || ''),
          ifsc: String(bank.ifsc || ''),
          upiId: String(bank.upiId || ''),
        }
      : undefined;

  // 7. QR payment (only when a UPI ID exists)
  const grandTotal = Number(quote.grandTotal) || 0;
  const upiQrDataUrl =
    upiId && grandTotal > 0
      ? await buildUpiQrDataUrl(
          upiId,
          grandTotal,
          companyName,
          `Quotation ${quote.quoteNumber || ''}`,
        ).catch(() => '')
      : '';

  // 8. Barcode — Code-39 of the quote number
  const barcodeSvg = quote.quoteNumber ? code39Svg(String(quote.quoteNumber)) : '';

  const pdfData: QuotationPdfData = {
    quoteNumber: String(quote.quoteNumber || ''),
    quoteDate: String(quote.quoteDate || ''),
    validTill: String(quote.validTill || ''),
    revision: Number(quote.revision) || 1,
    status: String(quote.status || 'draft'),
    companyName,
    companyLogo: String(company.logo || ''),
    companyAddress,
    companyPhone: String(company.phone || ''),
    companyEmail: String(company.email || ''),
    companyGstin: String(company.gstin || ''),
    signatureImage: String(company.digitalSignature || company.invoiceSignature || ''),
    invoiceFooter: String(company.invoiceFooter || ''),
    customerName: String(customer.name || customer.code || ''),
    customerGstin: String(customer.gstin || ''),
    customerMobile: String(customer.mobile || ''),
    customerEmail: String(customer.email || ''),
    billingAddress: String(quote.billingAddress || customer.address || ''),
    shippingAddress: String(quote.shippingAddress || ''),
    contactPerson: String(quote.contactPerson || customer.contactPerson || ''),
    paymentTerms: String(quote.paymentTerms || ''),
    deliveryTime: String(quote.deliveryTime || ''),
    warranty: String(quote.warranty || ''),
    customerNotes: String(quote.customerNotes || ''),
    terms: String(quote.terms || ''),
    items,
    basicTotal: Number(quote.basicTotal) || 0,
    discountAmount: Number(quote.discountAmount) || 0,
    taxable,
    cgst: Number(quote.cgstTotal) || 0,
    sgst: Number(quote.sgstTotal) || 0,
    igst: Number(quote.igstTotal) || 0,
    cess: Number(quote.cessTotal) || 0,
    gstTotal,
    freight,
    installationCharges,
    roundOff: Number(quote.roundOff) || 0,
    grandTotal,
    bankAccount,
    upiId,
    upiQrDataUrl,
    barcodeSvg,
  };

  return { data: pdfData, quoteNumber: String(quote.quoteNumber || '') };
}

/** Standalone HTML document (duplicate copies optional) for the PDF engine. */
export async function buildQuotationPdfHtml(
  quoteId: string,
  opts?: QuotationPdfRenderOptions,
): Promise<string> {
  const { data } = await loadQuotationPdfData(quoteId);
  return wrapDocument(renderQuotationPdfWithCopies(data, opts?.duplicate === true));
}

/** Generate the quotation PDF buffer via the backend engine (no download). */
export async function generateQuotationPdfBlob(
  quoteId: string,
  opts?: QuotationPdfRenderOptions,
): Promise<Blob> {
  const html = await buildQuotationPdfHtml(quoteId, opts);
  return generateInvoicePdf({ html });
}

/** Generate the quotation PDF via the backend engine and download it. */
export async function downloadQuotationPdf(
  quoteId: string,
  opts?: QuotationPdfRenderOptions,
): Promise<void> {
  const { data, quoteNumber } = await loadQuotationPdfData(quoteId);
  const html = wrapDocument(renderQuotationPdfWithCopies(data, opts?.duplicate === true));
  const blob = await generateInvoicePdf({ html });
  const safeName = String(quoteNumber || 'quotation').replace(/[^A-Za-z0-9._-]/g, '_');
  downloadPdfBlob(blob, `${safeName || 'quotation'}.pdf`);
}
