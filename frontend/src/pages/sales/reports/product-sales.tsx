import { Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getProductSales } from '@/services/sales-reports.service';

import { ReportFilters } from './components/ReportFilters';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function ProductSalesReport() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('salesValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
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
      const result = await getProductSales({
        page,
        pageSize,
        period: filters.period !== 'this_month' ? filters.period : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        productId: filters.productId || undefined,
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

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey] || 0;
    const vb = b[sortKey] || 0;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  function SortHeader({ label, sortKey: sk }: { label: string; sortKey: string }) {
    return (
      <th
        className="hover:text-foreground cursor-pointer select-none px-3 py-2.5 font-semibold"
        onClick={() => handleSort(sk)}
      >
        <div className="flex items-center gap-1">
          {label}
          {sortKey === sk && <span className="text-[9px]">{sortDir === 'desc' ? '▼' : '▲'}</span>}
        </div>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Sales Report</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Product-wise sales performance with profit margins
        </p>
      </div>

      <ReportFilters values={filters} onChange={setFilters} showSearch={false} />

      <div className="text-muted-foreground text-xs">{total} products</div>

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
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <SortHeader label="SKU" sortKey="sku" />
                  <SortHeader label="HSN" sortKey="hsn" />
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">Brand</th>
                  <SortHeader label="Opening" sortKey="opening" />
                  <SortHeader label="Sold" sortKey="sold" />
                  <SortHeader label="Returned" sortKey="returned" />
                  <SortHeader label="Closing" sortKey="closing" />
                  <SortHeader label="Sales Value" sortKey="salesValue" />
                  <SortHeader label="Profit" sortKey="profit" />
                  <SortHeader label="Margin %" sortKey="marginPct" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((row: any, i: number) => (
                  <tr key={row.productId || i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium">{row.productId?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{row.sku || '-'}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{row.hsn || '-'}</td>
                    <td className="px-3 py-2">{row.category?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2">{row.brand?.slice(0, 12) || '-'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.opening}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.sold}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.returned || 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.closing}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(row.salesValue)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${row.profit >= 0 ? '' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span
                        className={`${row.marginPct >= 20 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {row.marginPct?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-muted-foreground px-3 py-8 text-center">
                      No product sales data found
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
