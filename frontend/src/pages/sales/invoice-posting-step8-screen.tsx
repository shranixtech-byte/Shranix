import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  preparePostingPayload,
  triggerPosting,
  type PostingPayload,
  type PreparePostingInput,
} from '@/services/posting-engine.service';

import type { InvoiceLineItem } from './product-selection-screen';

// ═════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ═════════════════════════════════════════════════════════
// STEP INDICATOR
// ═════════════════════════════════════════════════════════

interface StepIndicatorProps {
  current: number;
  total: number;
  label: string;
}

function StepIndicator({ current, total, label }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all',
              i < current
                ? 'bg-emerald-600 text-white'
                : i === current
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400',
            )}
          >
            {i < current ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                'h-px w-6',
                i < current ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-600',
              )}
            />
          )}
        </div>
      ))}
      <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PROGRESS BAR
// ═════════════════════════════════════════════════════════

interface ProgressStep {
  label: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  detail?: string;
}

function ProgressBar({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
        >
          {step.status === 'pending' && (
            <div className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-500" />
          )}
          {step.status === 'processing' && (
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          )}
          {step.status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          {step.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
          <span
            className={cn(
              'flex-1 text-sm font-medium',
              step.status === 'done'
                ? 'text-emerald-700 dark:text-emerald-300'
                : step.status === 'error'
                  ? 'text-red-700 dark:text-red-300'
                  : step.status === 'processing'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {step.label}
          </span>
          {step.detail && <span className="text-[10px] text-slate-400">{step.detail}</span>}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// STAT CARD
// ═════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// VALIDATION LIST
// ═════════════════════════════════════════════════════════

function ValidationList({ validations }: { validations: PostingPayload['validations'] }) {
  return (
    <div className="max-h-48 space-y-1 overflow-auto">
      {validations.map((v, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
            v.status === 'pass'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400'
              : v.status === 'fail'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400',
          )}
        >
          {v.status === 'pass' ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : v.status === 'fail' ? (
            <XCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{v.field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          <span className="ml-auto text-[9px] opacity-70">{v.message}</span>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// ACCOUNTING TABLE
// ═════════════════════════════════════════════════════════

function AccountingPreview({ journal }: { journal: PostingPayload['accounting'] }) {
  return (
    <div className="overflow-auto">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Entry: {journal.entryNumber}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium',
            journal.balanced
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400',
          )}
        >
          {journal.balanced ? '✓ Balanced' : '✗ Unbalanced'}
        </span>
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Account</th>
            <th className="px-2 py-1.5 text-right font-semibold text-slate-500">Debit</th>
            <th className="px-2 py-1.5 text-right font-semibold text-slate-500">Credit</th>
            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Narration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
          {journal.entries.map((entry, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <td className="px-2 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                {entry.accountName}
              </td>
              <td
                className={cn(
                  'px-2 py-1.5 text-right font-mono',
                  entry.accountType === 'debit'
                    ? 'font-semibold text-emerald-600'
                    : 'text-slate-400',
                )}
              >
                {entry.accountType === 'debit' ? formatINR(entry.amount) : '—'}
              </td>
              <td
                className={cn(
                  'px-2 py-1.5 text-right font-mono',
                  entry.accountType === 'credit' ? 'font-semibold text-blue-600' : 'text-slate-400',
                )}
              >
                {entry.accountType === 'credit' ? formatINR(entry.amount) : '—'}
              </td>
              <td className="px-2 py-1.5 text-slate-400">{entry.narration}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-600">
            <td className="px-2 py-1.5 font-bold text-slate-800 dark:text-slate-200">Total</td>
            <td className="px-2 py-1.5 text-right font-mono font-bold text-emerald-600">
              {formatINR(journal.totalDebit)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono font-bold text-blue-600">
              {formatINR(journal.totalCredit)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SUCCESS SCREEN
// ═════════════════════════════════════════════════════════

function SuccessScreen({
  invoiceNumber,
  onFinish,
}: {
  invoiceNumber: string;
  onFinish: () => void;
}) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center py-12 duration-300">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
        Invoice Posted Successfully
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Invoice #{invoiceNumber} has been posted and all ledger entries are ready
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={onFinish}>
          Back to Invoices
        </Button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════

export interface InvoicePostingStep8ScreenProps {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerId: string;
  placeOfSupply: string;
  items: InvoiceLineItem[];
  grossTotal: number;
  itemDiscountTotal: number;
  taxableAfterDiscount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  totalPaid: number;
  balance: number;
  customerGstin: string;
  gstCategory: string;
  isInterState: boolean;
  paymentSplits: { method: string; amount: number; refNo: string; bankName: string }[];
  onBack: () => void;
  onComplete: () => void;
}

export function InvoicePostingStep8Screen({
  invoiceNumber,
  invoiceDate,
  customerName,
  customerId,
  placeOfSupply,
  items,
  grossTotal,
  itemDiscountTotal,
  taxableAfterDiscount,
  cgstTotal,
  sgstTotal,
  igstTotal,
  cessTotal,
  roundOff,
  grandTotal,
  totalPaid,
  balance,
  customerGstin,
  gstCategory,
  isInterState,
  paymentSplits,
  onBack,
  onComplete,
}: InvoicePostingStep8ScreenProps) {
  const [stage, setStage] = useState<'preparing' | 'ready' | 'posting' | 'success' | 'error'>(
    'preparing',
  );
  const [payload, setPayload] = useState<PostingPayload | null>(null);
  const [postingError, setPostingError] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { label: 'Preparing accounting entries', status: 'processing' },
    { label: 'Validating invoice data', status: 'pending' },
    { label: 'Customer ledger update', status: 'pending' },
    { label: 'Stock & batch posting', status: 'pending' },
    { label: 'Costing calculation', status: 'pending' },
    { label: 'Audit log & events', status: 'pending' },
  ]);

  // Prepare posting payload on mount
  useEffect(() => {
    const input: PreparePostingInput = {
      invoiceNumber,
      invoiceDate,
      customerId,
      customerName,
      placeOfSupply,
      items,
      grossTotal,
      itemDiscountTotal,
      taxableAfterDiscount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      roundOff,
      grandTotal,
      totalPaid,
      balance,
      customerGstin,
      gstCategory,
      isInterState,
      paymentSplits,
      status: 'draft',
    };

    // Simulate async preparation
    const timer = setTimeout(() => {
      const result = preparePostingPayload(input);
      setPayload(result);

      // Update progress
      setProgressSteps([
        {
          label: 'Preparing accounting entries',
          status: 'done',
          detail: `${result.accounting.entries.length} entries`,
        },
        {
          label: 'Validating invoice data',
          status: 'done',
          detail: `${result.validations.filter((v) => v.status === 'pass').length}/${result.validations.length} passed`,
        },
        {
          label: 'Customer ledger update',
          status: 'done',
          detail: formatINR(result.customerLedger.closingBalance),
        },
        {
          label: 'Stock & batch posting',
          status: 'done',
          detail: `${result.stockPostings.length} items`,
        },
        { label: 'Costing calculation', status: 'done', detail: `${result.costing.length} items` },
        { label: 'Audit log & events', status: 'done', detail: `${result.events.length} events` },
      ]);

      setStage(result.canPost ? 'ready' : 'error');
      if (!result.canPost) {
        setPostingError(
          `${result.validations.filter((v) => v.status === 'fail').length} validation(s) failed`,
        );
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    invoiceNumber,
    invoiceDate,
    customerId,
    customerName,
    placeOfSupply,
    items,
    grossTotal,
    itemDiscountTotal,
    taxableAfterDiscount,
    cgstTotal,
    sgstTotal,
    igstTotal,
    cessTotal,
    roundOff,
    grandTotal,
    totalPaid,
    balance,
    customerGstin,
    gstCategory,
    isInterState,
    paymentSplits,
  ]);

  // ── Handle Post ──────────────────────────────────────
  const handlePost = useCallback(async () => {
    if (!payload) {
      return;
    }
    setStage('posting');
    setProgressSteps((prev) =>
      prev.map((s) => ({ ...s, status: s.status === 'done' ? 'done' : 'processing' })),
    );

    try {
      await triggerPosting(payload.invoiceId, payload);
      setProgressSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })));
      setStage('success');
    } catch (err: any) {
      setPostingError(err?.message || 'Posting failed');
      setStage('error');
    }
  }, [payload]);

  // ── Computed values ───────────────────────────────
  const summaryCards = useMemo(
    () => [
      {
        label: 'Journal Entries',
        value: String(payload?.accounting.entries.length || 0),
        icon: <FileText className="h-5 w-5 text-white" />,
        color: 'bg-blue-500',
      },
      {
        label: 'Stock Items',
        value: String(payload?.stockPostings.length || 0),
        icon: <Package className="h-5 w-5 text-white" />,
        color: 'bg-emerald-500',
      },
      {
        label: 'Costing Items',
        value: String(payload?.costing.length || 0),
        icon: <TrendingUp className="h-5 w-5 text-white" />,
        color: 'bg-purple-500',
      },
      {
        label: 'Grand Total',
        value: formatINR(grandTotal),
        icon: <FileText className="h-5 w-5 text-white" />,
        color: 'bg-amber-500',
      },
    ],
    [payload, grandTotal],
  );

  const failCount = payload?.validations.filter((v) => v.status === 'fail').length || 0;
  const warnCount = payload?.validations.filter((v) => v.status === 'warn').length || 0;

  // ── Render ────────────────────────────────────────
  if (stage === 'success') {
    return (
      <div className="animate-in fade-in flex h-full flex-col duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <StepIndicator current={8} total={8} label="Complete" />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-8">
          <SuccessScreen invoiceNumber={invoiceNumber} onFinish={onComplete} />
        </div>
      </div>
    );
  }

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
              Step 8 — Posting Engine
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Accounting, Inventory & Ledger Posting — Invoice #{invoiceNumber}
            </p>
          </div>
        </div>
        <StepIndicator current={7} total={8} label="Posting" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT — Progress */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                Posting Progress
              </h3>
              <ProgressBar steps={progressSteps} />
            </div>

            {payload && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Validation Results
                </h3>
                <ValidationList validations={payload.validations} />
                <div className="mt-2 flex gap-2 text-[10px]">
                  <span className="text-emerald-600">
                    {payload.validations.filter((v) => v.status === 'pass').length} passed
                  </span>
                  {failCount > 0 && <span className="text-red-600">{failCount} failed</span>}
                  {warnCount > 0 && <span className="text-amber-600">{warnCount} warnings</span>}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — 2/3 Summary & Details */}
          <div className="space-y-4 lg:col-span-2">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {summaryCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            {/* Accounting Entry */}
            {payload && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Journal Entry Preview
                </h3>
                <AccountingPreview journal={payload.accounting} />
              </div>
            )}

            {/* Customer Ledger */}
            {payload && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Customer Ledger
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Opening
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {formatINR(payload.customerLedger.openingBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Invoice
                    </p>
                    <p className="font-medium text-red-600">
                      {formatINR(payload.customerLedger.invoiceAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Payment
                    </p>
                    <p className="font-medium text-emerald-600">
                      {formatINR(payload.customerLedger.paymentAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Closing
                    </p>
                    <p
                      className={cn(
                        'font-medium',
                        payload.customerLedger.closingBalance > 0
                          ? 'text-amber-600'
                          : 'text-slate-700',
                      )}
                    >
                      {formatINR(payload.customerLedger.closingBalance)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Posting Summary */}
            {payload && payload.stockPostings.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Stock Posting
                </h3>
                <div className="max-h-32 space-y-1.5 overflow-auto">
                  {payload.stockPostings.map((sp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-700/50"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sp.productName}
                      </span>
                      <span className="text-slate-500">
                        {sp.warehouse} → -{sp.quantity}{' '}
                        {sp.batchNo !== '—' ? `(Batch: ${sp.batchNo})` : ''}
                      </span>
                      <span className="font-mono text-slate-600">
                        {formatINR(sp.totalCost)} @ {sp.costMethod.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Costing Summary */}
            {payload && payload.costing.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Costing & Margin
                </h3>
                <div className="max-h-32 space-y-1.5 overflow-auto">
                  {payload.costing.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-700/50"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {c.productName}
                      </span>
                      <span className="text-slate-500">
                        Cost: {formatINR(c.unitCost)}/unit | Revenue: {formatINR(c.totalRevenue)}
                      </span>
                      <span
                        className={cn(
                          'font-mono font-semibold',
                          c.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {c.grossMarginPercent >= 0 ? '+' : ''}
                        {c.grossMarginPercent}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-end border-t border-slate-100 pt-2 text-xs dark:border-slate-700">
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    Method: {payload.costing[0]?.method.toUpperCase() || '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div className="text-[10px] text-slate-400">
          {stage === 'ready' && '✓ Payloads prepared — review and confirm to post'}
          {stage === 'preparing' && '⏳ Preparing posting payloads...'}
          {stage === 'posting' && '🔄 Posting in progress...'}
          {stage === 'error' && postingError}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack} disabled={stage === 'posting'}>
            Back
          </Button>
          {stage === 'ready' && (
            <Button
              variant="primary"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={handlePost}
            >
              Confirm & Post
            </Button>
          )}
          {stage === 'posting' && (
            <Button variant="primary" disabled icon={<Loader2 className="h-4 w-4 animate-spin" />}>
              Posting...
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
