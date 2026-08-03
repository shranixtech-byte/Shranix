import { Loader2, Download } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

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
          <p className="text-muted-foreground mt-1 text-sm">
            GST summary, HSN-wise and rate-wise breakdown
          </p>
        </div>
        <button className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] uppercase">Taxable Value</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(data.summary?.totalTaxable || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-blue-50 p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase text-blue-600">CGST</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-blue-700">
                {formatCurrency(data.summary?.totalCgst || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase text-green-600">SGST</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
                {formatCurrency(data.summary?.totalSgst || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-purple-50 p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase text-purple-600">IGST</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-purple-700">
                {formatCurrency(data.summary?.totalIgst || 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-orange-50 p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase text-orange-600">CESS</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-orange-700">
                {formatCurrency(data.summary?.totalCess || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] uppercase">Total GST</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatCurrency(data.summary?.totalGst || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-[10px] uppercase">Invoices</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{data.invoiceCount || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card flex gap-1 rounded-lg border p-1 shadow-sm">
            {(['summary', 'hsn', 'rate'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'summary'
                  ? 'GST Summary'
                  : tab === 'hsn'
                    ? 'HSN Summary'
                    : 'GST Rate Summary'}
              </button>
            ))}
          </div>

          {/* HSN Summary Table */}
          {activeTab === 'hsn' && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">HSN</th>
                    <th className="px-3 py-2.5 font-semibold">Description</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Taxable</th>
                    <th className="px-3 py-2.5 text-right font-semibold">CGST</th>
                    <th className="px-3 py-2.5 text-right font-semibold">SGST</th>
                    <th className="px-3 py-2.5 text-right font-semibold">IGST</th>
                    <th className="px-3 py-2.5 text-right font-semibold">CESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.hsnSummary || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 font-mono font-medium">{row.hsn}</td>
                      <td className="px-3 py-2">{row.description?.slice(0, 30) || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(row.taxableAmount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-600">
                        {formatCurrency(row.cgst)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-green-600">
                        {formatCurrency(row.sgst)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-purple-600">
                        {formatCurrency(row.igst)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-orange-600">
                        {formatCurrency(row.cess)}
                      </td>
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
                <thead className="bg-muted/80 sticky top-0 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">GST Rate %</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Taxable Amount</th>
                    <th className="px-3 py-2.5 text-right font-semibold">GST Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.gstRateSummary || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-3 py-2 font-medium">{row.gstRate}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(row.taxableAmount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(row.gstAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary view */}
          {activeTab === 'summary' && (
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold">GST Summary</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-muted-foreground">Taxable Value</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(data.summary?.totalTaxable || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-blue-600">CGST</span>
                    <span className="font-medium tabular-nums text-blue-600">
                      {formatCurrency(data.summary?.totalCgst || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-green-600">SGST</span>
                    <span className="font-medium tabular-nums text-green-600">
                      {formatCurrency(data.summary?.totalSgst || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-purple-600">IGST</span>
                    <span className="font-medium tabular-nums text-purple-600">
                      {formatCurrency(data.summary?.totalIgst || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1.5 text-xs">
                    <span className="text-orange-600">CESS</span>
                    <span className="font-medium tabular-nums text-orange-600">
                      {formatCurrency(data.summary?.totalCess || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs font-bold">
                    <span>Total GST</span>
                    <span className="tabular-nums">
                      {formatCurrency(data.summary?.totalGst || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
          No GST data available for the selected period
        </div>
      )}
    </div>
  );
}
