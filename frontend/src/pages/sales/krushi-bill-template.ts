// ═════════════════════════════════════════════════════════
// KRUSHI SAGAR KENDRA — CREDIT TAX INVOICE (A4 · 1-3 copies)
// Shopkeeper-approved HTML template (verbatim from the owner).
// `#invoice-preview` ke andar render hota hai — isliye CSS scoped hai
// (Tailwind/app styles se clash na ho). PDF path mein backend apna
// Noto Sans Devanagari base64 @font-face inject karta hai (PDF mein
// Marathi टीप sahi render hota hai), browser print local fonts use karta hai.
//
// Invoice Settings (Settings Hub) se controlled: HSN/Batch/Expiry/GST columns,
// Discount line, UPI "Scan & Pay" QR box, Duplicate/Transport copies, Barcode.
// ═════════════════════════════════════════════════════════

// ── Scoped CSS (only inside #invoice-preview) ────────────
export const KRUSHI_BILL_CSS = `
@font-face {
  font-family: 'InvoiceFont';
  src: local('Noto Sans Devanagari'), local('Mangal'), local('Segoe UI Historic'), local('Arial');
}
#invoice-preview, #invoice-preview * { box-sizing: border-box; }
#invoice-preview {
  font-family: 'Noto Sans Devanagari', 'Mangal', 'Segoe UI Historic', 'InvoiceFont', Arial, sans-serif;
  color: #000;
  width: 100%;
  letter-spacing: normal;
  font-variant-ligatures: normal;
  font-feature-settings: "kern" 1, "liga" 1;
}

#invoice-preview .copy {
  border: 2px solid #000;
  padding: 2.5mm;
  position: relative;
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 1.5mm;
  background: #fff;
}
#invoice-preview .copy + .cut-line {
  margin: 1.5mm 0;
  text-align: center;
  border-top: 1px dashed #000;
  position: relative;
  font-size: 10px;
  break-inside: avoid;
  page-break-inside: avoid;
}

#invoice-preview .badge { position: absolute; top: 0; right: 0; background: #000; color: #fff; font-weight: bold; font-size: 10px; padding: 2px 8px; z-index: 1; }
#invoice-preview .badge.customer { background: #fff; color: #000; border: 1px solid #000; }

#invoice-preview .doc-type { text-align: center; font-size: 10px; font-weight: bold; letter-spacing: 1.5px; width: 100%; }
#invoice-preview h1.brand { text-align: center; font-size: 19px; margin: 1px 0; letter-spacing: 0.5px; line-height: 1.15; }
#invoice-preview .addr-block { text-align: center; font-size: 9.5px; line-height: 1.25; }
#invoice-preview .gst-no { text-align: center; font-size: 11px; font-weight: bold; margin-top: 1px; }

#invoice-preview .row-flex { display: flex; border: 1px solid #000; border-top: none; }
#invoice-preview .row-flex > div { padding: 2.5px 5px; font-size: 9.5px; line-height: 1.25; }
#invoice-preview .row-flex > div + div { border-left: 1px solid #000; }

#invoice-preview .top-header-row { border-top: none; margin-top: 0; align-items: stretch; }
#invoice-preview .header-title-block { flex: 2.4; display: flex; flex-direction: column; justify-content: center; }
#invoice-preview .lic-box { flex: 1.1; }
#invoice-preview .lic-box .title { font-weight: bold; text-decoration: underline; margin-bottom: 1px; }
#invoice-preview .lic-box div.line { display: flex; justify-content: space-between; line-height: 1.2; }
#invoice-preview .inv-meta { flex: 1.1; font-size: 10.5px; }
#invoice-preview .inv-meta div.line { display: flex; justify-content: space-between; line-height: 1.3; margin-bottom: 1px; }
#invoice-preview .inv-meta div.line span:last-child { font-weight: bold; }
#invoice-preview .cust-box { flex: 1.4; }
#invoice-preview .cust-box div.line { margin-bottom: 1px; line-height: 1.25; }
#invoice-preview .ship-box { flex: 1; }
#invoice-preview .ship-box div.line { margin-bottom: 1px; line-height: 1.25; }

#invoice-preview .compact-row > div { padding: 2px 5px; font-size: 8.5px; }
#invoice-preview .compact-row div.line { margin-bottom: 0; line-height: 1.2; }

#invoice-preview table.items { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: -1px; table-layout: fixed; }
#invoice-preview table.items th { border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 3px; text-align: center; font-weight: bold; line-height: 1.2; letter-spacing: normal; }
#invoice-preview table.items td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 2.5px 3px; text-align: center; line-height: 1.2; letter-spacing: normal; word-break: break-word; }
#invoice-preview table.items thead { display: table-header-group; }
#invoice-preview table.items thead th { border-top: 1px solid #000; border-bottom: 1px solid #000; }
#invoice-preview table.items tbody tr { break-inside: avoid; page-break-inside: avoid; }
#invoice-preview table.items tbody tr:first-child td { border-top: 1px solid #000; }
#invoice-preview table.items tbody tr:last-child td { border-bottom: 1px solid #000; }

#invoice-preview table.items .col-sr { width: 3.5%; }
#invoice-preview table.items .col-desc { width: 26%; text-align: left; }
#invoice-preview table.items .col-mfg { width: 11.5%; }
#invoice-preview table.items .col-batch { width: 10.5%; }
#invoice-preview table.items .col-pkg-hsn { width: 12%; white-space: nowrap; }
#invoice-preview table.items .col-qty { width: 4.5%; }
#invoice-preview table.items .col-rate { width: 7.5%; }
#invoice-preview table.items .col-amt { width: 8.5%; }
#invoice-preview table.items .col-gst { width: 5%; white-space: nowrap; }
#invoice-preview table.items .col-cgst { width: 5.5%; white-space: nowrap; padding-left: 1.5px; padding-right: 1.5px; }
#invoice-preview table.items .col-sgst { width: 5.5%; white-space: nowrap; padding-left: 1.5px; padding-right: 1.5px; }
#invoice-preview table.items .hsn-num { display: inline-block; white-space: nowrap; }

#invoice-preview .bottom-row { display: flex; border: 1px solid #000; border-top: none; break-inside: avoid; page-break-inside: avoid; }
#invoice-preview .rupees-box { flex: 1.6; padding: 2.5px 5px; font-size: 9px; border-right: 1px solid #000; }
#invoice-preview .rupees-box .rupees-line { font-weight: bold; margin-bottom: 1px; }
#invoice-preview .rupees-box .note { font-size: 8.5px; line-height: 1.35; margin-top: 2px; font-family: 'Noto Sans Devanagari', 'Mangal', 'Segoe UI Historic', 'InvoiceFont', Arial, sans-serif; letter-spacing: normal; }
#invoice-preview .rupees-box .note.final { font-weight: bold; }

#invoice-preview .totals-box { flex: 1.3; border-right: 1px solid #000; }
#invoice-preview table.totals { width: 100%; border-collapse: collapse; font-size: 9px; }
#invoice-preview table.totals th, #invoice-preview table.totals td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
#invoice-preview .deductions { padding: 2.5px 5px; font-size: 9px; }
#invoice-preview .deductions .line { display: flex; justify-content: space-between; margin-bottom: 1px; }

#invoice-preview .bill-box { flex: 1; padding: 3px 5px; text-align: center; }
#invoice-preview .bill-box .label { font-weight: bold; font-size: 10px; }
#invoice-preview .bill-box .amount { font-weight: bold; font-size: 17px; margin-top: 3px; }

#invoice-preview .sign-row { display: flex; justify-content: space-between; border: 1px solid #000; border-top: none; padding: 4px 6px; font-size: 9.5px; break-inside: avoid; page-break-inside: avoid; }
#invoice-preview .sign-row .right { text-align: right; }

#invoice-preview .upi-box { display: flex; align-items: center; gap: 2.5mm; border: 1px solid #000; border-top: none; padding: 1.5mm 2.5mm; break-inside: avoid; page-break-inside: avoid; }
#invoice-preview .upi-qr img { width: 15mm; height: 15mm; border: 1px solid #000; padding: 1mm; }
#invoice-preview .upi-info { font-size: 9px; line-height: 1.35; }
#invoice-preview .upi-info .upi-title { font-weight: bold; font-size: 10.5px; letter-spacing: 0.5px; }
#invoice-preview .upi-info .upi-id { font-weight: bold; margin-top: 1px; }
#invoice-preview .upi-info .upi-note { color: #333; }

#invoice-preview .barcode-row { display: flex; flex-direction: column; align-items: center; padding: 1.5mm 0 0; break-inside: avoid; page-break-inside: avoid; }
#invoice-preview .barcode-row svg { display: block; }
#invoice-preview .barcode-row .barcode-text { font-size: 8.5px; letter-spacing: 1.5px; margin-top: 0.5mm; }
`;

// ── Types ────────────────────────────────────────────────
export interface KrushiBillItemData {
  description: string;
  mfgCo: string;
  batchNo: string;
  expiryDate: string; // ISO date ya ''
  pkg: string; // UOM
  hsn: string;
  qty: number;
  rate: number;
  amount: number; // taxable amount (per line)
  gstPercent: number;
  cgst: number;
  sgst: number;
}

export interface KrushiBillData {
  invoiceNo: string;
  invoiceDate: string; // ISO date
  dcNo: string;
  dcDate: string; // ISO date ya ''
  // Shop details (company se aate hain — Settings Hub / Invoice page par set hote hain)
  shopName?: string;
  shopAddress?: string;
  shopMobile?: string;
  shopGst?: string;
  pesticidesLicense?: string;
  fertilizerLicense?: string;
  seedsLicense?: string;
  cottonLicense?: string;
  retailLicense?: string;
  customerName: string;
  customerAddress: string;
  customerGst: string;
  customerMobile: string;
  state: string;
  placeOfSupply: string;
  items: KrushiBillItemData[];
  totalQty: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  grandTotal: number;
  discount: number;
  roundOff: number;
  netAmount: number;
  billAmount: number;
  showGst: boolean;
  showSignature: boolean;
  // UPI Scan & Pay — Banking Settings (default account) ka UPI ID + QR data URL
  upiId?: string;
  upiQrPayload?: string; // data:image/png;base64,... QR image
  // Invoice Settings (Settings Hub → Invoice) — print display toggles (undefined = true)
  showHsn?: boolean;
  showBatch?: boolean;
  showExpiry?: boolean;
  showDiscount?: boolean;
  showQr?: boolean;
  duplicateCopy?: boolean;
  transportCopy?: boolean;
  showBarcode?: boolean;
  barcodeSvg?: string;
}

// ── Small helpers ────────────────────────────────────────
function esc(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(v: number): string {
  return (Number(v) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ISO → DD/MM/YYYY (photo format)
function formatDateDDMM(iso: string): string {
  if (!iso) {
    return '—';
  }
  const parts = String(iso).split('T')[0].split('-');
  if (parts.length !== 3) {
    return iso;
  }
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fillTokens(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => (key in ctx ? ctx[key] : ''));
}

// ── Code-39 barcode (dependency-free inline SVG) — invoice number ke liye ──
// Standard Code-39 patterns (9 elements each: 5 bars + 4 spaces; 1 = wide, 0 = narrow)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
};

export function code39Svg(value: string): string {
  const data = `*${String(value || '').toUpperCase()}*`;
  const narrow = 1;
  const wide = 3;
  const height = 28;
  const charGap = narrow * 2;
  const quiet = narrow * 10; // Code-39 quiet zone — scanner ke liye zaroori
  let x = quiet;
  let rects = '';
  for (const ch of data) {
    const pat = CODE39_PATTERNS[ch] ?? CODE39_PATTERNS['*'];
    let isBar = true;
    for (const bit of pat) {
      const w = bit === '1' ? wide : narrow;
      if (isBar) {
        rects += `<rect x="${x}" y="0" width="${w}" height="${height}" />`;
      }
      x += w;
      isBar = !isBar;
    }
    x += charGap;
  }
  const total = x - charGap + quiet;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${height}" viewBox="0 0 ${total} ${height}" shape-rendering="crispEdges"><rect width="${total}" height="${height}" fill="#ffffff" /><g fill="#000000">${rects}</g></svg>`;
}

// ── Templates (verbatim from shopkeeper) ─────────────────
const SIGNATURE_ROW = `
<div class="sign-row">
  <div>Customer Signature ____________________</div>
  <div class="right">Authorised Signatory ____________________</div>
</div>`;

const CUT_LINE = `<div class="cut-line"><span>✂ CUT HERE ✂</span></div>`;

const COPY_TEMPLATE = `
<div class="copy">
  <div class="row-flex top-header-row">
    <div class="lic-box">
      <div class="line"><span>Pesticides L.No</span><span>: {{pesticidesLicense}}</span></div>
      <div class="line"><span>Fertilizer L.No</span><span>: {{fertilizerLicense}}</span></div>
      <div class="line"><span>Seeds LIC No</span><span>: {{seedsLicense}}</span></div>
      <div class="line"><span>Cotton LIC No</span><span>: {{cottonLicense}}</span></div>
      <div class="line"><span>Retail LIC No</span><span>: {{retailLicense}}</span></div>
    </div>
    <div class="header-title-block">
      <div class="doc-type">CREDIT TAX INVOICE</div>
      <h1 class="brand">{{shopName}}</h1>
      <div class="addr-block">
        {{shopAddress}}<br>
        {{shopMobile}}
      </div>
      {{gstNoLine}}
    </div>
    <div class="inv-meta">
      <div class="line"><span>Invoice No.</span><span>: {{invoiceNo}}</span></div>
      <div class="line"><span>Date</span><span>: {{invoiceDate}}</span></div>
      <div class="line"><span>DC No.</span><span>: {{dcNo}}</span></div>
      <div class="line"><span>DC Date</span><span>: {{dcDate}}</span></div>
    </div>
  </div>

  <div class="row-flex compact-row">
    <div class="cust-box">
      <div class="line"><b>Customer Name :</b> {{customerName}}</div>
      <div class="line"><b>Address :</b> {{customerAddress}}</div>
      {{partyGstLine}}
    </div>
    <div class="ship-box">
      <div class="line"><b>Mobile No :</b> {{customerMobile}}</div>
      <div class="line"><b>State :</b> {{state}}</div>
      <div class="line"><b>Place of Supply :</b> {{placeOfSupply}}</div>
    </div>
  </div>

  <table class="items">
    {{itemsHeader}}
    <tbody>
      {{itemsRows}}
    </tbody>
  </table>

  <div class="bottom-row">
    <div class="rupees-box">
      <div class="note">
        टीप : बिलात नमूद केलेली किटकनाशके मी माझ्या मर्जीने शेती उपयोगासाठी घेतली असून,
        फवारणी करताना घ्यावयाच्या काळजीची माहिती मला दिलेली आहे. यापुढील सर्व
        जबाबदारी माझी स्वतःची राहील.
      </div>
      <div class="note final">टीप : एकदा विकलेला माल परत घेतला जाणार नाही.</div>
    </div>
    <div class="totals-box">
      <table class="totals">
        <tr>{{totalsHeader}}</tr>
        <tr>{{totalsRow}}</tr>
      </table>
      <div class="deductions">
        {{discountLine}}
        <div class="line"><span>Round Off :</span><span>{{roundOff}}</span></div>
        <div class="line"><span>Net Amount :</span><span>{{netAmount}}</span></div>
      </div>
    </div>
    <div class="bill-box">
      <div class="label">Bill Amount</div>
      <div class="amount">₹ {{billAmount}}</div>
    </div>
  </div>

  {{upiBox}}

  {{barcodeRow}}

  {{signatureRow}}
</div>`;

// ── Render: copies + CUT HERE (Invoice Settings se controlled) ───────
export function renderKrushiBill(data: KrushiBillData): string {
  // Invoice Settings toggles — undefined = true (purana behavior preserved)
  const showHsn = data.showHsn !== false;
  const showBatch = data.showBatch !== false;
  const showExp = data.showExpiry !== false && showBatch;
  const showGstCols = data.showGst !== false;
  const showQrBox = data.showQr !== false;
  const showDisc = data.showDiscount !== false;

  // Item table — dynamic columns (HSN/Batch/GST hide hone par columns hat jate hain)
  const colCount = 3 + (showBatch ? 1 : 0) + (showHsn ? 1 : 0) + 3 + (showGstCols ? 3 : 0);
  const itemsHeader = `
    <thead>
      <tr>
        <th rowspan="2" class="col-sr">Sr</th><th rowspan="2" class="col-desc">Description</th><th rowspan="2" class="col-mfg">Mfg. Co.</th>
        ${showBatch ? '<th rowspan="2" class="col-batch">Batch/EXP</th>' : ''}
        ${showHsn ? '<th rowspan="2" class="col-pkg-hsn">Pkg/Hsn</th>' : ''}
        <th rowspan="2" class="col-qty">Qty</th><th rowspan="2" class="col-rate">Rate</th><th rowspan="2" class="col-amt">Amount</th>
        ${showGstCols ? '<th rowspan="2" class="col-gst">GST %</th><th colspan="2">CGST/SGST</th>' : ''}
      </tr>
      ${showGstCols ? '<tr><th class="col-cgst">CGST</th><th class="col-sgst">SGST</th></tr>' : ''}
    </thead>`;

  const itemsRows =
    data.items.length === 0
      ? `<tr><td colspan="${colCount}" style="text-align:center">—</td></tr>`
      : data.items
          .map((it, i) => {
            const batchCell = showBatch
              ? `<td class="col-batch">${esc(it.batchNo || '—')}${showExp && it.expiryDate ? `<br>${formatDateDDMM(it.expiryDate)}` : ''}</td>`
              : '';
            const hsnCell = showHsn
              ? `<td class="col-pkg-hsn">${esc(it.pkg || '—')}${it.hsn ? `<br><span class="hsn-num">${esc(it.hsn)}</span>` : ''}</td>`
              : '';
            const gstCells = showGstCols
              ? `<td class="col-gst">${it.gstPercent.toFixed(2)}</td><td class="col-cgst">${fmtNum(it.cgst)}</td><td class="col-sgst">${fmtNum(it.sgst)}</td>`
              : '';
            return `
<tr>
  <td class="col-sr">${i + 1}</td><td class="col-desc">${esc(it.description)}</td><td class="col-mfg">${esc(it.mfgCo || '—')}</td>
  ${batchCell}
  ${hsnCell}
  <td class="col-qty">${it.qty}</td><td class="col-rate">${fmtNum(it.rate)}</td><td class="col-amt">${fmtNum(it.amount)}</td>
  ${gstCells}
</tr>`;
          })
          .join('\n');

  const discountLine = showDisc
    ? `<div class="line"><span>Less Discount :</span><span>${fmtNum(data.discount)}</span></div>`
    : '';

  const totalsHeader = showGstCols
    ? '<th>Total Qty</th><th>Taxable Amount</th><th>CGST</th><th>SGST</th><th>Grand Total</th>'
    : '<th>Total Qty</th><th>Taxable Amount</th><th>Grand Total</th>';
  const totalsRow = showGstCols
    ? `<td>${data.totalQty}</td><td>${fmtNum(data.taxableAmount)}</td><td>${fmtNum(data.totalCgst)}</td>
        <td>${fmtNum(data.totalSgst)}</td><td><b>${fmtNum(data.grandTotal)}</b></td>`
    : `<td>${data.totalQty}</td><td>${fmtNum(data.taxableAmount)}</td><td><b>${fmtNum(data.grandTotal)}</b></td>`;

  const upiBox =
    showQrBox &&
    data.upiId &&
    String(data.upiId).trim() &&
    data.upiQrPayload?.startsWith('data:image/')
      ? `<div class="upi-box">
  <div class="upi-qr"><img src="${data.upiQrPayload}" alt="UPI QR" /></div>
  <div class="upi-info">
    <div class="upi-title">SCAN &amp; PAY</div>
    <div class="upi-id">UPI ID : ${esc(String(data.upiId))}</div>
    <div class="upi-note">GPay / PhonePe / Paytm se scan karke payment karein</div>
  </div>
</div>`
      : '';

  const barcodeRow =
    data.showBarcode === true && data.barcodeSvg
      ? `<div class="barcode-row">${data.barcodeSvg}<div class="barcode-text">${esc(data.invoiceNo)}</div></div>`
      : '';

  const makeCopy = (
    copyLabel: 'OFFICE COPY' | 'CUSTOMER COPY' | 'TRANSPORT COPY',
    isCustomer: boolean,
  ): string =>
    fillTokens(COPY_TEMPLATE, {
      badgeClass: isCustomer ? 'badge customer' : 'badge',
      copyLabel,
      shopName: esc(data.shopName || 'KRUSHI SAGAR KENDRA'),
      shopSignName: esc(data.shopName || 'KRUSHI SAGAR KENDRA'),
      shopAddress: esc(
        data.shopAddress ||
          'At Post Kanadgaon, Tal. Rahata, Dist. Ahmednagar - 413720 (Maharashtra)',
      ),
      shopMobile: esc(data.shopMobile || 'Mobile : 9881292045 / 9021212045'),
      pesticidesLicense: esc(data.pesticidesLicense || 'LAIID09140035'),
      fertilizerLicense: esc(data.fertilizerLicense || 'LAFD09140031'),
      seedsLicense: esc(data.seedsLicense || 'LASD09140146'),
      cottonLicense: esc(data.cottonLicense || 'LACD09140032'),
      retailLicense: esc(data.retailLicense || '—'),
      gstNoLine: data.showGst
        ? `<div class="gst-no">GST NO : ${esc(data.shopGst || '27AABCS1234A1Z5')}</div>`
        : '',
      partyGstLine: data.showGst
        ? `<div class="line"><b>Party GST No :</b> ${esc(data.customerGst || '—')}</div>`
        : '',
      invoiceNo: esc(data.invoiceNo),
      invoiceDate: formatDateDDMM(data.invoiceDate),
      dcNo: esc(data.dcNo || '—'),
      dcDate: formatDateDDMM(data.dcDate),
      customerName: esc(data.customerName),
      customerAddress: esc(data.customerAddress || '—'),
      customerMobile: esc(data.customerMobile || '—'),
      state: esc(data.state || '—'),
      placeOfSupply: esc(data.placeOfSupply || '—'),
      itemsHeader,
      itemsRows,
      totalsHeader,
      totalsRow,
      totalQty: String(data.totalQty),
      taxableAmount: fmtNum(data.taxableAmount),
      totalCgst: fmtNum(data.totalCgst),
      totalSgst: fmtNum(data.totalSgst),
      grandTotal: fmtNum(data.grandTotal),
      discountLine,
      roundOff: fmtNum(data.roundOff),
      netAmount: fmtNum(data.netAmount),
      billAmount: fmtNum(data.billAmount),
      upiBox,
      barcodeRow,
      signatureRow: data.showSignature ? SIGNATURE_ROW : '',
    });

  const copies: string[] = [];
  if (data.duplicateCopy !== false) {
    copies.push(makeCopy('OFFICE COPY', false));
  }
  copies.push(makeCopy('CUSTOMER COPY', true));
  if (data.transportCopy === true) {
    copies.push(makeCopy('TRANSPORT COPY', true));
  }
  return copies.join(`\n${CUT_LINE}\n`);
}
