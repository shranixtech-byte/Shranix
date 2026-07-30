import { useEffect, useState, useCallback } from 'react';
import { Loader2, Download } from 'lucide-react';
import { getGstReport } from '@/services/sales-reports.service';
import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function GstReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'hsn' | 'rate'>('summary');
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
      const result = await getGstReport({
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GST Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">GST summary, HSN-wise and rate-wise breakdown</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase">Taxable Value</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(data.summary?.totalTaxable || 0)}</p>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4 shadow-sm">
              <p className="text-[10px] text-blue-600 uppercase font-medium">CGST</p>
              <p className="mt-1 text-xl font-bold text-blue-700 tabular-nums">{formatCurrency(data.summary?.totalCgst || 0)}</p>
            </div>
            <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
              <p className="text-[10px] text-green-600 uppercase font-medium">SGST</p>
              <p className="mt-1 text-xl font-bold text-green-700 tabular-nums">{formatCurrency(data.summary?.totalSgst || 0)}</p>
            </div>
            <div className="rounded-lg border bg-purple-50 p-4 shadow-sm">
              <p className="text-[10px] text-purple-600 uppercase font-medium">IGST</p>
              <p className="mt-1 text-xl font-bold text-purple-700 tabular-nums">{formatCurrency(data.summary?.totalIgst || 0)}</p>
            </div>
            <div className="rounded-lg border bg-orange-50 p-4 shadow-sm">
              <p className="text-[10px] text-orange-600 uppercase font-medium">CESS</p>
              <p className="mt-1 text-xl font-bold text-orange-700 tabular-nums">{formatCurrency(data.summary?.totalCess || 0)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase">Total GST</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(data.summary?.totalGst || 0)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase">Invoices</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{data.invoiceCount || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border bg-card p-1 shadow-sm">
            {(['summary', 'hsn', 'rate'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'summary' ? 'GST Summary' : tab === 'hsn' ? 'HSN Summary' : 'GST Rate Summary'}
              </button>
            ))}
          </div>

          {/* HSN Summary Table */}
          {activeTab === 'hsn' && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">HSN</th>
                    <th className="px-3 py-2.5 font-semibold">Description</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Taxable</th>
                    <th className="px-3 py-2.5 font-semibold text-right">CGST</th>
                    <th className="px-3 py-2.5 font-semibold text-right">SGST</th>
                    <th className="px-3 py-2.5 font-semibold text-right">IGST</th>
                    <th className="px-3 py-2.5 font-semibold text-right">CESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.hsnSummary || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono font-medium">{row.hsn}</td>
                      <td className="px-3 py-2">{row.description?.slice(0, 30) || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-600">{formatCurrency(row.cgst)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">{formatCurrency(row.sgst)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-purple-600">{formatCurrency(row.igst)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-orange-600">{formatCurrency(row.cess)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GST Rate Summary */}
          {activeTab === 'rate' && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">GST Rate %</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Taxable Amount</th>
                    <th className="px-3 py-2.5 font-semibold text-right">GST Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.gstRateSummary || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 font-medium">{row.gstRate}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.taxableAmount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.gstAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary view */}
          {activeTab === 'summary' && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold">GST Summary</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-muted-foreground">Taxable Value</span>
                    <span className="font-medium tabular-nums">{formatCurrency(data.summary?.totalTaxable || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-blue-600">CGST</span>
                    <span className="font-medium tabular-nums text-blue-600">{formatCurrency(data.summary?.totalCgst || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-green-600">SGST</span>
                    <span className="font-medium tabular-nums text-green-600">{formatCurrency(data.summary?.totalSgst || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-purple-600">IGST</span>
                    <span className="font-medium tabular-nums text-purple-600">{formatCurrency(data.summary?.totalIgst || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-orange-600">CESS</span>
                    <span className="font-medium tabular-nums text-orange-600">{formatCurrency(data.summary?.totalCess || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-1">
                    <span>Total GST</span>
                    <span className="tabular-nums">{formatCurrency(data.summary?.totalGst || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No GST data available for the selected period
        </div>
      )}
    </div>
  );
}
