import { Check, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { portalService } from '@/services/portal.service';

export function PortalBillingPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'plan' | 'invoices' | 'payments' | 'history'>('plan');

  const load = async () => {
    setLoading(true);
    try {
      const [overview, available] = await Promise.all([
        portalService.getBillingOverview(),
        portalService.getBillingPlans(),
      ]);
      setData(overview);
      setPlans(available);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const subscribe = async (planId: string) => {
    setBusy(true);
    try {
      const res = await portalService.subscribeToPlan({ planId });
      if (res.trial) {
        alert(`Trial started — ${res.subscription.subscriptionNumber}`);
      } else if (res.payment) {
        // Simulated gateway — verify server-side immediately
        const verified = await portalService.verifyBillingPayment(
          res.payment.id,
          JSON.stringify({ amount: Number(res.payment.amount), eventId: 'portal-checkout' }),
        );
        alert(
          verified.status === 'SUCCESS'
            ? `Subscription activated — ${res.subscription.subscriptionNumber}`
            : `Payment ${verified.status}`,
        );
      }
      void load();
    } catch (err: any) {
      alert(err?.message || 'Subscription failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sub = data?.subscription;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Billing &amp; Plans</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Your subscription, invoices and payment history
          </p>
        </div>
        <div className="bg-muted flex rounded-lg p-0.5 text-xs">
          {(['plan', 'invoices', 'payments', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 capitalize ${tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'plan' && (
        <>
          {sub ? (
            <div className="bg-card mt-5 rounded-xl border p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{sub.plan?.displayName || 'Plan'}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {sub.subscriptionNumber}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'TRIAL' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {sub.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground text-[10px]">Amount</p>
                  <p className="font-semibold">
                    ₹{Number(sub.finalAmount).toLocaleString('en-IN')}{' '}
                    <span className="text-muted-foreground text-[10px] font-normal">
                      /{sub.billingCycle}
                    </span>
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground text-[10px]">Valid until</p>
                  <p className="font-semibold">{String(sub.endDate || '').slice(0, 10)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground text-[10px]">Payment</p>
                  <p className="font-semibold capitalize">{sub.paymentStatus}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground text-[10px]">Auto-renew</p>
                  <p className="font-semibold">{sub.autoRenew ? 'On' : 'Off'}</p>
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-[11px]">
                {data?.entitlements?.active
                  ? `Features enabled: ${
                      Object.entries(data.entitlements.features || {})
                        .filter(([, v]) => Boolean(v))
                        .map(([k]) => k.replace(/_/g, ' '))
                        .join(', ') || '—'
                    }`
                  : 'No active entitlements'}
              </p>
            </div>
          ) : (
            <div className="bg-card mt-5 rounded-xl border p-5 text-center shadow-sm">
              <CreditCard className="text-muted-foreground mx-auto h-8 w-8" />
              <h3 className="mt-2 text-sm font-semibold">No active subscription</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Choose a plan below to get started.
              </p>
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold">Available plans</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${p.isRecommended ? 'border-primary' : ''}`}
              >
                {p.isRecommended && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[9px] font-bold uppercase">
                    Recommended
                  </span>
                )}
                <p className="mt-1 font-semibold">{p.displayName}</p>
                <p className="mt-1 text-lg font-bold">
                  ₹{Number(p.price).toLocaleString('en-IN')}
                  <span className="text-muted-foreground text-xs font-normal">
                    {' '}
                    / {p.billingCycle}
                  </span>
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {p.trialPeriodDays > 0 ? `${p.trialPeriodDays}-day free trial` : 'No trial'} •{' '}
                  {p.taxRate}% tax
                </p>
                <ul className="mt-2 space-y-1">
                  {Object.entries(p.features || {})
                    .filter(([, v]) => Boolean(v))
                    .slice(0, 5)
                    .map(([k]) => (
                      <li key={k} className="flex items-center gap-1.5 text-[11px]">
                        <Check className="h-3 w-3 text-emerald-600" /> {k.replace(/_/g, ' ')}
                      </li>
                    ))}
                </ul>
                <button
                  disabled={busy}
                  onClick={() => void subscribe(p.id)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 w-full rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {sub?.planId === p.id ? 'Current plan' : 'Subscribe'}
                </button>
              </div>
            ))}
            {plans.length === 0 && (
              <p className="text-muted-foreground col-span-full py-6 text-center text-xs">
                No plans available
              </p>
            )}
          </div>
        </>
      )}

      {tab === 'invoices' && <InvoiceList invoices={data?.invoices || []} />}
      {tab === 'payments' && (
        <div className="mt-5 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                    No payments yet
                  </td>
                </tr>
              )}
              {(data?.payments || []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3 font-mono">{p.paymentNumber}</td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {String(p.createdAt).slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'history' && (
        <div className="mt-5 rounded-xl border">
          {(data?.history || []).length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-xs">
              No lifecycle events yet
            </p>
          )}
          <ul className="divide-y">
            {[...(data?.history || [])].reverse().map((e: any, i: number) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 text-xs">
                <span className="font-medium capitalize">{e.eventType.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {String(e.createdAt).slice(0, 16).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InvoiceList({ invoices }: { invoices: any[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-4 py-3 font-semibold">Invoice</th>
            <th className="px-4 py-3 font-semibold">Period</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Due</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                No invoices yet
              </td>
            </tr>
          )}
          {invoices.map((i: any) => (
            <tr key={i.id} className="border-t">
              <td className="px-4 py-3 font-mono">{i.invoiceNumber}</td>
              <td className="px-4 py-3 font-mono">
                {String(i.periodStart).slice(0, 10)} → {String(i.periodEnd).slice(0, 10)}
              </td>
              <td className="px-4 py-3 font-mono font-semibold">
                ₹{Number(i.totalAmount).toLocaleString('en-IN')}
              </td>
              <td className="px-4 py-3 font-mono">{String(i.dueDate).slice(0, 10)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {i.paymentStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length > 0 && (
        <div className="text-muted-foreground flex items-center gap-1.5 border-t px-4 py-2.5 text-[10px]">
          <ShieldCheck className="h-3 w-3 text-emerald-600" /> Payments are verified server-side
          before an invoice is marked paid.
        </div>
      )}
    </div>
  );
}
