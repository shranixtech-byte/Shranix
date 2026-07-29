import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
export function StockAdjustmentPage() {
    const navigate = useNavigate();
    const [batchId, setBatchId] = useState('');
    const [type, setType] = useState('increase');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!batchId.trim()) {
            setError('Batch ID is required');
            return;
        }
        if (!reason.trim()) {
            setError('Reason is required');
            return;
        }
        setSubmitting(true);
        setError(null);
        setSuccess(false);
        try {
            await apiRequest(`/inventory/batches/${batchId}/stock/adjustment`, {
                method: 'POST',
                body: JSON.stringify({ type, quantity, reason, remarks }),
            });
            setSuccess(true);
            setBatchId('');
            setQuantity(1);
            setReason('');
            setRemarks('');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => navigate('/inventory/stock-movements'), className: "flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-all hover:bg-muted", children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold tracking-tight", children: "Stock Adjustment" }), _jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: "Increase or decrease stock for a specific batch" })] })] }), error && (_jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), " ", error] })), success && (_jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), " Stock adjusted successfully!"] })), _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "rounded-2xl border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex gap-2 mb-6", children: [_jsxs("button", { type: "button", onClick: () => setType('increase'), className: `flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${type === 'increase' ? 'bg-emerald-600 text-white shadow-sm' : 'border bg-background text-muted-foreground hover:bg-muted'}`, children: [_jsx(TrendingUp, { className: "h-4 w-4" }), " Increase Stock"] }), _jsxs("button", { type: "button", onClick: () => setType('decrease'), className: `flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${type === 'decrease' ? 'bg-red-600 text-white shadow-sm' : 'border bg-background text-muted-foreground hover:bg-muted'}`, children: [_jsx(TrendingDown, { className: "h-4 w-4" }), " Decrease Stock"] })] }), _jsxs("div", { className: "grid gap-x-6 gap-y-4 sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-muted-foreground", children: "Batch ID *" }), _jsx("input", { value: batchId, onChange: (e) => setBatchId(e.target.value), required: true, placeholder: "Enter batch ID", className: "h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-muted-foreground", children: "Quantity *" }), _jsx("input", { type: "number", min: 1, value: quantity, onChange: (e) => setQuantity(Number(e.target.value)), required: true, className: "h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-muted-foreground", children: "Reason *" }), _jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), required: true, className: "h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "", children: "Select reason..." }), _jsx("option", { value: "physical_count", children: "Physical Count Difference" }), _jsx("option", { value: "damaged", children: "Damaged Goods" }), _jsx("option", { value: "expired", children: "Expired" }), _jsx("option", { value: "return_to_supplier", children: "Return to Supplier" }), _jsx("option", { value: "found_in_warehouse", children: "Found in Warehouse" }), _jsx("option", { value: "sample", children: "Sample / Promotion" }), _jsx("option", { value: "write_off", children: "Write Off" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsxs("div", { className: "sm:col-span-2", children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-muted-foreground", children: "Remarks" }), _jsx("textarea", { value: remarks, onChange: (e) => setRemarks(e.target.value), rows: 2, placeholder: "Additional notes...", className: "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" })] })] }), _jsxs("div", { className: "mt-6 flex items-center justify-end gap-3 border-t pt-5", children: [_jsx("button", { type: "button", onClick: () => navigate('/inventory/stock-movements'), className: "rounded-xl border px-5 py-2.5 text-sm font-medium transition-all hover:bg-muted", children: "Cancel" }), _jsx("button", { type: "submit", disabled: submitting, className: "inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50", children: submitting ? 'Processing...' : `Apply ${type === 'increase' ? 'Increase' : 'Decrease'}` })] })] }) })] }));
}
//# sourceMappingURL=stock-adjustment.js.map