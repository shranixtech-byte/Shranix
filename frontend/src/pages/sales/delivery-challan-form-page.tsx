import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  FileDown,
  Hash,
  Loader2,
  Package,
  Search,
  Settings2,
  Truck,
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

// ═════════════════════════════════════════════════════════
// DELIVERY CHALLAN CREATE/EDIT PAGE — PHASE 2
// (Sales Order ↓ Delivery Challan — multiple DC, partial
//  delivery, vehicle/driver/transport, e-way bill, dispatch)
// ═════════════════════════════════════════════════════════

export const DC_STATUSES = [
  { label: 'Pending', value: 'pending' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Partially Delivered', value: 'partially_delivered' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Invoiced', value: 'invoiced' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const DISPATCH_TYPES = [
  { label: 'Full Dispatch', value: 'full' },
  { label: 'Partial Dispatch', value: 'partial' },
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

// ₹ Indian number format
function formatINR(amount: number): string {
  return `₹${(Number(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Order picker option ─────────────────────────────────
interface OrderOption {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  status?: string;
  orderDate?: string;
  grandTotal?: number;
}

// ── DC line item (from order items — editable qty for partial) ──
interface DcLineItem {
  id: string;
  orderItemId?: string;
  productId: string;
  productName: string;
  unit: string;
  orderQty: number;
  alreadyDelivered: number;
  remaining: number;
  quantity: number;
  rate: number;
  batchNo: string;
  warehouseId: string;
}

// ═════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════
export function DeliveryChallanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // ── DC header ───────────────────────────────────────
  const [challanNumber, setChallanNumber] = useState('');
  const [numberLoading, setNumberLoading] = useState(!isEditing);
  const [dispatchDate, setDispatchDate] = useState(todayISO);
  const dispatchDatePickerRef = useRef<HTMLInputElement>(null);

  // ── Edit-mode loading ────────────────────────────────
  const [loading, setLoading] = useState(isEditing);

  // ── Linked order ────────────────────────────────────
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');

  // ── Customer (read-only, from order) ─────────────────
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // ── Dispatch ────────────────────────────────────────
  const [dispatchType, setDispatchType] = useState('full');
  const [dcStatus, setDcStatus] = useState('pending');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');

  // ── Transport (Phase 2) ─────────────────────────────
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [transportDetails, setTransportDetails] = useState('');

  // ── E-way Bill (Phase 2) ────────────────────────────
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [ewayBillDate, setEwayBillDate] = useState('');

  // ── Items ──────────────────────────────────────────
  const [items, setItems] = useState<DcLineItem[]>([]);

  // ── Options collapse ────────────────────────────────
  const [optionsOpen, setOptionsOpen] = useState(false);

  // ── Save state ──────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── DC Number preview (auto) — counter NOT advanced ──
  useEffect(() => {
    if (isEditing) {
      return;
    }
    let cancelled = false;
    setNumberLoading(true);
    apiRequest<{ challanNumber?: string }>('/sales/delivery-challans/next-number')
      .then((res) => {
        const data = (res as { data?: { challanNumber?: string } })?.data ?? res;
        if (!cancelled && data?.challanNumber) {
          setChallanNumber(data.challanNumber);
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

  // ── Load orders list (pick modal) ───────────────────
  const loadOrders = async () => {
    setOrderLoading(true);
    try {
      const res = await apiRequest<any>(`/sales/orders?page=1&ps=500`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setOrders(
        list.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber || '',
          customerId: o.customerId,
          customerName: o.customerName || '',
          status: o.status,
          orderDate: o.orderDate,
          grandTotal: o.grandTotal,
        })),
      );
    } catch {
      setOrders([]);
    } finally {
      setOrderLoading(false);
    }
  };

  const openOrderSearch = () => {
    setOrderQuery('');
    setOrderModalOpen(true);
    void loadOrders();
  };

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (!q) {
        return true;
      }
      return (
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderQuery]);

  // ── Order select → load order + items → prefill ─────
  const selectOrder = async (order: OrderOption) => {
    setOrderModalOpen(false);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await apiRequest<any>(`/sales/orders/${order.id}`);
      const rec = res?.data ?? res ?? {};
      const cust = rec.customerId
        ? await apiRequest<any>(`/customers/${rec.customerId}`).catch(() => null)
        : null;
      const c = cust?.data ?? cust ?? null;

      setOrderId(order.id);
      setOrderNumber(rec.orderNumber || order.orderNumber || '');
      setCustomerId(rec.customerId || '');
      setCustomerName(c?.name || rec.customerName || '');
      setCustomerGstin(c?.gstin || '');
      setCustomerMobile(c?.mobile || '');
      setCustomerAddress(c?.address || '');
      setWarehouseId(rec.warehouseId || '');

      // Order items → DC lines with remaining-quantity maths
      const oi = Array.isArray(rec.items) ? rec.items : [];
      const now = new Date().toISOString().split('T')[0];
      setItems(
        oi.map((it: any) => {
          const orderQty = Number(it.quantity) || 0;
          const alreadyDelivered = Number(it.deliveredQuantity) || 0;
          const remaining = Math.max(0, orderQty - alreadyDelivered);
          return {
            id: it.id || String(Math.random()),
            orderItemId: it.id || undefined,
            productId: it.itemId,
            productName: it.description || it.itemName || it.itemId,
            unit: it.unitId || 'Pcs',
            orderQty,
            alreadyDelivered,
            remaining,
            quantity: remaining,
            rate: Number(it.rate) || 0,
            batchNo: it.batchNo || '',
            warehouseId: rec.warehouseId || '',
          };
        }),
      );

      // Full dispatch by default — sirf tab partial karo jab order isPartial ho
      setDispatchType(rec.isPartial ? 'partial' : 'full');
      setDcStatus('pending');
      setDispatchDate(now);
    } catch (e) {
      setSaveError((e as Error).message || 'Order load nahi hua');
    }
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) {
          return i;
        }
        const clamped = Math.max(0, Math.min(qty, i.remaining));
        return { ...i, quantity: clamped };
      }),
    );
    setSaveSuccess(false);
    setSaveError(null);
  };

  // ── Edit-mode loading ────────────────────────────────
  useEffect(() => {
    if (!isEditing || !id) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = await apiRequest<any>(`/sales/delivery-challans/${id}`);
        const rec = q?.data ?? q ?? {};
        const cust = rec.customerId
          ? await apiRequest<any>(`/customers/${rec.customerId}`).catch(() => null)
          : null;
        const c = cust?.data ?? cust ?? null;
        if (cancelled) {
          return;
        }
        setChallanNumber(rec.challanNumber || '');
        setDispatchDate(String(rec.dispatchDate || todayISO()).slice(0, 10));
        setOrderId(rec.orderId || '');
        setOrderNumber(rec.orderNumber || '');
        setCustomerId(rec.customerId || '');
        setCustomerName(c?.name || '');
        setCustomerGstin(c?.gstin || '');
        setCustomerMobile(c?.mobile || '');
        setCustomerAddress(c?.address || '');
        setDispatchType(rec.dispatchType || 'full');
        setDcStatus(rec.status || 'pending');
        setWarehouseId(rec.warehouseId || '');
        setVehicleNo(rec.vehicleNo || '');
        setVehicleType(rec.vehicleType || '');
        setDriverName(rec.driverName || '');
        setDriverMobile(rec.driverMobile || '');
        setTransporterName(rec.transporterName || '');
        setLrNo(rec.lrNo || '');
        setLrDate(String(rec.lrDate || '').slice(0, 10));
        setTransportDetails(rec.transportDetails || '');
        setEwayBillNo(rec.ewayBillNo || '');
        setEwayBillDate(String(rec.ewayBillDate || '').slice(0, 10));
        setNotes(rec.notes || '');
        if (Array.isArray(rec.items)) {
          setItems(
            rec.items.map((it: any) => {
              const orderQty = Number(it.quantity) || 0;
              return {
                id: it.id || String(Math.random()),
                orderItemId: it.orderItemId || undefined,
                productId: it.itemId,
                productName: it.description || it.itemId,
                unit: it.unitId || 'Pcs',
                orderQty,
                alreadyDelivered: Number(it.deliveredQuantity) || 0,
                remaining: orderQty,
                quantity: orderQty,
                rate: Number(it.rate) || 0,
                batchNo: it.batchNo || '',
                warehouseId: it.warehouseId || '',
              };
            }),
          );
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
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, id]);

  // ── Totals ─────────────────────────────────────────
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.rate, 0);
    return { totalQty, totalAmount };
  }, [items]);

  // ── Save ───────────────────────────────────────────
  const saveDc = async (): Promise<boolean> => {
    setSaveError(null);
    setSaveSuccess(false);
    if (savingRef.current) {
      return false;
    }
    if (!orderId) {
      setSaveError('Pehle linked sales order select karo');
      return false;
    }
    if (items.length === 0) {
      setSaveError('Order ke items load karo — kam se kam ek item required');
      return false;
    }
    if (items.every((i) => i.quantity <= 0)) {
      setSaveError('Kam se kam ek item ki quantity 0 se zyada honi chahiye');
      return false;
    }
    if (!dispatchDate) {
      setSaveError('Dispatch date required hai');
      return false;
    }
    setSaving(true);
    savingRef.current = true;
    try {
      const payload = {
        challanNumber: challanNumber || undefined,
        orderId,
        customerId,
        dispatchDate,
        dispatchType,
        status: dcStatus,
        warehouseId: warehouseId || undefined,
        vehicleNo: vehicleNo || undefined,
        vehicleType: vehicleType || undefined,
        driverName: driverName || undefined,
        driverMobile: driverMobile || undefined,
        transporterName: transporterName || undefined,
        lrNo: lrNo || undefined,
        lrDate: lrDate || undefined,
        ewayBillNo: ewayBillNo || undefined,
        ewayBillDate: ewayBillDate || undefined,
        transportDetails: transportDetails || undefined,
        totalQty: totals.totalQty,
        totalAmount: totals.totalAmount,
        billingAddress: customerAddress || undefined,
        shippingAddress: customerAddress || undefined,
        notes: notes || undefined,
        items: items
          .filter((i) => i.quantity > 0)
          .map((i) => ({
            itemId: i.productId,
            orderItemId: i.orderItemId || null,
            description: i.productName || null,
            unitId: i.unit || null,
            quantity: Number(i.quantity) || 0,
            deliveredQuantity: Number(i.quantity) || 0,
            rate: Number(i.rate) || 0,
            batchNo: i.batchNo || null,
            warehouseId: i.warehouseId || null,
          })),
      };
      const body = JSON.stringify(payload);
      const res =
        isEditing && id
          ? await apiRequest(`/sales/delivery-challans/${id}`, { method: 'PUT', body })
          : await apiRequest('/sales/delivery-challans', { method: 'POST', body });
      const rec = (res as { data?: any })?.data ?? res ?? {};
      const savedNumber = String(rec?.challanNumber || challanNumber || '');
      if (savedNumber) {
        setChallanNumber(savedNumber);
      }
      setSaveSuccess(true);
      if (!isEditing) {
        navigate('/sales/delivery-challans', { replace: true });
      }
      return true;
    } catch (err) {
      setSaveError((err as Error).message || 'Challan save nahi hua — dobara try karo');
      return false;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleSave = async () => {
    await saveDc();
  };

  const handleSavePrint = async () => {
    const ok = await saveDc();
    if (ok) {
      navigate('/sales/delivery-challans');
    }
  };

  // ── Edit-mode loading ────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">Delivery Challan load ho raha hai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/sales/delivery-challans')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Back to delivery challans"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Delivery Challan' : 'Create Delivery Challan'}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Sales Order → DC — vehicle, driver, e-way bill aur partial delivery ke saath
            </p>
          </div>
        </div>

        {/* Ek hi box — DC No + Dispatch Date + Order */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* DC No — auto preview / manual */}
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                DC No:
              </span>
              {numberLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              ) : (
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => {
                    setChallanNumber(e.target.value);
                    setSaveSuccess(false);
                    setSaveError(null);
                  }}
                  placeholder="AUTO"
                  title="Auto numbering ON hai to preview yahin dikhta hai — manual ke liye type karo"
                  className="h-[34px] w-36 rounded-md border border-slate-200 bg-slate-50 px-2.5 font-mono text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
                />
              )}
            </div>

            {/* Dispatch Date */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Dispatch:
              </span>
              <input
                ref={dispatchDatePickerRef}
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    dispatchDatePickerRef.current?.showPicker();
                  } catch {
                    dispatchDatePickerRef.current?.focus();
                  }
                }}
                className="flex h-[34px] min-w-[110px] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400"
                title="Dispatch date change karo"
              >
                {formatDateDDMMYYYY(dispatchDate)}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>

            {/* Dispatch Type */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6 dark:border-slate-700">
              <Truck className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Type:
              </span>
              <FormSelect
                aria-label="Dispatch Type"
                value={dispatchType}
                onChange={(e) => setDispatchType(e.target.value)}
                options={DISPATCH_TYPES}
                className="h-[34px] w-44 py-0"
              />
            </div>
          </div>

          <hr className="my-4 border-t border-slate-200 dark:border-slate-700" />

          {/* Linked Sales Order */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sales Order:
            </span>
            <button
              type="button"
              onClick={openOrderSearch}
              className={cn(
                'flex h-[38px] w-64 items-center rounded-lg border bg-white px-3 text-sm transition-colors dark:border-slate-600 dark:bg-slate-800',
                orderNumber
                  ? 'border-emerald-300 text-slate-900 dark:border-emerald-500/60 dark:text-slate-100'
                  : 'border-slate-200 text-slate-400 dark:text-slate-500',
              )}
              title="Order select karo — uske items + customer autofill honge"
            >
              <span className="flex-1 truncate text-left">
                {orderNumber
                  ? `${orderNumber}${customerName ? ` — ${customerName}` : ''}`
                  : 'Order select karo...'}
              </span>
              <Search className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </button>
            {orderNumber && (
              <button
                type="button"
                onClick={() => {
                  setOrderId('');
                  setOrderNumber('');
                  setCustomerId('');
                  setCustomerName('');
                  setCustomerGstin('');
                  setCustomerMobile('');
                  setCustomerAddress('');
                  setItems([]);
                }}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-500 dark:hover:bg-red-950"
                title="Remove linked order"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Customer chips */}
          {customerName && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                👤 {customerName}
              </span>
              {customerMobile && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  📞 {customerMobile}
                </span>
              )}
              {customerGstin && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2 py-1 font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800">
                  GST: {customerGstin}
                </span>
              )}
            </div>
          )}

          {/* ── Items table ─────────────────────────────── */}
          <div className="mt-5">
            <div className="flex flex-wrap items-end gap-2">
              <span className="flex items-center gap-1.5 pb-[13px] text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Package className="h-4 w-4 text-slate-400" /> Items (qty = dispatched)
              </span>
              {items.length > 0 && (
                <span className="pb-[13px] text-[11px] text-slate-400">
                  {totals.totalQty} qty · {formatINR(totals.totalAmount)}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-900/40">
                Pehle ek sales order select karo — uske items yahin load honge.
                <br />
                Partial delivery ke liye quantity edit karo (remaining se zyada nahi ho sakti).
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 text-right font-semibold">Order Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Remaining</th>
                      <th className="px-3 py-2 text-right font-semibold">Dispatch Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Rate</th>
                      <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr
                        key={i.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {i.productName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {i.batchNo ? `Batch ${i.batchNo} · ` : ''}
                            {i.unit}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                          {i.orderQty}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                          {i.remaining}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={i.remaining}
                            value={i.quantity}
                            onChange={(e) => updateItemQty(i.id, Number(e.target.value))}
                            className={cn(
                              'h-8 w-20 rounded-md border px-2 text-right text-sm tabular-nums outline-none transition-colors',
                              i.quantity < i.remaining
                                ? 'border-amber-300 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
                                : 'border-slate-200 bg-white text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
                            )}
                            title={
                              i.quantity < i.remaining
                                ? 'Partial delivery — remaining se kam dispatch'
                                : 'Full dispatch'
                            }
                          />
                          {i.quantity < i.remaining && (
                            <span className="mt-0.5 block text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              partial
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatINR(i.rate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatINR(i.quantity * i.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Options: Dispatch Status + Transport + E-way Bill + Notes ── */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setOptionsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Dispatch Options (Status · Transport · E-way Bill · Notes)
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', optionsOpen && 'rotate-180')}
              />
            </button>

            {optionsOpen && (
              <div className="mt-3 space-y-4">
                {/* Dispatch status */}
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <FormSelect
                    label="Dispatch Status"
                    value={dcStatus}
                    onChange={(e) => setDcStatus(e.target.value)}
                    options={DC_STATUSES}
                  />
                  <FormInput
                    label="Warehouse ID"
                    placeholder="Warehouse (optional)"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                  />
                </div>

                {/* Transport */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Truck className="h-3.5 w-3.5" /> Transport Details
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormInput
                      label="Vehicle No"
                      placeholder="e.g. MH-12-AB-1234"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                    />
                    <FormInput
                      label="Vehicle Type"
                      placeholder="e.g. Container / Tempo / Truck"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                    />
                    <FormInput
                      label="Driver Name"
                      placeholder="Driver ka naam"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                    <FormInput
                      label="Driver Mobile"
                      placeholder="Driver ka mobile"
                      value={driverMobile}
                      onChange={(e) => setDriverMobile(e.target.value)}
                    />
                    <FormInput
                      label="Transporter"
                      placeholder="Transporter name"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                    />
                    <FormInput
                      label="LR No"
                      placeholder="LR / Docket number"
                      value={lrNo}
                      onChange={(e) => setLrNo(e.target.value)}
                    />
                    <FormInput
                      label="LR Date"
                      type="date"
                      value={lrDate}
                      onChange={(e) => setLrDate(e.target.value)}
                    />
                    <FormTextarea
                      label="Transport Notes"
                      placeholder="Loading / unloading / route details..."
                      rows={2}
                      className="sm:col-span-2"
                      value={transportDetails}
                      onChange={(e) => setTransportDetails(e.target.value)}
                    />
                  </div>
                </div>

                {/* E-way Bill */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <FileDown className="h-3.5 w-3.5" /> E-way Bill
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput
                      label="E-way Bill No"
                      placeholder="12-digit EWB number"
                      value={ewayBillNo}
                      onChange={(e) => setEwayBillNo(e.target.value)}
                    />
                    <FormInput
                      label="E-way Bill Date"
                      type="date"
                      value={ewayBillDate}
                      onChange={(e) => setEwayBillDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <FormTextarea
                  label="Notes"
                  placeholder="Challan notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Save error */}
          {saveError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Challan {challanNumber} save ho gaya!
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate('/sales/delivery-challans')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : isEditing ? (
                'Update Challan'
              ) : (
                'Save Challan'
              )}
            </Button>
            {!isEditing && (
              <Button variant="primary" onClick={handleSavePrint} disabled={saving}>
                <Check className="mr-1.5 h-4 w-4" /> Save &amp; Finish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Order search popup */}
      <QuickCreateModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Select Sales Order"
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Order number ya customer se search karo..."
              autoFocus
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600">
            {orderLoading && orders.length === 0 && (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading orders...
              </div>
            )}
            {!orderLoading && filteredOrders.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-slate-400">
                Koi sales order nahi mila — pehle order create karo
              </div>
            )}
            {filteredOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => void selectOrder(o)}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors',
                  o.id === orderId
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {o.orderNumber}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {o.customerName || o.customerId || ''}
                    {o.grandTotal ? ` · ${formatINR(Number(o.grandTotal))}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-400">
                  {o.status || ''}
                </span>
                {o.id === orderId && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
              </button>
            ))}
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-700">
            <Button variant="primary" size="sm" onClick={() => setOrderModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </QuickCreateModal>
    </div>
  );
}
