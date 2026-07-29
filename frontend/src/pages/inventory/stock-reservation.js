import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Lock, Unlock, Search, RefreshCw, AlertCircle, CheckCircle, History } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/api-client';
export function StockReservationPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [reserveForm, setReserveForm] = useState({});
    const [releaseForm, setReleaseForm] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await apiRequest('/inventory/batches?pageSize=1000');
            const data = result?.data || result || [];
            setBatches(Array.isArray(data) ? data : []);
            // Load reservation history
            const histResult = await apiRequest('/inventory/stock-movements?pageSize=200');
            const histData = histResult?.data || histResult || [];
            setHistory((Array.isArray(histData) ? histData : [])
                .filter((m) => m.movementType === 'reserve' || m.movementType === 'release')
                .map((m) => ({
                id: m.id,
                batchId: m.batchNo || m.referenceId,
                action: m.movementType,
                quantity: m.quantity,
                reason: m.reason || m.notes || '',
                userId: m.createdBy || '',
                createdAt: m.createdAt,
            })));
        }
        catch {
            setBatches([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const handleReserve = async (batchId) => {
        const form = reserveForm[batchId];
        if (!form || form.qty <= 0) {
            return;
        }
        setActionLoading(batchId);
        setError(null);
        try {
            const batch = batches.find((b) => b.id === batchId);
            await apiRequest(`/inventory/batches/${batchId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    reservedQuantity: (batch?.reservedQuantity || 0) + form.qty,
                    availableQuantity: Math.max(0, (batch?.quantity || 0) - (batch?.reservedQuantity || 0) - form.qty),
                }),
            });
            // Log the reservation
            await apiRequest('/inventory/stock-movements', {
                method: 'POST',
                body: JSON.stringify({
                    itemId: batch?.itemId,
                    batchNo: batch?.batchNo,
                    warehouseId: batch?.warehouseId,
                    movementType: 'reserve',
                    quantity: form.qty,
                    reason: form.reason || 'Manual reservation',
                    notes: form.reason,
                }),
            });
            setReserveForm((prev) => {
                const next = { ...prev };
                delete next[batchId];
                return next;
            });
            await load();
        }
        catch (e) {
            setError(e.message || 'Failed to reserve stock');
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleRelease = async (batchId, qty, reason) => {
        if (qty <= 0) {
            return;
        }
        setActionLoading(batchId);
        setError(null);
        try {
            const batch = batches.find((b) => b.id === batchId);
            const newReserved = Math.max(0, (batch?.reservedQuantity || 0) - qty);
            await apiRequest(`/inventory/batches/${batchId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    reservedQuantity: newReserved,
                    availableQuantity: (batch?.quantity || 0) - newReserved,
                }),
            });
            await apiRequest('/inventory/stock-movements', {
                method: 'POST',
                body: JSON.stringify({
                    itemId: batch?.itemId,
                    batchNo: batch?.batchNo,
                    warehouseId: batch?.warehouseId,
                    movementType: 'release',
                    quantity: qty,
                    reason: reason || 'Manual release',
                    notes: reason,
                }),
            });
            await load();
        }
        catch (e) {
            setError(e.message || 'Failed to release stock');
        }
        finally {
            setActionLoading(null);
        }
    };
    const filtered = batches.filter((b) => {
        if (!search) {
            return true;
        }
        const q = search.toLowerCase();
        return (b.batchNo?.toLowerCase().includes(q) ||
            b.itemId?.toLowerCase().includes(q) ||
            b.warehouseId?.toLowerCase().includes(q) ||
            b.locationCode?.toLowerCase().includes(q));
    });
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading stock data..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Stock Reservation" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage reserved stock, allocation, and release" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => setShowHistory(!showHistory), className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(History, { className: "h-4 w-4" }), showHistory ? 'Hide History' : 'Reservation History'] }), _jsxs("button", { onClick: () => load(), className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Refresh"] })] })] }), error && (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400", children: [_jsx(AlertCircle, { className: "h-4 w-4 shrink-0" }), error, _jsx("button", { onClick: () => setError(null), className: "ml-auto underline", children: "Dismiss" })] })), _jsxs("div", { className: "relative max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search batch, item, warehouse...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary" })] }), showHistory && (_jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold", children: "Reservation History" }), history.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "No reservation history available" })) : (_jsx("div", { className: "max-h-64 space-y-2 overflow-y-auto", children: history.map((h) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs", children: [_jsxs("div", { className: "flex items-center gap-3", children: [h.action === 'reserve' ? (_jsx(Lock, { className: "h-3.5 w-3.5 text-amber-500" })) : (_jsx(Unlock, { className: "h-3.5 w-3.5 text-emerald-500" })), _jsxs("span", { className: `font-medium ${h.action === 'reserve' ? 'text-amber-600' : 'text-emerald-600'}`, children: [h.action === 'reserve' ? 'Reserved' : 'Released', " ", h.quantity] }), _jsxs("span", { className: "text-muted-foreground", children: ["\u2014 ", h.reason] })] }), _jsx("span", { className: "text-muted-foreground", children: h.createdAt ? new Date(h.createdAt).toLocaleString() : '' })] }, h.id))) }))] })), _jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm", children: [_jsx("p", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wide", children: "Total Stock" }), _jsx("p", { className: "mt-2 text-2xl font-bold", children: batches.reduce((s, b) => s + (b.quantity || 0), 0) })] }), _jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm", children: [_jsxs("p", { className: "flex items-center gap-1.5 text-xs font-medium text-amber-600 uppercase tracking-wide", children: [_jsx(Lock, { className: "h-3 w-3" }), " Reserved"] }), _jsx("p", { className: "mt-2 text-2xl font-bold text-amber-600", children: batches.reduce((s, b) => s + (b.reservedQuantity || 0), 0) })] }), _jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm", children: [_jsxs("p", { className: "flex items-center gap-1.5 text-xs font-medium text-emerald-600 uppercase tracking-wide", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Available"] }), _jsx("p", { className: "mt-2 text-2xl font-bold text-emerald-600", children: batches.reduce((s, b) => s + ((b.availableQuantity ?? b.quantity ?? 0) - (b.reservedQuantity ?? 0)), 0) })] })] }), _jsx("div", { className: "space-y-3", children: filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center py-16 text-center", children: [_jsx(Lock, { className: "h-12 w-12 text-muted-foreground/30" }), _jsx("p", { className: "mt-4 text-sm font-medium text-muted-foreground", children: "No stock batches found" }), _jsx("p", { className: "text-xs text-muted-foreground/60", children: "Create stock entries first to manage reservations" })] })) : (filtered.map((batch) => {
                    const available = (batch.availableQuantity ?? batch.quantity ?? 0) - (batch.reservedQuantity ?? 0);
                    return (_jsxs("div", { className: "rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-semibold", children: batch.batchNo || 'No Batch' }), _jsx("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-medium ${batch.status === 'expired' ? 'bg-red-50 text-red-700' :
                                                            batch.status === 'near_expiry' ? 'bg-amber-50 text-amber-700' :
                                                                'bg-emerald-50 text-emerald-700'}`, children: batch.status || 'fresh' })] }), _jsxs("div", { className: "mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Item: ", batch.itemId] }), _jsxs("span", { children: ["WH: ", batch.warehouseId || '—'] }), batch.locationCode && _jsxs("span", { children: ["Loc: ", batch.locationCode] })] })] }), _jsxs("div", { className: "flex items-center gap-4 shrink-0 ml-4", children: [_jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Qty" }), _jsx("p", { className: "text-sm font-bold", children: batch.quantity || 0 })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-amber-600", children: "Reserved" }), _jsx("p", { className: "text-sm font-bold text-amber-600", children: batch.reservedQuantity || 0 })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-emerald-600", children: "Available" }), _jsx("p", { className: "text-sm font-bold text-emerald-600", children: available })] })] })] }), available > 0 && (_jsxs("div", { className: "mt-4 flex items-center gap-3 border-t pt-3", children: [_jsx("input", { type: "number", min: 0, max: available, placeholder: "Qty", value: reserveForm[batch.id]?.qty ?? '', onChange: (e) => setReserveForm((prev) => ({
                                            ...prev,
                                            [batch.id]: { qty: Number(e.target.value) || 0, reason: prev[batch.id]?.reason || '' },
                                        })), className: "w-20 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" }), _jsx("input", { type: "text", placeholder: "Reason (e.g., Sales Order SO-001)", value: reserveForm[batch.id]?.reason ?? '', onChange: (e) => setReserveForm((prev) => ({
                                            ...prev,
                                            [batch.id]: { qty: prev[batch.id]?.qty || 0, reason: e.target.value },
                                        })), className: "flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" }), _jsxs("button", { onClick: () => handleReserve(batch.id), disabled: !reserveForm[batch.id]?.qty || actionLoading === batch.id, className: "flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600 disabled:opacity-50", children: [_jsx(Lock, { className: "h-3 w-3" }), "Reserve"] })] })), (batch.reservedQuantity ?? 0) > 0 && (_jsxs("div", { className: "mt-2 flex items-center gap-3", children: [_jsx("input", { type: "number", min: 0, max: batch.reservedQuantity, placeholder: "Release qty", value: releaseForm[batch.id]?.qty ?? '', onChange: (e) => setReleaseForm((prev) => ({
                                            ...prev,
                                            [batch.id]: { qty: Number(e.target.value) || 0, reason: prev[batch.id]?.reason || '' },
                                        })), className: "w-20 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary" }), _jsxs("button", { onClick: () => {
                                            const qty = releaseForm[batch.id]?.qty || 0;
                                            if (qty > 0) {
                                                handleRelease(batch.id, qty, 'Manual release');
                                            }
                                        }, disabled: !releaseForm[batch.id]?.qty || actionLoading === batch.id, className: "flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-all hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950", children: [_jsx(Unlock, { className: "h-3 w-3" }), "Release"] })] }))] }, batch.id));
                })) })] }));
}
//# sourceMappingURL=stock-reservation.js.map