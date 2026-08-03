import { Loader2, RefreshCw, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { getCreditDashboard, type CreditDashboardData } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

export function CreditDashboardPage() {
  const [data, setData] = useState<CreditDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getCreditDashboard());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Control Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Customer credit management and risk monitoring
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border-l-4 border-l-blue-500 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Total Credit Limit
                </p>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-xl font-bold">{formatCurrency(s?.totalCreditLimit || 0)}</p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-red-500 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Total Outstanding
                </p>
                <DollarSign className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-red-600">
                {formatCurrency(s?.totalOutstanding || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-orange-500 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium uppercase">Overdue</p>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-orange-600">
                {formatCurrency(s?.totalOverdue || 0)}
              </p>
            </div>
            <div className="bg-card rounded-lg border-l-4 border-l-purple-500 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Credit Utilization
                </p>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-xl font-bold">{s?.creditUtilization || 0}%</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Customers</p>
              <p className="mt-1 text-lg font-bold">{s?.totalCustomers || 0}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Blocked</p>
              <p className="mt-1 text-lg font-bold text-red-600">{s?.blockedCustomers || 0}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">Near Limit</p>
              <p className="mt-1 text-lg font-bold text-yellow-600">{s?.nearLimitCustomers || 0}</p>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <p className="text-muted-foreground text-xs uppercase">High Risk</p>
              <p className="mt-1 text-lg font-bold text-red-600">{s?.highRiskCustomers || 0}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Warning Levels</h3>
              <div className="space-y-2">
                {[
                  { l: 'Green', k: 'green', c: 'bg-green-100 text-green-700' },
                  { l: 'Amber', k: 'amber', c: 'bg-yellow-100 text-yellow-700' },
                  { l: 'Red', k: 'red', c: 'bg-orange-100 text-orange-700' },
                  { l: 'Critical', k: 'critical', c: 'bg-red-100 text-red-700' },
                ].map((w) => (
                  <div
                    key={w.k}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                  >
                    <span className={`rounded px-2 py-0.5 font-medium ${w.c}`}>{w.l}</span>
                    <span className="font-bold tabular-nums">
                      {data.warningDistribution?.[w.k] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Risk Distribution</h3>
              <div className="space-y-2">
                {[
                  { l: 'Low', k: 'low', c: 'bg-green-100 text-green-700' },
                  { l: 'Medium', k: 'medium', c: 'bg-yellow-100 text-yellow-700' },
                  { l: 'High', k: 'high', c: 'bg-orange-100 text-orange-700' },
                  { l: 'Critical', k: 'critical', c: 'bg-red-100 text-red-700' },
                ].map((r) => (
                  <div
                    key={r.k}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                  >
                    <span className={`rounded px-2 py-0.5 font-medium ${r.c}`}>{r.l}</span>
                    <span className="font-bold tabular-nums">
                      {data.riskDistribution?.[r.k] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-lg border p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Health Score</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold text-white shadow">
                  {s?.averageHealthScore || 0}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Average Customer Health</p>
                  <p className="text-lg font-bold">{s?.averageHealthScore || 0}/100</p>
                </div>
              </div>
            </div>
          </div>

          {data.topOutstanding && data.topOutstanding.length > 0 && (
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Highest Outstanding</h3>
              </div>
              <div className="divide-y">
                {data.topOutstanding.slice(0, 8).map((c) => (
                  <div
                    key={c.customerId}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${c.warningLevel === 'critical' ? 'bg-red-500' : c.warningLevel === 'red' ? 'bg-orange-500' : c.warningLevel === 'amber' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      />
                      <span className="font-medium">{c.customerName}</span>
                      <span className="text-muted-foreground">{c.customerCode}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="tabular-nums">{formatCurrency(c.outstanding)}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.riskCategory === 'critical' ? 'bg-red-100 text-red-700' : c.riskCategory === 'high' ? 'bg-orange-100 text-orange-700' : c.riskCategory === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {c.riskCategory}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
          No credit data available
        </div>
      )}
    </div>
  );
}
