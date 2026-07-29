import { ArrowLeft, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

export function StockAdjustmentPage() {
  const navigate = useNavigate();
  const [batchId, setBatchId] = useState('');
  const [type, setType] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId.trim()) { setError('Batch ID is required'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest(`/inventory/batches/${batchId}/stock/adjustment`, {
        method: 'POST',
        body: JSON.stringify({ type, quantity, reason, remarks }),
      });
      setSuccess(true);
      setBatchId(''); setQuantity(1); setReason(''); setRemarks('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inventory/stock-movements')} className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-all hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stock Adjustment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Increase or decrease stock for a specific batch</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Stock adjusted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex gap-2 mb-6">
            <button type="button" onClick={() => setType('increase')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                type === 'increase' ? 'bg-emerald-600 text-white shadow-sm' : 'border bg-background text-muted-foreground hover:bg-muted'
              }`}>
              <TrendingUp className="h-4 w-4" /> Increase Stock
            </button>
            <button type="button" onClick={() => setType('decrease')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                type === 'decrease' ? 'bg-red-600 text-white shadow-sm' : 'border bg-background text-muted-foreground hover:bg-muted'
              }`}>
              <TrendingDown className="h-4 w-4" /> Decrease Stock
            </button>
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Batch ID *</label>
              <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required placeholder="Enter batch ID"
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Quantity *</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reason *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} required
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="">Select reason...</option>
                <option value="physical_count">Physical Count Difference</option>
                <option value="damaged">Damaged Goods</option>
                <option value="expired">Expired</option>
                <option value="return_to_supplier">Return to Supplier</option>
                <option value="found_in_warehouse">Found in Warehouse</option>
                <option value="sample">Sample / Promotion</option>
                <option value="write_off">Write Off</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Additional notes..."
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-5">
            <button type="button" onClick={() => navigate('/inventory/stock-movements')}
              className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-all hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Processing...' : `Apply ${type === 'increase' ? 'Increase' : 'Decrease'}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
