// ═════════════════════════════════════════════════════════
// PAYMENT COLLECTION (Phase 4)
// Invoice → Payment: Cash · UPI · Bank · Cheque · Advance
// Due · Outstanding sab yahin ek jagah — customer select karo,
// due invoices par amount allocate karo, mode choose karke collect.
// Overpayment → auto advance. Advance balance → invoice par apply.
// ═════════════════════════════════════════════════════════

import {
  Banknote,
  CalendarDays,
  ChevronDown,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  Wallet,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import {
  applyAdvance,
  collectPayment,
  getCustomerPaymentSummary,
  getPaymentDashboard,
  type CustomerPaymentSummary,
  type PaymentMode,
  type PaymentRecord,
} from '@/services/payment-collection.service';

const fmtINR = (n: number | undefined | null) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split('T')[0];

function isOverdue(inv: {
  dueDate: string | null;
  invoiceDate: string;
  balanceAmount: number;
}): boolean {
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
  value: Exclude<PaymentMode, 'advance'>;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    value: 'cash',
    label: 'Cash',
    icon: <Banknote className="h-4 w-4" />,
    hint: 'Hard cash received',
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
    hint: 'Cheque received',
  },
];

// ═════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════
export function PaymentCollectionPage() {
  const [searchParams] = useSearchParams();
  const preselectInvoiceId = searchParams.get('invoiceId') || '';

  const [dashboard, setDashboard] = useState<{ summary: any; recent: PaymentRecord[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // Customer picker
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState<{ id: string; name: string }[]>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [summary, setSummary] = useState<CustomerPaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Selected invoices for payment
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Payment form
  const [mode, setMode] = useState<Exclude<PaymentMode, 'advance'>>('cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [referenceNo, setReferenceNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [notes, setNotes] = useState('');
  const [asAdvance, setAsAdvance] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Advance apply
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [applyingAdvance, setApplyingAdvance] = useState(false);

  // ── Dashboard load ──────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const d = await getPaymentDashboard();
      setDashboard(d);
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // ── Preselect invoice from query param (invoice list "Collect" click) ──
  useEffect(() => {
    if (preselectInvoiceId) {
      setAsAdvance(false);
      setSelectedIds([preselectInvoiceId]);
      // Customer derive karne ke liye invoice fetch karo
      apiRequest<unknown>(`/sales/invoices/${preselectInvoiceId}`)
        .then((res) => {
          const inv = (res as { data?: any })?.data ?? res;
          const cid = inv?.customerId;
          if (!cid) {
            return;
          }
          apiRequest<unknown>(`/customers/${cid}`)
            .then((c) => {
              const record = (c as { data?: any })?.data ?? c;
              setSelectedCustomer({ id: cid, name: record?.partyId || cid });
            })
            .catch(() => setSelectedCustomer({ id: cid, name: cid }))
            .finally(() => {
              // Due invoices + advance balance bhi load karo — nahi to page khali dikhega
              void loadSummary(cid);
            });
        })
        .catch(() => {
          /* invoice not found — ignore */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectInvoiceId]);

  // ── Customer search (debounced) ─────────────────────────
  useEffect(() => {
    const q = custQuery.trim();
    if (q.length < 2) {
      setCustResults([]);
      return;
    }
    let cancelled = false;
    setCustSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiRequest<unknown>(`/customers?search=${encodeURIComponent(q)}&ps=8`);
        const rows = ((res as any)?.data?.data ?? (res as any)?.data ?? []) as any[];
        if (!cancelled) {
          setCustResults(rows.map((r) => ({ id: r.id, name: r.partyId || r.name || r.id })));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setCustSearching(false);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [custQuery]);

  // ── Customer summary load ───────────────────────────────
  const loadSummary = useCallback(async (customerId: string) => {
    setSummaryLoading(true);
    try {
      const s = await getCustomerPaymentSummary(customerId);
      setSummary(s);
      // Preselect all due invoices by default
      if (s.dueInvoices.length > 0) {
        setSelectedIds(
          preselectInvoiceId && s.dueInvoices.some((i) => i.id === preselectInvoiceId)
            ? [preselectInvoiceId]
            : s.dueInvoices.map((i) => i.id),
        );
      }
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message || 'Customer load nahi hua' });
    } finally {
      setSummaryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickCustomer = (c: { id: string; name: string }) => {
    setSelectedCustomer(c);
    setDropdownOpen(false);
    setCustQuery('');
    setMessage(null);
    // Naye customer par switch karte waqt purane preselect ke invoice IDs saaf karo
    setSelectedIds([]);
    void loadSummary(c.id);
  };

  // ── Totals ──────────────────────────────────────────────
  const selectedTotal = useMemo(
    () =>
      (summary?.dueInvoices || [])
        .filter((i) => selectedIds.includes(i.id))
        .reduce((s, i) => s + Number(i.balanceAmount || 0), 0),
    [summary, selectedIds],
  );

  const toggleInvoice = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ── Collect ─────────────────────────────────────────────
  const handleCollect = async () => {
    if (!selectedCustomer) {
      setMessage({ type: 'err', text: 'Pehle customer select karo' });
      return;
    }
    const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
    if (!(amt > 0)) {
      setMessage({ type: 'err', text: 'Payment amount daalo' });
      return;
    }
    setCollecting(true);
    setMessage(null);
    try {
      const res = await collectPayment({
        customerId: selectedCustomer.id,
        paymentDate,
        mode,
        amount: amt,
        referenceNo: referenceNo.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeNo: chequeNo.trim() || undefined,
        chequeDate: chequeDate || undefined,
        notes: notes.trim() || undefined,
        invoiceIds: asAdvance ? [] : selectedIds,
      });
      setMessage({
        type: 'ok',
        text:
          res.advanceAmount > 0
            ? `✅ ₹${fmtINR(res.settledTotal)} invoices par laga + ₹${fmtINR(res.advanceAmount)} advance hua (${res.payments[0]?.paymentNumber || ''})`
            : `✅ Payment record ho gaya — ₹${fmtINR(res.settledTotal)} (${res.payments[0]?.paymentNumber || ''})`,
      });
      setAmount('');
      setReferenceNo('');
      setBankName('');
      setChequeNo('');
      setNotes('');
      setAsAdvance(false);
      await loadSummary(selectedCustomer.id);
      void loadDashboard();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message || 'Payment fail hua' });
    } finally {
      setCollecting(false);
    }
  };

  // ── Apply advance ───────────────────────────────────────
  const handleApplyAdvance = async () => {
    if (!selectedCustomer || !summary) {
      return;
    }
    const amt = Math.round((parseFloat(advanceAmount) || 0) * 100) / 100;
    if (!(amt > 0)) {
      setMessage({ type: 'err', text: 'Advance amount daalo' });
      return;
    }
    if (selectedIds.length === 0) {
      setMessage({ type: 'err', text: 'Advance lagane ke liye invoice select karo' });
      return;
    }
    setApplyingAdvance(true);
    setMessage(null);
    try {
      const res = await applyAdvance({
        customerId: selectedCustomer.id,
        invoiceIds: selectedIds,
        amount: amt,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      setMessage({ type: 'ok', text: `✅ Advance se ₹${fmtINR(res.applied)} settle hua` });
      setAdvanceAmount('');
      await loadSummary(selectedCustomer.id);
      void loadDashboard();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message || 'Advance apply fail hua' });
    } finally {
      setApplyingAdvance(false);
    }
  };

  // ── Render ──────────────────────────────────────────────
  const summaryCards = dashboard?.summary;
  const recent = dashboard?.recent || [];
  const profile = summary?.profile;
  const advanceAvailable = Number(profile?.advanceBalance || 0) > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Collection</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Invoice → Payment — Cash · UPI · Bank · Cheque · Advance
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            void loadDashboard();
            if (selectedCustomer) {
              void loadSummary(selectedCustomer.id);
            }
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Dashboard load ho raha hai...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Outstanding"
            value={fmtINR(summaryCards?.totalOutstanding)}
            accent="red"
            sub={`${summaryCards?.customersWithDue ?? 0} customers par due`}
          />
          <StatCard
            label="Overdue"
            value={fmtINR(summaryCards?.totalOverdue)}
            accent="violet"
            sub="Due date nikal chuki hai"
          />
          <StatCard
            label="Customer Advance"
            value={fmtINR(summaryCards?.totalAdvance)}
            accent="blue"
            sub="Advance me liya hua paisa"
          />
          <StatCard
            label="Today's Collection"
            value={fmtINR(summaryCards?.todayCollection)}
            accent="emerald"
            sub={`${recent.length ? 'Aaj ka total' : 'Aaj tak koi payment nahi'}`}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        {/* ════ LEFT: Customer + due invoices + collect ════ */}
        <div className="space-y-4 xl:col-span-3">
          {/* Customer picker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Customer (due / outstanding dekho)
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={custQuery}
                onChange={(e) => {
                  setCustQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Customer ka naam type karo..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {custSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
              {dropdownOpen && custResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
                  {custResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-900/20"
                    >
                      <ChevronDown className="h-3 w-3 -rotate-90 text-slate-300" />
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected customer strip */}
            {selectedCustomer && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-900/10">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {selectedCustomer.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Outstanding {fmtINR(profile?.outstanding)} · Advance{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        advanceAvailable ? 'text-emerald-600' : 'text-slate-400',
                      )}
                    >
                      {fmtINR(profile?.advanceBalance)}
                    </span>
                    {profile?.overdueAmount ? ` · Overdue ${fmtINR(profile.overdueAmount)}` : ''}
                  </p>
                </div>
                {advanceAvailable && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="Advance amount"
                      className="h-8 w-32 rounded-lg border border-emerald-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-emerald-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      disabled={applyingAdvance || !advanceAmount}
                      onClick={() => void handleApplyAdvance()}
                    >
                      {applyingAdvance ? 'Applying...' : 'Apply Advance'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Due invoices */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Due Invoices
                </h2>
                <p className="text-[11px] text-slate-400">
                  {selectedCustomer
                    ? 'Select karo jin par payment lagana hai'
                    : 'Customer select karke due bills dekho'}
                </p>
              </div>
              {summary && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Total Due {fmtINR(summary.totalDue)}
                </span>
              )}
            </div>

            {summaryLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Due invoices load ho rahe hain...
              </div>
            )}

            {!summaryLoading && !selectedCustomer && (
              <p className="py-10 text-center text-sm text-slate-400">
                ⬆️ Customer search karke shuru karo
              </p>
            )}

            {!summaryLoading && selectedCustomer && (summary?.dueInvoices.length ?? 0) === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  🎉 Is customer ka koi due invoice nahi hai
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Advance lene ke liye neeche "Record as Advance" on karo
                </p>
              </div>
            )}

            {!summaryLoading && (summary?.dueInvoices.length ?? 0) > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700">
                      <th className="px-4 py-2 font-semibold">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-emerald-500"
                          checked={selectedIds.length === (summary?.dueInvoices.length ?? 0)}
                          onChange={(e) => {
                            const all = (summary?.dueInvoices || []).map((i) => i.id);
                            setSelectedIds(e.target.checked ? all : []);
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 font-semibold">Invoice</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Due</th>
                      <th className="px-3 py-2 text-right font-semibold">Total</th>
                      <th className="px-3 py-2 text-right font-semibold">Paid</th>
                      <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.dueInvoices.map((inv) => {
                      const checked = selectedIds.includes(inv.id);
                      const overdue = isOverdue(inv);
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => toggleInvoice(inv.id)}
                          className={cn(
                            'cursor-pointer border-b border-slate-50 transition-colors hover:bg-emerald-50/50 dark:border-slate-700/50 dark:hover:bg-emerald-900/10',
                            checked && 'bg-emerald-50/60 dark:bg-emerald-900/10',
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-emerald-500"
                              checked={checked}
                              onChange={() => toggleInvoice(inv.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                            {inv.invoiceDate}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {inv.dueDate ? (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  overdue
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                                )}
                              >
                                <CalendarDays className="h-3 w-3" />
                                {inv.dueDate}
                                {overdue && ' · Overdue'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                            {fmtINR(inv.grandTotal)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                            {fmtINR(inv.paidAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {fmtINR(inv.balanceAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {selectedTotal > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-700/30">
                        <td
                          colSpan={6}
                          className="px-4 py-2 text-right text-xs font-semibold text-slate-500"
                        >
                          Selected Balance
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {fmtINR(selectedTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT: Payment form + history ════ */}
        <div className="space-y-4 xl:col-span-2">
          {/* Collect form */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-sm dark:border-emerald-800 dark:from-emerald-900/10 dark:to-slate-800/40">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              💰 Collect Payment
            </h2>
            <p className="text-[11px] text-slate-400">
              Mode choose karo, amount daalo, Collect dabao
            </p>

            {/* Mode cards */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  title={m.hint}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition-all',
                    mode === m.value
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Mode-specific fields */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mode === 'upi' && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    UPI Transaction ID
                  </label>
                  <input
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="jaise: 410235987654"
                    className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
              {mode === 'bank' && (
                <>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Bank Reference / UTR
                    </label>
                    <input
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="NEFT/RTGS/UPI UTR number"
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Bank Name
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="jaise: HDFC"
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Transfer Date
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}
              {mode === 'cheque' && (
                <>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Cheque No *
                    </label>
                    <input
                      value={chequeNo}
                      onChange={(e) => setChequeNo(e.target.value)}
                      placeholder="Cheque number"
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Bank Name
                    </label>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Cheque kis bank ka"
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}
              {mode === 'cash' && (
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Reference (optional)
                  </label>
                  <input
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="kuch note karna ho to"
                    className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="mt-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Notes
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="optional"
                className="mt-0.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Advance toggle */}
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
              <input
                type="checkbox"
                checked={asAdvance}
                onChange={(e) => setAsAdvance(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Record as <b>Advance</b> (koi invoice select nahi — customer ke paas credit rahega)
              </span>
            </label>

            {message && (
              <p
                className={cn(
                  'mt-3 rounded-lg px-3 py-2 text-xs font-medium',
                  message.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
                )}
              >
                {message.text}
              </p>
            )}

            <Button
              variant="primary"
              className="mt-3 h-10 w-full text-sm"
              icon={
                collecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )
              }
              disabled={collecting || !selectedCustomer || !amount}
              onClick={() => void handleCollect()}
            >
              {collecting
                ? 'Collecting...'
                : `Collect ${fmtINR(selectedTotal || parseFloat(amount) || 0)}`}
            </Button>
            {selectedIds.length > 0 && selectedTotal > 0 && !asAdvance && (
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Selected {selectedIds.length} invoice(s) · Balance {fmtINR(selectedTotal)} · Amount
                zyada dala to excess advance banega
              </p>
            )}
          </div>

          {/* Payment history */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Payment History
              </h2>
              <span className="text-[10px] text-slate-400">selected customer ke</span>
            </div>
            <div className="max-h-72 overflow-auto">
              {!selectedCustomer && (
                <p className="py-8 text-center text-xs text-slate-400">Customer select karo</p>
              )}
              {selectedCustomer && (summary?.payments.length ?? 0) === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">Abhi tak koi payment nahi</p>
              )}
              {(summary?.payments || []).slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0 dark:border-slate-700/50"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs',
                      p.mode === 'cash' &&
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      p.mode === 'upi' &&
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      (p.mode === 'bank' || p.mode === 'cheque') &&
                        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                      p.isAdvance &&
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                    )}
                  >
                    {p.isAdvance ? (
                      <Wallet className="h-4 w-4" />
                    ) : p.mode === 'cash' ? (
                      <Banknote className="h-4 w-4" />
                    ) : p.mode === 'upi' ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Landmark className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {p.paymentNumber}
                      <span className="ml-2 text-[10px] font-normal text-slate-400">
                        {p.modeLabel || p.mode}
                        {p.isAdvance
                          ? ' · Advance'
                          : p.invoiceNumber
                            ? ` · ${p.invoiceNumber}`
                            : ''}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {p.paymentDate}
                      {p.referenceNo ? ` · ${p.referenceNo}` : ''}
                      {p.chequeNo ? ` · Chq ${p.chequeNo}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{fmtINR(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent payments (all customers) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Payments</h2>
          <span className="text-[10px] text-slate-400">sabhi customers ke</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700">
                <th className="px-4 py-2 font-semibold">Receipt</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Customer</th>
                <th className="px-3 py-2 font-semibold">Mode</th>
                <th className="px-3 py-2 font-semibold">Invoice</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                >
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {p.paymentNumber}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {p.paymentDate}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {p.customerName || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {p.modeLabel || p.mode}
                      {p.isAdvance ? ' · Advance' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {p.invoiceNumber || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtINR(p.amount)}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                    Abhi tak koi payment record nahi — upar collect karke shuru karo
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
