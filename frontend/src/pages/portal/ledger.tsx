import { useEffect, useState } from 'react';

import { portalService } from '@/services/portal.service';

import { Card, DataTable, fmtDate, fmtINR, PageHeader, PortalEmpty, PortalLoading } from './common';

export function PortalLedgerPage() {
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = (p = page, f = from, t = to) => {
    setError(null);
    portalService
      .getLedger({ from: f || undefined, to: t || undefined, page: p, pageSize: 50 })
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setPage(1);
    load(1, from, to);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!data) {
    return <PortalLoading />;
  }

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 50)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle={`Opening balance ${fmtINR(data.openingBalance)} · Closing ${fmtINR(data.closingBalance)}`}
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          onClick={applyFilters}
          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Apply
        </button>
      </Card>

      {data.entries.length === 0 ? (
        <PortalEmpty title="No ledger entries in this range" />
      ) : (
        <Card>
          <DataTable headers={['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance']}>
            {data.entries.map((e: any) => (
              <tr
                key={`${e.type}-${e.documentId}`}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(e.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {e.reference}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{e.description}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {e.debit ? fmtINR(e.debit) : '—'}
                </td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                  {e.credit ? fmtINR(e.credit) : '—'}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                  {fmtINR(e.balance)}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400">
              Page {data.page} of {totalPages} · {data.total} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  load(p);
                }}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  load(p);
                }}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Next →
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
