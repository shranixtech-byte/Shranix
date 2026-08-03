import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import { QuickCreateModal } from '@/components/ui/QuickCreateModal';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';

// ═════════════════════════════════════════════════════════
// SHARED CONSTANTS & HELPERS
// (Used by both the legacy 8-step wizard and the simple page)
// ═════════════════════════════════════════════════════════

export const INVOICE_PREFIX = 'SL'; // Configurable — read from settings later (naya format: SLCA26-001)

export const INDIAN_STATES = [
  { label: 'Andhra Pradesh', value: 'AP' },
  { label: 'Arunachal Pradesh', value: 'AR' },
  { label: 'Assam', value: 'AS' },
  { label: 'Bihar', value: 'BR' },
  { label: 'Chhattisgarh', value: 'CG' },
  { label: 'Goa', value: 'GA' },
  { label: 'Gujarat', value: 'GJ' },
  { label: 'Haryana', value: 'HR' },
  { label: 'Himachal Pradesh', value: 'HP' },
  { label: 'Jharkhand', value: 'JH' },
  { label: 'Karnataka', value: 'KA' },
  { label: 'Kerala', value: 'KL' },
  { label: 'Madhya Pradesh', value: 'MP' },
  { label: 'Maharashtra', value: 'MH' },
  { label: 'Manipur', value: 'MN' },
  { label: 'Meghalaya', value: 'ML' },
  { label: 'Mizoram', value: 'MZ' },
  { label: 'Nagaland', value: 'NL' },
  { label: 'Odisha', value: 'OD' },
  { label: 'Punjab', value: 'PB' },
  { label: 'Rajasthan', value: 'RJ' },
  { label: 'Sikkim', value: 'SK' },
  { label: 'Tamil Nadu', value: 'TN' },
  { label: 'Telangana', value: 'TS' },
  { label: 'Tripura', value: 'TR' },
  { label: 'Uttar Pradesh', value: 'UP' },
  { label: 'Uttarakhand', value: 'UK' },
  { label: 'West Bengal', value: 'WB' },
  { label: 'Andaman & Nicobar', value: 'AN' },
  { label: 'Chandigarh', value: 'CH' },
  { label: 'Dadra & Nagar Haveli', value: 'DN' },
  { label: 'Daman & Diu', value: 'DD' },
  { label: 'Delhi', value: 'DL' },
  { label: 'Jammu & Kashmir', value: 'JK' },
  { label: 'Ladakh', value: 'LA' },
  { label: 'Lakshadweep', value: 'LD' },
  { label: 'Puducherry', value: 'PY' },
] as const satisfies readonly { label: string; value: string }[];

export const PAYMENT_TERMS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Credit', value: 'credit' },
  { label: '7 Days', value: '7_days' },
  { label: '15 Days', value: '15_days' },
  { label: '30 Days', value: '30_days' },
  { label: '45 Days', value: '45_days' },
  { label: 'Custom', value: 'custom' },
] as const satisfies readonly { label: string; value: string }[];

export const DAYS_MAP: Record<string, number> = {
  cash: 0,
  credit: 30,
  '7_days': 7,
  '15_days': 15,
  '30_days': 30,
  '45_days': 45,
  custom: 0,
};

export function computeFinancialYear(dateStr: string): string {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function computeDueDate(dateStr: string, paymentTerm: string): string {
  if (!dateStr || !paymentTerm) {
    return '';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return '';
  }
  const days = paymentTerm in DAYS_MAP ? DAYS_MAP[paymentTerm] : 30;
  if (days === 0) {
    return dateStr;
  }
  const due = new Date(date);
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

/** Payment type → invoice code: cash → 'CA', credit → 'CR' */
export function invoicePaymentCode(paymentType?: string): string {
  return paymentType === 'credit' ? 'CR' : 'CA';
}

/**
 * Fallback invoice number — backend unreachable hone par bhi SL<CA|CR><YY> hissa sahi dikhe.
 * Suffix base36 (alphanumeric) rakha hai taaki /-(\d+)$/ regex se backend ki sequence
 * counting me na gine — digit suffix hota toh random numbers real sequence ko corrupt karte.
 */
export function generateInvoiceNumber(dateStr: string, paymentType = 'cash'): string {
  if (!dateStr) {
    return '';
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return '';
  }
  const yy = String(date.getFullYear()).slice(-2);
  const ts = Date.now().toString(36).slice(-5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${INVOICE_PREFIX}${invoicePaymentCode(paymentType)}${yy}-${ts}${rand}`;
}

/**
 * Fetch the next auto-generated invoice number.
 * Backend returns { invoiceNumber: 'SLCA26-001', financialYear: '2026-27' }.
 * Falls back to generateInvoiceNumber() if the endpoint fails.
 */
export async function fetchNextInvoiceNumber(
  dateStr: string,
  paymentType = 'cash',
): Promise<string> {
  if (!dateStr) {
    return '';
  }
  try {
    const params = new URLSearchParams({ date: dateStr, paymentType });
    const res = await apiRequest<{ invoiceNumber?: string }>(
      `/sales/invoices/next-number?${params}`,
    );
    const data = (res as { data?: { invoiceNumber?: string } })?.data ?? res;
    return data?.invoiceNumber || generateInvoiceNumber(dateStr, paymentType);
  } catch {
    return generateInvoiceNumber(dateStr, paymentType);
  }
}

// ═════════════════════════════════════════════════════════
// CUSTOMER COMBOBOX (shared by wizard + simple page)
// ═════════════════════════════════════════════════════════

export interface CustomerOption {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  address?: string;
  pin?: string;
  pan?: string;
  district?: string;
  contactPerson?: string;
}

interface CustomerComboboxProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  error?: string;
  onCustomerChange?: (customer: CustomerOption | null) => void;
}

const CUSTOMER_MIN_SEARCH = 1;

export function CustomerCombobox({
  value,
  onChange,
  error,
  onCustomerChange,
}: CustomerComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const comboId = useRef(`customer-combo-${Math.random().toString(36).slice(2)}`);

  // Persist the selected customer record so it shows even when not in current results
  const [selectedCustomerRecord, setSelectedCustomerRecord] = useState<CustomerOption | null>(null);

  // ── Quick-create new customer inline ──────────────────
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gstin: '',
    city: '',
  });
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const handleQuickCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Modal form is rendered via portal (QuickCreateModal → createPortal to
      // document.body), so it is NEVER nested inside a parent <form> — no risk
      // of natively submitting the outer invoice form on Save / Enter.
      e.stopPropagation();
      if (!quickForm.name.trim()) {
        return;
      }
      setQuickSubmitting(true);
      setQuickError(null);
      try {
        // Strip empty strings so the backend never receives blank optional
        // fields (e.g. email: '') which could trip strict DTO validation.
        const payload = Object.fromEntries(Object.entries(quickForm).filter(([, v]) => v !== ''));
        const result = await apiRequest<Record<string, unknown>>('/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const customer = ((result as { data?: CustomerOption } | null)?.data ??
          result) as CustomerOption | null;
        if (customer?.id) {
          onChange(customer.id, customer.name);
          setSelectedCustomerRecord({
            id: customer.id,
            name: customer.name,
            mobile: customer.mobile,
            email: customer.email,
            gstin: customer.gstin,
            city: customer.city,
          });
          // Insert + re-sort A→Z so the new customer lands in the right alphabetical spot
          setCustomers((prev) => {
            const next = [customer, ...prev.filter((c) => c.id !== customer.id)];
            next.sort((a, b) =>
              (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()),
            );
            return next;
          });
          setQuickForm({ name: '', mobile: '', email: '', gstin: '', city: '' });
          setQuickOpen(false);
        } else {
          setQuickError(
            'Customer created, but response was incomplete. Please refresh and select manually.',
          );
        }
      } catch (err) {
        setQuickError((err as Error).message || 'Failed to create customer');
      } finally {
        setQuickSubmitting(false);
      }
    },
    [quickForm, onChange],
  );

  // Update selectedCustomerRecord when value changes
  useEffect(() => {
    if (value) {
      const found = customers.find((c) => c.id === value);
      if (found) {
        setSelectedCustomerRecord(found);
      }
    } else {
      setSelectedCustomerRecord(null);
    }
  }, [value, customers]);

  // Notify parent whenever the selected customer record changes
  // (used by the simple invoice page for WhatsApp / Email buttons)
  useEffect(() => {
    onCustomerChange?.(selectedCustomerRecord);
  }, [selectedCustomerRecord, onCustomerChange]);

  // Fetch customers only when shouldFetch is true (dropdown opened or search triggered)
  useEffect(() => {
    if (!shouldFetch) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '50' });
        if (search.length >= CUSTOMER_MIN_SEARCH) {
          params.set('search', search);
        }
        const res = await apiRequest<{ data: CustomerOption[] }>(`/customers?${params}`);
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        // Alphabetical sort — naam A→Z (case-insensitive)
        list.sort((a, b) =>
          (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()),
        );
        setCustomers(list);
        setHighlightedIndex(-1);
      } catch {
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, shouldFetch]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setShouldFetch(true);
    // Focus input after state update
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
    // Keep shouldFetch true so results persist while closed (avoid flash)
  }, []);

  const handleSelect = useCallback(
    (customer: CustomerOption) => {
      onChange(customer.id, customer.name);
      setSelectedCustomerRecord(customer);
      setSearch('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < customers.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : customers.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && customers[highlightedIndex]) {
            handleSelect(customers[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'Tab':
          // Close on tab away
          handleClose();
          break;
      }
    },
    [isOpen, customers, highlightedIndex, handleSelect, handleOpen, handleClose],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Determine display name — fall back to selectedCustomerRecord if not in current results
  const displayName = useMemo(() => {
    if (!value) {
      return null;
    }
    const fromCurrent = customers.find((c) => c.id === value);
    return fromCurrent?.name ?? selectedCustomerRecord?.name ?? null;
  }, [value, customers, selectedCustomerRecord]);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={comboId.current}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        Customer <span className="ml-0.5 text-red-500">*</span>
      </label>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          {/* Trigger / Input */}
          <div
            className={cn(
              'flex h-[42px] w-full cursor-pointer items-center rounded-xl border bg-white px-3.5 text-sm transition-all duration-150',
              'dark:border-slate-600 dark:bg-slate-800',
              error ? 'border-red-400 dark:border-red-500' : 'border-slate-200',
              isOpen &&
                'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:ring-emerald-400/20',
            )}
            onClick={handleOpen}
          >
            {isOpen ? (
              <input
                ref={inputRef}
                id={comboId.current}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(handleClose, 200)}
                placeholder={displayName ?? 'Search customer...'}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                autoComplete="off"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-controls={`${comboId.current}-list`}
                aria-activedescendant={
                  highlightedIndex >= 0
                    ? `${comboId.current}-option-${highlightedIndex}`
                    : undefined
                }
                role="combobox"
              />
            ) : (
              <span
                className={cn(
                  'flex-1 truncate',
                  displayName
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 dark:text-slate-500',
                )}
              >
                {displayName ?? 'Search customer...'}
              </span>
            )}
            <span className="ml-2 shrink-0 text-slate-400">
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="Loading customers"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div
              id={`${comboId.current}-list`}
              ref={listRef}
              role="listbox"
              aria-label="Customer list"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-black/5 dark:border-slate-600 dark:bg-slate-800"
            >
              {loading && customers.length === 0 && (
                <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-400">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Loading customers...
                </div>
              )}
              {!loading && customers.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-slate-400">
                  <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <span>No customers found</span>
                </div>
              )}
              {customers.map((customer, index) => {
                const isSelected = customer.id === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={customer.id}
                    id={`${comboId.current}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                      isHighlighted
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700',
                      isSelected && 'bg-emerald-50 dark:bg-emerald-900/20',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(customer);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {/* Sirf naam — list chhoti rahe; select ke baad baaki details dikhna theek hai */}
                    <span className="min-w-0 flex-1 truncate font-medium">{customer.name}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick-create button — add a new customer inline */}
        <button
          type="button"
          onClick={() => {
            setQuickError(null);
            setQuickOpen(true);
            setQuickForm({ name: '', mobile: '', email: '', gstin: '', city: '' });
          }}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-150 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 active:scale-[0.96] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
          title="Add new customer"
          aria-label="Add new customer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Quick-create customer modal */}
      <QuickCreateModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Add New Customer"
        size="sm"
      >
        {/* noValidate + portal (QuickCreateModal renders via createPortal to
            document.body) so this form can NEVER natively submit the outer
            invoice form — which previously caused a page reload → logout. */}
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
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setQuickOpen(false);
                setQuickForm({ name: '', mobile: '', email: '', gstin: '', city: '' });
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={quickSubmitting}>
              {quickSubmitting ? 'Saving...' : 'Save & Select'}
            </Button>
          </div>
        </form>
      </QuickCreateModal>

      {error && (
        <p id={`${comboId.current}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
