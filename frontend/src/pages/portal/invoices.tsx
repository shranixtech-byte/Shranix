import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import {
  Card,
  DataTable,
  fmtDate,
  fmtINR,
  PageHeader,
  PortalEmpty,
  PortalLoading,
  StatusBadge,
} from './common';

export function PortalInvoicesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService
      .getInvoices()
      .then((res: any) => setItems(res || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PortalLoading />;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="Your invoices, dues and payment status" />
      {items.length === 0 ? (
        <PortalEmpty title="No invoices yet" />
      ) : (
        <Card>
          <DataTable headers={['Invoice', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', '']}>
            {items.map((i) => {
              const due =
                i.balanceAmount > 0 && i.dueDate && i.dueDate < today
                  ? 'overdue'
                  : i.balanceAmount > 0
                    ? 'pending'
                    : 'paid';
              return (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {i.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {fmtDate(i.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {fmtDate(i.dueDate)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                    {fmtINR(i.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                    {fmtINR(i.paidAmount)}
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${due === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    {fmtINR(i.balanceAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={due} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/portal/invoices/${i.id}`}
                      className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </Card>
      )}
    </div>
  );
}

export function PortalInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState('upi');
  const [busy, setBusy] = useState(false);
  const [payStatus, setPayStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    portalService
      .getInvoice(id)
      .then(setInv)
      .catch((e) => setError(e.message));
  }, [id]);

  const download = async () => {
    try {
      await portalService.downloadDocument('invoice', id!, `invoice-${inv.invoiceNumber}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const payOnline = async () => {
    setBusy(true);
    setError(null);
    try {
      const key = `pay-${inv.id}-${Date.now()}`;
      const created: any = await portalService.createPayment({
        invoiceId: inv.id,
        amount: inv.balanceAmount,
        mode,
        idempotencyKey: key,
      });
      const verified: any = await portalService.verifyPayment(created.id, {
        gatewayRef: `GW-${Date.now()}`,
      });
      if (verified.status === 'completed') {
        setPayStatus('Payment successful! Your invoice has been updated.');
        const fresh: any = await portalService.getInvoice(id!);
        setInv(fresh);
      } else {
        setPayStatus(
          `Payment ${verified.status}: ${verified.failureReason || 'Please try again or contact support.'}`,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!inv) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        subtitle={`${fmtDate(inv.invoiceDate)} · Due ${fmtDate(inv.dueDate)}`}
        actions={
          <button
            onClick={download}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            Download PDF
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Grand Total
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
            {fmtINR(inv.grandTotal)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {fmtINR(inv.paidAmount)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance</p>
          <p
            className={`mt-1 text-2xl font-bold ${inv.balanceAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
          >
            {fmtINR(inv.balanceAmount)}
          </p>
        </Card>
      </div>

      <Card>
        <DataTable headers={['Item', 'Qty', 'Rate', 'Total']}>
          {(inv.items || []).map((i: any) => (
            <tr key={i.id}>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                {i.description || i.itemId}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{i.quantity}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtINR(i.rate)}</td>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                {fmtINR(i.totalAmount)}
              </td>
            </tr>
          ))}
        </DataTable>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="space-y-1 text-right text-sm">
            <p className="text-slate-500 dark:text-slate-400">Subtotal: {fmtINR(inv.subTotal)}</p>
            <p className="text-slate-500 dark:text-slate-400">
              Discount: {fmtINR(inv.discountAmount)}
            </p>
            <p className="text-slate-500 dark:text-slate-400">Tax: {fmtINR(inv.taxAmount)}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Total: {fmtINR(inv.grandTotal)}
            </p>
          </div>
        </div>
      </Card>

      {inv.balanceAmount > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Pay Online</h3>
          <p className="mt-1 text-xs text-slate-400">
            Pay the outstanding balance securely. Payment is verified server-side before it is
            applied.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="netbanking">Net Banking</option>
              <option value="wallet">Wallet</option>
            </select>
            <button
              onClick={payOnline}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Processing…' : `Pay ${fmtINR(inv.balanceAmount)}`}
            </button>
          </div>
          {payStatus && (
            <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {payStatus}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
