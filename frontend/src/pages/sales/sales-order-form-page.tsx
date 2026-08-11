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
  Receipt,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
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
// SALES ORDER CREATE PAGE — DENSITY OPTIMIZED FOR 100% ZOOM
// ═════════════════════════════════════════════════════════

export const ORDER_STATUSES = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDDMMYYYY(iso: string): string {
  const [y, m, d] = (iso || '').split('T')[0].split('-');
  if (!y || !m || !d) {
    return iso || '--/--/----';
  }
  return `${d}/${m}/${y}`;
}

function formatINR(amount: number): string {
  return `₹${(Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={cn(
          'font-poppins tabular-nums',
          bold
            ? 'text-xs font-extrabold text-slate-900 dark:text-slate-100'
            : 'font-bold text-slate-800 dark:text-slate-200',
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'shadow-2xs inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded border border-slate-200/80 bg-slate-100 px-1 font-mono text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function ShortcutItems({ className }: { className?: string }) {
  return (
    <ul className={className}>
      <li className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Customer</span> <Kbd>F2</Kbd>
      </li>
      <li className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Product</span> <Kbd>F3</Kbd>
      </li>
      <li className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Save Draft</span> <Kbd>F5</Kbd>
      </li>
      <li className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Confirm</span> <Kbd>F6</Kbd>
      </li>
      <li className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span>Cancel</span> <Kbd>Esc</Kbd>
      </li>
    </ul>
  );
}

export function SalesOrderFormPage() {
  const navigate = useNavigate();
  const { id: orderId } = useParams<{ id: string }>();
  const isEditMode = Boolean(orderId);

  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(todayISO);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('net30');
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [savedOrderId, setSavedOrderId] = useState<string>('');

  const [numberLoading, setNumberLoading] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const deliveryPickerRef = useRef<HTMLInputElement>(null);

  // Customer
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalQuery, setCustomerModalQuery] = useState('');

  // Quick customer
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

  // Credit profile
  const [creditProfile, setCreditProfile] = useState<CustomerCreditProfile | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  // Items
  const [itemSearch, setItemSearch] = useState('');
  const [itemOpen, setItemOpen] = useState(false);
  const [productResults, setProductResults] = useState<ProductRecord[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Barcode / QR scan
  const [scanOpen, setScanOpen] = useState(false);

  // Pending item
  const [pendingProduct, setPendingProduct] = useState<ProductRecord | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [pendingRate, setPendingRate] = useState('');
  const [pendingDiscPct, setPendingDiscPct] = useState('0');
  const [pendingDiscAmt, setPendingDiscAmt] = useState('0');

  // Summary
  const [freight, setFreight] = useState('');

  // Options panel collapse
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  // Share modal
  const [shareOpen, setShareOpen] = useState(false);

  // Save states
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedNumber, setLastSavedNumber] = useState('');
  const [hasSaved, setHasSaved] = useState(false);

  // Fetch next order number if new
  useEffect(() => {
    if (isEditMode) {
      return;
    }
    let cancelled = false;
    setNumberLoading(true);
    apiRequest<{ orderNumber?: string }>('/sales/orders/next-number')
      .then((res) => {
        if (!cancelled && res?.orderNumber) {
          setOrderNumber(res.orderNumber);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrderNumber(`SO-${Date.now().toString().slice(-6)}`);
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
  }, [isEditMode]);

  // If edit mode, load order details
  useEffect(() => {
    if (!orderId) {
      return;
    }
    let cancelled = false;
    setNumberLoading(true);
    apiRequest<{
      id: string;
      orderNumber: string;
      orderDate: string;
      expectedDeliveryDate?: string;
      status: string;
      customerId: string;
      customerName?: string;
      billingAddress?: string;
      shippingAddress?: string;
      paymentTerms?: string;
      notes?: string;
      termsAndConditions?: string;
      freight?: number;
      items?: any[];
    }>(`/sales/orders/${orderId}`)
      .then((ord) => {
        if (cancelled || !ord) {
          return;
        }
        setOrderNumber(ord.orderNumber || '');
        setOrderDate(ord.orderDate ? ord.orderDate.split('T')[0] : todayISO());
        setExpectedDeliveryDate(
          ord.expectedDeliveryDate ? ord.expectedDeliveryDate.split('T')[0] : '',
        );
        setStatus(ord.status || 'draft');
        setCustomerId(ord.customerId || '');
        setCustomerName(ord.customerName || '');
        setBillingAddress(ord.billingAddress || '');
        setShippingAddress(ord.shippingAddress || '');
        setPaymentTerms(ord.paymentTerms || 'net30');
        setNotes(ord.notes || '');
        setTermsAndConditions(ord.termsAndConditions || '');
        setFreight(ord.freight ? String(ord.freight) : '');

        if (Array.isArray(ord.items)) {
          const loaded: InvoiceLineItem[] = ord.items.map((it, idx) =>
            recomputeLine({
              id: it.id || `line-${idx}`,
              productId: it.productId || '',
              productName: it.productName || it.description || 'Product',
              company: it.company || '',
              sku: it.sku || '',
              hsn: it.hsn || '',
              barcode: it.barcode || '',
              uom: it.uom || 'Pcs',
              availableStock: 999,
              batchNo: it.batchNo || '',
              expiryDate: it.expiryDate || '',
              quantity: Number(it.quantity) || 1,
              rate: Number(it.unitPrice ?? it.rate) || 0,
              discountType: 'flat',
              discountPercent: Number(it.discountPercent) || 0,
              discountValue: Number(it.discountAmount) || 0,
              gstPercent: Number(it.gstRate ?? it.taxPercent) || 0,
            }),
          );
          setItems(loaded);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSaveError(`Failed to load order: ${(err as Error).message}`);
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
  }, [orderId]);

  // Load customer list
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

  // Search product inventory
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

  const filteredCustomers = useMemo(() => {
    const q = customerModalQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
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
    return filtered.sort((a, b) =>
      (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()),
    );
  }, [customers, customerModalQuery]);

  const selectCustomer = async (c: CustomerOption) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerMobile(c.mobile || '');
    setCustomerEmail(c.email || '');
    setCustomerGstin(c.gstin || '');
    setCustomerCity(c.city || '');
    setCustomerState(c.state || '');
    const addr = [c.address, c.city, c.state, c.pin].filter(Boolean).join(', ');
    setBillingAddress(addr);
    setShippingAddress(addr);
    setCustomerModalOpen(false);
    setSaveSuccess(false);
    setHasSaved(false);
    setSaveError(null);

    setCreditLoading(true);
    try {
      const prof = await getCreditCustomer(c.id);
      setCreditProfile(prof);
    } catch {
      setCreditProfile(null);
    } finally {
      setCreditLoading(false);
    }
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim()) {
      setQuickError('Customer name is required');
      return;
    }
    setQuickSubmitting(true);
    setQuickError(null);
    try {
      const payload: Record<string, unknown> = {
        name: quickForm.name.trim(),
        mobile: quickForm.mobile.trim() || undefined,
        email: quickForm.email.trim() || undefined,
        gstin: quickForm.gstin.trim() || undefined,
        city: quickForm.city.trim() || undefined,
        creditLimit: quickForm.creditLimit ? parseFloat(quickForm.creditLimit) : 0,
        creditDays: quickForm.creditDays ? parseInt(quickForm.creditDays, 10) : 0,
      };
      const created = await apiRequest<CustomerOption>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (created?.id) {
        await selectCustomer(created);
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

  const buildInvoiceLine = (
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
      setSaveError('Qty and Rate must be greater than zero');
      return;
    }
    const firstBatch =
      pendingProduct.batches?.find((b) => b.availableQty > 0) ?? pendingProduct.batches?.[0];
    const line = buildInvoiceLine(pendingProduct, qty, rate, discPct, discAmt);
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
          i.id === existing.id ? recomputeLine({ ...i, quantity: i.quantity + 1 }) : i,
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

  // Computations
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const itemTotal = items.reduce(
      (s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0),
      0,
    );
    const discountAmount = items.reduce((s, i) => s + (Number(i.discountValue) || 0), 0);
    const subTotal = itemTotal - discountAmount;
    const discountPercent = itemTotal > 0 ? (discountAmount / itemTotal) * 100 : 0;
    const taxAmount = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const cgstTotal = items.reduce((s, i) => s + (Number(i.cgstAmount) || 0), 0);
    const sgstTotal = items.reduce((s, i) => s + (Number(i.sgstAmount) || 0), 0);
    const igstTotal = items.reduce((s, i) => s + (Number(i.igstAmount) || 0), 0);
    const cessTotal = items.reduce((s, i) => s + (Number(i.cessAmount) || 0), 0);
    const grandTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    return {
      totalQty,
      itemTotal,
      discountAmount,
      discountPercent: Math.round(discountPercent * 100) / 100,
      subTotal,
      taxAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      grandTotal,
    };
  }, [items]);

  const summary = useMemo(() => {
    const freightVal = Math.max(0, parseFloat(freight) || 0);
    const netBillTotal = totals.grandTotal + freightVal;
    const finalAmt = Math.round(netBillTotal);
    const roundOff = Math.round((finalAmt - netBillTotal) * 100) / 100;

    return {
      freightVal,
      netBillTotal,
      roundOff,
      finalAmt,
    };
  }, [totals.grandTotal, freight]);

  const saveOrder = async (targetStatus: string = 'draft'): Promise<string | null> => {
    setSaveError(null);
    setSaveSuccess(false);
    setHasSaved(false);
    if (savingRef.current) {
      return null;
    }
    if (!customerId) {
      setSaveError('Please select a customer first');
      return null;
    }
    if (items.length === 0) {
      setSaveError('Please add at least one line item to the order');
      return null;
    }
    setSaving(true);
    savingRef.current = true;

    try {
      const payload = {
        orderNumber,
        customerId,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        paymentTerms,
        status: targetStatus,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        subTotal: totals.subTotal,
        discountPercent: totals.discountPercent,
        discountAmount: totals.discountAmount,
        freight: summary.freightVal,
        taxAmount: totals.taxAmount,
        roundOff: summary.roundOff,
        grandTotal: summary.finalAmt,
        notes: notes || undefined,
        termsAndConditions: termsAndConditions || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          hsn: i.hsn,
          uom: i.uom,
          quantity: i.quantity,
          unitPrice: i.rate,
          discountPercent: i.discountPercent,
          discountAmount: i.discountValue,
          taxPercent: i.gstPercent,
          taxAmount: i.gstAmount,
          total: i.amount,
        })),
      };

      const url = isEditMode ? `/sales/orders/${orderId}` : '/sales/orders';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await apiRequest<{ id: string; orderNumber: string }>(url, {
        method,
        body: JSON.stringify(payload),
      });

      const savedNumber = res?.orderNumber || orderNumber;
      if (res?.id) {
        setSavedOrderId(res.id);
      }
      setLastSavedNumber(savedNumber);
      setStatus(targetStatus);
      setSaveSuccess(true);
      setHasSaved(true);

      if (!isEditMode) {
        const next = await apiRequest<{ orderNumber?: string }>('/sales/orders/next-number').catch(
          () => null,
        );
        if (next?.orderNumber) {
          setOrderNumber(next.orderNumber);
        }
      }
      return savedNumber;
    } catch (err) {
      setSaveError((err as Error).message || 'Failed to save sales order');
      return null;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleSaveDraft = () => saveOrder('draft');
  const handleConfirmOrder = () => saveOrder('confirmed');

  const kbRef = useRef({
    openCustomerSearch,
    openItemSearch,
    handleSaveDraft,
    handleConfirmOrder,
    navigate,
  });
  kbRef.current = {
    openCustomerSearch,
    openItemSearch,
    handleSaveDraft,
    handleConfirmOrder,
    navigate,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (customerModalOpen || quickOpen || scanOpen || shareOpen) {
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
            void kbRef.current.handleSaveDraft();
          }
          break;
        case 'F6':
          e.preventDefault();
          if (!saving) {
            void kbRef.current.handleConfirmOrder();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customerModalOpen, quickOpen, itemOpen, saving, scanOpen, shareOpen]);

  return (
    <div className="animate-in fade-in relative pb-16 duration-300">
      {/* PAGE HEADER */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/sales/orders')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50/50 hover:text-emerald-700 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-emerald-500/40 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
            aria-label="Back to sales orders"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span>Sales</span>
              <span>/</span>
              <span>Orders</span>
              <span>/</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {isEditMode ? 'Edit Order' : 'Create Order'}
              </span>
            </div>
            <h1 className="font-poppins mt-0.5 flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              📋{' '}
              {isEditMode
                ? 'विक्री ऑर्डर संपादित करा | Edit Sales Order'
                : 'नवीन विक्री ऑर्डर | Create Sales Order'}
            </h1>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="shadow-2xs h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-emerald-500" />
            Status: {status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="lg:flex lg:items-start lg:gap-4">
        {/* SHORTCUTS STICKY RAIL (DESKTOP) */}
        <aside className="hidden shrink-0 lg:sticky lg:top-3 lg:block lg:w-36">
          <div className="shadow-2xs rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center gap-1 border-b border-slate-100 pb-1.5 dark:border-slate-800">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <p className="font-poppins text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Shortcuts
              </p>
            </div>
            <ShortcutItems className="flex flex-col gap-y-2" />
          </div>
        </aside>

        {/* MAIN FORM CONTAINER */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* Mobile shortcut strip */}
          <div className="shadow-2xs rounded-lg border border-slate-200/80 bg-white px-3 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
            <ShortcutItems className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1" />
          </div>

          {/* DOCUMENT & ORDER INFO CARD */}
          <div className="shadow-2xs rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  strokeWidth={1.75}
                />
                <h2 className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                  Order Information & Dates
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
              {/* Order Number */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Hash className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Order No
                  </p>
                  {numberLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  ) : (
                    <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                      {orderNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Order Date */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Order Date
                  </p>
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        datePickerRef.current?.showPicker();
                      } catch {
                        datePickerRef.current?.focus();
                      }
                    }}
                    className="flex items-center gap-1 font-mono text-xs font-bold text-slate-900 hover:text-emerald-600 focus:outline-none dark:text-white dark:hover:text-emerald-400"
                  >
                    {orderDate ? formatDateDDMMYYYY(orderDate) : '--/--/----'}
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Expected Delivery Date */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    Expected Delivery
                  </p>
                  <input
                    ref={deliveryPickerRef}
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        deliveryPickerRef.current?.showPicker();
                      } catch {
                        deliveryPickerRef.current?.focus();
                      }
                    }}
                    className="flex items-center gap-1 font-mono text-xs font-bold text-slate-900 hover:text-emerald-600 focus:outline-none dark:text-white dark:hover:text-emerald-400"
                  >
                    {expectedDeliveryDate
                      ? formatDateDDMMYYYY(expectedDeliveryDate)
                      : 'Select date...'}
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Terms:
                </span>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {PAYMENT_TERMS.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CUSTOMER SECTION */}
            <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-slate-800">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck
                    className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={1.75}
                  />
                  <span className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                    Customer Details:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCustomerSearch}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    <Search className="h-3 w-3" /> Search Customer <Kbd>F2</Kbd>
                  </button>
                  <span className="text-[10px] text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickError(null);
                      setQuickOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    <Plus className="h-3 w-3" /> Add Customer
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={openCustomerSearch}
                  className={cn(
                    'flex h-9 min-w-[220px] flex-1 items-center justify-between rounded-lg border bg-slate-50/50 px-3 text-xs font-semibold transition-all duration-150 dark:bg-slate-800/40',
                    customerName
                      ? 'border-emerald-500/50 text-slate-900 dark:border-emerald-500/50 dark:text-white'
                      : 'border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500',
                  )}
                >
                  <span className="truncate">
                    {customerName || 'Select customer (Press F2)...'}
                  </span>
                  <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>

                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Billing Address"
                  className="h-9 min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                />

                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Shipping Address (Optional)"
                  className="h-9 min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Customer details pill row */}
              {customerId && (customerMobile || customerEmail || customerGstin || customerCity) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {customerMobile && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      📞 {customerMobile}
                    </span>
                  )}
                  {customerEmail && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      ✉️ {customerEmail}
                    </span>
                  )}
                  {customerGstin && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 font-bold text-sky-700 dark:text-sky-300">
                      🏛️ GST: {customerGstin}
                    </span>
                  )}
                  {customerCity && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      🏙️ {[customerCity, customerState].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              )}

              {/* Credit Limit Badge Bar */}
              {customerId && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                  {creditLoading ? (
                    <span className="flex items-center gap-1 font-medium text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading credit profile...
                    </span>
                  ) : creditProfile ? (
                    <>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Credit Limit:{' '}
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{(Number(creditProfile.creditLimit) || 0).toLocaleString('en-IN')}
                        </span>
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Outstanding:{' '}
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{(Number(creditProfile.outstanding) || 0).toLocaleString('en-IN')}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 font-bold',
                          (Number(creditProfile.availableCredit) || 0) <= 0
                            ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : (Number(creditProfile.availableCredit) || 0) <=
                                (Number(creditProfile.creditLimit) || 0) * 0.2
                              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                        )}
                      >
                        Available Credit: ₹
                        {(Number(creditProfile.availableCredit) || 0).toLocaleString('en-IN')}
                      </span>
                    </>
                  ) : null}
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
              <form onSubmit={handleQuickCreate} className="space-y-3" noValidate>
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
                <div className="grid grid-cols-2 gap-2.5">
                  <FormInput
                    label="Credit Limit (₹)"
                    type="number"
                    min={0}
                    value={quickForm.creditLimit}
                    onChange={(e) => setQuickForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    placeholder="e.g. 50000"
                  />
                  <FormInput
                    label="Credit Days"
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

            {/* Customer search modal */}
            <QuickCreateModal
              open={customerModalOpen}
              onClose={() => setCustomerModalOpen(false)}
              title="Customer Search"
              size="md"
            >
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customerModalQuery}
                    onChange={(e) => setCustomerModalQuery(e.target.value)}
                    placeholder="Search by customer name or mobile number..."
                    autoFocus
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>

                <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600">
                  {customerLoading && customers.length === 0 && (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customers...
                    </div>
                  )}
                  {!customerLoading && filteredCustomers.length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">
                      No matching customer found
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
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {c.name}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-700">
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
                    <Plus className="h-3.5 w-3.5" /> New Customer
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setCustomerModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </QuickCreateModal>
          </div>

          {/* ITEM ENTRY & PRODUCT SELECTION SECTION */}
          <div className="shadow-2xs rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Package
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  strokeWidth={1.75}
                />
                <h2 className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                  Order Line Items & Product Selection
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-500"
              >
                <Barcode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Scan
                Barcode
              </button>
            </div>

            {/* Item entry row */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="relative min-w-[200px] flex-1">
                <label className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Select Product <Kbd>F3</Kbd>
                </label>
                <div
                  className={cn(
                    'flex h-9 w-full cursor-pointer items-center rounded-lg border bg-slate-50/50 px-2.5 text-xs font-semibold transition-all dark:bg-slate-800/40',
                    itemOpen
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400'
                      : 'border-slate-200/80 dark:border-slate-700',
                  )}
                  onClick={openItemSearch}
                >
                  <Package className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
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
                      placeholder="Search product name or SKU..."
                      className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                      autoComplete="off"
                    />
                  ) : (
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                      {pendingProduct ? pendingProduct.name : 'Click to search product (F3)...'}
                    </span>
                  )}
                  {productLoading ? (
                    <Loader2 className="ml-1.5 h-3.5 w-3.5 shrink-0 animate-spin text-emerald-500" />
                  ) : (
                    <Search className="ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                </div>

                {itemOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {productLoading && productResults.length === 0 && (
                      <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching product
                        inventory...
                      </div>
                    )}
                    {!productLoading && productResults.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">
                        No products found matching query
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
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-800 dark:text-slate-200">
                            {p.name}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Rate: ₹{p.salesRate} · Stock: {p.currentStock}
                          </p>
                        </div>
                        <Plus className="ml-2 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Qty
                </span>
                <input
                  type="number"
                  min={1}
                  value={pendingQty}
                  onChange={(e) => setPendingQty(e.target.value)}
                  className="h-9 w-16 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2 text-center text-xs font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Rate ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={pendingRate}
                  onChange={(e) => setPendingRate(e.target.value)}
                  placeholder="0.00"
                  className="h-9 w-20 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2.5 text-right text-xs font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Disc %
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={pendingDiscPct}
                  onChange={(e) => setPendingDiscPct(e.target.value)}
                  className="h-9 w-16 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2 text-center text-xs font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>

              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Disc ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={pendingDiscAmt}
                  onChange={(e) => setPendingDiscAmt(e.target.value)}
                  className="h-9 w-20 rounded-lg border border-slate-200/80 bg-slate-50/50 px-2.5 text-right text-xs font-bold text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </label>

              <Button
                variant="primary"
                type="button"
                onClick={addPendingItem}
                disabled={!pendingProduct}
                className="flex h-9 items-center gap-1 rounded-lg px-4 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            {/* Item Table & Summary Section */}
            <div className="mt-3 flex flex-col gap-3 lg:flex-row">
              {/* High Density Table */}
              <div className="min-h-[220px] flex-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                      <th className="w-7 px-2.5 py-2 font-semibold">#</th>
                      <th className="px-2.5 py-2 font-semibold">Product</th>
                      <th className="px-2.5 py-2 font-semibold">HSN</th>
                      <th className="px-2.5 py-2 font-semibold">Batch / Exp</th>
                      <th className="px-2.5 py-2 text-center font-semibold">Qty</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Rate ₹</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Disc</th>
                      <th className="px-2.5 py-2 text-center font-semibold">GST</th>
                      <th className="px-2.5 py-2 text-right font-semibold">Amount</th>
                      <th className="w-8 px-2.5 py-2 text-center font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-slate-400">
                          <Package className="mx-auto mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            No order items added
                          </p>
                          <p className="text-[10px]">
                            Select a product above or press F3 to add items to sales order
                          </p>
                        </td>
                      </tr>
                    )}
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-2.5 py-1.5 font-medium text-slate-400">{idx + 1}</td>
                        <td className="px-2.5 py-1.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.productName}
                          </p>
                          <p className="text-[9px] text-slate-400">{item.sku}</p>
                        </td>
                        <td className="px-2.5 py-1.5 font-medium text-slate-500">
                          {item.hsn || '—'}
                        </td>
                        <td className="px-2.5 py-1.5 font-medium text-slate-500">
                          {item.batchNo
                            ? `${item.batchNo} (${formatDateDDMMYYYY(item.expiryDate)})`
                            : '—'}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            min={1}
                            onChange={(e) =>
                              updateItemQty(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-7 w-14 rounded-md border border-slate-200 text-center text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <input
                            type="number"
                            value={item.rate}
                            min={0}
                            step={0.01}
                            onChange={(e) =>
                              updateItemRate(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="h-7 w-16 rounded-md border border-slate-200 px-1.5 text-right text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-red-600 dark:text-red-400">
                          {item.discountValue > 0 ? `-${formatINR(item.discountValue)}` : '—'}
                        </td>
                        <td className="px-2.5 py-1.5 text-center font-medium text-slate-500">
                          {item.gstPercent}%
                        </td>
                        <td className="font-poppins px-2.5 py-1.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(item.amount)}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-0.5 text-slate-400 transition-colors hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Summary Card */}
              <div className="w-full shrink-0 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 lg:w-72 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="font-poppins border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  Order Summary
                </p>

                <SummaryRow label="Total Quantity" value={String(totals.totalQty)} />
                <SummaryRow label="Item Gross Total" value={formatINR(totals.itemTotal)} />
                <SummaryRow
                  label="Total Discount"
                  value={
                    totals.discountAmount > 0
                      ? `-${totals.discountPercent}% (${formatINR(totals.discountAmount)})`
                      : '₹0.00'
                  }
                  className={
                    totals.discountAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                  }
                />
                <SummaryRow label="Taxable Amount" value={formatINR(totals.subTotal)} />
                <SummaryRow label="Tax Amount (GST)" value={formatINR(totals.taxAmount)} />

                <label className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Freight Charges</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={freight}
                    onChange={(e) => setFreight(e.target.value)}
                    placeholder="0.00"
                    className="h-7 w-20 rounded-md border border-slate-200 bg-white px-2 text-right text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>

                <SummaryRow label="Round Off" value={formatINR(summary.roundOff)} />

                <div className="border-t border-slate-200/80 pt-2 dark:border-slate-800">
                  <SummaryRow label="Total Order Value" value={formatINR(summary.finalAmt)} bold />
                </div>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE ORDER OPTIONS PANEL (NOTES & TERMS) */}
          <div className="shadow-2xs rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setOptionsExpanded(!optionsExpanded)}
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                  Additional Order Notes & Terms (Optional)
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform duration-200',
                  optionsExpanded && 'rotate-180',
                )}
              />
            </button>

            {optionsExpanded && (
              <div className="animate-in fade-in space-y-3 border-t border-slate-100 p-3.5 duration-200 dark:border-slate-800">
                <FormTextarea
                  label="Internal Order Notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, delivery instructions or internal notes..."
                />
                <FormTextarea
                  label="Terms & Conditions"
                  rows={2}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder="Order validity, payment terms, or return policies..."
                />
              </div>
            )}
          </div>

          {/* PERSISTENT STICKY VIEWPORT ACTION BAR */}
          <div className="sticky bottom-3 z-30 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-lg shadow-slate-950/10 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            {saveError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-400">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                ✅ Sales Order Saved Successfully! ({lastSavedNumber}) — Status:{' '}
                {status.toUpperCase()}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/sales/orders')}
                className="h-9 rounded-lg border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel <Kbd>Esc</Kbd>
              </Button>

              <Button
                variant="secondary"
                onClick={() => void handleSaveDraft()}
                disabled={saving}
                className="h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
              >
                <FileText className="mr-1 h-3.5 w-3.5" /> Save Draft <Kbd>F5</Kbd>
              </Button>

              <Button
                variant="primary"
                onClick={() => void handleConfirmOrder()}
                disabled={saving}
                className="shadow-2xs h-9 rounded-lg px-5 text-xs font-bold shadow-emerald-600/30"
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Confirm Order <Kbd>F6</Kbd>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShareOpen(true)}
                disabled={!hasSaved || saving}
                className="h-9 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
              >
                <FileDown className="mr-1 h-3.5 w-3.5" /> Share Order / PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share / PDF Modal */}
      {shareOpen && (savedOrderId || orderId) && (
        <SalesOrderShareModal
          orderId={savedOrderId || orderId || ''}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Barcode scanner */}
      <BarcodeScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={handleScannedProduct}
      />
    </div>
  );
}
