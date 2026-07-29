import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, } from 'recharts';
const currencyFormatter = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
}).format(value);
function CustomTooltip({ active, payload, label, formatValue }) {
    if (!active || !payload?.length) {
        return null;
    }
    return (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95", children: [_jsx("p", { className: "mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300", children: label }), _jsx("div", { className: "space-y-1", children: payload.map((entry) => (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-sm", style: { backgroundColor: entry.color } }), _jsxs("span", { className: "text-slate-500 dark:text-slate-400", children: [entry.name, ":"] }), _jsx("span", { className: "font-semibold text-slate-900 dark:text-white", children: formatValue ? formatValue(entry.value) : entry.value.toLocaleString('en-IN') })] }, entry.name))) })] }));
}
function CustomLegend({ payload }) {
    if (!payload) {
        return null;
    }
    return (_jsx("div", { className: "flex items-center gap-4 pt-2", children: payload.map((entry) => (_jsxs("div", { className: "flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-sm", style: { backgroundColor: entry.color } }), entry.value] }, entry.value))) }));
}
export function DashboardChart({ title, subtitle, data, series, type = 'bar', height = 300, legend = true, grid = true, formatValue, }) {
    if (!data || data.length === 0) {
        return (_jsxs("div", { className: "rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: title }), subtitle && _jsx("p", { className: "mt-0.5 text-xs text-slate-500 dark:text-slate-400", children: subtitle })] }), _jsx("div", { className: "flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700", children: _jsx("p", { className: "text-xs text-slate-400 dark:text-slate-500", children: "No chart data available" }) })] }));
    }
    const fmt = formatValue || currencyFormatter;
    return (_jsxs("div", { className: "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "mb-5 flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: title }), subtitle && _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: subtitle })] }) }), _jsx(ResponsiveContainer, { width: "100%", height: height, children: type === 'area' ? (_jsxs(AreaChart, { data: data, margin: { top: 4, right: 4, left: 0, bottom: 0 }, children: [grid && (_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))", strokeOpacity: 0.4, vertical: false })), _jsx(XAxis, { dataKey: "month", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, axisLine: { stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }, tickLine: false, dy: 6 }), _jsx(YAxis, { tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, axisLine: false, tickLine: false, tickFormatter: (v) => `₹${(v / 1000).toFixed(0)}k`, dx: -4 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, { formatValue: fmt }) }), legend && _jsx(Legend, { content: _jsx(CustomLegend, {}) }), series.map((s) => (_jsx(Area, { type: "monotone", dataKey: s.key, name: s.name, stroke: s.color, fill: s.color, fillOpacity: 0.08, strokeWidth: 2.5, dot: false, activeDot: { r: 5, strokeWidth: 2, stroke: '#fff' } }, s.key)))] })) : (_jsxs(BarChart, { data: data, margin: { top: 4, right: 4, left: 0, bottom: 0 }, children: [grid && (_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))", strokeOpacity: 0.4, vertical: false })), _jsx(XAxis, { dataKey: "month", tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, axisLine: { stroke: 'hsl(var(--border))', strokeOpacity: 0.5 }, tickLine: false, dy: 6 }), _jsx(YAxis, { tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }, axisLine: false, tickLine: false, tickFormatter: (v) => `₹${(v / 1000).toFixed(0)}k`, dx: -4 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, { formatValue: fmt }) }), legend && _jsx(Legend, { content: _jsx(CustomLegend, {}) }), series.map((s) => (_jsx(Bar, { dataKey: s.key, name: s.name, fill: s.color, radius: [6, 6, 0, 0], maxBarSize: 36 }, s.key)))] })) })] }));
}
//# sourceMappingURL=DashboardChart.js.map