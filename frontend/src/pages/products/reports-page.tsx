import {
  AlertTriangle,
  CalendarClock,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  PackageX,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  downloadProducts,
  formatMoney,
  formatNumber,
  getProductReport,
  productStatusBadge,
} from '@/services/product-master.service';

type ReportKey = 'master' | 'price' | 'low-stock' | 'out-of-stock' | 'expiry';

const REPORTS: { key: ReportKey; label: string; icon: React.ReactNode }[] = [
  { key: 'master', label: 'Product Master', icon: <Package className="h-4 w-4" /> },
  { key: 'price', label: 'Price Report', icon: <Wallet className="h-4 w-4" /> },
  { key: 'low-stock', label: 'Low Stock', icon: <AlertTriangle className="h-4 w-4" /> },
  { key: 'out-of-stock', label: 'Out of Stock', icon: <PackageX className="h-4 w-4" /> },
  { key: 'expiry', label: 'Expiry', icon: <CalendarClock className="h-4 w-4" /> },
];

export function ProductReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportKey>('low-stock');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getProductReport(report));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: any[] = data?.rows || [];

  const onExport = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadProducts(format);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Product Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data?.count ?? 0} records · {report}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
            onClick={() => onExport('csv')}
          >
            CSV
          </Button>
          <Button
            variant="secondary"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => onExport('xlsx')}
          >
            Excel
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Report tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setReport(r.key)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
              report === r.key
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600',
            )}
          >
            {r.icon}
            {r.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No records for this report</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code</th>
                {report === 'expiry' && <th className="px-4 py-3">Batch</th>}
                {report === 'expiry' && <th className="px-4 py-3">Expiry</th>}
                {report === 'expiry' && <th className="px-4 py-3 text-right">Days Left</th>}
                {report !== 'expiry' && <th className="px-4 py-3">Category</th>}
                {(report === 'master' || report === 'low-stock' || report === 'out-of-stock') && (
                  <th className="px-4 py-3 text-right">Stock</th>
                )}
                {(report === 'master' || report === 'price') && (
                  <th className="px-4 py-3 text-right">MRP</th>
                )}
                {(report === 'master' || report === 'price') && (
                  <th className="px-4 py-3 text-right">Selling</th>
                )}
                {report === 'price' && <th className="px-4 py-3 text-right">Wholesale</th>}
                {report === 'price' && <th className="px-4 py-3 text-right">Purchase</th>}
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r: any) => (
                <tr
                  key={r.id}
                  onClick={() =>
                    r.itemId
                      ? navigate(`/products/${r.itemId}`)
                      : r.productId
                        ? navigate(`/products/${r.productId}`)
                        : undefined
                  }
                  className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {r.name || r.batchNo}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {r.productCode || r.sku || r.batchNo}
                  </td>
                  {report === 'expiry' && (
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {r.batchNo}
                    </td>
                  )}
                  {report === 'expiry' && (
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {String(r.expDate || '').slice(0, 10)}
                    </td>
                  )}
                  {report === 'expiry' && (
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          r.daysToExpiry < 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                        )}
                      >
                        {r.daysToExpiry < 0 ? 'Expired' : `${r.daysToExpiry}d`}
                      </span>
                    </td>
                  )}
                  {report !== 'expiry' && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {r.categoryName || '—'}
                    </td>
                  )}
                  {(report === 'master' || report === 'low-stock' || report === 'out-of-stock') && (
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatNumber(r.currentStock)}
                    </td>
                  )}
                  {(report === 'master' || report === 'price') && (
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(r.mrp)}
                    </td>
                  )}
                  {(report === 'master' || report === 'price') && (
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatMoney(r.salesRate)}
                    </td>
                  )}
                  {report === 'price' && (
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(r.wholesalePrice)}
                    </td>
                  )}
                  {report === 'price' && (
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(r.purchaseRate)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        productStatusBadge(r.status || 'active'),
                      )}
                    >
                      {r.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
