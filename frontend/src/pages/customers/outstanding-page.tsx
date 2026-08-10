import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getOutstanding, type OutstandingRow } from '@/services/customer-master.service';

import { SelectInput, StatusBadge, TextInput } from './components';

const PAGE_SIZE = 25;

function formatCurrency(v: number | undefined): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function OutstandingPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OutstandingRow[]>([]);
  const [summary, setSummary] = useState<{
    totalOutstanding: number;
    totalOverdue: number;
    totalAdvance: number;
    customers: number;
  }>({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalAdvance: 0,
    customers: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOutstanding({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
      });
      setRows(res.data || []);
      setTotal(res.total || 0);
      setSummary(
        res.summary || { totalOutstanding: 0, totalOverdue: 0, totalAdvance: 0, customers: 0 },
      );
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Outstanding
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Customer receivables — outstanding, overdue & advance balances
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate('/customers')}
        >
          Customer List
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          tone="red"
        />
        <SummaryCard
          label="Total Overdue"
          value={formatCurrency(summary.totalOverdue)}
          tone="amber"
        />
        <SummaryCard
          label="Customer Advances"
          value={formatCurrency(summary.totalAdvance)}
          tone="green"
        />
        <SummaryCard label="Customers" value={String(summary.customers)} tone="blue" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <TextInput
            type="text"
            placeholder="Search name, code, mobile, GSTIN…"
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
          className="w-36"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </SelectInput>
        <span className="text-xs text-slate-400">{total} customers with balances</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Credit Limit</th>
                <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                <th className="px-4 py-3 text-right font-semibold">Overdue</th>
                <th className="px-4 py-3 text-right font-semibold">Advance</th>
                <th className="px-4 py-3 text-right font-semibold">Available Credit</th>
                <th className="px-4 py-3 text-center font-semibold">Last Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Wallet className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No outstanding balances
                    </p>
                    <p className="mt-1 text-xs text-slate-400">All customers are settled</p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-emerald-50/40 dark:hover:bg-slate-700/30"
                    onClick={() => navigate(`/customers/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 hover:text-emerald-600 dark:text-slate-100">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.code || ''}
                        {r.mobile ? ` · ${r.mobile}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.creditLimit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          r.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400',
                        )}
                      >
                        {formatCurrency(r.outstanding)}
                      </span>
                      {r.isBlocked && r.outstanding > 0 && (
                        <span title="Blocked customer">
                          <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          r.overdueAmount > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400',
                        )}
                      >
                        {formatCurrency(r.overdueAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(r.advanceBalance)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.availableCredit)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      {r.lastPaymentDate ? new Date(r.lastPaymentDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages} · {total} customers
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

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
}) {
  const tones = {
    red: 'border-red-200 bg-red-50/60 dark:border-red-800 dark:bg-red-900/20',
    amber: 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20',
    green: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/20',
    blue: 'border-sky-200 bg-sky-50/60 dark:border-sky-800 dark:bg-sky-900/20',
  };
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', tones[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
