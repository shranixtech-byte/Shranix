import { Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

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
          <p className="text-muted-foreground mt-1 text-sm">
            Customer-wise outstanding with aging analysis
          </p>
        </div>
        <div className="bg-card rounded-lg border px-4 py-2 text-right">
          <p className="text-muted-foreground text-[10px] uppercase">Total Outstanding</p>
          <p className="text-xl font-bold tabular-nums text-red-600">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Due Amount</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Credit Limit</th>
                  <th className="px-3 py-2.5 text-right font-semibold">0-30 Days</th>
                  <th className="px-3 py-2.5 text-right font-semibold">31-60 Days</th>
                  <th className="px-3 py-2.5 text-right font-semibold">61-90 Days</th>
                  <th className="px-3 py-2.5 text-right font-semibold">90+ Days</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row: any, i: number) => (
                  <tr key={row.customerId || i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.customerId?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-red-600">
                      {formatCurrency(row.dueAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.creditLimit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.aging0to30)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.aging31to60)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.aging61to90)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.aging90plus)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${riskColors[row.risk] || riskColors.low}`}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-muted-foreground px-3 py-8 text-center">
                      No outstanding records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
