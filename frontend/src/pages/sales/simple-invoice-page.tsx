import {
  ArrowLeft,
  Barcode,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileText,
  Hash,
  Loader2,
  Mail,
  Package,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { QuickCreateModal } from '@/components/ui/QuickCreateModal';
import { UpiQrCode, buildUpiPayload } from '@/components/ui/UpiQrCode';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import { downloadPdfBlob, generateInvoicePdf } from '@/services/invoice-pdf.service';
import { getCreditCustomer, type CustomerCreditProfile } from '@/services/sales-credit.service';
import { createSalesInvoice, mapLineItemToPayload } from '@/services/sales.service';

import { BarcodeScanModal } from './barcode-scan-modal';
import { fetchNextInvoiceNumber, type CustomerOption } from './invoice-common';
import { InvoicePreview } from './invoice-document-engine-screen';
import {
  recomputeLine,
  type InvoiceLineItem,
  type ProductRecord,
} from './product-selection-screen';

// Today as YYYY-MM-DD (local timezone-safe)
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Date string → DD/MM/YYYY (invoice date + batch expiry dono handle karta hai)
// ISO date (2026-08-01) ya full timestamp (2027-07-30T00:00:00.000Z) dono chalte hain
function formatDateDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) {
    return iso;
  }
  return `${d}/${m}/${y}`;
}

// ₹ Indian number format
function formatINR(amount: number): string {
  return `₹${(Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Summary box row (label + value)
function SummaryRow({
  label,
  value,
  className,
  bold,
}: {
  label: string;
  value: string;
  className?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          bold
            ? 'text-base font-bold text-slate-900 dark:text-slate-100'
            : 'font-semibold text-slate-800 dark:text-slate-200',
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}

// Keyboard key chip — shortcut hints ke liye (F2, F3, ...)
function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

// Shortcut list — fixed left rail aur mobile strip dono me reuse
function ShortcutItems({ className }: { className?: string }) {
  return (
    <ul className={className}>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>F2</Kbd> Customer
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>F3</Kbd> Product
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>F4</Kbd> Payment
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>F5</Kbd> Save
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>F6</Kbd> Save &amp; Print
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Kbd>Esc</Kbd> Cancel
      </li>
    </ul>
  );
}

// Indian financial year in SHORT format (backend ke format se match): e.g. 2026-27
export function shortFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

// ═════════════════════════════════════════════════════════
// SIMPLE INVOICE PAGE — STEP BY STEP BUILD
// (User guide kar raha hai — ek-ek cheez manually add hoga.
//  Sab kuch EK BOX mein — Payment Mode, Invoice No, Date,
//  aur aage aane wale customer/items bhi isi box mein add honge)
// ═════════════════════════════════════════════════════════

export type PaymentMode = 'cash' | 'credit' | 'upi';
// Counter payment — bill ready hone par, print se pehle customer se poochhte hain: UPI ya Hard Cash
type CounterPayment = 'upi' | 'cash';

export function SimpleInvoicePage() {
  const navigate = useNavigate();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  // Counter payment — default Hard Cash; bill ready hone par print ke paas UPI/Hard Cash select hota hai
  const [counterPayment, setCounterPayment] = useState<CounterPayment>('cash');
  // Effective mode — upar Cash/Credit (sale type), niche counter par UPI/Hard Cash (sirf Cash sale mein)
  const effectivePaymentMode: PaymentMode = paymentMode === 'credit' ? 'credit' : counterPayment;
  const [invoiceDate, setInvoiceDate] = useState(todayISO);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [numberLoading, setNumberLoading] = useState(true);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const paidAmountRef = useRef<HTMLInputElement>(null);

  // ── Customer selection ──────────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalQuery, setCustomerModalQuery] = useState('');

  // Quick-create new customer
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gstin: '',
    city: '',
    creditLimit: '',
    creditDays: '',
  });
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // ── Customer credit profile ────────────────────────────
  const [creditProfile, setCreditProfile] = useState<CustomerCreditProfile | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // ── Address (billing) ────────────────────────────────
  const [billingAddress, setBillingAddress] = useState('');

  // ── Items ──────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [productResults, setProductResults] = useState<ProductRecord[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Barcode / QR scan (scanner gun) ────────────────
  const [scanOpen, setScanOpen] = useState(false);

  // ── Pending item entry (select + qty/rate/discount) ──
  const [pendingProduct, setPendingProduct] = useState<ProductRecord | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [pendingRate, setPendingRate] = useState('');
  const [pendingDiscPct, setPendingDiscPct] = useState('0');
  const [pendingDiscAmt, setPendingDiscAmt] = useState('0');

  // ── Summary (freight + paid amount) ───────────────────
  const [freight, setFreight] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  // ── UPI payment (dukandar ka UPI ID settings se) ──────
  const [upiId, setUpiId] = useState('');

  // ── Print preview modal ─────────────────────────────────
  const [printOpen, setPrintOpen] = useState(false);
  const [printZoom, setPrintZoom] = useState(80);
  const [printInvoiceNumber, setPrintInvoiceNumber] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // ── Save (Done button) ────────────────────────────────
  const [saving, setSaving] = useState(false);
  // Double-click / F5+F6 ek saath — do save requests same invoice number se na jayein.
  // useState async hota hai, isliye ref guard zaroori hai (button disabled hone se pehle
  // hi second click aa sakta hai).
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedNumber, setLastSavedNumber] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [lastSaveMode, setLastSaveMode] = useState<'draft' | 'posted'>('draft');

  // UPI ID load karo (bill ke QR ke liye) — pehle Banking Settings (default bank account),
  // nahi mila to purana /sales/settings/upi fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        type BankRow = { upiId?: string | null; isDefault?: boolean };
        const bankRes = (await apiRequest<{ data?: BankRow[] }>('/bank-accounts')) as unknown;
        const bankRows = (
          Array.isArray(bankRes) ? bankRes : ((bankRes as { data?: BankRow[] })?.data ?? [])
        ) as BankRow[];
        const defBank = bankRows.find((b) => b.isDefault) ?? bankRows[0];
        if (defBank?.upiId) {
          if (!cancelled) {
            setUpiId(String(defBank.upiId));
          }
          return;
        }
      } catch {
        // Banking settings unavailable → fallback
      }
      try {
        const r = await apiRequest<{ upiId?: string }>('/sales/settings/upi');
        if (!cancelled) {
          setUpiId(r?.upiId || '');
        }
      } catch {
        if (!cancelled) {
          setUpiId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup pending blur timers on unmount
  useEffect(() => {
    return () => {
      if (itemBlurTimer.current) {
        clearTimeout(itemBlurTimer.current);
      }
    };
  }, []);

  // Auto-generate invoice number — selected date + payment mode ke hisab se
  // (cash → SLCA26-001, credit → SLCR26-001)
  useEffect(() => {
    if (!invoiceDate) {
      return;
    }
    let cancelled = false;
    setNumberLoading(true);
    fetchNextInvoiceNumber(invoiceDate, paymentMode)
      .then((num) => {
        if (!cancelled) {
          setInvoiceNumber(num);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setNumberLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceDate, paymentMode]);

  // Customer list load — popup kholne par (ps=1000, client-side filter ke liye)
  // NOTE: backend controller reads @Query('ps') not 'pageSize' — isliye ps use karo
  const loadCustomers = async () => {
    setCustomerLoading(true);
    try {
      const res = await apiRequest<{ data: CustomerOption[] }>(`/customers?page=1&ps=1000`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      // Alphabetical sort — naam A→Z (case-insensitive), popup me aasani se dhundhne ke liye
      list.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
      setCustomers(list);
    } catch {
      setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  // Fetch products when item search changes (debounced)
  useEffect(() => {
    if (!itemOpen) {
      return;
    }
    const timer = setTimeout(async () => {
      setProductLoading(true);
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '20' });
        if (itemSearch.trim()) {
          params.set('search', itemSearch.trim());
        }
        const res = await apiRequest<{ data: ProductRecord[] }>(`/inventory/products?${params}`);
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        // Alphabetical sort — naam A→Z (case-insensitive)
        list.sort((a, b) =>
          (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()),
        );
        setProductResults(list);
      } catch {
        setProductResults([]);
      } finally {
        setProductLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, itemOpen]);

  const openCustomerSearch = () => {
    setCustomerModalQuery('');
    setCustomerModalOpen(true);
    void loadCustomers();
  };

  // Item search kholo + input focus karo (click aur F3 dono ke liye)
  const openItemSearch = () => {
    if (itemBlurTimer.current) {
      clearTimeout(itemBlurTimer.current);
      itemBlurTimer.current = null;
    }
    setProductLoading(true);
    setItemOpen(true);
    requestAnimationFrame(() => itemInputRef.current?.focus());
  };

  // Popup mein naam ya mobile number se search (client-side — mobile JSON notes mein hai)
  const filteredCustomers = useMemo(() => {
    const q = customerModalQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    // Hamesha nayi sorted list — state ko mutate nahi karte
    const filtered = customers.filter((c) => {
      if (!q) {
        return true;
      }
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const mobile = (c.mobile || '').replace(/\D/g, '');
      const mobileRaw = (c.mobile || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        (digits.length >= 3 && mobile.includes(digits)) ||
        mobileRaw.includes(q)
      );
    });
    // Alphabetical sort — naam A→Z (case-insensitive)
    return filtered.sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()),
    );
  }, [customers, customerModalQuery]);

  // ── Items: select product → fill boxes → Add ─────────
  const selectProduct = (p: ProductRecord) => {
    setPendingProduct(p);
    setPendingQty('1');
    setPendingRate(String(p.salesRate ?? 0));
    setPendingDiscPct('0');
    setPendingDiscAmt('0');
    setItemSearch('');
    setItemOpen(false);
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  // Product + qty/rate/discount → InvoiceLineItem (search aur gun-scan dono reuse karte hain)
  const buildInvoiceLine = (
    product: ProductRecord,
    qty: number,
    rate: number,
    discPct: number,
    discAmt: number,
  ): InvoiceLineItem => {
    // Discount: % + ₹ dono combine karke ek flat value banate hain (recomputeLine ke liye)
    const gross = qty * rate;
    const pctDisc = gross * (discPct / 100);
    const totalDisc = pctDisc + discAmt;
    // First available batch → batch no + expiry auto-fill (agar product ke batches hon)
    const firstBatch = product.batches?.find((b) => b.availableQty > 0) ?? product.batches?.[0];
    return recomputeLine({
      productId: product.id,
      productName: product.name,
      company: product.manufacturer ?? product.company ?? '',
      sku: product.sku ?? '',
      hsn: product.hsn ?? '',
      barcode: product.barcode ?? '',
      uom: product.unitName ?? 'Pcs',
      availableStock: product.currentStock ?? 0,
      batchNo: firstBatch?.batchNo ?? '',
      expiryDate: firstBatch?.expiryDate ?? '',
      quantity: qty,
      rate,
      discountType: 'flat',
      discountPercent: discPct,
      discountValue: totalDisc,
      gstPercent: product.gstRate ?? 0,
    });
  };

  const addPendingItem = () => {
    if (!pendingProduct) {
      return;
    }
    const qty = Math.max(0, parseFloat(pendingQty) || 0);
    const rate = Math.max(0, parseFloat(pendingRate) || 0);
    const discPct = Math.min(100, Math.max(0, parseFloat(pendingDiscPct) || 0));
    const discAmt = Math.max(0, parseFloat(pendingDiscAmt) || 0);
    if (qty <= 0 || rate <= 0) {
      setSaveError('Qty aur Rate dono 0 se bade hone chahiye');
      return;
    }
    // First available batch → merge key ke liye
    const firstBatch =
      pendingProduct.batches?.find((b) => b.availableQty > 0) ?? pendingProduct.batches?.[0];
    const line = buildInvoiceLine(pendingProduct, qty, rate, discPct, discAmt);
    // Same product + same batch dobara add kiya → qty merge karke ek hi line (nayi line nahi)
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === pendingProduct.id && i.batchNo === (firstBatch?.batchNo ?? ''),
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? recomputeLine({ ...i, quantity: i.quantity + qty }) : i,
        );
      }
      return [...prev, line];
    });
    // Reset pending entry
    setPendingProduct(null);
    setPendingQty('1');
    setPendingRate('');
    setPendingDiscPct('0');
    setPendingDiscAmt('0');
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  // Gun-scan se mila product → qty 1 ke saath turant add (pehle se hai to qty +1)
  const handleScannedProduct = (product: ProductRecord) => {
    const qty = 1;
    const rate = Number(product.salesRate) || 0;
    const firstBatch = product.batches?.find((b) => b.availableQty > 0) ?? product.batches?.[0];
    const line = buildInvoiceLine(product, qty, rate, 0, 0);
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id && i.batchNo === (firstBatch?.batchNo ?? ''),
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? recomputeLine({ ...i, quantity: i.quantity + qty }) : i,
        );
      }
      return [...prev, line];
    });
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const updateItemQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? recomputeLine({ ...i, quantity: Math.max(0, qty) }) : i)),
    );
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const updateItemRate = (id: string, rate: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? recomputeLine({ ...i, rate: Math.max(0, rate) }) : i)),
    );
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const itemTotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const subTotal = items.reduce((s, i) => s + i.taxableAmount, 0);
    const discountAmount = items.reduce((s, i) => s + i.discountValue, 0);
    // Weighted avg discount % (itemTotal se)
    const discountPercent =
      itemTotal > 0 ? Math.round((discountAmount / itemTotal) * 10000) / 100 : 0;
    const taxAmount = items.reduce((s, i) => s + i.gstAmount, 0);
    const grandTotal = items.reduce((s, i) => s + i.amount, 0);
    const cgstTotal = items.reduce((s, i) => s + i.cgstAmount, 0);
    const sgstTotal = items.reduce((s, i) => s + i.sgstAmount, 0);
    const igstTotal = items.reduce((s, i) => s + i.igstAmount, 0);
    const cessTotal = items.reduce((s, i) => s + i.cessAmount, 0);
    return {
      totalQty,
      itemTotal,
      subTotal,
      discountAmount,
      discountPercent,
      taxAmount,
      grandTotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
    };
  }, [items]);

  // Summary — freight + round off + paid/balance/change-return
  // Cash bill: customer zyada paise de toh Change Return (e.g. ₹485 bill, ₹500 diye → ₹15 wapas)
  const summary = useMemo(() => {
    const freightVal = Math.max(0, parseFloat(freight) || 0);
    const paidVal = Math.max(0, parseFloat(paidAmount) || 0);
    const netBillTotal = totals.grandTotal + freightVal;
    const netBillAmt = Math.round(netBillTotal * 100) / 100;
    const roundOff = Math.round(netBillAmt) - netBillAmt;
    const finalAmt = Math.round(netBillAmt);
    const balance = Math.max(0, Math.round((finalAmt - paidVal) * 100) / 100); // kam paise diye → baki
    const changeReturn = paidVal > finalAmt ? Math.round((paidVal - finalAmt) * 100) / 100 : 0; // zyada diye → wapas
    return {
      freightVal,
      paidVal,
      netBillTotal,
      netBillAmt,
      roundOff,
      finalAmt,
      balance,
      changeReturn,
    };
  }, [totals.grandTotal, freight, paidAmount]);

  const selectCustomer = (c: CustomerOption) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerMobile(c.mobile ?? '');
    setCustomerEmail(c.email ?? '');
    setCustomerGstin(c.gstin ?? '');
    setCustomerCity(c.city ?? '');
    setCustomerState(c.state ?? '');
    // Address auto-fill — customer ki saved address/city/state/pin se (bina dobara type kiye)
    const addrParts = [c.address, [c.city, c.state, c.pin].filter(Boolean).join(', ')].filter(
      Boolean,
    );
    setBillingAddress(addrParts.join(', '));
    setCustomerModalOpen(false);
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
    // Credit limit + bacha hua amount fetch karo
    setCreditProfile(null);
    setCreditLoading(true);
    getCreditCustomer(c.id)
      .then((profile) => setCreditProfile(profile as CustomerCreditProfile))
      .catch(() => setCreditProfile(null))
      .finally(() => setCreditLoading(false));
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickForm.name.trim()) {
      return;
    }
    setQuickSubmitting(true);
    setQuickError(null);
    try {
      const payload: Record<string, unknown> = Object.fromEntries(
        Object.entries(quickForm).filter(([, v]) => v !== ''),
      );
      if (payload.creditLimit) {
        payload.creditLimit = Number(payload.creditLimit);
      }
      if (payload.creditDays) {
        payload.creditDays = Number(payload.creditDays);
      }
      const result = await apiRequest<Record<string, unknown>>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const customer = ((result as { data?: CustomerOption } | null)?.data ??
        result) as CustomerOption | null;
      if (customer?.id) {
        selectCustomer(customer);
        setQuickForm({
          name: '',
          mobile: '',
          email: '',
          gstin: '',
          city: '',
          creditLimit: '',
          creditDays: '',
        });
        setQuickOpen(false);
      } else {
        setQuickError('Customer created, but response was incomplete.');
      }
    } catch (err) {
      setQuickError((err as Error).message || 'Failed to create customer');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // ── Save: invoice ko backend mein save karo (draft) / save + post (final) ──
  // mode 'draft' = sirf draft save · mode 'posted' = draft create karke posting engine chalao (stock deduct)
  // Returns: saved invoice number (success) ya null (failure — error message set ho jati hai)
  // Next number nikal lo — taaki agla invoice naye number se bane (409 na aaye)
  const advanceInvoiceNumber = async () => {
    const next = await fetchNextInvoiceNumber(invoiceDate, paymentMode).catch(() => '');
    if (next) {
      setInvoiceNumber(next);
    }
  };

  const saveInvoice = async (mode: 'draft' | 'posted' = 'draft'): Promise<string | null> => {
    setSaveError(null);
    setSaveSuccess(false);
    setHasSaved(false);
    // Double-submit guard — pehla save chal raha ho to second call turant ignore karo
    if (savingRef.current) {
      return null;
    }
    if (!customerId) {
      setSaveError('Pehle customer select karo');
      return null;
    }
    if (items.length === 0) {
      setSaveError('Pehle kam se kam ek item add karo');
      return null;
    }
    if (!invoiceNumber) {
      setSaveError('Invoice number abhi generate nahi hua — thodi der ruko');
      return null;
    }
    setSaving(true);
    savingRef.current = true;
    try {
      const created = await createSalesInvoice({
        invoiceNumber,
        customerId,
        invoiceDate,
        status: 'draft',
        paymentTerms: effectivePaymentMode,
        billingAddress: billingAddress || undefined,
        subTotal: totals.subTotal,
        discountPercent: 0,
        discountAmount: totals.discountAmount,
        freight: summary.freightVal,
        taxAmount: totals.taxAmount,
        roundOff: summary.roundOff,
        grandTotal: summary.finalAmt,
        paidAmount: summary.paidVal,
        balanceAmount: summary.balance,
        paymentStatus:
          summary.paidVal >= summary.finalAmt ? 'paid' : summary.paidVal > 0 ? 'partial' : 'unpaid',
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        cessTotal: totals.cessTotal,
        // 0-qty rows ko save mat karo (khali line backend mein na jaye)
        items: items.filter((i) => i.quantity > 0).map(mapLineItemToPayload),
      });
      // Backend retry par fresh invoiceNumber assign ho sakta hai (UNIQUE conflict) —
      // isliye print/WhatsApp/email mein response ka REAL number use karo, request wala nahi.
      const savedNumber = created?.invoiceNumber || invoiceNumber;

      // Final save (posted) → backend posting engine chalao (stock deduct + status posted)
      if (mode === 'posted') {
        const postRes = await apiRequest<{ success: boolean; message?: string; errors?: string[] }>(
          `/sales/invoices/${created.id}/post`,
          {
            method: 'POST',
            body: JSON.stringify({ userId: '', userEmail: '' }),
          },
        );
        if (!postRes || postRes.success === false) {
          setSaveError(postRes?.message || 'Invoice post nahi hua — details check karo');
          // Draft to create ho chuka hai — next number nikal lo taaki dobara save par 409 na aaye
          await advanceInvoiceNumber();
          return null;
        }
        // Email/WhatsApp sirf posted save ke baad unlock (Save Draft se nahi)
        setHasSaved(true);
      }
      setLastSavedNumber(savedNumber);
      setLastSaveMode(mode);
      setSaveSuccess(true);
      // Next number nikal lo — taaki agla invoice naye number se bane (409 na aaye)
      await advanceInvoiceNumber();
      return savedNumber;
    } catch (err) {
      // Create/post bich mein fail ho jaye toh draft 409 na de — number advance kar do
      await advanceInvoiceNumber();
      setSaveError((err as Error).message || 'Invoice save nahi hua — dobara try karo');
      return null;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  // ── Save (F5) — final: save + post · Save Draft — sirf draft ──
  const handleSave = (): Promise<string | null> => saveInvoice('posted');
  const handleSaveDraft = (): Promise<string | null> => saveInvoice('draft');

  // ── Actions: Print / WhatsApp / Email (sab pehle save/post karte hain) ──
  // Print → pehle bill save + post hota hai, phir A4 invoice preview modal khulta hai
  const handlePrint = async () => {
    if (!customerId) {
      setSaveError('Pehle customer select karo');
      return;
    }
    if (items.length === 0) {
      setSaveError('Pehle kam se kam ek item add karo');
      return;
    }
    const saved = await saveInvoice('posted');
    if (!saved) {
      return;
    }
    setPrintInvoiceNumber(saved);
    setPrintZoom(80);
    setPrintOpen(true);
  };

  // Real server-side PDF (Puppeteer + embedded Devanagari font) — wahi #invoice-preview
  // HTML backend ko bhejta hai jo print modal mein dikhta hai.
  const handleDownloadPdf = async () => {
    if (!printInvoiceNumber) {
      setSaveError('Pehle invoice save karo — phir PDF download karo');
      return;
    }
    setPdfGenerating(true);
    try {
      const blob = await generateInvoicePdf();
      downloadPdfBlob(blob, `${printInvoiceNumber}.pdf`);
    } catch (err) {
      console.error('[PDF] generation failed:', err);
      setSaveError(`PDF generate nahi hua: ${(err as Error).message || 'unknown error'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Escape se print modal band
  useEffect(() => {
    if (!printOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPrintOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [printOpen]);

  const handleWhatsApp = async () => {
    if (!hasSaved || !lastSavedNumber) {
      setSaveError('Pehle invoice Save karo — phir WhatsApp bhej sakte ho');
      return;
    }
    if (!customerMobile) {
      setSaveError('Customer ka mobile number nahi hai — WhatsApp bhej nahi sakte');
      return;
    }
    const saved = lastSavedNumber;
    const digits = customerMobile.replace(/\D/g, '');
    const waNumber = digits.length === 10 ? `91${digits}` : digits;
    const text = encodeURIComponent(
      `Namaste ${customerName},\n\nAapka invoice ${saved} taiyar hai.\nTotal: ${formatINR(summary.finalAmt)}\n\nDhanyawad!\nShranix Krushi ERP`,
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = async () => {
    if (!hasSaved || !lastSavedNumber) {
      setSaveError('Pehle invoice Save karo — phir email bhej sakte ho');
      return;
    }
    if (!customerEmail) {
      setSaveError('Customer ka email nahi hai — email bhej nahi sakte');
      return;
    }
    const saved = lastSavedNumber;
    const subject = encodeURIComponent(`Invoice ${saved} — Shranix Krushi ERP`);
    const body = encodeURIComponent(
      `Namaste ${customerName},\n\nAapka invoice ${saved} is email ke saath hai.\nTotal: ${formatINR(summary.finalAmt)}\n\nDhanyawad!\nShranix Krushi ERP`,
    );
    window.location.href = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
  };

  // Keyboard handler hamesha latest functions dekhe — stale closure se bachne ke liye
  const kbRef = useRef({
    openCustomerSearch,
    openItemSearch,
    handleSave,
    handlePrint,
    navigate,
  });
  kbRef.current = { openCustomerSearch, openItemSearch, handleSave, handlePrint, navigate };

  // ── Keyboard shortcuts: mouse ke bina pura billing flow ──────────
  // F2 = Customer · F3 = Product · F4 = Payment · F5 = Save · F6 = Save & Print · Esc = Cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Modal khula ho toh shortcuts page ke peeche na chalein — modal khud handle karta hai (Escape bhi).
      // F5/F6 ke browser defaults (refresh / address-bar) phir bhi roko.
      if (printOpen || customerModalOpen || quickOpen || scanOpen) {
        if (e.key === 'F5' || e.key === 'F6') {
          e.preventDefault();
        }
        return;
      }
      // Esc — pehle khula item dropdown band, warna invoice cancel karke list par jao
      if (e.key === 'Escape') {
        if (itemOpen) {
          setItemOpen(false);
          return;
        }
        kbRef.current.navigate('/sales/invoices');
        return;
      }
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          kbRef.current.openCustomerSearch();
          break;
        case 'F3':
          e.preventDefault();
          kbRef.current.openItemSearch();
          break;
        case 'F4':
          e.preventDefault();
          paidAmountRef.current?.focus();
          paidAmountRef.current?.select();
          break;
        case 'F5':
          e.preventDefault();
          if (!saving) {
            void kbRef.current.handleSave();
          }
          break;
        case 'F6':
          e.preventDefault();
          if (!saving) {
            void kbRef.current.handlePrint();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [printOpen, customerModalOpen, quickOpen, itemOpen, saving, scanOpen]);

  return (
    <div className="animate-in fade-in duration-300 lg:flex lg:items-start lg:gap-5">
      {/* Left sticky rail — content area ke left edge par (desktop), sidebar ke baad */}
      <aside className="hidden shrink-0 lg:sticky lg:top-4 lg:block lg:w-40">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Shortcuts
          </p>
          <ShortcutItems className="flex flex-col gap-y-2.5" />
        </div>
      </aside>

      {/* Content — centered remaining space */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-0">
          {/* Mobile shortcuts strip (rail sirf desktop par) */}
          <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 lg:hidden dark:border-slate-700 dark:bg-slate-800/50">
            <ShortcutItems className="flex flex-wrap gap-x-4 gap-y-1.5" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/sales/invoices')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Back to sales invoices"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Create Sales Invoice
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sab kuch ek hi box mein
              </p>
            </div>
          </div>

          {/* Ek hi box — Payment mode + Invoice no + Date (aage items bhi yahin) */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Payment Mode — Cash / Credit (uppar, sale ka type) */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Payment Mode:
                </span>
                {(['cash', 'credit'] as const).map((mode) => (
                  <label
                    key={mode}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={paymentMode === mode}
                      onChange={() => {
                        setPaymentMode(mode);
                        setSaveSuccess(false);
                        setHasSaved(false);
                        setSaveError(null);
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {mode === 'cash' ? 'Cash' : 'Credit'}
                  </label>
                ))}
              </div>

              {/* Invoice number — auto (financial year ke hisab se, 001 se) */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
                <Hash className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Invoice No:
                </span>
                {numberLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {invoiceNumber}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">
                  FY {invoiceDate ? shortFinancialYear(new Date(invoiceDate)) : ''}
                </span>
              </div>

              {/* Invoice date — default aaj, DD/MM/YYYY mein dikhega, koi bhi date select kar sakte ho */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Date:
                </span>
                {/* Hidden native picker — value ISO (YYYY-MM-DD) mein save hota hai */}
                <input
                  ref={datePickerRef}
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => {
                    setInvoiceDate(e.target.value);
                    setSaveSuccess(false);
                    setHasSaved(false);
                    setSaveError(null);
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {/* Display button — DD/MM/YYYY, click karne par native date picker khulta hai */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      datePickerRef.current?.showPicker();
                    } catch {
                      datePickerRef.current?.focus();
                    }
                  }}
                  className="flex h-[34px] min-w-[110px] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400"
                  title="Date change karo"
                >
                  {invoiceDate ? formatDateDDMMYYYY(invoiceDate) : '--/--/----'}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Line — teeno items ke baad (box ke width mein fit) */}
            <hr className="my-4 border-t border-slate-200 dark:border-slate-700" />

            {/* Customer box (chhota) + Address box (aage) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Customer:
              </span>

              {/* Customer display box — click karne par popup khulta hai */}
              <button
                type="button"
                onClick={openCustomerSearch}
                className={cn(
                  'flex h-[38px] w-56 items-center rounded-lg border bg-white px-3 text-sm transition-colors dark:border-slate-600 dark:bg-slate-800',
                  customerName
                    ? 'border-emerald-300 text-slate-900 dark:border-emerald-500/60 dark:text-slate-100'
                    : 'border-slate-200 text-slate-400 dark:text-slate-500',
                )}
                title="Customer search karo (naam ya mobile) — F2"
              >
                <span className="flex-1 truncate text-left">
                  {customerName || 'Customer search karo...'}
                </span>
                <Kbd className="ml-1.5">F2</Kbd>
                <Search className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
              </button>

              {/* Find customer button */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={openCustomerSearch}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 active:scale-[0.96] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-sky-500 dark:hover:bg-sky-900/20 dark:hover:text-sky-400"
                title="Find customer"
                aria-label="Find customer"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Add customer button */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuickError(null);
                  setQuickOpen(true);
                }}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 active:scale-[0.96] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                title="Add new customer"
                aria-label="Add new customer"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Address box — aage */}
              <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Address:
              </span>
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => {
                  setBillingAddress(e.target.value);
                  setSaveSuccess(false);
                  setHasSaved(false);
                  setSaveError(null);
                }}
                placeholder="Billing address (optional)"
                className="h-[38px] min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Customer saved details — select karne par pehle se bhare huye dikhte hain (mobile/GST/email/city) */}
            {customerId && (customerMobile || customerEmail || customerGstin || customerCity) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {customerMobile && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    📞 {customerMobile}
                  </span>
                )}
                {customerEmail && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    ✉️ {customerEmail}
                  </span>
                )}
                {customerGstin && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-1 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800">
                    GST: {customerGstin}
                  </span>
                )}
                {customerCity && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    🏙️ {[customerCity, customerState].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            )}

            {/* Credit limit info — customer select hone par */}
            {customerId && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {creditLoading ? (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Credit info load ho raha hai...
                  </span>
                ) : creditProfile ? (
                  <>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Credit Limit:{' '}
                      <span className="font-bold">
                        ₹{(Number(creditProfile.creditLimit) || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Used:{' '}
                      <span className="font-bold">
                        ₹{(Number(creditProfile.outstanding) || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-1 font-medium',
                        (Number(creditProfile.availableCredit) || 0) <= 0
                          ? 'bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800'
                          : (Number(creditProfile.availableCredit) || 0) <=
                              (Number(creditProfile.creditLimit) || 0) * 0.2
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-800',
                      )}
                    >
                      Bacha:{' '}
                      <span className="font-bold">
                        ₹{(Number(creditProfile.availableCredit) || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">
                    Credit profile nahi mila — limit 0 maan li gayi
                  </span>
                )}
              </div>
            )}

            {/* Quick-create customer modal (portal → document.body, form kabhi nested nahi) */}
            <QuickCreateModal
              open={quickOpen}
              onClose={() => setQuickOpen(false)}
              title="Add New Customer"
              size="sm"
            >
              <form onSubmit={handleQuickCreate} className="space-y-4" noValidate>
                {quickError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    {quickError}
                  </div>
                )}
                <FormInput
                  label="Customer Name"
                  required
                  value={quickForm.name}
                  onChange={(e) => setQuickForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Enter customer name"
                />
                <FormInput
                  label="Mobile"
                  value={quickForm.mobile}
                  onChange={(e) => setQuickForm((f) => ({ ...f, mobile: e.target.value }))}
                  placeholder="Mobile number"
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={quickForm.email}
                  onChange={(e) => setQuickForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email address (optional)"
                />
                <FormInput
                  label="City"
                  value={quickForm.city}
                  onChange={(e) => setQuickForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                />
                <FormInput
                  label="GSTIN"
                  value={quickForm.gstin}
                  onChange={(e) => setQuickForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="GSTIN (optional)"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Udhar Limit (₹)"
                    type="number"
                    min={0}
                    value={quickForm.creditLimit}
                    onChange={(e) => setQuickForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder="e.g. 50000"
                  />
                  <FormInput
                    label="Udhar Days"
                    type="number"
                    min={0}
                    value={quickForm.creditDays}
                    onChange={(e) => setQuickForm((f) => ({ ...f, creditDays: e.target.value }))}
                    placeholder="e.g. 30"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="secondary" type="button" onClick={() => setQuickOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={quickSubmitting}>
                    {quickSubmitting ? 'Saving...' : 'Save & Select'}
                  </Button>
                </div>
              </form>
            </QuickCreateModal>

            {/* Customer search popup — naam ya mobile se search (Add Customer jaisa modal) */}
            <QuickCreateModal
              open={customerModalOpen}
              onClose={() => setCustomerModalOpen(false)}
              title="Customer Search"
              size="md"
            >
              <div className="space-y-3">
                {/* Search input — naam ya mobile */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerModalQuery}
                    onChange={(e) => setCustomerModalQuery(e.target.value)}
                    placeholder="Naam ya mobile number se search karo..."
                    autoFocus
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Customer list */}
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600">
                  {customerLoading && customers.length === 0 && (
                    <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
                    </div>
                  )}
                  {!customerLoading && filteredCustomers.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-slate-400">
                      Koi customer nahi mila — naam ya mobile number check karo
                    </div>
                  )}
                  {filteredCustomers.map((c) => {
                    const isSelected = c.id === customerId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className={cn(
                          'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                        )}
                      >
                        {/* Sirf naam — list chhoti rahe; select karne ke baad baaki details neeche dikhti hain */}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {c.name}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* Footer — naya customer yahin se add karo */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuickError(null);
                      setQuickOpen(true);
                      setCustomerModalOpen(false);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> New Customer
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setCustomerModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </QuickCreateModal>

            {/* ── Items: search + entry boxes + add + table + totals ──────── */}
            <div className="mt-4">
              {/* Item entry row — search (chhota) + Qty + Rate + Disc % + Disc ₹ + Add */}
              <div className="flex flex-wrap items-end gap-2">
                <span className="flex items-center gap-1.5 pb-[13px] text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Items: <Kbd>F3</Kbd>
                </span>

                {/* Item search box — baaki inputs jaisa h-11, available jagah bharti hai */}
                <div className="relative min-w-[200px] flex-1">
                  <div
                    className={cn(
                      'flex h-11 w-full cursor-pointer items-center rounded-lg border bg-white px-2.5 text-sm transition-colors dark:border-slate-600 dark:bg-slate-800',
                      itemOpen
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400'
                        : 'border-slate-200',
                    )}
                    onClick={openItemSearch}
                  >
                    <Package className="mr-1.5 h-4 w-4 shrink-0 text-slate-400" />
                    {itemOpen ? (
                      <input
                        ref={itemInputRef}
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        onBlur={() => {
                          if (itemBlurTimer.current) {
                            clearTimeout(itemBlurTimer.current);
                          }
                          itemBlurTimer.current = setTimeout(() => setItemOpen(false), 200);
                        }}
                        placeholder="Product search..."
                        className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                        autoComplete="off"
                      />
                    ) : (
                      <span className="flex-1 truncate text-slate-400 dark:text-slate-500">
                        {pendingProduct ? pendingProduct.name : 'Product search...'}
                      </span>
                    )}
                    {productLoading ? (
                      <Loader2 className="ml-1.5 h-4 w-4 shrink-0 animate-spin text-emerald-500" />
                    ) : (
                      <Search className="ml-1.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </div>

                  {/* Item dropdown */}
                  {itemOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                      {productLoading && productResults.length === 0 && (
                        <div className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                        </div>
                      )}
                      {!productLoading && productResults.length === 0 && (
                        <div className="px-3 py-5 text-center text-sm text-slate-400">
                          No products found
                        </div>
                      )}
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectProduct(p);
                          }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                            'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700',
                          )}
                        >
                          {/* Compact row — sirf naam (chhota dikhe, list me jaldi scan ho) */}
                          <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                          {p.currentStock <= 0 && (
                            <span className="shrink-0 text-[10px] font-semibold text-red-500">
                              Out of stock
                            </span>
                          )}
                          <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Barcode / QR scan button — scanner gun se dono scan hote hain */}
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.96] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                  title="Barcode/QR scan karo (scanner gun se)"
                >
                  <Barcode className="h-4 w-4" />
                  Scan
                </button>

                {/* Qty */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={pendingQty}
                    onChange={(e) => setPendingQty(e.target.value)}
                    className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Quantity"
                  />
                </label>

                {/* Rate */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Rate ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={pendingRate}
                    onChange={(e) => setPendingRate(e.target.value)}
                    placeholder="0.00"
                    className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                    aria-label="Rate"
                  />
                </label>

                {/* Disc % */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Disc %
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={pendingDiscPct}
                    onChange={(e) => setPendingDiscPct(e.target.value)}
                    className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Discount percentage"
                  />
                </label>

                {/* Disc ₹ */}
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Disc ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={pendingDiscAmt}
                    onChange={(e) => setPendingDiscAmt(e.target.value)}
                    className="h-11 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Discount amount"
                  />
                </label>

                {/* Add button */}
                <button
                  type="button"
                  onClick={addPendingItem}
                  disabled={!pendingProduct}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  title="Item add karo"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {/* Pending item hint */}
              {pendingProduct && (
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <b className="text-slate-600 dark:text-slate-300">{pendingProduct.name}</b>{' '}
                  selected — qty/rate/discount set karke{' '}
                  <b className="text-emerald-600 dark:text-emerald-400">Add</b> dabao
                </p>
              )}

              {/* Items table + Summary side-by-side */}
              <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                {/* Items table — vertically thoda bada, hamesha dikhta hai */}
                <div className="min-h-[340px] flex-1 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                        <th className="px-3 py-3 font-semibold">#</th>
                        <th className="px-3 py-3 font-semibold">Item</th>
                        <th className="px-3 py-3 font-semibold">Company</th>
                        <th className="px-3 py-3 font-semibold">HSN</th>
                        <th className="px-3 py-3 font-semibold">Batch No</th>
                        <th className="px-3 py-3 font-semibold">Expiry</th>
                        <th className="px-3 py-3 text-center font-semibold">Qty</th>
                        <th className="px-3 py-3 text-right font-semibold">Rate ₹</th>
                        <th className="px-3 py-3 text-right font-semibold">Disc ₹</th>
                        <th className="px-3 py-3 text-center font-semibold">GST %</th>
                        <th className="px-3 py-3 text-right font-semibold">Amount</th>
                        <th className="px-3 py-3 text-center font-semibold" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={12} className="px-3 py-8 text-center">
                            <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-500">
                              <Package className="h-7 w-7" />
                              <p className="text-sm">
                                Abhi koi item nahi — upar search karke product add karo
                              </p>
                              <p className="text-xs">Add hone par items yahin dikhte rahenge</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'transition-colors duration-150',
                            idx % 2 === 1 && 'bg-slate-50/70 dark:bg-slate-800/30',
                            'hover:bg-slate-100/80 dark:hover:bg-slate-800/50',
                          )}
                        >
                          <td className="px-3 py-3 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {item.productName}
                            </p>
                            <p className="text-xs text-slate-400">{item.sku}</p>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.company || '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.hsn || '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.batchNo || '—'}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {item.expiryDate ? formatDateDDMMYYYY(item.expiryDate) : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                value={item.quantity || ''}
                                min={1}
                                onChange={(e) =>
                                  updateItemQty(item.id, parseFloat(e.target.value) || 0)
                                }
                                className={cn(
                                  'h-9 w-20 rounded-md border bg-white px-1.5 text-center text-sm font-medium text-slate-800 outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200',
                                  item.quantity > item.availableStock
                                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
                                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-600',
                                )}
                                aria-label="Quantity"
                              />
                              {item.quantity > item.availableStock && (
                                <span className="text-[11px] font-medium text-red-500">
                                  Stock: {item.availableStock}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={item.rate}
                              min={0}
                              step={0.01}
                              onChange={(e) =>
                                updateItemRate(item.id, parseFloat(e.target.value) || 0)
                              }
                              className="h-9 w-24 rounded-md border border-slate-200 bg-white px-1.5 text-right text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              aria-label="Rate"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.discountValue > 0 ? (
                              <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                                -{formatINR(item.discountValue)}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                            {item.gstPercent}%
                          </td>
                          <td className="px-3 py-3 text-right text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                            {formatINR(item.amount)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                              aria-label={`Remove ${item.productName}`}
                            >
                              <Trash2 className="h-[18px] w-[18px]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary box — side wala vertical box */}
                <div className="w-full shrink-0 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-5 lg:w-80 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Bill Summary
                  </p>

                  <SummaryRow label="Total Qty" value={String(totals.totalQty)} />
                  <SummaryRow label="Item Total" value={formatINR(totals.itemTotal)} />
                  <SummaryRow
                    label="Disc (% ₹)"
                    value={
                      totals.discountAmount > 0
                        ? `-${totals.discountPercent}% (${formatINR(totals.discountAmount)})`
                        : `${totals.discountPercent}% (${formatINR(0)})`
                    }
                    className={
                      totals.discountAmount > 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  />
                  <SummaryRow label="Taxable Amt" value={formatINR(totals.subTotal)} />
                  <SummaryRow label="Total Amt" value={formatINR(totals.grandTotal)} />

                  {/* Freight & postage — editable */}
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Freight & Postage</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={freight}
                        onChange={(e) => {
                          setFreight(e.target.value);
                          setSaveSuccess(false);
                          setHasSaved(false);
                          setSaveError(null);
                        }}
                        placeholder="0"
                        className="h-8 w-24 rounded-md border border-slate-200 bg-white pl-5 pr-2 text-right text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        aria-label="Freight and postage"
                      />
                    </div>
                  </label>

                  <SummaryRow label="Net Bill Total" value={formatINR(summary.netBillTotal)} />
                  <SummaryRow label="Round Off" value={formatINR(summary.roundOff)} />

                  <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                    <SummaryRow label="Net Bill Amt" value={formatINR(summary.finalAmt)} bold />
                  </div>

                  {/* Paid amount — editable */}
                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      Paid Amount <Kbd>F4</Kbd>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={paidAmount}
                        ref={paidAmountRef}
                        onChange={(e) => {
                          setPaidAmount(e.target.value);
                          setSaveSuccess(false);
                          setHasSaved(false);
                          setSaveError(null);
                        }}
                        placeholder="0"
                        className="h-8 w-24 rounded-md border border-slate-200 bg-white pl-5 pr-2 text-right text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        aria-label="Paid amount"
                      />
                    </div>
                  </label>

                  {/* Balance / Change Return — sirf cash me Change Return (zyada paise diye toh wapas), credit me hamesha Balance */}
                  {paymentMode === 'cash' && summary.changeReturn > 0 ? (
                    <div className="rounded-md bg-emerald-50 px-2.5 py-1.5 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800">
                      <SummaryRow
                        label="Change Return"
                        value={formatINR(summary.changeReturn)}
                        className="text-emerald-700 dark:text-emerald-400"
                        bold
                      />
                    </div>
                  ) : (
                    <div className="rounded-md bg-emerald-50 px-2.5 py-1.5 dark:bg-emerald-900/20">
                      <SummaryRow
                        label="Balance"
                        value={formatINR(summary.balance)}
                        className={
                          summary.balance > 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                        bold
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line + Action buttons (Print / WhatsApp / Email — sab pehle auto-save) */}
            <hr className="my-4 border-t border-slate-200 dark:border-slate-700" />
            {saveError && (
              <div
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                role="alert"
              >
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div
                className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                role="status"
              >
                {lastSaveMode === 'posted'
                  ? `✅ Invoice post ho gaya! (${lastSavedNumber})`
                  : `📝 Draft save ho gaya! (${lastSavedNumber})`}
              </div>
            )}
            {/* Counter payment — bill ready, print se pehle customer se poochho: UPI ya Hard Cash (sirf Cash sale par) */}
            {paymentMode === 'cash' && (
              <div className="mb-3 flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
                {(['upi', 'cash'] as const).map((cp) => (
                  <label
                    key={cp}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  >
                    <input
                      type="radio"
                      name="counterPayment"
                      checked={counterPayment === cp}
                      onChange={() => {
                        setCounterPayment(cp);
                        setSaveSuccess(false);
                        setHasSaved(false);
                        setSaveError(null);
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    {cp === 'upi' ? 'UPI' : 'Hard Cash'}
                  </label>
                ))}

                {/* UPI QR — counterPayment upi par, upiId settings se (customer ko scan karne ke liye) */}
                {counterPayment === 'upi' && (
                  <div className="flex items-center gap-3">
                    {upiId ? (
                      <>
                        <UpiQrCode
                          upiId={upiId}
                          name="Shranix Krushi ERP"
                          amount={summary.finalAmt}
                          note={`Invoice ${invoiceNumber || ''}`}
                          size={120}
                        />
                        <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Scan to Pay — {formatINR(summary.finalAmt)}
                          </p>
                          <p>Customer UPI se bill ka amount scan karke pay karega</p>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                        ⚠️ UPI ID set nahi hai — <b>Sales Settings</b> &gt; UPI Payment mein apna
                        UPI ID daalo
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Cancel — bina save kiye list par wapas (Esc) */}
              <Button
                variant="outline"
                onClick={() => navigate('/sales/invoices')}
                className="flex min-w-[110px] items-center justify-center gap-1.5 border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Invoice cancel karke list par jao (Esc)"
              >
                <X className="h-4 w-4" />
                Cancel
                <Kbd>Esc</Kbd>
              </Button>

              {/* Save Draft — sirf draft save (post nahi) */}
              <Button
                variant="secondary"
                onClick={() => void handleSaveDraft()}
                disabled={saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/50 dark:hover:text-amber-200"
                title="Draft save karo (post nahi hota)"
              >
                <FileText className="h-4 w-4" />
                Save Draft
              </Button>

              {/* Save — final: save + post (F5) */}
              <Button
                variant="secondary"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-200"
                title="Invoice save + post karo (F5)"
              >
                <Check className="h-4 w-4" />
                Save
                <Kbd>F5</Kbd>
              </Button>

              {/* Save & Print — pehle save+post, phir A4 preview (F6) */}
              <Button
                variant="secondary"
                onClick={handlePrint}
                disabled={saving}
                className="flex min-w-[150px] items-center justify-center gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-200"
                title="Invoice save + print karo (F6)"
              >
                <Printer className="h-4 w-4" />
                Save & Print
                <Kbd>F6</Kbd>
              </Button>

              {/* Email — save/post hone ke baad hi enable */}
              <Button
                variant="secondary"
                onClick={handleEmail}
                disabled={!hasSaved || saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:border-sky-700 dark:hover:bg-sky-900/50 dark:hover:text-sky-200"
                title={
                  hasSaved
                    ? 'Email se invoice bhejo'
                    : 'Pehle invoice Save karo — phir email bhej sakte ho'
                }
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>

              {/* WhatsApp — save/post hone ke baad hi enable */}
              <Button
                variant="secondary"
                onClick={handleWhatsApp}
                disabled={!hasSaved || saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:border-green-700 dark:hover:bg-green-900/50 dark:hover:text-green-200"
                title={
                  hasSaved
                    ? 'WhatsApp par invoice bhejo'
                    : 'Pehle invoice Save karo — phir WhatsApp bhej sakte ho'
                }
              >
                <Send className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Print modal — A4 invoice preview (Print button par khulta hai) */}
      {printOpen && (
        <div className="print-modal-overlay fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
          <style>{`
            @media print {
              /* A4 + zero browser margins (invoice apna padding khud rakhta hai) */
              @page { size: A4 portrait; margin: 0; }
              /* h-screen / overflow-hidden app wrapper print mein clip na kare */
              html, body { height: auto !important; overflow: visible !important; }
              #root { height: auto !important; overflow: visible !important; }
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              /* overlay: backdrop-filter containing-block bug + fixed positioning hataya */
              .print-modal-overlay {
                position: static !important;
                inset: auto !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                background: #fff !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                filter: none !important;
                transform: none !important;
              }
              .print-modal-overlay .print-modal-toolbar,
              .print-modal-scroll { overflow: visible !important; height: auto !important; }
              .print-modal-toolbar { display: none !important; }
              .print-modal-scroll { padding: 0 !important; margin: 0 !important; }
              #print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #invoice-preview {
                transform: none !important;
                width: 100% !important;
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
            }
          `}</style>

          {/* Toolbar — zoom + close + print */}
          <div className="print-modal-toolbar flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex min-w-0 items-center gap-2">
              <Printer className="h-4 w-4 shrink-0 text-emerald-500" />
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                Invoice Preview — {printInvoiceNumber}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-1 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setPrintZoom((z) => Math.max(40, z - 10))}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[38px] text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {printZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setPrintZoom((z) => Math.min(150, z + 10))}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPrintOpen(false)}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleDownloadPdf()}
                disabled={pdfGenerating}
                className="flex items-center gap-1"
                title="Real server-side PDF download"
              >
                {pdfGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {pdfGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="flex items-center gap-1"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          {/* Scrollable preview area */}
          <div className="print-modal-scroll min-h-0 flex-1 overflow-auto bg-slate-200/70 p-6 dark:bg-slate-900/50">
            <div id="print-area" className="mx-auto w-fit">
              <InvoicePreview
                template="classic"
                docType="tax_invoice"
                invoiceNumber={printInvoiceNumber}
                invoiceDate={invoiceDate}
                dueDate=""
                customerName={customerName}
                billingAddress={billingAddress}
                customerGstin={customerGstin}
                customerMobile={customerMobile}
                placeOfSupply={customerState}
                items={items}
                grossTotal={totals.itemTotal}
                itemDiscountTotal={totals.discountAmount}
                taxableAfterDiscount={totals.subTotal}
                cgstTotal={totals.cgstTotal}
                sgstTotal={totals.sgstTotal}
                igstTotal={totals.igstTotal}
                cessTotal={totals.cessTotal}
                roundOff={summary.roundOff}
                grandTotal={summary.finalAmt}
                totalPaid={summary.paidVal}
                balance={summary.balance}
                paymentSplits={[]}
                isInterState={false}
                salesPerson=""
                notes=""
                showLogo
                showSignature
                showBankDetails={false}
                zoom={printZoom}
                pageMargins={5}
                pageFontSize={10}
                upiId={upiId}
                upiQrPayload={
                  upiId
                    ? buildUpiPayload({
                        upiId,
                        name: 'Shranix Krushi ERP',
                        amount: summary.finalAmt,
                        note: printInvoiceNumber,
                      })
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Barcode / QR scan modal (scanner gun) */}
      <BarcodeScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={handleScannedProduct}
      />
    </div>
  );
}
