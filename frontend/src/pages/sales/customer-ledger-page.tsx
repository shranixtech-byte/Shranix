// ═════════════════════════════════════════════════════════
// CUSTOMER LEDGER 360° (Phase 5)
// Ek customer par click → pura document chain:
// Quotation → Sales Order → Delivery Challan → Invoice →
// Payment → Outstanding → Ledger (running balance).
// ═════════════════════════════════════════════════════════

import {
  ArrowRight,
  Banknote,
  FileSearch,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  TrendingDown,
  Truck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';
import { getCustomerLedgerDetail } from '@/services/sales-reports.service';

const fmtINR = (n: number | undefined | null) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d?: string | null) => {
  if (!d) {
    return '—';
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toLocaleDateString('en-IN');
};

// ── Status badge ──────────────────────────────────────────
const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pending: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  under_review: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  converted: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  final: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  lost: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  dispatched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  invoiced: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
        statusStyles[status] || statusStyles.draft,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: 'red' | 'green' | 'blue' | 'violet' | 'amber' | 'emerald';
}) {
  const accents = {
    red: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-900/10',
    blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
    violet: 'border-l-violet-500 bg-violet-50 dark:bg-violet-900/10',
    amber: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
    emerald: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10',
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
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Chain node ────────────────────────────────────────────
function ChainNode({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[110px] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-all duration-200',
        active
          ? 'border-emerald-500 bg-emerald-50 shadow-md dark:border-emerald-600 dark:bg-emerald-900/20'
          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg',
          active
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
        )}
      >
        {icon}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </button>
  );
}

// ═════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════
type Tab = 'documents' | 'payments' | 'ledger';

export function CustomerLedgerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectId = searchParams.get('customerId') || '';

  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState<{ id: string; name: string }[]>([]);
  const [custSearching, setCustSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customerId, setCustomerId] = useState(preselectId);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('documents');
  const [docFilter, setDocFilter] = useState<string>('all');

  // ── Preselect from ?customerId= (customers page "Ledger" click) ──
  useEffect(() => {
    if (preselectId) {
      setCustomerId(preselectId);
    }
  }, [preselectId]);

  // ── Load detail ─────────────────────────────────────────
  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await getCustomerLedgerDetail(id);
      setData(d);
    } catch (err) {
      setError((err as Error).message || 'Customer ledger load nahi hua');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerId) {
      void load(customerId);
    }
  }, [customerId, load]);

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

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    setDropdownOpen(false);
    setCustQuery('');
    setSearchParams({ customerId: id }, { replace: true });
    void load(id);
  };

  // ── Derived ─────────────────────────────────────────────
  const d = data || {};
  const customer = d.customer || {};
  const profile = d.profile || {};
  const summary = d.summary || {};
  const outstanding = d.outstanding || {};

  const chainDocs = useMemo(() => {
    const docs: any[] = [];
    (d.quotations || []).forEach((q: any) =>
      docs.push({ ...q, _type: 'quotation', _date: q.date, _amount: q.grandTotal }),
    );
    (d.orders || []).forEach((o: any) =>
      docs.push({ ...o, _type: 'order', _date: o.date, _amount: o.grandTotal }),
    );
    (d.challans || []).forEach((c: any) =>
      docs.push({ ...c, _type: 'challan', _date: c.date, _amount: c.totalAmount }),
    );
    (d.invoices || []).forEach((i: any) =>
      docs.push({ ...i, _type: 'invoice', _date: i.date, _amount: i.grandTotal }),
    );
    (d.payments || []).forEach((p: any) =>
      docs.push({ ...p, _type: 'payment', _date: p.date, _amount: p.amount }),
    );
    (d.returns || []).forEach((r: any) =>
      docs.push({ ...r, _type: 'return', _date: r.date, _amount: r.grandTotal }),
    );
    (d.creditNotes || []).forEach((c: any) =>
      docs.push({ ...c, _type: 'credit_note', _date: c.date, _amount: c.returnAmount }),
    );
    return docs.sort(
      (a, b) =>
        String(a._date).localeCompare(String(b._date)) ||
        String(a.documentNumber).localeCompare(String(b.documentNumber)),
    );
  }, [d]);

  const filteredDocs = useMemo(
    () => (docFilter === 'all' ? chainDocs : chainDocs.filter((x) => x._type === docFilter)),
    [chainDocs, docFilter],
  );

  const DOC_META: Record<string, { label: string; icon: React.ReactNode; chip: string }> = {
    quotation: {
      label: 'Quotation',
      icon: <FileSearch className="h-4 w-4" />,
      chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
    order: {
      label: 'Sales Order',
      icon: <ShoppingCart className="h-4 w-4" />,
      chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    challan: {
      label: 'Delivery Challan',
      icon: <Truck className="h-4 w-4" />,
      chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    invoice: {
      label: 'Invoice',
      icon: <FileText className="h-4 w-4" />,
      chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    },
    payment: {
      label: 'Payment',
      icon: <Banknote className="h-4 w-4" />,
      chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    return: {
      label: 'Sales Return',
      icon: <TrendingDown className="h-4 w-4" />,
      chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    },
    credit_note: {
      label: 'Credit Note',
      icon: <TrendingDown className="h-4 w-4" />,
      chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    },
  };

  const renderDocRow = (doc: any) => {
    const meta = DOC_META[doc._type] || {
      label: doc._type,
      icon: <FileText className="h-4 w-4" />,
      chip: '',
    };
    const chainRef =
      (doc._type === 'order' && doc.quotationNumber && `From ${doc.quotationNumber}`) ||
      (doc._type === 'challan' && doc.orderNumber && `From ${doc.orderNumber}`) ||
      (doc._type === 'invoice' &&
        (doc.challanNumber
          ? `Via ${doc.challanNumber}`
          : doc.orderNumber
            ? `From ${doc.orderNumber}`
            : '')) ||
      (doc._type === 'payment' &&
        (doc.isAdvance ? 'Advance' : doc.referenceNo ? doc.referenceNo : '')) ||
      (doc._type === 'return' && (doc.creditNoteNo ? `CN ${doc.creditNoteNo}` : '')) ||
      (doc._type === 'credit_note' &&
        (doc.originalInvoiceNumber ? `Inv ${doc.originalInvoiceNumber}` : '')) ||
      '';
    return (
      <tr
        key={`${doc._type}-${doc.id}`}
        className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
      >
        <td className="px-4 py-2.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              meta.chip,
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
        </td>
        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
          {doc.documentNumber}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
          {fmtDate(doc._date)}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">{chainRef}</td>
        <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {doc._type === 'payment' || doc._type === 'advance' ? (
            <span className="text-emerald-600 dark:text-emerald-400">+{fmtINR(doc._amount)}</span>
          ) : (
            fmtINR(doc._amount)
          )}
        </td>
        <td className="px-3 py-2.5 text-right">
          <StatusBadge status={doc.status} />
        </td>
      </tr>
    );
  };

  const agingBuckets = [
    { label: '0-30 Days', value: outstanding.aging?.['0-30'] || 0, bar: 'bg-green-500' },
    { label: '31-60 Days', value: outstanding.aging?.['31-60'] || 0, bar: 'bg-yellow-500' },
    { label: '61-90 Days', value: outstanding.aging?.['61-90'] || 0, bar: 'bg-orange-500' },
    { label: '90+ Days', value: outstanding.aging?.['90+'] || 0, bar: 'bg-red-500' },
  ];
  const maxAging = Math.max(1, ...agingBuckets.map((a) => a.value));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Ledger</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            एका Customer वर क्लिक करा — पूर्ण व्यवहार साखळी: Quotation → Order → Challan → Invoice →
            Payment → Outstanding → Ledger
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => customerId && void load(customerId)}
          disabled={!customerId}
        >
          Refresh
        </Button>
      </div>

      {/* Customer picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={custQuery}
            onChange={(e) => {
              setCustQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Customer शोधा (नाव/मोबाईल/GSTIN)..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {custSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
          )}
          {dropdownOpen && custResults.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800">
              {custResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCustomer(c.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-900/20"
                >
                  <Search className="h-3 w-3 text-slate-300" />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected customer strip */}
        {customer.id && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/10">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{customer.name}</p>
            {customer.code && (
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {customer.code}
              </span>
            )}
            {customer.mobile && (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                📱 {customer.mobile}
              </span>
            )}
            {customer.gstin && (
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                GST: {customer.gstin}
              </span>
            )}
            {customer.email && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                ✉ {customer.email}
              </span>
            )}
            {profile.isBlocked && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                🚫 Blocked: {profile.blockReason || ''}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Customer ledger load होत आहे...
        </div>
      )}

      {!loading && !error && !customer.id && (
        <p className="py-16 text-center text-sm text-slate-400">
          ⬆️ Customer शोधून त्याचा संपूर्ण व्यवहार इतिहास पहा
        </p>
      )}

      {!loading && customer.id && !error && (
        <>
          {/* Document chain */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Document Chain — कागदपत्र साखळी
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ChainNode
                icon={<FileSearch className="h-4 w-4" />}
                label="Quotation"
                value={String(summary.quotations || 0)}
                active={docFilter === 'quotation'}
                onClick={() => {
                  setDocFilter('quotation');
                  setTab('documents');
                }}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <ChainNode
                icon={<ShoppingCart className="h-4 w-4" />}
                label="Sales Order"
                value={String(summary.orders || 0)}
                active={docFilter === 'order'}
                onClick={() => {
                  setDocFilter('order');
                  setTab('documents');
                }}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <ChainNode
                icon={<Truck className="h-4 w-4" />}
                label="Delivery"
                value={String(summary.challans || 0)}
                active={docFilter === 'challan'}
                onClick={() => {
                  setDocFilter('challan');
                  setTab('documents');
                }}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <ChainNode
                icon={<FileText className="h-4 w-4" />}
                label="Invoice"
                value={String(summary.invoices || 0)}
                active={docFilter === 'invoice'}
                onClick={() => {
                  setDocFilter('invoice');
                  setTab('documents');
                }}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <ChainNode
                icon={<Banknote className="h-4 w-4" />}
                label="Payment"
                value={fmtINR(summary.totalPayments)}
                active={docFilter === 'payment'}
                onClick={() => {
                  setDocFilter('payment');
                  setTab('documents');
                }}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              <ChainNode
                icon={<Wallet className="h-4 w-4" />}
                label="Outstanding"
                value={fmtINR(outstanding.total)}
                active={false}
                onClick={() => setTab('ledger')}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Due (Invoices)"
              value={fmtINR(outstanding.total)}
              sub={`Overdue ${fmtINR(outstanding.overdue)}`}
              accent="red"
            />
            <StatCard
              label="Total Sales"
              value={fmtINR(summary.totalSales)}
              sub={`${summary.invoices} invoices`}
              accent="blue"
            />
            <StatCard
              label="Total Paid"
              value={fmtINR(summary.totalPaid)}
              sub={`${summary.payments} receipts`}
              accent="green"
            />
            <StatCard
              label="Advance"
              value={fmtINR(summary.totalAdvance)}
              sub={`Balance ${fmtINR(profile.advanceBalance)}`}
              accent="amber"
            />
            <StatCard
              label="Returns"
              value={fmtINR(summary.totalReturns)}
              sub={`+ ${fmtINR(summary.totalCreditNotes)} CN`}
              accent="violet"
            />
            <StatCard
              label="Credit Limit"
              value={fmtINR(profile.creditLimit)}
              sub={`Used ${profile.creditLimit ? Math.round((Number(profile.outstanding || 0) / profile.creditLimit) * 100) : 0}%`}
              accent="emerald"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {(
              [
                { key: 'documents', label: `📄 Documents (${chainDocs.length})` },
                { key: 'payments', label: `💳 Payments (${summary.payments || 0})` },
                { key: 'ledger', label: '📒 Ledger' },
              ] as { key: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                  tab === t.key
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── DOCUMENTS TAB ── */}
          {tab === 'documents' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                {[
                  ['all', 'All'],
                  ['quotation', 'Quotations'],
                  ['order', 'Orders'],
                  ['challan', 'Challans'],
                  ['invoice', 'Invoices'],
                  ['payment', 'Payments'],
                  ['return', 'Returns'],
                  ['credit_note', 'Credit Notes'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setDocFilter(key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold transition-all',
                      docFilter === key
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700">
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Document#</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Chain Ref</th>
                      <th className="px-3 py-2 text-right font-semibold">Amount</th>
                      <th className="px-3 py-2 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(renderDocRow)}
                    {filteredDocs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                          Is filter mein koi document nahi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PAYMENTS TAB ── */}
          {tab === 'payments' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h2 className="text-sm font-bold">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700">
                      <th className="px-4 py-2 font-semibold">Receipt</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Mode</th>
                      <th className="px-3 py-2 font-semibold">Reference</th>
                      <th className="px-3 py-2 text-right font-semibold">Amount</th>
                      <th className="px-3 py-2 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.payments || []).map((p: any) => (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {p.paymentNumber}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                          {fmtDate(p.date)}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {p.mode === 'cash' ? (
                              <Banknote className="h-3 w-3" />
                            ) : p.mode === 'upi' ? (
                              <Smartphone className="h-3 w-3" />
                            ) : p.mode === 'cheque' ? (
                              <FileText className="h-3 w-3" />
                            ) : (
                              <Landmark className="h-3 w-3" />
                            )}
                            {p.mode}
                            {p.isAdvance ? ' · Advance' : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                          {p.referenceNo || p.chequeNo || p.bankName || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{fmtINR(p.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                    {(d.payments || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                          Abhi tak koi payment record nahi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LEDGER TAB ── */}
          {tab === 'ledger' && (
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Aging */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-sm font-bold">Ageing Analysis</h2>
                <p className="text-[11px] text-slate-400">Due date ke hisaab se outstanding</p>
                <div className="mt-4 space-y-3">
                  {agingBuckets.map((a) => (
                    <div key={a.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {a.label}
                        </span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {fmtINR(a.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={cn('h-full rounded-full transition-all', a.bar)}
                          style={{ width: `${(a.value / maxAging) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center dark:bg-red-900/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">
                    Total Outstanding
                  </p>
                  <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
                    {fmtINR(outstanding.total)}
                  </p>
                </div>
              </div>

              {/* Running ledger */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <h2 className="text-sm font-bold">Running Ledger</h2>
                    <p className="text-[11px] text-slate-400">
                      Invoice = debit · Payment/Return/CN = credit · {customer.name} cha balance
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    Closing {fmtINR((d.ledger || [])[d.ledger?.length - 1]?.balance)}
                  </span>
                </div>
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800">
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-700">
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Document#</th>
                        <th className="px-3 py-2 font-semibold">Reference</th>
                        <th className="px-3 py-2 text-right font-semibold">Debit</th>
                        <th className="px-3 py-2 text-right font-semibold">Credit</th>
                        <th className="px-3 py-2 text-right font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.ledger || []).map((row: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-700/50 dark:hover:bg-slate-700/20"
                        >
                          <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                            {fmtDate(row.date)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                              {row.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {row.documentNumber}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
                            {row.reference || '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-slate-700 dark:text-slate-200">
                            {row.debit ? fmtINR(row.debit) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                            {row.credit ? fmtINR(row.credit) : '—'}
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right text-xs font-bold tabular-nums',
                              row.balance > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400',
                            )}
                          >
                            {fmtINR(row.balance)}
                          </td>
                        </tr>
                      ))}
                      {(d.ledger || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                            Koi ledger entry nahi
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Credit profile strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Credit Profile
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Limit{' '}
              <b className="text-slate-900 dark:text-slate-100">{fmtINR(profile.creditLimit)}</b>
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Credit Used <b className="text-red-600">{fmtINR(profile.outstanding)}</b>
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Available <b className="text-emerald-600">{fmtINR(profile.availableCredit)}</b>
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Advance <b className="text-blue-600">{fmtINR(profile.advanceBalance)}</b>
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Credit Days{' '}
              <b className="text-slate-900 dark:text-slate-100">{profile.creditDays}d</b>
            </span>
            {profile.lastPaymentDate && (
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Last Payment{' '}
                <b className="text-slate-900 dark:text-slate-100">
                  {fmtDate(profile.lastPaymentDate)}
                </b>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
