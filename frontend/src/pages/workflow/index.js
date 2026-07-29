import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const statusStyles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};
function getStatusBadge(status) {
    const style = statusStyles[status] || statusStyles.draft;
    return (_jsx("span", { className: `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`, children: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
}
// ═════════════════════════════════════════════════════════
// WORKFLOW DASHBOARD
// ═════════════════════════════════════════════════════════
export function WorkflowDashboardPage() {
    const [data, setData] = useState(null);
    const loadData = async () => {
        try {
            const res = await fetch('/workflow/dashboard');
            setData(await res.json());
        }
        catch { /* ignore */ }
    };
    useEffect(() => { loadData(); }, []);
    const stats = data?.summary || {};
    const tasks = data?.tasks || {};
    const escalation = data?.escalation || {};
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Workflow Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise workflow engine \u2014 track approvals, tasks, and escalations" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { className: "rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Active Instances" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: stats.activeInstances || '—' })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Completed" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: stats.completedInstances || '—' })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 p-4 shadow-sm dark:bg-yellow-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Pending Tasks" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: tasks.pending || '—' })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Overdue" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: tasks.overdue || '—' })] })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-lg border bg-card p-5 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Total Instances" }), _jsx("p", { className: "mt-1 text-3xl font-bold", children: stats.totalInstances || 0 }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "All time" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-5 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "My Pending Tasks" }), _jsx("p", { className: "mt-1 text-3xl font-bold", children: tasks.myPending || 0 }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Requires your action" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-5 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Escalation Rules" }), _jsx("p", { className: "mt-1 text-3xl font-bold", children: escalation.activeRules || 0 }), _jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [escalation.totalRules || 0, " total"] })] })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Module Integration Status" }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: ['Purchase Orders', 'GRN', 'Purchase Invoices', 'Sales Orders', 'Delivery Challans', 'Sales Invoices', 'Journal Entries', 'Vouchers', 'GST Closing', 'Inventory Adjustments'].map((mod) => (_jsxs("div", { className: "flex items-center gap-2 rounded-md border p-3", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-full bg-green-500" }), _jsx("span", { className: "text-sm font-medium", children: mod }), _jsx("span", { className: "ml-auto text-xs text-muted-foreground", children: "Ready" })] }, mod))) })] })] }));
}
// ═════════════════════════════════════════════════════════
// APPROVAL DASHBOARD
// ═════════════════════════════════════════════════════════
export function ApprovalDashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch('/workflow/tasks/my')
            .then((r) => r.json())
            .then((d) => setTasks(d.data || []))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Approval Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage approvals across all modules" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Pending" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: loading ? '—' : tasks.filter((t) => t.status === 'pending').length })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Approved" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: loading ? '—' : tasks.filter((t) => t.status === 'completed').length })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Overdue" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: loading ? '—' : tasks.filter((t) => t.isOverdue).length })] })] }), _jsxs("div", { className: "rounded-lg border bg-card shadow-sm", children: [_jsx("div", { className: "border-b px-6 py-4", children: _jsx("h2", { className: "text-lg font-semibold", children: "My Approvals" }) }), loading ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "Loading..." })) : tasks.length === 0 ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "No pending approvals" })) : (_jsx("div", { className: "divide-y", children: tasks.slice(0, 10).map((task) => (_jsxs("div", { className: "flex items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: task.title }), _jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [task.documentType, " \u00B7 Priority: ", task.priority, " \u00B7 ", task.module] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [getStatusBadge(task.status), task.isOverdue && _jsx("span", { className: "text-xs text-red-500", children: "\u26A0\uFE0F Overdue" }), _jsx("button", { className: "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90", children: "Review" })] })] }, task.id))) }))] })] }));
}
// ═════════════════════════════════════════════════════════
// PENDING TASKS DASHBOARD
// ═════════════════════════════════════════════════════════
export function PendingTasksDashboardPage() {
    const [tab, setTab] = useState('pending');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const status = tab === 'pending' ? 'pending' : tab === 'completed' ? 'completed' : 'delegated';
        fetch(`/workflow/tasks?status=${status}`)
            .then((r) => r.json())
            .then((d) => setTasks(d.data || []))
            .finally(() => setLoading(false));
    }, [tab]);
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "All Tasks" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage all workflow tasks" })] }), _jsx("div", { className: "flex gap-2 border-b", children: ['pending', 'completed', 'delegated'].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`, children: t.charAt(0).toUpperCase() + t.slice(1) }, t))) }), _jsx("div", { className: "rounded-lg border bg-card shadow-sm", children: loading ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "Loading..." })) : tasks.length === 0 ? (_jsxs("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: ["No ", tab, " tasks"] })) : (_jsx("div", { className: "divide-y", children: tasks.map((task) => (_jsxs("div", { className: "flex items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-medium", children: task.title }), getStatusBadge(task.status)] }), _jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [task.documentType || task.module, " \u00B7 ", task.taskType, " \u00B7 ", task.priority, " priority"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [task.isOverdue && _jsx("span", { className: "text-xs text-red-500", children: "\u26A0\uFE0F" }), task.dueDate && _jsxs("span", { className: "text-xs text-muted-foreground", children: ["Due: ", new Date(task.dueDate).toLocaleDateString()] })] })] }, task.id))) })) })] }));
}
// ═════════════════════════════════════════════════════════
// MY TASKS DASHBOARD
// ═════════════════════════════════════════════════════════
export function MyTasksDashboardPage() {
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch('/workflow/tasks/my')
            .then((r) => r.json())
            .then((d) => setMyTasks(d.data || []))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "My Tasks" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Tasks assigned to you across all workflows" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-4", children: [_jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Total" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: myTasks.length })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Pending" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: myTasks.filter((t) => t.status === 'pending').length })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Completed" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: myTasks.filter((t) => t.status === 'completed').length })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Overdue" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: myTasks.filter((t) => t.isOverdue).length })] })] }), _jsxs("div", { className: "rounded-lg border bg-card shadow-sm", children: [_jsx("div", { className: "border-b px-6 py-4", children: _jsx("h2", { className: "text-lg font-semibold", children: "My Tasks" }) }), loading ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "Loading..." })) : myTasks.length === 0 ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "No tasks assigned" })) : (_jsx("div", { className: "divide-y", children: myTasks.map((task) => (_jsxs("div", { className: "flex items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: `mt-1 inline-block h-2.5 w-2.5 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'urgent' ? 'bg-purple-500' : 'bg-blue-500'}` }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: task.title }), _jsxs("p", { className: "mt-0.5 text-xs text-muted-foreground", children: [task.module, " \u00B7 ", task.taskType] }), task.dueDate && (_jsxs("p", { className: `mt-0.5 text-xs ${task.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`, children: ["Due: ", new Date(task.dueDate).toLocaleDateString(), task.isOverdue && ' (Overdue)'] }))] })] }), _jsx("div", { className: "flex items-center gap-2", children: getStatusBadge(task.status) })] }, task.id))) }))] })] }));
}
// ═════════════════════════════════════════════════════════
// ESCALATION DASHBOARD
// ═════════════════════════════════════════════════════════
export function EscalationDashboardPage() {
    const [escalations, setEscalations] = useState(null);
    useEffect(() => {
        fetch('/workflow/notifications/escalation-rules')
            .then((r) => r.json())
            .then((d) => setEscalations(d))
            .catch(() => { });
    }, []);
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Escalation Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage escalation rules and monitor overdue tasks" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Escalation Rules" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: escalations ? `${(escalations.data || []).length} rules configured` : 'Loading escalation rules...' })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Quick Actions" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { onClick: async () => {
                                    await fetch('/workflow/notifications/escalation-rules/process', { method: 'POST' });
                                    alert('Escalations processed');
                                }, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "\u26A1 Process Escalations" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\u2795 New Escalation Rule" })] })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Overdue Tasks" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Overdue task monitoring \u2014 data will populate as tasks become overdue" })] })] }));
}
//# sourceMappingURL=index.js.map