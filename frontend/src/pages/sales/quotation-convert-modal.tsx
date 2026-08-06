// ═════════════════════════════════════════════════════════
// PHASE 9 — QUOTATION CONVERT MODAL (One-click chain)
//
// Quotation → Sales Order → Delivery Challan → Invoice — एका click मध्ये.
//
// • Step toggles let you run the whole chain or stop at a step
//   (e.g. only "Order" to create a Sales Order from the quote).
// • After conversion the result panel shows every generated
//   document with its number + a link to open it.
// • The backend is idempotent per step: already-converted quotes
//   are blocked with a clear message; a mid-chain failure keeps
//   the completed documents and reports the failing step.
// ═════════════════════════════════════════════════════════

import { ArrowDown, CheckCircle2, FileText, PackageCheck, Sparkles, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/services/api-client';

type Step = 'order' | 'challan' | 'invoice';

interface ConvertResponse {
  sourceId: string;
  sourceNumber: string;
  completed: Step[];
  order?: { id: string; orderNumber: string; grandTotal?: number };
  challan?: { id: string; challanNumber: string; status?: string };
  invoice?: { id: string; invoiceNumber: string; grandTotal?: number; status?: string };
  error?: { step: Step; message: string };
  message: string;
}

const STEP_META: Record<
  Step,
  { label: string; short: string; icon: React.ReactNode; color: string }
> = {
  order: {
    label: 'Sales Order',
    short: 'Order',
    icon: <FileText className="h-4 w-4" />,
    color:
      'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  challan: {
    label: 'Delivery Challan',
    short: 'Challan',
    icon: <Truck className="h-4 w-4" />,
    color:
      'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  invoice: {
    label: 'Invoice',
    short: 'Invoice',
    icon: <PackageCheck className="h-4 w-4" />,
    color:
      'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
};

const fmtINR = (n: number) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function QuotationConvertModal({
  quoteId,
  quoteNumberHint,
  onClose,
}: {
  quoteId: string;
  quoteNumberHint?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [quoteNumber, setQuoteNumber] = useState(quoteNumberHint || '');
  const [grandTotal, setGrandTotal] = useState<number | null>(null);

  const [steps, setSteps] = useState<Step[]>(['order', 'challan', 'invoice']);
  const [converting, setConverting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResponse | null>(null);

  // Load the quotation (number + total for the header)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await apiRequest<Record<string, unknown>>(`/sales/quotations/${quoteId}`);
        if (cancelled) {
          return;
        }
        setQuoteNumber(String(rec?.quoteNumber || quoteNumberHint || ''));
        const gt = Number(rec?.grandTotal);
        setGrandTotal(Number.isFinite(gt) ? gt : null);
      } catch {
        /* non-fatal: header just shows the hint */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, quoteNumberHint]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleStep = (step: Step) => {
    setSteps((s) => (s.includes(step) ? s.filter((x) => x !== step) : [...s, step]));
  };

  const handleConvert = async () => {
    setConverting(true);
    setActionError(null);
    try {
      const res = await apiRequest<ConvertResponse>(`/sales/quotations/${quoteId}/convert`, {
        method: 'POST',
        body: JSON.stringify({ steps }),
      });
      setResult(res);
    } catch (err) {
      setActionError((err as Error).message || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const openDoc = (path: string) => {
    navigate(path);
    onClose();
  };

  const stepState = (step: Step): 'pending' | 'selected' | 'done' | 'failed' => {
    if (result?.error?.step === step) {
      return 'failed';
    }
    if (result?.completed.includes(step)) {
      return 'done';
    }
    return steps.includes(step) ? 'selected' : 'pending';
  };

  const anySelected = steps.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-lg bg-teal-100 px-2.5 py-1 font-mono text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              {quoteNumber || '—'}
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Convert</h2>
              <p className="text-[11px] text-slate-400">
                One-click chain — Quotation → Order → Challan → Invoice
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto p-5">
          {result ? (
            /* ── Result panel ─────────────────────────── */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                  {result.completed.length > 0 ? 'Conversion complete!' : 'Conversion blocked'}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{result.message}</p>
                {result.error && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    ⚠️ Step failed: {STEP_META[result.error.step].label} — {result.error.message}
                  </p>
                )}
              </div>

              {/* Generated documents */}
              <div className="space-y-2">
                {(result.completed.length > 0 ? result.completed : steps).map((step) => {
                  const meta = STEP_META[step];
                  const number =
                    step === 'order'
                      ? result.order?.orderNumber || ''
                      : step === 'challan'
                        ? result.challan?.challanNumber || ''
                        : result.invoice?.invoiceNumber || '';
                  const path =
                    step === 'order'
                      ? '/sales/orders'
                      : step === 'challan'
                        ? '/sales/delivery-challans'
                        : '/sales/invoices';
                  const done = result.completed.includes(step);
                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${
                        done
                          ? 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700/40'
                          : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.color}`}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {meta.label}
                        </p>
                        <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {number || '—'}
                        </p>
                      </div>
                      {done ? (
                        <button
                          type="button"
                          onClick={() => openDoc(path)}
                          className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                        >
                          Open →
                        </button>
                      ) : (
                        <span className="shrink-0 text-[11px] font-medium text-slate-400">
                          {result.error?.step === step ? 'Failed' : 'Skipped'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* ── Step selection ──────────────────────── */
            <div className="space-y-4">
              <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 dark:border-teal-800 dark:from-teal-900/20 dark:to-slate-800/50">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <Sparkles className="h-4 w-4 text-teal-500" />
                  Quotation → Sales Order → Delivery Challan → Invoice
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Items, customer, totals aur terms sab automatically copy hote hain — har document
                  ke numbers bhi aapopap generate hote hain. Ek click mein poori chain.
                </p>
                {grandTotal !== null && (
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Quotation total: <span className="font-bold">{fmtINR(grandTotal)}</span>
                  </p>
                )}
              </div>

              {/* Source node */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Quotation{' '}
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {quoteNumber}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">Source document</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  SOURCE
                </span>
              </div>

              {/* Conversion steps */}
              <div className="space-y-2.5">
                {(['order', 'challan', 'invoice'] as Step[]).map((step, idx) => {
                  const meta = STEP_META[step];
                  const state = stepState(step);
                  const checked = state === 'selected' || state === 'done';
                  return (
                    <div key={step}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all hover:border-teal-300 hover:shadow-sm dark:hover:border-teal-600 ${
                          checked
                            ? 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700/40'
                            : 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/40'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.color}`}
                        >
                          {meta.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {meta.label}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {step === 'order' &&
                              'New SO number (auto), items + totals from quotation'}
                            {step === 'challan' && 'Full dispatch, order items linked (DC #)'}
                            {step === 'invoice' && 'GST invoice linked to challan + order (SI #)'}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStep(step)}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                      {idx < 2 && (
                        <div className="my-0.5 flex justify-center">
                          <ArrowDown className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {actionError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                  {actionError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon={converting ? undefined : <Sparkles className="h-3.5 w-3.5" />}
                  loading={converting}
                  disabled={!anySelected}
                  onClick={() => void handleConvert()}
                >
                  {converting
                    ? 'Converting...'
                    : `Convert ${steps.length === 3 ? 'Full Chain' : `(${steps.length} step${steps.length > 1 ? 's' : ''})`}`}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!result && (
          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-500" />
            <p className="text-[11px] text-slate-400">
              Already-converted quotes are blocked server-side — partial failures keep the documents
              created so far.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
