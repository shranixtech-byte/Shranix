import {
  Loader2,
  RefreshCw,
  Search,
  FileText,
  BarChart3,
  PieChart,
  TrendingDown,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getReturnRegister,
  getReturnSummary,
  getReasonAnalysis,
  getCreditNoteRegister,
  getDebitNoteRegister,
} from '@/services/sales-return.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

type ReportTab = 'register' | 'summary' | 'reasons' | 'credit-notes' | 'debit-notes';

export function ReturnReportsPage() {
  const [tab, setTab] = useState<ReportTab>('register');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'register': {
          const res = await getReturnRegister({ search, pageSize: 100 });
          setData(res);
          break;
        }
        case 'summary':
          setData(await getReturnSummary());
          break;
        case 'reasons':
          setData(await getReasonAnalysis());
          break;
        case 'credit-notes':
          setData(await getCreditNoteRegister());
          break;
        case 'debit-notes':
          setData(await getDebitNoteRegister());
          break;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs = [
    { key: 'register' as ReportTab, label: 'Return Register', icon: FileText },
    { key: 'summary' as ReportTab, label: 'Summary', icon: BarChart3 },
    { key: 'reasons' as ReportTab, label: 'Reason Analysis', icon: PieChart },
    { key: 'credit-notes' as ReportTab, label: 'Credit Notes', icon: TrendingDown },
    { key: 'debit-notes' as ReportTab, label: 'Debit Notes', icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Return Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sales return register, analysis, and credit/debit note reports
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-background hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              tab === t.key
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card hover:bg-accent text-muted-foreground'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Search (register only) */}
      {tab === 'register' && (
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search returns..."
            className="bg-background focus:ring-primary/50 w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          {tab === 'register' && data && (
            <div>
              <div className="bg-muted/30 text-muted-foreground grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
                <span>Return #</span>
                <span>Invoice</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Credit Note</span>
              </div>
              <div className="divide-y">
                {data.data?.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center py-12">
                    <FileText className="mb-2 h-8 w-8" />
                    <p className="text-sm">No returns found</p>
                  </div>
                ) : (
                  (data.data || []).map((r: any) => (
                    <div
                      key={r.id}
                      className="hover:bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm"
                    >
                      <p className="font-medium">{r.returnNumber}</p>
                      <p className="text-muted-foreground">{r.invoiceId?.slice(0, 8)}...</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(r.grandTotal || 0))}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          r.status === 'posted'
                            ? 'bg-green-500/10 text-green-500'
                            : r.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {r.status}
                      </span>
                      <p className="text-muted-foreground text-xs">{r.creditNoteNo || '—'}</p>
                    </div>
                  ))
                )}
              </div>
              {data.total > 0 && (
                <div className="text-muted-foreground border-t px-4 py-2 text-xs">
                  Total: {data.total} returns
                </div>
              )}
            </div>
          )}

          {tab === 'summary' && data && (
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">Total Returns</p>
                <p className="mt-1 text-2xl font-bold">{data.totalReturns || 0}</p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">Total Return Amount</p>
                <p className="mt-1 text-2xl font-bold text-red-500">
                  {formatCurrency(data.totalReturnAmount || 0)}
                </p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">Draft</p>
                <p className="mt-1 text-2xl font-bold text-yellow-500">{data.draftCount || 0}</p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">Posted</p>
                <p className="mt-1 text-2xl font-bold text-green-500">{data.postedCount || 0}</p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">Cancelled</p>
                <p className="text-muted-foreground mt-1 text-2xl font-bold">
                  {data.cancelledCount || 0}
                </p>
              </div>
            </div>
          )}

          {tab === 'reasons' && data && (
            <div>
              <div className="bg-muted/30 text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
                <span>Reason</span>
                <span>Count</span>
                <span>Amount</span>
              </div>
              <div className="divide-y">
                {(data || []).length === 0 ? (
                  <div className="text-muted-foreground p-8 text-center text-sm">
                    No return data
                  </div>
                ) : (
                  data.map((r: any, i: number) => (
                    <div
                      key={i}
                      className="hover:bg-muted/30 grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-sm"
                    >
                      <p className="font-medium capitalize">{r.reason?.replace(/_/g, ' ')}</p>
                      <p className="text-right font-medium tabular-nums">{r.count}</p>
                      <p className="w-24 text-right font-medium tabular-nums">
                        {formatCurrency(r.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'credit-notes' && data && (
            <div>
              <div className="bg-muted/30 text-muted-foreground grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
                <span>Credit Note #</span>
                <span>Return #</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>
              <div className="divide-y">
                {(data || []).length === 0 ? (
                  <div className="text-muted-foreground p-8 text-center text-sm">
                    No credit notes
                  </div>
                ) : (
                  data.map((cn: any, i: number) => (
                    <div
                      key={i}
                      className="hover:bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm"
                    >
                      <p className="font-medium">{cn.creditNoteNo}</p>
                      <p className="text-muted-foreground">{cn.returnNumber}</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(cn.amount || cn.grandTotal || 0))}
                      </p>
                      <span className="text-muted-foreground text-[10px] uppercase">
                        {cn.status}
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {cn.returnDate ? new Date(cn.returnDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'debit-notes' && data && (
            <div>
              <div className="bg-muted/30 text-muted-foreground grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium">
                <span>Debit Note #</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Date</span>
              </div>
              <div className="divide-y">
                {(data || []).length === 0 ? (
                  <div className="text-muted-foreground p-8 text-center text-sm">
                    No debit notes
                  </div>
                ) : (
                  data.map((dn: any, i: number) => (
                    <div
                      key={i}
                      className="hover:bg-muted/30 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm"
                    >
                      <p className="font-medium">{dn.debitNoteNumber}</p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {dn.debitType?.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(dn.amount || 0))}
                      </p>
                      <span className="text-muted-foreground text-[10px] uppercase">
                        {dn.status}
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {dn.debitNoteDate ? new Date(dn.debitNoteDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
