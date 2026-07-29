import { ArrowRightLeft, Plus, Search, Filter, CheckCircle, XCircle, Clock, Eye, RefreshCw, ChevronDown, ChevronUp, Send, AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

interface Transfer {
  id: string;
  transferNumber: string;
  fromLocation: string;
  toLocation: string;
  fromType: string;
  toType: string;
  itemId: string;
  batchNo: string;
  quantity: number;
  reason: string;
  status: string;
  requestedBy: string;
  approvedBy: string;
  approvedDate: string;
  rejectedReason: string;
  createdAt: string;
}

export function StockTransfersPage() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await apiRequest('/inventory/transfers?pageSize=1000');
      const data = result?.data || result || [];
      setTransfers(Array.isArray(data) ? data : []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRequest(`/inventory/transfers/${id}/approve`, { method: 'POST' });
      await load();
    } catch {
      alert('Failed to approve transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {return;}
    setActionLoading(id);
    try {
      await apiRequest(`/inventory/transfers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setShowReject(null);
      setRejectReason('');
      await load();
    } catch {
      alert('Failed to reject transfer');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = transfers.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) {return false;}
    if (!search) {return true;}
    const q = search.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.fromLocation.toLowerCase().includes(q) ||
      t.toLocation.toLowerCase().includes(q) ||
      t.itemId?.toLowerCase().includes(q) ||
      t.batchNo?.toLowerCase().includes(q)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      approved: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return map[status] || map.draft;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'rejected': return <XCircle className="h-3.5 w-3.5" />;
      case 'completed': return <CheckCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage inventory transfers between warehouses and locations</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load()} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => navigate('/inventory/create-transfer')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> New Transfer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transfers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {['all', 'draft', 'pending', 'approved', 'completed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>Showing {Math.min(filtered.length, 1 + (page - 1) * pageSize)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} transfers</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded px-2.5 py-1 transition hover:bg-muted disabled:opacity-40"
          >
            ← Prev
          </button>
          {Array.from({ length: Math.ceil(filtered.length / pageSize) }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === Math.ceil(filtered.length / pageSize) || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">...</span>}
                <button
                  onClick={() => setPage(p)}
                  className={`rounded px-2.5 py-1 text-xs transition ${
                    p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
            disabled={page >= Math.ceil(filtered.length / pageSize)}
            className="rounded px-2.5 py-1 transition hover:bg-muted disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No transfers found</p>
            <p className="text-xs text-muted-foreground/60">Create a new transfer to get started</p>
          </div>
        ) : (
          filtered.slice((page - 1) * pageSize, page * pageSize).map((t) => (
            <div key={t.id} className="rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{t.transferNumber}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(t.status)}`}>
                        {statusIcon(t.status)}
                        {t.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.fromLocation} ({t.fromType})</span>
                      <span>→</span>
                      <span>{t.toLocation} ({t.toType})</span>
                      <span className="mx-1.5 text-muted-foreground/40">|</span>
                      <span>Qty: {t.quantity}</span>
                      <span className="mx-1.5 text-muted-foreground/40">|</span>
                      <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => setDetailId(detailId === t.id ? null : t.id)}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-muted"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                    {detailId === t.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {(t.status === 'draft' || t.status === 'pending') && (
                    <>
                      <button
                        onClick={() => handleApprove(t.id)}
                        disabled={actionLoading === t.id}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowReject(showReject === t.id ? null : t.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showReject === t.id && (
                <div className="border-t px-5 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-red-600">Rejection Reason *</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide a reason for rejection..."
                        className="w-full rounded-lg border border-red-200 bg-background px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-red-800"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <button
                        onClick={() => handleReject(t.id)}
                        disabled={!rejectReason.trim() || actionLoading === t.id}
                        className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50"
                      >
                        {actionLoading === t.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowReject(null); setRejectReason(''); }}
                        className="rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailId === t.id && (
                <div className="border-t px-5 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Transfer Number</p>
                      <p className="font-medium">{t.transferNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{t.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="font-medium">{t.fromLocation} ({t.fromType})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">To</p>
                      <p className="font-medium">{t.toLocation} ({t.toType})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Item ID</p>
                      <p className="font-mono text-xs">{t.itemId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Batch No</p>
                      <p className="font-mono text-xs">{t.batchNo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quantity</p>
                      <p className="font-medium">{t.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p className="text-xs">{t.reason || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Requested By</p>
                      <p className="text-xs">{t.requestedBy || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approved By</p>
                      <p className="text-xs">{t.approvedBy || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approved Date</p>
                      <p className="text-xs">{t.approvedDate ? new Date(t.approvedDate).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rejected Reason</p>
                      <p className="text-xs text-red-500">{t.rejectedReason || '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CreateTransferPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    transferNumber: `TRF-${Date.now().toString(36).toUpperCase()}`,
    fromLocation: '',
    toLocation: '',
    fromType: 'warehouse',
    toType: 'warehouse',
    itemId: '',
    batchNo: '',
    quantity: 1,
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.fromLocation || !form.toLocation || !form.itemId) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      navigate('/inventory/stock-transfers');
    } catch (e: any) {
      setError(e.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Stock Transfer</h1>
          <p className="mt-1 text-sm text-muted-foreground">Transfer inventory between warehouses and locations</p>
        </div>
        <button onClick={() => navigate('/inventory/stock-transfers')} className="rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:bg-muted">
          ← Back to Transfers
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Transfer Number *</label>
              <input
                type="text"
                value={form.transferNumber}
                onChange={(e) => setForm({ ...form, transferNumber: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Quantity *</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">From Location *</label>
              <input
                type="text"
                value={form.fromLocation}
                onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
                placeholder="Warehouse / Godown / Rack"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">From Type</label>
              <select
                value={form.fromType}
                onChange={(e) => setForm({ ...form, fromType: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="warehouse">Warehouse</option>
                <option value="godown">Godown</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">To Location *</label>
              <input
                type="text"
                value={form.toLocation}
                onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
                placeholder="Warehouse / Godown / Rack"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">To Type</label>
              <select
                value={form.toType}
                onChange={(e) => setForm({ ...form, toType: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="warehouse">Warehouse</option>
                <option value="godown">Godown</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Item ID *</label>
              <input
                type="text"
                value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                placeholder="Enter item ID or SKU"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Batch No</label>
              <input
                type="text"
                value={form.batchNo}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                placeholder="Optional batch number"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">Reason / Remarks</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for transfer..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => navigate('/inventory/stock-transfers')}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
