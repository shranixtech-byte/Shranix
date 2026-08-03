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
  Store,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { buildUpiPayload } from '@/components/ui/UpiQrCode';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob, generateInvoicePdf } from '@/services/invoice-pdf.service';

import { KRUSHI_BILL_CSS, code39Svg, renderKrushiBill } from './krushi-bill-template';
import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type DocTemplate =
  'tax_invoice' | 'retail_invoice' | 'estimate' | 'quotation' | 'delivery_challan' | 'proforma';
export type PrintLayout =
  | 'a4_portrait'
  | 'a4_landscape'
  | 'thermal_58'
  | 'thermal_80'
  | 'dot_matrix'
  | 'continuous'
  | 'label';
export type InvoiceTemplate = 'classic' | 'modern' | 'enterprise' | 'minimal' | 'agriculture';

interface PaymentSplitData {
  method: string;
  amount: number;
  refNo: string;
  bankName: string;
}

// ═════════════════════════════════════════════════════════
// SHOP DETAILS (company se) — bill ke header par dikhte hain
// ═════════════════════════════════════════════════════════

interface ShopDetails {
  companyId?: string;
  shopName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  gstin: string;
  pesticidesLicense: string;
  fertilizerLicense: string;
  seedsLicense: string;
  cottonLicense: string;
  retailLicense: string;
  upiId: string;
}

const EMPTY_SHOP_FORM: ShopDetails = {
  shopName: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  mobile: '',
  gstin: '',
  pesticidesLicense: '',
  fertilizerLicense: '',
  seedsLicense: '',
  cottonLicense: '',
  retailLicense: '',
  upiId: '',
};

// Bill ke header ke liye merged address string
function mergedShopAddress(s: ShopDetails | null): string {
  if (!s) {
    return '';
  }
  const statePart = s.state ? `${s.state}${s.pincode ? ` - ${s.pincode}` : ''}` : s.pincode || '';
  return [s.address, s.city, statePart].filter(Boolean).join(', ');
}

// Invoice Settings (Settings Hub → Invoice) — print defaults (module-level cache)
interface InvoiceSettingsData {
  showHsn?: boolean;
  showBatch?: boolean;
  showExpiry?: boolean;
  showDiscount?: boolean;
  showQr?: boolean;
  showGst?: boolean;
  duplicateCopy?: boolean;
  transportCopy?: boolean;
  showBarcode?: boolean;
  printFormat?: string;
}

let invoiceSettingsCache: InvoiceSettingsData | null = null;
const INVOICE_SETTINGS_CHANGED_EVENT = 'shranix-invoice-settings-changed';

function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoiceSettingsData | null>(invoiceSettingsCache);

  const load = useCallback(async () => {
    if (invoiceSettingsCache) {
      setSettings(invoiceSettingsCache);
      return;
    }
    try {
      const res = (await apiRequest('/sales/settings')) as unknown;
      const s = (
        Array.isArray(res) ? res[0] : ((res as { data?: Record<string, unknown> })?.data ?? res)
      ) as Record<string, unknown>;
      invoiceSettingsCache = {
        showHsn: s.showHsn !== false,
        showBatch: s.showBatch !== false,
        showExpiry: s.showExpiry !== false,
        showDiscount: s.showDiscount !== false,
        showQr: s.showQr !== false,
        showGst: s.showGst !== false,
        duplicateCopy: s.duplicateCopy !== false,
        transportCopy: s.transportCopy === true,
        showBarcode: s.showBarcode === true,
        printFormat: s.printFormat ? String(s.printFormat) : 'a4_portrait',
      };
      setSettings(invoiceSettingsCache);
    } catch {
      invoiceSettingsCache = {};
      setSettings(invoiceSettingsCache);
    }
  }, []);

  useEffect(() => {
    void load();
    const handler = () => {
      invoiceSettingsCache = null;
      void load();
    };
    window.addEventListener(INVOICE_SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(INVOICE_SETTINGS_CHANGED_EVENT, handler);
  }, [load]);

  return { settings };
}

// Module-level cache + event — InvoicePreview aur Shop panel dono share karte hain
let shopCache: ShopDetails | null = null;
const SHOP_CHANGED_EVENT = 'shranix-shop-changed';

function useShopDetails() {
  const [shop, setShop] = useState<ShopDetails | null>(shopCache);
  const [loading, setLoading] = useState(!shopCache);

  const load = useCallback(async () => {
    if (shopCache) {
      setShop(shopCache);
      setLoading(false);
      return;
    }
    try {
      type CompanyRow = Record<string, unknown>;
      const res = (await apiRequest<{ data?: CompanyRow[] }>('/companies')) as unknown;
      const rows = (
        Array.isArray(res) ? res : ((res as { data?: CompanyRow[] })?.data ?? [])
      ) as CompanyRow[];
      const c = rows[0];
      if (c) {
        shopCache = {
          companyId: String(c.id ?? ''),
          shopName: String(c.name ?? ''),
          address: String(c.address ?? ''),
          city: String(c.city ?? ''),
          state: String(c.state ?? ''),
          pincode: String(c.pincode ?? ''),
          mobile: String(c.phone ?? ''),
          gstin: String(c.gstin ?? ''),
          pesticidesLicense: String(c.pesticidesLicense ?? ''),
          fertilizerLicense: String(c.fertilizerLicense ?? ''),
          seedsLicense: String(c.seedsLicense ?? ''),
          cottonLicense: String(c.cottonLicense ?? ''),
          retailLicense: String(c.retailLicense ?? ''),
          upiId: '',
        };
        // Banking Settings ka UPI ID (default account) — bill ke QR ke liye source of truth
        try {
          type BankRow = { upiId?: string | null; isDefault?: boolean };
          const bankRes = (await apiRequest<{ data?: BankRow[] }>('/bank-accounts')) as unknown;
          const bankRows = (
            Array.isArray(bankRes) ? bankRes : ((bankRes as { data?: BankRow[] })?.data ?? [])
          ) as BankRow[];
          const defBank = bankRows.find((b) => b.isDefault) ?? bankRows[0];
          if (defBank?.upiId) {
            shopCache = { ...shopCache, upiId: String(defBank.upiId) };
          }
        } catch {
          // Banking settings load na ho to upiId empty — template par box nahi aayega
        }
        setShop(shopCache);
      }
    } catch {
      // Company nahi mili → template ke default (hardcoded) values use honge
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => {
      shopCache = null;
      load();
    };
    window.addEventListener(SHOP_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SHOP_CHANGED_EVENT, handler);
  }, [load]);

  return { shop, loading };
}

// Shop & Licenses — entry panel (sidebar 'Shop' tab)
function ShopDetailsPanel() {
  const { shop, loading } = useShopDetails();
  const [form, setForm] = useState<ShopDetails>(EMPTY_SHOP_FORM);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) {
      return;
    }
    setForm({ ...EMPTY_SHOP_FORM, ...shop });
  }, [shop]);

  const set = (key: keyof ShopDetails, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.shopName.trim()) {
      setError('Shop name zaroori hai');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    const payload = {
      name: form.shopName,
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      phone: form.mobile,
      gstin: form.gstin,
      pesticidesLicense: form.pesticidesLicense,
      fertilizerLicense: form.fertilizerLicense,
      seedsLicense: form.seedsLicense,
      cottonLicense: form.cottonLicense,
      retailLicense: form.retailLicense,
    };
    try {
      if (form.companyId) {
        await apiRequest(`/companies/${form.companyId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/companies', { method: 'POST', body: JSON.stringify(payload) });
      }
      window.dispatchEvent(new Event(SHOP_CHANGED_EVENT));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof ShopDetails, placeholder?: string, hint?: string) => (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {hint && <span className="text-[8px] text-slate-400">{hint}</span>}
    </label>
  );

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Shop Details — bill ke header par dikhte hain
      </p>
      {field('Shop Name *', 'shopName', 'KRUSHI SAGAR KENDRA')}
      <label className="block">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Address
        </span>
        <textarea
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          rows={2}
          placeholder="At Post Kanadgaon, Tal. Rahata"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {field('City', 'city', 'Rahata')}
        {field('State', 'state', 'Maharashtra')}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field('Pincode', 'pincode', '413720')}
        {field('Mobile', 'mobile', '9881292045')}
      </div>
      {field('GST No', 'gstin', '27AABCS1234A1Z5')}

      <div className="border-t border-slate-200 pt-3 dark:border-slate-600">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Business Licenses
        </p>
        <div className="mt-2 space-y-2">
          {field('Pesticides License No', 'pesticidesLicense', 'LAIID09140035')}
          {field('Fertilizer License No', 'fertilizerLicense', 'LAFD09140031')}
          {field('Seeds License No', 'seedsLicense', 'LASD09140146')}
          {field('Cotton License No', 'cottonLicense', 'LACD09140032')}
          {field('Retail License No', 'retailLicense', 'Retail / shop license')}
        </div>
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
          <Check className="h-3 w-3" /> Saved! Bill abhi update ho gaya
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Shop Details
      </button>
    </div>
  );
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

// ═════════════════════════════════════════════════════════
// BARCODE SVG

// ═════════════════════════════════════════════════════════
// INVOICE PREVIEW — SHRANIX CREDIT TAX INVOICE
// (A4 · 2 copies on one page: OFFICE COPY + CUSTOMER COPY,
//  beech mein "--- CUT HERE ---" dashed line — photo format)
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
  customerMobile?: string;
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
  showGst?: boolean; // undefined → Invoice Settings ka default use hota hai
  showSignature: boolean;
  showBankDetails: boolean;
  zoom: number;
  pageMargins: number;
  pageFontSize: number;
  upiQrPayload?: string;
  upiId?: string;
  dcNo?: string;
  dcDate?: string;
}

// ── SHOPKEEPER'S FINAL BILL (KRUSHI SAGAR KENDRA) ────────
// Bill ka exact HTML template `krushi-bill-template.ts` mein hai —
// yahan sirf data map karke render hota hai. UPI QR box Banking Settings
// (default account) ka UPI ID + amount se generate hota hai.

// UPI payload (upi://pay?...) ko data URL QR mein encode karo — template mein
// <img src=data:...> laga deta hai. PDF capture (Puppeteer) data URLs support karta hai.
function useUpiQrDataUrl(upiId: string, rawPayload?: string): string {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!upiId.trim() || !rawPayload) {
      setDataUrl('');
      return;
    }
    let cancelled = false;
    // Dynamic import — qrcode browser build (CJS) ko import default ke roop mein use karo
    import('qrcode')
      .then((mod) => {
        const QRCode = (mod as { default?: unknown }).default ?? mod;
        (QRCode as { toDataURL: (s: string, o: object) => Promise<string> })
          .toDataURL(rawPayload, {
            width: 180,
            margin: 1,
            color: { dark: '#0F172A', light: '#FFFFFF' },
          })
          .then((url: string) => {
            if (!cancelled) {
              setDataUrl(url);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setDataUrl('');
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [upiId, rawPayload]);

  return dataUrl;
}

// ── TWO COPIES ON ONE A4 ─────────────────────────────────
export const InvoicePreview = memo(function InvoicePreview(props: InvoicePreviewProps) {
  const {
    invoiceNumber,
    invoiceDate,
    customerName,
    billingAddress,
    customerGstin,
    placeOfSupply,
    customerMobile,
    items,
    itemDiscountTotal,
    taxableAfterDiscount,
    cgstTotal,
    sgstTotal,
    grandTotal,
    roundOff,
    showSignature,
    zoom,
    pageMargins,
    dcNo,
    dcDate,
    upiId: upiIdProp,
    upiQrPayload: upiQrPayloadProp,
  } = props;

  // Shop details (company se) — bill ke header par
  const { shop } = useShopDetails();
  const shopAddress = mergedShopAddress(shop);
  const shopMobile = shop?.mobile ? `Mobile : ${shop.mobile}` : '';

  // Invoice Settings (Settings Hub) — print display toggles ka default
  const { settings } = useInvoiceSettings();
  const inv = settings ?? {};
  const effShowGst = props.showGst ?? inv.showGst ?? true;
  const effShowHsn = inv.showHsn ?? true;
  const effShowBatch = inv.showBatch ?? true;
  const effShowExpiry = inv.showExpiry ?? true;
  const effShowDiscount = inv.showDiscount ?? true;
  const effShowQr = inv.showQr ?? true;
  const effDuplicateCopy = inv.duplicateCopy ?? true;
  const effTransportCopy = inv.transportCopy === true;
  const effShowBarcode = inv.showBarcode === true;
  const barcodeSvg = effShowBarcode && invoiceNumber ? code39Svg(invoiceNumber) : '';

  // ── UPI Scan & Pay — Banking Settings (default account) ka UPI ID
  // Prop explicitly diya ho (simple-invoice-page apna amount/note payload bhejta hai)
  // to woh use karo; warna company/banking se load karke amount + invoice no se build karo.
  const effectiveUpiId = (upiIdProp || shop?.upiId || '').trim();
  const upiRawPayload =
    upiQrPayloadProp ||
    (effectiveUpiId
      ? buildUpiPayload({
          upiId: effectiveUpiId,
          name: shop?.shopName || 'KRUSHI SAGAR KENDRA',
          amount: grandTotal,
          note: invoiceNumber,
        })
      : '');
  const upiQrDataUrl = useUpiQrDataUrl(effectiveUpiId, upiRawPayload);

  // Print CSS — Document Engine screen ka apna Print button bhi yahi se print karta hai
  // (simple-invoice-page modal jaisa hi: A4 margin:0 + clipping/transform bugs fixed)
  const printStyles = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      html, body { height: auto !important; overflow: visible !important; }
      #root { height: auto !important; overflow: visible !important; }
      body * { visibility: hidden; }
      #invoice-preview, #invoice-preview * { visibility: visible; }
      #invoice-preview {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        background: #fff !important;
      }
    }
  `;

  // DC number not available in app → derive from invoice number (photo convention SL→DC)
  const effectiveDcNo =
    dcNo || (invoiceNumber ? `DC${invoiceNumber.replace(/^[A-Z]+/i, '')}` : '—');
  const effectiveDcDate = dcDate || invoiceDate || '—';

  // ── AUTO-FIT: 2 copies + CUT HERE hamesha EXACTLY 1 A4 page par fit hon
  // Natural height measure karke scale nikalo: chhota bill (2 items) → scale > 1 →
  // font bada + page pura bhara (photo jaisa). Bada bill (3+ items) → scale < 1 →
  // dono copies 1 page par hi rahenge (2 pages kabhi nahi).
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el) {
      return;
    }
    // NOTE: zoom ki jagah transform:scale — zoom Chrome mein layout reflow karta hai
    // (Marathi/Devanagari text narrow width par zyada wrap → measurement se alag render
    //  → 2 pages ho jata tha, real 3-item test mein confirm hua). transform offsetHeight
    // ko affect NAHI karta, isliye natural height exact measure hota hai.
    const naturalPx = el.offsetHeight;
    if (naturalPx <= 0) {
      return;
    }
    const mmToPx = (mm: number) => (mm / 25.4) * 96;
    // 2mm safety buffer: zoom/epsilon round-off (±0.57mm) aur print-engine variance
    // se CUSTOMER COPY ka bottom kabhi clip na ho (3-item bill test mein +0.8mm overflow mila tha)
    const innerHmm = 297 - 2 * pageMargins - 2; // A4 height - margins - safety buffer
    const innerPx = mmToPx(innerHmm);
    const s = Math.min(1.25, Math.max(0.5, innerPx / naturalPx));
    // Convergence: width = 100/fitScale% se text-wrap badalta hai, isliye 1-2 baar
    // dobara measure karke exact settle karo (epsilon guard loop se bachata hai)
    setFitScale((prev) => (Math.abs(prev - s) < 0.002 ? prev : s));
  }, [
    items,
    pageMargins,
    effShowGst,
    showSignature,
    customerName,
    billingAddress,
    customerGstin,
    customerMobile,
    placeOfSupply,
    grandTotal,
    itemDiscountTotal,
    taxableAfterDiscount,
    cgstTotal,
    sgstTotal,
    roundOff,
    fitScale,
    shop,
    shopAddress,
    shopMobile,
    effectiveUpiId,
    upiQrDataUrl,
    settings,
  ]);

  // ── Shopkeeper-approved bill template — exact HTML render ──
  // UPI QR box abhi intentionally nahi hai (shopkeeper ne bola baad mein
  // wapas add karenge). Layout/CSS `krushi-bill-template.ts` se aata hai.
  const billHtml = renderKrushiBill({
    invoiceNo: invoiceNumber,
    invoiceDate,
    dcNo: effectiveDcNo,
    dcDate: effectiveDcDate,
    shopName: shop?.shopName,
    shopAddress: shopAddress,
    shopMobile: shopMobile,
    shopGst: shop?.gstin,
    pesticidesLicense: shop?.pesticidesLicense,
    fertilizerLicense: shop?.fertilizerLicense,
    seedsLicense: shop?.seedsLicense,
    cottonLicense: shop?.cottonLicense,
    retailLicense: shop?.retailLicense,
    customerName,
    customerAddress: billingAddress,
    customerGst: customerGstin,
    customerMobile: customerMobile || '',
    state: placeOfSupply || 'Maharashtra',
    placeOfSupply: placeOfSupply || 'Maharashtra',
    items: items.map((item) => ({
      description: item.productName,
      mfgCo: item.company,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      pkg: item.uom,
      hsn: item.hsn,
      qty: item.quantity,
      rate: item.rate,
      amount: item.taxableAmount,
      gstPercent: item.gstPercent,
      cgst: item.cgstAmount,
      sgst: item.sgstAmount,
    })),
    totalQty: items.reduce((s, i) => s + i.quantity, 0),
    taxableAmount: taxableAfterDiscount,
    totalCgst: cgstTotal,
    totalSgst: sgstTotal,
    grandTotal,
    discount: itemDiscountTotal,
    roundOff,
    netAmount: grandTotal,
    billAmount: grandTotal,
    showGst: effShowGst,
    showSignature,
    showHsn: effShowHsn,
    showBatch: effShowBatch,
    showExpiry: effShowExpiry,
    showDiscount: effShowDiscount,
    showQr: effShowQr,
    duplicateCopy: effDuplicateCopy,
    transportCopy: effTransportCopy,
    showBarcode: effShowBarcode,
    barcodeSvg,
    upiId: effectiveUpiId,
    upiQrPayload: upiQrDataUrl,
  });

  return (
    <>
      <style>{printStyles}</style>
      <div
        id="invoice-preview"
        className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          width: zoom < 100 ? `${(100 / zoom) * 100}%` : undefined,
        }}
      >
        {/* Bill CSS + HTML — PDF capture mein bhi saath jaye, isliye style andar rakha hai */}
        <style>{KRUSHI_BILL_CSS}</style>
        {/* A4 PAGE — thin outer border (photo) · OFFICE COPY upar + CUSTOMER COPY niche
            Auto-fit: andar ka content transform:scale se exactly page ke size par fit hota hai */}
        <div
          className="mx-auto min-h-[297mm] w-[210mm] overflow-hidden rounded-sm border border-black bg-white text-slate-900 print:shadow-none"
          style={{ padding: `${pageMargins}mm` }}
        >
          <div
            ref={fitRef}
            style={{
              transform: `scale(${fitScale})`,
              transformOrigin: 'top left',
              width: `${100 / fitScale}%`,
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: billHtml }} />
          </div>
        </div>
      </div>
    </>
  );
});

// EMAIL FORM
// ═════════════════════════════════════════════════════════

function EmailForm({ invoiceNumber }: { invoiceNumber: string }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(`Invoice ${invoiceNumber} from Shranix Krushi ERP`);
  const [message, setMessage] = useState(
    'Please find attached the invoice. Thank you for your business!',
  );
  const [sent, setSent] = useState(false);

  // Real PDF attach — pehle server-side PDF generate karo, phir mail client mein
  // attach/download ke liye open karo (backend email send abhi SMTP pe depend karta hai).
  const [sending, setSending] = useState(false);
  const handleSend = useCallback(async () => {
    if (!to) {
      return;
    }
    setSending(true);
    try {
      const blob = await generateInvoicePdf();
      const safeNum = (invoiceNumber || 'invoice').replace(/[^A-Za-z0-9-]+/g, '_');
      downloadPdfBlob(blob, `${safeNum}.pdf`);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message}\n\n(PDF attachment: ${safeNum}.pdf)`)}`;
      window.location.href = mailto;
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('[PDF] email attachment failed:', err);
      alert(`PDF generate nahi hua: ${(err as Error).message || 'unknown error'}`);
    } finally {
      setSending(false);
    }
  }, [to, subject, message, invoiceNumber]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          To *
        </label>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="customer@email.com"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            CC
          </label>
          <input
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@email.com"
            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            BCC
          </label>
          <input
            type="email"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="bcc@email.com"
            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          icon={<Send className="h-3.5 w-3.5" />}
          onClick={() => void handleSend()}
          disabled={!to || sending}
        >
          {sent ? '✓ PDF Ready' : sending ? 'Generating...' : 'Send Invoice'}
        </Button>
        <span className="text-[10px] text-slate-400">
          * Real server-side PDF generate + download hota hai
        </span>
      </div>
      {sent && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ Real PDF download ho gaya — mail client mein attach/forward karo. (Server-side SMTP send
          ke liye SMTP credentials chahiye)
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
  const [message, setMessage] = useState(
    `Dear Customer,\n\nPlease find your invoice ${invoiceNumber} attached.\n\nTotal Amount: ₹—\n\nThank you for your business!\nShranix Krushi ERP`,
  );
  const [sent, setSent] = useState(false);

  // Real PDF attach — PDF generate + download karke WhatsApp open karo
  // (WhatsApp Business API ke bina direct file attach wa.me se possible nahi,
  //  isliye PDF download hota hai aur chat message ready khulta hai).
  const [sending, setSending] = useState(false);
  const handleSend = useCallback(async () => {
    if (!mobile) {
      return;
    }
    setSending(true);
    try {
      const blob = await generateInvoicePdf();
      const safeNum = (invoiceNumber || 'invoice').replace(/[^A-Za-z0-9-]+/g, '_');
      downloadPdfBlob(blob, `${safeNum}.pdf`);
      const digits = mobile.replace(/\D/g, '');
      const wa = digits.length === 10 ? `91${digits}` : digits;
      window.open(
        `https://wa.me/${wa}?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener,noreferrer',
      );
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('[PDF] WhatsApp attachment failed:', err);
      alert(`PDF generate nahi hua: ${(err as Error).message || 'unknown error'}`);
    } finally {
      setSending(false);
    }
  }, [mobile, message, invoiceNumber]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Customer Mobile *
        </label>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="+91 9876543210"
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>
      <div className="space-x-2">
        <Button
          variant="primary"
          size="sm"
          icon={<Send className="h-3.5 w-3.5" />}
          onClick={() => void handleSend()}
          disabled={!mobile || sending}
        >
          {sent ? '✓ PDF Ready' : sending ? 'Generating...' : 'Send PDF'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Link className="h-3.5 w-3.5" />}
          disabled={!mobile}
        >
          Send Link
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<QrCode className="h-3.5 w-3.5" />}
          disabled={!mobile}
        >
          Payment Link
        </Button>
      </div>
      {sent && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400">
          ✓ Real PDF download ho gaya — WhatsApp chat mein attach karo. (Direct file attach ke liye
          WhatsApp Business API chahiye)
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
  margins,
  setMargins,
  fontSize,
  setFontSize,
  showLogo,
  setShowLogo,
  showGst,
  setShowGst,
  showSignature,
  setShowSignature,
  showBankDetails,
  setShowBankDetails,
}: PrintSettingsProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Margins (mm)
        </label>
        <input
          type="range"
          min="5"
          max="25"
          value={margins}
          onChange={(e) => setMargins(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-500"
        />
        <span className="text-[10px] text-slate-400">{margins}mm</span>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Font Size
        </label>
        <input
          type="range"
          min="8"
          max="14"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-500"
        />
        <span className="text-[10px] text-slate-400">{fontSize}px</span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: 'Show Logo', value: showLogo, set: setShowLogo },
          { label: 'Show GST Details', value: showGst, set: setShowGst },
          { label: 'Show Signature', value: showSignature, set: setShowSignature },
          { label: 'Show Bank Details', value: showBankDetails, set: setShowBankDetails },
        ].map((opt) => (
          <label key={opt.label} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={opt.value}
              onChange={(e) => opt.set(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 accent-emerald-500"
            />
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
    <div className="max-h-48 space-y-1.5 overflow-auto">
      {entries.length === 0 && (
        <p className="py-6 text-center text-[10px] text-slate-400">No history yet</p>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
        >
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

function TemplateThumbnail({
  template,
  active,
  onClick,
}: {
  template: (typeof INVOICE_STYLES)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}
    >
      <div
        className={cn(
          'h-10 w-full rounded-md',
          template.value === 'classic' && 'bg-blue-100',
          template.value === 'modern' && 'bg-gradient-to-r from-emerald-200 to-emerald-100',
          template.value === 'enterprise' && 'bg-slate-200',
          template.value === 'minimal' && 'bg-slate-50',
          template.value === 'agriculture' && 'bg-green-100',
        )}
      />
      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">
        {template.label}
      </span>
      <span className="text-[7px] text-slate-400">{template.desc}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════
// DOCUMENT LAYOUT OPTION
// ═════════════════════════════════════════════════════════

function LayoutOption({
  layout,
  active,
  onClick,
}: {
  layout: (typeof PRINT_LAYOUTS)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}
    >
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
  customerName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  placeOfSupply,
  billingAddress,
  salesPerson,
  notes,
  items,
  grossTotal,
  itemDiscountTotal,
  taxableAfterDiscount,
  cgstTotal,
  sgstTotal,
  igstTotal,
  cessTotal,
  roundOff,
  grandTotal,
  totalPaid,
  balance,
  customerGstin,
  paymentSplits,
  isInterState,
  onBack,
  onComplete,
}: InvoiceDocumentEngineScreenProps) {
  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    'preview' | 'email' | 'whatsapp' | 'shop' | 'settings' | 'audit'
  >('preview');
  const [docType, setDocType] = useState<DocTemplate>('tax_invoice');
  const [printLayout, setPrintLayout] = useState<PrintLayout>('a4_portrait');
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate>('classic');
  const [zoom, setZoom] = useState(70);
  const [showPreview, setShowPreview] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Print settings — default 5mm (photo: border paper ke edge ke paas)
  const [margins, setMargins] = useState(5);
  const [fontSize, setFontSize] = useState(10);
  const [showLogo, setShowLogo] = useState(true);
  const [showGst, setShowGst] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);

  // Invoice Settings (Settings Hub → Invoice) se print defaults lo
  const { settings: invSettings } = useInvoiceSettings();
  useEffect(() => {
    if (!invSettings) {
      return;
    }
    if (invSettings.showGst !== undefined) {
      setShowGst(invSettings.showGst);
    }
    if (invSettings.printFormat) {
      setPrintLayout(invSettings.printFormat as PrintLayout);
    }
  }, [invSettings]);

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

  // Real server-side PDF (Puppeteer + embedded Devanagari font) — manual browser
  // print-to-PDF flow replace kar deta hai. Wahi #invoice-preview HTML reuse hota hai.
  const handleDownloadPdf = useCallback(async () => {
    setPdfGenerating(true);
    try {
      const blob = await generateInvoicePdf();
      const safeNum = (invoiceNumber || 'invoice').replace(/[^A-Za-z0-9-]+/g, '_');
      downloadPdfBlob(blob, `${safeNum}.pdf`);
      addAuditEntry('PDF Downloaded', 'pdf', `Invoice ${invoiceNumber} · real PDF`);
    } catch (err) {
      addAuditEntry('PDF failed', 'pdf', (err as Error).message || 'Generation error');
      console.error('[PDF] generation failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  }, [invoiceNumber, addAuditEntry]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Keyboard Shortcuts ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'p' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleDownloadPdf();
      } else if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        setActiveTab('email');
      } else if (e.key === 'w' && e.ctrlKey) {
        e.preventDefault();
        setActiveTab('whatsapp');
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrint, handleDownloadPdf, onBack]);

  // ── Render ────────────────────────────────────────
  return (
    <div className="animate-in fade-in flex h-full flex-col duration-200">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Document & Communication Engine
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Print, PDF, Email, WhatsApp, and more
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Check className="h-4 w-4" />}
            onClick={onComplete}
          >
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
            {(
              [
                {
                  key: 'preview' as const,
                  label: 'Preview',
                  icon: <Eye className="h-3.5 w-3.5" />,
                },
                { key: 'email' as const, label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
                {
                  key: 'whatsapp' as const,
                  label: 'WhatsApp',
                  icon: <MessageSquare className="h-3.5 w-3.5" />,
                },
                { key: 'shop' as const, label: 'Shop', icon: <Store className="h-3.5 w-3.5" /> },
                {
                  key: 'settings' as const,
                  label: 'Settings',
                  icon: <Settings className="h-3.5 w-3.5" />,
                },
                {
                  key: 'audit' as const,
                  label: 'History',
                  icon: <Clock className="h-3.5 w-3.5" />,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
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
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Document Type
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DOC_TEMPLATES.map((dt) => (
                    <DocTypeButton
                      key={dt.value}
                      dt={dt}
                      active={docType === dt.value}
                      onClick={() => setDocType(dt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Print Layout */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Print Layout
                </p>
                <div className="space-y-1">
                  {PRINT_LAYOUTS.map((pl) => (
                    <LayoutOption
                      key={pl.value}
                      layout={pl}
                      active={printLayout === pl.value}
                      onClick={() => setPrintLayout(pl.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Invoice Styles */}
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Invoice Template
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {INVOICE_STYLES.map((st) => (
                    <TemplateThumbnail
                      key={st.value}
                      template={st}
                      active={invoiceTemplate === st.value}
                      onClick={() => setInvoiceTemplate(st.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-600">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ActionBtn
                    label="Print"
                    sub="Ctrl+P"
                    icon={<Printer className="h-3.5 w-3.5" />}
                    onClick={handlePrint}
                  />
                  <ActionBtn
                    label={pdfGenerating ? 'Generating...' : 'Download PDF'}
                    sub="Ctrl+Shift+P"
                    icon={
                      pdfGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )
                    }
                    onClick={handleDownloadPdf}
                  />
                  <ActionBtn
                    label={copied ? 'Copied!' : 'Copy Link'}
                    sub=""
                    icon={<ClipboardCopy className="h-3.5 w-3.5" />}
                    onClick={handleCopyLink}
                  />
                  <ActionBtn
                    label="Save as Template"
                    sub=""
                    icon={<Save className="h-3.5 w-3.5" />}
                    onClick={() =>
                      addAuditEntry('Template saved', 'pdf', `Template: ${invoiceTemplate}`)
                    }
                  />
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(30, z - 10))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="min-w-[40px] text-center text-[10px] font-medium text-slate-500">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(70)}
                  className="ml-auto flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[9px] text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-3 w-3" /> Fit
                </button>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Send Invoice via Email
              </p>
              <EmailForm invoiceNumber={invoiceNumber} />
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Send via WhatsApp
              </p>
              <WhatsAppForm invoiceNumber={invoiceNumber} />
            </div>
          )}

          {activeTab === 'shop' && (
            <div>
              <ShopDetailsPanel />
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Print Settings
              </p>
              <PrintSettingsPanel
                margins={margins}
                setMargins={setMargins}
                fontSize={fontSize}
                setFontSize={setFontSize}
                showLogo={showLogo}
                setShowLogo={setShowLogo}
                showGst={showGst}
                setShowGst={setShowGst}
                showSignature={showSignature}
                setShowSignature={setShowSignature}
                showBankDetails={showBankDetails}
                setShowBankDetails={setShowBankDetails}
              />
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Communication History
              </p>
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
              <span className="text-[10px] text-slate-400">
                {PRINT_LAYOUTS.find((l) => l.value === printLayout)?.label}
              </span>
              <span className="text-[8px] text-slate-300">|</span>
              <span className="text-[10px] text-slate-400">
                {INVOICE_STYLES.find((s) => s.value === invoiceTemplate)?.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[9px] text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
            >
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
          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="h-3.5 w-3.5" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={handleDownloadPdf}
          >
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

function DocTypeButton({
  dt,
  active,
  onClick,
}: {
  dt: (typeof DOC_TEMPLATES)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-2 text-left text-[10px] transition-all',
        active
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
      )}
    >
      <span>{dt.icon}</span>
      <span className="font-medium text-slate-700 dark:text-slate-300">{dt.label}</span>
    </button>
  );
}

function ActionBtn({
  label,
  sub,
  icon,
  onClick,
}: {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700"
    >
      {icon}
      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {sub && <span className="text-[7px] text-slate-400">{sub}</span>}
    </button>
  );
}
