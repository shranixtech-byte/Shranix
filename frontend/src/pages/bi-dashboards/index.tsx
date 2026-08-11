import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashboardChart } from '@/components/dashboard/DashboardChart';
import {
  type AnalyticsFormat,
  type AnalyticsPayload,
  getAnalyticsOverview,
  getSalesAnalytics,
  getPurchaseAnalytics,
  getInventoryAnalytics,
  getFinanceAnalytics,
  getGstAnalytics,
  getCustomerAnalytics,
  getSupplierAnalytics,
  getWarehouseAnalytics,
  getProfitabilityAnalytics,
  getCashFlowAnalytics,
  getGrowthAnalytics,
  getTopBottomAnalytics,
} from '@/services/analytics.service';

// ═══════════════════════════════════════════════════════════════════
// Shared formatting helpers
// ═══════════════════════════════════════════════════════════════════

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: v >= 10000 || v === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);

export function formatAnalyticsValue(v: unknown, format?: AnalyticsFormat): string {
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return String(v ?? '—');
  }
  switch (format) {
    case 'currency':
      return inr(n);
    case 'percent':
      return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
    case 'number':
      return n.toLocaleString('en-IN', { maximumFractionDigits: 1 });
    case 'date':
      return n ? new Date(v as string).toLocaleDateString('en-IN') : '—';
    default:
      return typeof v === 'string' ? v : n.toLocaleString('en-IN');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Presentational building blocks
// ═══════════════════════════════════════════════════════════════════

function KpiCard({
  label,
  value,
  format,
  trend,
  color = 'border-l-indigo-500',
}: {
  label: string;
  value: number;
  format?: AnalyticsFormat;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
  return (
    <div
      className={`bg-card rounded-lg border-l-4 p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${color}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">
        {formatAnalyticsValue(value, format)}
      </p>
    </div>
  );
}

function ChartGrid({ charts }: { charts: AnalyticsPayload['charts'] }) {
  if (!charts.length) {
    return null;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {charts.map((chart, i) => (
        <DashboardChart
          key={`${chart.title}-${i}`}
          title={chart.title}
          data={chart.data}
          series={chart.series}
          type={chart.type}
          height={chart.height ?? 260}
          formatValue={inr}
        />
      ))}
    </div>
  );
}

function TableSection({ tables }: { tables: AnalyticsPayload['tables'] }) {
  if (!tables.length) {
    return null;
  }
  return (
    <div className="space-y-6">
      {tables.map((table, ti) => (
        <div key={`${table.title}-${ti}`} className="bg-card rounded-lg border shadow-sm">
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">{table.title}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                  {table.columns.map((c) => (
                    <th key={c.key} className="px-4 py-2.5 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={table.columns.length}
                      className="text-muted-foreground px-4 py-8 text-center text-xs"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30 border-b last:border-0">
                      {table.columns.map((c) => (
                        <td key={c.key} className="px-4 py-2.5">
                          {formatAnalyticsValue(row[c.key], c.format)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Generic analytics page shell
// ═══════════════════════════════════════════════════════════════════

interface AnalyticsPageProps {
  title: string;
  description: string;
  fetcher: () => Promise<AnalyticsPayload>;
}

function AnalyticsDashboardPage({ title, description, fetcher }: AnalyticsPageProps) {
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPayload(await fetcher());
    } catch (e) {
      setError((e as Error)?.message || 'Failed to load analytics');
    }
  }, [fetcher]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        <button
          onClick={() => void load()}
          className="bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!payload && !error && (
        <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </div>
      )}

      {payload && (
        <>
          {payload.kpis.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {payload.kpis.map((kpi) => (
                <KpiCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.value}
                  format={kpi.format}
                  trend={kpi.trend}
                  color={kpi.color}
                />
              ))}
            </div>
          )}
          <ChartGrid charts={payload.charts} />
          <TableSection tables={payload.tables} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Overview (Management Dashboard)
// ═══════════════════════════════════════════════════════════════════
export function OverviewAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Management Analytics"
      description="Enterprise KPIs — sales, purchase, profitability, receivables, payables, inventory and cash position"
      fetcher={getAnalyticsOverview}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Sales Analytics
// ═══════════════════════════════════════════════════════════════════
export function SalesAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Sales Analytics"
      description="Real-time sales performance metrics, trends, category/customer/salesperson analysis and quotation funnel"
      fetcher={getSalesAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Purchase Analytics
// ═══════════════════════════════════════════════════════════════════
export function PurchaseAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Purchase Analytics"
      description="Comprehensive purchase performance, supplier concentration and trend analysis"
      fetcher={getPurchaseAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Inventory Analytics
// ═══════════════════════════════════════════════════════════════════
export function InventoryAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Inventory Analytics"
      description="Stock movement, valuation, warehouse distribution and fast/slow/dead stock analysis"
      fetcher={getInventoryAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Finance Analytics
// ═══════════════════════════════════════════════════════════════════
export function FinanceAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Financial Analytics"
      description="Revenue, margins, expenses, profit trend and sales vs purchase comparison"
      fetcher={getFinanceAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — GST Analytics
// ═══════════════════════════════════════════════════════════════════
export function GstAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="GST Analytics"
      description="Output and input tax, GST by rate and period from invoice-level tax data"
      fetcher={getGstAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Customer Analytics
// ═══════════════════════════════════════════════════════════════════
export function CustomerAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Customer Analytics"
      description="Customer sales, outstanding, credit limit utilization and inactive customer analysis"
      fetcher={getCustomerAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Supplier Analytics
// ═══════════════════════════════════════════════════════════════════
export function SupplierAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Supplier Analytics"
      description="Supplier spend, concentration and pending payment analysis"
      fetcher={getSupplierAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Warehouse Analytics
// ═══════════════════════════════════════════════════════════════════
export function WarehouseAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Warehouse Analytics"
      description="Warehouse stock distribution, value and transfer activity"
      fetcher={getWarehouseAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Profitability Analytics
// ═══════════════════════════════════════════════════════════════════
export function ProfitabilityAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Profitability Analytics"
      description="Product-level gross profit, margins and bottom performers"
      fetcher={getProfitabilityAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Cash Flow Analytics
// ═══════════════════════════════════════════════════════════════════
export function CashFlowAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Cash Flow Analytics"
      description="Cash inflow and outflow trends from the GL"
      fetcher={getCashFlowAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Growth Analytics
// ═══════════════════════════════════════════════════════════════════
export function GrowthAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Growth Analytics"
      description="Month-over-month revenue and order growth"
      fetcher={getGrowthAnalytics}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// BI ANALYTICS DASHBOARD — Top / Bottom
// ═══════════════════════════════════════════════════════════════════
export function TopBottomAnalyticsPage() {
  return (
    <AnalyticsDashboardPage
      title="Top & Bottom Performers"
      description="Top 10 customers, suppliers and products by sales, quantity and profit"
      fetcher={getTopBottomAnalytics}
    />
  );
}
