import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search, Calendar, Download } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiRequest } from '@/services/api-client';
const movementLabels = {
    opening: '📦 Opening', purchase_receipt: '📥 Purchase', sales_delivery: '📤 Sale',
    purchase_return: '↩️ Purchase Return', sales_return: '↩️ Sales Return',
    stock_adjustment: '⚖️ Adjustment', damage: '💔 Damage',
    transfer: '🔄 Transfer', correction: '✏️ Correction',
};
export function StockLedgerEnhancedPage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [movementFilter, setMovementFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const fetchLedger = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('pageSize', String(pageSize));
            if (movementFilter) {
                params.set('movementType', movementFilter);
            }
            if (fromDate) {
                params.set('fromDate', fromDate);
            }
            if (toDate) {
                params.set('toDate', toDate);
            }
            if (search) {
                params.set('itemId', search);
            }
            const result = await apiRequest(`/inventory/ledger?${params}`);
            setData(Array.isArray(result.data) ? result.data : []);
            setTotal(result.total || 0);
            setTotalPages(result.totalPages || 1);
        }
        catch {
            setData([]);
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, movementFilter, fromDate, toDate, search]);
    useEffect(() => { void fetchLedger(); }, [fetchLedger]);
    const handleExport = () => {
        const headers = ['Date', 'Type', 'Item', 'Batch', 'Qty In', 'Qty Out', 'Balance', 'Rate', 'Reference', 'Reason', 'User'];
        const rows = data.map((e) => {
            const isIn = ['opening', 'purchase_receipt', 'sales_return', 'correction'].includes(e.movementType);
            return [
                e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '',
                movementLabels[e.movementType] || e.movementType,
                e.itemId, e.batchNo || '',
                isIn ? e.quantity : '', !isIn ? e.quantity : '',
                e.afterQuantity ?? '', e.rate ?? '',
                e.referenceType ?? '', e.reason ?? '', e.userId ?? '',
            ];
        });
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'stock-ledger.csv';
        a.click();
    };
    const runningBalance = useMemo(() => {
        if (data.length === 0) {
            return 0;
        }
        const last = data[data.length - 1];
        return last.afterQuantity ?? last.beforeQuantity ?? last.quantity ?? 0;
    }, [data]);
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Stock Ledger" }), _jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: ["Every stock movement with In/Out/Balance \u2014 ", loading ? '' : `Running Balance: ${runningBalance}`] })] }), _jsxs("button", { onClick: handleExport, className: "inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted", children: [_jsx(Download, { className: "h-4 w-4" }), " Export CSV"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 min-w-[180px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search by item ID...", value: search, onChange: (e) => { setSearch(e.target.value); setPage(1); }, className: "h-10 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("select", { value: movementFilter, onChange: (e) => { setMovementFilter(e.target.value); setPage(1); }, className: "h-10 rounded-xl border bg-background px-3 pr-8 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer", children: [_jsx("option", { value: "", children: "All Types" }), Object.entries(movementLabels).map(([key, label]) => (_jsx("option", { value: key, children: label }, key)))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "h-4 w-4 text-muted-foreground" }), _jsx("input", { type: "date", value: fromDate, onChange: (e) => { setFromDate(e.target.value); setPage(1); }, className: "h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" }), _jsx("span", { className: "text-muted-foreground text-xs", children: "to" }), _jsx("input", { type: "date", value: toDate, onChange: (e) => { setToDate(e.target.value); setPage(1); }, className: "h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] })] }), _jsxs("div", { className: "overflow-hidden rounded-2xl border bg-card shadow-sm", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b bg-muted/30", children: [_jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Date" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Type" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Item" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Batch" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Qty In" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Qty Out" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Balance" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Rate" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Reference" }), _jsx("th", { className: "px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Reason" }), _jsx("th", { className: "px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Balance" })] }) }), _jsx("tbody", { className: "divide-y", children: loading ? (Array.from({ length: 5 }).map((_, i) => (_jsx("tr", { children: Array.from({ length: 11 }).map((_, j) => (_jsx("td", { className: "px-4 py-4", children: _jsx("div", { className: "h-5 animate-pulse rounded bg-muted" }) }, j))) }, i)))) : data.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-4 py-16 text-center text-sm text-muted-foreground", children: "No movements found" }) })) : (data.map((entry, idx) => {
                                        const isIn = ['opening', 'purchase_receipt', 'sales_return', 'correction'].includes(entry.movementType);
                                        return (_jsxs("tr", { className: "transition-colors hover:bg-muted/20", children: [_jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }), _jsx("td", { className: "px-4 py-3 text-xs", children: movementLabels[entry.movementType] || entry.movementType }), _jsx("td", { className: "px-4 py-3 text-xs font-medium", children: entry.itemId }), _jsx("td", { className: "px-4 py-3 text-xs font-mono text-muted-foreground", children: entry.batchNo || '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-right font-medium text-emerald-600", children: isIn ? entry.quantity : '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-right font-medium text-red-600", children: !isIn ? entry.quantity : '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-right font-semibold", children: entry.afterQuantity ?? '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-right", children: entry.rate ? `₹${entry.rate.toFixed(2)}` : '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: entry.referenceType || '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate", children: entry.reason || '—' }), _jsx("td", { className: "px-4 py-3 text-xs text-right font-bold", children: idx === 0 ? (entry.afterQuantity ?? '—') : '—' })] }, entry.id));
                                    })) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between border-t px-4 py-3", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Page ", page, " of ", totalPages, " (", total, " entries)"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page <= 1, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40", children: "\u2190 Prev" }), Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const start = Math.max(1, page - 2);
                                        const p = start + i;
                                        if (p > totalPages) {
                                            return null;
                                        }
                                        return _jsx("button", { onClick: () => setPage(p), className: `rounded-lg px-3 py-1.5 text-sm font-medium transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`, children: p }, p);
                                    }), _jsx("button", { onClick: () => setPage(Math.min(totalPages, page + 1)), disabled: page >= totalPages, className: "rounded-lg px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40", children: "Next \u2192" })] })] }))] })] }));
}
//# sourceMappingURL=stock-ledger-enhanced.js.map