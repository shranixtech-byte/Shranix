import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

type EntryType = 'opening' | 'purchase_receipt' | 'manual';

export function NewStockEntryPage() {
  const navigate = useNavigate();
  const [entryType, setEntryType] = useState<EntryType>('opening');
  const [form, setForm] = useState({
    itemId: '', batchNo: '', lotNo: '', warehouseId: '', supplierId: '',
    purchaseReference: '', quantity: 1, purchaseRate: 0, mrp: 0,
    sellingPrice: 0, distributorPrice: 0, retailPrice: 0,
    mfgDate: '', expDate: '', remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = { ...form, entryType };
      await apiRequest('/inventory/batches/stock/opening', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSuccess(true);
      setForm({
        itemId: '', batchNo: '', lotNo: '', warehouseId: '', supplierId: '',
        purchaseReference: '', quantity: 1, purchaseRate: 0, mrp: 0,
        sellingPrice: 0, distributorPrice: 0, retailPrice: 0,
        mfgDate: '', expDate: '', remarks: '',
      });
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
          <h1 className="text-xl font-bold tracking-tight">New Stock Entry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create opening stock, purchase receipt, or manual entry</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Stock entry recorded successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {/* Entry Type */}
          <div className="mb-6 flex gap-2">
            {(['opening', 'purchase_receipt', 'manual'] as EntryType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEntryType(type)}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                  entryType === type
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {type === 'opening' ? '📦 Opening Stock' : type === 'purchase_receipt' ? '📥 Purchase Receipt' : '✏️ Manual Entry'}
              </button>
            ))}
          </div>

          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Product *</label>
              <input value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} required
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Batch Number *</label>
              <input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} required
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Lot Number</label>
              <input value={form.lotNo} onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Warehouse</label>
              <input value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Supplier</label>
              <input value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Purchase Ref</label>
              <input value={form.purchaseReference} onChange={(e) => setForm({ ...form, purchaseReference: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Quantity *</label>
              <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Purchase Rate</label>
              <input type="number" min={0} step={0.01} value={form.purchaseRate} onChange={(e) => setForm({ ...form, purchaseRate: Number(e.target.value) })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">MRP</label>
              <input type="number" min={0} step={0.01} value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Selling Price</label>
              <input type="number" min={0} step={0.01} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Distributor Price</label>
              <input type="number" min={0} step={0.01} value={form.distributorPrice} onChange={(e) => setForm({ ...form, distributorPrice: Number(e.target.value) })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Retail Price</label>
              <input type="number" min={0} step={0.01} value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Manufacturing Date</label>
              <input type="date" value={form.mfgDate} onChange={(e) => setForm({ ...form, mfgDate: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Expiry Date</label>
              <input type="date" value={form.expDate} onChange={(e) => setForm({ ...form, expDate: e.target.value })}
                className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-5">
            <button type="button" onClick={() => navigate('/inventory/stock-movements')}
              className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-all hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Recording...' : `Record ${entryType === 'opening' ? 'Opening' : entryType === 'purchase_receipt' ? 'Receipt' : 'Entry'}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
