import {
  ArrowLeft,
  Barcode,
  Calendar,
  CalendarClock,
  Check,
  ChevronDown,
  FileDown,
  FileText,
  Hash,
  Loader2,
  Package,
  Plus,
  Printer,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { QuickCreateModal } from '@/components/ui/QuickCreateModal';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import { getCreditCustomer, type CustomerCreditProfile } from '@/services/sales-credit.service';

import { BarcodeScanModal } from './barcode-scan-modal';
import { PAYMENT_TERMS, type CustomerOption } from './invoice-common';
import {
  recomputeLine,
  type InvoiceLineItem,
  type ProductRecord,
} from './product-selection-screen';
import { SalesOrderShareModal } from './sales-order-share-modal';

// ═════════════════════════════════════════════════════════
// SALES ORDER CREATE PAGE — STEP BY STEP BUILD
// (Invoice/Quotation jaisa hi single-box design — SO No, Date,
//  Delivery Date, Customer, Items, Summary — sab EK BOX mein)
// ═════════════════════════════════════════════════════════

export const ORDER_STATUSES = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Partial', value: 'partial' },
  { label: 'Completed', value: 'completed' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Cancelled', value: 'cancelled' },
];

// Today as YYYY-MM-DD (local timezone-safe)
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ISO date → DD/MM/YYYY
function formatDateDDMMYYYY(iso: string): string {
  const [y, m, d] = (iso || '').split('T')[0].split('-');
  if (!y || !m || !d) {
    return iso || '--/--/----';
  }
  return `${d}/${m}/${y}`;
}

// Indian financial year SHORT — e.g. 2026-27
function shortFinancialYear(date: Date): string {
  if (isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

// ₹ Indian number format
function formatINR(amount: number): string {
  return `₹${(Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Summary box row
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

// Keyboard key chip
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

// Shortcut list — left rail + mobile strip
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
        <Kbd>F5</Kbd> Save &amp; Confirm
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

// ═════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════

export function SalesOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // ── Order header ─────────────────────────────────────
  const [orderNumber, setOrderNumber] = useState('');
  const [numberLoading, setNumberLoading] = useState(!isEditing);
  const [orderDate, setOrderDate] = useState(todayISO);
  const [deliveryDate, setDeliveryDate] = useState('');
  const orderDatePickerRef = useRef<HTMLInputElement>(null);
  const deliveryDatePickerRef = useRef<HTMLInputElement>(null);

  // ── Edit-mode loading ────────────────────────────────
  const [loading, setLoading] = useState(isEditing);

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

  // ── Customer credit profile ─────────────────────────
  const [creditProfile, setCreditProfile] = useState<CustomerCreditProfile | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // ── Order options ───────────────────────────────────
  const [paymentTerms, setPaymentTerms] = useState('');
  const [orderStatus, setOrderStatus] = useState('draft');
  const [isPartial, setIsPartial] = useState(false);
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([]);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<{ label: string; value: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);

  // ── Items ──────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [productResults, setProductResults] = useState<ProductRecord[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Barcode / QR scan ──────────────────────────────
  const [scanOpen, setScanOpen] = useState(false);

  // ── Pending item entry ─────────────────────────────
  const [pendingProduct, setPendingProduct] = useState<ProductRecord | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [pendingRate, setPendingRate] = useState('');
  const [pendingDiscPct, setPendingDiscPct] = useState('0');
  const [pendingDiscAmt, setPendingDiscAmt] = useState('0');

  // ── Save state ──────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedNumber, setLastSavedNumber] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [lastSaveMode, setLastSaveMode] = useState<'draft' | 'confirm'>('draft');
  const [orderId, setOrderId] = useState(id || '');
  const [shareOpen, setShareOpen] = useState(false);

  // ── SO Number preview (auto) — counter NOT advanced, sirf dikhata hai ──
  useEffect(() => {
    if (isEditing) {
      return;
    }
    let cancelled = false;
    setNumberLoading(true);
    apiRequest<{ orderNumber?: string }>('/sales/orders/next-number')
      .then((res) => {
        const data = (res as { data?: { orderNumber?: string } })?.data ?? res;
        if (!cancelled && data?.orderNumber) {
          setOrderNumber(data.orderNumber);
        }
      })
      .catch(() => {
        /* non-fatal — server save par generate karega */
      })
      .finally(() => {
        if (!cancelled) {
          setNumberLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  // ── Load warehouses + branches + existing order (edit mode) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [whRes, brRes] = await Promise.all([
          apiRequest<any>('/warehouses?pageSize=200').catch(() => null),
          apiRequest<any>('/branches?pageSize=200').catch(() => null),
        ]);
        const unwrap = (r: any) => {
          const body =
            r?.data && typeof r.data === 'object' && 'data' in r.data ? r.data.data : r?.data;
          return Array.isArray(body) ? body : [];
        };
        if (!cancelled) {
          setWarehouses(
            unwrap(whRes).map((r: any) => ({
              label: String(r.name || r.code || r.id),
              value: String(r.id),
            })),
          );
          setBranches(
            unwrap(brRes).map((r: any) => ({
              label: String(r.name || r.code || r.id),
              value: String(r.id),
            })),
          );
        }
      } catch {
        /* non-fatal */
      }

      if (isEditing && id) {
        try {
          const q = await apiRequest<any>(`/sales/orders/${id}`);
          const rec = q?.data ?? q ?? {};
          const cust = rec.customerId
            ? await apiRequest<any>(`/customers/${rec.customerId}`).catch(() => null)
            : null;
          const c = cust?.data ?? cust ?? null;
          if (!cancelled) {
            setOrderId(id);
            setOrderNumber(rec.orderNumber || '');
            setOrderDate(String(rec.orderDate || todayISO()).slice(0, 10));
            setDeliveryDate(String(rec.deliveryDate || '').slice(0, 10));
            setBranchId(rec.branchId || '');
            setWarehouseId(rec.warehouseId || '');
            setPaymentTerms(rec.paymentTerms || '');
            setOrderStatus(rec.status || 'draft');
            setIsPartial(Boolean(rec.isPartial));
            setBillingAddress(rec.billingAddress || c?.address || '');
            setShippingAddress(rec.shippingAddress || '');
            setContactPerson(rec.contactPerson || (c as any)?.contactPerson || '');
            setNotes(rec.notes || '');
            setTerms(rec.terms || '');
            if (c) {
              setCustomerId(c.id || rec.customerId || '');
              setCustomerName(c.name || '');
              setCustomerMobile(c.mobile || '');
              setCustomerEmail(c.email || '');
              setCustomerGstin(c.gstin || '');
              setCustomerCity(c.city || '');
              setCustomerState(c.state || '');
            } else {
              setCustomerId(rec.customerId || '');
            }
            if (Array.isArray(rec.items)) {
              setItems(
                rec.items.map((it: any) => ({
                  id: it.id || String(Math.random()),
                  productId: it.itemId,
                  productName: it.description || it.itemName || '',
                  company: '',
                  sku: '',
                  hsn: '',
                  barcode: '',
                  batchNo: '',
                  expiryDate: '',
                  warehouse: 'Main',
                  uom: 'Pcs',
                  availableStock: 0,
                  quantity: Number(it.quantity) || 0,
                  freeQty: 0,
                  rate: Number(it.rate) || 0,
                  priceList: 'retail',
                  discountType:
                    it.discountType === 'percent' || !it.discountType
                      ? 'percentage'
                      : it.discountType,
                  discountValue: Number(it.discountAmount) || 0,
                  discountPercent: Number(it.discountPercent) || 0,
                  schemeName: '',
                  gstPercent: Number(it.gstRate) || 0,
                  cgstPercent: Number(it.cgst) || 0,
                  sgstPercent: Number(it.sgst) || 0,
                  igstPercent: Number(it.igst) || 0,
                  cessPercent: Number(it.cess) || 0,
                  taxableAmount: Number(it.taxableValue) || 0,
                  gstAmount:
                    (Number(it.igst) || 0) +
                    (Number(it.cgst) || 0) +
                    (Number(it.sgst) || 0) +
                    (Number(it.cess) || 0),
                  cgstAmount: Number(it.cgst) || 0,
                  sgstAmount: Number(it.sgst) || 0,
                  igstAmount: Number(it.igst) || 0,
                  cessAmount: Number(it.cess) || 0,
                  amount: Number(it.totalAmount) || 0,
                  isExpired: false,
                  isBlocked: false,
                  creditHold: false,
                  isExpanded: false,
                })),
              );
            }
            setHasSaved(true);
          }
        } catch (e) {
          if (!cancelled) {
            setSaveError((e as Error).message);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, id]);

  // Customer list load — popup kholne par (ps=1000, client-side filter)
  const loadCustomers = async () => {
    setCustomerLoading(true);
    try {
      const res = await apiRequest<{ data: CustomerOption[] }>(`/customers?page=1&ps=1000`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
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

  const openItemSearch = () => {
    if (itemBlurTimer.current) {
      clearTimeout(itemBlurTimer.current);
      itemBlurTimer.current = null;
    }
    setProductLoading(true);
    setItemOpen(true);
    requestAnimationFrame(() => itemInputRef.current?.focus());
  };

  // Popup mein naam / mobile / GSTIN se search (client-side)
  const filteredCustomers = useMemo(() => {
    const q = customerModalQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const filtered = customers.filter((c) => {
      if (!q) {
        return true;
      }
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const gstin = (c.gstin || '').toLowerCase();
      const mobile = (c.mobile || '').replace(/\D/g, '');
      return (
        name.includes(q) ||
        email.includes(q) ||
        gstin.includes(q) ||
        (digits.length >= 3 && mobile.includes(digits))
      );
    });
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

  const buildOrderLine = (
    product: ProductRecord,
    qty: number,
    rate: number,
    discPct: number,
    discAmt: number,
  ): InvoiceLineItem => {
    const gross = qty * rate;
    const pctDisc = gross * (discPct / 100);
    const totalDisc = pctDisc + discAmt;
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
    const firstBatch =
      pendingProduct.batches?.find((b) => b.availableQty > 0) ?? pendingProduct.batches?.[0];
    const line = buildOrderLine(pendingProduct, qty, rate, discPct, discAmt);
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
    setPendingProduct(null);
    setPendingQty('1');
    setPendingRate('');
    setPendingDiscPct('0');
    setPendingDiscAmt('0');
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  // Gun-scan se mila product → qty 1 ke saath turant add
  const handleScannedProduct = (product: ProductRecord) => {
    const qty = 1;
    const rate = Number(product.salesRate) || 0;
    const firstBatch = product.batches?.find((b) => b.availableQty > 0) ?? product.batches?.[0];
    const line = buildOrderLine(product, qty, rate, 0, 0);
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

  const updateItemQty = (itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? recomputeLine({ ...i, quantity: Math.max(0, qty) }) : i)),
    );
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const updateItemRate = (itemId: string, rate: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? recomputeLine({ ...i, rate: Math.max(0, rate) }) : i)),
    );
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
  };

  // ── Totals (Invoice/Quotation jaisa hi chain) ────────
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const itemTotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const subTotal = items.reduce((s, i) => s + i.taxableAmount, 0);
    const discountAmount = items.reduce((s, i) => s + i.discountValue, 0);
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

  // Summary — round off + grand total
  const summary = useMemo(() => {
    const netBillAmt = Math.round(totals.grandTotal * 100) / 100;
    const roundOff = Math.round(netBillAmt) - netBillAmt;
    const finalAmt = Math.round(netBillAmt);
    return { roundOff, finalAmt };
  }, [totals.grandTotal]);

  const selectCustomer = (c: CustomerOption) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerMobile(c.mobile ?? '');
    setCustomerEmail(c.email ?? '');
    setCustomerGstin(c.gstin ?? '');
    setCustomerCity(c.city ?? '');
    setCustomerState(c.state ?? '');
    const addrParts = [c.address, [c.city, c.state, c.pin].filter(Boolean).join(', ')].filter(
      Boolean,
    );
    setBillingAddress(addrParts.join(', '));
    setShippingAddress((prev) => prev || addrParts.join(', '));
    setContactPerson((prev) => prev || (c.contactPerson ?? ''));
    setCustomerModalOpen(false);
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);
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

  // ── Save: order ko backend mein save karo ─────────────────────────
  // mode 'draft'   = sirf draft save
  // mode 'confirm' = save + status 'confirmed'
  // mode 'print'   = save + print/share modal kholo
  const saveOrder = async (mode: 'draft' | 'confirm' | 'print'): Promise<string | null> => {
    setSaveError(null);
    setSaveSuccess(false);
    setHasSaved(false);
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
    if (!orderDate) {
      setSaveError('Order date required hai');
      return null;
    }
    setSaving(true);
    savingRef.current = true;
    try {
      const payload = {
        orderNumber: orderNumber || undefined,
        customerId,
        orderDate,
        deliveryDate: deliveryDate || undefined,
        warehouseId: warehouseId || undefined,
        branchId: branchId || undefined,
        status: mode === 'confirm' ? 'confirmed' : orderStatus || 'draft',
        paymentTerms: paymentTerms || undefined,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        contactPerson: contactPerson || undefined,
        isPartial,
        subTotal: totals.subTotal,
        discountPercent: 0,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        cessTotal: totals.cessTotal,
        roundOff: summary.roundOff,
        grandTotal: summary.finalAmt,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items
          .filter((i) => i.quantity > 0)
          .map((i) => ({
            itemId: i.productId,
            description: i.productName || null,
            quantity: Number(i.quantity) || 1,
            rate: Number(i.rate) || 0,
            discountPercent: Number(i.discountPercent) || 0,
            discountAmount: Number(i.discountValue) || 0,
            taxableValue: Number(i.taxableAmount) || 0,
            gstRate: Number(i.gstPercent) || 0,
            igst: Number(i.igstAmount) || 0,
            cgst: Number(i.cgstAmount) || 0,
            sgst: Number(i.sgstAmount) || 0,
            cess: Number(i.cessAmount) || 0,
            totalAmount: Number(i.amount) || 0,
          })),
      };
      const body = JSON.stringify(payload);
      const res =
        isEditing && id
          ? await apiRequest(`/sales/orders/${id}`, { method: 'PUT', body })
          : await apiRequest('/sales/orders', { method: 'POST', body });
      const rec = (res as { data?: any })?.data ?? res ?? {};
      const newId = id || String(rec?.id || '');
      const savedNumber = String(rec?.orderNumber || orderNumber || '');

      setOrderId(newId);
      setOrderStatus(mode === 'confirm' ? 'confirmed' : orderStatus);
      setOrderNumber(savedNumber);
      setLastSavedNumber(savedNumber);
      setLastSaveMode(mode === 'confirm' ? 'confirm' : 'draft');
      setSaveSuccess(true);
      setHasSaved(true);
      if (mode === 'print') {
        setShareOpen(true);
      }
      return savedNumber;
    } catch (err) {
      setSaveError((err as Error).message || 'Order save nahi hua — dobara try karo');
      return null;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleSaveConfirm = (): Promise<string | null> => saveOrder('confirm');
  const handleSaveDraft = (): Promise<string | null> => saveOrder('draft');

  // Save & Print — saveOrder('print') khud hi share/print modal kholta hai
  const handlePrint = async () => {
    if (!customerId) {
      setSaveError('Pehle customer select karo');
      return;
    }
    if (items.length === 0) {
      setSaveError('Pehle kam se kam ek item add karo');
      return;
    }
    await saveOrder('print');
  };

  // Keyboard shortcuts — mouse ke bina pura flow
  const kbRef = useRef({
    openCustomerSearch,
    openItemSearch,
    handleSaveConfirm,
    handlePrint,
    navigate,
  });
  kbRef.current = { openCustomerSearch, openItemSearch, handleSaveConfirm, handlePrint, navigate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shareOpen || customerModalOpen || quickOpen || scanOpen) {
        if (e.key === 'F5' || e.key === 'F6') {
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape') {
        if (itemOpen) {
          setItemOpen(false);
          return;
        }
        kbRef.current.navigate('/sales/orders');
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
        case 'F5':
          e.preventDefault();
          if (!saving) {
            void kbRef.current.handleSaveConfirm();
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
  }, [shareOpen, customerModalOpen, quickOpen, itemOpen, saving, scanOpen]);

  // ── Edit-mode loading ────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">Sales Order load ho raha hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 lg:flex lg:items-start lg:gap-5">
      {/* Left sticky rail (desktop) */}
      <aside className="hidden shrink-0 lg:sticky lg:top-4 lg:block lg:w-40">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Shortcuts
          </p>
          <ShortcutItems className="flex flex-col gap-y-2.5" />
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-0">
          {/* Mobile shortcuts strip */}
          <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 lg:hidden dark:border-slate-700 dark:bg-slate-800/50">
            <ShortcutItems className="flex flex-wrap gap-x-4 gap-y-1.5" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/sales/orders')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Back to sales orders"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isEditing ? 'Edit Sales Order' : 'Create Sales Order'}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sab kuch ek hi box mein — items, delivery, status aur confirm
              </p>
            </div>
          </div>

          {/* Ek hi box — SO No + Date + Delivery Date */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* SO No — auto preview / manual */}
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  SO No:
                </span>
                {numberLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                ) : (
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => {
                      setOrderNumber(e.target.value);
                      setSaveSuccess(false);
                      setHasSaved(false);
                      setSaveError(null);
                    }}
                    placeholder="AUTO"
                    title="Auto numbering ON hai to preview yahin dikhta hai — manual ke liye type karo"
                    className="h-[34px] w-32 rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
                  />
                )}
                <span className="text-[11px] text-slate-400">
                  FY {orderDate ? shortFinancialYear(new Date(orderDate)) : ''}
                </span>
              </div>

              {/* Order Date */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Date:
                </span>
                <input
                  ref={orderDatePickerRef}
                  type="date"
                  value={orderDate}
                  onChange={(e) => {
                    setOrderDate(e.target.value);
                    setSaveSuccess(false);
                    setHasSaved(false);
                    setSaveError(null);
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      orderDatePickerRef.current?.showPicker();
                    } catch {
                      orderDatePickerRef.current?.focus();
                    }
                  }}
                  className="flex h-[34px] min-w-[110px] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400"
                  title="Order date change karo"
                >
                  {formatDateDDMMYYYY(orderDate)}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Delivery Date */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Delivery:
                </span>
                <input
                  ref={deliveryDatePickerRef}
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => {
                    setDeliveryDate(e.target.value);
                    setSaveSuccess(false);
                    setHasSaved(false);
                    setSaveError(null);
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => {
                    try {
                      deliveryDatePickerRef.current?.showPicker();
                    } catch {
                      deliveryDatePickerRef.current?.focus();
                    }
                  }}
                  className={cn(
                    'flex h-[34px] min-w-[110px] cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-white px-2.5 text-sm font-medium transition-colors dark:bg-slate-800',
                    deliveryDate
                      ? 'border-slate-200 text-slate-800 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 dark:border-slate-600 dark:text-slate-200 dark:hover:border-emerald-400'
                      : 'border-dashed border-slate-300 text-slate-400 hover:border-emerald-500 dark:border-slate-600',
                  )}
                  title="Delivery date (optional)"
                >
                  {deliveryDate ? formatDateDDMMYYYY(deliveryDate) : 'Select / --/--/----'}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Line */}
            <hr className="my-4 border-t border-slate-200 dark:border-slate-700" />

            {/* Customer box + Address */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Customer:
              </span>

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

            {/* Customer saved details chips */}
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

            {/* Credit info */}
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

            {/* Order Options — collapsible */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setOptionsOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Order Options (Payment · Status · Partial · Warehouse · Notes)
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', optionsOpen && 'rotate-180')}
                />
              </button>

              {optionsOpen && (
                <div className="mt-3 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40">
                  <FormSelect
                    label="Payment Terms"
                    placeholder="Select payment terms"
                    value={paymentTerms}
                    onChange={(e) => {
                      setPaymentTerms(e.target.value);
                      setSaveSuccess(false);
                      setHasSaved(false);
                      setSaveError(null);
                    }}
                    options={PAYMENT_TERMS as unknown as { label: string; value: string }[]}
                  />
                  <FormSelect
                    label="Order Status"
                    value={orderStatus}
                    onChange={(e) => {
                      setOrderStatus(e.target.value);
                      setSaveSuccess(false);
                      setHasSaved(false);
                      setSaveError(null);
                    }}
                    options={ORDER_STATUSES}
                  />
                  {/* Partial Order — isPartial flag (partial dispatch allow) */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={isPartial}
                      onChange={(e) => {
                        setIsPartial(e.target.checked);
                        setSaveSuccess(false);
                        setHasSaved(false);
                        setSaveError(null);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Partial Order
                    </span>
                    <span className="text-[11px] text-slate-400">(partial delivery allowed)</span>
                  </label>
                  <FormSelect
                    label="Warehouse"
                    placeholder="Select warehouse (optional)"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    options={warehouses}
                  />
                  <FormSelect
                    label="Branch"
                    placeholder="Select branch (optional)"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    options={branches}
                  />
                  <FormInput
                    label="Contact Person"
                    placeholder="Contact person name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                  <FormTextarea
                    label="Shipping Address"
                    placeholder="Shipping address (leave empty to use billing)"
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                  />
                  <FormTextarea
                    label="Notes"
                    placeholder="Order notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <FormTextarea
                    label="Terms & Conditions"
                    placeholder="Order terms and conditions"
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Quick-create customer modal */}
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

            {/* Customer search popup */}
            <QuickCreateModal
              open={customerModalOpen}
              onClose={() => setCustomerModalOpen(false)}
              title="Customer Search"
              size="md"
            >
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerModalQuery}
                    onChange={(e) => setCustomerModalQuery(e.target.value)}
                    placeholder="Naam, mobile ya GSTIN se search karo..."
                    autoFocus
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

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
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {c.name}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

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
              {/* Item entry row */}
              <div className="flex flex-wrap items-end gap-2">
                <span className="flex items-center gap-1.5 pb-[13px] text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Items: <Kbd>F3</Kbd>
                </span>

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

                {/* Barcode / QR scan */}
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
                {/* Items table */}
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

                {/* Summary box */}
                <div className="w-full shrink-0 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-5 lg:w-80 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Order Summary
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
                  <SummaryRow label="GST Total" value={formatINR(totals.taxAmount)} />
                  <SummaryRow label="Total Amt" value={formatINR(totals.grandTotal)} />
                  <SummaryRow label="Round Off" value={formatINR(summary.roundOff)} />

                  <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                    <SummaryRow label="Grand Total" value={formatINR(summary.finalAmt)} bold />
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                        orderStatus === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800'
                          : orderStatus === 'partial'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800'
                            : orderStatus === 'cancelled'
                              ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800'
                              : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
                      )}
                    >
                      {ORDER_STATUSES.find((s) => s.value === orderStatus)?.label || orderStatus}
                    </span>
                    {isPartial && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800">
                        Partial Delivery
                      </span>
                    )}
                  </div>

                  {/* Saved / status after save */}
                  {hasSaved && (
                    <div
                      className={cn(
                        'rounded-md px-2.5 py-1.5',
                        lastSaveMode === 'confirm'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'bg-slate-100 dark:bg-slate-800',
                      )}
                    >
                      <SummaryRow
                        label={lastSaveMode === 'confirm' ? 'Status: Confirmed' : 'Status: Draft'}
                        value={lastSavedNumber || '—'}
                        className={
                          lastSaveMode === 'confirm'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }
                        bold
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line + Action buttons */}
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
                {lastSaveMode === 'confirm'
                  ? `✅ Sales Order confirm ho gaya! (${lastSavedNumber})`
                  : `📝 Sales Order save ho gaya! (${lastSavedNumber})`}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Cancel */}
              <Button
                variant="outline"
                onClick={() => navigate('/sales/orders')}
                className="flex min-w-[110px] items-center justify-center gap-1.5 border-slate-300 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Order cancel karke list par jao (Esc)"
              >
                <X className="h-4 w-4" />
                Cancel
                <Kbd>Esc</Kbd>
              </Button>

              {/* Save Draft */}
              <Button
                variant="secondary"
                onClick={() => void handleSaveDraft()}
                disabled={saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/50 dark:hover:text-amber-200"
                title="Draft save karo (confirm nahi hota)"
              >
                <FileText className="h-4 w-4" />
                Save Draft
              </Button>

              {/* Save & Confirm (F5) */}
              <Button
                variant="secondary"
                onClick={() => void handleSaveConfirm()}
                disabled={saving}
                className="flex min-w-[150px] items-center justify-center gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-200"
                title="Order save + confirmed status (F5)"
              >
                <Check className="h-4 w-4" />
                Save & Confirm
                <Kbd>F5</Kbd>
              </Button>

              {/* Save & Print (F6) */}
              <Button
                variant="secondary"
                onClick={() => void handlePrint()}
                disabled={saving}
                className="flex min-w-[150px] items-center justify-center gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-200"
                title="Order save + print/PDF/WhatsApp/Email share modal kholo (F6)"
              >
                <Printer className="h-4 w-4" />
                Save & Print
                <Kbd>F6</Kbd>
              </Button>

              {/* PDF & Share */}
              <Button
                variant="secondary"
                onClick={() => {
                  if (orderId) {
                    setShareOpen(true);
                  }
                }}
                disabled={!orderId || saving}
                className="flex min-w-[130px] items-center justify-center gap-1.5 border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:border-sky-700 dark:hover:bg-sky-900/50 dark:hover:text-sky-200"
                title={
                  orderId
                    ? 'Print · Download PDF · Email PDF · WhatsApp PDF'
                    : 'Pehle order save karo — phir PDF/WhatsApp/Email bhej sakte ho'
                }
              >
                <FileDown className="h-4 w-4" />
                PDF &amp; Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share / PDF modal — print preview + email + whatsapp */}
      {shareOpen && orderId && (
        <SalesOrderShareModal orderId={orderId} onClose={() => setShareOpen(false)} />
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
