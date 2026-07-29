import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Lightbulb, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
const insightStyles = {
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
export function AIInsightCard({ insights }) {
    if (!insights || insights.length === 0) {
        return (_jsxs("div", { className: "rounded-xl border bg-card p-6", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", children: _jsx(Sparkles, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: "AI Insights" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Intelligent business recommendations" })] })] }), _jsx("div", { className: "flex h-24 items-center justify-center rounded-lg border-2 border-dashed", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "No insights available yet" }) })] }));
    }
    return (_jsxs("div", { className: "rounded-xl border bg-card p-6", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", children: _jsx(Sparkles, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: "AI Insights" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Intelligent business recommendations" })] })] }), _jsx("div", { className: "space-y-2.5", children: insights.slice(0, 4).map((insight, index) => {
                    const styles = insightStyles[insight.type] || insightStyles.info;
                    const Icon = styles.icon;
                    return (_jsxs("div", { className: `flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:shadow-sm ${styles.bg} ${styles.border}`, children: [_jsx("div", { className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`, children: _jsx(Icon, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium", children: insight.title }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: insight.description }), insight.action && (_jsxs("p", { className: "mt-1 text-xs font-medium text-primary", children: [insight.action, " \u2192"] }))] })] }, index));
                }) })] }));
}
//# sourceMappingURL=AIInsightCard.js.map