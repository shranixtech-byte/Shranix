import { useEffect, useState, useCallback } from 'react';
import { Loader2, DollarSign, CreditCard, Landmark } from 'lucide-react';
import { getPaymentReport } from '@/services/sales-reports.service';
import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function PaymentReport() {
  const [data, setData] = useState<any>(null);
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
      const result = await getPaymentReport({
        period: filters.period !== 'this_month' ? filters.period : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mode-wise payment collection and summary</p>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Collection Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
              <p className="text-[10px] text-green-600 uppercase font-medium">Total Collected</p>
              <p className="mt-1 text-2xl font-bold text-green-700 tabular-nums">
                {formatCurrency(data.collectionSummary?.totalCollected || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-red-50 p-4 shadow-sm">
              <p className="text-[10px] text-red-600 uppercase font-medium">Total Outstanding</p>
              <p className="mt-1 text-2xl font-bold text-red-700 tabular-nums">
                {formatCurrency(data.collectionSummary?.totalOutstanding || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4 shadow-sm">
              <p className="text-[10px] text-blue-600 uppercase font-medium">Collection Rate</p>
              <p className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
                {data.collectionSummary?.collectionRate?.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Payment Mode Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Cash</p>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">{formatCurrency(data.cash?.total || 0)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{data.cash?.count || 0} transactions</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">UPI</p>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">{formatCurrency(data.upi?.total || 0)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{data.upi?.count || 0} transactions</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Card</p>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">{formatCurrency(data.card?.total || 0)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{data.card?.count || 0} transactions</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Bank Transfer</p>
                <Landmark className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">{formatCurrency(data.bank?.total || 0)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{data.bank?.count || 0} transactions</p>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Payment Status Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Count</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.paymentBreakdown || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 capitalize font-medium">{row.status}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Invoices</span>
              <span className="text-2xl font-bold tabular-nums">{data.totalInvoices || 0}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No payment data available
        </div>
      )}
    </div>
  );
}
