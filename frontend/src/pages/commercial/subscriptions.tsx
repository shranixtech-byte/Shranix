import { ArrowUpDown, Ban, CheckCircle2, Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService, type Subscription } from '@/services/commercial.service';

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-sky-100 text-sky-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PAST_DUE: 'bg-orange-100 text-orange-700',
  GRACE_PERIOD: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-200 text-gray-600',
  EXPIRED: 'bg-gray-200 text-gray-600',
  UPGRADED: 'bg-violet-100 text-violet-700',
  DOWNGRADED: 'bg-violet-100 text-violet-700',
};

const STATUS_FILTERS = [
  '',
  'ACTIVE',
  'TRIAL',
  'PENDING_PAYMENT',
  'GRACE_PERIOD',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
];

export function CommercialSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, any>>({ customerId: '', planId: '' });
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        commercialService.listSubscriptions({ status: statusFilter || undefined }),
        commercialService.listPlans(),
      ]);
      setSubs(s.data);
      setPlans(p.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [statusFilter]);

  const openDetail = async (sub: Subscription) => {
    setSelected(sub);
    try {
      setHistory(await commercialService.subscriptionHistory(sub.id));
    } catch {
      setHistory([]);
    }
  };

  const runAction = async (fn: () => Promise<any>, then: () => void) => {
    setActionBusy(true);
    try {
      await fn();
      then();
      void load();
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  const create = async () => {
    if (!createForm.customerId || !createForm.planId) {
      alert('Customer and plan are required');
      return;
    }
    await runAction(
      () =>
        commercialService.createSubscription({
          customerId: createForm.customerId,
          planId: createForm.planId,
          autoRenew: Boolean(createForm.autoRenew),
          couponCode: createForm.couponCode || undefined,
        }),
      () => {
        setShowCreate(false);
        setCreateForm({ customerId: '', planId: '' });
      },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Customer subscriptions, lifecycle and billing state
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-xs font-semibold"
        >
          New Subscription
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Number</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">End Date</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-4 py-8 text-center">
                    No subscriptions found
                  </td>
                </tr>
              )}
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 border-t">
                  <td className="px-4 py-3 font-mono">{s.subscriptionNumber}</td>
                  <td className="px-4 py-3">{s.customer?.name || s.customerId.slice(0, 8)}</td>
                  <td className="px-4 py-3">{s.plan?.displayName || s.planId.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s.status] || 'bg-muted'}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(s.finalAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-mono">{String(s.endDate || '').slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] capitalize">{s.paymentStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void openDetail(s)}
                      className="text-primary hover:underline"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold">{selected.subscriptionNumber}</h2>
                <p className="text-muted-foreground text-[11px]">
                  {selected.customer?.name} • {selected.plan?.displayName} • v
                  {selected.planId.slice(0, 6)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[selected.status] || 'bg-muted'}`}
              >
                {selected.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">Billing cycle</p>
                <p className="font-medium capitalize">{selected.billingCycle}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">
                  ₹{Number(selected.finalAmount).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">Start</p>
                <p className="font-medium">{String(selected.startDate).slice(0, 10)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">End</p>
                <p className="font-medium">{String(selected.endDate || '').slice(0, 10)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">Auto-renew</p>
                <p className="font-medium">{selected.autoRenew ? 'On' : 'Off'}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-2">
                <p className="text-muted-foreground">Payment</p>
                <p className="font-medium capitalize">{selected.paymentStatus}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {['PENDING_PAYMENT', 'TRIAL'].includes(selected.status) && (
                <button
                  disabled={actionBusy}
                  onClick={() =>
                    void runAction(
                      () => commercialService.activateSubscription(selected.id),
                      () => setSelected(null),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                </button>
              )}
              {['ACTIVE', 'GRACE_PERIOD', 'PAST_DUE'].includes(selected.status) && (
                <button
                  disabled={actionBusy}
                  onClick={() =>
                    void runAction(
                      () => commercialService.renewSubscription(selected.id),
                      () => setSelected(null),
                    )
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Renew
                </button>
              )}
              {['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(selected.status) &&
                plans.length > 1 && (
                  <button
                    disabled={actionBusy}
                    onClick={() => {
                      const target = window.prompt('Upgrade to plan ID:');
                      if (target) {
                        void runAction(
                          () =>
                            commercialService.upgradeSubscription(selected.id, {
                              planId: target,
                              immediate: true,
                            }),
                          () => setSelected(null),
                        );
                      }
                    }}
                    className="border-input hover:bg-muted inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" /> Upgrade
                  </button>
                )}
              {['ACTIVE', 'GRACE_PERIOD'].includes(selected.status) && (
                <button
                  disabled={actionBusy}
                  onClick={() => {
                    const target = window.prompt('Downgrade to plan ID:');
                    if (target) {
                      void runAction(
                        () =>
                          commercialService.downgradeSubscription(selected.id, {
                            planId: target,
                            immediate: false,
                          }),
                        () => setSelected(null),
                      );
                    }
                  }}
                  className="border-input hover:bg-muted inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" /> Downgrade
                </button>
              )}
              {!['CANCELLED', 'EXPIRED', 'UPGRADED', 'DOWNGRADED'].includes(selected.status) && (
                <button
                  disabled={actionBusy}
                  onClick={() => {
                    const reason = window.prompt('Cancellation reason:') || '';
                    const immediate = window.confirm(
                      'Cancel immediately? (OK = now, Cancel = end of period)',
                    );
                    void runAction(
                      () =>
                        commercialService.cancelSubscription(selected.id, { reason, immediate }),
                      () => setSelected(null),
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>

            <div className="mt-4 border-t pt-3">
              <h3 className="mb-2 text-[11px] font-semibold">Lifecycle history</h3>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-[11px]">No events yet</p>
              ) : (
                <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                  {[...history].reverse().map((e: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-medium">{e.eventType.replace(/_/g, ' ')}</span>
                        {e.fromStatus && e.toStatus && e.fromStatus !== e.toStatus && (
                          <span className="text-muted-foreground">
                            {' '}
                            — {e.fromStatus} → {e.toStatus}
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {String(e.createdAt).slice(0, 16).replace('T', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card w-full max-w-sm rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold">New Subscription</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Customer ID *
                </span>
                <input
                  className="input w-full"
                  placeholder="Customer master record id"
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Plan *
                </span>
                <select
                  className="input w-full"
                  value={createForm.planId}
                  onChange={(e) => setCreateForm({ ...createForm, planId: e.target.value })}
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} (₹{Number(p.price).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Coupon (optional)
                </span>
                <input
                  className="input w-full"
                  placeholder="e.g. SAVE10"
                  value={createForm.couponCode || ''}
                  onChange={(e) => setCreateForm({ ...createForm, couponCode: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={Boolean(createForm.autoRenew)}
                  onChange={(e) => setCreateForm({ ...createForm, autoRenew: e.target.checked })}
                />
                Auto-renew
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="border-input hover:bg-muted rounded-lg border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => void create()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
