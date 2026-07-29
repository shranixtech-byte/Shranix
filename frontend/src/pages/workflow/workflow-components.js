import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const badgeStyles = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
    submitted: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
    under_review: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    approved: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    rejected: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
    closed: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    pending: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    active: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
};
const dotColors = {
    draft: 'bg-gray-400',
    submitted: 'bg-blue-500',
    under_review: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-gray-400',
    closed: 'bg-slate-400',
    pending: 'bg-yellow-500',
    active: 'bg-blue-500',
};
export function WorkflowStatusBadge({ status, size = 'md', showLabel = true }) {
    const style = badgeStyles[status] || 'bg-gray-100 text-gray-600';
    const dot = dotColors[status] || 'bg-gray-400';
    const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full border font-medium ${style} ${sizeClasses}`, children: [_jsx("span", { className: `inline-block h-1.5 w-1.5 rounded-full ${dot}` }), showLabel && (status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '))] }));
}
const defaultSteps = ['draft', 'submitted', 'under_review', 'approved', 'completed'];
const stepLabels = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Review',
    approved: 'Approved',
    completed: 'Completed',
    closed: 'Closed',
};
export function WorkflowProgressIndicator({ currentState, steps = defaultSteps, size = 'md' }) {
    const currentIdx = steps.indexOf(currentState);
    const isSmall = size === 'sm';
    return (_jsx("div", { className: "flex items-center gap-0", children: steps.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (_jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: `flex items-center justify-center rounded-full font-bold transition-colors ${isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                                        : 'bg-gray-200 text-gray-400 dark:bg-gray-700'} ${isSmall ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs'}`, children: isCompleted ? '✓' : idx + 1 }), !isSmall && (_jsx("span", { className: `mt-1 text-[10px] font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`, children: stepLabels[step] || step }))] }), idx < steps.length - 1 && (_jsx("div", { className: `h-0.5 flex-1 ${isSmall ? 'mx-1' : 'mx-2'} ${idx < currentIdx ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}` }))] }, step));
        }) }));
}
export function WorkflowSummaryCard({ workflowInstanceId, documentType, documentId, onViewDetails }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!workflowInstanceId && (!documentType || !documentId)) {
            setLoading(false);
            return;
        }
        const fetchSummary = async () => {
            try {
                if (workflowInstanceId) {
                    const res = await fetch(`/workflow/instances/${workflowInstanceId}`);
                    const data = await res.json();
                    setSummary(data);
                }
                else if (documentType && documentId) {
                    const res = await fetch(`/workflow/instances/by-document/${documentType}/${documentId}`);
                    const data = await res.json();
                    if (data) {
                        setSummary(data);
                    }
                }
            }
            catch {
                // No workflow exists
            }
            finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [workflowInstanceId, documentType, documentId]);
    if (loading) {
        return (_jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsx("div", { className: "h-4 w-24 animate-pulse rounded bg-muted" }), _jsx("div", { className: "mt-3 h-8 w-32 animate-pulse rounded bg-muted" })] }));
    }
    if (!summary) {
        return (_jsx("div", { className: "rounded-lg border border-dashed bg-card/50 p-4", children: _jsx("p", { className: "text-xs text-muted-foreground", children: "No active workflow" }) }));
    }
    return (_jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-medium text-muted-foreground", children: "Workflow" }), _jsx(WorkflowStatusBadge, { status: summary.currentState, size: "sm" })] }), summary.priority === 'high' || summary.priority === 'urgent' ? (_jsx("span", { className: `text-[10px] font-medium ${summary.priority === 'urgent' ? 'text-red-500' : 'text-yellow-600'}`, children: summary.priority.toUpperCase() })) : null] }), _jsx("div", { className: "mt-3", children: _jsx(WorkflowProgressIndicator, { currentState: summary.currentState, size: "sm" }) }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Level" }), _jsxs("p", { className: "font-medium", children: [summary.approvalLevel, "/", summary.maxApprovalLevel] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Status" }), _jsx("p", { className: "font-medium", children: summary.status })] }), summary.dueDate && (_jsxs("div", { className: "col-span-2", children: [_jsx("span", { className: "text-muted-foreground", children: "Due" }), _jsx("p", { className: "font-medium", children: new Date(summary.dueDate).toLocaleDateString() })] }))] }), onViewDetails && (_jsx("button", { onClick: onViewDetails, className: "mt-3 w-full rounded-md border bg-background py-1.5 text-xs font-medium hover:bg-muted", children: "View Workflow Details" }))] }));
}
//# sourceMappingURL=workflow-components.js.map