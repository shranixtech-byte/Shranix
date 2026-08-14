import { Search, Calendar, Download } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { apiRequest } from '@/services/api-client';

interface LedgerEntry {
  id: string;
  itemId: string;
  batchNo?: string;
  transactionType: string;
  direction?: string;
  quantity: number;
  unitCost?: number;
  amount?: number;
  balanceQuantity?: number;
  documentType?: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt?: string;
  createdBy?: string;
}

const movementLabels: Record<string, string> = {
  opening: '📦 Opening',
  purchase_receipt: '📥 Purchase',
  purchase_return: '↩️ Purchase Return',
  sales_issue: '📤 Sale',
  sales_return: '↩️ Sales Return',
  transfer_in: '🔄 Transfer In',
  transfer_out: '🔄 Transfer Out',
  adjustment: '⚖️ Adjustment',
  damage: '💔 Damage',
  scrap: '🗑️ Scrap',
  production_receipt: '🏭 Production In',
  production_issue: '🏭 Production Out',
  cycle_count: '🔢 Cycle Count',
  reservation: '🔒 Reserved',
  release: '🔓 Released',
  reversal: '✏️ Reversal',
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
      if (movementFilter) {
        params.set('movementType', movementFilter);
      }

      if (fromDate) {
        params.set('fromDate', fromDate);
      }
      if (toDate) {
        params.set('toDate', toDate);
      }
      if (search) {
        params.set('itemId', search);
      }

      const result: any = await apiRequest(`/inventory/ledger?${params}`);
      setData(Array.isArray(result.data) ? result.data : []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, movementFilter, fromDate, toDate, search]);

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  const handleExport = () => {
    const headers = [
      'Date',
      'Type',
      'Item',
      'Batch',
      'Qty In',
      'Qty Out',
      'Balance',
      'Rate',
      'Reference',
      'Reason',
      'User',
    ];
    const rows = data.map((e) => {
      const isIn = e.direction === 'IN';
      return [
        e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '',
        movementLabels[e.transactionType] || e.transactionType,
        e.itemId,
        e.batchNo || '',
        isIn ? e.quantity : '',
        !isIn ? e.quantity : '',
        e.balanceQuantity ?? '',
        e.unitCost ?? '',
        e.documentType ?? e.referenceNumber ?? '',
        e.remarks ?? '',
        e.createdBy ?? '',
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stock-ledger.csv';
    a.click();
  };

  const runningBalance = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }
    const last = data[data.length - 1];
    return last.balanceQuantity ?? last.quantity ?? 0;
  }, [data]);

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Ledger</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every stock movement with In/Out/Balance —{' '}
            {loading ? '' : `Running Balance: ${runningBalance}`}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by item ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-background focus:border-primary focus:ring-primary h-10 w-full rounded-xl border pl-10 pr-4 text-sm outline-none focus:ring-1"
          />
        </div>
        <select
          value={movementFilter}
          onChange={(e) => {
            setMovementFilter(e.target.value);
            setPage(1);
          }}
          className="bg-background focus:border-primary focus:ring-primary h-10 cursor-pointer appearance-none rounded-xl border px-3 pr-8 text-sm outline-none focus:ring-1"
        >
          <option value="">All Types</option>
          {Object.entries(movementLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="bg-background focus:border-primary focus:ring-primary h-10 rounded-xl border px-3 text-sm outline-none focus:ring-1"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="bg-background focus:border-primary focus:ring-primary h-10 rounded-xl border px-3 text-sm outline-none focus:ring-1"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Date
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Type
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Item
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Batch
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Qty In
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Qty Out
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Balance
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Rate
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                  Reason
                </th>
                <th className="text-muted-foreground px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="bg-muted h-5 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-muted-foreground px-4 py-16 text-center text-sm">
                    No movements found
                  </td>
                </tr>
              ) : (
                data.map((entry, idx) => {
                  const isIn = entry.direction === 'IN';
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {movementLabels[entry.transactionType] || entry.transactionType}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{entry.itemId}</td>
                      <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                        {entry.batchNo || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-emerald-600">
                        {isIn ? entry.quantity : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-red-600">
                        {!isIn ? entry.quantity : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold">
                        {entry.balanceQuantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {entry.unitCost ? `₹${entry.unitCost.toFixed(2)}` : '—'}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {entry.documentType || entry.referenceNumber || '—'}
                      </td>
                      <td className="text-muted-foreground max-w-[120px] truncate px-4 py-3 text-xs">
                        {entry.remarks || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold">
                        {idx === 0 ? (entry.balanceQuantity ?? '—') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, page - 2);
                const p = start + i;
                if (p > totalPages) {
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="hover:bg-muted rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
