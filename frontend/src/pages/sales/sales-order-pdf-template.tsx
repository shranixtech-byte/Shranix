// ═════════════════════════════════════════════════════════
// SALES ORDER PDF TEMPLATE — professional A4
//
// Company logo · GSTIN · Order status · Items table · Tax
// totals · Terms & Conditions · Signature · Barcode of the
// order number. Pure HTML string → backend Puppeteer engine
// renders the exact same output for screen preview + PDF.
// ═════════════════════════════════════════════════════════

export interface SalesOrderPdfItemData {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  discountAmount: number;
  gstRate: number;
  taxableValue: number;
  totalAmount: number;
}

export interface SalesOrderPdfData {
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  status: string;
  isPartial: boolean;
  paymentTerms: string;
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
  signatureImage: string;
  invoiceFooter: string;
  customerName: string;
  customerGstin: string;
  customerMobile: string;
  customerEmail: string;
  billingAddress: string;
  shippingAddress: string;
  contactPerson: string;
  items: SalesOrderPdfItemData[];
  discountAmount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  gstTotal: number;
  roundOff: number;
  grandTotal: number;
  notes: string;
  terms: string;
  barcodeSvg: string;
}

const fmtINR = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) => {
  const [y, m, d] = (iso || '').split('T')[0].split('-');
  if (!y || !m || !d) {
    return iso || '—';
  }
  return `${d}/${m}/${y}`;
};

const statusLabel = (s: string) =>
  ({
    draft: 'DRAFT',
    confirmed: 'CONFIRMED',
    partial: 'PARTIAL',
    completed: 'COMPLETED',
    dispatched: 'DISPATCHED',
    cancelled: 'CANCELLED',
  })[s] || String(s || 'DRAFT').toUpperCase();

const statusColor = (s: string) =>
  ({
    draft: '#64748b',
    confirmed: '#059669',
    partial: '#d97706',
    completed: '#2563eb',
    dispatched: '#7c3aed',
    cancelled: '#dc2626',
  })[s] || '#64748b';

const esc = (s: string) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const SALES_ORDER_PDF_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; }
  .page { width: 210mm; min-height: 297mm; padding: 12mm 12mm 10mm; position: relative; background: #fff; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 8px; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo { max-height: 52px; max-width: 52px; object-fit: contain; border-radius: 8px; }
  .company-name { font-size: 20px; font-weight: 800; color: #065f46; letter-spacing: 0.3px; }
  .company-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #059669; }
  .doc-title .doc-no { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 3px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .meta-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
  .meta-box .k { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #94a3b8; }
  .meta-box .v { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  .status-pill { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
  .party { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .party-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
  .party-box .k { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #94a3b8; }
  .party-box .name { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }
  .party-box .detail { font-size: 10.5px; color: #475569; margin-top: 1px; }
  table.items { width: 100%; margin-top: 12px; border-collapse: collapse; }
  table.items th { background: #059669; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 6px; text-align: left; }
  table.items th.r, table.items td.r { text-align: right; }
  table.items th.c, table.items td.c { text-align: center; }
  table.items td { border-bottom: 1px solid #e2e8f0; padding: 7px 6px; font-size: 11px; vertical-align: top; }
  table.items tr:nth-child(even) td { background: #f8fafc; }
  .item-name { font-weight: 600; color: #0f172a; }
  .item-hsn { font-size: 9.5px; color: #94a3b8; margin-top: 1px; }
  .totals { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .totals-right { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .totals-right .tr { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 11.5px; border-bottom: 1px solid #f1f5f9; }
  .totals-right .tr .k { color: #64748b; }
  .totals-right .tr .v { font-weight: 600; color: #0f172a; }
  .totals-right .grand { background: #ecfdf5; font-weight: 800; font-size: 14px; border-bottom: none; }
  .totals-right .grand .k { color: #047857; }
  .totals-right .grand .v { color: #047857; }
  .notes-box { margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 10.5px; color: #475569; }
  .notes-box .k { font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #94a3b8; }
  .notes-box pre { white-space: pre-wrap; font-family: inherit; margin-top: 3px; }
  .footer { position: absolute; bottom: 10mm; left: 12mm; right: 12mm; display: flex; align-items: flex-end; justify-content: space-between; }
  .sig { text-align: center; }
  .sig img { max-height: 40px; max-width: 120px; object-fit: contain; }
  .sig .line { width: 150px; border-top: 1px solid #94a3b8; margin-top: 6px; }
  .sig .label { font-size: 10px; font-weight: 700; color: #64748b; margin-top: 3px; }
  .barcode { text-align: right; }
  .footer-note { font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center; }
`;

/** Single A4 Sales Order page. */
export function renderSalesOrderPdf(data: SalesOrderPdfData): string {
  const status = statusLabel(data.status);
  const color = statusColor(data.status);

  const itemsRows = (data.items || [])
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="item-name">${esc(it.description)}</div>
          ${it.hsn ? `<div class="item-hsn">HSN: ${esc(it.hsn)}</div>` : ''}
        </td>
        <td class="c">${Number(it.qty) || 0}</td>
        <td class="r">${fmtINR(it.rate)}</td>
        <td class="r">${it.discountAmount ? `− ${fmtINR(it.discountAmount)}` : '—'}</td>
        <td class="c">${Number(it.gstRate) || 0}%</td>
        <td class="r">${fmtINR(it.taxableValue)}</td>
        <td class="r">${fmtINR(it.totalAmount)}</td>
      </tr>`,
    )
    .join('');

  let gstRows =
    data.cgst > 0
      ? `<div class="tr"><span class="k">CGST</span><span class="v">${fmtINR(data.cgst)}</span></div>
         <div class="tr"><span class="k">SGST</span><span class="v">${fmtINR(data.sgst)}</span></div>`
      : '';
  if (data.igst > 0) {
    gstRows += `<div class="tr"><span class="k">IGST</span><span class="v">${fmtINR(data.igst)}</span></div>`;
  }

  return `
  <div class="page">
    <div class="header">
      <div class="header-left">
        ${data.companyLogo ? `<img class="logo" src="${esc(data.companyLogo)}" alt="logo"/>` : ''}
        <div>
          <div class="company-name">${esc(data.companyName)}</div>
          <div class="company-sub">${esc(data.companyAddress)}</div>
          <div class="company-sub">
            ${data.companyPhone ? `📞 ${esc(data.companyPhone)} · ` : ''}${data.companyEmail ? esc(data.companyEmail) : ''}
            ${data.companyGstin ? ` · GSTIN: ${esc(data.companyGstin)}` : ''}
          </div>
        </div>
      </div>
      <div class="doc-title">
        <h1>SALES ORDER</h1>
        <div class="doc-no">${esc(data.orderNumber)}</div>
        <div style="margin-top:4px;"><span class="status-pill" style="background:${color};">${status}</span></div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="k">Order Date</div>
        <div class="v">${fmtDate(data.orderDate)}</div>
      </div>
      <div class="meta-box">
        <div class="k">Delivery Date</div>
        <div class="v">${data.deliveryDate ? fmtDate(data.deliveryDate) : '—'}</div>
      </div>
      <div class="meta-box">
        <div class="k">Payment Terms</div>
        <div class="v">${esc(data.paymentTerms || '—')}</div>
      </div>
      <div class="meta-box">
        <div class="k">Order Type</div>
        <div class="v">${data.isPartial ? 'Partial Delivery Allowed' : 'Full Delivery'}</div>
      </div>
    </div>

    <div class="party">
      <div class="party-box">
        <div class="k">Sold To (Billing)</div>
        <div class="name">${esc(data.customerName || '—')}</div>
        ${data.customerGstin ? `<div class="detail">GSTIN: ${esc(data.customerGstin)}</div>` : ''}
        ${data.customerMobile ? `<div class="detail">📞 ${esc(data.customerMobile)}</div>` : ''}
        ${data.customerEmail ? `<div class="detail">✉️ ${esc(data.customerEmail)}</div>` : ''}
        <div class="detail">${esc(data.billingAddress)}</div>
      </div>
      <div class="party-box">
        <div class="k">Ship To</div>
        <div class="detail">${esc(data.shippingAddress || data.billingAddress || '—')}</div>
        ${data.contactPerson ? `<div class="detail">Contact: ${esc(data.contactPerson)}</div>` : ''}
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:26px;">#</th>
          <th>Item</th>
          <th class="c" style="width:50px;">Qty</th>
          <th class="r" style="width:70px;">Rate</th>
          <th class="r" style="width:70px;">Disc</th>
          <th class="c" style="width:55px;">GST%</th>
          <th class="r" style="width:80px;">Taxable</th>
          <th class="r" style="width:85px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="8" class="c" style="color:#94a3b8;">No items</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="notes-box">
        ${data.notes ? `<div class="k">Notes</div><pre>${esc(data.notes)}</pre>` : ''}
        ${data.terms ? `<div class="k" style="margin-top:6px;">Terms &amp; Conditions</div><pre>${esc(data.terms)}</pre>` : ''}
      </div>
      <div class="totals-right">
        <div class="tr"><span class="k">Item Total</span><span class="v">${fmtINR(data.taxable + data.discountAmount)}</span></div>
        <div class="tr"><span class="k">Discount</span><span class="v">− ${fmtINR(data.discountAmount)}</span></div>
        <div class="tr"><span class="k">Taxable Amount</span><span class="v">${fmtINR(data.taxable)}</span></div>
        ${gstRows}
        <div class="tr"><span class="k">GST Total</span><span class="v">${fmtINR(data.gstTotal)}</span></div>
        <div class="tr"><span class="k">Round Off</span><span class="v">${fmtINR(data.roundOff)}</span></div>
        <div class="tr grand"><span class="k">Grand Total</span><span class="v">${fmtINR(data.grandTotal)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="barcode">
        ${data.barcodeSvg ? `<div>${data.barcodeSvg}</div>` : ''}
        <div class="footer-note">${esc(data.invoiceFooter || 'Thank you for your business!')}</div>
      </div>
      <div class="sig">
        ${data.signatureImage ? `<img src="${esc(data.signatureImage)}" alt="signature"/>` : ''}
        <div class="line"></div>
        <div class="label">Authorised Signatory</div>
      </div>
    </div>
  </div>`;
}

/** Wrap a rendered page into a full HTML document with print CSS. */
export function wrapSalesOrderDocument(pageHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Sales Order</title>
  <style>${SALES_ORDER_PDF_CSS}</style>
</head>
<body>${pageHtml}</body>
</html>`;
}
