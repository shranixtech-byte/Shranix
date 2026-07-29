import { AlertTriangle } from 'lucide-react';

interface ExpiryItemFull {
  name: string;
  batch: string;
  qty: number;
  expiryDate: string;
  daysLeft: number;
  status: 'expired' | 'today' | 'near' | 'safe';
  category: string;
}

const sampleExpiryFull: ExpiryItemFull[] = [
  { name: 'DAP Fertilizer 50kg', batch: 'B-2025-128', qty: 45, expiryDate: '2026-07-15', daysLeft: -13, status: 'expired', category: 'Fertilizer' },
  { name: 'Urea 46% N', batch: 'B-2025-132', qty: 30, expiryDate: '2026-07-20', daysLeft: -8, status: 'expired', category: 'Fertilizer' },
  { name: 'Pesticide Gold', batch: 'B-2026-029', qty: 45, expiryDate: '2026-08-05', daysLeft: 8, status: 'near', category: 'Pesticide' },
  { name: 'DAP Fertilizer', batch: 'B-2026-042', qty: 150, expiryDate: '2026-08-10', daysLeft: 13, status: 'near', category: 'Fertilizer' },
  { name: 'NPK 12:32:16', batch: 'B-2026-045', qty: 200, expiryDate: '2026-08-22', daysLeft: 25, status: 'safe', category: 'Fertilizer' },
  { name: 'Potash 25kg', batch: 'B-2026-040', qty: 120, expiryDate: '2026-08-28', daysLeft: 31, status: 'safe', category: 'Fertilizer' },
  { name: 'Weedicide Pro', batch: 'B-2026-033', qty: 60, expiryDate: '2026-08-04', daysLeft: 7, status: 'near', category: 'Pesticide' },
  { name: 'Bio Fungicide', batch: 'B-2026-035', qty: 25, expiryDate: '2026-08-01', daysLeft: 4, status: 'near', category: 'Pesticide' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function ExpiryAlertWidget() {
  const expired = sampleExpiryFull.filter(i => i.status === 'expired');
  const today = sampleExpiryFull.filter(i => i.daysLeft <= 0 && i.daysLeft > -1);
  const nearWeek = sampleExpiryFull.filter(i => i.daysLeft > 0 && i.daysLeft <= 7);
  const nearMonth = sampleExpiryFull.filter(i => i.daysLeft > 7 && i.daysLeft <= 30);
  const safe = sampleExpiryFull.filter(i => i.daysLeft > 30);

  const categories = [
    { label: 'Expired', items: expired, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/30', count: expired.length },
    { label: 'Expiring Today', items: today, color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/30', count: today.length },
    { label: 'Next 7 Days', items: nearWeek, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/30', count: nearWeek.length },
    { label: 'Next 30 Days', items: [...nearMonth, ...safe], color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/30', count: nearMonth.length + safe.length },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Expiry Alerts</h3>
          <p className="text-[10px] text-slate-400">कालबाह्य सूचना</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {expired.length + nearWeek.length} critical
        </span>
      </div>

      {/* Category summary pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.map(cat => cat.count > 0 && (
          <span key={cat.label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${cat.bgColor} ${cat.textColor} ${cat.border} border`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cat.color}`} />
            {cat.label}: {cat.count}
          </span>
        ))}
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {sampleExpiryFull.slice(0, 6).map((item, i) => {
          const isExpired = item.daysLeft <= 0;
          const isUrgent = item.daysLeft > 0 && item.daysLeft <= 7;
          const isNear = item.daysLeft > 7 && item.daysLeft <= 20;
          
          let dotColor = 'bg-emerald-500';
          let rowBg = '';
          let labelText = 'text-emerald-600 dark:text-emerald-400';
          let label = 'Safe';
          if (isExpired) { dotColor = 'bg-red-500'; rowBg = 'bg-red-50/50 dark:bg-red-950/10'; labelText = 'text-red-600 dark:text-red-400'; label = 'Expired'; }
          else if (isUrgent) { dotColor = 'bg-orange-500'; rowBg = 'bg-orange-50/50 dark:bg-orange-950/10'; labelText = 'text-orange-600 dark:text-orange-400'; label = `${item.daysLeft}d left`; }
          else if (isNear) { dotColor = 'bg-amber-500'; rowBg = 'bg-amber-50/30 dark:bg-amber-950/5'; labelText = 'text-amber-600 dark:text-amber-400'; label = `${item.daysLeft}d left`; }

          return (
            <div key={i} className={`group flex items-center justify-between rounded-lg ${rowBg} px-3 py-2 transition-all duration-200 hover:shadow-sm`}>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor} shadow-sm`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                  <p className="text-[9px] text-slate-400">{item.batch} · {formatDate(item.expiryDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`text-[10px] font-semibold ${labelText}`}>{label}</span>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{item.qty}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
