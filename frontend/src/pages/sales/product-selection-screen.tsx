import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Barcode,
  Check,
  ChevronDown,
  ClipboardList,
  Diamond,
  GripVertical,
  History,
  Image,
  IndianRupee,
  Info,
  Layers,
  Package,
  Plus,
  Search,
  Settings,
  Star,
  TrendingUp,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/services/api-client';
import { cn } from '@/lib/utils';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface BatchInfo {
  id: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number;
  purchaseRate: number;
  sellingRate: number;
  mrp?: number;
}

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  hsn?: string;
  unitId?: string;
  unitName?: string;
  gstRate?: number;
  purchaseRate: number;
  salesRate: number;
  wholesaleRate?: number;
  dealerRate?: number;
  mrp?: number;
  currentStock: number;
  warehouseStocks?: { warehouse: string; qty: number }[];
  description?: string;
  imageUrl?: string;
  company?: string;
  category?: string;
  subCategory?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  profitMargin?: number;
  lastPurchaseRate?: number;
  lastSellingRate?: number;
  batches?: BatchInfo[];
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsn: string;
  barcode: string;
  batchNo: string;
  expiryDate: string;
  warehouse: string;
  uom: string;
  availableStock: number;
  quantity: number;
  freeQty: number;
  rate: number;
  priceList: PriceListType;
  discountType: DiscountType;
  discountValue: number;
  discountPercent: number;
  schemeName: string;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  amount: number;
  isExpired: boolean;
  isBlocked: boolean;
  creditHold: boolean;
  isExpanded: boolean;
}

// ═════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═════════════════════════════════════════════════════════

type PriceListType = 'retail' | 'wholesale' | 'dealer' | 'mrp' | 'custom';
type DiscountType = 'percentage' | 'flat' | 'scheme' | 'free_qty';

interface ColumnMeta {
  key: keyof InvoiceLineItem | '#' | 'actions';
  label: string;
  width: number;
  minWidth: number;
  align: 'left' | 'center' | 'right';
  frozen?: boolean;
  resizable: boolean;
  reorderable: boolean;
  render?: (item: InvoiceLineItem, index: number, onCellAction?: CellAction) => React.ReactNode;
}

type CellAction = (action: string, itemId: string, value?: unknown) => void;

const DEFAULT_COLUMNS: ColumnMeta[] = [
  { key: '#', label: '#', width: 40, minWidth: 32, align: 'center', frozen: true, resizable: false, reorderable: false },
  { key: 'productName', label: 'Product', width: 180, minWidth: 120, align: 'left', resizable: true, reorderable: true },
  { key: 'sku', label: 'SKU', width: 100, minWidth: 80, align: 'left', resizable: true, reorderable: true },
  { key: 'barcode', label: 'Barcode', width: 110, minWidth: 80, align: 'left', resizable: true, reorderable: true },
  { key: 'batchNo', label: 'Batch', width: 100, minWidth: 70, align: 'left', resizable: true, reorderable: true },
  { key: 'expiryDate', label: 'Expiry', width: 90, minWidth: 70, align: 'left', resizable: true, reorderable: true },
  { key: 'warehouse', label: 'WH', width: 70, minWidth: 50, align: 'left', resizable: true, reorderable: true },
  { key: 'uom', label: 'UOM', width: 55, minWidth: 40, align: 'left', resizable: true, reorderable: true },
  { key: 'availableStock', label: 'Stock', width: 70, minWidth: 50, align: 'right', resizable: true, reorderable: true },
  { key: 'quantity', label: 'Qty', width: 120, minWidth: 90, align: 'center', resizable: true, reorderable: true },
  { key: 'freeQty', label: 'Free', width: 60, minWidth: 40, align: 'center', resizable: true, reorderable: true },
  { key: 'rate', label: 'Rate ₹', width: 100, minWidth: 70, align: 'right', resizable: true, reorderable: true },
  { key: 'discountPercent', label: 'Disc %', width: 80, minWidth: 50, align: 'center', resizable: true, reorderable: true },
  { key: 'gstPercent', label: 'GST %', width: 70, minWidth: 50, align: 'center', resizable: true, reorderable: true },
  { key: 'amount', label: 'Amount', width: 110, minWidth: 80, align: 'right', resizable: true, reorderable: true },
  { key: 'actions', label: '', width: 44, minWidth: 36, align: 'center', frozen: true, resizable: false, reorderable: false },
];

const PRICE_LIST_OPTIONS: { label: string; value: PriceListType; icon: LucideIcon }[] = [
  { label: 'Retail', value: 'retail', icon: IndianRupee },
  { label: 'Wholesale', value: 'wholesale', icon: TrendingUp },
  { label: 'Dealer', value: 'dealer', icon: Diamond },
  { label: 'MRP', value: 'mrp', icon: IndianRupee },
  { label: 'Custom', value: 'custom', icon: Settings },
];

const DISCOUNT_TYPES: { label: string; value: DiscountType }[] = [
  { label: '%', value: 'percentage' },
  { label: '₹ Flat', value: 'flat' },
  { label: 'Scheme', value: 'scheme' },
  { label: 'Free Qty', value: 'free_qty' },
];

const SEARCH_MODES = [
  { label: 'Name', value: 'name' },
  { label: 'Barcode', value: 'barcode' },
  { label: 'SKU', value: 'sku' },
  { label: 'Batch', value: 'batch' },
] as const;

const EXPIRY_COLORS: Record<string, string> = {
  expired: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800',
  warning: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800',
  healthy: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
};

const STOCK_COLORS: Record<string, string> = {
  out: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  low: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  ok: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
};

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function calcTaxable(qty: number, rate: number, discType: DiscountType, discValue: number, discPct: number): number {
  const gross = qty * rate;
  let disc = 0;
  if (discType === 'percentage') disc = gross * (discPct / 100);
  else if (discType === 'flat') disc = discValue;
  else if (discType === 'scheme') disc = gross * (discPct / 100);
  return Math.max(0, Math.round((gross - disc) * 100) / 100);
}

function calcGstSplit(taxable: number, gstPct: number, isInterState: boolean, cessPct = 0): {
  cgst: number; sgst: number; igst: number; cess: number;
} {
  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = Math.round(taxable * (gstPct / 100) * 100) / 100;
  } else {
    const half = gstPct / 2;
    cgst = Math.round(taxable * (half / 100) * 100) / 100;
    sgst = Math.round(taxable * (half / 100) * 100) / 100;
  }
  const cess = cessPct > 0 ? Math.round(taxable * (cessPct / 100) * 100) / 100 : 0;
  return { cgst, sgst, igst, cess };
}

function calcAmount(taxable: number, totalGst: number): number {
  return Math.round((taxable + totalGst) * 100) / 100;
}

function recomputeLine(line: Partial<InvoiceLineItem>, isInterState = false): InvoiceLineItem {
  const qty = line.quantity ?? 0;
  const rate = line.rate ?? 0;
  const discType = line.discountType ?? 'percentage';
  const discValue = line.discountValue ?? 0;
  const discPct = line.discountPercent ?? 0;
  const gstPct = line.gstPercent ?? 0;

  const taxable = calcTaxable(qty, rate, discType, discValue, discPct);
  const { cgst, sgst, igst, cess } = calcGstSplit(taxable, gstPct, isInterState, line.cessPercent ?? 0);
  const totalGst = cgst + sgst + igst + cess;

  return {
    id: line.id ?? crypto.randomUUID(),
    productId: line.productId ?? '',
    productName: line.productName ?? '',
    sku: line.sku ?? '',
    hsn: line.hsn ?? '',
    barcode: line.barcode ?? '',
    batchNo: line.batchNo ?? '',
    expiryDate: line.expiryDate ?? '',
    warehouse: line.warehouse ?? 'Main',
    uom: line.uom ?? 'Pcs',
    availableStock: line.availableStock ?? 0,
    quantity: qty,
    freeQty: line.freeQty ?? 0,
    rate,
    priceList: line.priceList ?? 'retail',
    discountType: discType,
    discountValue: discValue,
    discountPercent: discPct,
    schemeName: line.schemeName ?? '',
    gstPercent: gstPct,
    cgstPercent: line.cgstPercent ?? (gstPct / 2),
    sgstPercent: line.sgstPercent ?? (gstPct / 2),
    igstPercent: line.igstPercent ?? 0,
    cessPercent: line.cessPercent ?? 0,
    taxableAmount: taxable,
    gstAmount: totalGst,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    cessAmount: cess,
    amount: calcAmount(taxable, totalGst),
    isExpired: line.isExpired ?? false,
    isBlocked: line.isBlocked ?? false,
    creditHold: line.creditHold ?? false,
    isExpanded: line.isExpanded ?? false,
  };
}

function getExpiryStatus(expiryDate: string): 'expired' | 'warning' | 'healthy' {
  if (!expiryDate) return 'healthy';
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry < now) return 'expired';
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 90) return 'warning';
  return 'healthy';
}

function getStockStatus(stock: number): 'out' | 'low' | 'ok' {
  if (stock <= 0) return 'out';
  if (stock < 10) return 'low';
  return 'ok';
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return '—'; }
}

// ═════════════════════════════════════════════════════════
// QUANTITY INPUT WITH SHORTCUTS
// ═════════════════════════════════════════════════════════

interface QuantityInputProps {
  value: number;
  max: number;
  allowDecimal?: boolean;
  onChange: (value: number) => void;
  stockWarning?: boolean;
  disabled?: boolean;
  id?: string;
}

const QuantityInput = memo(function QuantityInput({
  value, max, allowDecimal = true, onChange, stockWarning, disabled, id,
}: QuantityInputProps) {
  const step = allowDecimal ? 0.01 : 1;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) onChange(v);
  }, [onChange]);

  return (
    <div className="flex items-center gap-1">
      <input
        id={id}
        type="number"
        value={value || ''}
        onChange={handleChange}
        min={0}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'h-8 w-[56px] rounded-lg border bg-white px-1.5 text-center text-xs font-medium outline-none transition-all',
          'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
          'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
          stockWarning
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
            : 'border-slate-200 dark:border-slate-600',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        aria-label="Quantity"
      />
      <div className="flex flex-col gap-[2px]">
        <button
          type="button"
          onClick={() => onChange(Math.min(value + 1, max))}
          disabled={disabled || value >= max}
          className="flex h-3.5 w-5 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          aria-label="+1"
        >+1</button>
        <button
          type="button"
          onClick={() => onChange(Math.min(value + 5, max))}
          disabled={disabled || value >= max}
          className="flex h-3.5 w-5 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          aria-label="+5"
        >+5</button>
      </div>
      <div className="flex flex-col gap-[2px]">
        <button
          type="button"
          onClick={() => onChange(Math.min(value + 10, max))}
          disabled={disabled || value >= max}
          className="flex h-3.5 w-5 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
          aria-label="+10"
        >+10</button>
        <button
          type="button"
          onClick={() => onChange(max)}
          disabled={disabled || value >= max}
          className="flex h-3.5 w-5 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 dark:bg-slate-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          aria-label="Max"
        >Max</button>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// PRICE LIST SELECTOR
// ═════════════════════════════════════════════════════════

interface PriceListSelectorProps {
  value: PriceListType;
  onChange: (type: PriceListType, rate: number) => void;
  product: ProductRecord | null;
  currentRate: number;
  disabled?: boolean;
}

const PriceListSelector = memo(function PriceListSelector({
  value, onChange, product, currentRate, disabled,
}: PriceListSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = useCallback((type: PriceListType) => {
    if (!product) return;
    let rate = currentRate;
    switch (type) {
      case 'retail': rate = product.salesRate ?? rate; break;
      case 'wholesale': rate = product.wholesaleRate ?? product.salesRate ?? rate; break;
      case 'dealer': rate = product.dealerRate ?? product.salesRate ?? rate; break;
      case 'mrp': rate = product.mrp ?? product.salesRate ?? rate; break;
      case 'custom': rate = currentRate; break;
    }
    onChange(type, rate);
    setOpen(false);
  }, [product, currentRate, onChange]);

  const selectedLabel = PRICE_LIST_OPTIONS.find(o => o.value === value)?.label ?? 'Custom';
  const SelectedIcon = PRICE_LIST_OPTIONS.find(o => o.value === value)?.icon ?? IndianRupee;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium transition-all',
          'hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500',
          open && 'border-emerald-500 ring-1 ring-emerald-500/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <SelectedIcon className="h-3 w-3 text-slate-400" />
        <span className="text-slate-700 dark:text-slate-300">{selectedLabel}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {PRICE_LIST_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                  value === opt.value
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// DISCOUNT EDITOR
// ═════════════════════════════════════════════════════════

interface DiscountEditorProps {
  type: DiscountType;
  percent: number;
  flatValue: number;
  schemeName: string;
  freeQty: number;
  onTypeChange: (t: DiscountType) => void;
  onPercentChange: (v: number) => void;
  onFlatChange: (v: number) => void;
  onSchemeChange: (v: string) => void;
  onFreeQtyChange: (v: number) => void;
  disabled?: boolean;
}

const DiscountEditor = memo(function DiscountEditor({
  type, percent, flatValue, schemeName, freeQty,
  onTypeChange, onPercentChange, onFlatChange, onSchemeChange, onFreeQtyChange, disabled,
}: DiscountEditorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value as DiscountType)}
        disabled={disabled}
        className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-600 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        aria-label="Discount type"
      >
        {DISCOUNT_TYPES.map((dt) => (
          <option key={dt.value} value={dt.value}>{dt.label}</option>
        ))}
      </select>

      {type === 'percentage' && (
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={percent || ''}
            onChange={(e) => onPercentChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
            min={0}
            max={100}
            step={0.01}
            disabled={disabled}
            className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Discount percentage"
          />
          <span className="text-[10px] text-slate-400">%</span>
        </div>
      )}

      {type === 'flat' && (
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-slate-400">₹</span>
          <input
            type="number"
            value={flatValue || ''}
            onChange={(e) => onFlatChange(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
            disabled={disabled}
            className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1.5 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Flat discount amount"
          />
        </div>
      )}

      {type === 'scheme' && (
        <input
          type="text"
          value={schemeName}
          onChange={(e) => onSchemeChange(e.target.value)}
          placeholder="Scheme name"
          disabled={disabled}
          className="h-7 w-20 rounded-md border border-slate-200 bg-white px-1.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label="Scheme name"
        />
      )}

      {type === 'free_qty' && (
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            value={freeQty || ''}
            onChange={(e) => onFreeQtyChange(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
            step={0.01}
            disabled={disabled}
            className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Free quantity"
          />
          <span className="text-[10px] text-slate-400">free</span>
        </div>
      )}
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// GST EDITOR
// ═════════════════════════════════════════════════════════

interface GSTEditorProps {
  gstPercent: number;
  cessPercent: number;
  isInterState: boolean;
  editable: boolean;
  onChange: (gstPct: number, cessPct: number) => void;
}

const GSTEditor = memo(function GSTEditor({
  gstPercent, cessPercent, isInterState, editable, onChange,
}: GSTEditorProps) {
  const cgst = gstPercent / 2;
  const sgst = gstPercent / 2;
  const igst = isInterState ? gstPercent : 0;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {editable ? (
          <input
            type="number"
            value={gstPercent || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, cessPercent)}
            min={0}
            max={100}
            step={0.01}
            className="h-6 w-14 rounded border border-slate-200 bg-white px-1 text-right text-[10px] outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800"
            aria-label="GST percent"
          />
        ) : (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{gstPercent}%</span>
        )}
        {cessPercent > 0 && (
          <span className="text-[9px] text-slate-400">+CESS {cessPercent}%</span>
        )}
      </div>
      <div className="flex gap-2 text-[9px] text-slate-400">
        {isInterState ? (
          <span>IGST: {igst}%</span>
        ) : (
          <>
            <span>CGST: {cgst}%</span>
            <span>SGST: {sgst}%</span>
          </>
        )}
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// PRODUCT SEARCH DROPDOWN
// ═════════════════════════════════════════════════════════

interface ProductSearchDropdownProps {
  search: string;
  results: ProductRecord[];
  loading: boolean;
  highlightedIndex: number;
  recentProducts: ProductRecord[];
  frequentProducts: ProductRecord[];
  onSelect: (product: ProductRecord) => void;
  onHighlight: (index: number) => void;
}

const ProductSearchDropdown = memo(function ProductSearchDropdown({
  search,
  results,
  loading,
  highlightedIndex,
  recentProducts,
  frequentProducts,
  onSelect,
  onHighlight,
}: ProductSearchDropdownProps) {
  const showRecent = !search && recentProducts.length > 0;
  const showFrequent = !search && !showRecent && frequentProducts.length > 0;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-black/5 dark:border-slate-600 dark:bg-slate-800">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Searching...
        </div>
      )}

      {/* Recent Products */}
      {showRecent && !loading && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <History className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recent</span>
          </div>
          {recentProducts.slice(0, 5).map((product) => (
            <ProductSearchItem
              key={product.id}
              product={product}
              isHighlighted={false}
              onSelect={onSelect}
              onHighlight={() => {}}
            />
          ))}
          <div className="mx-3 my-1 border-t border-slate-100 dark:border-slate-700" />
        </>
      )}

      {/* Frequent Products */}
      {showFrequent && !loading && (
        <>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <Star className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Frequently Sold</span>
          </div>
          {frequentProducts.slice(0, 5).map((product) => (
            <ProductSearchItem
              key={product.id}
              product={product}
              isHighlighted={false}
              onSelect={onSelect}
              onHighlight={() => {}}
            />
          ))}
          <div className="mx-3 my-1 border-t border-slate-100 dark:border-slate-700" />
        </>
      )}

      {/* Search Results */}
      {!loading && results.length === 0 && search && (
        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-slate-400">
          <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <span>No products found</span>
          <button
            type="button"
            className="text-emerald-600 hover:underline dark:text-emerald-400"
          >+ Add new product</button>
        </div>
      )}

      {results.map((product, index) => (
        <ProductSearchItem
          key={product.id}
          product={product}
          isHighlighted={index === highlightedIndex}
          onSelect={onSelect}
          onHighlight={() => onHighlight(index)}
        />
      ))}
    </div>
  );
});

interface ProductSearchItemProps {
  product: ProductRecord;
  isHighlighted: boolean;
  onSelect: (p: ProductRecord) => void;
  onHighlight: () => void;
}

const ProductSearchItem = memo(function ProductSearchItem({
  product, isHighlighted, onSelect, onHighlight,
}: ProductSearchItemProps) {
  const qtyColor = getStockStatus(product.currentStock);
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        isHighlighted
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
      onMouseDown={(e) => { e.preventDefault(); onSelect(product); }}
      onMouseEnter={onHighlight}
    >
      {/* Avatar with stock indicator */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-500 dark:from-slate-700 dark:to-slate-600 dark:text-slate-300">
          {product.name.charAt(0).toUpperCase()}
        </div>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800',
          qtyColor === 'out' ? 'bg-red-500' : qtyColor === 'low' ? 'bg-amber-400' : 'bg-emerald-500',
        )} />
      </div>

      {/* Product info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="truncate text-xs text-slate-400">
          {product.sku}
          {product.barcode && ` · ${product.barcode}`}
          {product.hsn && ` · HSN: ${product.hsn}`}
        </p>
      </div>

      {/* Price + Stock */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {formatINR(product.salesRate)}
        </p>
        <p className={cn('text-xs font-medium', STOCK_COLORS[qtyColor])}>
          Stock: {product.currentStock}
          {product.unitName && ` ${product.unitName}`}
        </p>
      </div>
    </button>
  );
});

// ═════════════════════════════════════════════════════════
// BATCH SELECTOR MODAL
// ═════════════════════════════════════════════════════════

interface BatchSelectorProps {
  productName: string;
  batches: BatchInfo[];
  onSelect: (batch: BatchInfo) => void;
  onClose: () => void;
}

function BatchSelector({ productName, batches, onSelect, onClose }: BatchSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Select Batch</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          ><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Batch No</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expiry</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Available</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Purchase Rate</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selling Rate</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">MRP</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {batches.map((batch) => {
                const expiryStatus = getExpiryStatus(batch.expiryDate);
                return (
                  <tr key={batch.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{batch.batchNo}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', EXPIRY_COLORS[expiryStatus])}>
                        {formatDate(batch.expiryDate)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                      <span className={cn(getStockStatus(batch.availableQty) !== 'ok' && STOCK_COLORS[getStockStatus(batch.availableQty)])}>
                        {batch.availableQty}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-600 dark:text-slate-400">{formatINR(batch.purchaseRate)}</td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">{formatINR(batch.sellingRate)}</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-600 dark:text-slate-400">{batch.mrp ? formatINR(batch.mrp) : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelect(batch)}
                        disabled={expiryStatus === 'expired'}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {expiryStatus === 'expired' ? 'Expired' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// EXPANDABLE PRODUCT ROW DETAILS
// ═════════════════════════════════════════════════════════

interface ExpandedProductDetailsProps {
  item: InvoiceLineItem;
  product?: ProductRecord;
}

function ExpandedProductDetails({ item, product }: ExpandedProductDetailsProps) {
  const details = useMemo(() => [
    { label: 'HSN/SAC', value: item.hsn || product?.hsn || '—' },
    { label: 'Description', value: product?.description || '—' },
    { label: 'Company', value: product?.company || '—' },
    { label: 'Category', value: product?.category || '—' },
    { label: 'Sub Category', value: product?.subCategory || '—' },
    { label: 'Last Purchase Rate', value: product?.lastPurchaseRate ? formatINR(product.lastPurchaseRate) : '—' },
    { label: 'Last Selling Rate', value: product?.lastSellingRate ? formatINR(product.lastSellingRate) : '—' },
    { label: 'Profit Margin', value: product?.profitMargin ? `${product.profitMargin.toFixed(1)}%` : '—' },
  ], [item, product]);

  return (
    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/20">
      <td colSpan={16} className="px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
          {/* Product Image + Basic Info */}
          <div className="col-span-full flex items-start gap-4 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-700 dark:to-slate-600">
              <Image className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
              <p className="text-xs text-slate-400">SKU: {item.sku} · Barcode: {item.barcode || '—'}</p>
            </div>
          </div>

          {details.map((d) => (
            <div key={d.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{d.label}</p>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">{d.value}</p>
            </div>
          ))}

          {/* Warehouse Stock */}
          {product?.warehouseStocks && product.warehouseStocks.length > 0 && (
            <div className="col-span-full border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Warehouse Stock
              </p>
              <div className="flex flex-wrap gap-2">
                {product.warehouseStocks.map((ws) => (
                  <span key={ws.warehouse} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Layers className="h-3 w-3" />
                    {ws.warehouse}: {ws.qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="col-span-full border-t border-slate-200 dark:border-slate-700 pt-2 mt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Activity
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              {product?.lastPurchaseRate && <span>Last Purchase Rate: {formatINR(product.lastPurchaseRate)}</span>}
              {product?.lastSellingRate && <span>Last Selling Rate: {formatINR(product.lastSellingRate)}</span>}
              <span>Batch History: {item.batchNo || '—'}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ═════════════════════════════════════════════════════════
// INVOICE GRID ROW
// ═════════════════════════════════════════════════════════


interface InvoiceGridRowProps {
  item: InvoiceLineItem;
  index: number;
  columns: ColumnMeta[];
  isActive: boolean;
  activeCell: string | null;
  editingCell: string | null;
  productCache: Map<string, ProductRecord>;
  isInterState: boolean;
  onUpdate: (id: string, field: keyof InvoiceLineItem, value: number | string | boolean) => void;
  onDelete: (id: string) => void;
  onActivate: (row: number, col: string) => void;
  onEdit: (row: number, col: string) => void;
  onCellAction: CellAction;
}

const InvoiceGridRow = memo(function InvoiceGridRow({
  item, index, columns, isActive, activeCell, editingCell, productCache, isInterState,
  onUpdate, onDelete, onActivate, onEdit,
}: InvoiceGridRowProps) {
  const expiryStatus = getExpiryStatus(item.expiryDate);
  const stockStatus = getStockStatus(item.availableStock);
  const stockWarning = item.quantity > item.availableStock;
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll active row into view
  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  // Cell editors map
  const renderCell = useCallback((col: ColumnMeta): React.ReactNode => {
    const cellKey = col.key as string;
    const isEditing = editingCell === cellKey && isActive;

    switch (col.key) {
      case '#': return (
        <div className="flex items-center justify-center gap-1">
          <GripVertical className="h-3 w-3 text-slate-300 cursor-grab" />
          <span className="text-xs text-slate-400">{index + 1}</span>
        </div>
      );

      case 'productName': return (
        <button
          type="button"
          onClick={() => onEdit(index, 'productName')}
          className="min-w-0 text-left"
        >
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
          <p className="truncate text-[10px] text-slate-400">{item.sku}</p>
        </button>
      );

      case 'sku': return <span className="text-xs text-slate-500 dark:text-slate-400">{item.sku || '—'}</span>;
      case 'barcode': return <span className="text-xs text-slate-500 dark:text-slate-400">{item.barcode || '—'}</span>;

      case 'batchNo': return (
        <span className={cn(
          'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
          expiryStatus !== 'healthy' && EXPIRY_COLORS[expiryStatus],
          !expiryStatus && 'text-slate-400',
        )}>
          {item.batchNo || '—'}
        </span>
      );

      case 'expiryDate': return (
        <span className={cn(
          'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
          item.expiryDate ? EXPIRY_COLORS[expiryStatus] : 'text-slate-400',
        )}>
          {item.expiryDate ? formatDate(item.expiryDate) : '—'}
        </span>
      );

      case 'warehouse': return <span className="text-xs text-slate-600 dark:text-slate-400">{item.warehouse}</span>;
      case 'uom': return <span className="text-xs text-slate-600 dark:text-slate-400">{item.uom}</span>;

      case 'availableStock': return (
        <span className={cn('text-xs font-medium', STOCK_COLORS[stockStatus])}>
          {item.availableStock}
        </span>
      );

      case 'quantity': return (
        <div className="flex items-center justify-center">
          {isEditing ? (
            <QuantityInput
              value={item.quantity}
              max={item.availableStock}
              onChange={(v) => onUpdate(item.id, 'quantity', v)}
              stockWarning={stockWarning}
            />
          ) : (
            <button
              type="button"
              onClick={() => onEdit(index, 'quantity')}
              className={cn(
                'min-w-[40px] rounded px-1.5 py-1 text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-700',
                stockWarning ? 'text-red-600' : 'text-slate-900 dark:text-slate-100',
              )}
            >
              {item.quantity}
            </button>
          )}
        </div>
      );

      case 'freeQty': return (
        <input
          type="number"
          value={item.freeQty || ''}
          onChange={(e) => onUpdate(item.id, 'freeQty', Math.max(0, parseFloat(e.target.value) || 0))}
          min={0}
          step={0.01}
          className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1 text-center text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label={`Free quantity row ${index + 1}`}
        />
      );

      case 'rate': return (
        <div className="flex items-center justify-end gap-1">
          <PriceListSelector
            value={item.priceList}
            onChange={(type, rate) => {
              onUpdate(item.id, 'priceList', type);
              onUpdate(item.id, 'rate', rate);
            }}
            product={productCache.get(item.productId) ?? null}
            currentRate={item.rate}
          />
          {isEditing ? (
            <input
              type="number"
              value={item.rate || ''}
              onChange={(e) => onUpdate(item.id, 'rate', Math.max(0, parseFloat(e.target.value) || 0))}
              min={0}
              step={0.01}
              className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              aria-label="Rate"
            />
          ) : (
            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{formatINR(item.rate)}</span>
          )}
        </div>
      );

      case 'discountPercent': return (
        <DiscountEditor
          type={item.discountType}
          percent={item.discountPercent}
          flatValue={item.discountValue}
          schemeName={item.schemeName}
          freeQty={item.freeQty}
          onTypeChange={(t) => onUpdate(item.id, 'discountType', t)}
          onPercentChange={(v) => onUpdate(item.id, 'discountPercent', v)}
          onFlatChange={(v) => onUpdate(item.id, 'discountValue', v)}
          onSchemeChange={(v) => onUpdate(item.id, 'schemeName', v)}
          onFreeQtyChange={(v) => onUpdate(item.id, 'freeQty', v)}
        />
      );

      case 'gstPercent': return (
        <GSTEditor
          gstPercent={item.gstPercent}
          cessPercent={item.cessPercent}
          isInterState={isInterState}
          editable={false}
          onChange={(gst, cess) => {
            onUpdate(item.id, 'gstPercent', gst);
            onUpdate(item.id, 'cessPercent', cess);
          }}
        />
      );

      case 'amount': return (
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {formatINR(item.amount)}
        </span>
      );

      case 'actions': return (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          aria-label={`Delete row ${index + 1}`}
        ><Trash2 className="h-3.5 w-3.5" /></button>
      );

      default: return <span className="text-xs text-slate-500">—</span>;
    }
  }, [item, index, isActive, activeCell, editingCell, productCache, isInterState, onUpdate, onDelete, onEdit]);

  return (
    <>
      <tr
        ref={rowRef}
        className={cn(
          'transition-colors',
          isActive ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30',
          stockWarning && 'bg-red-50/30 dark:bg-red-900/5',
          item.isBlocked && 'opacity-60',
        )}
        onClick={() => onActivate(index, '#')}
        onDoubleClick={() => item.isExpanded ? onUpdate(item.id, 'isExpanded', false) : onUpdate(item.id, 'isExpanded', true)}
        data-row-index={index}
      >
        {columns.map((col) => (
          <td
            key={col.key as string}
            className={cn(
              'px-2 py-2.5 text-xs border-b border-slate-50 dark:border-slate-700/30',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
              col.key === '#' && 'sticky left-0 z-[5] bg-inherit',
              col.key === 'actions' && 'sticky right-0 z-[5] bg-inherit',
              isActive && activeCell === col.key && 'ring-2 ring-emerald-500/30 ring-inset',
            )}
            style={{ minWidth: col.minWidth, width: col.width, maxWidth: col.width }}
          >
            {renderCell(col)}
          </td>
        ))}
      </tr>
      {/* Expandable Details */}
      {item.isExpanded && (
        <ExpandedProductDetails item={item} product={productCache.get(item.productId)} />
      )}
    </>
  );
});

// ═════════════════════════════════════════════════════════
// BOTTOM SUMMARY
// ═════════════════════════════════════════════════════════

interface BottomSummaryProps {
  items: InvoiceLineItem[];
  onRoundOff?: (amount: number) => void;
}

const BottomSummary = memo(function BottomSummary({ items }: BottomSummaryProps) {
  const summary = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const taxableAmount = items.reduce((s, i) => s + i.taxableAmount, 0);
    const discountAmount = items.reduce((s, i) => {
      if (i.discountType === 'flat') return s + i.discountValue;
      if (i.discountType === 'free_qty') return s + i.freeQty * i.rate;
      return s + (i.quantity * i.rate * i.discountPercent) / 100;
    }, 0);
    const cgstTotal = items.reduce((s, i) => s + i.cgstAmount, 0);
    const sgstTotal = items.reduce((s, i) => s + i.sgstAmount, 0);
    const igstTotal = items.reduce((s, i) => s + i.igstAmount, 0);
    const cessTotal = items.reduce((s, i) => s + i.cessAmount, 0);
    const gstAmount = cgstTotal + sgstTotal + igstTotal + cessTotal;
    const subTotal = taxableAmount + gstAmount;
    const roundOff = Math.round(subTotal) - subTotal;
    const grandTotal = Math.round(subTotal);
    return {
      totalQty, taxableAmount, discountAmount,
      cgstTotal, sgstTotal, igstTotal, cessTotal, gstAmount,
      roundOff, grandTotal, subTotal,
    };
  }, [items]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* GST Breakdown */}
      <div className="border-b border-slate-100 px-5 py-2 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <GstChip label="CGST" value={summary.cgstTotal} color="text-blue-600 dark:text-blue-400" />
          <GstChip label="SGST" value={summary.sgstTotal} color="text-blue-600 dark:text-blue-400" />
          <GstChip label="IGST" value={summary.igstTotal} color="text-purple-600 dark:text-purple-400" />
          <GstChip label="CESS" value={summary.cessTotal} color="text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      {/* Main Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <SummaryItem label="Items" value={items.length} />
          <SummaryItem label="Total Qty" value={summary.totalQty} />
          <SummaryItem label="Taxable" value={formatINR(summary.taxableAmount)} />
          <SummaryItem label="Discount" value={formatINR(summary.discountAmount)} className="text-red-600 dark:text-red-400" />
          <SummaryItem label="GST" value={formatINR(summary.gstAmount)} className="text-blue-600 dark:text-blue-400" />
          <SummaryItem label="Round Off" value={summary.roundOff.toFixed(2)} className={cn(summary.roundOff < 0 ? 'text-red-500' : 'text-emerald-500')} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Grand Total</p>
            <p className="text-xs text-slate-400">(rounded)</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatINR(summary.grandTotal)}
            </span>
            {summary.roundOff !== 0 && (
              <span className="text-[10px] text-slate-400">({summary.roundOff > 0 ? '+' : ''}{summary.roundOff.toFixed(2)})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

function GstChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px]">
      <span className="font-medium text-slate-500 dark:text-slate-400">{label}:</span>
      <span className={cn('font-semibold', color || 'text-slate-700 dark:text-slate-300')}>
        {formatINR(value)}
      </span>
    </span>
  );
}

function SummaryItem({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', className)}>{value}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PRODUCT SELECTION SCREEN
// ═════════════════════════════════════════════════════════

export interface ProductSelectionScreenProps {
  onComplete?: (items: InvoiceLineItem[]) => void;
  onBack: () => void;
}

export function ProductSelectionScreen({ onComplete, onBack }: ProductSelectionScreenProps) {
  // ── Search ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<string>('name');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('product-search-history') || '[]'); }
    catch { return []; }
  });
  const [recentProducts, setRecentProducts] = useState<ProductRecord[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<ProductRecord[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product Cache for expandable rows ──────────────
  const [productCache] = useState(() => new Map<string, ProductRecord>());

  // ── Grid State ─────────────────────────────────────
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeCell, setActiveCell] = useState<string | null>('quantity');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<'search' | 'grid'>('search');
  const [isInterState] = useState(false);

  // ── Columns (reorderable) ──────────────────────────
  const [columns] = useState<ColumnMeta[]>(DEFAULT_COLUMNS);

  // ── Batch Selector ─────────────────────────────────
  const [batchSelectorProduct, setBatchSelectorProduct] = useState<ProductRecord | null>(null);

  // ── Keyboard Reference ─────────────────────────────
  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-focus search on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Load recent/frequent products
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const [recentRes, frequentRes] = await Promise.all([
          apiRequest<{ data: ProductRecord[] }>('/inventory/products/recent?limit=5').catch(() => null),
          apiRequest<{ data: ProductRecord[] }>('/inventory/products/frequent?limit=5').catch(() => null),
        ]);
        if (recentRes) setRecentProducts(Array.isArray(recentRes) ? recentRes : recentRes.data ?? []);
        if (frequentRes) setFrequentProducts(Array.isArray(frequentRes) ? frequentRes : frequentRes.data ?? []);
      } catch { /* silent */ }
    };
    loadPresets();
  }, []);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Save search history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const next = [query, ...prev.filter(h => h !== query)].slice(0, 10);
      try { localStorage.setItem('product-search-history', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  // ── Search ─────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value) {
      setProducts([]);
      setShowSearchResults(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setShowSearchResults(true);
      saveToHistory(value);
      try {
        const params = new URLSearchParams({ search: value, pageSize: '20' });
        if (searchMode !== 'name') params.set('searchField', searchMode);
        const res = await apiRequest<{ data: ProductRecord[] }>(`/inventory/products?${params}`);
        const list = Array.isArray(res) ? res : res?.data ?? [];
        setProducts(list);
        // Cache products for expandable rows
        list.forEach(p => productCache.set(p.id, p));
        setHighlightedIndex(-1);
      } catch {
        setProducts([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchMode, saveToHistory, productCache]);

  // ── Add Product to Grid ────────────────────────────
  const addProductToGrid = useCallback(
    (product: ProductRecord, batch?: BatchInfo) => {
      // Validation: expired batch
      if (batch && getExpiryStatus(batch.expiryDate) === 'expired') return;
      // Validation: inactive product
      if (product.isActive === false) return;
      // Validation: blocked product
      if (product.isBlocked) return;

      setItems((prev) => {
        const existing = prev.find(
          (i) => i.productId === product.id && i.batchNo === (batch?.batchNo ?? '')
        );
        if (existing) {
          return prev.map((i) =>
            i.id === existing.id
              ? recomputeLine({ ...i, quantity: i.quantity + 1 }, isInterState)
              : i,
          );
        }
        const newLine = recomputeLine({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          hsn: product.hsn ?? '',
          barcode: product.barcode ?? '',
          batchNo: batch?.batchNo ?? '',
          expiryDate: batch?.expiryDate ?? '',
          warehouse: 'Main',
          uom: product.unitName ?? 'Pcs',
          availableStock: product.currentStock,
          quantity: 1,
          rate: batch?.sellingRate ?? product.salesRate,
          gstPercent: product.gstRate ?? 0,
          isExpired: batch ? getExpiryStatus(batch.expiryDate) === 'expired' : false,
          isBlocked: product.isBlocked ?? false,
        }, isInterState);
        return [...prev, newLine];
      });
      // Cache product for expandable details
      productCache.set(product.id, product);
      setSearchQuery('');
      setProducts([]);
      setShowSearchResults(false);
      setFocusMode('grid');
      setActiveRow((prev) => prev + 1); // Focus new row
      setTimeout(() => searchInputRef.current?.focus(), 100);
    },
    [items.length, productCache, isInterState],
  );

  const handleSelectProduct = useCallback(
    (product: ProductRecord) => {
      if (product.batches && product.batches.length > 1) {
        setBatchSelectorProduct(product);
        return;
      }
      const batch = product.batches?.[0];
      addProductToGrid(product, batch);
    },
    [addProductToGrid],
  );

  const handleBatchSelect = useCallback(
    (batch: BatchInfo) => {
      if (batchSelectorProduct) {
        addProductToGrid(batchSelectorProduct, batch);
        setBatchSelectorProduct(null);
      }
    },
    [batchSelectorProduct, addProductToGrid],
  );

  // ── Grid Item Updates ──────────────────────────────
  const handleItemUpdate = useCallback(
    (id: string, field: keyof InvoiceLineItem, value: number | string | boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? recomputeLine({ ...item, [field]: value }, isInterState) : item,
        ),
      );
    },
    [isInterState],
  );

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleDuplicateRow = useCallback(() => {
    if (items.length === 0 || activeRow >= items.length) return;
    setItems((prev) => {
      const source = prev[activeRow];
      if (!source) return prev;
      const dup = recomputeLine({ ...source, id: crypto.randomUUID() }, isInterState);
      const next = [...prev];
      next.splice(activeRow + 1, 0, dup);
      return next;
    });
  }, [items, activeRow, isInterState]);

  // ── Cell Actions ───────────────────────────────────
  const handleCellAction: CellAction = useCallback((action, itemId) => {
    if (action === 'toggleExpand') {
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, isExpanded: !i.isExpanded } : i));
    }
  }, []);

  // ── Keyboard Navigation ────────────────────────────
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && products[highlightedIndex]) {
            handleSelectProduct(products[highlightedIndex]);
          } else if (products.length > 0) {
            handleSelectProduct(products[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSearchResults(false);
          setSearchQuery('');
          searchInputRef.current?.blur();
          break;
        case 'Tab':
          if (e.shiftKey) break;
          e.preventDefault();
          setShowSearchResults(false);
          setFocusMode('grid');
          setEditingCell('quantity');
          setTimeout(() => gridRef.current?.focus(), 50);
          break;
        case 'F2':
          e.preventDefault();
          setFocusMode('grid');
          setEditingCell('quantity');
          break;
      }
    },
    [products, highlightedIndex, handleSelectProduct],
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (items.length === 0) return;

      const cellKeys: string[] = columns.map(c => c.key as string);
      const colIndex = activeCell ? cellKeys.indexOf(activeCell) : -1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveRow((prev) => Math.min(prev + 1, items.length - 1));
          setEditingCell(null);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveRow((prev) => Math.max(prev - 1, 0));
          setEditingCell(null);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (colIndex > 0) {
            const prevKey = cellKeys[colIndex - 1];
            setActiveCell(prevKey);
            setEditingCell(null);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (colIndex < cellKeys.length - 1) {
            const nextKey = cellKeys[colIndex + 1];
            setActiveCell(nextKey);
            setEditingCell(null);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Previous cell
            if (colIndex > 0) {
              const prevKey = cellKeys[colIndex - 1];
              setActiveCell(prevKey);
              setEditingCell(prevKey);
            }
          } else {
            // Next cell or go to search
            if (colIndex < cellKeys.length - 1) {
              const nextKey = cellKeys[colIndex + 1];
              setActiveCell(nextKey);
              setEditingCell(nextKey);
            } else {
              setFocusMode('search');
              setEditingCell(null);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (editingCell) {
            setEditingCell(null); // Commit edit
          } else if (activeCell) {
            setEditingCell(activeCell); // Start edit
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (editingCell) {
            setEditingCell(null); // Cancel edit
          } else {
            setFocusMode('search');
            setActiveCell(null);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }
          break;
        case 'F2':
          e.preventDefault();
          if (activeCell) setEditingCell(activeCell);
          break;
        case 'Delete':
          if (e.ctrlKey) {
            e.preventDefault();
            const target = items[activeRow];
            if (target) handleDeleteItem(target.id);
          }
          break;
        case 'd':
          if (e.ctrlKey) {
            e.preventDefault();
            handleDuplicateRow();
          }
          break;
      }
    },
    [items, activeRow, activeCell, editingCell, columns, handleDeleteItem, handleDuplicateRow],
  );

  // Close search results on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Search placeholder ──────────────────────────────
  const searchPlaceholder = useMemo(() => {
    const labels: Record<string, string> = {
      name: 'Search products by name...',
      barcode: 'Scan or type barcode...',
      sku: 'Search by SKU code...',
      batch: 'Search by batch number...',
    };
    return labels[searchMode] || 'Search products...';
  }, [searchMode]);

  // ── Validation banners ──────────────────────────────
  const validationBanners = useMemo(() => {
    const banners: { type: 'error' | 'warning'; message: string }[] = [];
    const expiredItems = items.filter(i => i.isExpired);
    const blockedItems = items.filter(i => i.isBlocked);
    const overStockItems = items.filter(i => i.quantity > i.availableStock);
    const creditHoldItems = items.filter(i => i.creditHold);

    if (expiredItems.length > 0) banners.push({
      type: 'error', message: `${expiredItems.length} item(s) have expired batches. Replace them before saving.`
    });
    if (blockedItems.length > 0) banners.push({
      type: 'error', message: `${blockedItems.length} blocked product(s) in invoice. Remove them to continue.`
    });
    if (creditHoldItems.length > 0) banners.push({
      type: 'warning', message: `${creditHoldItems.length} item(s) are on credit hold. Check customer balance before proceeding.`
    });
    if (overStockItems.length > 0) banners.push({
      type: 'warning', message: `${overStockItems.length} item(s) exceed available stock.`
    });

    return banners;
  }, [items]);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200">
      {/* ═══════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Go back"
          ><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Products & Items</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {items.length > 0
                ? `${items.length} item${items.length !== 1 ? 's' : ''} added`
                : 'Search and add products to your invoice'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Barcode className="h-4 w-4" />}>Barcode Scan</Button>
          <Button variant="ghost" size="sm" icon={<Upload className="h-4 w-4" />}>Import</Button>
          <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />}>Add Product</Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SEARCH BAR
      ═══════════════════════════════════════════════════ */}
      <div className="border-b border-slate-100 px-6 py-3 dark:border-slate-700/50">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div ref={searchRef} className="relative flex-1 min-w-[280px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                setFocusMode('search');
                if (products.length > 0) setShowSearchResults(true);
              }}
              placeholder={searchPlaceholder}
              className={cn(
                'h-[42px] w-full rounded-xl border bg-white pl-10 pr-4 text-sm outline-none transition-all',
                'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400',
                'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
                focusMode === 'search' ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400' : 'border-slate-200',
              )}
              autoComplete="off"
              aria-label="Search products"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 dark:text-slate-600">
              {focusMode === 'search' ? 'F2' : 'Tab→'}
            </span>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <ProductSearchDropdown
                search={searchQuery}
                results={products}
                loading={searchLoading}
                highlightedIndex={highlightedIndex}
                recentProducts={recentProducts}
                frequentProducts={frequentProducts}
                onSelect={handleSelectProduct}
                onHighlight={setHighlightedIndex}
              />
            )}
          </div>

          {/* Search Mode Toggle */}
          <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-800">
            {SEARCH_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setSearchMode(mode.value);
                  setSearchQuery('');
                  setProducts([]);
                  setShowSearchResults(false);
                  searchInputRef.current?.focus();
                }}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all',
                  searchMode === mode.value
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !searchQuery && (
            <div className="flex items-center gap-1">
              <History className="h-3 w-3 text-slate-400" />
              {searchHistory.slice(0, 3).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setSearchQuery(h);
                    handleSearchChange(h);
                  }}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          VALIDATION BANNERS
      ═══════════════════════════════════════════════════ */}
      {validationBanners.length > 0 && (
        <div className="space-y-1 px-6 py-2">
          {validationBanners.map((banner, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                banner.type === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
              )}
            >
              {banner.type === 'error' ? (
                <X className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="h-3.5 w-3.5 shrink-0" />
              )}
              {banner.message}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          INVOICE GRID
      ═══════════════════════════════════════════════════ */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="min-h-0 flex-1 overflow-auto outline-none"
        aria-label="Invoice items grid"
        role="grid"
      >
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
              <ClipboardList className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No items added yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Search for products above and press Enter or Tab to add them to the grid
            </p>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
              <span>Tab → Grid</span>
              <span>F2 → Edit cell</span>
              <span>Ctrl+D → Duplicate row</span>
              <span>Ctrl+Delete → Remove row</span>
            </div>
          </div>
        ) : (
          <div className="min-w-[1400px] max-w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  {columns.map((col) => (
                    <th
                      key={col.key as string}
                      className={cn(
                        'sticky top-0 z-10 bg-slate-50/95 px-2 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400',
                        'select-none',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.key === '#' && 'sticky left-0 z-[11] bg-slate-50/95 dark:bg-slate-800/95',
                        col.key === 'actions' && 'sticky right-0 z-[11] bg-slate-50/95 dark:bg-slate-800/95',
                        col.resizable && 'cursor-col-resize',
                      )}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth,
                        maxWidth: col.width,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {col.key === '#' && (
                          <button
                            type="button"
                            className="text-slate-300 hover:text-slate-500"
                            aria-label="Reorder columns"
                          ><GripVertical className="h-3 w-3" /></button>
                        )}
                        <span>{col.label}</span>
                        {col.reorderable && (
                          <ArrowUpDown className="h-2.5 w-2.5 text-slate-300" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {items.map((item, index) => (
                  <InvoiceGridRow
                    key={item.id}
                    item={item}
                    index={index}
                    columns={columns}
                    isActive={index === activeRow}
                    activeCell={activeCell}
                    editingCell={editingCell}
                    productCache={productCache}
                    isInterState={isInterState}
                    onUpdate={handleItemUpdate}
                    onDelete={handleDeleteItem}
                    onActivate={(row, col) => { setActiveRow(row); setActiveCell(col); }}
                    onEdit={(row, col) => { setActiveRow(row); setActiveCell(col); setEditingCell(col); }}
                    onCellAction={handleCellAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          BOTTOM SUMMARY
      ═══════════════════════════════════════════════════ */}
      <div className="border-t border-slate-200 px-6 py-3 dark:border-slate-700">
        <BottomSummary items={items} />
      </div>

      {/* ═══════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
          <span>↑↓ ←→ Navigate</span>
          <span>Tab/Shift+Tab Cell</span>
          <span>Enter Edit</span>
          <span>F2 Edit</span>
          <span>Esc Cancel</span>
          <span>^D Duplicate</span>
          <span>^⌫ Delete</span>
          <span>⏎ Search → Grid</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} icon={<X className="h-4 w-4" />}>
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => onComplete?.(items)}
            disabled={items.length === 0}
            icon={<Check className="h-4 w-4" />}
          >
            {items.length === 0 ? 'Add items to continue' : `Review Invoice (${items.length} items)`}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          BATCH SELECTOR MODAL
      ═══════════════════════════════════════════════════ */}
      {batchSelectorProduct && batchSelectorProduct.batches && (
        <BatchSelector
          productName={batchSelectorProduct.name}
          batches={batchSelectorProduct.batches}
          onSelect={handleBatchSelect}
          onClose={() => setBatchSelectorProduct(null)}
        />
      )}
    </div>
  );
}
