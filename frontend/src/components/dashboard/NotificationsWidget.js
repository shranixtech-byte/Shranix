import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, Info, AlertTriangle, CheckCircle2, XCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
function notifIcon(type) {
    switch (type.toLowerCase()) {
        case 'warning': return AlertTriangle;
        case 'error': return XCircle;
        case 'success': return CheckCircle2;
        default: return Info;
    }
}
function notifColor(type) {
    switch (type.toLowerCase()) {
        case 'warning': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
        case 'error': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
        case 'success': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
        default: return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
    }
}
export function NotificationsWidget({ notifications }) {
    const items = useMemo(() => notifications.slice(0, 5), [notifications]);
    return (_jsxs("div", { className: "group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "absolute -inset-1 bg-gradient-to-r from-rose-500 to-red-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" }), _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md", children: _jsx(Bell, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Notifications" }), _jsx("p", { className: "text-[10px] text-slate-400 dark:text-slate-500", children: items.length > 0 ? `${items.length} unread` : 'All clear' })] }), items.length > 0 && (_jsx("span", { className: "ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-400", children: items.length }))] }), _jsx("div", { className: "mt-4 space-y-2", children: items.length > 0 ? (items.map((n) => {
                            const Icon = notifIcon(n.type);
                            const colors = notifColor(n.type);
                            return (_jsxs("div", { className: "flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all hover:border-slate-100 hover:bg-slate-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/30", children: [_jsx("div", { className: `mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors}`, children: _jsx(Icon, { className: "h-3.5 w-3.5" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-slate-800 dark:text-slate-200", children: n.title }), _jsx("p", { className: "mt-0.5 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400", children: n.message }), n.createdAt && (_jsxs("div", { className: "mt-1 flex items-center gap-1 text-[10px] text-slate-400", children: [_jsx(Clock, { className: "h-2.5 w-2.5" }), new Date(n.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                                    })] }))] })] }, n.id));
                        })) : (_jsxs("div", { className: "flex flex-col items-center py-6 text-center", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800", children: _jsx(CheckCircle2, { className: "h-5 w-5 text-slate-400" }) }), _jsx("p", { className: "mt-2 text-sm font-medium text-slate-500 dark:text-slate-400", children: "No notifications" }), _jsx("p", { className: "mt-0.5 text-xs text-slate-400 dark:text-slate-500", children: "You're all caught up" })] })) }), _jsxs("button", { className: "relative mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300", children: ["View all notifications", _jsx(ArrowUpRight, { className: "h-3 w-3" })] })] })] }));
}
//# sourceMappingURL=NotificationsWidget.js.map