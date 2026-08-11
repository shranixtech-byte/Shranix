import { Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService } from '@/services/commercial.service';

export function CommercialBillingPage() {
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, pay] = await Promise.all([
        commercialService.listInvoices(),
        commercialService.listPayments(),
      ]);
      setInvoices(inv.data);
      setPayments(pay.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusColor = (s: string) =>
    s === 'paid' || s === 'SUCCESS'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'failed' || s === 'FAILED'
        ? 'bg-red-100 text-red-700'
        : s === 'issued' || s === 'PENDING'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-gray-200 text-gray-600';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Subscription invoices, payments and refunds
          </p>
        </div>
        <div className="bg-muted flex rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setTab('invoices')}
            className={`rounded-md px-3 py-1.5 ${tab === 'invoices' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          >
            Invoices
          </button>
          <button
            onClick={() => setTab('payments')}
            className={`rounded-md px-3 py-1.5 ${tab === 'payments' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          >
            Payments
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : tab === 'invoices' ? (
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">Tax</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-4 py-8 text-center">
                    No billing invoices
                  </td>
                </tr>
              )}
              {invoices.map((i) => (
                <tr key={i.id} className="hover:bg-muted/30 border-t">
                  <td className="px-4 py-3 font-mono">{i.invoiceNumber}</td>
                  <td className="px-4 py-3 font-mono">
                    {String(i.periodStart).slice(0, 10)} → {String(i.periodEnd).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(i.basePrice).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(i.taxAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">
                    ₹{Number(i.totalAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-mono">{String(i.dueDate).slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(i.paymentStatus)}`}
                    >
                      {i.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Provider</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Refunded</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                    No billing payments
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 border-t">
                  <td className="px-4 py-3 font-mono">{p.paymentNumber}</td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(p.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {p.provider} • {p.mode}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    ₹{Number(p.refundedAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {['PENDING', 'INITIATED'].includes(p.status) && (
                      <button
                        onClick={async () => {
                          if (confirm('Verify this payment server-side?')) {
                            await commercialService.verifyPayment(p.id);
                            void load();
                          }
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold"
                      >
                        <ShieldCheck className="h-3 w-3" /> Verify
                      </button>
                    )}
                    {p.status === 'SUCCESS' && (
                      <button
                        onClick={async () => {
                          const reason = prompt('Refund reason:') || '';
                          if (confirm(`Refund ₹${Number(p.amount).toLocaleString('en-IN')}?`)) {
                            await commercialService.refundPayment(p.id, { reason });
                            void load();
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
