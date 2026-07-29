import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CreditCard,
  FileText,
  Globe,
  Info,
  Landmark,
  Percent,
  Phone,
  QrCode,
  ScrollText,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

type GstCategory =
  | 'intrastate' | 'interstate' | 'zero_rated' | 'exempt'
  | 'nil_rated' | 'export' | 'reverse_charge' | 'composition' | 'agriculture';

type PaymentMethod =
  | 'cash' | 'upi' | 'cheque' | 'bank_transfer' | 'credit'
  | 'card' | 'wallet' | 'neft' | 'rtgs' | 'imps';

type CessType = 'percentage' | 'flat' | 'per_unit';

interface PaymentSplit {
  id: string;
  method: PaymentMethod;
  amount: number;
  refNo: string;
  bankName: string;
  transactionDate: string;
  chequeNumber: string;
  chequeDate: string;
  branch: string;
  upiRef: string;
  upiApp: string;
  creditDays: number;
  dueDate: string;
  outstanding: number;
  creditLimit: number;
  cardType: string;
}

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

const GST_CATEGORIES: { label: string; value: GstCategory; description: string }[] = [
  { label: 'Intrastate', value: 'intrastate', description: 'CGST + SGST (same state)' },
  { label: 'Interstate', value: 'interstate', description: 'IGST (different state)' },
  { label: 'Zero Rated', value: 'zero_rated', description: '0% GST, input credit available' },
  { label: 'Exempt', value: 'exempt', description: 'No GST, no input credit' },
  { label: 'Nil Rated', value: 'nil_rated', description: 'Nil rated supplies' },
  { label: 'Export', value: 'export', description: 'Export with LUT/bond' },
  { label: 'Reverse Charge', value: 'reverse_charge', description: 'RCM applicable' },
  { label: 'Composition', value: 'composition', description: 'Composition dealer rules' },
  { label: 'Agriculture', value: 'agriculture', description: 'Agricultural exemption' },
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: typeof Banknote }[] = [
  { label: 'Cash', value: 'cash', icon: Banknote },
  { label: 'UPI', value: 'upi', icon: QrCode },
  { label: 'Cheque', value: 'cheque', icon: FileText },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: Landmark },
  { label: 'Credit', value: 'credit', icon: Building2 },
  { label: 'Card', value: 'card', icon: CreditCard },
  { label: 'Wallet', value: 'wallet', icon: Wallet },
  { label: 'NEFT', value: 'neft', icon: Smartphone },
  { label: 'RTGS', value: 'rtgs', icon: Globe },
  { label: 'IMPS', value: 'imps', icon: Phone },
];

const CESS_TYPES: { label: string; value: CessType }[] = [
  { label: '% Percentage', value: 'percentage' },
  { label: '₹ Flat', value: 'flat' },
  { label: 'Per Unit', value: 'per_unit' },
];

const INPUT_CLS = 'h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const INPUT_CLS_R = 'h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function validateGSTIN(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
}

function getStateCode(gstin: string): string {
  return gstin.length >= 2 ? gstin.substring(0, 2) : '';
}

const STATE_CODE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar', '27': 'Maharashtra',
  '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
  '37': 'Andhra Pradesh (new)', '38': 'Ladakh',
};

function createPaymentSplit(method: PaymentMethod, amount: number): PaymentSplit {
  return {
    id: crypto.randomUUID(),
    method, amount,
    refNo: '', bankName: '', transactionDate: '',
    chequeNumber: '', chequeDate: '', branch: '',
    upiRef: '', upiApp: '',
    creditDays: 30, dueDate: '', outstanding: 0, creditLimit: 0, cardType: '',
  };
}

// ═════════════════════════════════════════════════════════
// INVOICE SUMMARY CARD
// ═════════════════════════════════════════════════════════

interface InvoiceSummaryCardProps {
  customerName: string; invoiceNumber: string; itemCount: number;
  grossAmount: number; discount: number; taxableAmount: number; grandTotal: number;
}

const InvoiceSummaryCard = memo(function InvoiceSummaryCard(props: InvoiceSummaryCardProps) {
  const { customerName, invoiceNumber, itemCount, grossAmount, discount, taxableAmount, grandTotal } = props;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <InfoCell label="Customer" value={customerName || '—'} />
          <InfoCell label="Invoice" value={invoiceNumber || '—'} />
          <InfoCell label="Items" value={String(itemCount)} />
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <InfoCell label="Gross" value={formatINR(grossAmount)} />
          <InfoCell label="Discount" value={formatINR(discount)} className="text-red-600" />
          <InfoCell label="Taxable" value={formatINR(taxableAmount)} />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Grand Total</p>
            <p className="text-lg font-bold text-emerald-600">{formatINR(grandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

function InfoCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('text-sm font-medium text-slate-900 dark:text-slate-100', className)}>{value}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// GST ENGINE
// ═════════════════════════════════════════════════════════

interface GstEngineProps {
  gstCategory: GstCategory; cessType: CessType; cessValue: number;
  customerGstin: string; isInterState: boolean;
  onGstCategoryChange: (cat: GstCategory) => void;
  onCessTypeChange: (t: CessType) => void; onCessValueChange: (v: number) => void;
  onGstinChange: (v: string) => void;
}

const GstEngine = memo(function GstEngine({
  gstCategory, cessType, cessValue, customerGstin, isInterState,
  onGstCategoryChange, onCessTypeChange, onCessValueChange, onGstinChange,
}: GstEngineProps) {
  const gstinValid = useMemo(() => validateGSTIN(customerGstin), [customerGstin]);
  const stateCode = getStateCode(customerGstin);
  const stateName = STATE_CODE_MAP[stateCode] || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <Percent className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">GST & Tax Engine</h3>
          {isInterState ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Interstate · IGST</span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Intrastate · CGST+SGST</span>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {GST_CATEGORIES.map((cat) => (
              <button key={cat.value} type="button" onClick={() => onGstCategoryChange(cat.value)}
                className={cn('rounded-lg border px-2.5 py-2 text-left transition-all',
                  gstCategory === cat.value
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm dark:bg-emerald-900/20 dark:border-emerald-600'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500',
                )} title={cat.description}>
                <p className={cn('text-[11px] font-semibold', gstCategory === cat.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300')}>{cat.label}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Customer GSTIN</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input type="text" value={customerGstin} onChange={(e) => onGstinChange(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5" maxLength={15}
                  className={cn('h-10 w-full rounded-lg border bg-white px-3 text-sm font-mono outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
                    customerGstin && gstinValid && 'border-emerald-400 bg-emerald-50/30 dark:border-emerald-600',
                    customerGstin && !gstinValid && 'border-red-400 bg-red-50/30 dark:border-red-600',
                  )} aria-label="Customer GSTIN" />
              </div>
              {customerGstin && <span className={cn('text-xs font-medium', gstinValid ? 'text-emerald-600' : 'text-red-500')}>{gstinValid ? '✓ Valid' : '✗ Invalid'}</span>}
            </div>
            {customerGstin.length >= 2 && (
              <p className="text-[10px] text-slate-400 mt-1">State: {stateCode} - {stateName} {isInterState ? '(→ IGST)' : '(→ CGST+SGST)'}</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">CESS Configuration</p>
            <div className="flex items-center gap-3">
              <select value={cessType} onChange={(e) => onCessTypeChange(e.target.value as CessType)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                {CESS_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
              <div className="relative flex-1 max-w-[120px]">
                <input type="number" value={cessValue || ''} onChange={(e) => onCessValueChange(Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0} step={0.01}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-right text-xs outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" aria-label="CESS value" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{cessType === 'percentage' ? '%' : cessType === 'flat' ? '₹' : '₹/qty'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">GST Rules</p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              {isInterState ? <span>IGST: Full rate applicable</span> : <><span>CGST: Half rate</span><span>SGST: Half rate</span></>}
              {gstCategory === 'composition' && <span className="text-amber-600">Composition dealer — limited ITC</span>}
              {gstCategory === 'zero_rated' && <span className="text-blue-600">0% GST — Refund eligible</span>}
              {gstCategory === 'export' && <span className="text-purple-600">Export — LUT required</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// PAYMENT DETAILS FORM
// ═════════════════════════════════════════════════════════

interface PaymentDetailsFormProps {
  split: PaymentSplit;
  onUpdate: (id: string, field: keyof PaymentSplit, value: string | number) => void;
  onRemove: (id: string) => void;
}

const PaymentDetailsForm = memo(function PaymentDetailsForm({ split, onUpdate, onRemove }: PaymentDetailsFormProps) {
  const methodInfo = PAYMENT_METHODS.find(m => m.value === split.method);
  const Icon = methodInfo?.icon || Banknote;

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Icon className="h-3.5 w-3.5" />{methodInfo?.label || split.method}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{formatINR(split.amount)}</span>
          <button type="button" onClick={() => onRemove(split.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {split.method === 'cheque' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <FormField label="Cheque No"><input type="text" value={split.chequeNumber} onChange={(e) => onUpdate(split.id, 'chequeNumber', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Bank"><input type="text" value={split.bankName} onChange={(e) => onUpdate(split.id, 'bankName', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Cheque Date"><input type="date" value={split.chequeDate} onChange={(e) => onUpdate(split.id, 'chequeDate', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Branch"><input type="text" value={split.branch} onChange={(e) => onUpdate(split.id, 'branch', e.target.value)} className={INPUT_CLS} /></FormField>
        </div>
      )}

      {['bank_transfer', 'neft', 'rtgs', 'imps'].includes(split.method) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <FormField label="Transaction ID"><input type="text" value={split.refNo} onChange={(e) => onUpdate(split.id, 'refNo', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Bank Name"><input type="text" value={split.bankName} onChange={(e) => onUpdate(split.id, 'bankName', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Transfer Date"><input type="date" value={split.transactionDate} onChange={(e) => onUpdate(split.id, 'transactionDate', e.target.value)} className={INPUT_CLS} /></FormField>
        </div>
      )}

      {split.method === 'upi' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <FormField label="UPI Ref No"><input type="text" value={split.upiRef} onChange={(e) => onUpdate(split.id, 'upiRef', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="App"><input type="text" value={split.upiApp} onChange={(e) => onUpdate(split.id, 'upiApp', e.target.value)} placeholder="GPay / PhonePe" className={INPUT_CLS} /></FormField>
        </div>
      )}

      {split.method === 'credit' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <FormField label="Credit Days"><input type="number" value={split.creditDays || ''} onChange={(e) => onUpdate(split.id, 'creditDays', parseInt(e.target.value) || 0)} className={INPUT_CLS} /></FormField>
          <FormField label="Due Date"><input type="date" value={split.dueDate} onChange={(e) => onUpdate(split.id, 'dueDate', e.target.value)} className={INPUT_CLS} /></FormField>
          <FormField label="Outstanding"><input type="number" value={split.outstanding || ''} onChange={(e) => onUpdate(split.id, 'outstanding', parseFloat(e.target.value) || 0)} className={INPUT_CLS_R} /></FormField>
          <FormField label="Credit Limit"><input type="number" value={split.creditLimit || ''} onChange={(e) => onUpdate(split.id, 'creditLimit', parseFloat(e.target.value) || 0)} className={INPUT_CLS_R} /></FormField>
          {split.outstanding > split.creditLimit && split.creditLimit > 0 && (
            <div className="col-span-full flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 dark:bg-red-900/10 dark:text-red-400">
              <Info className="h-3 w-3" /> Credit limit exceeded by {formatINR(split.outstanding - split.creditLimit)}
            </div>
          )}
        </div>
      )}

      {split.method === 'card' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <FormField label="Card Type">
            <select value={split.cardType} onChange={(e) => onUpdate(split.id, 'cardType', e.target.value)} className={INPUT_CLS}>
              <option value="">Select...</option><option value="credit">Credit Card</option><option value="debit">Debit Card</option>
            </select>
          </FormField>
          <FormField label="Transaction ID"><input type="text" value={split.refNo} onChange={(e) => onUpdate(split.id, 'refNo', e.target.value)} className={INPUT_CLS} /></FormField>
        </div>
      )}
    </div>
  );
});

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400">{label}</label>
      {children}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PAYMENT ENGINE
// ═════════════════════════════════════════════════════════

interface PaymentEngineProps {
  splits: PaymentSplit[];
  grandTotal: number;
  onAddSplit: (method: PaymentMethod) => void;
  onUpdateSplit: (id: string, field: keyof PaymentSplit, value: string | number) => void;
  onRemoveSplit: (id: string) => void;
}

const PaymentEngine = memo(function PaymentEngine({
  splits, grandTotal, onAddSplit, onUpdateSplit, onRemoveSplit,
}: PaymentEngineProps) {
  const totalPaid = useMemo(() => splits.reduce((s, p) => s + p.amount, 0), [splits]);
  const remaining = Math.max(0, grandTotal - totalPaid);
  const overPayment = totalPaid > grandTotal;

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <Wallet className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment Engine</h3>
        <span className="ml-auto text-xs text-slate-400">{formatINR(totalPaid)} / {formatINR(grandTotal)}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-5 gap-1.5">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const isActive = splits.some(s => s.method === method.value);
            return (
              <button key={method.value} type="button" onClick={() => onAddSplit(method.value)} disabled={isActive}
                className={cn('flex flex-col items-center gap-1 rounded-lg border py-2 transition-all',
                  isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500',
                )}>
                <Icon className="h-4 w-4" /><span className="text-[9px] font-semibold">{method.label}</span>
              </button>
            );
          })}
        </div>

        {splits.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Wallet className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No payments added yet</p>
            <p className="text-xs text-slate-400">Select payment methods above</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {splits.map((split) => (
              <div key={split.id}>
                <div className="flex items-center gap-2">
                  <input type="number" value={split.amount || ''} onChange={(e) => onUpdateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                    min={0} step={0.01}
                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-sm font-medium outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <PaymentDetailsForm split={split} onUpdate={onUpdateSplit} onRemove={onRemoveSplit} />
              </div>
            ))}
          </div>
        )}

        <div className={cn('flex items-center justify-between rounded-lg px-3 py-2',
          remaining === 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
            : overPayment ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400')}>
          <span className="text-xs font-medium">
            {remaining === 0 ? '✓ Fully Paid' : overPayment ? `⚠ Over by ${formatINR(totalPaid - grandTotal)}` : 'Remaining'}
          </span>
          <span className="text-sm font-bold">{formatINR(Math.max(0, grandTotal - totalPaid))}</span>
        </div>
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═════════════════════════════════════════════════════════

interface FinalSummaryProps {
  grossTotal: number; itemDiscount: number; taxableAmount: number;
  cgst: number; sgst: number; igst: number; cess: number;
  roundOff: number; totalPaid: number; balance: number;
  grandTotal: number; isInterState: boolean;
}

const FinalSummary = memo(function FinalSummary({
  grossTotal, itemDiscount, taxableAmount, cgst, sgst, igst, cess,
  roundOff, totalPaid, balance, grandTotal, isInterState,
}: FinalSummaryProps) {
  return (
    <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 dark:border-slate-700">
        <ScrollText className="h-4 w-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Final Invoice Summary</h3>
        <span className={cn('ml-auto text-[10px] font-medium', isInterState ? 'text-purple-600' : 'text-blue-600')}>
          {isInterState ? 'IGST' : 'CGST+SGST'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 px-5 py-3">
        <Cell label="Gross" value={formatINR(grossTotal)} />
        <Cell label="Discount" value={formatINR(itemDiscount)} className="text-red-600" />
        <Cell label="Taxable" value={formatINR(taxableAmount)} />
        {isInterState ? (
          <Cell label="IGST" value={formatINR(igst)} className="text-purple-600" />
        ) : (
          <><Cell label="CGST" value={formatINR(cgst)} className="text-blue-600" /><Cell label="SGST" value={formatINR(sgst)} className="text-blue-600" /></>
        )}
        <Cell label="CESS" value={formatINR(cess)} className="text-orange-600" />
        <Cell label="R/Off" value={roundOff.toFixed(2)} className={roundOff < 0 ? 'text-red-500' : 'text-emerald-500'} />
        <Cell label="Paid" value={formatINR(totalPaid)} className="text-emerald-600" />
        <Cell label="Balance" value={formatINR(balance)} className={balance > 0 ? 'text-amber-600' : 'text-slate-600'} />
        <div className="flex items-center justify-end col-span-full lg:col-span-1">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Grand Total</p>
            <p className="text-2xl font-bold text-emerald-600">{formatINR(grandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', className)}>{value}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════

export interface TaxPaymentEngineScreenProps {
  items: InvoiceLineItem[];
  customerName: string;
  invoiceNumber: string;
  customerState: string;
  companyState: string;
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  onComplete: (data: {
    gstCategory: GstCategory;
    cessType: CessType;
    cessValue: number;
    paymentSplits: PaymentSplit[];
    gstin: string;
  }) => void;
  onBack: () => void;
}

export function TaxPaymentEngineScreen({
  items, customerName, invoiceNumber, customerState, companyState,
  grossTotal, itemDiscountTotal, taxableAfterDiscount,
  onComplete, onBack,
}: TaxPaymentEngineScreenProps) {
  const [gstCategory, setGstCategory] = useState<GstCategory>('intrastate');
  const [cessType, setCessType] = useState<CessType>('percentage');
  const [cessValue, setCessValue] = useState(0);
  const [customerGstin, setCustomerGstin] = useState('');
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [focusMode, setFocusMode] = useState<'left' | 'right'>('left');

  const isInterState = useMemo(() => {
    if (gstCategory === 'interstate' || gstCategory === 'export') return true;
    return customerState !== companyState && customerState !== '';
  }, [gstCategory, customerState, companyState]);

  const gstResult = useMemo(() => {
    const taxable = taxableAfterDiscount;
    const totalGstPct = items.reduce((s, i) => s + i.gstPercent, 0);
    const avgGstPct = items.length > 0 ? totalGstPct / items.length : 0;
    let effectiveGstPct = avgGstPct;
    if (['zero_rated', 'exempt', 'nil_rated'].includes(gstCategory)) effectiveGstPct = 0;

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = Math.round(taxable * (effectiveGstPct / 100) * 100) / 100;
    } else {
      const half = effectiveGstPct / 2;
      cgst = Math.round(taxable * (half / 100) * 100) / 100;
      sgst = Math.round(taxable * (half / 100) * 100) / 100;
    }

    let cess = 0;
    if (cessType === 'percentage') cess = Math.round(taxable * (cessValue / 100) * 100) / 100;
    else if (cessType === 'flat') cess = cessValue;
    else if (cessType === 'per_unit') {
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      cess = cessValue * totalQty;
    }

    const netAmount = taxable + cgst + sgst + igst + cess;
    const roundOff = Math.round(netAmount) - netAmount;
    const grandTotal = Math.round(netAmount);
    return { taxable, cgst, sgst, igst, cess, roundOff, grandTotal };
  }, [taxableAfterDiscount, items, gstCategory, isInterState, cessType, cessValue]);

  const totalPaid = useMemo(() => splits.reduce((s, p) => s + p.amount, 0), [splits]);
  const balance = Math.max(0, gstResult.grandTotal - totalPaid);
  const overPayment = totalPaid > gstResult.grandTotal;

  useEffect(() => {
    const errors: string[] = [];
    if (customerGstin && !validateGSTIN(customerGstin)) errors.push('Invalid GSTIN format');
    if (splits.length > 0 && totalPaid < gstResult.grandTotal * 0.99) errors.push(`Shortfall: ${formatINR(gstResult.grandTotal - totalPaid)} remaining`);
    if (overPayment) errors.push(`Overpayment by ${formatINR(totalPaid - gstResult.grandTotal)}`);
    if (gstCategory === 'reverse_charge') errors.push('Reverse charge — RCM accounting required');
    setValidationErrors(errors);
  }, [customerGstin, splits, totalPaid, gstResult.grandTotal, overPayment, gstCategory]);

  const handleAddSplit = useCallback((method: PaymentMethod) => {
    setSplits(prev => {
      if (prev.some(s => s.method === method)) return prev;
      const remaining = gstResult.grandTotal - prev.reduce((s, p) => s + p.amount, 0);
      return [...prev, createPaymentSplit(method, Math.max(0, remaining))];
    });
  }, [gstResult.grandTotal]);

  const handleUpdateSplit = useCallback((id: string, field: keyof PaymentSplit, value: string | number) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const handleRemoveSplit = useCallback((id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Tab': e.preventDefault(); setFocusMode(prev => prev === 'left' ? 'right' : 'left'); break;
      case 'ArrowDown': case 'ArrowUp': if (focusMode === 'right') e.preventDefault(); break;
      case 'Escape': e.preventDefault(); break;
      case 'Enter': if (e.ctrlKey) e.preventDefault(); break;
    }
  }, [focusMode]);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"><ArrowLeft className="h-4 w-4" /></button>
          <div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tax & Payment Engine</h2><p className="text-sm text-slate-500 dark:text-slate-400">Configure GST, taxes, and payment details</p></div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="px-6 pt-4">
        <InvoiceSummaryCard customerName={customerName} invoiceNumber={invoiceNumber} itemCount={items.length}
          grossAmount={grossTotal} discount={itemDiscountTotal} taxableAmount={taxableAfterDiscount} grandTotal={gstResult.grandTotal} />
      </div>

      {/* VALIDATION */}
      {validationErrors.length > 0 && (
        <div className="px-6 pt-3 space-y-1">
          {validationErrors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/10 dark:text-amber-400">
              <Info className="h-3.5 w-3.5 shrink-0" />{err}
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div tabIndex={0} onFocus={() => setFocusMode('left')} className={cn('rounded-xl', focusMode === 'left' && 'ring-2 ring-emerald-500/20')}>
            <GstEngine gstCategory={gstCategory} cessType={cessType} cessValue={cessValue} customerGstin={customerGstin}
              isInterState={isInterState}
              onGstCategoryChange={setGstCategory} onCessTypeChange={setCessType} onCessValueChange={setCessValue} onGstinChange={setCustomerGstin} />
          </div>
          <div tabIndex={0} onFocus={() => setFocusMode('right')} className={cn('rounded-xl', focusMode === 'right' && 'ring-2 ring-emerald-500/20')}>
            <PaymentEngine splits={splits} grandTotal={gstResult.grandTotal}
              onAddSplit={handleAddSplit} onUpdateSplit={handleUpdateSplit} onRemoveSplit={handleRemoveSplit} />
          </div>
        </div>
      </div>

      {/* FINAL SUMMARY */}
      <div className="px-6 pb-3">
        <FinalSummary grossTotal={grossTotal} itemDiscount={itemDiscountTotal} taxableAmount={gstResult.taxable}
          cgst={gstResult.cgst} sgst={gstResult.sgst} igst={gstResult.igst} cess={gstResult.cess}
          roundOff={gstResult.roundOff} totalPaid={totalPaid} balance={balance} grandTotal={gstResult.grandTotal} isInterState={isInterState} />
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
          <span>Tab ↹ Switch</span><span>↑↓ Navigate</span><span>Ctrl+Enter Save</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onBack} icon={<X className="h-4 w-4" />}>Back</Button>
          <Button variant="primary"
            onClick={() => onComplete({ gstCategory, cessType, cessValue, paymentSplits: splits, gstin: customerGstin })}
            disabled={splits.length > 0 && totalPaid < gstResult.grandTotal * 0.99}
            icon={<Check className="h-4 w-4" />}>
            {splits.length === 0 ? 'Skip Payment — Save Draft' : 'Save & Finalize Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
}
