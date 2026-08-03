import { Loader2, Search } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getAgeingReport } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export function AgeingReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getAgeingReport({ page, pageSize: 50, search: search || undefined });
      setData(r.data || []);
      setSummary(r.ageingSummary || []);
      setTotal(r.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ageing Report</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Customer-wise ageing analysis with bucketed overdue amounts
        </p>
      </div>
      <div className="relative max-w-md flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="bg-background focus:ring-primary/50 w-full rounded-md border py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2"
        />
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {['0-30', '31-60', '61-90', '91-180', '180+'].map((bucket) => {
            const b = summary.find((s) => s.bucket === bucket);
            const colors: Record<string, string> = {
              '0-30': 'bg-green-50',
              '31-60': 'bg-yellow-50',
              '61-90': 'bg-orange-50',
              '91-180': 'bg-red-50',
              '180+': 'bg-red-100',
            };
            return (
              <div
                key={bucket}
                className={`rounded-lg border p-3 text-center ${colors[bucket] || ''}`}
              >
                <p className="text-muted-foreground text-[10px]">{bucket} Days</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(b?.amount || 0)}</p>
                <p className="text-muted-foreground text-[10px]">{b?.count || 0} customers</p>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/80">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 text-right font-semibold">Limit</th>
                <th className="px-3 py-2.5 text-right font-semibold">Outstanding</th>
                <th className="px-3 py-2.5 text-right font-semibold">Overdue</th>
                <th className="px-3 py-2.5 text-right font-semibold">Days</th>
                <th className="px-3 py-2.5 text-center font-semibold">Risk</th>
                <th className="px-3 py-2.5 text-center font-semibold">Warning</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((c) => {
                const daysSincePayment = c.lastPaymentDate
                  ? Math.floor((Date.now() - new Date(c.lastPaymentDate).getTime()) / 86400000)
                  : 999;
                return (
                  <tr key={c.customerId} className="hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">{c.customerName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(c.creditLimit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(c.outstanding)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-600">
                      {formatCurrency(c.overdueAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{daysSincePayment}d</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${c.riskCategory === 'critical' ? 'bg-red-100 text-red-700' : c.riskCategory === 'high' ? 'bg-orange-100 text-orange-700' : c.riskCategory === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {c.riskCategory}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-center text-[10px] font-medium capitalize ${c.warningLevel === 'critical' ? 'font-bold text-red-600' : c.warningLevel === 'red' ? 'text-orange-600' : c.warningLevel === 'amber' ? 'text-yellow-600' : 'text-green-600'}`}
                    >
                      {c.warningLevel}
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
