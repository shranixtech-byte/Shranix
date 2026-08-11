// ═════════════════════════════════════════════════════════
// PURCHASE PAYMENT COLLECTION (Phase 3.3 — G3)
// Supplier Invoice → Payment: Cash · UPI · Bank · Cheque · Advance
// Due · Outstanding sab yahin ek jagah — supplier select karo,
// due invoices par amount allocate karo, mode choose karke payment karo.
// Overpayment → auto advance. Advance balance → invoice par apply.
// ═════════════════════════════════════════════════════════

import {
  Banknote,
  CalendarDays,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import {
  applySupplierAdvance,
  collectPurchasePayment,
  getPurchasePaymentDashboard,
  getSupplierPaymentSummary,
  type PurchasePaymentMode,
  type PurchasePaymentRecord,
  type SupplierPaymentSummary,
} from '@/services/purchase-payments.service';

const fmtINR = (n: number | undefined | null) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split('T')[0];

function isOverdue(inv: { dueDate: string | null; invoiceDate: string; balanceAmount: number }) {
  if (!inv.dueDate || inv.balanceAmount <= 0) {
    return false;
  }
  return new Date(inv.dueDate).getTime() < new Date(today()).getTime();
}

// ── Summary card ──────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: 'emerald' | 'red' | 'blue' | 'violet';
}) {
  const accents = {
    emerald: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10',
    red: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
    violet: 'border-l-violet-500 bg-violet-50 dark:bg-violet-900/10',
  };
  return (
    <div
      className={cn(
        'rounded-xl border border-l-4 border-slate-200 p-4 shadow-sm dark:border-slate-700',
        accents[accent],
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────
const MODES: {
  value: Exclude<PurchasePaymentMode, 'advance'>;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    value: 'cash',
    label: 'Cash',
    icon: <Banknote className="h-4 w-4" />,
    hint: 'Hard cash paid',
  },
  {
    value: 'upi',
    label: 'UPI',
    icon: <Smartphone className="h-4 w-4" />,
    hint: 'GPay / PhonePe / Paytm',
  },
  {
    value: 'bank',
    label: 'Bank',
    icon: <Landmark className="h-4 w-4" />,
    hint: 'NEFT / RTGS / Transfer',
  },
  {
    value: 'cheque',
    label: 'Cheque',
    icon: <FileText className="h-4 w-4" />,
    hint: 'Cheque issued',
  },
];

interface SupplierOption {
  id: string;
  name: string;
  code?: string | null;
}

export function PurchasePaymentCollectionPage() {
  const [dash, setDash] = useState<{
    summary: {
      totalPayable: number;
      totalOverdue: number;
      totalAdvance: number;
      todayCollection: number;
      suppliersWithDue: number;
    };
    recent: PurchasePaymentRecord[];
  } | null>(null);

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [summary, setSummary] = useState<SupplierPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Payment form
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [mode, setMode] = useState<Exclude<PurchasePaymentMode, 'advance'>>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [applyAdvanceAmt, setApplyAdvanceAmt] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [recent, setRecent] = useState<PurchasePaymentRecord[]>([]);

  // ── Load dashboard + supplier list ──
  const loadDashboard = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([
        getPurchasePaymentDashboard(),
        apiRequest<{ data: SupplierOption[] }>('/suppliers?page=1&ps=500').catch(() => ({
          data: [],
        })),
      ]);
      setDash(d);
      const sup = (s as { data?: SupplierOption[] })?.data ?? [];
      setSuppliers(sup);
      setRecent(d.recent || []);
    } catch {
      /* dashboard unavailable */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Supplier search (debounced) ──
  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) {
      return suppliers;
    }
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.code || '')
          .toLowerCase()
          .includes(q),
    );
  }, [suppliers, supplierQuery]);

  // ── Load supplier summary on selection ──
  const loadSummary = useCallback(async (supplierId: string) => {
    setLoadingSummary(true);
    setMessage(null);
    try {
      const s = await getSupplierPaymentSummary(supplierId);
      setSummary(s);
      setSelectedInvoices(s.dueInvoices.map((i) => i.id));
    } catch (e) {
      setMessage({ type: 'err', text: (e as Error).message || 'Could not load supplier' });
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const selectSupplier = (s: SupplierOption) => {
    setSelectedSupplier(s);
    setSupplierQuery('');
    setAmount('');
    setSelectedInvoices([]);
    loadSummary(s.id);
  };

  // ── Selection helpers ──
  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const totalSelected = useMemo(
    () =>
      Math.round(
        (summary?.dueInvoices || [])
          .filter((i) => selectedInvoices.includes(i.id))
          .reduce((s, i) => s + i.balanceAmount, 0) * 100,
      ) / 100,
    [summary, selectedInvoices],
  );

  // ── Collect ──
  const handleCollect = async () => {
    if (!selectedSupplier) {
      setMessage({ type: 'err', text: 'Select a supplier first' });
      return;
    }
    const amt = Math.round(Number(amount || 0) * 100) / 100;
    if (!(amt > 0)) {
      setMessage({ type: 'err', text: 'Enter a valid payment amount' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await collectPurchasePayment({
        supplierId: selectedSupplier.id,
        paymentDate,
        mode,
        amount: amt,
        referenceNo: referenceNo || undefined,
        bankName: bankName || undefined,
        chequeNo: chequeNo || undefined,
        notes: notes || undefined,
        invoiceIds: selectedInvoices.length > 0 ? selectedInvoices : [],
      });
      setMessage({
        type: 'ok',
        text: `Payment recorded — settled ${fmtINR(res.settledTotal)}${
          res.advanceAmount > 0 ? `, advance ${fmtINR(res.advanceAmount)}` : ''
        }`,
      });
      setAmount('');
      setReferenceNo('');
      setBankName('');
      setChequeNo('');
      setNotes('');
      await Promise.all([loadDashboard(), loadSummary(selectedSupplier.id)]);
    } catch (e) {
      setMessage({ type: 'err', text: (e as Error).message || 'Payment failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Apply advance ──
  const handleApplyAdvance = async () => {
    if (!selectedSupplier) {
      setMessage({ type: 'err', text: 'Select a supplier first' });
      return;
    }
    const amt = Math.round(Number(applyAdvanceAmt || 0) * 100) / 100;
    if (!(amt > 0) || selectedInvoices.length === 0) {
      setMessage({ type: 'err', text: 'Enter amount and select at least one invoice' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await applySupplierAdvance({
        supplierId: selectedSupplier.id,
        invoiceIds: selectedInvoices,
        amount: amt,
        paymentDate,
        notes: notes || undefined,
      });
      setMessage({ type: 'ok', text: `Advance applied — ${fmtINR(res.applied)} settled` });
      setApplyAdvanceAmt('');
      await Promise.all([loadDashboard(), loadSummary(selectedSupplier.id)]);
    } catch (e) {
      setMessage({ type: 'err', text: (e as Error).message || 'Could not apply advance' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Total Payable',
      value: fmtINR(dash?.summary?.totalPayable),
      sub: `${dash?.summary?.suppliersWithDue ?? 0} suppliers due`,
      accent: 'red' as const,
    },
    {
      label: 'Overdue',
      value: fmtINR(dash?.summary?.totalOverdue),
      sub: 'Past due date',
      accent: 'emerald' as const,
    },
    {
      label: 'Advance Balance',
      value: fmtINR(dash?.summary?.totalAdvance),
      sub: 'Paid ahead — adjust later',
      accent: 'blue' as const,
    },
    {
      label: "Today's Payments",
      value: fmtINR(dash?.summary?.todayCollection),
      sub: 'Cash / bank / UPI / cheque',
      accent: 'violet' as const,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Payment Collection</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pay supplier invoices — cash · UPI · bank · cheque · advance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── LEFT: Supplier select + due invoices ── */}
        <div className="bg-card space-y-4 rounded-xl border p-5 shadow-sm lg:col-span-3">
          {/* Supplier search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Supplier</label>
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
                placeholder="Search supplier by name or code…"
                className="w-full rounded-lg border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-emerald-500"
              />
            </div>
            {supplierQuery && filteredSuppliers.length > 0 && (
              <div className="bg-card z-10 mt-1 max-h-52 overflow-y-auto rounded-lg border shadow-lg">
                {filteredSuppliers.slice(0, 20).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSupplier(s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <span>{s.name}</span>
                    {s.code && <span className="text-muted-foreground text-xs">{s.code}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSupplier && (
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedSupplier.name}
                    {summary?.supplier?.code && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {summary.supplier.code}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Outstanding {fmtINR(summary?.profile?.outstanding)} · Advance{' '}
                    {fmtINR(summary?.profile?.advanceBalance)} · Credit{' '}
                    {summary?.profile?.creditDays ?? 0}d
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="text-muted-foreground text-xs font-medium hover:text-red-500"
                >
                  Change supplier
                </button>
              </div>
            </div>
          )}

          {/* Due invoices */}
          {loadingSummary ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
            </div>
          ) : selectedSupplier && summary ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Due Invoices</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelectedInvoices(
                        selectedInvoices.length === summary.dueInvoices.length
                          ? []
                          : summary.dueInvoices.map((i) => i.id),
                      )
                    }
                    className="text-primary text-xs font-medium"
                  >
                    {selectedInvoices.length === summary.dueInvoices.length &&
                    summary.dueInvoices.length > 0
                      ? 'Clear'
                      : 'Select all'}
                  </button>
                  <span className="text-muted-foreground text-xs">
                    Selected {fmtINR(totalSelected)}
                  </span>
                </div>
              </div>
              {summary.dueInvoices.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
                  No pending invoices — supplier is fully settled 🎉
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.dueInvoices.map((inv) => {
                    const checked = selectedInvoices.includes(inv.id);
                    return (
                      <label
                        key={inv.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors',
                          checked
                            ? 'border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'hover:bg-muted/40',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInvoice(inv.id)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <div>
                            <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                            <p className="text-muted-foreground text-xs">
                              {inv.invoiceDate} · Due {inv.dueDate || '—'}
                              {isOverdue(inv) && (
                                <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30">
                                  OVERDUE
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{fmtINR(inv.balanceAmount)}</p>
                          <p className="text-muted-foreground text-[11px]">
                            of {fmtINR(inv.grandTotal)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg border border-dashed py-8 text-center">
              <Wallet className="text-muted-foreground mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-muted-foreground text-sm">
                Select a supplier to see due invoices &amp; payment history
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Payment form + advance ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Collect payment */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Record Payment</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 flex items-center gap-1 text-xs font-medium">
                  <CalendarDays className="h-3 w-3" /> Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Mode cards */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  title={m.hint}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-all',
                    mode === m.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'hover:bg-muted/40',
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {/* Mode-specific fields */}
            {mode === 'upi' && (
              <input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="UPI transaction ID"
                className="mt-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            )}
            {mode === 'bank' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="UTR / Ref No"
                  className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}
            {mode === 'cheque' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="Cheque no"
                  className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  className="rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="mt-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />

            <Button
              onClick={handleCollect}
              disabled={submitting || !selectedSupplier}
              className="mt-4 w-full"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="mr-1.5 h-4 w-4" />
              )}
              Record Payment
            </Button>
            {!selectedSupplier && (
              <p className="text-muted-foreground mt-1.5 text-center text-[11px]">
                Select a supplier to enable payment
              </p>
            )}
          </div>

          {/* Apply advance */}
          {selectedSupplier && (summary?.profile?.advanceBalance ?? 0) > 0 && (
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold">Apply Advance</h3>
              <p className="text-muted-foreground mb-3 text-xs">
                Available advance:{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtINR(summary?.profile?.advanceBalance)}
                </span>
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={applyAdvanceAmt}
                  onChange={(e) => setApplyAdvanceAmt(e.target.value)}
                  placeholder="Amount to apply"
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <Button variant="secondary" onClick={handleApplyAdvance} disabled={submitting}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={cn(
                'rounded-lg border p-3 text-sm',
                message.type === 'ok'
                  ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'border-red-500/50 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
              )}
            >
              {message.text}
            </div>
          )}

          {/* Recent payments */}
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Recent Payments</h3>
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {recent.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.supplierName || p.supplierId}
                        {p.invoiceNumber && (
                          <span className="text-muted-foreground text-xs">
                            {' '}
                            · {p.invoiceNumber}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {p.paymentNumber} · {p.paymentDate} ·{' '}
                        {String(p.modeLabel || p.mode).toUpperCase()}
                        {p.isAdvance ? ' · ADVANCE' : ''}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{fmtINR(p.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
