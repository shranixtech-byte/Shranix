import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';
import { getAgeingReport } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

export function AgeingReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const r = await getAgeingReport({ page, pageSize: 50, search: search || undefined }); setData(r.data || []); setSummary(r.ageingSummary || []); setTotal(r.total || 0); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Ageing Report</h1><p className="mt-1 text-sm text-muted-foreground">Customer-wise ageing analysis with bucketed overdue amounts</p></div>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {summary.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {['0-30', '31-60', '61-90', '91-180', '180+'].map((bucket) => {
            const b = summary.find((s) => s.bucket === bucket);
            const colors: Record<string, string> = { '0-30': 'bg-green-50', '31-60': 'bg-yellow-50', '61-90': 'bg-orange-50', '91-180': 'bg-red-50', '180+': 'bg-red-100' };
            return <div key={bucket} className={`rounded-lg border p-3 text-center ${colors[bucket] || ''}`}>
              <p className="text-[10px] text-muted-foreground">{bucket} Days</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(b?.amount || 0)}</p>
              <p className="text-[10px] text-muted-foreground">{b?.count || 0} customers</p>
            </div>;
          })}
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/80"><tr>
              <th className="px-3 py-2.5 font-semibold">Customer</th><th className="px-3 py-2.5 font-semibold text-right">Limit</th>
              <th className="px-3 py-2.5 font-semibold text-right">Outstanding</th><th className="px-3 py-2.5 font-semibold text-right">Overdue</th>
              <th className="px-3 py-2.5 font-semibold text-right">Days</th><th className="px-3 py-2.5 font-semibold text-center">Risk</th><th className="px-3 py-2.5 font-semibold text-center">Warning</th>
            </tr></thead>
            <tbody className="divide-y">
              {data.map((c) => {
                const daysSincePayment = c.lastPaymentDate ? Math.floor((Date.now() - new Date(c.lastPaymentDate).getTime()) / 86400000) : 999;
                return <tr key={c.customerId} className="hover:bg-muted/50"><td className="px-3 py-2 font-medium">{c.customerName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.outstanding)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatCurrency(c.overdueAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{daysSincePayment}d</td>
                  <td className="px-3 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${c.riskCategory === 'critical' ? 'bg-red-100 text-red-700' : c.riskCategory === 'high' ? 'bg-orange-100 text-orange-700' : c.riskCategory === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.riskCategory}</span></td>
                  <td className={`px-3 py-2 text-center text-[10px] font-medium capitalize ${c.warningLevel === 'critical' ? 'text-red-600 font-bold' : c.warningLevel === 'red' ? 'text-orange-600' : c.warningLevel === 'amber' ? 'text-yellow-600' : 'text-green-600'}`}>{c.warningLevel}</td>
                </tr>;
              })}
              {data.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No data</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && <div className="flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">Previous</button>
        <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">Next</button>
      </div>}
    </div>
  );
}
