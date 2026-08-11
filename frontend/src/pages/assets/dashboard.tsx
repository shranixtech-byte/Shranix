import { Boxes, CheckCircle2, IndianRupee, Loader2, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { assetApi, expenseApi } from '@/services/asset-expense.service';

const fmt = (n?: number | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function AssetExpenseDashboardPage() {
  const [assetData, setAssetData] = useState<any>(null);
  const [expenseData, setExpenseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [a, e] = await Promise.all([assetApi.dashboard(), expenseApi.dashboard()]);
        setAssetData(a);
        setExpenseData(e);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  const assets = [
    {
      label: 'Total Assets',
      value: String(assetData?.totalAssets || 0),
      sub: `${assetData?.activeAssets || 0} active`,
    },
    {
      label: 'Net Asset Value',
      value: fmt(assetData?.netAssetValue),
      sub: `${fmt(assetData?.accumulatedDepreciation)} depreciation`,
    },
    {
      label: 'Under Maintenance',
      value: String(assetData?.underMaintenance || 0),
      sub: `${assetData?.upcomingServices?.length || 0} services due`,
    },
    {
      label: 'Disposed',
      value: String(assetData?.disposedAssets || 0),
      sub: `warranty expiring: ${assetData?.expiringWarrantyAssets || 0}`,
    },
  ];
  const expenses = [
    {
      label: 'Total Expenses',
      value: fmt(expenseData?.totalExpenses),
      sub: `${expenseData?.expenseCount || 0} records`,
    },
    {
      label: 'This Month',
      value: fmt(expenseData?.thisMonthExpenses),
      sub: `today: ${fmt(expenseData?.todayExpenses)}`,
    },
    { label: 'Paid', value: fmt(expenseData?.paidExpenses), sub: 'via GL entries' },
    {
      label: 'Pending Approval',
      value: String(expenseData?.pendingApproval || 0),
      sub: 'expenses awaiting approval',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Assets &amp; Expenses</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Fixed assets, depreciation, maintenance and expense management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/assets/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            + New asset
          </Link>
          <Link
            to="/expenses/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            + New expense
          </Link>
        </div>
      </div>

      <h2 className="text-muted-foreground mb-3 mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Boxes className="h-3.5 w-3.5" /> Assets
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className="mt-1 text-lg font-bold">{c.value}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4" /> Upcoming services
          </h3>
          {!assetData?.upcomingServices?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">No upcoming services</p>
          ) : (
            <ul className="divide-y">
              {assetData.upcomingServices.slice(0, 5).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-medium">{s.assetName || s.assetId}</p>
                    <p className="text-muted-foreground">
                      {s.maintenanceType} • {s.vendor || 'no vendor'}
                    </p>
                  </div>
                  <span className="font-mono text-amber-600">{s.nextServiceDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <IndianRupee className="h-4 w-4" /> Expense categories
          </h3>
          {!expenseData?.categoryBreakdown?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">No expense data yet</p>
          ) : (
            <ul className="divide-y">
              {expenseData.categoryBreakdown.slice(0, 6).map((c: any) => (
                <li key={c.name} className="flex items-center justify-between py-2 text-xs">
                  <span>{c.name}</span>
                  <span className="font-mono font-medium">{fmt(c.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="text-muted-foreground mb-3 mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <CheckCircle2 className="h-3.5 w-3.5" /> Expenses
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {expenses.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className="mt-1 text-lg font-bold">{c.value}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">{c.sub}</p>
          </div>
        ))}
      </div>

      <h2 className="text-muted-foreground mb-3 mt-8 text-xs font-semibold uppercase tracking-wide">
        Recent expenses
      </h2>
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(expenseData?.recentExpenses || []).map((e: any) => (
              <tr key={e.id} className="border-border hover:bg-muted/30 border-t transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs font-medium">{e.expenseNumber}</td>
                <td className="text-muted-foreground px-4 py-2.5 text-xs">{e.category || '—'}</td>
                <td className="px-4 py-2.5 text-xs">{e.expenseDate || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{fmt(e.amount ?? e.totalAmount)}</td>
                <td className="px-4 py-2.5 text-xs capitalize">{e.status}</td>
              </tr>
            ))}
            {!expenseData?.recentExpenses?.length && (
              <tr>
                <td colSpan={5} className="text-muted-foreground py-8 text-center text-xs">
                  No expenses yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
