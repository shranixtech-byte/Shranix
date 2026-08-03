import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Mail,
  Printer,
  Send,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'posted' | 'cancelled';

type PaymentSplitData = {
  method: string;
  amount: number;
  refNo: string;
  bankName: string;
};

interface PostingPayload {
  invoiceNumber: string;
  invoiceDate: string;
  financialYear: string;
  customerId: string;
  customerName: string;
  placeOfSupply: string;
  billingAddress: string;
  salesPerson: string;
  notes: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  grandTotal: number;
  paymentSplits: PaymentSplitData[];
  gstCategory: string;
  gstin: string;
  status: InvoiceStatus;
  // Posting Engine - Ledger placeholders
  posting: {
    salesLedger: { debit: number; credit: number };
    customerLedger: { debit: number; credit: number };
    gstLedger: { cgst: number; sgst: number; igst: number; cess: number };
    cashLedger: { amount: number };
    bankLedger: { amount: number };
    inventoryLedger: { items: number };
    cogsLedger: { amount: number };
    outstandingLedger: { amount: number };
  };
  // Audit Trail
  audit: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    ip: string;
    device: string;
    reason: string;
  };
  // Approval
  requiresApproval: boolean;
  approvalStatus: string;
}

// ═════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) {
    return '—';
  }
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ═════════════════════════════════════════════════════════
// TOP SUMMARY
// ═════════════════════════════════════════════════════════

interface TopSummaryProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMode: string;
  salesPerson: string;
  warehouse: string;
  status: InvoiceStatus;
  grandTotal: number;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700' },
  pending: {
    label: 'Pending Approval',
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  posted: { label: 'Posted', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const TopSummary = memo(function TopSummary({
  customerName,
  invoiceNumber,
  invoiceDate,
  paymentMode,
  salesPerson,
  warehouse,
  status,
  grandTotal,
}: TopSummaryProps) {
  const sc = STATUS_CONFIG[status];
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <SummaryBadge label="Customer" value={customerName || '—'} />
          <SummaryBadge label="Invoice" value={invoiceNumber || '—'} />
          <SummaryBadge label="Date" value={formatDate(invoiceDate)} />
          <SummaryBadge label="Payment" value={paymentMode || '—'} />
          <SummaryBadge label="Sales Person" value={salesPerson || '—'} />
          <SummaryBadge label="Warehouse" value={warehouse} />
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
              sc.color,
              sc.bg,
            )}
          >
            {status === 'draft' && <Clock className="h-3 w-3" />}
            {status === 'posted' && <CheckCircle2 className="h-3 w-3" />}
            {status === 'pending' && <AlertTriangle className="h-3 w-3" />}
            {sc.label}
          </span>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grand Total
            </p>
            <p className="text-xl font-bold text-emerald-600">{formatINR(grandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SECTION 1: CUSTOMER INFORMATION
// ═════════════════════════════════════════════════════════

const SectionCard = memo(function SectionCard({
  title,
  icon,
  children,
  id,
  isInvalid,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  isInvalid?: boolean;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-800',
        isInvalid ? 'border-red-300 ring-1 ring-red-200 dark:border-red-600' : 'border-slate-200',
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          {icon}
          {typeof title === 'string' ? (
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
});

interface CustomerInfoProps {
  customerName: string;
  billingAddress: string;
  shippingAddress: string;
  gstin: string;
  pan: string;
  contact: string;
  creditLimit: number;
  outstanding: number;
}

const CustomerInfo = memo(function CustomerInfo({
  customerName,
  billingAddress,
  shippingAddress,
  gstin,
  pan,
  contact,
  creditLimit,
  outstanding,
}: CustomerInfoProps) {
  return (
    <SectionCard
      title="Customer Information"
      icon={<UserCheck className="h-4 w-4 text-emerald-500" />}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Customer Name
          </p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {customerName || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">GSTIN</p>
          <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{gstin || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">PAN</p>
          <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{pan || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Contact
          </p>
          <p className="text-sm text-slate-900 dark:text-slate-100">{contact || '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Billing Address
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{billingAddress || '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Shipping Address
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{shippingAddress || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Credit Limit
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {creditLimit ? formatINR(creditLimit) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Outstanding
          </p>
          <p
            className={cn(
              'text-sm font-semibold',
              outstanding > creditLimit && creditLimit > 0 ? 'text-red-600' : 'text-slate-900',
            )}
          >
            {outstanding ? formatINR(outstanding) : '—'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
});

// ═════════════════════════════════════════════════════════
// SECTION 2: INVOICE ITEMS (READONLY GRID WITH EXPANDABLE ROWS)
// ═════════════════════════════════════════════════════════

interface InvoiceItemsGridProps {
  items: InvoiceLineItem[];
  isInterState: boolean;
}

const InvoiceItemsGrid = memo(function InvoiceItemsGrid({
  items,
  isInterState,
}: InvoiceItemsGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <SectionCard
      title={`Invoice Items (${items.length})`}
      icon={<FileText className="h-4 w-4 text-emerald-500" />}
    >
      <div className="max-h-[400px] overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
              {['#', 'Product', 'Batch', 'Qty', 'Rate', 'Disc %', 'GST', 'Amount'].map((h) => (
                <th
                  key={h}
                  className="sticky top-0 z-10 bg-slate-50/95 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {items.map((item, idx) => (
              <tr
                key={item.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30"
              >
                <td className="px-3 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="flex items-center gap-1 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 text-slate-400 transition-transform',
                        expandedId === item.id && 'rotate-90',
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.productName}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.sku}</p>
                    </div>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{item.batchNo || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-slate-900">
                  {item.quantity} {item.uom}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-900">{formatINR(item.rate)}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {isInterState ? (
                    <span>{item.gstPercent}% IGST</span>
                  ) : (
                    <span>{item.gstPercent}% (CGST+SGST)</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold text-slate-900">
                  {formatINR(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400">No items in invoice</div>
      )}
    </SectionCard>
  );
});

// ═════════════════════════════════════════════════════════
// SECTION 3: FINANCIAL SUMMARY
// ═════════════════════════════════════════════════════════

interface FinancialSummaryProps {
  grossTotal: number;
  itemDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  totalPaid: number;
  balance: number;
  grandTotal: number;
  isInterState: boolean;
}

const FinancialSummary = memo(function FinancialSummary({
  grossTotal,
  itemDiscount,
  taxableAmount,
  cgst,
  sgst,
  igst,
  cess,
  roundOff,
  totalPaid,
  balance,
  grandTotal,
  isInterState,
}: FinancialSummaryProps) {
  return (
    <SectionCard title="Financial Summary" icon={<FileText className="h-4 w-4 text-emerald-500" />}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FinCell label="Gross Total" value={formatINR(grossTotal)} />
        <FinCell label="Item Discount" value={formatINR(itemDiscount)} className="text-red-600" />
        <FinCell label="Taxable Amount" value={formatINR(taxableAmount)} />
        {isInterState ? (
          <FinCell label="IGST" value={formatINR(igst)} className="text-purple-600" />
        ) : (
          <>
            <FinCell label="CGST" value={formatINR(cgst)} className="text-blue-600" />
            <FinCell label="SGST" value={formatINR(sgst)} className="text-blue-600" />
          </>
        )}
        <FinCell label="CESS" value={formatINR(cess)} className="text-orange-600" />
        <FinCell
          label="Round Off"
          value={roundOff.toFixed(2)}
          className={roundOff < 0 ? 'text-red-500' : 'text-emerald-500'}
        />
        <FinCell label="Total Paid" value={formatINR(totalPaid)} className="text-emerald-600" />
        <FinCell
          label="Balance"
          value={formatINR(balance)}
          className={balance > 0 ? 'text-amber-600' : 'text-slate-600'}
        />
        <div className="col-span-full flex justify-end border-t border-slate-100 pt-3 sm:col-span-4 dark:border-slate-700">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grand Total
            </p>
            <p className="text-2xl font-bold text-emerald-600">{formatINR(grandTotal)}</p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
});

function FinCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('text-sm font-bold text-slate-800 dark:text-slate-200', className)}>
        {value}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SECTION 4: VALIDATION PANEL
// ═════════════════════════════════════════════════════════

interface ValidationResult {
  field: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

interface ValidationPanelProps {
  results: ValidationResult[];
  hasErrors: boolean;
}

const ValidationPanel = memo(function ValidationPanel({
  results,
  hasErrors,
}: ValidationPanelProps) {
  return (
    <SectionCard
      title={`Pre-Save Validation (${results.filter((r) => r.status !== 'pass').length} issues)`}
      icon={
        <ShieldCheck className={cn('h-4 w-4', hasErrors ? 'text-red-500' : 'text-emerald-500')} />
      }
      isInvalid={hasErrors}
    >
      <div className="max-h-[250px] space-y-1.5 overflow-auto">
        {results.map((r) => (
          <div
            key={r.field}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
              r.status === 'pass'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400'
                : r.status === 'fail'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400',
            )}
          >
            {r.status === 'pass' ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : r.status === 'fail' ? (
              <XCircle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{r.label}</span>
            <span className="ml-auto text-[10px] opacity-70">{r.message}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

// ═════════════════════════════════════════════════════════
// SECTION 5: SAVE OPTIONS
// ═════════════════════════════════════════════════════════

interface SaveOptionsProps {
  onSaveDraft: () => void;
  onSavePost: () => void;
  onSaveNew: () => void;
  onGeneratePDF: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  disabled: boolean;
}

const SaveOptions = memo(function SaveOptions({
  onSaveDraft,
  onSavePost,
  onSaveNew,
  onGeneratePDF,
  onPrint,
  onWhatsApp,
  onEmail,
  disabled,
}: SaveOptionsProps) {
  return (
    <SectionCard title="Save & Actions" icon={<Check className="h-4 w-4 text-emerald-500" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionButton
          label="Save Draft"
          sub="Ctrl+S"
          icon={<FileText className="h-4 w-4" />}
          onClick={onSaveDraft}
          variant="secondary"
          disabled={disabled}
        />
        <ActionButton
          label="Save & Post"
          sub="Ctrl+Enter"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={onSavePost}
          variant="primary"
          disabled={disabled}
        />
        <ActionButton
          label="Save & New"
          sub=""
          icon={<Plus className="h-4 w-4" />}
          onClick={onSaveNew}
          variant="secondary"
          disabled={disabled}
        />
        <ActionButton
          label="Generate PDF"
          sub=""
          icon={<Download className="h-4 w-4" />}
          onClick={onGeneratePDF}
          variant="ghost"
        />
        <ActionButton
          label="Print"
          sub="Ctrl+P"
          icon={<Printer className="h-4 w-4" />}
          onClick={onPrint}
          variant="ghost"
        />
        <ActionButton
          label="WhatsApp"
          sub=""
          icon={<Send className="h-4 w-4" />}
          onClick={onWhatsApp}
          variant="ghost"
        />
        <ActionButton
          label="Email"
          sub=""
          icon={<Mail className="h-4 w-4" />}
          onClick={onEmail}
          variant="ghost"
        />
      </div>
    </SectionCard>
  );
});

function Plus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ActionButton({
  label,
  sub,
  icon,
  onClick,
  variant,
  disabled,
}: {
  label: string;
  sub?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg border py-3 text-center transition-all',
        variant === 'primary'
          ? 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
          : variant === 'secondary'
            ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
            : 'border-transparent text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
      {sub && <span className="text-[9px] text-slate-400">{sub}</span>}
    </button>
  );
}

// ═════════════════════════════════════════════════════════
// POSTING ENGINE PREVIEW
// ═════════════════════════════════════════════════════════

interface PostingEngineProps {
  payload: PostingPayload;
}

const PostingEnginePreview = memo(function PostingEnginePreview({ payload }: PostingEngineProps) {
  return (
    <SectionCard
      title="Posting Engine — Ledger Entries"
      icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PostingEntry
          label="Sales Ledger"
          debit={payload.posting.salesLedger.debit}
          credit={payload.posting.salesLedger.credit}
        />
        <PostingEntry
          label="Customer Ledger"
          debit={payload.posting.customerLedger.debit}
          credit={payload.posting.customerLedger.credit}
        />
        <PostingEntry label="GST (CGST)" debit={0} credit={payload.posting.gstLedger.cgst} />
        <PostingEntry label="GST (SGST)" debit={0} credit={payload.posting.gstLedger.sgst} />
        <PostingEntry label="GST (IGST)" debit={0} credit={payload.posting.gstLedger.igst} />
        <PostingEntry label="GST (CESS)" debit={0} credit={payload.posting.gstLedger.cess} />
        <PostingEntry label="Cash Ledger" debit={payload.posting.cashLedger.amount} credit={0} />
        <PostingEntry label="Bank Ledger" debit={payload.posting.bankLedger.amount} credit={0} />
        <PostingEntry label="Inventory" debit={0} credit={payload.posting.inventoryLedger.items} />
        <PostingEntry label="COGS" debit={payload.posting.cogsLedger.amount} credit={0} />
        <PostingEntry
          label="Outstanding"
          debit={0}
          credit={payload.posting.outstandingLedger.amount}
        />
        <div className="flex items-center text-[10px] italic text-slate-400">
          No backend posting — payload ready
        </div>
      </div>
    </SectionCard>
  );
});

function PostingEntry({ label, debit, credit }: { label: string; debit: number; credit: number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex gap-2 text-xs">
        {debit > 0 && <span className="font-medium text-emerald-600">Dr {formatINR(debit)}</span>}
        {credit > 0 && <span className="font-medium text-blue-600">Cr {formatINR(credit)}</span>}
        {debit === 0 && credit === 0 && <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═════════════════════════════════════════════════════════

interface AuditTrailProps {
  audit: PostingPayload['audit'];
}

const AuditTrail = memo(function AuditTrail({ audit }: AuditTrailProps) {
  return (
    <SectionCard title="Audit Trail" icon={<Clock className="h-4 w-4 text-emerald-500" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Created By
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {audit.createdBy}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Created At
          </p>
          <p className="text-xs text-slate-600">{formatDate(audit.createdAt)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Updated By
          </p>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {audit.updatedBy}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Updated At
          </p>
          <p className="text-xs text-slate-600">{formatDate(audit.updatedAt)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">IP</p>
          <p className="font-mono text-xs text-slate-600">{audit.ip}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Device
          </p>
          <p className="text-xs text-slate-600">{audit.device}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Reason
          </p>
          <p className="text-xs text-slate-600">{audit.reason || '—'}</p>
        </div>
      </div>
    </SectionCard>
  );
});

// ═════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═════════════════════════════════════════════════════════

interface ApprovalWorkflowProps {
  requiresApproval: boolean;
  reasons: string[];
  onApprove: () => void;
  onReject: () => void;
  approvalStatus: string;
}

const ApprovalWorkflow = memo(function ApprovalWorkflow({
  requiresApproval,
  reasons,
  onApprove,
  onReject,
  approvalStatus,
}: ApprovalWorkflowProps) {
  if (!requiresApproval) {
    return null;
  }

  return (
    <SectionCard
      title="Approval Required"
      icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
      isInvalid={approvalStatus !== 'approved'}
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          This invoice requires manager approval for:
        </p>
        <ul className="space-y-1">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
            >
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              {r}
            </li>
          ))}
        </ul>
        {approvalStatus !== 'approved' && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onApprove}
              icon={<Check className="h-3 w-3" />}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onReject}
              icon={<X className="h-3 w-3" />}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
});

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════

export interface InvoicePostingEngineScreenProps {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  financialYear: string;
  customerId: string;
  placeOfSupply: string;
  billingAddress: string;
  salesPerson: string;
  notes: string;
  paymentTerms: string;
  dueDate: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  gstCategory: string;
  cessType: string;
  cessValue: number;
  customerGstin: string;
  paymentSplits: { method: string; amount: number; refNo: string; bankName: string }[];
  companyState: string;
  isInterState: boolean;
  onBack: () => void;
  onComplete: (payload: PostingPayload) => void;
  onSaveToBackend: (payload: PostingPayload, action: 'draft' | 'post') => Promise<void>;
}

export function InvoicePostingEngineScreen({
  customerName,
  invoiceNumber,
  invoiceDate,
  financialYear,
  customerId,
  placeOfSupply,
  billingAddress,
  salesPerson,
  notes,
  items,
  grossTotal,
  itemDiscountTotal,
  taxableAfterDiscount,
  gstCategory,
  customerGstin,
  paymentSplits,
  isInterState,
  onBack,
  onComplete,
  onSaveToBackend,
}: InvoicePostingEngineScreenProps) {
  const [status] = useState<InvoiceStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState('pending');

  // ── Computed values ────────────────────────────────
  const computed = useMemo(() => {
    const totalGstPct = items.reduce((s, i) => s + i.gstPercent, 0);
    const avgGstPct = items.length > 0 ? totalGstPct / items.length : 0;
    let effectiveGstPct = avgGstPct;
    if (['zero_rated', 'exempt', 'nil_rated'].includes(gstCategory)) {
      effectiveGstPct = 0;
    }

    let cgst = 0,
      sgst = 0,
      igst = 0;
    if (isInterState) {
      igst = Math.round(taxableAfterDiscount * (effectiveGstPct / 100) * 100) / 100;
    } else {
      const half = effectiveGstPct / 2;
      cgst = Math.round(taxableAfterDiscount * (half / 100) * 100) / 100;
      sgst = Math.round(taxableAfterDiscount * (half / 100) * 100) / 100;
    }
    const cess = 0;
    const netAmount = taxableAfterDiscount + cgst + sgst + igst + cess;
    const roundOff = Math.round(netAmount) - netAmount;
    const grandTotal = Math.round(netAmount);
    const totalPaid = paymentSplits.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, grandTotal - totalPaid);
    return { cgst, sgst, igst, cess, roundOff, grandTotal, totalPaid, balance };
  }, [items, taxableAfterDiscount, gstCategory, isInterState, paymentSplits]);

  // Payment mode display
  const paymentMode =
    paymentSplits.length > 0 ? paymentSplits.map((p) => p.method).join(', ') : 'Not set';

  // ── Validation ─────────────────────────────────────
  const validationResults = useMemo((): ValidationResult[] => {
    const results: ValidationResult[] = [
      {
        field: 'customer',
        label: 'Customer selected',
        status: customerName ? 'pass' : 'fail',
        message: customerName || 'Missing',
      },
      {
        field: 'items',
        label: 'At least one product',
        status: items.length > 0 ? 'pass' : 'fail',
        message: `${items.length} items`,
      },
      {
        field: 'stock',
        label: 'Stock available',
        status: items.some((i) => i.quantity > i.availableStock) ? 'fail' : 'pass',
        message: items.some((i) => i.quantity > i.availableStock) ? 'Overstock!' : 'OK',
      },
      {
        field: 'credit',
        label: 'Credit limit',
        status: items.some((i) => i.creditHold) ? 'warn' : 'pass',
        message: items.some((i) => i.creditHold) ? 'Credit hold' : 'OK',
      },
      {
        field: 'gst',
        label: 'GST validation',
        status:
          customerGstin && customerGstin.length > 0 && customerGstin.length !== 15
            ? 'warn'
            : 'pass',
        message: customerGstin ? `${customerGstin.length}/15` : 'N/A',
      },
      {
        field: 'payment',
        label: 'Payment validation',
        status: computed.totalPaid >= computed.grandTotal * 0.99 ? 'pass' : 'warn',
        message:
          computed.totalPaid > 0
            ? `${((computed.totalPaid / computed.grandTotal) * 100).toFixed(0)}%`
            : 'No payment',
      },
      {
        field: 'batch',
        label: 'Batch selected',
        status: items.some((i) => !i.batchNo) ? 'warn' : 'pass',
        message: items.some((i) => !i.batchNo) ? 'Missing batch' : 'All set',
      },
      {
        field: 'expired',
        label: 'No expired batch',
        status: items.some((i) => i.isExpired) ? 'fail' : 'pass',
        message: items.some((i) => i.isExpired) ? 'Expired!' : 'OK',
      },
      { field: 'duplicate', label: 'No duplicate invoice', status: 'pass', message: 'New invoice' },
      {
        field: 'customer_active',
        label: 'Customer active',
        status: items.some((i) => i.isBlocked) ? 'fail' : 'pass',
        message: items.some((i) => i.isBlocked) ? 'Blocked!' : 'Active',
      },
    ];
    return results;
  }, [customerName, items, customerGstin, computed]);

  const hasErrors = validationResults.some((r) => r.status === 'fail');
  const isZeroGstCategory = ['zero_rated', 'exempt', 'nil_rated'].includes(gstCategory);
  const requiresApproval =
    validationResults.some((r) => r.status === 'fail') ||
    items.some((i) => i.creditHold) ||
    (!isZeroGstCategory && computed.cgst + computed.sgst + computed.igst === 0 && items.length > 0);
  const approvalReasons = useMemo(() => {
    const reasons: string[] = [];
    if (items.some((i) => i.creditHold)) {
      reasons.push('Credit hold on one or more items');
    }
    if (
      !isZeroGstCategory &&
      computed.cgst + computed.sgst + computed.igst === 0 &&
      items.length > 0
    ) {
      reasons.push('Zero GST — requires manual verification');
    }
    if (gstCategory === 'reverse_charge') {
      reasons.push('Reverse charge transaction');
    }
    return reasons;
  }, [items, computed, gstCategory, isZeroGstCategory]);

  // ── Posting Payload ────────────────────────────────
  const postingPayload = useMemo(
    (): PostingPayload => ({
      invoiceNumber,
      invoiceDate,
      financialYear,
      customerId,
      customerName,
      placeOfSupply,
      billingAddress,
      salesPerson,
      notes,
      items,
      grossTotal,
      itemDiscountTotal,
      taxableAmount: taxableAfterDiscount,
      cgst: computed.cgst,
      sgst: computed.sgst,
      igst: computed.igst,
      cess: computed.cess,
      roundOff: computed.roundOff,
      grandTotal: computed.grandTotal,
      paymentSplits,
      gstCategory,
      gstin: customerGstin,
      status,
      posting: {
        salesLedger: { debit: computed.grandTotal, credit: 0 },
        customerLedger: { debit: 0, credit: computed.grandTotal },
        gstLedger: {
          cgst: computed.cgst,
          sgst: computed.sgst,
          igst: computed.igst,
          cess: computed.cess,
        },
        cashLedger: {
          amount: paymentSplits
            .filter((p) => p.method === 'cash')
            .reduce((s, p) => s + p.amount, 0),
        },
        bankLedger: {
          amount: paymentSplits
            .filter((p) =>
              ['bank_transfer', 'neft', 'rtgs', 'imps', 'cheque', 'card', 'upi'].includes(p.method),
            )
            .reduce((s, p) => s + p.amount, 0),
        },
        inventoryLedger: { items: items.length },
        cogsLedger: { amount: items.reduce((s, i) => s + i.quantity * i.rate, 0) },
        outstandingLedger: { amount: computed.balance },
      },
      audit: {
        createdBy: 'Current User',
        createdAt: new Date().toISOString(),
        updatedBy: 'Current User',
        updatedAt: new Date().toISOString(),
        ip: '127.0.0.1',
        device:
          typeof navigator !== 'undefined' ? navigator.userAgent || 'Web Browser' : 'Web Browser',
        reason: '',
      },
      requiresApproval,
      approvalStatus,
    }),
    [
      invoiceNumber,
      invoiceDate,
      financialYear,
      customerId,
      customerName,
      placeOfSupply,
      billingAddress,
      salesPerson,
      notes,
      items,
      grossTotal,
      itemDiscountTotal,
      taxableAfterDiscount,
      computed,
      paymentSplits,
      gstCategory,
      customerGstin,
      status,
      requiresApproval,
      approvalStatus,
    ],
  );

  // ── Save Handlers ────────────────────────────────
  const handleSave = useCallback(
    async (action: 'draft' | 'post') => {
      if (saving) {
        return;
      }
      setSaving(true);
      setSaveError(null);
      try {
        const payload = {
          ...postingPayload,
          status: action === 'post' ? ('posted' as const) : ('draft' as const),
        };
        await onSaveToBackend(payload, action);
        onComplete(payload);
      } catch (err: any) {
        setSaveError(err?.message || 'Failed to save invoice. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [postingPayload, onSaveToBackend, onComplete, saving],
  );

  // ── Keyboard Shortcuts ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave('draft');
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave('post');
      } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, onBack]);

  return (
    <div className="animate-in fade-in flex h-full flex-col duration-200">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Review & Post Invoice
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verify all details before posting
            </p>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY */}
      <div className="px-6 pt-4">
        <TopSummary
          customerName={customerName}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          paymentMode={paymentMode}
          salesPerson={salesPerson}
          warehouse="Main"
          status={status}
          grandTotal={computed.grandTotal}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: 2/3 — Customer + Items + Financial */}
          <div className="space-y-4 lg:col-span-2">
            <CustomerInfo
              customerName={customerName}
              billingAddress={billingAddress}
              shippingAddress={billingAddress}
              gstin={customerGstin}
              pan="—"
              contact="—"
              creditLimit={0}
              outstanding={0}
            />
            <InvoiceItemsGrid items={items} isInterState={isInterState} />
            <FinancialSummary
              grossTotal={grossTotal}
              itemDiscount={itemDiscountTotal}
              taxableAmount={taxableAfterDiscount}
              cgst={computed.cgst}
              sgst={computed.sgst}
              igst={computed.igst}
              cess={computed.cess}
              roundOff={computed.roundOff}
              totalPaid={computed.totalPaid}
              balance={computed.balance}
              grandTotal={computed.grandTotal}
              isInterState={isInterState}
            />
            <PostingEnginePreview payload={postingPayload} />
          </div>

          {/* RIGHT: 1/3 — Validation + Actions + Audit */}
          <div className="space-y-4">
            <ValidationPanel results={validationResults} hasErrors={hasErrors} />
            <ApprovalWorkflow
              requiresApproval={requiresApproval}
              reasons={approvalReasons}
              approvalStatus={approvalStatus}
              onApprove={() => setApprovalStatus('approved')}
              onReject={() => setApprovalStatus('rejected')}
            />
            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400">
                {saveError}
              </div>
            )}
            <SaveOptions
              onSaveDraft={() => handleSave('draft')}
              onSavePost={() => handleSave('post')}
              onSaveNew={() => handleSave('draft')}
              onGeneratePDF={() => {}}
              onPrint={() => window.print()}
              onWhatsApp={() => {}}
              onEmail={() => {}}
              disabled={saving || (hasErrors && approvalStatus !== 'approved')}
            />
            <AuditTrail audit={postingPayload.audit} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
          <span>Ctrl+S Draft</span>
          <span>Ctrl+Enter Post</span>
          <span>Ctrl+P Print</span>
          <span>Esc Back</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-medium',
              hasErrors ? 'text-red-500' : 'text-emerald-600',
            )}
          >
            {hasErrors
              ? `${validationResults.filter((r) => r.status === 'fail').length} errors`
              : '✓ All checks passed'}
          </span>
        </div>
      </div>
    </div>
  );
}
