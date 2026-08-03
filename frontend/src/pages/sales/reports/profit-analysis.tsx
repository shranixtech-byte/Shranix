import { Loader2, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getProfitAnalysis } from '@/services/sales-reports.service';

import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function ProfitAnalysisReport() {
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
      const result = await getProfitAnalysis({
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
        <h1 className="text-2xl font-bold tracking-tight">Profit Analysis</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gross profit, net profit, margins, top products, and sales trends
        </p>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border-l-4 border-l-green-500 p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Gross Profit</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-green-600">
                {formatCurrency(data.grossProfit?.value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-blue-500 p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Net Profit</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600">
                {formatCurrency(data.netProfit?.value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-yellow-500 p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Gross Margin</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.margin?.value?.toFixed(1)}%
              </p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-purple-500 p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Net Margin</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.netMargin?.value?.toFixed(1)}%
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Total Revenue</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(data.totalRevenue?.value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Total Cost</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-red-600">
                {formatCurrency(data.totalCost?.value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Total Discount</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(data.totalDiscount?.value || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Total Tax</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(data.totalTax?.value || 0)}
              </p>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Selling Products
                </h3>
              </div>
              <div className="divide-y">
                {(data.topSellingProducts || []).slice(0, 8).map((product: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium">
                        {product.productId?.slice(0, 16) || 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="tabular-nums">{formatCurrency(product.revenue)}</span>
                      <span
                        className={`ml-2 text-[10px] ${product.marginPct >= 20 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {product.marginPct?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                {(!data.topSellingProducts || data.topSellingProducts.length === 0) && (
                  <div className="text-muted-foreground px-4 py-6 text-center text-xs">No data</div>
                )}
              </div>
            </div>

            {/* Low Margin Products */}
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Low Margin Products
                </h3>
              </div>
              <div className="divide-y">
                {(data.lowMarginProducts || []).slice(0, 8).map((product: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium">
                        {product.productId?.slice(0, 16) || 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="tabular-nums">{formatCurrency(product.revenue)}</span>
                      <span className="ml-2 text-[10px] text-red-600">
                        {product.marginPct?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
                {(!data.lowMarginProducts || data.lowMarginProducts.length === 0) && (
                  <div className="text-muted-foreground px-4 py-6 text-center text-xs">No data</div>
                )}
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-blue-500" />
                Top Customers by Profit
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                    <th className="px-3 py-2 text-right font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.topCustomers || []).slice(0, 10).map((customer: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="text-muted-foreground px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {customer.customerId?.slice(0, 16) || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(customer.revenue)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${customer.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(customer.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Trend (Monthly bar chart) */}
          <div className="bg-card rounded-lg border p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-green-500" />
              Sales Trend (Monthly)
            </h3>
            {(data.salesTrend || []).length > 0 ? (
              <div className="space-y-2">
                {(data.salesTrend || []).map((trend: any, i: number) => {
                  const maxRevenue = Math.max(
                    ...(data.salesTrend || []).map((t: any) => t.revenue || 0),
                    1,
                  );
                  const pct = ((trend.revenue || 0) / maxRevenue) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-muted-foreground w-16 text-right text-[10px]">
                        {trend.month}
                      </span>
                      <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
                        <div
                          className="h-full rounded bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-[10px] tabular-nums">
                        {formatCurrency(trend.revenue)}
                      </span>
                      <span
                        className={`w-16 text-right text-[10px] tabular-nums ${trend.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {formatCurrency(trend.profit)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No trend data available</p>
            )}
          </div>
        </>
      ) : (
        <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
          No profit analysis data available
        </div>
      )}
    </div>
  );
}
