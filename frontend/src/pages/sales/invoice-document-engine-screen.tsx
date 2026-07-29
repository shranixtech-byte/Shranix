import {
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Clock,
  Download,
  Eye,
  Link,
  Loader2,
  Mail,
  MessageSquare,
  Printer,
  QrCode,
  RotateCcw,
  Save,
  Send,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type DocTemplate = 'tax_invoice' | 'retail_invoice' | 'estimate' | 'quotation' | 'delivery_challan' | 'proforma';
export type PrintLayout = 'a4_portrait' | 'a4_landscape' | 'thermal_58' | 'thermal_80' | 'dot_matrix' | 'continuous' | 'label';
export type InvoiceTemplate = 'classic' | 'modern' | 'enterprise' | 'minimal' | 'agriculture';

interface PaymentSplitData {
  method: string;
  amount: number;
  refNo: string;
  bankName: string;
}

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

const DOC_TEMPLATES: { value: DocTemplate; label: string; icon: string }[] = [
  { value: 'tax_invoice', label: 'Tax Invoice', icon: '📄' },
  { value: 'retail_invoice', label: 'Retail Invoice', icon: '🧾' },
  { value: 'estimate', label: 'Estimate', icon: '📋' },
  { value: 'quotation', label: 'Quotation', icon: '📝' },
  { value: 'delivery_challan', label: 'Delivery Challan', icon: '🚚' },
  { value: 'proforma', label: 'Proforma Invoice', icon: '📑' },
];

const PRINT_LAYOUTS: { value: PrintLayout; label: string; icon: string }[] = [
  { value: 'a4_portrait', label: 'A4 Portrait', icon: '📄' },
  { value: 'a4_landscape', label: 'A4 Landscape', icon: '📄' },
  { value: 'thermal_58', label: 'Thermal 58mm', icon: '🧾' },
  { value: 'thermal_80', label: 'Thermal 80mm', icon: '🧾' },
  { value: 'dot_matrix', label: 'Dot Matrix', icon: '🖨️' },
  { value: 'continuous', label: 'Continuous Paper', icon: '📃' },
  { value: 'label', label: 'Label Printing', icon: '🏷️' },
];

const INVOICE_STYLES: { value: InvoiceTemplate; label: string; desc: string }[] = [
  { value: 'classic', label: 'Classic', desc: 'Traditional blue theme' },
  { value: 'modern', label: 'Modern', desc: 'Clean gradient design' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Professional corporate' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple & elegant' },
  { value: 'agriculture', label: 'Agriculture', desc: 'Green agri theme' },
];

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ═════════════════════════════════════════════════════════
// QR CODE SVG
// ═════════════════════════════════════════════════════════

function QrCodeSvg({ data, size = 80 }: { data: string; size?: number }) {
  // Simplified QR-code-like SVG pattern based on data hash
  const hash = data.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const blocks: boolean[][] = [];
  const dim = 11;
  for (let y = 0; y < dim; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < dim; x++) {
      const val = (hash * (x + 1) * (y + 1) + x * y) % 3 !== 0;
      row.push(val);
    }
    blocks.push(row);
  }
  const blockSize = size / dim;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx={4} />
      {blocks.map((row, y) =>
        row.map((v, x) =>
          v ? (
            <rect
              key={`${x}-${y}`}
              x={x * blockSize}
              y={y * blockSize}
              width={blockSize}
              height={blockSize}
              fill="#0F172A"
            />
          ) : null,
        ),
      )}
      {/* Corner patterns */}
      <rect x={0} y={0} width={blockSize * 3} height={blockSize * 3} fill="#0F172A" rx={2} />
      <rect x={blockSize} y={blockSize} width={blockSize} height={blockSize} fill="white" />
      <rect x={size - blockSize * 3} y={0} width={blockSize * 3} height={blockSize * 3} fill="#0F172A" rx={2} />
      <rect x={size - blockSize * 2} y={blockSize} width={blockSize} height={blockSize} fill="white" />
      <rect x={0} y={size - blockSize * 3} width={blockSize * 3} height={blockSize * 3} fill="#0F172A" rx={2} />
      <rect x={blockSize} y={size - blockSize * 2} width={blockSize} height={blockSize} fill="white" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════
// BARCODE SVG
// ═════════════════════════════════════════════════════════

function BarcodeSvg({ code, width = 200 }: { code: string; width?: number }) {
  const bars = code.split('').map((c) => c.charCodeAt(0) % 4 + 1);
  const totalBars = bars.reduce((s, b) => s + b, 0);
  const unitW = width / totalBars;
  let x = 0;
  return (
    <svg width={width} height={40} viewBox={`0 0 ${width} 40`}>
      {bars.map((b, i) => {
        const bar = (
          <rect
            key={i}
            x={x}
            y={0}
            width={b * unitW}
            height={32}
            fill={i % 2 === 0 ? '#0F172A' : 'white'}
          />
        );
        x += b * unitW;
        return bar;
      })}
      <text x={width / 2} y={38} textAnchor="middle" fontSize={9} fill="#64748B">
        {code}
      </text>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════
// INVOICE PREVIEW
// ═════════════════════════════════════════════════════════

interface InvoicePreviewProps {
  template: InvoiceTemplate;
  docType: DocTemplate;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  billingAddress: string;
  customerGstin: string;
  placeOfSupply: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  paymentSplits: PaymentSplitData[];
  isInterState: boolean;
  salesPerson: string;
  notes: string;
  showLogo: boolean;
  showGst: boolean;
  showSignature: boolean;
  showBankDetails: boolean;
  zoom: number;
  pageMargins: number;
  pageFontSize: number;
}

const THEME_COLORS: Record<InvoiceTemplate, { primary: string; accent: string; bg: string; header: string }> = {
  classic: { primary: '#1E40AF', accent: '#3B82F6', bg: '#FFFFFF', header: '#EFF6FF' },
  modern: { primary: '#059669', accent: '#10B981', bg: '#FFFFFF', header: 'linear-gradient(135deg, #059669, #10B981)' },
  enterprise: { primary: '#1E293B', accent: '#334155', bg: '#FFFFFF', header: '#1E293B' },
  minimal: { primary: '#0F172A', accent: '#1E293B', bg: '#FFFFFF', header: '#F8FAFC' },
  agriculture: { primary: '#166534', accent: '#22C55E', bg: '#F0FDF4', header: 'linear-gradient(135deg, #166534, #22C55E)' },
};

const InvoicePreview = memo(function InvoicePreview({
  template, docType, invoiceNumber, invoiceDate, dueDate,
  customerName, billingAddress, customerGstin, placeOfSupply,
  items, grossTotal, itemDiscountTotal, taxableAfterDiscount,
  cgstTotal, sgstTotal, igstTotal, cessTotal, roundOff, grandTotal,
  totalPaid, balance, paymentSplits, isInterState,
  salesPerson, notes, showLogo, showGst, showSignature, showBankDetails, zoom,
  pageMargins, pageFontSize,
}: InvoicePreviewProps) {
  const theme = THEME_COLORS[template];
  const paymentMode = paymentSplits.map((p) => p.method.replace(/_/g, ' ')).join(', ') || '—';
  const companyName = 'Shranix Krushi ERP';
  const companyAddress = '123 Business Hub, MG Road, Pune, Maharashtra 411001';
  const companyGstin = '27AABCU9603R1ZM';
  const companyPan = 'AABCU9603R';
  const companyState = 'MH';

  const qrData = `INV:${invoiceNumber}|CUST:${customerName}|AMT:${formatINR(grandTotal)}|PAID:${paymentSplits.length > 0 ? 'Yes' : 'No'}|UPI:shranix@upi`;

  const docTitle = DOC_TEMPLATES.find((t) => t.value === docType)?.label || 'Tax Invoice';

  // Get bank details based on payment method
  const displayBankDetails = showBankDetails && paymentSplits.some((p) =>
    ['bank_transfer', 'neft', 'rtgs', 'imps', 'cheque'].includes(p.method),
  );

  return (
    <div
      id="invoice-preview"
      className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: zoom < 100 ? `${100 / zoom * 100}%` : undefined }}
    >
      {/* A4 PAGE */}
      <div className="mx-auto w-[210mm] min-h-[297mm] bg-white text-slate-800 print:shadow-none"
        style={{
          backgroundColor: theme.bg,
          padding: `${pageMargins}mm`,
          fontSize: `${pageFontSize}px`,
        }}>
        {/* HEADER */}
        <div className="flex items-start justify-between pb-4 mb-4"
          style={{ borderBottom: `2px solid ${theme.primary}` }}>
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.primary }}>
                <span className="text-xl font-bold text-white">SK</span>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold" style={{ color: theme.primary }}>{companyName}</h1>
              <p className="text-[9px] text-slate-500">{companyAddress}</p>
              {showGst && <p className="text-[8px] text-slate-400">GST: {companyGstin} | PAN: {companyPan}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: theme.primary }}>{docTitle}</h2>
            <p className="mt-1 text-[9px] text-slate-500">Invoice #: <span className="font-semibold text-slate-800">{invoiceNumber}</span></p>
            <p className="text-[9px] text-slate-500">Date: {formatDate(invoiceDate)}</p>
            {dueDate && <p className="text-[9px] text-slate-500">Due: {formatDate(dueDate)}</p>}
          </div>
        </div>

        {/* BILLING & SHIPPING */}
        <div className="mb-4 grid grid-cols-2 gap-4 text-[9px]">
          <div>
            <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">Bill To</p>
            <p className="font-semibold text-slate-800">{customerName}</p>
            <p className="text-slate-500">{billingAddress || '—'}</p>
            {showGst && customerGstin && <p className="text-slate-400">GSTIN: {customerGstin}</p>}
            <p className="text-slate-400">State: {placeOfSupply}</p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">Ship To</p>
            <p className="font-semibold text-slate-800">{customerName}</p>
            <p className="text-slate-500">{billingAddress || '—'}</p>
            {showGst && <p className="text-slate-400">Same as Billing</p>}
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-4">
          <table className="w-full text-[8px]">
            <thead>
              <tr style={{ backgroundColor: theme.primary }}>
                <th className="px-2 py-2 text-left text-[7px] font-bold uppercase tracking-wider text-white">#</th>
                <th className="px-2 py-2 text-left text-[7px] font-bold uppercase tracking-wider text-white">Product</th>
                <th className="px-2 py-2 text-center text-[7px] font-bold uppercase tracking-wider text-white">HSN</th>
                <th className="px-2 py-2 text-center text-[7px] font-bold uppercase tracking-wider text-white">Qty</th>
                <th className="px-2 py-2 text-right text-[7px] font-bold uppercase tracking-wider text-white">Rate</th>
                <th className="px-2 py-2 text-right text-[7px] font-bold uppercase tracking-wider text-white">Disc</th>
                <th className="px-2 py-2 text-right text-[7px] font-bold uppercase tracking-wider text-white">GST</th>
                <th className="px-2 py-2 text-right text-[7px] font-bold uppercase tracking-wider text-white">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <p className="font-medium text-slate-700">{item.productName}</p>
                    <p className="text-[7px] text-slate-400">{item.sku}</p>
                  </td>
                  <td className="px-2 py-1.5 text-center text-slate-500">{item.hsn || '—'}</td>
                  <td className="px-2 py-1.5 text-center text-slate-700">{item.quantity} {item.uom}</td>
                  <td className="px-2 py-1.5 text-right text-slate-700">{formatINR(item.rate)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-500">{item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{item.gstPercent}%</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-800">{formatINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="mb-4 flex justify-end">
          <div className="w-64 space-y-1 text-[9px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Total:</span>
              <span className="font-medium text-slate-700">{formatINR(grossTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Item Discount:</span>
              <span className="font-medium text-red-600">{formatINR(itemDiscountTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Taxable Amount:</span>
              <span className="font-medium text-slate-700">{formatINR(taxableAfterDiscount)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between">
                <span className="text-slate-500">IGST:</span>
                <span className="font-medium text-purple-600">{formatINR(igstTotal)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">CGST:</span>
                  <span className="font-medium text-blue-600">{formatINR(cgstTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SGST:</span>
                  <span className="font-medium text-blue-600">{formatINR(sgstTotal)}</span>
                </div>
              </>
            )}
            {cessTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">CESS:</span>
                <span className="font-medium text-orange-600">{formatINR(cessTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Round Off:</span>
              <span className={cn('font-medium', Math.abs(roundOff) < 0.01 ? 'text-slate-400' : roundOff < 0 ? 'text-red-500' : 'text-emerald-500')}>
                {roundOff.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-1" style={{ borderColor: theme.primary }}>
              <span className="text-[10px] font-bold text-slate-700">Grand Total:</span>
              <span className="text-sm font-bold" style={{ color: theme.primary }}>{formatINR(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-[8px] text-slate-400">
              <span>Paid:</span>
              <span className="font-medium text-emerald-600">{formatINR(totalPaid)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-[8px] text-slate-400">
                <span>Balance:</span>
                <span className="font-medium text-amber-600">{formatINR(balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* PAYMENT DETAILS */}
        {paymentSplits.length > 0 && (
          <div className="mb-3 text-[8px]">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Payment Details</p>
            {paymentSplits.map((p, i) => (
              <p key={i} className="text-slate-500">
                {p.method.replace(/_/g, ' ')}: {formatINR(p.amount)}
                {p.refNo ? ` (Ref: ${p.refNo})` : ''}
                {p.bankName ? ` — ${p.bankName}` : ''}
              </p>
            ))}
            <p className="text-slate-400">Payment Mode: {paymentMode}</p>
          </div>
        )}

        {/* BANK DETAILS */}
        {displayBankDetails && (
          <div className="mb-3 rounded border border-dashed border-slate-200 p-2 text-[8px]">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Bank Details</p>
            <p className="text-slate-500">Bank: HDFC Bank | Branch: MG Road, Pune</p>
            <p className="text-slate-500">A/C: 50200012345678 | IFSC: HDFC0000123</p>
            <p className="text-slate-500">UPI: shranix@upi | QR: Scan to Pay</p>
          </div>
        )}

        {/* NOTES & TERMS */}
        <div className="mb-3 text-[8px]">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
          <p className="text-slate-500">{notes || 'Thank you for your business!'}</p>
          {salesPerson && <p className="text-slate-400 mt-1">Sales Person: {salesPerson}</p>}
        </div>

        {/* SIGNATURE */}
        {showSignature && (
          <div className="mt-6 flex justify-end">
            <div className="text-center">
              <div className="mb-1 h-10 w-32 border-b border-slate-300" />
              <p className="text-[8px] text-slate-500">Authorised Signatory</p>
            </div>
          </div>
        )}

        {/* QR + BARCODE FOOTER */}
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <QrCodeSvg data={qrData} size={56} />
            <p className="mt-0.5 text-[6px] text-slate-400">Scan to verify</p>
          </div>
          <div className="text-right">
            <BarcodeSvg code={invoiceNumber} width={160} />
            <p className="text-[6px] text-slate-400 mt-0.5">{invoiceNumber}</p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-4 text-center text-[7px] text-slate-400">
          <p>This is a computer-generated {docTitle.toLowerCase()} | Generated on {new Date().toLocaleString('en-IN')}</p>
          <p className="text-[6px] text-slate-300">Subject to {companyState} jurisdiction</p>
        </div>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// EMAIL FORM
// ═════════════════════════════════════════════════════════

function EmailForm({ invoiceNumber }: { invoiceNumber: string }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber} from Shranix Krushi ERP`);
  const [message, setMessage] = useState('Please find attached the invoice. Thank you for your business!');
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(() => {
    if (!to) return;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }, [to]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">To *</label>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
          placeholder="customer@email.com"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">CC</label>
          <input type="email" value={cc} onChange={(e) => setCc(e.target.value)}
            placeholder="cc@email.com"
            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">BCC</label>
          <input type="email" value={bcc} onChange={(e) => setBcc(e.target.value)}
            placeholder="bcc@email.com"
            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={handleSend} disabled={!to}>
          {sent ? '✓ Sent' : 'Send Invoice'}
        </Button>
        <span className="text-[10px] text-slate-400">* Includes PDF attachment</span>
      </div>
      {sent && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ Invoice will be sent. Delivery status: Pending (backend integration required)
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// WHATSAPP FORM
// ═════════════════════════════════════════════════════════

function WhatsAppForm({ invoiceNumber }: { invoiceNumber: string }) {
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState(`Dear Customer,\n\nPlease find your invoice ${invoiceNumber} attached.\n\nTotal Amount: ₹—\n\nThank you for your business!\nShranix Krushi ERP`);
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(() => {
    if (!mobile) return;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }, [mobile]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Customer Mobile *</label>
        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)}
          placeholder="+91 9876543210"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" />
      </div>
      <div className="space-x-2">
        <Button variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => handleSend()} disabled={!mobile}>
          {sent ? '✓ Sent' : 'Send PDF'}
        </Button>
        <Button variant="secondary" size="sm" icon={<Link className="h-3.5 w-3.5" />} disabled={!mobile}>
          Send Link
        </Button>
        <Button variant="secondary" size="sm" icon={<QrCode className="h-3.5 w-3.5" />} disabled={!mobile}>
          Payment Link
        </Button>
      </div>
      {sent && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ WhatsApp message queued. Delivery status: Pending (backend integration required)
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PRINT SETTINGS PANEL
// ═════════════════════════════════════════════════════════

interface PrintSettingsProps {
  margins: number;
  setMargins: (v: number) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  showLogo: boolean;
  setShowLogo: (v: boolean) => void;
  showGst: boolean;
  setShowGst: (v: boolean) => void;
  showSignature: boolean;
  setShowSignature: (v: boolean) => void;
  showBankDetails: boolean;
  setShowBankDetails: (v: boolean) => void;
}

function PrintSettingsPanel({
  margins, setMargins, fontSize, setFontSize,
  showLogo, setShowLogo, showGst, setShowGst,
  showSignature, setShowSignature, showBankDetails, setShowBankDetails,
}: PrintSettingsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Margins (mm)</label>
        <input type="range" min="5" max="25" value={margins} onChange={(e) => setMargins(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-500" />
        <span className="text-[10px] text-slate-400">{margins}mm</span>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Font Size</label>
        <input type="range" min="8" max="14" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-500" />
        <span className="text-[10px] text-slate-400">{fontSize}px</span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: 'Show Logo', value: showLogo, set: setShowLogo },
          { label: 'Show GST Details', value: showGst, set: setShowGst },
          { label: 'Show Signature', value: showSignature, set: setShowSignature },
          { label: 'Show Bank Details', value: showBankDetails, set: setShowBankDetails },
        ].map((opt) => (
          <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={opt.value} onChange={(e) => opt.set(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 accent-emerald-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// AUDIT HISTORY
// ═════════════════════════════════════════════════════════

interface AuditEntry {
  action: string;
  type: 'print' | 'email' | 'whatsapp' | 'pdf';
  timestamp: string;
  detail: string;
}

function AuditHistory({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-1.5 max-h-48 overflow-auto">
      {entries.length === 0 && (
        <p className="py-6 text-center text-[10px] text-slate-400">No history yet</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
          {entry.type === 'print' && <Printer className="h-3 w-3 text-slate-400" />}
          {entry.type === 'email' && <Mail className="h-3 w-3 text-blue-400" />}
          {entry.type === 'whatsapp' && <MessageSquare className="h-3 w-3 text-emerald-400" />}
          {entry.type === 'pdf' && <Download className="h-3 w-3 text-purple-400" />}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
              {entry.action}
            </p>
            <p className="text-[8px] text-slate-400">{entry.detail}</p>
          </div>
          <span className="shrink-0 text-[8px] text-slate-400">{entry.timestamp}</span>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TEMPLATE THUMBNAIL
// ═════════════════════════════════════════════════════════

function TemplateThumbnail({ template, active, onClick }: {
  template: typeof INVOICE_STYLES[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}>
      <div className={cn(
        'h-10 w-full rounded-md',
        template.value === 'classic' && 'bg-blue-100',
        template.value === 'modern' && 'bg-gradient-to-r from-emerald-200 to-emerald-100',
        template.value === 'enterprise' && 'bg-slate-200',
        template.value === 'minimal' && 'bg-slate-50',
        template.value === 'agriculture' && 'bg-green-100',
      )} />
      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">{template.label}</span>
      <span className="text-[7px] text-slate-400">{template.desc}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════
// DOCUMENT LAYOUT OPTION
// ═════════════════════════════════════════════════════════

function LayoutOption({ layout, active, onClick }: {
  layout: typeof PRINT_LAYOUTS[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}>
      <span className="text-base">{layout.icon}</span>
      <span className="font-medium text-slate-700 dark:text-slate-300">{layout.label}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════

export interface InvoiceDocumentEngineScreenProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  billingAddress: string;
  salesPerson: string;
  notes: string;
  paymentTerms: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  customerGstin: string;
  paymentSplits: PaymentSplitData[];
  isInterState: boolean;
  onBack: () => void;
  onComplete: () => void;
}

export function InvoiceDocumentEngineScreen({
  customerName, invoiceNumber, invoiceDate, dueDate,
  placeOfSupply, billingAddress, salesPerson, notes,
  items, grossTotal, itemDiscountTotal, taxableAfterDiscount,
  cgstTotal, sgstTotal, igstTotal, cessTotal, roundOff, grandTotal,
  totalPaid, balance, customerGstin, paymentSplits, isInterState,
  onBack, onComplete,
}: InvoiceDocumentEngineScreenProps) {
  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'preview' | 'email' | 'whatsapp' | 'settings' | 'audit'>('preview');
  const [docType, setDocType] = useState<DocTemplate>('tax_invoice');
  const [printLayout, setPrintLayout] = useState<PrintLayout>('a4_portrait');
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>('classic');
  const [zoom, setZoom] = useState(70);
  const [showPreview, setShowPreview] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Print settings
  const [margins, setMargins] = useState(10);
  const [fontSize, setFontSize] = useState(10);
  const [showLogo, setShowLogo] = useState(true);
  const [showGst, setShowGst] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);

  // Audit history
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  // Copy link state
  const [copied, setCopied] = useState(false);

  const addAuditEntry = useCallback((action: string, type: AuditEntry['type'], detail: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setAuditEntries((prev) => [{ action, type, timestamp, detail }, ...prev]);
  }, []);

  // ── Handlers ──────────────────────────────────────
  const handlePrint = useCallback(() => {
    window.print();
    addAuditEntry('Printed invoice', 'print', `Layout: ${printLayout}`);
  }, [printLayout, addAuditEntry]);

  const handleDownloadPdf = useCallback(() => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      addAuditEntry('PDF Downloaded', 'pdf', `Template: ${invoiceTemplate}`);
      // In production, use html2pdf or backend PDF generation
      window.print();
    }, 800);
  }, [invoiceTemplate, addAuditEntry]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Keyboard Shortcuts ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey && !e.shiftKey) { e.preventDefault(); handlePrint(); }
      else if (e.key === 'p' && e.ctrlKey && e.shiftKey) { e.preventDefault(); handleDownloadPdf(); }
      else if (e.key === 'e' && e.ctrlKey) { e.preventDefault(); setActiveTab('email'); }
      else if (e.key === 'w' && e.ctrlKey) { e.preventDefault(); setActiveTab('whatsapp'); }
      else if (e.key === 'Escape') { onBack(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrint, handleDownloadPdf, onBack]);

  // ── Render ────────────────────────────────────────
  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Document & Communication Engine</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Print, PDF, Email, WhatsApp, and more</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Check className="h-4 w-4" />} onClick={onComplete}>
            Finish
          </Button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT SIDEBAR — Options */}
        <div className="w-72 shrink-0 overflow-auto border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          {/* Tab Navigation */}
          <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {([
              { key: 'preview' as const, label: 'Preview', icon: <Eye className="h-3.5 w-3.5" /> },
              { key: 'email' as const, label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
              { key: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { key: 'settings' as const, label: 'Settings', icon: <Settings className="h-3.5 w-3.5" /> },
              { key: 'audit' as const, label: 'History', icon: <Clock className="h-3.5 w-3.5" /> },
            ] as const).map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Document Type */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Document Type</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DOC_TEMPLATES.map((dt) => (
                    <DocTypeButton key={dt.value} dt={dt} active={docType === dt.value} onClick={() => setDocType(dt.value)} />
                  ))}
                </div>
              </div>

              {/* Print Layout */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Print Layout</p>
                <div className="space-y-1">
                  {PRINT_LAYOUTS.map((pl) => (
                    <LayoutOption key={pl.value} layout={pl} active={printLayout === pl.value} onClick={() => setPrintLayout(pl.value)} />
                  ))}
                </div>
              </div>

              {/* Invoice Styles */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Invoice Template</p>
                <div className="grid grid-cols-3 gap-2">
                  {INVOICE_STYLES.map((st) => (
                    <TemplateThumbnail key={st.value} template={st} active={invoiceTemplate === st.value} onClick={() => setInvoiceTemplate(st.value)} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-600">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionBtn label="Print" sub="Ctrl+P" icon={<Printer className="h-3.5 w-3.5" />} onClick={handlePrint} />
                  <ActionBtn label={pdfGenerating ? 'Generating...' : 'Download PDF'} sub="Ctrl+Shift+P" icon={pdfGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} onClick={handleDownloadPdf} />
                  <ActionBtn label={copied ? 'Copied!' : 'Copy Link'} sub="" icon={<ClipboardCopy className="h-3.5 w-3.5" />} onClick={handleCopyLink} />
                  <ActionBtn label="Save as Template" sub="" icon={<Save className="h-3.5 w-3.5" />} onClick={() => addAuditEntry('Template saved', 'pdf', `Template: ${invoiceTemplate}`)} />
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-600">
                <button type="button" onClick={() => setZoom((z) => Math.max(30, z - 10))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="min-w-[40px] text-center text-[10px] font-medium text-slate-500">{zoom}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
                  <ZoomIn className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => setZoom(70)}
                  className="ml-auto flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[9px] text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">
                  <RotateCcw className="h-3 w-3" /> Fit
                </button>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Send Invoice via Email</p>
              <EmailForm invoiceNumber={invoiceNumber} />
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Send via WhatsApp</p>
              <WhatsAppForm invoiceNumber={invoiceNumber} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Print Settings</p>
              <PrintSettingsPanel
                margins={margins} setMargins={setMargins}
                fontSize={fontSize} setFontSize={setFontSize}
                showLogo={showLogo} setShowLogo={setShowLogo}
                showGst={showGst} setShowGst={setShowGst}
                showSignature={showSignature} setShowSignature={setShowSignature}
                showBankDetails={showBankDetails} setShowBankDetails={setShowBankDetails}
              />
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Communication History</p>
              <AuditHistory entries={auditEntries} />
            </div>
          )}
        </div>

        {/* RIGHT — Preview Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-500">
                {DOC_TEMPLATES.find((t) => t.value === docType)?.label}
              </span>
              <span className="text-[8px] text-slate-300">|</span>
              <span className="text-[10px] text-slate-400">{PRINT_LAYOUTS.find((l) => l.value === printLayout)?.label}</span>
              <span className="text-[8px] text-slate-300">|</span>
              <span className="text-[10px] text-slate-400">{INVOICE_STYLES.find((s) => s.value === invoiceTemplate)?.label}</span>
            </div>
            <button type="button" onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[9px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700">
              {showPreview ? <X className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          {/* Preview Scroll Area */}
          {showPreview && (
            <div className="flex-1 overflow-auto bg-slate-100 p-6 dark:bg-slate-900/50">
              <div className="mx-auto" style={{ maxWidth: '210mm' }}>
                <InvoicePreview
                  template={invoiceTemplate}
                  docType={docType}
                  invoiceNumber={invoiceNumber}
                  invoiceDate={invoiceDate}
                  dueDate={dueDate}
                  customerName={customerName}
                  billingAddress={billingAddress}
                  customerGstin={customerGstin}
                  placeOfSupply={placeOfSupply}
                  items={items}
                  grossTotal={grossTotal}
                  itemDiscountTotal={itemDiscountTotal}
                  taxableAfterDiscount={taxableAfterDiscount}
                  cgstTotal={cgstTotal}
                  sgstTotal={sgstTotal}
                  igstTotal={igstTotal}
                  cessTotal={cessTotal}
                  roundOff={roundOff}
                  grandTotal={grandTotal}
                  totalPaid={totalPaid}
                  balance={balance}
                  paymentSplits={paymentSplits}
                  isInterState={isInterState}
                  salesPerson={salesPerson}
                  notes={notes}
                  showLogo={showLogo}
                  showGst={showGst}
                  showSignature={showSignature}
                  showBankDetails={showBankDetails}
                  zoom={zoom}
                  pageMargins={margins}
                  pageFontSize={fontSize}
                />
              </div>
            </div>
          )}

          {!showPreview && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Preview hidden — use the sidebar to configure and take actions
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
          <span>Ctrl+P Print</span>
          <span>Ctrl+Shift+P PDF</span>
          <span>Ctrl+E Email</span>
          <span>Ctrl+W WhatsApp</span>
          <span>Esc Back</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={handlePrint}>
            Print
          </Button>
          <Button variant="secondary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={handleDownloadPdf}>
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MINI COMPONENTS
// ═════════════════════════════════════════════════════════

function DocTypeButton({ dt, active, onClick }: {
  dt: typeof DOC_TEMPLATES[0]; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-[10px] transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}>
      <span>{dt.icon}</span>
      <span className="font-medium text-slate-700 dark:text-slate-300">{dt.label}</span>
    </button>
  );
}

function ActionBtn({ label, sub, icon, onClick }: {
  label: string; sub?: string; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700">
      {icon}
      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {sub && <span className="text-[7px] text-slate-400">{sub}</span>}
    </button>
  );
}
