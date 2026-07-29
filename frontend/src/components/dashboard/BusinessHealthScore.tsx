import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

import { AnimatedScore } from './KPICard';

interface BusinessHealthScoreProps {
  revenueChange: number | null;
  purchaseChange: number | null;
  lowStockCount: number;
  itemCount: number;
  pendingApprovalsCount: number;
}

function HealthGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / 100, 1);
  const offset = circumference * (1 - progress);

  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#f97316' : '#ef4444';

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' : 'Needs Attention';

  const labelColor =
    score >= 80 ? 'text-emerald-600' :
    score >= 60 ? 'text-amber-600' :
    score >= 40 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
          <circle cx="65" cy="65" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="65" cy="65" r={radius}
            fill="none" stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedScore value={score} suffix="" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white" />
          <span className={`mt-0.5 text-[11px] font-semibold ${labelColor}`}>{label}</span>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function BusinessHealthScore({
  revenueChange,
  purchaseChange,
  lowStockCount,
  itemCount,
  pendingApprovalsCount,
}: BusinessHealthScoreProps) {
  const score = useMemo(() => {
    let s = 70; // base score

    // Revenue health (up to +10/-10)
    if (revenueChange !== null) {
      s += Math.min(revenueChange / 2, 10);
      s = Math.max(s, revenueChange < -20 ? s - 5 : s);
    }

    // Purchase health (up to +5/-5)
    if (purchaseChange !== null) {
      s += Math.min(purchaseChange / 4, 5);
    }

    // Inventory health (up to +10/-15)
    const lowStockRatio = itemCount > 0 ? lowStockCount / itemCount : 0;
    if (lowStockRatio === 0) {s += 10;}
    else if (lowStockRatio < 0.1) {s += 5;}
    else if (lowStockRatio > 0.3) {s -= 10;}
    else {s -= 5;}

    // Operations health (up to +5/-10)
    if (pendingApprovalsCount === 0) {s += 5;}
    else if (pendingApprovalsCount > 10) {s -= 10;}
    else if (pendingApprovalsCount > 5) {s -= 5;}

    return Math.max(0, Math.min(100, Math.round(s)));
  }, [revenueChange, purchaseChange, lowStockCount, itemCount, pendingApprovalsCount]);

  const metrics = useMemo(() => [
    { label: 'Revenue Health', value: revenueChange !== null ? Math.max(0, 50 + revenueChange * 2) : 50, max: 100, color: '#10b981' },
    { label: 'Inventory Health', value: itemCount > 0 ? Math.max(0, 100 - (lowStockCount / itemCount) * 100) : 100, max: 100, color: '#3b82f6' },
    { label: 'Operations', value: Math.max(0, 100 - pendingApprovalsCount * 5), max: 100, color: '#8b5cf6' },
    { label: 'Collections', value: revenueChange !== null ? Math.max(0, 50 + revenueChange) : 50, max: 100, color: '#f59e0b' },
  ], [revenueChange, itemCount, lowStockCount, pendingApprovalsCount]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Business Health</h3>
          </div>
        </div>
        {score >= 80 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Healthy
          </span>
        )}
        {score >= 60 && score < 80 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Activity className="h-3 w-3" /> Stable
          </span>
        )}
        {score < 60 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" /> Attention
          </span>
        )}
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-6">
        {/* Left: Gauge */}
        <HealthGauge score={score} />

        {/* Right: Metric breakdown bars */}
        <div className="flex flex-col justify-center space-y-3.5">
          {metrics.map((m) => (
            <MetricBar key={m.label} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
