import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getOutstandingReport } from '@/services/sales-reports.service';
import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export function OutstandingReport() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: 'this_month',
    startDate: '',
    endDate: '',
    search: '',
    customerId: '',
    productId: '',
    salesPerson: '',
    invoiceStatus: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOutstandingReport({
        page,
        pageSize,
        period: filters.period !== 'this_month' ? filters.period : undefined,
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);
  const totalOutstanding = data.reduce((s: number, r: any) => s + (r.dueAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outstanding Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">Customer-wise outstanding with aging analysis</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-right">
          <p className="text-[10px] text-muted-foreground uppercase">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600 tabular-nums">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Due Amount</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Credit Limit</th>
                  <th className="px-3 py-2.5 font-semibold text-right">0-30 Days</th>
                  <th className="px-3 py-2.5 font-semibold text-right">31-60 Days</th>
                  <th className="px-3 py-2.5 font-semibold text-right">61-90 Days</th>
                  <th className="px-3 py-2.5 font-semibold text-right">90+ Days</th>
                  <th className="px-3 py-2.5 font-semibold text-center">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row: any, i: number) => (
                  <tr key={row.customerId || i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.customerId?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-red-600">{formatCurrency(row.dueAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.creditLimit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.aging0to30)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.aging31to60)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.aging61to90)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.aging90plus)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize border ${riskColors[row.risk] || riskColors.low}`}>
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      No outstanding records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">
                Previous
              </button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
