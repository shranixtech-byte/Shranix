import { Search, Calendar, Download } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { apiRequest } from '@/services/api-client';

interface LedgerEntry {
  id: string; itemId: string; batchNo?: string; movementType: string;
  quantity: number; rate?: number; amount?: number;
  beforeQuantity?: number; afterQuantity?: number;
  referenceType?: string; referenceId?: string; reason?: string; notes?: string;
  createdAt?: string; userId?: string;
}

const movementLabels: Record<string, string> = {
  opening: '📦 Opening', purchase_receipt: '📥 Purchase', sales_delivery: '📤 Sale',
  purchase_return: '↩️ Purchase Return', sales_return: '↩️ Sales Return',
  stock_adjustment: '⚖️ Adjustment', damage: '💔 Damage',
  transfer: '🔄 Transfer', correction: '✏️ Correction',
};

export function StockLedgerEnhancedPage() {
  const [data, setData] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (movementFilter) {params.set('movementType', movementFilter);}
      if (fromDate) {params.set('fromDate', fromDate);}
      if (toDate) {params.set('toDate', toDate);}
      if (search) {params.set('itemId', search);}

      const result: any = await apiRequest(`/inventory/ledger?${params}`);
      setData(Array.isArray(result.data) ? result.data : []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch { setData([]); }
    finally { setLoading(false); }
  }, [page, pageSize, movementFilter, fromDate, toDate, search]);

  useEffect(() => { void fetchLedger(); }, [fetchLedger]);

  const handleExport = () => {
    const headers = ['Date','Type','Item','Batch','Qty In','Qty Out','Balance','Rate','Reference','Reason','User'];
    const rows = data.map((e) => {
      const isIn = ['opening','purchase_receipt','sales_return','correction'].includes(e.movementType);
      return [
        e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '',
        movementLabels[e.movementType] || e.movementType,
        e.itemId, e.batchNo || '',
        isIn ? e.quantity : '', !isIn ? e.quantity : '',
        e.afterQuantity ?? '', e.rate ?? '',
        e.referenceType ?? '', e.reason ?? '', e.userId ?? '',
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stock-ledger.csv'; a.click();
  };

  const runningBalance = useMemo(() => {
    if (data.length === 0) {return 0;}
    const last = data[data.length - 1];
    return last.afterQuantity ?? last.beforeQuantity ?? last.quantity ?? 0;
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every stock movement with In/Out/Balance — {loading ? '' : `Running Balance: ${runningBalance}`}</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by item ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <select value={movementFilter} onChange={(e) => { setMovementFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border bg-background px-3 pr-8 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
          <option value="">All Types</option>
          {Object.entries(movementLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          <span className="text-muted-foreground text-xs">to</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty In</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty Out</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-5 animate-pulse rounded bg-muted" /></td>
                  ))}</tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-16 text-center text-sm text-muted-foreground">No movements found</td></tr>
              ) : (
                data.map((entry, idx) => {
                  const isIn = ['opening','purchase_receipt','sales_return','correction'].includes(entry.movementType);
                  return (
                    <tr key={entry.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">{movementLabels[entry.movementType] || entry.movementType}</td>
                      <td className="px-4 py-3 text-xs font-medium">{entry.itemId}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{entry.batchNo || '—'}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-emerald-600">{isIn ? entry.quantity : '—'}</td>
                      <td className="px-4 py-3 text-xs text-right font-medium text-red-600">{!isIn ? entry.quantity : '—'}</td>
                      <td className="px-4 py-3 text-xs text-right font-semibold">{entry.afterQuantity ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-right">{entry.rate ? `₹${entry.rate.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.referenceType || '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{entry.reason || '—'}</td>
                      <td className="px-4 py-3 text-xs text-right font-bold">{idx === 0 ? (entry.afterQuantity ?? '—') : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} entries)</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40">← Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const p = start + i;
                if (p > totalPages) {return null;}
                return <button key={p} onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{p}</button>;
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
