import { TrendingDown, TrendingUp, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import React from 'react';

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  confidence: number;
  actionLabel?: string;
  actionPath?: string;
}

interface InsightCardProps {
  insight: Insight;
}

const typeConfig = {
  positive: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-1.5 ${config.bg}`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{insight.category}</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Lightbulb className="h-3 w-3" />
              {Math.round(insight.confidence * 100)}% confidence
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{insight.description}</p>
          {insight.actionLabel && insight.actionPath && (
            <button
              onClick={() => window.location.href = insight.actionPath!}
              className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {insight.actionLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
