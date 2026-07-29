import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Check, ChevronDown, ChevronRight, X, UserCheck } from 'lucide-react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { apiRequest } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { CustomerSelectionScreen, type CustomerRecord } from './customer-selection-screen';
import { ProductSelectionScreen, type InvoiceLineItem } from './product-selection-screen';
import { DiscountEngineScreen } from './discount-engine-screen';
import { TaxPaymentEngineScreen } from './tax-payment-engine-screen';
import { InvoicePostingEngineScreen } from './invoice-posting-engine-screen';
import { InvoiceDocumentEngineScreen } from './invoice-document-engine-screen';
import { InvoicePostingStep8Screen } from './invoice-posting-step8-screen';
import { buildInvoicePayload, createSalesInvoice } from '@/services/sales.service';

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

const INVOICE_PREFIX = 'INV'; // Configurable — read from settings later

const INDIAN_STATES = [
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

const PAYMENT_TERMS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Credit', value: 'credit' },
  { label: '7 Days', value: '7_days' },
  { label: '15 Days', value: '15_days' },
  { label: '30 Days', value: '30_days' },
  { label: '45 Days', value: '45_days' },
  { label: 'Custom', value: 'custom' },
] as const satisfies readonly { label: string; value: string }[];

// ═════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═════════════════════════════════════════════════════════

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceDate: z
    .string()
    .min(1, 'Invoice date is required')
    .refine((val) => {
      const d = new Date(val);
      return !isNaN(d.getTime());
    }, 'Invalid invoice date'),
  financialYear: z.string().min(1),
  customerId: z.string().min(1, 'Customer is required'),
  customerName: z.string().optional(),
  placeOfSupply: z.string().min(1, 'Place of supply is required'),
  salesOrderId: z.string().optional(),
  billingAddress: z.string().optional(),
  paymentTerms: z.string().min(1, 'Payment terms is required'),
  dueDate: z.string().optional(),
  salesPerson: z.string().optional(),
  notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

const DAYS_MAP: Record<string, number> = {
  cash: 0,
  credit: 30,
  '7_days': 7,
  '15_days': 15,
  '30_days': 30,
  '45_days': 45,
  custom: 0,
};

function computeFinancialYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function computeDueDate(dateStr: string, paymentTerm: string): string {
  if (!dateStr || !paymentTerm) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const days = paymentTerm in DAYS_MAP ? DAYS_MAP[paymentTerm] : 30;
  if (days === 0) return dateStr;
  const due = new Date(date);
  due.setDate(due.getDate() + days);
  return due.toISOString().split('T')[0];
}

/** Generate unique invoice number with timestamp suffix to prevent duplicates. */
function generateInvoiceNumber(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  // Use timestamp + random for uniqueness (no module-level counter)
  const ts = Date.now().toString(36).slice(-5).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${INVOICE_PREFIX}-${year}-${ts}${rand}`;
}

const CUSTOMER_MIN_SEARCH = 1;

// ═════════════════════════════════════════════════════════
// CUSTOMER COMBOBOX
// ═════════════════════════════════════════════════════════

interface CustomerOption {
  id: string;
  name: string;
  gstin?: string;
  city?: string;
}

interface CustomerComboboxProps {
  value: string;
  onChange: (id: string, name?: string) => void;
  error?: string;
}

function CustomerCombobox({ value, onChange, error }: CustomerComboboxProps) {
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

  // Fetch customers only when shouldFetch is true (dropdown opened or search triggered)
  useEffect(() => {
    if (!shouldFetch) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '50' });
        if (search.length >= CUSTOMER_MIN_SEARCH) {
          params.set('search', search);
        }
        const res = await apiRequest<{ data: CustomerOption[] }>(`/customers?${params}`);
        const list = Array.isArray(res) ? res : res?.data ?? [];
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
          setHighlightedIndex((prev) =>
            prev < customers.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : customers.length - 1,
          );
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
    if (!value) return null;
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
      <div className="relative">
        {/* Trigger / Input */}
        <div
          className={cn(
            'flex h-[42px] w-full cursor-pointer items-center rounded-xl border bg-white px-3.5 text-sm transition-all duration-150',
            'dark:bg-slate-800 dark:border-slate-600',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-200',
            isOpen && 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:ring-emerald-400/20',
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
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Loading customers">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{customer.name}</p>
                    {(customer.gstin || customer.city) && (
                      <p className="truncate text-xs text-slate-400">
                        {[customer.gstin, customer.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && (
        <p id={`${comboId.current}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CREATE SALES INVOICE PAGE
// ═════════════════════════════════════════════════════════

export function CreateSalesInvoicePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      financialYear: computeFinancialYear(new Date().toISOString().split('T')[0]),
      customerId: '',
      customerName: '',
      placeOfSupply: '',
      salesOrderId: '',
      billingAddress: '',
      paymentTerms: '',
      dueDate: '',
      salesPerson: '',
      notes: '',
    },
  });

  const invoiceDate = watch('invoiceDate');
  const paymentTerms = watch('paymentTerms');

  // Auto-compute financial year, due date, and invoice number
  useEffect(() => {
    if (invoiceDate) {
      const parsed = new Date(invoiceDate);
      if (!isNaN(parsed.getTime())) {
        setValue('financialYear', computeFinancialYear(invoiceDate));
        const invNum = generateInvoiceNumber(invoiceDate);
        setValue('invoiceNumber', invNum);
      }
    }
  }, [invoiceDate, setValue]);

  // Auto-compute due date only for non-custom payment terms
  useEffect(() => {
    if (invoiceDate && paymentTerms && paymentTerms !== 'custom') {
      setValue('dueDate', computeDueDate(invoiceDate, paymentTerms));
    }
  }, [invoiceDate, paymentTerms, setValue]);

  const handleCancel = useCallback(() => {
    navigate('/sales/invoices');
  }, [navigate]);

  // Focus first field with validation error
  const onError = useCallback(
    (formErrors: Record<string, { message?: string }>) => {
      const firstErrorField = Object.keys(formErrors)[0] as keyof InvoiceFormData;
      if (firstErrorField) {
        try {
          setFocus(firstErrorField);
        } catch {
          // Some custom components may not support setFocus
        }
      }
    },
    [setFocus],
  );

  // Step 1: Validate and proceed to next step
  const onHeaderValidated = useCallback(() => {
    const customerId = getValues('customerId');
    setStep(customerId ? 3 : 2);
  }, [getValues]);

  // Step 2: Customer selected → proceed to Step 3
  const handleCustomerSelected = useCallback(
    (customer: CustomerRecord) => {
      setValue('customerId', customer.id);
      setValue('customerName', customer.name);
      if (customer.city) setValue('placeOfSupply', customer.state || '');
      if (customer.address) setValue('billingAddress', customer.address);
      setStep(3);
    },
    [setValue],
  );

  // Max date: 1 year from today
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // ── Step 2: Customer Selection Screen ──────────────
  if (step === 2) {
    return (
      <CustomerSelectionScreen
        onSelect={handleCustomerSelected}
        onCancel={() => setStep(1)}
      />
    );
  }

  // ── Invoice items state (passed between steps) ──
  const [invoiceItems, setInvoiceItems] = useState<InvoiceLineItem[]>([]);
  const [grossTotal, setGrossTotal] = useState(0);

  // ── Step 3: Product Selection Screen ───────────────
  if (step === 3) {
    return (
      <ProductSelectionScreen
        onComplete={(items) => {
          // Calculate gross total from items
          const gross = items.reduce((s, i) => s + i.quantity * i.rate, 0);
          setInvoiceItems(items);
          setGrossTotal(gross);
          setStep(4);
        }}
        onBack={() => setStep(2)}
      />
    );
  }

  // ── Discount state passed to Step 5 ──────────────
  const [itemDiscountTotal, setItemDiscountTotal] = useState(0);
  const [taxableAfterDiscount, setTaxableAfterDiscount] = useState(0);

  // ── Step 4: Discount Engine Screen ────────────────
  if (step === 4) {
    return (
      <DiscountEngineScreen
        items={invoiceItems}
        customerName={getValues('customerName') || ''}
        invoiceNumber={getValues('invoiceNumber') || ''}
        grossTotal={grossTotal}
        onItemsChange={setInvoiceItems}
        onComplete={(finalItems, discountState) => {
          // Calculate post-discount values
          const itemsDiscount = finalItems.reduce((s, i) => s + (i.quantity * i.rate - i.taxableAmount), 0);
          const gstTotal = finalItems.reduce((s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount + i.cessAmount, 0);
          const netAfterItems = finalItems.reduce((s, i) => s + i.amount, 0);
          // Apply invoice-level discount
          let invoiceDisc = 0;
          if (discountState.invoiceDiscountMode === 'percentage') {
            invoiceDisc = netAfterItems * (discountState.invoiceDiscountPercent / 100);
          } else if (discountState.invoiceDiscountMode === 'flat') {
            invoiceDisc = discountState.invoiceDiscountFlat;
          } else if (discountState.invoiceDiscountMode === 'custom') {
            invoiceDisc = discountState.invoiceCustomAmount;
          }
          const taxableLessDiscount = (netAfterItems - gstTotal) - invoiceDisc;
          setInvoiceItems(finalItems);
          setItemDiscountTotal(itemsDiscount + invoiceDisc);
          setTaxableAfterDiscount(Math.max(0, taxableLessDiscount));
          setStep(5);
        }}
        onBack={() => setStep(3)}
      />
    );
  }

  // ── Step 5 tax/payment state ─────────────────────
  const [step5Data, setStep5Data] = useState<{
    gstCategory: string;
    cessType: string;
    cessValue: number;
    gstin: string;
    paymentSplits: { method: string; amount: number; refNo: string; bankName: string }[];
  } | null>(null);

  // ── Step 5: Tax & Payment Engine Screen ───────────
  if (step === 5) {
    return (
      <TaxPaymentEngineScreen
        items={invoiceItems}
        customerName={getValues('customerName') || ''}
        invoiceNumber={getValues('invoiceNumber') || ''}
        customerState={getValues('placeOfSupply') || ''}
        companyState="MH"
        grossTotal={grossTotal}
        itemDiscountTotal={itemDiscountTotal}
        taxableAfterDiscount={taxableAfterDiscount}
        onComplete={(data) => {
          setStep5Data(data);
          setStep(6);
        }}
        onBack={() => setStep(4)}
      />
    );
  }

  // ── Step 6: Invoice Posting Engine Screen ─────────
  if (step === 6) {
    const customerState = getValues('placeOfSupply') || '';
    const companyState = 'MH';
    const isInterState = customerState !== companyState && customerState !== '';

    // Compute GST totals from items
    const cgstTotal = invoiceItems.reduce((s, i) => s + i.cgstAmount, 0);
    const sgstTotal = invoiceItems.reduce((s, i) => s + i.sgstAmount, 0);
    const igstTotal = invoiceItems.reduce((s, i) => s + i.igstAmount, 0);
    const cessTotal = invoiceItems.reduce((s, i) => s + i.cessAmount, 0);
    const roundOff = 0;
    const grandTotal = taxableAfterDiscount + cgstTotal + sgstTotal + igstTotal + cessTotal + roundOff;
    const roundedGrandTotal = Math.round(grandTotal);

    const handleSaveToBackend = useCallback(async (
      _payload: any,
      action: 'draft' | 'post',
    ) => {
      const invoicePayload = buildInvoicePayload({
        invoiceNumber: getValues('invoiceNumber') || '',
        invoiceDate: getValues('invoiceDate') || '',
        financialYear: getValues('financialYear') || '',
        customerId: getValues('customerId') || '',
        placeOfSupply: customerState,
        billingAddress: getValues('billingAddress') || '',
        salesPerson: getValues('salesPerson') || '',
        notes: getValues('notes') || '',
        paymentTerms: getValues('paymentTerms') || '',
        dueDate: getValues('dueDate') || '',
        items: invoiceItems,
        grossTotal,
        itemDiscountTotal,
        taxableAfterDiscount,
        gstCategory: step5Data?.gstCategory ?? 'intrastate',
        cessType: step5Data?.cessType ?? 'percentage',
        cessValue: step5Data?.cessValue ?? 0,
        customerGstin: step5Data?.gstin ?? '',
        paymentSplits: step5Data?.paymentSplits ?? [],
        cgstTotal,
        sgstTotal,
        igstTotal,
        cessTotal,
        roundOff: roundedGrandTotal - grandTotal,
        grandTotal: roundedGrandTotal,
        isInterState,
      });

      // Add status
      const payloadWithStatus = {
        ...invoicePayload,
        status: action === 'post' ? 'posted' : 'draft',
      };

      await createSalesInvoice(payloadWithStatus);
    }, [getValues, customerState, invoiceItems, grossTotal, itemDiscountTotal,
        taxableAfterDiscount, step5Data, cgstTotal, sgstTotal, igstTotal,
        cessTotal, grandTotal, roundedGrandTotal, isInterState]);

    return (
      <InvoicePostingEngineScreen
        customerName={getValues('customerName') || ''}
        invoiceNumber={getValues('invoiceNumber') || ''}
        invoiceDate={getValues('invoiceDate') || ''}
        financialYear={getValues('financialYear') || ''}
        customerId={getValues('customerId') || ''}
        placeOfSupply={customerState}
        billingAddress={getValues('billingAddress') || ''}
        salesPerson={getValues('salesPerson') || ''}
        notes={getValues('notes') || ''}
        paymentTerms={getValues('paymentTerms') || ''}
        dueDate={getValues('dueDate') || ''}
        items={invoiceItems}
        grossTotal={grossTotal}
        itemDiscountTotal={itemDiscountTotal}
        taxableAfterDiscount={taxableAfterDiscount}
        gstCategory={step5Data?.gstCategory ?? 'intrastate'}
        cessType={step5Data?.cessType ?? 'percentage'}
        cessValue={step5Data?.cessValue ?? 0}
        customerGstin={step5Data?.gstin ?? ''}
        paymentSplits={step5Data?.paymentSplits ?? []}
        companyState={companyState}
        isInterState={isInterState}
        onBack={() => setStep(5)}
        onComplete={(_payload) => {
          setStep(7);
        }}
        onSaveToBackend={handleSaveToBackend}
      />
    );
  }

  // ── Step 7: Document & Communication Engine ────────
  if (step === 7) {
    // Recompute values from Step 6's data
    const customerState = getValues('placeOfSupply') || '';
    const isInterState = customerState !== 'MH' && customerState !== '';
    const cgstTotal = invoiceItems.reduce((s, i) => s + i.cgstAmount, 0);
    const sgstTotal = invoiceItems.reduce((s, i) => s + i.sgstAmount, 0);
    const igstTotal = invoiceItems.reduce((s, i) => s + i.igstAmount, 0);
    const cessTotal = invoiceItems.reduce((s, i) => s + i.cessAmount, 0);
    const rawGrandTotal = taxableAfterDiscount + cgstTotal + sgstTotal + igstTotal + cessTotal;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOffVal = roundedGrandTotal - rawGrandTotal;
    const totalPaid = (step5Data?.paymentSplits ?? []).reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, roundedGrandTotal - totalPaid);

    return (
      <InvoiceDocumentEngineScreen
        customerName={getValues('customerName') || ''}
        invoiceNumber={getValues('invoiceNumber') || ''}
        invoiceDate={getValues('invoiceDate') || ''}
        dueDate={getValues('dueDate') || ''}
        placeOfSupply={customerState}
        billingAddress={getValues('billingAddress') || ''}
        salesPerson={getValues('salesPerson') || ''}
        notes={getValues('notes') || ''}
        paymentTerms={getValues('paymentTerms') || ''}
        items={invoiceItems}
        grossTotal={grossTotal}
        itemDiscountTotal={itemDiscountTotal}
        taxableAfterDiscount={taxableAfterDiscount}
        cgstTotal={cgstTotal}
        sgstTotal={sgstTotal}
        igstTotal={igstTotal}
        cessTotal={cessTotal}
        roundOff={roundOffVal}
        grandTotal={roundedGrandTotal}
        totalPaid={totalPaid}
        balance={balance}
        customerGstin={step5Data?.gstin ?? ''}
        paymentSplits={step5Data?.paymentSplits ?? []}
        isInterState={isInterState}
        onBack={() => setStep(6)}
        onComplete={() => {
          // Navigate to Step 8 after document actions
          setStep(8);
        }}
      />
    );
  }

  // ── Step 8: Accounting + Inventory + Ledger Posting ─
  if (step === 8) {
    const customerState = getValues('placeOfSupply') || '';
    const isInterState = customerState !== 'MH' && customerState !== '';
    const cgstTotal = invoiceItems.reduce((s, i) => s + i.cgstAmount, 0);
    const sgstTotal = invoiceItems.reduce((s, i) => s + i.sgstAmount, 0);
    const igstTotal = invoiceItems.reduce((s, i) => s + i.igstAmount, 0);
    const cessTotal = invoiceItems.reduce((s, i) => s + i.cessAmount, 0);
    const rawGrandTotal = taxableAfterDiscount + cgstTotal + sgstTotal + igstTotal + cessTotal;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOffVal = roundedGrandTotal - rawGrandTotal;
    const totalPaid = (step5Data?.paymentSplits ?? []).reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, roundedGrandTotal - totalPaid);

    return (
      <InvoicePostingStep8Screen
        invoiceNumber={getValues('invoiceNumber') || ''}
        invoiceDate={getValues('invoiceDate') || ''}
        customerName={getValues('customerName') || ''}
        customerId={getValues('customerId') || ''}
        placeOfSupply={customerState}
        items={invoiceItems}
        grossTotal={grossTotal}
        itemDiscountTotal={itemDiscountTotal}
        taxableAfterDiscount={taxableAfterDiscount}
        cgstTotal={cgstTotal}
        sgstTotal={sgstTotal}
        igstTotal={igstTotal}
        cessTotal={cessTotal}
        roundOff={roundOffVal}
        grandTotal={roundedGrandTotal}
        totalPaid={totalPaid}
        balance={balance}
        customerGstin={step5Data?.gstin ?? ''}
        gstCategory={step5Data?.gstCategory ?? 'intrastate'}
        isInterState={isInterState}
        paymentSplits={step5Data?.paymentSplits ?? []}
        onBack={() => setStep(7)}
        onComplete={() => navigate('/sales/invoices')}
      />
    );
  }

  // ── Step 1: Invoice Header Form ────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', path: '/' },
          { label: 'Sales Invoices', path: '/sales/invoices' },
          { label: 'Create Invoice' },
        ]}
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
          1
        </div>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Invoice Details
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
          2
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          Customer Selection
        </span>
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
          3
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          Products & Items
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Go back to sales invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Create Sales Invoice
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter invoice header details — items will be added in the next step
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="secondary" onClick={handleCancel} icon={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="invoice-form"
            icon={<UserCheck className="h-4 w-4" />}
          >
            {watch('customerId') ? 'Next — Products & Items' : 'Next — Select Customer'}
          </Button>
        </div>
      </div>

      {/* Selected Customer Banner */}
      {watch('customerId') && watch('customerName') && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-900/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800">
            <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {watch('customerName')}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Customer selected — change by clicking Next
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setValue('customerId', '');
              setValue('customerName', '');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800"
            aria-label="Remove customer selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form */}
      <form
        id="invoice-form"
        onSubmit={handleSubmit(onHeaderValidated, onError)}
        className="grid gap-6 md:gap-8 md:grid-cols-2"
        noValidate
      >
        {/* Left Column — Invoice Details */}
        <div className="space-y-6 md:space-y-8">
          <FormCard title="Invoice Details" description="Auto-generated and computed fields">
            <div className="space-y-4">
              {/* Invoice Number — auto-generated, read-only */}
              <FormInput
                label="Invoice Number"
                value={watch('invoiceNumber')}
                readOnly
                disabled
                hint={`Auto-generated — ${INVOICE_PREFIX}-YYYY-NNNNN`}
              />

              {/* Invoice Date */}
              <FormInput
                label="Invoice Date"
                type="date"
                required
                max={maxDate}
                error={errors.invoiceDate?.message}
                {...register('invoiceDate')}
              />

              {/* Financial Year — auto-computed */}
              <FormInput
                label="Financial Year"
                value={watch('financialYear')}
                readOnly
                disabled
                hint="Auto-computed from invoice date (Apr-Mar)"
              />

              {/* Payment Terms */}
              <FormSelect
                label="Payment Terms"
                required
                placeholder="Select payment terms"
                options={[...PAYMENT_TERMS]}
                error={errors.paymentTerms?.message}
                {...register('paymentTerms')}
              />

              {/* Due Date */}
              <FormInput
                label="Due Date"
                type="date"
                disabled={paymentTerms !== 'custom'}
                hint={
                  paymentTerms === 'custom'
                    ? 'Manually set due date'
                    : 'Auto-computed from payment terms'
                }
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />
            </div>
          </FormCard>

          <FormCard title="Additional Info">
            <div className="space-y-4">
              {/* Sales Order */}
              <FormInput
                label="Sales Order"
                placeholder="Select sales order (optional)"
                hint="Link to an existing sales order"
                error={errors.salesOrderId?.message}
                {...register('salesOrderId')}
              />

              {/* Sales Person */}
              <FormInput
                label="Sales Person"
                placeholder="Enter sales person name"
                hint="Person responsible for this sale"
                error={errors.salesPerson?.message}
                {...register('salesPerson')}
              />
            </div>
          </FormCard>
        </div>

        {/* Right Column — Customer & Place of Supply */}
        <div className="space-y-6 md:space-y-8">
          <FormCard title="Customer Details">
            <div className="space-y-4">
              {/* Customer - Searchable Combobox */}
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerCombobox
                    value={field.value}
                    onChange={(id, name) => {
                      field.onChange(id);
                      if (name) setValue('customerName', name);
                    }}
                    error={errors.customerId?.message}
                  />
                )}
              />

              {/* Place of Supply */}
              <FormSelect
                label="Place of Supply"
                required
                placeholder="Select state"
                options={[...INDIAN_STATES]}
                error={errors.placeOfSupply?.message}
                {...register('placeOfSupply')}
              />

              {/* Billing Address */}
              <FormTextarea
                label="Billing Address"
                placeholder="Enter billing address"
                rows={3}
                error={errors.billingAddress?.message}
                {...register('billingAddress')}
              />
            </div>
          </FormCard>

          <FormCard title="Notes">
            <div className="space-y-4">
              <FormTextarea
                label="Notes"
                placeholder="Additional notes or remarks..."
                rows={4}
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>
          </FormCard>
        </div>
      </form>
    </div>
  );
}
