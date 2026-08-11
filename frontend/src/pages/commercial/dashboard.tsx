import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Loader2,
  RefreshCcw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService } from '@/services/commercial.service';

function formatINR(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CommercialDashboardPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await commercialService.dashboard());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  const subs = data?.subscriptions || {};
  const rev = data?.revenue || {};
  const life = data?.lifecycle || {};

  const cards = [
    {
      label: 'Active Subscriptions',
      value: String(subs.active || 0),
      icon: Activity,
      cls: 'text-emerald-600',
      sub: `${subs.trials || 0} trials • ${subs.gracePeriod || 0} grace`,
    },
    {
      label: 'MRR',
      value: formatINR(rev.mrr),
      icon: TrendingUp,
      cls: 'text-blue-600',
      sub: `ARR ${formatINR(rev.arr)}`,
    },
    {
      label: 'Total Billing',
      value: formatINR(rev.totalBilling),
      icon: BadgeIndianRupee,
      cls: 'text-violet-600',
      sub: `${formatINR(rev.paid)} paid • ${formatINR(rev.pending)} pending`,
    },
    {
      label: 'Expiring Soon',
      value: String(subs.expiringSoon || 0),
      icon: RefreshCcw,
      cls: 'text-amber-600',
      sub: 'within 7 days',
    },
    {
      label: 'Churn Rate',
      value: `${data?.churnRate ?? 0}%`,
      icon: ArrowDownRight,
      cls: 'text-red-600',
      sub: `${life.cancellations || 0} cancellations this month`,
    },
    {
      label: 'Payment Success',
      value: `${rev.paymentSuccessRate ?? 0}%`,
      icon: ArrowUpRight,
      cls: 'text-emerald-600',
      sub: `${rev.failedPayments || 0} failed payments`,
    },
    {
      label: 'Total Customers',
      value: String(data?.totalCustomers || 0),
      icon: Users,
      cls: 'text-sky-600',
      sub: `${life.newSubscriptions || 0} new subscriptions`,
    },
    {
      label: 'Lifecycle (this month)',
      value: String((life.renewals || 0) + (life.upgrades || 0) + (life.downgrades || 0)),
      icon: Activity,
      cls: 'text-indigo-600',
      sub: `${life.renewals || 0} renewals • ${life.upgrades || 0} upgrades`,
    },
  ];

  const months = data?.trends?.months || [];
  const maxTrend = Math.max(
    1,
    ...(data?.trends?.subscriptionTrend || []),
    ...(data?.trends?.revenueTrend || []),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Commercial Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Subscription, billing &amp; plan analytics
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-xs">{c.label}</p>
                <p className="mt-1 text-xl font-bold">{c.value}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">{c.sub}</p>
              </div>
              <c.icon className={`h-5 w-5 ${c.cls}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Subscription growth (6 months)</h3>
          <div className="flex h-36 items-end gap-2">
            {months.map((m: string, i: number) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="bg-primary w-full rounded-t-md transition-all"
                    style={{
                      height: `${((data?.trends?.subscriptionTrend?.[i] || 0) / maxTrend) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-muted-foreground text-[10px]">{m.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Revenue trend (6 months)</h3>
          <div className="flex h-36 items-end gap-2">
            {months.map((m: string, i: number) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-emerald-500 transition-all"
                    style={{
                      height: `${((data?.trends?.revenueTrend?.[i] || 0) / maxTrend) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-muted-foreground text-[10px]">{m.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Plan distribution (active)</h3>
          {!data?.planDistribution?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No active subscriptions
            </p>
          ) : (
            <ul className="space-y-2">
              {data.planDistribution.map((p: any) => (
                <li key={p.planId} className="flex items-center justify-between text-xs">
                  <span>{p.planName}</span>
                  <div className="bg-muted h-1.5 w-40 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (p.count / Math.max(1, subs.active)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Recent trends</h3>
          <ul className="space-y-2 text-xs">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Renewals (this month)</span>
              <span className="font-mono">{life.renewals || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Upgrades (this month)</span>
              <span className="font-mono">{life.upgrades || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Downgrades (this month)</span>
              <span className="font-mono">{life.downgrades || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Refunds (total)</span>
              <span className="font-mono">{life.refunds || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Expired</span>
              <span className="font-mono">{subs.expired || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Suspended</span>
              <span className="font-mono">{subs.suspended || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Cancelled</span>
              <span className="font-mono">{subs.cancelled || 0}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
