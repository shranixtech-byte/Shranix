import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  FileText,
  ShoppingCart,
  CreditCard,
  Percent,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';

import { getSalesDashboard, type DashboardData, type ReportFilters } from '@/services/sales-reports.service';
import { ReportFilters as FilterBar } from './components/ReportFilters';

// ═════════════════════════════════════════════════════════
// KPI CARD
// ═════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

const iconMap: Record<string, React.ElementType> = {
  todaySales: ShoppingCart,
  monthSales: TrendingUp,
  outstanding: CreditCard,
  invoices: FileText,
  avgInvoice: DollarSign,
  collection: DollarSign,
  profit: TrendingUp,
  profitMargin: Percent,
  growthPercent: TrendingUp,
  totalCgst: BarChart3,
  totalSgst: BarChart3,
  totalIgst: BarChart3,
  totalCess: BarChart3,
  totalTax: BarChart3,
  totalDiscount: BarChart3,
  totalSubTotal: DollarSign,
};

function KpiCard({
  label,
  value,
  icon,
  color,
  isCurrency = true,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  isCurrency?: boolean;
}) {
  const Icon = iconMap[icon] || DollarSign;
  const displayValue = isCurrency ? formatCurrency(value) : icon === 'growthPercent' || icon === 'profitMargin'
    ? `${value.toFixed(1)}%`
    : formatNumber(value);

  return (
    <div className={`rounded-lg border-l-4 ${color} bg-card p-4 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{displayValue}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// BAR CHART (simple CSS-based)
// ═════════════════════════════════════════════════════════

function SimpleBarChart({
  data,
  xKey,
  yKey,
  title,
  height = 200,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  title: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d[yKey] || 0), 1);
  const labels = data.map((d) => {
    const s = String(d[xKey]);
    return s.length > 5 ? s.slice(-5) : s;
  });

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const val = d[yKey] || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center"
              title={`${labels[i]}: ${formatCurrency(val)}`}
            >
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700 hover:to-blue-500"
                style={{ height: `${Math.max(pct, 2)}%`, minHeight: val > 0 ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-muted-foreground truncate">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TOP LIST
// ═════════════════════════════════════════════════════════

function TopList({
  title,
  items,
  valueKey,
  labelKey,
  formatItem,
}: {
  title: string;
  items: any[];
  valueKey: string;
  labelKey: string;
  formatItem?: (item: any) => string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="truncate text-muted-foreground">
              {i + 1}. {formatItem ? formatItem(item) : item[labelKey] || item.customerId || item.productId}
            </span>
            <span className="ml-2 font-medium tabular-nums">{formatCurrency(item[valueKey] || item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═════════════════════════════════════════════════════════

export function SalesReportsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const reportFilters: ReportFilters = {
        period: filters.period !== 'this_month' ? filters.period : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const result = await getSalesDashboard(reportFilters);
      setData(result);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time sales performance metrics and analytics
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <FilterBar
        values={filters}
        onChange={setFilters}
        showSearch={false}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading dashboard data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Grid */}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Today's Sales" value={kpis.todaySales?.value || 0} icon="todaySales" color="border-l-blue-500" />
            <KpiCard label="This Month Sales" value={kpis.monthSales?.value || 0} icon="monthSales" color="border-l-green-500" />
            <KpiCard label="Outstanding" value={kpis.outstanding?.value || 0} icon="outstanding" color="border-l-red-500" />
            <KpiCard label="Invoices" value={kpis.invoices?.value || 0} icon="invoices" color="border-l-purple-500" isCurrency={false} />
            <KpiCard label="Average Invoice" value={kpis.avgInvoice?.value || 0} icon="avgInvoice" color="border-l-cyan-500" />
            <KpiCard label="Collection" value={kpis.collection?.value || 0} icon="collection" color="border-l-emerald-500" />
            <KpiCard label="Gross Profit" value={kpis.profit?.value || 0} icon="profit" color="border-l-yellow-500" />
            <KpiCard label="Growth %" value={kpis.growthPercent?.value || 0} icon="growthPercent" color="border-l-orange-500" isCurrency={false} />
          </div>

          {/* Second KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Taxable Value" value={kpis.totalSubTotal?.value || 0} icon="totalSubTotal" color="border-l-indigo-500" />
            <KpiCard label="Total Tax" value={kpis.totalTax?.value || 0} icon="totalTax" color="border-l-pink-500" />
            <KpiCard label="Total Discount" value={kpis.totalDiscount?.value || 0} icon="totalDiscount" color="border-l-rose-500" />
            <KpiCard label="Profit Margin" value={kpis.profitMargin?.value || 0} icon="profitMargin" color="border-l-teal-500" isCurrency={false} />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SimpleBarChart
              data={data.charts.dailySales}
              xKey="date"
              yKey="amount"
              title="Daily Sales (Last 30 Days)"
            />
            <SimpleBarChart
              data={data.charts.monthlySales}
              xKey="month"
              yKey="amount"
              title="Monthly Sales Trend"
            />
          </div>

          {/* Top Lists */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <TopList
              title="Top Customers"
              items={data.topCustomers}
              valueKey="amount"
              labelKey="customerId"
            />
            <TopList
              title="Top Products"
              items={data.topProducts}
              valueKey="amount"
              labelKey="productId"
            />
          </div>
        </>
      )}
    </div>
  );
}
