import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const statusColors = {
    draft: 'bg-gray-200 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-200 text-gray-500',
    closed: 'bg-slate-100 text-slate-600',
};
export function WorkflowHistoryPanel({ instanceId, maxEntries = 20 }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        fetch(`/workflow/instances/${instanceId}/history`)
            .then((r) => r.json())
            .then((d) => {
            const data = Array.isArray(d) ? d : d.data || [];
            setHistory(data.slice(0, maxEntries));
        })
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));
    }, [instanceId, maxEntries]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center py-8 text-sm text-muted-foreground", children: "Loading history..." }));
    }
    if (history.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center py-8 text-sm text-muted-foreground", children: "No workflow history available" }));
    }
    return (_jsxs("div", { className: "rounded-lg border bg-card shadow-sm", children: [_jsx("div", { className: "border-b px-4 py-3", children: _jsx("h3", { className: "text-sm font-semibold", children: "Workflow History" }) }), _jsx("div", { className: "divide-y", children: history.map((entry) => (_jsxs("div", { className: "px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[entry.toState || ''] || 'bg-gray-100 text-gray-600'}`, children: entry.actionLabel || entry.action.replace(/_/g, ' ') }), entry.fromState && entry.toState && (_jsxs("span", { className: "text-xs text-muted-foreground", children: [entry.fromState, " \u2192 ", entry.toState] }))] }), _jsx("span", { className: "text-xs text-muted-foreground", children: new Date(entry.createdAt).toLocaleString() })] }), _jsxs("div", { className: "mt-1 flex items-center gap-2 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["by ", entry.userName || entry.userId || 'System'] }), entry.userRole && _jsxs("span", { children: ["(", entry.userRole, ")"] })] }), entry.comment && (_jsx("p", { className: "mt-1 text-xs text-foreground/80", children: entry.comment }))] }, entry.id))) })] }));
}
//# sourceMappingURL=workflow-history-panel.js.map