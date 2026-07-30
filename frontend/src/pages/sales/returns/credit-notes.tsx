import { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Plus, FileText, Search } from 'lucide-react';
import { getAllCreditNotes, postCreditNote } from '@/services/sales-return.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export function CreditNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setNotes(await getAllCreditNotes() || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePost = async (id: string) => {
    try { await postCreditNote(id); fetchData(); }
    catch (e) { console.error(e); }
  };

  const filtered = search ? notes.filter((n) =>
    n.creditNoteNumber?.toLowerCase().includes(search.toLowerCase()) || n.originalInvoiceNumber?.toLowerCase().includes(search.toLowerCase())
  ) : notes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage credit notes from sales returns</p>
        </div>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Credit Note
          </button>
          <button onClick={fetchData} disabled={loading} className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credit notes..."
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      : <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>#</span><span>Invoice</span><span>Amount</span><span>Status</span><span>Action</span>
          </div>
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" /><p className="text-sm">No credit notes found</p>
              </div>
            ) : filtered.map((cn) => (
              <div key={cn.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 text-sm items-center hover:bg-muted/30 transition-colors">
                <p className="font-medium">{cn.creditNoteNumber}</p>
                <p className="text-muted-foreground">{cn.originalInvoiceNumber || cn.invoiceNumber || '—'}</p>
                <p className="font-medium tabular-nums">{formatCurrency(cn.returnAmount || cn.amount || cn.grandTotal || 0)}</p>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  cn.status === 'posted' ? 'bg-green-500/10 text-green-500' :
                  cn.status === 'draft' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'
                }`}>{cn.status || 'draft'}</span>
                <div className="flex gap-1">
                  {cn.status !== 'posted' && (
                    <button onClick={() => handlePost(cn.id)}
                      className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-500/20">
                      Post
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>}
    </div>
  );
}
