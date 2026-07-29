import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Check,

  Edit3,
  Eye,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Ban,
  Phone,
  Mail,
  MapPin,
  User,
  CreditCard,
  IndianRupee,
  Calendar,
  ShoppingCart,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/services/api-client';
import { cn } from '@/lib/utils';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  district?: string;
  taluka?: string;
  village?: string;
  state?: string;
  pin?: string;
  creditLimit: number;
  creditDays: number;
  outstanding: number;
  totalPurchases?: number;
  totalPayments?: number;
  lastPurchaseDate?: string;
  customerCategory?: string;
  customerType?: string;
  status: string;
  photoUrl?: string;
}

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

const CUSTOMER_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Dealer', value: 'dealer' },
  { label: 'Distributor', value: 'distributor' },
] as const;

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' },
] as const;

const SEARCH_MODES = [
  { label: 'Name', value: 'name' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'GSTIN', value: 'gstin' },
  { label: 'Code', value: 'code' },
] as const;

const TABLE_PAGE_SIZE = 20;

// ═════════════════════════════════════════════════════════
// CUSTOMER FILTERS
// ═════════════════════════════════════════════════════════

interface CustomerFiltersState {
  customerType: string;
  status: string;
  district: string;
  taluka: string;
  village: string;
  outstandingOnly: boolean;
  creditLimitExceeded: boolean;
}

interface CustomerFiltersProps {
  filters: CustomerFiltersState;
  onChange: (filters: CustomerFiltersState) => void;
  onClose: () => void;
}

function CustomerFiltersSection({ filters, onChange, onClose }: CustomerFiltersProps) {
  const update = <K extends keyof CustomerFiltersState>(
    key: K,
    value: CustomerFiltersState[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Filter className="mr-1.5 inline h-4 w-4" />
          Filters
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Close filters"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Customer Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Customer Type
          </label>
          <select
            value={filters.customerType}
            onChange={(e) => update('customerType', e.target.value)}
            className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Customer type filter"
          >
            {CUSTOMER_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => update('status', e.target.value)}
            className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Status filter"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            District
          </label>
          <input
            type="text"
            value={filters.district}
            onChange={(e) => update('district', e.target.value)}
            placeholder="Filter by district..."
            className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Taluka */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Taluka
          </label>
          <input
            type="text"
            value={filters.taluka}
            onChange={(e) => update('taluka', e.target.value)}
            placeholder="Filter by taluka..."
            className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Village */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Village
          </label>
          <input
            type="text"
            value={filters.village}
            onChange={(e) => update('village', e.target.value)}
            placeholder="Filter by village..."
            className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-col justify-end gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filters.outstandingOnly}
              onChange={(e) => update('outstandingOnly', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
            />
            Outstanding Only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={filters.creditLimitExceeded}
              onChange={(e) => update('creditLimitExceeded', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
            />
            Credit Limit Exceeded
          </label>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CUSTOMER PREVIEW PANEL
// ═════════════════════════════════════════════════════════

interface CustomerPreviewPanelProps {
  customer: CustomerRecord | null;
}

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
  warning?: boolean;
}

function InfoRow({ icon, label, value, highlight, warning }: InfoRowProps) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p
          className={cn(
            'mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100',
            highlight && 'text-emerald-600 dark:text-emerald-400',
            warning && 'text-red-600 dark:text-red-400',
          )}
        >
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

function CustomerPreviewPanel({ customer }: CustomerPreviewPanelProps) {
  if (!customer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
          <Building2 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Select a customer to view details
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Use the table on the left or search to find a customer
        </p>
      </div>
    );
  }

  const isCreditExceeded = customer.creditLimit > 0 && customer.outstanding > customer.creditLimit;
  const availableCredit = Math.max(0, customer.creditLimit - customer.outstanding);

  return (
    <div className="h-full overflow-y-auto">
      {/* Customer Header */}
      <div className="border-b border-slate-100 p-5 dark:border-slate-700">
        <div className="flex items-start gap-4">
          {/* Avatar / Photo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
            {customer.photoUrl ? (
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {customer.name}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {customer.customerCategory ?? 'General'}
            </p>
            <span
              className={cn(
                'mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                customer.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : customer.status === 'blocked'
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {customer.status}
            </span>
          </div>
        </div>

        {/* Warnings */}
        {isCreditExceeded && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Outstanding (₹{customer.outstanding.toLocaleString('en-IN')}) exceeds credit limit
          </div>
        )}
        {customer.status === 'blocked' && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <Ban className="h-4 w-4 shrink-0" />
            Customer is blocked — selection disabled
          </div>
        )}
      </div>

      {/* Details */}
      <div className="divide-y divide-slate-100 px-5 dark:divide-slate-700/50">
        {/* Contact */}
        <div className="py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Contact
          </p>
          <InfoRow icon={<User className="h-4 w-4" />} label="Code" value={customer.code} />
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile" value={customer.mobile} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email} />
        </div>

        {/* Tax Info */}
        <div className="py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Tax Info
          </p>
          <InfoRow icon={<Building2 className="h-4 w-4" />} label="GSTIN" value={customer.gstin} />
          <InfoRow icon={<CreditCard className="h-4 w-4" />} label="PAN" value={customer.pan} />
        </div>

        {/* Address */}
        <div className="py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Address
          </p>
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={customer.address} />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="District" value={customer.district} />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Taluka" value={customer.taluka} />
          <InfoRow icon={<MapPin className="h-4 w-4" />} label="Village" value={customer.village} />
        </div>

        {/* Financial */}
        <div className="py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Financial
          </p>
          <InfoRow
            icon={<IndianRupee className="h-4 w-4" />}
            label="Credit Limit"
            value={`₹${customer.creditLimit.toLocaleString('en-IN')}`}
          />
          <InfoRow
            icon={<IndianRupee className="h-4 w-4" />}
            label="Available Credit"
            value={`₹${availableCredit.toLocaleString('en-IN')}`}
            highlight
          />
          <InfoRow
            icon={<IndianRupee className="h-4 w-4" />}
            label="Outstanding"
            value={`₹${customer.outstanding.toLocaleString('en-IN')}`}
            warning={isCreditExceeded}
          />
        </div>

        {/* Activity */}
        <div className="py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Activity
          </p>
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Last Purchase"
            value={customer.lastPurchaseDate ?? '—'}
          />
          <InfoRow
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Total Purchases"
            value={
              customer.totalPurchases != null
                ? `₹${customer.totalPurchases.toLocaleString('en-IN')}`
                : null
            }
          />
          <InfoRow
            icon={<PiggyBank className="h-4 w-4" />}
            label="Total Payments"
            value={
              customer.totalPayments != null
                ? `₹${customer.totalPayments.toLocaleString('en-IN')}`
                : null
            }
          />
          <InfoRow
            icon={<IndianRupee className="h-4 w-4" />}
            label="Current Balance"
            value={
              customer.outstanding != null
                ? `₹${(customer.outstanding).toLocaleString('en-IN')}`
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CUSTOMER SELECTION SCREEN
// ═════════════════════════════════════════════════════════

export interface CustomerSelectionScreenProps {
  onSelect: (customer: CustomerRecord) => void;
  onCancel: () => void;
}

export function CustomerSelectionScreen({ onSelect, onCancel }: CustomerSelectionScreenProps) {
  const navigate = useNavigate();

  // ── Search & Filters ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<string>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CustomerFiltersState>({
    customerType: '',
    status: '',
    district: '',
    taluka: '',
    village: '',
    outstandingOnly: false,
    creditLimitExceeded: false,
  });

  // ── Data ────────────────────────────────────────────
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / TABLE_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Selection ───────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tableRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Customers ─────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(TABLE_PAGE_SIZE),
      });

      // Add search with search field hint for the backend
      if (searchQuery) {
        params.set('search', searchQuery);
        if (searchMode !== 'name') {
          params.set('searchField', searchMode);
        }
      }

      // Add filters
      if (filters.customerType) params.set('type', filters.customerType);
      if (filters.status) params.set('status', filters.status);
      if (filters.district) params.set('district', filters.district);
      if (filters.taluka) params.set('taluka', filters.taluka);
      if (filters.village) params.set('village', filters.village);
      if (filters.outstandingOnly) params.set('outstandingOnly', 'true');
      if (filters.creditLimitExceeded) params.set('creditLimitExceeded', 'true');

      const res = await apiRequest<{ data: CustomerRecord[]; total: number }>(
        `/customers?${params}`,
      );
      const list = Array.isArray(res) ? res : res?.data ?? [];
      const totalCount = !Array.isArray(res) ? (res?.total ?? list.length) : list.length;
      setCustomers(list);
      setTotal(totalCount);
      setFocusedIndex(-1);
      setSelectedCustomer((prev) => {
        // Keep selection if still in results
        if (prev && list.some((c) => c.id === prev.id)) return prev;
        return null;
      });
    } catch (err) {
      setError((err as Error).message);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, searchMode, filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ── Search debounce — delay both query + page reset together ──
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    // Clear previous timer
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    // Debounce: wait for typing to settle, then update both query and page
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 300);
  }, []);
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Keyboard Navigation ─────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < customers.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : customers.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && customers[focusedIndex]) {
          const customer = customers[focusedIndex];
          setSelectedCustomer(customer);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedCustomer) {
          setSelectedCustomer(null);
        } else {
          onCancel();
        }
      }
    },
    [customers, focusedIndex, selectedCustomer, onCancel],
  );

  // ── Scroll focused item into view ────────────────────
  useEffect(() => {
    if (focusedIndex >= 0 && tableRef.current) {
      const rows = tableRef.current.querySelectorAll<HTMLElement>('[data-row-index]');
      const target = rows[focusedIndex];
      target?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // ── Actions ─────────────────────────────────────────
  const handleSelectCustomer = useCallback(() => {
    if (selectedCustomer && selectedCustomer.status !== 'blocked') {
      onSelect(selectedCustomer);
    }
  }, [selectedCustomer, onSelect]);

  const handleRowClick = useCallback((customer: CustomerRecord) => {
    setSelectedCustomer((prev) => (prev?.id === customer.id ? null : customer));
  }, []);

  const handleRowDoubleClick = useCallback(
    (customer: CustomerRecord) => {
      if (customer.status !== 'blocked') {
        setSelectedCustomer(customer);
        onSelect(customer);
      }
    },
    [onSelect],
  );

  const isBlocked = selectedCustomer?.status === 'blocked';

  // ── Status Badge ────────────────────────────────────
  const statusBadge = (status: string): ReactNode => {
    const styles: Record<string, string> = {
      active:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
      inactive:
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      blocked: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    };
    return (
      <span
        className={cn(
          'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
          styles[status] || styles.active,
        )}
      >
        {status}
      </span>
    );
  };

  // Search mode indicator
  const searchPlaceholder = useMemo(() => {
    const labels: Record<string, string> = {
      name: 'Search by customer name...',
      mobile: 'Search by mobile number...',
      gstin: 'Search by GSTIN...',
      code: 'Search by customer code...',
    };
    return labels[searchMode] || 'Search customers...';
  }, [searchMode]);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200">
      {/* ═══════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Select Customer
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total > 0
                ? `${total} customer${total !== 1 ? 's' : ''} found`
                : 'Search and select a customer for this invoice'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => {
              if (selectedCustomer) navigate(`/customers/${selectedCustomer.id}/ledger`);
            }}
            disabled={!selectedCustomer}
          >
            View Ledger
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Edit3 className="h-4 w-4" />}
            onClick={() => {
              if (selectedCustomer) navigate(`/customers/${selectedCustomer.id}/edit`);
            }}
            disabled={!selectedCustomer}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/customers/create')}
          >
            Add New
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          CONTENT
      ═══════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1">
        {/* ── Left: Table ──────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Search & Filter Bar */}
          <div className="border-b border-slate-100 p-4 dark:border-slate-700/50">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  autoComplete="off"
                  aria-label="Search customers"
                />
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
                      setPage(1);
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

              {/* Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex h-[42px] items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all',
                  showFilters
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
            </div>

            {/* Filter Section (collapsible) */}
            {showFilters && (
              <div className="mt-3">
                <CustomerFiltersSection
                  filters={filters}
                  onChange={(newFilters) => {
                    setFilters(newFilters);
                    setPage(1);
                  }}
                  onClose={() => setShowFilters(false)}
                />
              </div>
            )}
          </div>

          {/* Table */}
          <div
            ref={tableRef}
            className="flex-1 overflow-auto"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            role="grid"
            aria-label="Customer list"
            aria-rowcount={customers.length}
          >
            {loading && customers.length === 0 && (
              <div className="flex h-48 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading customers...
                </div>
              </div>
            )}

            {error && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchCustomers}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && customers.length === 0 && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No customers found
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Try adjusting your search or filters
                </p>
              </div>
            )}

            {customers.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Code
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Customer Name
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Mobile
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Village / City
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      GSTIN
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Outstanding
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Credit Limit
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {customers.map((customer, index) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    const isFocused = index === focusedIndex;
                    const isOverLimit =
                      customer.creditLimit > 0 &&
                      customer.outstanding > customer.creditLimit;

                    return (
                      <tr
                        key={customer.id}
                        data-row-index={index}
                        role="row"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        className={cn(
                          'cursor-pointer transition-all duration-100',
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-900/15'
                            : isFocused
                              ? 'bg-slate-50 dark:bg-slate-700/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30',
                          customer.status === 'blocked' && 'opacity-60',
                        )}
                        onClick={() => handleRowClick(customer)}
                        onDoubleClick={() => handleRowDoubleClick(customer)}
                        onMouseEnter={() => setFocusedIndex(index)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {customer.code || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-bold text-white">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {customer.name}
                              </p>
                              {customer.customerType && (
                                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                                  {customer.customerType}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {customer.mobile || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {customer.village || customer.city || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-400">
                          {customer.gstin || '—'}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right text-sm font-medium',
                            isOverLimit
                              ? 'text-red-600 dark:text-red-400'
                              : customer.outstanding > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-400',
                          )}
                        >
                          ₹{customer.outstanding.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                          ₹{customer.creditLimit.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {statusBadge(customer.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * TABLE_PAGE_SIZE + 1}–
                {Math.min(page * TABLE_PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all',
                        p === page
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700',
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Preview Panel ────────────────────── */}
        <div className="hidden w-[380px] shrink-0 border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/30 lg:block">
          <CustomerPreviewPanel customer={selectedCustomer} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          FOOTER ACTIONS
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {selectedCustomer && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Selected:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {selectedCustomer.name}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onCancel} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSelectCustomer}
            disabled={!selectedCustomer || isBlocked}
            icon={<Check className="h-4 w-4" />}
          >
            Select Customer
          </Button>
        </div>
      </div>
    </div>
  );
}
