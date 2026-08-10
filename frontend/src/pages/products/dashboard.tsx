import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Package,
  PackageX,
  PackagePlus,
  Plus,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { StatCard } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import {
  getProductDashboard,
  productStatusBadge,
  type ProductDashboardData,
} from '@/services/product-master.service';

function formatNumber(v: number): string {
  return (v || 0).toLocaleString('en-IN');
}

export function ProductDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProductDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getProductDashboard());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Product Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Product Master overview — उत्पाद मास्टर विहंगावलोकन
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon={<TrendingUp className="h-4 w-4" />}
            onClick={() => navigate('/products/reports')}
          >
            Reports
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/products/create')}>
            New Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={formatNumber(s?.totalProducts ?? 0)}
          hint={`${s?.todayNewProducts ?? 0} added today`}
          icon={<Package className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Active"
          value={formatNumber(s?.activeProducts ?? 0)}
          hint={`${s?.inactiveProducts ?? 0} inactive`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Low Stock"
          value={formatNumber(s?.lowStockProducts ?? 0)}
          hint={`${s?.outOfStock ?? 0} out of stock`}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Batch Products"
          value={formatNumber(s?.batchProducts ?? 0)}
          hint={`${s?.expiryNearProducts ?? 0} near expiry · ${s?.expiredProducts ?? 0} expired`}
          icon={<Boxes className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Blocked"
          value={formatNumber(s?.blockedProducts ?? 0)}
          hint={`${s?.discontinuedProducts ?? 0} discontinued`}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="red"
        />
        <StatCard
          label="Out of Stock"
          value={formatNumber(s?.outOfStock ?? 0)}
          hint="Cannot be sold until restocked"
          icon={<PackageX className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Expiry Near (≤90d)"
          value={formatNumber(s?.expiryNearProducts ?? 0)}
          hint="Batches expiring soon"
          icon={<CalendarClock className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Expired"
          value={formatNumber(s?.expiredProducts ?? 0)}
          hint="Blocked from sales"
          icon={<PackageX className="h-4 w-4" />}
          tone="red"
        />
      </div>

      {/* Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Top Selling Products
            </h2>
            <Link
              to="/products"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-500"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data?.topSelling?.length ?? 0) === 0 && (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No products yet</div>
            )}
            {data?.topSelling?.map((p) => (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {p.productCode || p.sku} · {p.categoryName || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Stock {formatNumber(p.currentStock)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${productStatusBadge(p.status)}`}
                  >
                    {p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recently added + updated */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: 'Recently Added',
            rows: data?.recentlyAdded ?? [],
            icon: <PackagePlus className="h-4 w-4" />,
          },
          {
            title: 'Recently Updated',
            rows: data?.recentlyUpdated ?? [],
            icon: <Package className="h-4 w-4" />,
          },
        ].map(({ title, rows, icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
              <span className="text-emerald-600">{icon}</span>
              {title}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No products yet</div>
              )}
              {rows.map((p) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{p.productCode || p.sku}</div>
                  </div>
                  <span className="text-xs text-slate-500">
                    ₹{(p.salesRate || 0).toLocaleString('en-IN')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
