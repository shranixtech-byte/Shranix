import { useEffect, useState, useCallback } from 'react';
import { Loader2, Search, Ban, CheckCircle2 } from 'lucide-react';
import { getCreditCustomers, blockCustomer, releaseCustomer, getCreditCustomer, type CustomerCreditProfile } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

const riskColors: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
const warningColors: Record<string, string> = { green: 'text-green-600', amber: 'text-yellow-600', red: 'text-orange-600', critical: 'text-red-600 font-bold' };

export function CreditCustomersPage() {
  const [data, setData] = useState<CustomerCreditProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const r = await getCreditCustomers({ page, pageSize: 20, search: search || undefined }); setData(r.data || []); setTotal(r.total || 0); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelect = useCallback(async (id: string) => {
    try { setSelectedCustomer(await getCreditCustomer(id)); }
    catch (err) { console.error(err); }
  }, []);

  const handleBlock = async (id: string, reason: string) => {
    setActionLoading(id); try { await blockCustomer(id, reason); fetchData(); if (selectedCustomer?.customerId === id) handleSelect(id); } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const handleRelease = async (id: string, reason: string) => {
    setActionLoading(id); try { await releaseCustomer(id, reason); fetchData(); if (selectedCustomer?.customerId === id) handleSelect(id); } catch (err) { console.error(err); } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Credit Profiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage credit limits, risk levels, and customer blocks</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <span className="text-xs text-muted-foreground">{total} customers</span>
        {selectedCustomer && <button onClick={() => setSelectedCustomer(null)} className="text-xs text-primary underline">Back to list</button>}
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      : selectedCustomer ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{selectedCustomer.customerName}</h2>
              <p className="text-xs text-muted-foreground">{selectedCustomer.customerCode} · {selectedCustomer.customerId}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${riskColors[selectedCustomer.riskCategory] || ''}`}>{selectedCustomer.riskCategory}</span>
              {selectedCustomer.isBlocked ? (
                <button onClick={() => handleRelease(selectedCustomer.customerId, 'Manual release')} disabled={actionLoading === selectedCustomer.customerId} className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Release
                </button>
              ) : (
                <button onClick={() => handleBlock(selectedCustomer.customerId, 'Manual block')} disabled={actionLoading === selectedCustomer.customerId} className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  <Ban className="h-3.5 w-3.5" /> Block
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><p className="text-[10px] text-muted-foreground uppercase">Credit Limit</p><p className="text-lg font-bold">{formatCurrency(selectedCustomer.creditLimit)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Outstanding</p><p className="text-lg font-bold text-red-600">{formatCurrency(selectedCustomer.outstanding)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Available</p><p className="text-lg font-bold text-green-600">{formatCurrency(selectedCustomer.availableCredit)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Credit Days</p><p className="text-lg font-bold">{selectedCustomer.creditDays}d</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Overdue</p><p className="text-lg font-bold text-orange-600">{formatCurrency(selectedCustomer.overdueAmount)}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Health Score</p><p className="text-lg font-bold">{selectedCustomer.healthScore}/100</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Credit Rating</p><p className="text-lg font-bold">{selectedCustomer.creditRating || 'N/A'}</p></div>
            <div><p className="text-[10px] text-muted-foreground uppercase">Avg Payment Days</p><p className="text-lg font-bold">{selectedCustomer.averagePaymentDays || 'N/A'}</p></div>
          </div>
          {selectedCustomer.isBlocked && <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">Blocked: {selectedCustomer.blockReason}</div>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold text-right">Limit</th>
                <th className="px-3 py-2.5 font-semibold text-right">Outstanding</th>
                <th className="px-3 py-2.5 font-semibold text-right">Available</th>
                <th className="px-3 py-2.5 font-semibold text-right">Overdue</th>
                <th className="px-3 py-2.5 font-semibold text-center">Risk</th>
                <th className="px-3 py-2.5 font-semibold text-center">Warning</th>
                <th className="px-3 py-2.5 font-semibold text-center">Health</th>
                <th className="px-3 py-2.5 font-semibold text-center">Status</th>
                <th className="px-3 py-2.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((c) => (
                <tr key={c.customerId} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleSelect(c.customerId)}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{c.customerCode}</p>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(c.outstanding)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${c.availableCredit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(c.availableCredit)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-orange-600">{formatCurrency(c.overdueAmount)}</td>
                  <td className="px-3 py-2 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${riskColors[c.riskCategory] || ''}`}>{c.riskCategory}</span></td>
                  <td className={`px-3 py-2 text-center text-[10px] font-medium capitalize ${warningColors[c.warningLevel] || ''}`}>{c.warningLevel}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{c.healthScore}</td>
                  <td className="px-3 py-2 text-center">{c.isBlocked ? <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">Blocked</span> : <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Active</span>}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={(e) => { e.stopPropagation(); handleSelect(c.customerId); }} className="text-xs text-primary underline">View</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && !selectedCustomer && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent">Next</button>
        </div>
      )}
    </div>
  );
}
