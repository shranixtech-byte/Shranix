import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

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

export function PortalQuotationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalService
      .getQuotations()
      .then((res: any) => setItems(res || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PortalLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" subtitle="Your quotations and their status" />
      {items.length === 0 ? (
        <PortalEmpty title="No quotations yet" hint="Quotations shared with you will appear here" />
      ) : (
        <Card>
          <DataTable headers={['Number', 'Date', 'Valid Till', 'Total', 'Status', '']}>
            {items.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {q.quoteNumber}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {fmtDate(q.quoteDate)}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {fmtDate(q.validTill)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                  {fmtINR(q.grandTotal)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={q.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <QuotationLink id={q.id}>View →</QuotationLink>
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
}

function QuotationLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <a
      href={`#/portal/quotations/${id}`}
      className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
    >
      {children}
    </a>
  );
}

export function PortalQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }
    portalService
      .getQuotation(id)
      .then(setQ)
      .catch((e) => setError(e.message));
  }, [id]);

  const respond = async (action: string) => {
    setBusy(true);
    try {
      const res: any = await portalService.respondQuotation(id!, action, comment || undefined);
      setQ((prev: any) => ({ ...prev, status: res.status }));
      setComment('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      await portalService.downloadDocument('quotation', id!, `quotation-${q.quoteNumber}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!q) {
    return <PortalLoading />;
  }

  const canRespond = ['draft', 'sent', 'approved'].includes(q.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Quotation ${q.quoteNumber}`}
        subtitle={`${fmtDate(q.quoteDate)} · Valid till ${fmtDate(q.validTill)}`}
        actions={
          <button
            onClick={download}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            Download PDF
          </button>
        }
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
        <StatusBadge status={q.status} />
      </div>

      <Card>
        <DataTable headers={['Item', 'Qty', 'Rate', 'Total']}>
          {(q.items || []).map((i: any) => (
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
            <p className="text-slate-500 dark:text-slate-400">Subtotal: {fmtINR(q.subTotal)}</p>
            <p className="text-slate-500 dark:text-slate-400">
              Discount: {fmtINR(q.discountAmount)}
            </p>
            <p className="text-slate-500 dark:text-slate-400">Tax: {fmtINR(q.taxAmount)}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Total: {fmtINR(q.grandTotal)}
            </p>
          </div>
        </div>
      </Card>

      {canRespond && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Respond to this quotation
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment (optional)"
              className="h-10 w-full max-w-md rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              onClick={() => respond('accept')}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => respond('reject')}
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => respond('request_changes')}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Request Changes
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
