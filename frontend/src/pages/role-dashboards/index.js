import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ═══════════════════════════════════════════════════════════════════
// CEO DASHBOARD — Enterprise-wide strategic overview
// ═══════════════════════════════════════════════════════════════════
export function CeoDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "CEO Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise-wide strategic overview with key performance indicators" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Total Revenue (YTD)', value: '₹—', sub: 'vs target —%', color: 'border-l-green-500' },
                    { label: 'Net Profit (YTD)', value: '₹—', sub: 'Margin —%', color: 'border-l-blue-500' },
                    { label: 'Revenue Growth', value: '—%', sub: 'vs previous year', color: 'border-l-purple-500' },
                    { label: 'Cash Position', value: '₹—', sub: 'Operating — | Investing —', color: 'border-l-yellow-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: c.sub })] }, c.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Sales Performance" }), _jsx("div", { className: "space-y-3", children: [
                                    { label: 'Total Sales', value: '₹—' },
                                    { label: 'Orders', value: '—' },
                                    { label: 'Avg Order Value', value: '₹—' },
                                    { label: 'Top Customer', value: '—' },
                                ].map((i) => (_jsxs("div", { className: "flex items-center justify-between border-b pb-2 last:border-0", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: i.label }), _jsx("span", { className: "font-medium", children: i.value })] }, i.label))) })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Purchase Overview" }), _jsx("div", { className: "space-y-3", children: [
                                    { label: 'Total Spend', value: '₹—' },
                                    { label: 'Active POs', value: '—' },
                                    { label: 'Top Supplier', value: '—' },
                                    { label: 'Avg PO Value', value: '₹—' },
                                ].map((i) => (_jsxs("div", { className: "flex items-center justify-between border-b pb-2 last:border-0", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: i.label }), _jsx("span", { className: "font-medium", children: i.value })] }, i.label))) })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Inventory Health" }), _jsx("div", { className: "space-y-3", children: [
                                    { label: 'Stock Value', value: '₹—' },
                                    { label: 'Turnover Ratio', value: '—' },
                                    { label: 'Dead Stock %', value: '—%' },
                                    { label: 'Stockout Risk Items', value: '—' },
                                ].map((i) => (_jsxs("div", { className: "flex items-center justify-between border-b pb-2 last:border-0", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: i.label }), _jsx("span", { className: "font-medium", children: i.value })] }, i.label))) })] })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Revenue & Profit Trend" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Chart \u2014 Revenue and net profit trend (12 months)" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Working Capital" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Chart \u2014 Current assets vs current liabilities" })] })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// DIRECTOR DASHBOARD — Department-level oversight
// ═══════════════════════════════════════════════════════════════════
export function DirectorDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Director Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Department-level performance and operational oversight" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Department Revenue', value: '₹—', color: 'border-l-green-500' },
                    { label: 'Operating Cost', value: '₹—', color: 'border-l-red-500' },
                    { label: 'Headcount', value: '—', color: 'border-l-blue-500' },
                    { label: 'Project Completion', value: '—%', color: 'border-l-purple-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Department Budget vs Actual" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Chart \u2014 Budget vs actual spend by department" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Key Initiatives" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Chart \u2014 Project milestones and completion status" })] })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — System-wide administration
// ═══════════════════════════════════════════════════════════════════
export function AdminDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Admin Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "System administration, user management, and configuration overview" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Active Users', value: '—', color: 'border-l-blue-500' },
                    { label: 'Pending Approvals', value: '—', color: 'border-l-yellow-500' },
                    { label: 'System Uptime', value: '99.9%', color: 'border-l-green-500' },
                    { label: 'Active Workflows', value: '—', color: 'border-l-purple-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Recent Activity" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Feed \u2014 Recent system activity and user actions" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "System Health" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Status \u2014 Database, scheduler, and service health" })] })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// OPERATIONS DASHBOARD — Day-to-day operations
// ═══════════════════════════════════════════════════════════════════
export function OperationsDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Operations Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Daily operational metrics, pending tasks, and alerts" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'Orders to Process', value: '—', color: 'border-l-blue-500' },
                    { label: 'Pending Deliveries', value: '—', color: 'border-l-yellow-500' },
                    { label: 'Today Shipments', value: '—', color: 'border-l-green-500' },
                    { label: 'Alerts', value: '—', color: 'border-l-red-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Today's Tasks" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Task list \u2014 Today's operational tasks and priorities" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Pending Actions" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "List \u2014 Pending GRNs, POs, and invoices requiring action" })] })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// USER DASHBOARD — Personal workspace
// ═══════════════════════════════════════════════════════════════════
export function UserDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "My Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Personal workspace with assigned tasks and notifications" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
                    { label: 'My Tasks', value: '—', color: 'border-l-blue-500' },
                    { label: 'Pending Approvals', value: '—', color: 'border-l-yellow-500' },
                    { label: 'Notifications', value: '—', color: 'border-l-purple-500' },
                    { label: 'Overdue Tasks', value: '—', color: 'border-l-red-500' },
                ].map((c) => (_jsxs("div", { className: `rounded-lg border-l-4 bg-card p-4 shadow-sm ${c.color}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: c.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: c.value })] }, c.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "My Recent Activity" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Feed \u2014 Recent documents I've created or modified" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 font-semibold", children: "Quick Actions" }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-md bg-muted/50 text-sm text-muted-foreground", children: "Grid \u2014 Quick links to frequently used modules" })] })] })] }));
}
//# sourceMappingURL=index.js.map