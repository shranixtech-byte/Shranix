import { useEffect, useState, useCallback } from 'react';
import { Loader2, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { getRecoveryDashboard } from '@/services/sales-credit.service';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function RecoveryDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => { setLoading(true); try { setData(await getRecoveryDashboard()); } catch (err) { console.error(err); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Recovery Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Collection performance and recovery tracking</p></div>
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : data ? (<>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-red-50 p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-xs text-red-600 uppercase font-medium">Pending Collection</p><DollarSign className="h-4 w-4 text-red-500" /></div>
            <p className="mt-2 text-2xl font-bold text-red-700">{formatCurrency(data.pendingCollection)}</p>
          </div>
          <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-xs text-green-600 uppercase font-medium">Today's Collection</p><TrendingUp className="h-4 w-4 text-green-500" /></div>
            <p className="mt-2 text-2xl font-bold text-green-700">{formatCurrency(data.todayCollection)}</p>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-xs text-blue-600 uppercase font-medium">Collection Efficiency</p><Clock className="h-4 w-4 text-blue-500" /></div>
            <p className="mt-2 text-2xl font-bold text-blue-700">{data.collectionEfficiency}%</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Collection Trend (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {(data.collectionTrend || []).map((d: any, i: number) => {
              const maxVal = Math.max(...(data.collectionTrend || []).map((t: any) => t.amount), 1);
              const pct = ((d.amount || 0) / maxVal) * 100;
              return <div key={i} className="group relative flex-1 flex flex-col items-center" title={`${d.date}: ${formatCurrency(d.amount)}`}>
                <div className="w-full rounded-t bg-gradient-to-t from-green-500 to-green-400 transition-all hover:from-green-600" style={{ height: `${Math.max(pct, 2)}%`, minHeight: d.amount > 0 ? 4 : 0 }} />
              </div>;
            })}
          </div>
        </div>
      </>) : <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No recovery data available</div>}
    </div>
  );
}
