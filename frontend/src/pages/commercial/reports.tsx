import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService } from '@/services/commercial.service';

const TABS = [
  { key: 'subscriptions', label: 'Subscription Register' },
  { key: 'active', label: 'Active' },
  { key: 'trials', label: 'Trials' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'payments', label: 'Payments' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'coupons', label: 'Coupon Usage' },
  { key: 'mrr', label: 'MRR / ARR' },
  { key: 'churn', label: 'Churn' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function CommercialReportsPage() {
  const [tab, setTab] = useState<TabKey>('subscriptions');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const loaders: Record<TabKey, () => Promise<any>> = {
      subscriptions: () => commercialService.reportSubscriptions(),
      active: () => commercialService.reportActive(),
      trials: () => commercialService.reportTrials(),
      revenue: () => commercialService.reportRevenue(),
      payments: () => commercialService.reportPayments(),
      refunds: () => commercialService.reportRefunds(),
      coupons: () => commercialService.reportCoupons(),
      mrr: () => commercialService.reportMrr(),
      churn: () => commercialService.reportChurn(),
    };
    void loaders[tab]()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const rows = Array.isArray(data) ? data : data?.invoices || data?.payments || data?.events || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">Commercial Reports</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Subscriptions, billing and revenue analytics
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-4">
          {tab === 'revenue' && data && (
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Total billed</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.total || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Tax</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.tax || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Discounts</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.discount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
          {tab === 'payments' && data && (
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Payments</p>
                <p className="mt-1 text-lg font-bold">{data.count || 0}</p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Collected</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.collected || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">By status</p>
                <p className="mt-1 text-xs">
                  {Object.entries(data.byStatus || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ') || '—'}
                </p>
              </div>
            </div>
          )}
          {tab === 'mrr' && data && (
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">MRR</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.mrr || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">ARR</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(data.arr || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-4 shadow-sm">
                <p className="text-muted-foreground text-xs">Active subscriptions</p>
                <p className="mt-1 text-lg font-bold">{data.activeCount || 0}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-left">
                  {rows[0] ? (
                    Object.keys(rows[0])
                      .filter((k) => !['metadata', 'providerResponse'].includes(k))
                      .slice(0, 8)
                      .map((k) => (
                        <th key={k} className="px-4 py-3 font-semibold capitalize">
                          {k.replace(/_/g, ' ')}
                        </th>
                      ))
                  ) : (
                    <th className="px-4 py-3 font-semibold">—</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">
                      No data
                    </td>
                  </tr>
                )}
                {rows.map((r: any, i: number) => (
                  <tr key={r.id || i} className="hover:bg-muted/30 border-t">
                    {Object.keys(rows[0] || {})
                      .filter((k) => !['metadata', 'providerResponse'].includes(k))
                      .slice(0, 8)
                      .map((k) => (
                        <td key={k} className="px-4 py-3">
                          {typeof r[k] === 'boolean'
                            ? String(r[k])
                            : String(r[k] ?? '—').slice(0, 40)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
