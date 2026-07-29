import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingDown, TrendingUp, AlertTriangle, Info, Lightbulb } from 'lucide-react';
const typeConfig = {
    positive: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
    negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
};
export const InsightCard = ({ insight }) => {
    const config = typeConfig[insight.type];
    const Icon = config.icon;
    return (_jsx("div", { className: `rounded-xl border ${config.border} ${config.bg} p-4 transition-all hover:shadow-md`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: `mt-0.5 rounded-lg p-1.5 ${config.bg}`, children: _jsx(Icon, { className: `h-5 w-5 ${config.color}` }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: insight.category }), _jsxs("span", { className: "flex items-center gap-1 text-[10px] text-gray-400", children: [_jsx(Lightbulb, { className: "h-3 w-3" }), Math.round(insight.confidence * 100), "% confidence"] })] }), _jsx("h4", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: insight.title }), _jsx("p", { className: "mt-1 text-xs text-gray-600 dark:text-gray-400", children: insight.description }), insight.actionLabel && insight.actionPath && (_jsxs("button", { onClick: () => window.location.href = insight.actionPath, className: "mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400", children: [insight.actionLabel, " \u2192"] }))] })] }) }));
};
//# sourceMappingURL=InsightCard.js.map