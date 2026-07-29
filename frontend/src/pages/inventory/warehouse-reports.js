import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Download, Warehouse, MapPin, ArrowRightLeft, Lock, Activity, BarChart3, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/api-client';
const reportMeta = {
    summary: { label: 'Warehouse Summary', icon: Warehouse, description: 'Overview of all warehouses with capacity and stock metrics' },
    stock: { label: 'Warehouse Stock', icon: BarChart3, description: 'Stock levels per warehouse with batch details' },
    location: { label: 'Location Stock', icon: MapPin, description: 'Stock at godown/rack/shelf/bin level' },
    transfer: { label: 'Transfer Report', icon: ArrowRightLeft, description: 'Historical stock transfer records' },
    reservation: { label: 'Reservation Report', icon: Lock, description: 'Reserved stock and allocation status' },
    movement: { label: 'Movement Report', icon: Activity, description: 'Stock movement and transaction log' },
};
export function WarehouseReportsPage() {
    const [reportType, setReportType] = useState('summary');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const load = useCallback(async () => {
        setLoading(true);
        try {
            let endpoint = '';
            switch (reportType) {
                case 'summary':
                    endpoint = '/inventory/warehouse-dashboard';
                    break;
                case 'stock':
                    endpoint = `/inventory/warehouse-stock${warehouseFilter ? `?warehouseId=${warehouseFilter}` : ''}`;
                    break;
                case 'location':
                    endpoint = `/inventory/warehouse-locations?pageSize=500`;
                    break;
                case 'transfer':
                    endpoint = `/inventory/transfers?pageSize=500`;
                    break;
                case 'reservation':
                    endpoint = `/inventory/batches?pageSize=500`;
                    break;
                case 'movement':
                    endpoint = `/inventory/stock-movements?pageSize=500`;
                    break;
            }
            const result = await apiRequest(endpoint);
            setData(result);
        }
        catch {
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [reportType, warehouseFilter]);
    useEffect(() => { void load(); }, [load]);
    const exportCSV = () => {
        if (!data) {
            return;
        }
        let csv = '';
        const rows = data.data || data || [];
        if (reportType === 'summary') {
            csv = 'Metric,Value\n';
            csv += `Total Warehouses,${data.totalWarehouses || 0}\n`;
            csv += `Total Godowns,${data.totalGodowns || 0}\n`;
            csv += `Total Locations,${data.totalLocations || 0}\n`;
            csv += `Stock Value,${data.totalStockValue || 0}\n`;
            csv += `Total Transfers,${data.totalTransfers || 0}\n`;
            csv += `Pending Transfers,${data.pendingTransfers || 0}\n`;
        }
        else if (Array.isArray(rows) && rows.length > 0) {
            const headers = Object.keys(rows[0]);
            csv = `${headers.join(',')}\n`;
            rows.forEach((row) => {
                csv += `${headers.map((h) => String(row[h] ?? '')).join(',')}\n`;
            });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `warehouse-${reportType}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const renderTable = () => {
        if (!data) {
            return _jsx("p", { className: "text-center text-sm text-muted-foreground py-8", children: "No data available" });
        }
        if (reportType === 'summary') {
            const stats = [
                { label: 'Total Warehouses', value: data.totalWarehouses ?? 0 },
                { label: 'Total Godowns', value: data.totalGodowns ?? 0 },
                { label: 'Total Locations', value: data.totalLocations ?? 0 },
                { label: 'Stock Value', value: data.totalStockValue ?? 0 },
                { label: 'Total Transfers', value: data.totalTransfers ?? 0 },
                { label: 'Pending Transfers', value: data.pendingTransfers ?? 0 },
            ];
            return (_jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: stats.map((s) => (_jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm", children: [_jsx("p", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wide", children: s.label }), _jsx("p", { className: "mt-2 text-2xl font-bold", children: typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value })] }, s.label))) }));
        }
        // For simple array data
        const rows = data.data || data;
        if (!Array.isArray(rows) || rows.length === 0) {
            return _jsx("p", { className: "text-center text-sm text-muted-foreground py-8", children: "No data found" });
        }
        const headers = Object.keys(rows[0]);
        return (_jsxs("div", { className: "overflow-hidden rounded-xl border bg-card", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/50", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground", children: "#" }), headers.map((h) => (_jsx("th", { className: "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground", children: h.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()) }, h)))] }) }), _jsx("tbody", { className: "divide-y", children: rows.slice(0, 100).map((row, idx) => (_jsxs("tr", { className: "transition-colors hover:bg-muted/30", children: [_jsx("td", { className: "px-4 py-2.5 text-sm text-muted-foreground", children: idx + 1 }), headers.map((h) => (_jsx("td", { className: "px-4 py-2.5 text-sm", children: typeof row[h] === 'boolean' ? (row[h] ? 'Yes' : 'No') : String(row[h] ?? '—') }, h)))] }, idx))) })] }) }), rows.length > 100 && (_jsxs("div", { className: "border-t px-4 py-3 text-center text-xs text-muted-foreground", children: ["Showing 100 of ", rows.length, " records. Use CSV export for full data."] }))] }));
    };
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Warehouse Reports" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: reportMeta[reportType].description })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: exportCSV, disabled: !data, className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40", children: [_jsx(Download, { className: "h-4 w-4" }), "Export CSV"] }), _jsxs("button", { onClick: () => load(), className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Refresh"] })] })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-3 lg:grid-cols-6", children: Object.keys(reportMeta).map((type) => {
                    const meta = reportMeta[type];
                    const Icon = meta.icon;
                    return (_jsxs("button", { onClick: () => setReportType(type), className: `flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${reportType === type
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                            : 'bg-card hover:bg-muted/50 hover:shadow-sm'}`, children: [_jsx("div", { className: `flex h-10 w-10 items-center justify-center rounded-xl ${reportType === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`, children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsx("p", { className: "text-[11px] font-medium leading-tight", children: meta.label })] }, type));
                }) }), reportType === 'stock' && (_jsx("div", { className: "flex items-center gap-3", children: _jsxs("div", { className: "relative flex-1 max-w-xs", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Filter by Warehouse ID", value: warehouseFilter, onChange: (e) => setWarehouseFilter(e.target.value), className: "w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" })] }) })), loading ? (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading report..." })] }) })) : (renderTable())] }));
}
//# sourceMappingURL=warehouse-reports.js.map