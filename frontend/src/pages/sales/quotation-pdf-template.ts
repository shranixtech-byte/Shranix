// ═════════════════════════════════════════════════════════
// PHASE 7 — QUOTATION PDF ENGINE (Professional A4)
//
// Renders a professional quotation document with:
//   • Company Logo + GST           • QR Payment (UPI Scan & Pay)
//   • Signature blocks             • Watermark (DRAFT / PENDING APPROVAL)
//   • Terms & Conditions           • Bank Details
//   • Barcode (Code-39)            • Amount in words
//
// The output is plain HTML (scoped under `.quote-pdf`) that is sent to the
// backend `/pdf/generate` (Puppeteer + embedded Noto Sans Devanagari) to
// produce the final A4 PDF — same pipeline as the Krushi credit-tax invoice.
// All images (logo / signature / QR) must be `data:` URLs because the PDF
// service aborts every non-data request (SSRF hardening).
// ═════════════════════════════════════════════════════════

// ── Scoped CSS (only inside .quote-pdf) ──────────────────
export const QUOTATION_PDF_CSS = `
.quote-pdf, .quote-pdf * { box-sizing: border-box; }
.quote-pdf {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 7mm 9mm 8mm;
  background: #ffffff;
  color: #0f172a;
  font-family: 'Noto Sans Devanagari', Arial, Helvetica, sans-serif;
  position: relative;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.quote-pdf .qp-topband { position: absolute; top: 0; left: 0; right: 0; height: 2.5mm; background: linear-gradient(90deg, #065f46, #059669); }

/* ── Header ── */
.quote-pdf .qp-header { display: flex; gap: 6mm; align-items: flex-start; padding-bottom: 4mm; border-bottom: 1.5px solid #e2e8f0; }
.quote-pdf .qp-brand { display: flex; gap: 4mm; flex: 1.6; min-width: 0; }
.quote-pdf .qp-logo { width: 24mm; height: 24mm; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 3px; padding: 1mm; background: #ffffff; }
.quote-pdf .qp-company { font-size: 17pt; font-weight: 800; color: #065f46; margin: 0; line-height: 1.15; }
.quote-pdf .qp-addr { font-size: 8.5pt; color: #475569; margin: 1mm 0 0; line-height: 1.35; }
.quote-pdf .qp-contact { font-size: 8pt; color: #64748b; margin: 0.5mm 0 0; }
.quote-pdf .qp-gstin { display: inline-block; margin-top: 1.2mm; font-size: 8pt; font-weight: 700; color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 3px; padding: 0.6mm 2.2mm; }
.quote-pdf .qp-doc { flex: 1; text-align: right; }
.quote-pdf .qp-doc-label { display: inline-block; font-size: 14pt; font-weight: 900; letter-spacing: 4px; color: #ffffff; background: #065f46; padding: 2mm 6mm; border-radius: 2mm; }
.quote-pdf .qp-meta { width: 100%; margin-top: 2.5mm; border-collapse: collapse; font-size: 8.5pt; }
.quote-pdf .qp-meta td { padding: 0.8mm 0; text-align: right; color: #334155; }
.quote-pdf .qp-meta td.k { color: #94a3b8; text-transform: uppercase; font-size: 6.8pt; letter-spacing: 0.6px; font-weight: 700; padding-right: 2mm; }
.quote-pdf .qp-status { display: inline-block; border-radius: 10px; padding: 0.5mm 3mm; font-size: 7.5pt; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
.quote-pdf .qp-status.s-draft { background: #f1f5f9; color: #475569; }
.quote-pdf .qp-status.s-pending, .quote-pdf .qp-status.s-under_review { background: #eff6ff; color: #1d4ed8; }
.quote-pdf .qp-status.s-approved, .quote-pdf .qp-status.s-sent { background: #d1fae5; color: #047857; }
.quote-pdf .qp-status.s-rejected { background: #fee2e2; color: #b91c1c; }
.quote-pdf .qp-status.s-final { background: #ede9fe; color: #6d28d9; }

/* ── Party boxes ── */
.quote-pdf .qp-parties { display: flex; gap: 5mm; margin-top: 4mm; }
.quote-pdf .qp-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 2mm; padding: 3mm 4mm; break-inside: avoid; page-break-inside: avoid; }
.quote-pdf .qp-box h3 { margin: 0 0 1.5mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1.2px; color: #047857; font-weight: 800; }
.quote-pdf .qp-box p { margin: 0.6mm 0; font-size: 9pt; line-height: 1.4; color: #334155; }
.quote-pdf .qp-box p.b { font-weight: 700; color: #0f172a; }

/* ── Section titles ── */
.quote-pdf .qp-section { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; color: #047857; margin: 5mm 0 2mm; display: flex; align-items: center; gap: 3mm; }
.quote-pdf .qp-section::after { content: ''; flex: 1; height: 1px; background: #d1fae5; }

/* ── Items table ── */
.quote-pdf table.qp-items { width: 100%; border-collapse: collapse; font-size: 8pt; }
.quote-pdf table.qp-items th { background: #0f172a; color: #ffffff; padding: 2mm 1.6mm; font-weight: 700; text-align: left; }
.quote-pdf table.qp-items th.r, .quote-pdf table.qp-items td.r { text-align: right; }
.quote-pdf table.qp-items td { padding: 1.8mm 1.6mm; border-bottom: 1px solid #f1f5f9; color: #334155; }
.quote-pdf table.qp-items td.desc { font-weight: 600; color: #0f172a; }
.quote-pdf table.qp-items tbody tr:nth-child(even) { background: #f8fafc; }
.quote-pdf table.qp-items tbody tr { page-break-inside: avoid; }
.quote-pdf table.qp-items thead { display: table-header-group; }

/* ── Totals + amount in words ── */
.quote-pdf .qp-bottom { display: flex; gap: 5mm; margin-top: 4mm; align-items: stretch; }
.quote-pdf .qp-words { flex: 1.5; border: 1px solid #e2e8f0; border-radius: 2mm; padding: 3mm 4mm; display: flex; flex-direction: column; justify-content: center; }
.quote-pdf .qp-words .t { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-weight: 700; }
.quote-pdf .qp-words .amt { font-size: 10pt; font-weight: 800; color: #065f46; margin-top: 1.5mm; line-height: 1.4; }
.quote-pdf .qp-totals { flex: 1; border: 1px solid #e2e8f0; border-radius: 2mm; overflow: hidden; }
.quote-pdf .qp-totals table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.quote-pdf .qp-totals td { padding: 1.4mm 3mm; color: #475569; }
.quote-pdf .qp-totals td.v { text-align: right; font-variant-numeric: tabular-nums; color: #334155; font-weight: 600; }
.quote-pdf .qp-totals tr.grand td { background: #065f46; color: #ffffff; font-weight: 800; font-size: 10.5pt; }
.quote-pdf .qp-totals tr.grand td.v { color: #ffffff; }

/* ── Quote options strip ── */
.quote-pdf .qp-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 4mm; }
.quote-pdf .qp-opt { border: 1px solid #e2e8f0; border-radius: 2mm; padding: 2.5mm 3mm; break-inside: avoid; page-break-inside: avoid; }
.quote-pdf .qp-opt .t { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; }
.quote-pdf .qp-opt .v { font-size: 8.5pt; font-weight: 600; color: #1e293b; margin-top: 0.8mm; }

/* ── Bank + QR payment ── */
.quote-pdf .qp-pay { display: flex; gap: 5mm; margin-top: 4mm; align-items: stretch; }
.quote-pdf .qp-bank { flex: 1.6; border: 1px solid #e2e8f0; border-radius: 2mm; padding: 3mm 4mm; }
.quote-pdf .qp-bank p { margin: 0.7mm 0; font-size: 8.5pt; color: #334155; }
.quote-pdf .qp-bank p .lb { color: #94a3b8; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 700; }
.quote-pdf .qp-qr { flex: 1; border: 1px dashed #a7f3d0; background: #f0fdf4; border-radius: 2mm; padding: 3mm; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.quote-pdf .qp-qr img { width: 30mm; height: 30mm; border: 1px solid #d1fae5; border-radius: 2mm; background: #ffffff; padding: 1mm; }
.quote-pdf .qp-qr .t { font-weight: 900; font-size: 10pt; letter-spacing: 2px; color: #065f46; margin-top: 1.5mm; }
.quote-pdf .qp-qr .id { font-size: 8pt; font-weight: 700; color: #334155; margin-top: 0.5mm; }
.quote-pdf .qp-qr .note { font-size: 7pt; color: #64748b; margin-top: 0.5mm; }

/* ── Terms / notes ── */
.quote-pdf .qp-terms { margin-top: 4mm; }
.quote-pdf .qp-terms ol { margin: 0; padding-left: 5mm; font-size: 8pt; color: #475569; }
.quote-pdf .qp-terms li { margin: 0.8mm 0; }
.quote-pdf .qp-notes { margin-top: 4mm; border-left: 3px solid #a7f3d0; padding: 1.5mm 0 1.5mm 4mm; font-size: 8.5pt; color: #475569; line-height: 1.5; white-space: pre-line; }

/* ── Signatures ── */
.quote-pdf .qp-sign { display: flex; justify-content: space-between; margin-top: 11mm; }
.quote-pdf .qp-sign .col { width: 62mm; text-align: center; }
.quote-pdf .qp-sign img.sig { height: 13mm; max-width: 55mm; object-fit: contain; object-position: bottom center; }
.quote-pdf .qp-sign .line { border-top: 1px solid #94a3b8; margin-top: 12mm; padding-top: 1.2mm; }
.quote-pdf .qp-sign .name { font-size: 8.5pt; font-weight: 700; color: #0f172a; }
.quote-pdf .qp-sign .cap { font-size: 7.5pt; color: #94a3b8; margin-top: 0.5mm; }

/* ── Barcode ── */
.quote-pdf .qp-barcode { text-align: center; margin-top: 6mm; }
.quote-pdf .qp-barcode svg { display: inline-block; }
.quote-pdf .qp-barcode .num { font-size: 8pt; letter-spacing: 2.5px; font-weight: 600; color: #334155; margin-top: 0.6mm; }

/* ── Footer ── */
.quote-pdf .qp-footer { text-align: center; font-size: 7.5pt; color: #94a3b8; margin-top: 5mm; padding-top: 2mm; border-top: 1px solid #f1f5f9; }

/* ── Duplicate copies (OFFICE COPY + CUSTOMER COPY) ── */
.qp-copy { position: relative; }
.qp-copy-badge { position: absolute; top: 2mm; right: 0; background: #0f172a; color: #ffffff; font-size: 8pt; font-weight: 800; letter-spacing: 1.5px; padding: 1.2mm 5mm; z-index: 20; border-radius: 0 0 0 2mm; }
.qp-copy-badge.customer { background: #047857; }
.qp-cut-line { margin: 4mm 0; text-align: center; font-size: 9pt; letter-spacing: 2px; color: #64748b; border-top: 1px dashed #94a3b8; padding-top: 2mm; }

/* ── Watermark (DRAFT / PENDING APPROVAL / REJECTED) ── */
.quote-pdf .qp-watermark {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-32deg);
  font-size: 30pt;
  font-weight: 900;
  letter-spacing: 10px;
  color: rgba(190, 18, 60, 0.10);
  border: 4px solid rgba(190, 18, 60, 0.14);
  padding: 3mm 9mm;
  border-radius: 3mm;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1;
}
`;

// ── Types ────────────────────────────────────────────────
export interface QuotationPdfBankData {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export interface QuotationPdfItemData {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  discountAmount: number;
  discountPercent: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
}

export interface QuotationPdfData {
  // Document identity
  quoteNumber: string;
  quoteDate: string;
  validTill: string;
  revision: number;
  status: string;
  // Company (Settings Hub → Company & License → branding)
  companyName: string;
  companyLogo?: string; // data:image/...;base64,...
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
  signatureImage?: string; // data:image/...;base64,...
  invoiceFooter?: string;
  // Customer
  customerName: string;
  customerGstin?: string;
  customerMobile?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  contactPerson?: string;
  // Quote options
  paymentTerms?: string;
  deliveryTime?: string;
  warranty?: string;
  customerNotes?: string;
  terms?: string;
  // Items + totals (stored authoritative values from the quote record)
  items: QuotationPdfItemData[];
  basicTotal: number;
  discountAmount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  gstTotal: number;
  freight: number;
  installationCharges: number;
  roundOff: number;
  grandTotal: number;
  // Payment
  bankAccount?: QuotationPdfBankData;
  upiId?: string;
  upiQrDataUrl?: string; // data:image/png;base64,... (generated client-side)
  barcodeSvg?: string; // Code-39 of the quote number
  showGst?: boolean;
}

// ── Watermark mapping (status → stamp text) ─────────────
export function quotationWatermark(status: string): string | null {
  const s = String(status || '').toLowerCase();
  if (s === 'draft') {
    return 'DRAFT';
  }
  if (s === 'pending' || s === 'under_review' || s === 'submitted') {
    return 'PENDING APPROVAL';
  }
  if (s === 'rejected') {
    return 'REJECTED';
  }
  return null;
}

// ── Small helpers ────────────────────────────────────────
function esc(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// ISO → DD/MM/YYYY
function fmtDate(iso?: string): string {
  if (!iso) {
    return '—';
  }
  const parts = String(iso).split('T')[0].split('-');
  if (parts.length !== 3) {
    return String(iso);
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending Approval',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  sent: 'Sent to Customer',
  final: 'Final',
  expired: 'Expired',
  converted: 'Converted',
};

// ── Amount in words (Indian numbering — crore/lakh/thousand) ──
const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) {
    return ONES[n];
  }
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) {
    parts.push(`${ONES[h]} Hundred`);
  }
  if (rest) {
    parts.push(twoDigits(rest));
  }
  return parts.join(' ');
}

export function numberToWordsINR(amount: number): string {
  // Negative values clamp to zero (a quotation grand total is never negative).
  const num = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  if (rupees === 0 && paise === 0) {
    return 'Zero Rupees Only';
  }
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;
  const parts: string[] = [];
  if (crore) {
    parts.push(`${threeDigits(crore)} Crore`);
  }
  if (lakh) {
    parts.push(`${threeDigits(lakh)} Lakh`);
  }
  if (thousand) {
    parts.push(`${threeDigits(thousand)} Thousand`);
  }
  if (hundred) {
    parts.push(threeDigits(hundred));
  }
  const paisePart = paise > 0 ? ` and ${twoDigits(paise)} Paise` : '';
  // Sub-rupee amounts (e.g. ₹0.50) still need a word before the paise part.
  const rupeePart = parts.length > 0 ? parts.join(' ') : 'Zero';
  return `Rupees ${rupeePart}${paisePart} Only`;
}

// ── Render ───────────────────────────────────────────────
export function renderQuotationPdf(data: QuotationPdfData): string {
  const showGst = data.showGst !== false;
  const watermark = quotationWatermark(data.status);
  const statusLabel = STATUS_LABELS[String(data.status || '').toLowerCase()] || 'Draft';
  const statusKey = String(data.status || 'draft').toLowerCase();

  // ── Items table ──
  const itemsRows =
    data.items.length === 0
      ? `<tr><td colspan="9" style="text-align:center;padding:6mm 0;color:#94a3b8">No items in this quotation</td></tr>`
      : data.items
          .map((it, i) => {
            // Percent discounts are stored as a number (e.g. 5 → "5%"); flat
            // discounts are stored as the rupee amount. Prefer percent when set.
            const disc =
              it.discountPercent > 0
                ? `${it.discountPercent}%`
                : it.discountAmount > 0
                  ? `₹${fmt(it.discountAmount)}`
                  : '—';
            const gst =
              it.igst > 0 ? `${it.gstRate}% IGST` : it.gstRate > 0 ? `${it.gstRate}%` : '—';
            return `<tr>
  <td>${i + 1}</td>
  <td class="desc">${esc(it.description || '—')}</td>
  <td>${esc(it.hsn || '—')}</td>
  <td class="r">${fmtQty(it.qty)}</td>
  <td class="r">${fmt(it.rate)}</td>
  <td class="r">${disc}</td>
  <td class="r">${fmt(it.taxableValue)}</td>
  <td class="r">${gst}</td>
  <td class="r"><b>${fmt(it.totalAmount)}</b></td>
</tr>`;
          })
          .join('\n');

  const itemsTable = `
<div class="qp-section">Items & Services</div>
<table class="qp-items">
  <thead>
    <tr>
      <th style="width:8mm">#</th>
      <th>Description</th>
      <th style="width:16mm">HSN</th>
      <th class="r" style="width:12mm">Qty</th>
      <th class="r" style="width:16mm">Rate</th>
      <th class="r" style="width:14mm">Disc</th>
      <th class="r" style="width:18mm">Taxable</th>
      <th class="r" style="width:18mm">GST</th>
      <th class="r" style="width:18mm">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${itemsRows}
  </tbody>
</table>`;

  // ── Totals ──
  const totalsRows: string[] = [
    `<tr><td>Basic Total</td><td class="v">₹ ${fmt(data.basicTotal)}</td></tr>`,
  ];
  if (data.discountAmount > 0) {
    totalsRows.push(`<tr><td>Discount</td><td class="v">− ₹ ${fmt(data.discountAmount)}</td></tr>`);
  }
  totalsRows.push(
    `<tr><td><b>Taxable Amount</b></td><td class="v"><b>₹ ${fmt(data.taxable)}</b></td></tr>`,
  );
  if (data.cgst > 0) {
    totalsRows.push(`<tr><td>CGST</td><td class="v">₹ ${fmt(data.cgst)}</td></tr>`);
  }
  if (data.sgst > 0) {
    totalsRows.push(`<tr><td>SGST</td><td class="v">₹ ${fmt(data.sgst)}</td></tr>`);
  }
  if (data.igst > 0) {
    totalsRows.push(`<tr><td>IGST</td><td class="v">₹ ${fmt(data.igst)}</td></tr>`);
  }
  if (data.cess > 0) {
    totalsRows.push(`<tr><td>CESS</td><td class="v">₹ ${fmt(data.cess)}</td></tr>`);
  }
  if (data.gstTotal > 0) {
    totalsRows.push(`<tr><td>GST Total</td><td class="v">₹ ${fmt(data.gstTotal)}</td></tr>`);
  }
  if (data.freight > 0) {
    totalsRows.push(`<tr><td>Freight</td><td class="v">₹ ${fmt(data.freight)}</td></tr>`);
  }
  if (data.installationCharges > 0) {
    totalsRows.push(
      `<tr><td>Installation Charges</td><td class="v">₹ ${fmt(data.installationCharges)}</td></tr>`,
    );
  }
  if (data.roundOff !== 0) {
    totalsRows.push(
      `<tr><td>Round Off</td><td class="v">${data.roundOff > 0 ? '+' : '−'} ₹ ${fmt(Math.abs(data.roundOff))}</td></tr>`,
    );
  }
  totalsRows.push(
    `<tr class="grand"><td>Grand Total</td><td class="v">₹ ${fmt(data.grandTotal)}</td></tr>`,
  );

  const totalsBox = `
<div class="qp-section">Amount Summary</div>
<div class="qp-bottom">
  <div class="qp-words">
    <div class="t">Amount in Words</div>
    <div class="amt">${esc(numberToWordsINR(data.grandTotal))}</div>
  </div>
  <div class="qp-totals">
    <table>
      ${totalsRows.join('\n')}
    </table>
  </div>
</div>`;

  // ── Quote options ──
  const options: { label: string; value: string }[] = [
    { label: 'Quote Date', value: fmtDate(data.quoteDate) },
    { label: 'Valid Till', value: fmtDate(data.validTill) },
    { label: 'Payment Terms', value: data.paymentTerms || '—' },
    { label: 'Delivery', value: data.deliveryTime || '—' },
  ];
  if (data.warranty) {
    options.push({ label: 'Warranty', value: data.warranty });
  }
  const optionsHtml = `
<div class="qp-section">Terms of Offer</div>
<div class="qp-options">
  ${options
    .map(
      (o) =>
        `<div class="qp-opt"><div class="t">${esc(o.label)}</div><div class="v">${esc(o.value)}</div></div>`,
    )
    .join('\n')}
</div>`;

  // ── Bank + QR payment ──
  const bank = data.bankAccount;
  const bankLines: string[] = [];
  if (bank?.bankName) {
    bankLines.push(`<p><span class="lb">Bank</span> : ${esc(bank.bankName)}</p>`);
  }
  if (bank?.accountHolderName) {
    bankLines.push(
      `<p><span class="lb">Account Holder</span> : ${esc(bank.accountHolderName)}</p>`,
    );
  }
  if (bank?.accountNumber) {
    bankLines.push(`<p><span class="lb">Account No</span> : ${esc(bank.accountNumber)}</p>`);
  }
  if (bank?.ifsc) {
    bankLines.push(`<p><span class="lb">IFSC</span> : ${esc(bank.ifsc)}</p>`);
  }
  if (bank?.upiId) {
    bankLines.push(`<p><span class="lb">UPI ID</span> : ${esc(bank.upiId)}</p>`);
  }

  const bankBox =
    bankLines.length > 0
      ? `<div class="qp-bank"><h3 style="margin:0 0 2mm;font-size:7.5pt;text-transform:uppercase;letter-spacing:1.2px;color:#047857">Bank Details</h3>${bankLines.join('\n')}</div>`
      : '';

  const qrBox =
    data.upiQrDataUrl && String(data.upiId || '').trim()
      ? `<div class="qp-qr">
  <img src="${esc(data.upiQrDataUrl)}" alt="UPI QR" />
  <div class="t">SCAN &amp; PAY</div>
  <div class="id">${esc(String(data.upiId))}</div>
  <div class="note">GPay / PhonePe / Paytm se scan karke payment karein</div>
</div>`
      : '';

  const payBox =
    bankBox || qrBox
      ? `<div class="qp-section">Payment Details</div>
<div class="qp-pay">${bankBox}${qrBox}</div>`
      : '';

  // ── Terms & notes ──
  const termsHtml =
    data.terms && String(data.terms).trim()
      ? `<div class="qp-section">Terms &amp; Conditions</div>
<div class="qp-terms"><ol>${String(data.terms)
          .split(/\n+/)
          .map((t) => (t.trim() ? `<li>${esc(t.trim())}</li>` : ''))
          .join('\n')}</ol></div>`
      : `<div class="qp-section">Terms &amp; Conditions</div>
<div class="qp-terms"><ol>
  <li>This quotation is valid until ${esc(fmtDate(data.validTill))}.</li>
  <li>Prices are exclusive of applicable taxes unless stated otherwise.</li>
  ${data.deliveryTime ? `<li>Delivery: ${esc(data.deliveryTime)}.</li>` : ''}
  ${data.paymentTerms ? `<li>Payment terms: ${esc(data.paymentTerms)}.</li>` : ''}
</ol></div>`;

  const notesHtml =
    data.customerNotes && String(data.customerNotes).trim()
      ? `<div class="qp-notes">${esc(String(data.customerNotes))}</div>`
      : '';

  // ── Signatures ──
  const signatureImage = data.signatureImage
    ? `<img class="sig" src="${esc(data.signatureImage)}" alt="Authorised Signatory" />`
    : '';
  const signatures = `
<div class="qp-sign">
  <div class="col">
    ${signatureImage}
    <div class="line"></div>
    <div class="name">For ${esc(data.companyName || 'Company')}</div>
    <div class="cap">Authorised Signatory</div>
  </div>
  <div class="col">
    <div class="line"></div>
    <div class="name">Customer Acceptance</div>
    <div class="cap">Name &amp; Signature</div>
  </div>
</div>`;

  // ── Barcode ──
  const barcode = data.barcodeSvg
    ? `<div class="qp-barcode">${data.barcodeSvg}<div class="num">${esc(data.quoteNumber)}</div></div>`
    : '';

  // ── Footer ──
  const footer = `
<div class="qp-footer">${esc(data.invoiceFooter || 'Thank you for your business!')}</div>`;

  const watermarkHtml = watermark ? `<div class="qp-watermark">${esc(watermark)}</div>` : '';

  return `
<div class="quote-pdf">
  <div class="qp-topband"></div>
  ${watermarkHtml}

  <div class="qp-header">
    <div class="qp-brand">
      ${data.companyLogo ? `<img class="qp-logo" src="${esc(data.companyLogo)}" alt="logo" />` : ''}
      <div>
        <h1 class="qp-company">${esc(data.companyName || 'Company')}</h1>
        ${data.companyAddress ? `<p class="qp-addr">${esc(data.companyAddress)}</p>` : ''}
        ${data.companyPhone || data.companyEmail ? `<p class="qp-contact">${[data.companyPhone, data.companyEmail].filter(Boolean).join(' · ')}</p>` : ''}
        ${showGst && data.companyGstin ? `<span class="qp-gstin">GSTIN : ${esc(data.companyGstin)}</span>` : ''}
      </div>
    </div>
    <div class="qp-doc">
      <div class="qp-doc-label">QUOTATION</div>
      <table class="qp-meta">
        <tr><td class="k">Quote No</td><td>${esc(data.quoteNumber)}</td></tr>
        <tr><td class="k">Date</td><td>${fmtDate(data.quoteDate)}</td></tr>
        <tr><td class="k">Valid Till</td><td>${fmtDate(data.validTill)}</td></tr>
        <tr><td class="k">Revision</td><td>Rev-${Number(data.revision) || 1}</td></tr>
        <tr><td class="k">Status</td><td><span class="qp-status s-${esc(statusKey)}">${esc(statusLabel)}</span></td></tr>
      </table>
    </div>
  </div>

  <div class="qp-parties">
    <div class="qp-box">
      <h3>Bill To</h3>
      <p class="b">${esc(data.customerName || '—')}</p>
      ${showGst && data.customerGstin ? `<p>GSTIN : ${esc(data.customerGstin)}</p>` : ''}
      ${data.customerMobile ? `<p>Mobile : ${esc(data.customerMobile)}</p>` : ''}
      ${data.billingAddress ? `<p>${esc(data.billingAddress)}</p>` : ''}
      ${data.contactPerson ? `<p>Contact : ${esc(data.contactPerson)}</p>` : ''}
    </div>
    <div class="qp-box">
      <h3>Ship To</h3>
      <p class="b">${esc(data.customerName || '—')}</p>
      ${data.shippingAddress ? `<p>${esc(data.shippingAddress)}</p>` : '<p>Same as billing address</p>'}
    </div>
  </div>

  ${itemsTable}
  ${totalsBox}
  ${optionsHtml}
  ${payBox}
  ${termsHtml}
  ${notesHtml}
  ${signatures}
  ${barcode}
  ${footer}
</div>`;
}

/**
 * Duplicate-copy wrapper — Phase 8: Print/PDF with an OFFICE COPY + CUSTOMER
 * COPY (separated by a CUT HERE line), exactly like the Krushi credit-tax
 * invoice. `duplicate = false` renders a single customer copy.
 */
export function renderQuotationPdfWithCopies(data: QuotationPdfData, duplicate: boolean): string {
  const single = renderQuotationPdf(data);
  if (!duplicate) {
    return single;
  }
  return `
<div class="qp-copy">
  <div class="qp-copy-badge">OFFICE COPY</div>
  ${single}
</div>
<div class="qp-cut-line">✂ CUT HERE ✂</div>
<div class="qp-copy">
  <div class="qp-copy-badge customer">CUSTOMER COPY</div>
  ${single}
</div>`;
}
