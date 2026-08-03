import { Loader2, RefreshCw, Plus, FileText, Search } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getAllDebitNotes,
  postDebitNote,
  createDebitNote,
  getPostedInvoices,
} from '@/services/sales-return.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

const debitTypes = [
  { value: 'price_correction', label: 'Price Correction' },
  { value: 'short_billing', label: 'Short Billing' },
  { value: 'additional_charges', label: 'Additional Charges' },
  { value: 'tax_adjustment', label: 'Tax Adjustment' },
  { value: 'freight', label: 'Freight' },
  { value: 'handling', label: 'Handling' },
  { value: 'packing', label: 'Packing' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'interest', label: 'Interest' },
];

export function DebitNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    debitNoteNumber: '',
    customerId: '',
    originalInvoiceId: '',
    originalInvoiceNumber: '',
    debitNoteDate: '',
    debitType: 'price_correction',
    amount: 0,
    narration: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setNotes((await getAllDebitNotes()) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePost = async (id: string) => {
    try {
      await postDebitNote(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createDebitNote({
        ...form,
        debitNoteNumber: form.debitNoteNumber || `DN-${Date.now().toString(36).toUpperCase()}`,
        createdBy: 'user',
      });
      setShowCreate(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? notes.filter(
        (n) =>
          n.debitNoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
          n.originalInvoiceNumber?.toLowerCase().includes(search.toLowerCase()),
      )
    : notes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Debit Notes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Price corrections, charges, and adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCreate(true);
              getPostedInvoices({ pageSize: 100 }).then((r) => setInvoices(r.data || []));
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Debit Note
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search debit notes..."
          className="bg-background focus:ring-primary/50 w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <div className="bg-muted/30 text-muted-foreground grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
            <span>#</span>
            <span>Type</span>
            <span>Invoice</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center py-12">
                <FileText className="mb-2 h-8 w-8" />
                <p className="text-sm">No debit notes found</p>
              </div>
            ) : (
              filtered.map((dn) => (
                <div
                  key={dn.id}
                  className="hover:bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm transition-colors"
                >
                  <p className="font-medium">{dn.debitNoteNumber}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {dn.debitType?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-muted-foreground">{dn.originalInvoiceNumber || '—'}</p>
                  <p className="font-medium tabular-nums">{formatCurrency(dn.amount || 0)}</p>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      dn.status === 'posted'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}
                  >
                    {dn.status || 'draft'}
                  </span>
                  <div className="flex gap-1">
                    {dn.status !== 'posted' && (
                      <button
                        onClick={() => handlePost(dn.id)}
                        className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-500/20"
                      >
                        Post
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card w-full max-w-lg rounded-xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">New Debit Note</h3>
            <div className="mt-4 space-y-3">
              <input
                value={form.debitNoteNumber}
                onChange={(e) => setForm({ ...form, debitNoteNumber: e.target.value })}
                placeholder="Debit Note Number (auto)"
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
              <select
                value={form.debitType}
                onChange={(e) => setForm({ ...form, debitType: e.target.value })}
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                {debitTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={form.originalInvoiceId}
                onChange={(e) => {
                  const inv = invoices.find((i) => i.id === e.target.value);
                  setForm({
                    ...form,
                    originalInvoiceId: e.target.value,
                    originalInvoiceNumber: inv?.invoiceNumber || '',
                    customerId: inv?.customerId || '',
                  });
                }}
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              >
                <option value="">Select Invoice</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.customerName || inv.customerId}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="Amount"
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
              <textarea
                value={form.narration}
                onChange={(e) => setForm({ ...form, narration: e.target.value })}
                placeholder="Narration / Reason"
                rows={2}
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="bg-background hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.amount}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
