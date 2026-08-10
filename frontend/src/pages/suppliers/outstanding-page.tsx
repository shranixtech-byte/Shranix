import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PartyAvatar, SelectInput, StatusBadge, TextInput } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSupplierOutstanding } from '@/services/supplier-master.service';

const PAGE_SIZE = 25;

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function SupplierOutstandingPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{
    totalPayable: number;
    totalOverdue: number;
    suppliers: number;
  }>({ totalPayable: 0, totalOverdue: 0, suppliers: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSupplierOutstanding({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      setRows(res.data || []);
      setTotal(res.total || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/suppliers')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Supplier Outstanding
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Payables from unpaid purchase invoices · पुरवठादार थकबाकी
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600/80 dark:text-red-300">
            Total Payable
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-red-700 dark:text-red-200">
            {formatCurrency(summary.totalPayable)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600/80 dark:text-amber-300">
            Overdue
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-200">
            {formatCurrency(summary.totalOverdue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Suppliers with dues
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {summary.suppliers}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            type="text"
            placeholder="Search supplier name, code, mobile, GSTIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <SelectInput
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </SelectInput>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Credit Limit</th>
                <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                <th className="px-4 py-3 text-right font-semibold">Overdue</th>
                <th className="px-4 py-3 text-center font-semibold">Open Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No outstanding payables
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      All supplier invoices are settled 🎉
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-700/30"
                    onClick={() => navigate(`/suppliers/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PartyAvatar name={r.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-400">{r.mobile || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {r.code || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.creditLimit)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {formatCurrency(r.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={cn(
                          'font-medium',
                          r.overdueAmount > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400',
                        )}
                      >
                        {formatCurrency(r.overdueAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {r.openInvoices}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages} · {total} suppliers
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="h-3.5 w-3.5" />}
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
