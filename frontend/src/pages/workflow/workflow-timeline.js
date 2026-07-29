import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const stateColors = {
    draft: 'bg-gray-400',
    submitted: 'bg-blue-500',
    under_review: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-gray-500',
    closed: 'bg-slate-500',
};
const actionIcons = {
    create: '●',
    submit: '↑',
    review: '◎',
    approve: '✓',
    reject: '✗',
    return: '↩',
    cancel: '✕',
    complete: '✓',
    close: '◉',
    reopen: '↻',
    resubmit: '↻',
};
export function WorkflowTimeline({ instanceId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`/workflow/instances/${instanceId}/history`)
            .then((r) => r.json())
            .then((d) => {
            const data = Array.isArray(d) ? d : d.data || [];
            setHistory(data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        })
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));
    }, [instanceId]);
    if (loading) {
        return (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "Loading timeline..." }));
    }
    if (history.length === 0) {
        return (_jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "No workflow history available" }));
    }
    return (_jsx("div", { className: "space-y-0", children: history.map((entry, index) => (_jsxs("div", { className: "relative flex gap-4 pb-6 last:pb-0", children: [index < history.length - 1 && (_jsx("div", { className: "absolute left-[11px] top-5 h-full w-0.5 bg-border" })), _jsx("div", { className: "relative z-10 mt-1 flex-shrink-0", children: _jsx("div", { className: `flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${stateColors[entry.toState || ''] || 'bg-blue-500'}`, title: entry.toState, children: _jsx("span", { className: "text-[10px]", children: actionIcons[entry.action] || '•' }) }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: entry.actionLabel || entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }), _jsx("span", { className: "text-xs text-muted-foreground", children: new Date(entry.createdAt).toLocaleString() })] }), entry.fromState && entry.toState && (_jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [_jsx("span", { className: "font-medium", children: entry.fromState }), ' → ', _jsx("span", { className: "font-medium", children: entry.toState })] })), entry.userName && (_jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: ["by ", entry.userName, entry.userRole ? ` (${entry.userRole})` : ''] })), entry.comment && (_jsx("div", { className: "mt-2 rounded-md bg-muted/50 p-3", children: _jsx("p", { className: "text-sm text-foreground", children: entry.comment }) }))] })] }, entry.id))) }));
}
//# sourceMappingURL=workflow-timeline.js.map