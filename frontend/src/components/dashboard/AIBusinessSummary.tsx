import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

interface Insight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  actionPath: string;
}

interface AIBusinessSummaryProps {
  insights: Insight[];
  lowStockCount: number;
  pendingApprovalsCount: number;
  revenueChange: number | null;
}

function typeIcon(type: Insight['type']) {
  switch (type) {
    case 'positive': return TrendingUp;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
  }
}

function typeColor(type: Insight['type']) {
  switch (type) {
    case 'positive': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
    case 'warning': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
    case 'info': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
  }
}

export function AIBusinessSummary({
  insights,
  lowStockCount,
  pendingApprovalsCount,
  revenueChange,
}: AIBusinessSummaryProps) {
  const summaryItems = useMemo(() => {
    const items: Array<{ icon: typeof TrendingUp; color: string; text: string }> = [];

    // Revenue insight
    if (revenueChange !== null) {
      const Icon = revenueChange >= 0 ? TrendingUp : TrendingDown;
      const color = revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600';
      items.push({
        icon: Icon,
        color,
        text: `Sales ${revenueChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(1)}% compared to last month.`,
      });
    }

    // Low stock insight
    if (lowStockCount > 0) {
      items.push({
        icon: AlertTriangle,
        color: 'text-amber-600',
        text: `${lowStockCount} product${lowStockCount > 1 ? 's are' : ' is'} nearing reorder level. Consider restocking soon.`,
      });
    }

    // Pending approvals
    if (pendingApprovalsCount > 0) {
      items.push({
        icon: Info,
        color: 'text-blue-600',
        text: `${pendingApprovalsCount} approval${pendingApprovalsCount > 1 ? 's are' : ' is'} pending your review.`,
      });
    }

    // Backend insights
    insights.forEach((insight) => {
      items.push({
        icon: typeIcon(insight.type),
        color: typeColor(insight.type).split(' ')[0],
        text: insight.description,
      });
    });

    // Fallback
    if (items.length === 0) {
      items.push({
        icon: Sparkles,
        color: 'text-slate-400',
        text: 'No recent activity to analyze. Start by adding sales or purchase transactions.',
      });
    }

    return items.slice(0, 5);
  }, [insights, lowStockCount, pendingApprovalsCount, revenueChange]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Business Summary</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Real-time insights</p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {summaryItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3 transition-colors hover:bg-slate-100/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
              >
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${item.color.replace('text-', 'bg-').replace('600', '100')} dark:bg-opacity-20`}>
                  <Icon className={`h-3.5 w-3.5 ${item.color}`} strokeWidth={2.5} />
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>

        <button className="relative mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-medium text-violet-600 transition-all hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:text-violet-400 dark:hover:border-violet-600/50 dark:hover:bg-violet-900/10">
          View detailed AI report
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
