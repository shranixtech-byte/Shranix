import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { portalService } from '@/services/portal.service';

import { Card, DataTable, fmtDate, fmtINR, PageHeader, PortalEmpty, PortalLoading } from './common';

export function PortalDocumentsPage() {
  const [docs, setDocs] = useState<{ quotations: any[]; orders: any[]; invoices: any[] }>({
    quotations: [],
    orders: [],
    invoices: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      portalService.getQuotations(),
      portalService.getOrders(),
      portalService.getInvoices(),
    ])
      .then(([q, o, i]: any) =>
        setDocs({ quotations: q || [], orders: o || [], invoices: i || [] }),
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const download = async (type: string, id: string, number: string) => {
    try {
      await portalService.downloadDocument(type, id, `${number}.pdf`);
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
  if (loading) {
    return <PortalLoading />;
  }

  const total = docs.quotations.length + docs.orders.length + docs.invoices.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Center"
        subtitle="Download your quotations, orders and invoices"
      />
      {total === 0 ? (
        <PortalEmpty title="No documents available yet" />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Invoices ({docs.invoices.length})
              </h2>
            </div>
            {docs.invoices.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No invoices</p>
            ) : (
              <DataTable headers={['Invoice', 'Date', 'Amount', '']}>
                {docs.invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      <Link
                        to={`/portal/invoices/${i.id}`}
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {i.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {fmtDate(i.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {fmtINR(i.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => download('invoice', i.id, i.invoiceNumber)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                      >
                        PDF ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Quotations ({docs.quotations.length})
              </h2>
            </div>
            {docs.quotations.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No quotations</p>
            ) : (
              <DataTable headers={['Quotation', 'Date', 'Amount', '']}>
                {docs.quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      <Link
                        to={`/portal/quotations/${q.id}`}
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {fmtDate(q.quoteDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {fmtINR(q.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => download('quotation', q.id, q.quoteNumber)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                      >
                        PDF ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Orders ({docs.orders.length})
              </h2>
            </div>
            {docs.orders.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No orders</p>
            ) : (
              <DataTable headers={['Order', 'Date', 'Amount', '']}>
                {docs.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      <Link
                        to={`/portal/orders/${o.id}`}
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {fmtDate(o.orderDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {fmtINR(o.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => download('order', o.id, o.orderNumber)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                      >
                        PDF ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
