import { Lock, Unlock, Search, RefreshCw, AlertCircle, CheckCircle, History } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { apiRequest } from '@/services/api-client';

interface BatchStock {
  id: string;
  itemId: string;
  batchNo: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: string;
  locationCode: string;
}

interface ReservationHistoryItem {
  id: string;
  batchId: string;
  action: 'reserve' | 'release';
  quantity: number;
  reason: string;
  userId: string;
  createdAt: string;
}

export function StockReservationPage() {
  const [batches, setBatches] = useState<BatchStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reserveForm, setReserveForm] = useState<Record<string, { qty: number; reason: string }>>({});
  const [releaseForm, setReleaseForm] = useState<Record<string, { qty: number; reason: string }>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<ReservationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await apiRequest('/inventory/batches?pageSize=1000');
      const data = result?.data || result || [];
      setBatches(Array.isArray(data) ? data : []);
      // Load reservation history
      const histResult: any = await apiRequest('/inventory/stock-movements?pageSize=200');
      const histData = histResult?.data || histResult || [];
      setHistory(
        (Array.isArray(histData) ? histData : [])
          .filter((m: any) => m.movementType === 'reserve' || m.movementType === 'release')
          .map((m: any) => ({
            id: m.id,
            batchId: m.batchNo || m.referenceId,
            action: m.movementType as 'reserve' | 'release',
            quantity: m.quantity,
            reason: m.reason || m.notes || '',
            userId: m.createdBy || '',
            createdAt: m.createdAt,
          }))
      );
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleReserve = async (batchId: string) => {
    const form = reserveForm[batchId];
    if (!form || form.qty <= 0) {return;}
    setActionLoading(batchId);
    setError(null);
    try {
      const batch = batches.find((b) => b.id === batchId);
      await apiRequest(`/inventory/batches/${batchId}`, {
        method: 'PUT',
        body: JSON.stringify({
          reservedQuantity: (batch?.reservedQuantity || 0) + form.qty,
          availableQuantity: Math.max(0, (batch?.quantity || 0) - (batch?.reservedQuantity || 0) - form.qty),
        }),
      });
      // Log the reservation
      await apiRequest('/inventory/stock-movements', {
        method: 'POST',
        body: JSON.stringify({
          itemId: batch?.itemId,
          batchNo: batch?.batchNo,
          warehouseId: batch?.warehouseId,
          movementType: 'reserve',
          quantity: form.qty,
          reason: form.reason || 'Manual reservation',
          notes: form.reason,
        }),
      });
      setReserveForm((prev) => {
        const next = { ...prev };
        delete next[batchId];
        return next;
      });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to reserve stock');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (batchId: string, qty: number, reason: string) => {
    if (qty <= 0) {return;}
    setActionLoading(batchId);
    setError(null);
    try {
      const batch = batches.find((b) => b.id === batchId);
      const newReserved = Math.max(0, (batch?.reservedQuantity || 0) - qty);
      await apiRequest(`/inventory/batches/${batchId}`, {
        method: 'PUT',
        body: JSON.stringify({
          reservedQuantity: newReserved,
          availableQuantity: (batch?.quantity || 0) - newReserved,
        }),
      });
      await apiRequest('/inventory/stock-movements', {
        method: 'POST',
        body: JSON.stringify({
          itemId: batch?.itemId,
          batchNo: batch?.batchNo,
          warehouseId: batch?.warehouseId,
          movementType: 'release',
          quantity: qty,
          reason: reason || 'Manual release',
          notes: reason,
        }),
      });
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to release stock');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = batches.filter((b) => {
    if (!search) {return true;}
    const q = search.toLowerCase();
    return (
      b.batchNo?.toLowerCase().includes(q) ||
      b.itemId?.toLowerCase().includes(q) ||
      b.warehouseId?.toLowerCase().includes(q) ||
      b.locationCode?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading stock data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Reservation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage reserved stock, allocation, and release</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'Hide History' : 'Reservation History'}
          </button>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search batch, item, warehouse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Reservation History Panel */}
      {showHistory && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Reservation History</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No reservation history available</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-3">
                    {h.action === 'reserve' ? (
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span className={`font-medium ${h.action === 'reserve' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {h.action === 'reserve' ? 'Reserved' : 'Released'} {h.quantity}
                    </span>
                    <span className="text-muted-foreground">— {h.reason}</span>
                  </div>
                  <span className="text-muted-foreground">{h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Stock</p>
          <p className="mt-2 text-2xl font-bold">{batches.reduce((s, b) => s + (b.quantity || 0), 0)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 uppercase tracking-wide">
            <Lock className="h-3 w-3" /> Reserved
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{batches.reduce((s, b) => s + (b.reservedQuantity || 0), 0)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 uppercase tracking-wide">
            <CheckCircle className="h-3 w-3" /> Available
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {batches.reduce((s, b) => s + ((b.availableQuantity ?? b.quantity ?? 0) - (b.reservedQuantity ?? 0)), 0)}
          </p>
        </div>
      </div>

      {/* Batch List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Lock className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No stock batches found</p>
            <p className="text-xs text-muted-foreground/60">Create stock entries first to manage reservations</p>
          </div>
        ) : (
          filtered.map((batch) => {
            const available = (batch.availableQuantity ?? batch.quantity ?? 0) - (batch.reservedQuantity ?? 0);
            return (
              <div key={batch.id} className="rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{batch.batchNo || 'No Batch'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        batch.status === 'expired' ? 'bg-red-50 text-red-700' :
                        batch.status === 'near_expiry' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>{batch.status || 'fresh'}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Item: {batch.itemId}</span>
                      <span>WH: {batch.warehouseId || '—'}</span>
                      {batch.locationCode && <span>Loc: {batch.locationCode}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Qty</p>
                      <p className="text-sm font-bold">{batch.quantity || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-amber-600">Reserved</p>
                      <p className="text-sm font-bold text-amber-600">{batch.reservedQuantity || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600">Available</p>
                      <p className="text-sm font-bold text-emerald-600">{available}</p>
                    </div>
                  </div>
                </div>

                {available > 0 && (
                  <div className="mt-4 flex items-center gap-3 border-t pt-3">
                    <input
                      type="number"
                      min={0}
                      max={available}
                      placeholder="Qty"
                      value={reserveForm[batch.id]?.qty ?? ''}
                      onChange={(e) =>
                        setReserveForm((prev) => ({
                          ...prev,
                          [batch.id]: { qty: Number(e.target.value) || 0, reason: prev[batch.id]?.reason || '' },
                        }))
                      }
                      className="w-20 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Reason (e.g., Sales Order SO-001)"
                      value={reserveForm[batch.id]?.reason ?? ''}
                      onChange={(e) =>
                        setReserveForm((prev) => ({
                          ...prev,
                          [batch.id]: { qty: prev[batch.id]?.qty || 0, reason: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleReserve(batch.id)}
                      disabled={!reserveForm[batch.id]?.qty || actionLoading === batch.id}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Lock className="h-3 w-3" />
                      Reserve
                    </button>
                  </div>
                )}

                {(batch.reservedQuantity ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={batch.reservedQuantity}
                      placeholder="Release qty"
                      value={releaseForm[batch.id]?.qty ?? ''}
                      onChange={(e) =>
                        setReleaseForm((prev) => ({
                          ...prev,
                          [batch.id]: { qty: Number(e.target.value) || 0, reason: prev[batch.id]?.reason || '' },
                        }))
                      }
                      className="w-20 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        const qty = releaseForm[batch.id]?.qty || 0;
                        if (qty > 0) {handleRelease(batch.id, qty, 'Manual release');}
                      }}
                      disabled={!releaseForm[batch.id]?.qty || actionLoading === batch.id}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-all hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                    >
                      <Unlock className="h-3 w-3" />
                      Release
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
