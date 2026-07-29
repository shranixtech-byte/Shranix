import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ArrowRightLeft, Plus, Search, Filter, CheckCircle, XCircle, Clock, Eye, RefreshCw, ChevronDown, ChevronUp, Send, AlertCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
export function StockTransfersPage() {
    const navigate = useNavigate();
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [detailId, setDetailId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showReject, setShowReject] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await apiRequest('/inventory/transfers?pageSize=1000');
            const data = result?.data || result || [];
            setTransfers(Array.isArray(data) ? data : []);
        }
        catch {
            setTransfers([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);
    const handleApprove = async (id) => {
        setActionLoading(id);
        try {
            await apiRequest(`/inventory/transfers/${id}/approve`, { method: 'POST' });
            await load();
        }
        catch {
            alert('Failed to approve transfer');
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleReject = async (id) => {
        if (!rejectReason.trim()) {
            return;
        }
        setActionLoading(id);
        try {
            await apiRequest(`/inventory/transfers/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: rejectReason }),
            });
            setShowReject(null);
            setRejectReason('');
            await load();
        }
        catch {
            alert('Failed to reject transfer');
        }
        finally {
            setActionLoading(null);
        }
    };
    const filtered = transfers.filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) {
            return false;
        }
        if (!search) {
            return true;
        }
        const q = search.toLowerCase();
        return (t.transferNumber.toLowerCase().includes(q) ||
            t.fromLocation.toLowerCase().includes(q) ||
            t.toLocation.toLowerCase().includes(q) ||
            t.itemId?.toLowerCase().includes(q) ||
            t.batchNo?.toLowerCase().includes(q));
    });
    const statusBadge = (status) => {
        const map = {
            draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            approved: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        };
        return map[status] || map.draft;
    };
    const statusIcon = (status) => {
        switch (status) {
            case 'approved': return _jsx(CheckCircle, { className: "h-3.5 w-3.5" });
            case 'rejected': return _jsx(XCircle, { className: "h-3.5 w-3.5" });
            case 'completed': return _jsx(CheckCircle, { className: "h-3.5 w-3.5" });
            default: return _jsx(Clock, { className: "h-3.5 w-3.5" });
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading transfers..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Stock Transfers" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage inventory transfers between warehouses and locations" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => load(), className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), " Refresh"] }), _jsxs("button", { onClick: () => navigate('/inventory/create-transfer'), className: "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]", children: [_jsx(Plus, { className: "h-4 w-4" }), " New Transfer"] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search transfers...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { className: "h-4 w-4 text-muted-foreground" }), ['all', 'draft', 'pending', 'approved', 'completed', 'rejected'].map((s) => (_jsx("button", { onClick: () => setStatusFilter(s), className: `rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${statusFilter === s
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`, children: s.charAt(0).toUpperCase() + s.slice(1) }, s)))] })] }), _jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [_jsxs("p", { children: ["Showing ", Math.min(filtered.length, 1 + (page - 1) * pageSize), "\u2013", Math.min(page * pageSize, filtered.length), " of ", filtered.length, " transfers"] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, className: "rounded px-2.5 py-1 transition hover:bg-muted disabled:opacity-40", children: "\u2190 Prev" }), Array.from({ length: Math.ceil(filtered.length / pageSize) }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === Math.ceil(filtered.length / pageSize) || Math.abs(p - page) <= 2)
                                .map((p, idx, arr) => (_jsxs("span", { className: "flex items-center", children: [idx > 0 && arr[idx - 1] !== p - 1 && _jsx("span", { className: "px-1 text-muted-foreground", children: "..." }), _jsx("button", { onClick: () => setPage(p), className: `rounded px-2.5 py-1 text-xs transition ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`, children: p })] }, p))), _jsx("button", { onClick: () => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1)), disabled: page >= Math.ceil(filtered.length / pageSize), className: "rounded px-2.5 py-1 transition hover:bg-muted disabled:opacity-40", children: "Next \u2192" })] })] }), _jsx("div", { className: "space-y-3", children: filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center py-16 text-center", children: [_jsx(ArrowRightLeft, { className: "h-12 w-12 text-muted-foreground/30" }), _jsx("p", { className: "mt-4 text-sm font-medium text-muted-foreground", children: "No transfers found" }), _jsx("p", { className: "text-xs text-muted-foreground/60", children: "Create a new transfer to get started" })] })) : (filtered.slice((page - 1) * pageSize, page * pageSize).map((t) => (_jsxs("div", { className: "rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-4 min-w-0 flex-1", children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md", children: _jsx(ArrowRightLeft, { className: "h-5 w-5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "text-sm font-semibold", children: t.transferNumber }), _jsxs("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge(t.status)}`, children: [statusIcon(t.status), t.status] })] }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground", children: [_jsxs("span", { children: [t.fromLocation, " (", t.fromType, ")"] }), _jsx("span", { children: "\u2192" }), _jsxs("span", { children: [t.toLocation, " (", t.toType, ")"] }), _jsx("span", { className: "mx-1.5 text-muted-foreground/40", children: "|" }), _jsxs("span", { children: ["Qty: ", t.quantity] }), _jsx("span", { className: "mx-1.5 text-muted-foreground/40", children: "|" }), _jsx("span", { children: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—' })] })] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0 ml-4", children: [_jsxs("button", { onClick: () => setDetailId(detailId === t.id ? null : t.id), className: "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-muted", children: [_jsx(Eye, { className: "h-3.5 w-3.5" }), "Details", detailId === t.id ? _jsx(ChevronUp, { className: "h-3 w-3" }) : _jsx(ChevronDown, { className: "h-3 w-3" })] }), (t.status === 'draft' || t.status === 'pending') && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleApprove(t.id), disabled: actionLoading === t.id, className: "flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-emerald-600 disabled:opacity-50", children: [_jsx(CheckCircle, { className: "h-3.5 w-3.5" }), "Approve"] }), _jsxs("button", { onClick: () => setShowReject(showReject === t.id ? null : t.id), className: "flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950", children: [_jsx(XCircle, { className: "h-3.5 w-3.5" }), "Reject"] })] }))] })] }), showReject === t.id && (_jsx("div", { className: "border-t px-5 py-3", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-red-600", children: "Rejection Reason *" }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Provide a reason for rejection...", className: "w-full rounded-lg border border-red-200 bg-background px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-red-800", rows: 2 })] }), _jsxs("div", { className: "flex items-center gap-2 pt-5", children: [_jsx("button", { onClick: () => handleReject(t.id), disabled: !rejectReason.trim() || actionLoading === t.id, className: "rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-red-600 disabled:opacity-50", children: actionLoading === t.id ? 'Rejecting...' : 'Confirm Reject' }), _jsx("button", { onClick: () => { setShowReject(null); setRejectReason(''); }, className: "rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:bg-muted", children: "Cancel" })] })] }) })), detailId === t.id && (_jsx("div", { className: "border-t px-5 py-4", children: _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Transfer Number" }), _jsx("p", { className: "font-medium", children: t.transferNumber })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Status" }), _jsx("p", { className: "font-medium capitalize", children: t.status })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "From" }), _jsxs("p", { className: "font-medium", children: [t.fromLocation, " (", t.fromType, ")"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "To" }), _jsxs("p", { className: "font-medium", children: [t.toLocation, " (", t.toType, ")"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Item ID" }), _jsx("p", { className: "font-mono text-xs", children: t.itemId })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Batch No" }), _jsx("p", { className: "font-mono text-xs", children: t.batchNo || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantity" }), _jsx("p", { className: "font-medium", children: t.quantity })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Reason" }), _jsx("p", { className: "text-xs", children: t.reason || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Requested By" }), _jsx("p", { className: "text-xs", children: t.requestedBy || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Approved By" }), _jsx("p", { className: "text-xs", children: t.approvedBy || '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Approved Date" }), _jsx("p", { className: "text-xs", children: t.approvedDate ? new Date(t.approvedDate).toLocaleString() : '—' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Rejected Reason" }), _jsx("p", { className: "text-xs text-red-500", children: t.rejectedReason || '—' })] })] }) }))] }, t.id)))) })] }));
}
export function CreateTransferPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        transferNumber: `TRF-${Date.now().toString(36).toUpperCase()}`,
        fromLocation: '',
        toLocation: '',
        fromType: 'warehouse',
        toType: 'warehouse',
        itemId: '',
        batchNo: '',
        quantity: 1,
        reason: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async () => {
        if (!form.fromLocation || !form.toLocation || !form.itemId) {
            setError('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await apiRequest('/inventory/transfers', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            navigate('/inventory/stock-transfers');
        }
        catch (e) {
            setError(e.message || 'Failed to create transfer');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "mx-auto max-w-2xl space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Create Stock Transfer" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Transfer inventory between warehouses and locations" })] }), _jsx("button", { onClick: () => navigate('/inventory/stock-transfers'), className: "rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:bg-muted", children: "\u2190 Back to Transfers" })] }), error && (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400", children: [_jsx(AlertCircle, { className: "h-4 w-4 shrink-0" }), error] })), _jsxs("div", { className: "rounded-2xl border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "Transfer Number *" }), _jsx("input", { type: "text", value: form.transferNumber, onChange: (e) => setForm({ ...form, transferNumber: e.target.value }), className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "Quantity *" }), _jsx("input", { type: "number", min: 1, value: form.quantity, onChange: (e) => setForm({ ...form, quantity: Number(e.target.value) }), className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "From Location *" }), _jsx("input", { type: "text", value: form.fromLocation, onChange: (e) => setForm({ ...form, fromLocation: e.target.value }), placeholder: "Warehouse / Godown / Rack", className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "From Type" }), _jsxs("select", { value: form.fromType, onChange: (e) => setForm({ ...form, fromType: e.target.value }), className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "warehouse", children: "Warehouse" }), _jsx("option", { value: "godown", children: "Godown" }), _jsx("option", { value: "location", children: "Location" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "To Location *" }), _jsx("input", { type: "text", value: form.toLocation, onChange: (e) => setForm({ ...form, toLocation: e.target.value }), placeholder: "Warehouse / Godown / Rack", className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "To Type" }), _jsxs("select", { value: form.toType, onChange: (e) => setForm({ ...form, toType: e.target.value }), className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "warehouse", children: "Warehouse" }), _jsx("option", { value: "godown", children: "Godown" }), _jsx("option", { value: "location", children: "Location" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "Item ID *" }), _jsx("input", { type: "text", value: form.itemId, onChange: (e) => setForm({ ...form, itemId: e.target.value }), placeholder: "Enter item ID or SKU", className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "Batch No" }), _jsx("input", { type: "text", value: form.batchNo, onChange: (e) => setForm({ ...form, batchNo: e.target.value }), placeholder: "Optional batch number", className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium", children: "Reason / Remarks" }), _jsx("textarea", { value: form.reason, onChange: (e) => setForm({ ...form, reason: e.target.value }), placeholder: "Reason for transfer...", className: "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary", rows: 3 })] })] }), _jsxs("div", { className: "mt-8 flex justify-end gap-3", children: [_jsx("button", { onClick: () => navigate('/inventory/stock-transfers'), className: "rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:bg-muted", children: "Cancel" }), _jsxs("button", { onClick: handleSubmit, disabled: submitting, className: "flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50", children: [_jsx(Send, { className: "h-4 w-4" }), submitting ? 'Creating...' : 'Create Transfer'] })] })] })] }));
}
//# sourceMappingURL=stock-transfers.js.map