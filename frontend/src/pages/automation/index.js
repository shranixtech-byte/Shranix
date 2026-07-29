import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// ═══════════════════════════════════════════════════════════════════
// POSTING DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const statCards = [
    { label: 'Total GL Entries', value: '—', color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
    { label: 'Pending Postings', value: '—', color: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
    { label: 'Open Periods', value: '—', color: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
    { label: 'Scheduler', value: 'Idle', color: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
];
export function PostingDashboardPage() {
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const handleRunPosting = async () => {
        setStatus('running');
        setResult(null);
        try {
            const res = await fetch('/automation/posting/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: [] }),
            });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
            setStatus('completed');
        }
        catch (err) {
            setResult(`Error: ${err.message}`);
            setStatus('failed');
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Posting Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Real-time GL posting engine with automatic double-entry validation" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: statCards.map((card) => (_jsxs("div", { className: `rounded-lg border-l-4 p-4 shadow-sm ${card.color} ${card.bg}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: card.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: card.value })] }, card.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Posting Controls" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { onClick: handleRunPosting, disabled: status === 'running', className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50", children: status === 'running' ? '⏳ Posting...' : '▶️ Run Posting' }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDC41\uFE0F Preview" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\u21A9\uFE0F Reverse" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\u2699\uFE0F Apply Rules" })] }), result && (_jsx("pre", { className: "mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs", children: result }))] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Posting Queue" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Pending posting jobs will appear here" })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// AUTOMATION DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function AutomationDashboardPage() {
    const [autoResult, setAutoResult] = useState(null);
    const handleTriggerAutoPost = async () => {
        try {
            const res = await fetch('/automation/scheduler/run-auto-post', { method: 'POST' });
            setAutoResult(JSON.stringify(await res.json(), null, 2));
        }
        catch (err) {
            setAutoResult(`Error: ${err.message}`);
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Automation Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise financial automation with scheduled jobs and background processing" })] }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("div", { className: "rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-4 shadow-sm dark:bg-blue-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Auto-Post Jobs" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-green-500 bg-green-50 p-4 shadow-sm dark:bg-green-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Completed" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm dark:bg-red-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Failed" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border-l-4 border-l-purple-500 bg-purple-50 p-4 shadow-sm dark:bg-purple-900/10", children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: "Active Rules" }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: "0" })] })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Automation Actions" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { onClick: handleTriggerAutoPost, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "\u26A1 Trigger Auto-Post" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCCA Generate Snapshot" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDD12 Enforce Period Locks" }), _jsx("button", { className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDD04 Retry Failed Jobs" })] }), autoResult && (_jsx("pre", { className: "mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs", children: autoResult }))] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Job Status" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Scheduled job history will appear here" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Automation Logs" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Automation execution logs will appear here" })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// FINANCE MONITOR
// ═══════════════════════════════════════════════════════════════════
export function FinanceMonitorPage() {
    const [report, setReport] = useState(null);
    const [reportType, setReportType] = useState('trial-balance');
    const handleGenerateReport = async () => {
        try {
            const res = await fetch(`/automation/reports/${reportType}`);
            const data = await res.json();
            setReport(JSON.stringify(data, null, 2));
        }
        catch (err) {
            setReport(`Error: ${err.message}`);
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Finance Monitor" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Real-time financial report viewer with live GL data" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Report Generator" }), _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-muted-foreground", children: "Report Type" }), _jsxs("select", { value: reportType, onChange: (e) => setReportType(e.target.value), className: "rounded-lg border bg-background px-3 py-2 text-sm", children: [_jsx("option", { value: "trial-balance", children: "Trial Balance" }), _jsx("option", { value: "profit-loss", children: "Profit & Loss" }), _jsx("option", { value: "balance-sheet", children: "Balance Sheet" }), _jsx("option", { value: "cash-flow", children: "Cash Flow" }), _jsx("option", { value: "day-book", children: "Day Book" }), _jsx("option", { value: "account-statement", children: "Account Statement" }), _jsx("option", { value: "general-ledger", children: "General Ledger" }), _jsx("option", { value: "gst-register", children: "GST Register" }), _jsx("option", { value: "gst-summary", children: "GST Summary" }), _jsx("option", { value: "audit", children: "Audit Report" })] })] }), _jsx("button", { onClick: handleGenerateReport, className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "\uD83D\uDCCA Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDDA8\uFE0F Print" })] }), report && (_jsx("pre", { className: "mt-4 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs", children: report })), !report && (_jsx("div", { className: "mt-4 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Select a report type and click Generate to view real GL-based data" }))] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// INTEGRATION DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function IntegrationDashboardPage() {
    const modules = [
        { name: 'Sales → Finance', icon: '🛒', status: 'Ready', color: 'green' },
        { name: 'Purchase → Finance', icon: '📦', status: 'Ready', color: 'green' },
        { name: 'Inventory → Finance', icon: '🏭', status: 'Ready', color: 'green' },
        { name: 'Payroll → Finance', icon: '👤', status: 'Ready', color: 'green' },
        { name: 'Expense → Finance', icon: '💳', status: 'Ready', color: 'green' },
        { name: 'Bank → Finance', icon: '🏛️', status: 'Ready', color: 'green' },
    ];
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Integration Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Module-to-Finance integration services with auto-posting" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: modules.map((mod) => (_jsxs("div", { className: "rounded-lg border bg-card p-5 shadow-sm transition-all hover:shadow-md", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-2xl", children: mod.icon }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: mod.name }), _jsx("p", { className: "text-xs text-muted-foreground", children: mod.status })] })] }), _jsx("span", { className: `inline-block h-3 w-3 rounded-full bg-${mod.color}-500` })] }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { className: "flex-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20", children: "Test" }), _jsx("button", { className: "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted", children: "Logs" })] })] }, mod.name))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Recent Integrations" }), _jsx("div", { className: "flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Recent integration activity will appear here" })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// FINANCIAL HEALTH DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function FinancialHealthDashboardPage() {
    const healthCards = [
        { label: 'Current Ratio', value: '—', desc: 'Assets / Liabilities', icon: '⚖️', color: 'blue' },
        { label: 'Profit Margin', value: '—', desc: 'Net Profit / Revenue', icon: '📈', color: 'green' },
        { label: 'Debt Ratio', value: '—', desc: 'Total Liabilities / Total Assets', icon: '📊', color: 'yellow' },
        { label: 'Receivables Turnover', value: '—', desc: 'Net Sales / Avg Receivables', icon: '🔄', color: 'purple' },
        { label: 'Cash Ratio', value: '—', desc: 'Cash / Current Liabilities', icon: '💵', color: 'emerald' },
        { label: 'Operating Margin', value: '—', desc: 'Operating Income / Revenue', icon: '📉', color: 'orange' },
    ];
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Financial Health Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Key financial ratios and health indicators derived from real GL data" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: healthCards.map((card) => (_jsxs("div", { className: "rounded-lg border bg-card p-5 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-2xl", children: card.icon }), _jsx("span", { className: `rounded-full bg-${card.color}-100 px-2 py-0.5 text-xs font-medium text-${card.color}-700 dark:bg-${card.color}-900/30 dark:text-${card.color}-300`, children: card.value })] }), _jsx("p", { className: "mt-3 font-medium", children: card.label }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: card.desc })] }, card.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Financial Trends" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "Chart \u2014 Data will populate from GL snapshots" }) })] })] }));
}
//# sourceMappingURL=index.js.map