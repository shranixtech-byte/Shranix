// ═════════════════════════════════════════════════════════
// SAVED INVOICE PDF SERVICE
// Saved invoice (list page se) → KrushiBill template → PDF.
// SimpleInvoicePage ka live preview flow (#invoice-preview capture)
// sirf tab chalta hai jab form khula hai; yahan backend se saved
// invoice + items + customer + company + UPI load karke usi
// shopkeeper-approved KrushiBill template ko render karte hain.
// PDF backend Puppeteer engine (`/pdf/generate`) se banta hai —
// Devanagari/Marathi टीप sahi render hoti hai.
// ═════════════════════════════════════════════════════════

import { buildUpiPayload } from '@/components/ui/UpiQrCode';
import {
  KRUSHI_BILL_CSS,
  code39Svg,
  renderKrushiBill,
  type KrushiBillData,
  type KrushiBillItemData,
} from '@/pages/sales/krushi-bill-template';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob, generateInvoicePdf } from '@/services/invoice-pdf.service';

// ── Helpers ──────────────────────────────────────────────
function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res as T[];
  }
  const r = res as { data?: T[] } | null;
  return Array.isArray(r?.data) ? (r.data as T[]) : [];
}

function pickRecord<T>(res: unknown, fallback: T): T {
  if (res === null || res === undefined) {
    return fallback;
  }
  const r = res as { data?: T };
  return (r?.data ?? res) as T;
}

/** UPI payment QR → data URL (client-side, wahi qrcode lib jo settings UI use karti hai). */
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
<style>${KRUSHI_BILL_CSS}</style>
</head>
<body>
<div id="invoice-preview">${inner}</div>
</body>
</html>`;
}

/**
 * Customer details ledgerMaster ke `notes` JSON payload mein ho sakte hain
 * (customers.service.ts: mobile/gstin/code notes JSON mein store hote hain).
 * Email/WhatsApp defaults ke liye wahan se bhi parse karo.
 */
function parseCustomerNotes(customer: Record<string, any>): {
  mobile?: string;
  email?: string;
  gstin?: string;
} {
  try {
    const notes = typeof customer.notes === 'string' ? JSON.parse(customer.notes) : customer.notes;
    if (notes && typeof notes === 'object') {
      return {
        mobile: String(notes.mobile || ''),
        email: String(notes.email || ''),
        gstin: String(notes.gstin || ''),
      };
    }
  } catch {
    /* notes JSON nahi hai → plain text, skip */
  }
  return {};
}

// ── Types ────────────────────────────────────────────────
export interface SavedInvoicePdfData {
  data: KrushiBillData;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  companyName: string;
  grandTotal: number;
}

// ── Loader ───────────────────────────────────────────────
/**
 * Saved invoice ke saare ingredients load karo:
 * invoice (+ items), customer, active company (logo/license/GSTIN), default
 * bank account + shop UPI ID, aur Invoice Settings toggles (HSN/Batch/GST/QR/
 * copies/barcode). Return KrushiBillData + share-modal ke defaults.
 */
export async function loadInvoicePdfData(invoiceId: string): Promise<SavedInvoicePdfData> {
  // 1. Invoice (with line items — backend findById ab items attach karta hai)
  const inv = await apiRequest<unknown>(`/sales/invoices/${invoiceId}`);
  const invoice = pickRecord<Record<string, any>>(inv, {}) as Record<string, any>;

  // 2. Customer (email/mobile for Email/WhatsApp defaults)
  let customer: Record<string, any> = {};
  if (invoice.customerId) {
    try {
      const c = await apiRequest<unknown>(`/customers/${invoice.customerId}`);
      customer = pickRecord<Record<string, any>>(c, {}) as Record<string, any>;
    } catch {
      /* non-fatal: customer details stay empty */
    }
  }
  const customerNotes = parseCustomerNotes(customer);

  // 3. Company (active/first — logo, licenses, GSTIN)
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

  // 4a. Units (UOM) — invoice items par unitId (UUID) store hota hai; bill ke
  // "Pkg/Hsn" column mein readable unit name dikhane ke liye id→name map banao.
  const unitNameById = new Map<string, string>();
  try {
    const res = await apiRequest<unknown>('/units');
    const rows = unwrapList<Record<string, any>>(res);
    for (const u of rows) {
      if (u?.id) {
        unitNameById.set(String(u.id), String(u.name || u.code || ''));
      }
    }
  } catch {
    /* non-fatal: unitId fallback stays as-is */
  }

  // 4b. Linked Delivery Challan — bill ke "DC No./DC Date" box ke liye.
  // Conversion flow invoice par dcNo/dcDate store nahi karta — sirf challanId
  // link hai; isliye challan fetch karke uske number/date use karte hain.
  let dcNo = '';
  let dcDate = '';
  if (invoice.challanId) {
    try {
      const dc = await apiRequest<unknown>(`/sales/delivery-challans/${invoice.challanId}`);
      const challan = pickRecord<Record<string, any>>(dc, {}) as Record<string, any>;
      dcNo = String(challan.challanNumber || '');
      dcDate = String(challan.dispatchDate || '');
    } catch {
      /* non-fatal: DC box stays empty */
    }
  }

  // 5. Invoice Settings toggles (Settings Hub → Invoice)
  let invSettings: Record<string, any> = {};
  try {
    const res = await apiRequest<unknown>('/sales/settings');
    invSettings = (
      Array.isArray(res) ? res[0] : ((res as { data?: Record<string, any> })?.data ?? res)
    ) as Record<string, any>;
  } catch {
    /* non-fatal — undefined toggles = template defaults (sab ON) */
  }

  // 6. Items → KrushiBill line items
  const items: KrushiBillItemData[] = (Array.isArray(invoice.items) ? invoice.items : []).map(
    (it: any) => ({
      description: it.description || it.itemName || '',
      mfgCo: '',
      batchNo: it.batchNo || '',
      expiryDate: it.expiryDate || '',
      pkg: it.unitId || '',
      hsn: it.hsnCode || '',
      qty: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      amount: Number(it.taxableValue) || 0,
      gstPercent: Number(it.gstRate) || 0,
      cgst: Number(it.cgst) || 0,
      sgst: Number(it.sgst) || 0,
    }),
  );
  // UOM name resolve (UUID unitId → "BAG"/"KG") — pkg column ke liye
  for (const item of items) {
    if (item.pkg && unitNameById.has(item.pkg)) {
      item.pkg = unitNameById.get(item.pkg) || item.pkg;
    }
  }

  const companyName = String(company.name || 'KRUSHI SAGAR KENDRA');
  const companyAddress = [company.address, company.city, company.state, company.pincode]
    .filter((p): p is string => Boolean(p))
    .join(', ');

  const grandTotal = Number(invoice.grandTotal) || 0;
  const invoiceNumber = String(invoice.invoiceNumber || '');

  // 7. UPI Scan & Pay QR (amount-embedded) — sirf jab UPI ID ho
  const upiQrDataUrl =
    upiId && grandTotal > 0
      ? await buildUpiQrDataUrl(upiId, grandTotal, companyName, invoiceNumber).catch(() => '')
      : '';

  // 8. Barcode (Invoice Settings toggle — default OFF, purane behavior jaisa)
  const showBarcode = invSettings.showBarcode === true;
  const barcodeSvg = showBarcode && invoiceNumber ? code39Svg(invoiceNumber) : '';

  const showGst = invSettings.showGst !== false;
  const showDiscount = invSettings.showDiscount !== false;
  const showQr = invSettings.showQr !== false;
  const duplicateCopy = invSettings.duplicateCopy !== false;
  const transportCopy = invSettings.transportCopy === true;

  const data: KrushiBillData = {
    invoiceNo: invoiceNumber,
    invoiceDate: String(invoice.invoiceDate || ''),
    dcNo,
    dcDate,
    shopName: companyName,
    shopAddress: companyAddress,
    shopMobile: company.phone ? `Mobile : ${company.phone}` : '',
    shopGst: String(company.gstin || ''),
    pesticidesLicense: String(company.pesticidesLicense || ''),
    fertilizerLicense: String(company.fertilizerLicense || ''),
    seedsLicense: String(company.seedsLicense || ''),
    cottonLicense: String(company.cottonLicense || ''),
    retailLicense: String(company.retailLicense || ''),
    customerName: String(customer.name || customer.code || ''),
    customerAddress: String(invoice.billingAddress || customer.address || ''),
    customerGst: String(invoice.customerGstin || customerNotes.gstin || customer.gstin || ''),
    customerMobile: String(invoice.customerMobile || customerNotes.mobile || customer.mobile || ''),
    state: String(invoice.placeOfSupply || customer.state || 'Maharashtra'),
    placeOfSupply: String(invoice.placeOfSupply || customer.state || 'Maharashtra'),
    items,
    totalQty: items.reduce((s, i) => s + i.qty, 0),
    taxableAmount: Number(invoice.subTotal) || 0,
    totalCgst: Number(invoice.cgstTotal) || 0,
    totalSgst: Number(invoice.sgstTotal) || 0,
    grandTotal,
    discount: Number(invoice.discountAmount) || 0,
    roundOff: Number(invoice.roundOff) || 0,
    netAmount: grandTotal,
    billAmount: grandTotal,
    showGst,
    showSignature: true,
    showHsn: invSettings.showHsn !== false,
    showBatch: invSettings.showBatch !== false,
    showExpiry: invSettings.showExpiry !== false,
    showDiscount,
    showQr,
    duplicateCopy,
    transportCopy,
    showBarcode,
    barcodeSvg,
    upiId: showQr ? upiId : '',
    upiQrPayload: showQr ? upiQrDataUrl : '',
  };

  return {
    data,
    invoiceNumber,
    customerName: String(customer.name || customer.code || ''),
    customerEmail: String(customerNotes.email || customer.email || ''),
    customerMobile: String(invoice.customerMobile || customerNotes.mobile || customer.mobile || ''),
    companyName,
    grandTotal,
  };
}

// ── HTML / PDF ───────────────────────────────────────────
/** Standalone HTML document (invoice preview + PDF engine dono ke liye). */
export async function buildInvoicePdfHtml(invoiceId: string): Promise<string> {
  const { data } = await loadInvoicePdfData(invoiceId);
  return wrapDocument(renderKrushiBill(data));
}

/** Generate the saved-invoice PDF via the backend engine (no download). */
export async function generateSavedInvoicePdfBlob(invoiceId: string): Promise<Blob> {
  const html = await buildInvoicePdfHtml(invoiceId);
  return generateInvoicePdf({ html });
}

/** Generate the saved-invoice PDF and download it (INV-0001.pdf). */
export async function downloadSavedInvoicePdf(invoiceId: string): Promise<void> {
  const { invoiceNumber } = await loadInvoicePdfData(invoiceId);
  const blob = await generateSavedInvoicePdfBlob(invoiceId);
  const safeName = String(invoiceNumber || 'invoice').replace(/[^A-Za-z0-9._-]/g, '_');
  downloadPdfBlob(blob, `${safeName || 'invoice'}.pdf`);
}
