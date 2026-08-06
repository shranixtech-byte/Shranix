import {
  renderSalesOrderPdf,
  wrapSalesOrderDocument,
  type SalesOrderPdfData,
  type SalesOrderPdfItemData,
} from '@/pages/sales/sales-order-pdf-template';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob, generateInvoicePdf } from '@/services/invoice-pdf.service';

// ═════════════════════════════════════════════════════════
// SALES ORDER PDF SERVICE
// Order + customer + company data load karke HTML build karta
// hai, phir existing backend Puppeteer engine (`/pdf/generate`)
// se PDF buffer download hota hai — invoice/quotation ke saath
// ek hi engine, isliye Devanagari/Marathi bhi sahi render.
// ═════════════════════════════════════════════════════════

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

/** Code-39 barcode SVG of the order number (digits/letters only). */
function code39Svg(text: string): string {
  const digits = String(text || '').replace(/[^0-9A-Za-z-]/g, '');
  if (!digits) {
    return '';
  }
  const MAP: Record<string, string> = {
    '0': '101001101101',
    '1': '110100101011',
    '2': '101100101011',
    '3': '110110010101',
    '4': '101001101011',
    '5': '110101001101',
    '6': '101101001011',
    '7': '110100110101',
    '8': '101100110101',
    '9': '110110011001',
    A: '101001100101',
    B: '110100110011',
    C: '101100110011',
    D: '110101001101',
    E: '101001101001',
    F: '110100101101',
    G: '101100101101',
    H: '110101100011',
    I: '101101100011',
    J: '110011001011',
    K: '100110010101',
    L: '110011010011',
    M: '100110110011',
    N: '110101100101',
    O: '100110101101',
    P: '110011011001',
    Q: '100110110101',
    R: '100110101011',
    S: '110011001101',
    T: '100110011011',
    U: '100110010011',
    V: '110011010101',
    W: '100110110101',
    X: '110101101001',
    Y: '100110101101',
    Z: '110011010011',
    '-': '100101101101',
  };
  let bits = '100101101101';
  for (const ch of digits.toUpperCase()) {
    bits += MAP[ch] || '101001101101';
    bits += '0';
  }
  bits += '100101101101';
  const barW = 1;
  const total = bits.length * barW;
  let x = 0;
  let bars = '';
  for (const bit of bits) {
    if (bit === '1') {
      bars += `<rect x="${x}" y="0" width="${barW}" height="34" fill="#1e293b"/>`;
    }
    x += barW;
  }
  return `<svg width="${total}" height="40" viewBox="0 0 ${total} 40" xmlns="http://www.w3.org/2000/svg"><g>${bars}</g><text x="0" y="38" font-size="9" fill="#334155" font-family="monospace">${String(
    text || '',
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</text></svg>`;
}

/** Load every ingredient and return the rendered order data. */
export async function loadSalesOrderPdfData(
  orderId: string,
): Promise<{ data: SalesOrderPdfData; orderNumber: string }> {
  // 1. Order (with items)
  const o = await apiRequest<unknown>(`/sales/orders/${orderId}`);
  const order = pickRecord<Record<string, any>>(o, {}) as Record<string, any>;

  // 2. Customer
  let customer: Record<string, any> = {};
  if (order.customerId) {
    try {
      const c = await apiRequest<unknown>(`/customers/${order.customerId}`);
      customer = pickRecord<Record<string, any>>(c, {}) as Record<string, any>;
    } catch {
      /* non-fatal */
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

  // 4. Items mapping
  const items: SalesOrderPdfItemData[] = (Array.isArray(order.items) ? order.items : []).map(
    (it: any) => ({
      description: it.description || it.itemName || '',
      hsn: it.hsnCode || '',
      qty: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      discountAmount: Number(it.discountAmount) || 0,
      gstRate: Number(it.gstRate) || 0,
      taxableValue: Number(it.taxableValue) || 0,
      totalAmount: Number(it.totalAmount) || 0,
    }),
  );

  const companyName = String(company.name || 'Company');
  const companyAddress = [company.address, company.city, company.state, company.pincode]
    .filter((p): p is string => Boolean(p))
    .join(', ');

  const gstTotal = Number(order.taxAmount) || 0;

  const pdfData: SalesOrderPdfData = {
    orderNumber: String(order.orderNumber || ''),
    orderDate: String(order.orderDate || ''),
    deliveryDate: String(order.deliveryDate || ''),
    status: String(order.status || 'draft'),
    isPartial: Boolean(order.isPartial),
    paymentTerms: String(order.paymentTerms || ''),
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
    billingAddress: String(order.billingAddress || customer.address || ''),
    shippingAddress: String(order.shippingAddress || ''),
    contactPerson: String(order.contactPerson || customer.contactPerson || ''),
    items,
    discountAmount: Number(order.discountAmount) || 0,
    taxable: Number(order.subTotal) || 0,
    cgst: Number(order.cgstTotal) || 0,
    sgst: Number(order.sgstTotal) || 0,
    igst: Number(order.igstTotal) || 0,
    cess: Number(order.cessTotal) || 0,
    gstTotal,
    roundOff: Number(order.roundOff) || 0,
    grandTotal: Number(order.grandTotal) || 0,
    notes: String(order.notes || ''),
    terms: String(order.terms || ''),
    barcodeSvg: order.orderNumber ? code39Svg(String(order.orderNumber)) : '',
  };

  return { data: pdfData, orderNumber: String(order.orderNumber || '') };
}

/** Standalone HTML document for the PDF engine / preview. */
export async function buildSalesOrderPdfHtml(orderId: string): Promise<string> {
  const { data } = await loadSalesOrderPdfData(orderId);
  return wrapSalesOrderDocument(renderSalesOrderPdf(data));
}

/** Generate the sales-order PDF via the backend engine. */
export async function generateSalesOrderPdfBlob(orderId: string): Promise<Blob> {
  const html = await buildSalesOrderPdfHtml(orderId);
  return generateInvoicePdf({ html });
}

/** Generate the PDF and download it. */
export async function downloadSalesOrderPdf(orderId: string): Promise<void> {
  const blob = await generateSalesOrderPdfBlob(orderId);
  const { orderNumber } = await loadSalesOrderPdfData(orderId);
  downloadPdfBlob(blob, `${String(orderNumber || 'order')}.pdf`);
}
