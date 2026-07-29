import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const statusStyles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    overdue: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
function StatusBadge({ status }) {
    const style = statusStyles[status.toLowerCase()] || statusStyles.draft;
    return (_jsx("span", { className: `inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style}`, children: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') }));
}
const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});
export function ActivityTable({ title, subtitle, columns, data, emptyMessage = 'No records found', viewAllPath, variant = 'sales', }) {
    const navigate = useNavigate();
    const accentColor = variant === 'sales' ? 'border-l-emerald-500' : 'border-l-blue-500';
    return (_jsxs("div", { className: "rounded-xl border bg-card", children: [_jsxs("div", { className: `flex items-center justify-between border-b px-6 py-4 ${accentColor} border-l-4`, children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: title }), subtitle && _jsx("p", { className: "mt-0.5 text-sm text-muted-foreground", children: subtitle })] }), viewAllPath && (_jsxs("button", { onClick: () => navigate(viewAllPath), className: "flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80", children: ["View All", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] }))] }), data.length === 0 ? (_jsx("div", { className: "flex h-32 items-center justify-center", children: _jsx("p", { className: "text-sm text-muted-foreground", children: emptyMessage }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b bg-muted/30", children: columns.map((col) => (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground", children: col.label }, col.key))) }) }), _jsx("tbody", { className: "divide-y", children: data.map((record, idx) => (_jsx("tr", { className: "transition-colors hover:bg-muted/20", children: columns.map((col) => (_jsx("td", { className: "whitespace-nowrap px-6 py-3 text-sm", children: col.render
                                        ? col.render(record[col.key], record)
                                        : col.key === 'amount' || col.key === 'grandTotal'
                                            ? currency.format(Number(record[col.key]) || 0)
                                            : col.key === 'status'
                                                ? _jsx(StatusBadge, { status: String(record[col.key] || 'draft') })
                                                : col.key.includes('Date') || col.key === 'date'
                                                    ? record[col.key]
                                                        ? new Date(String(record[col.key])).toLocaleDateString('en-IN')
                                                        : '—'
                                                    : String(record[col.key] ?? '—') }, col.key))) }, record.id || idx))) })] }) }))] }));
}
//# sourceMappingURL=ActivityTable.js.map