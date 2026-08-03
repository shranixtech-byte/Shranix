import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Building2, ChevronRight, X, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { FormCard } from '@/components/ui/FormCard';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { buildInvoicePayload, createSalesInvoice } from '@/services/sales.service';

import { CustomerSelectionScreen, type CustomerRecord } from './customer-selection-screen';
import { DiscountEngineScreen } from './discount-engine-screen';
import {
  CustomerCombobox,
  INDIAN_STATES,
  PAYMENT_TERMS,
  computeDueDate,
  computeFinancialYear,
  fetchNextInvoiceNumber,
} from './invoice-common';
import { InvoiceDocumentEngineScreen } from './invoice-document-engine-screen';
import { InvoicePostingEngineScreen } from './invoice-posting-engine-screen';
import { InvoicePostingStep8Screen } from './invoice-posting-step8-screen';
import { ProductSelectionScreen, type InvoiceLineItem } from './product-selection-screen';
import { TaxPaymentEngineScreen } from './tax-payment-engine-screen';

// Re-export shared combobox + types for backwards compatibility
// (keeps any existing `import { CustomerCombobox } from './create-invoice-page'` working)
export { CustomerCombobox, type CustomerOption } from './invoice-common';

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
  // Number backend se aata hai: cash → SLCA26-001, credit (7/15/30/45 days, custom) → SLCR26-001
  useEffect(() => {
    if (!invoiceDate) {
      return;
    }
    const parsed = new Date(invoiceDate);
    if (isNaN(parsed.getTime())) {
      return;
    }
    setValue('financialYear', computeFinancialYear(invoiceDate));
    let cancelled = false;
    const ptype = !paymentTerms || paymentTerms === 'cash' ? 'cash' : 'credit';
    fetchNextInvoiceNumber(invoiceDate, ptype).then((num) => {
      if (!cancelled) {
        setValue('invoiceNumber', num);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [invoiceDate, paymentTerms, setValue]);

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
      if (customer.city) {
        setValue('placeOfSupply', customer.state || '');
      }
      if (customer.address) {
        setValue('billingAddress', customer.address);
      }
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
      <CustomerSelectionScreen onSelect={handleCustomerSelected} onCancel={() => setStep(1)} />
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
          const itemsDiscount = finalItems.reduce(
            (s, i) => s + (i.quantity * i.rate - i.taxableAmount),
            0,
          );
          const gstTotal = finalItems.reduce(
            (s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount + i.cessAmount,
            0,
          );
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
          const taxableLessDiscount = netAfterItems - gstTotal - invoiceDisc;
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
    const grandTotal =
      taxableAfterDiscount + cgstTotal + sgstTotal + igstTotal + cessTotal + roundOff;
    const roundedGrandTotal = Math.round(grandTotal);

    const handleSaveToBackend = useCallback(
      async (_payload: any, action: 'draft' | 'post') => {
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
      },
      [
        getValues,
        customerState,
        invoiceItems,
        grossTotal,
        itemDiscountTotal,
        taxableAfterDiscount,
        step5Data,
        cgstTotal,
        sgstTotal,
        igstTotal,
        cessTotal,
        grandTotal,
        roundedGrandTotal,
        isInterState,
      ],
    );

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
    <div className="animate-in fade-in space-y-6 duration-300">
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
        <span className="text-sm text-slate-400 dark:text-slate-500">Customer Selection</span>
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
          3
        </div>
        <span className="text-sm text-slate-400 dark:text-slate-500">Products & Items</span>
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
        <div className="flex shrink-0 items-center gap-3">
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
        className="grid gap-6 md:grid-cols-2 md:gap-8"
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
                hint="Auto-generated — SLCA26-001 (cash) / SLCR26-001 (credit)"
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
                      if (name) {
                        setValue('customerName', name);
                      }
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
