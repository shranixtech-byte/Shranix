import { Lightbulb, AlertTriangle, TrendingUp, Sparkles, type LucideIcon } from 'lucide-react';

interface AIInsight {
  type: 'positive' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  action?: string;
}

const insightStyles: Record<string, { icon: LucideIcon; bg: string; border: string; iconBg: string }> = {
  positive: {
    icon: TrendingUp,
    bg: 'bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/10',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
    iconBg: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10',
    border: 'border-amber-200/50 dark:border-amber-800/30',
    iconBg: 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  info: {
    icon: Sparkles,
    bg: 'bg-gradient-to-r from-sky-50/50 to-transparent dark:from-sky-950/10',
    border: 'border-sky-200/50 dark:border-sky-800/30',
    iconBg: 'bg-sky-100/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/10',
    border: 'border-purple-200/50 dark:border-purple-800/30',
    iconBg: 'bg-purple-100/80 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

interface AIInsightCardProps {
  insights: AIInsight[];
}

export function AIInsightCard({ insights }: AIInsightCardProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">AI Insights</h3>
            <p className="text-xs text-muted-foreground">Intelligent business recommendations</p>
          </div>
        </div>
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-sm text-muted-foreground">No insights available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Intelligent business recommendations</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {insights.slice(0, 4).map((insight, index) => {
          const styles = insightStyles[insight.type] || insightStyles.info;
          const Icon = styles.icon;
          return (
            <div
              key={index}
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:shadow-sm ${styles.bg} ${styles.border}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
                {insight.action && (
                  <p className="mt-1 text-xs font-medium text-primary">{insight.action} →</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
