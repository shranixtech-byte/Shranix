import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// ── APPROVE DIALOG ──────────────────────────────────────────
export function ApproveDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }) {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const handleApprove = async () => {
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/workflow/instances/${instanceId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    userId: userId || 'system',
                    userName: userName || 'System',
                    userRole: userRole || 'manager',
                    comment: comment || undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.message || 'Failed to approve');
                return;
            }
            setOpen(false);
            setComment('');
            onComplete?.();
        }
        catch {
            setError('Network error');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (!open) {
        return (_jsx("button", { onClick: () => setOpen(true), className: "rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700", children: "\u2713 Approve" }));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", onClick: () => setOpen(false), children: _jsxs("div", { className: "w-full max-w-md rounded-lg bg-card p-6 shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("h3", { className: "text-lg font-semibold", children: ["Approve ", documentType] }), documentNumber && _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: documentNumber }), _jsx("textarea", { value: comment, onChange: (e) => setComment(e.target.value), placeholder: "Optional approval comment...", rows: 3, className: "mt-4 w-full rounded-md border bg-background p-3 text-sm outline-none ring-primary/30 focus:ring-2" }), error && _jsx("p", { className: "mt-2 text-sm text-red-500", children: error }), _jsxs("div", { className: "mt-4 flex justify-end gap-3", children: [_jsx("button", { onClick: () => { setOpen(false); setError(''); }, className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "Cancel" }), _jsx("button", { onClick: handleApprove, disabled: submitting, className: "rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50", children: submitting ? 'Approving...' : '✓ Approve' })] })] }) }));
}
// ── REJECT DIALOG ───────────────────────────────────────────
export function RejectDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const handleReject = async () => {
        if (!reason.trim()) {
            setError('Rejection reason is required');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/workflow/instances/${instanceId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reject',
                    userId: userId || 'system',
                    userName: userName || 'System',
                    userRole: userRole || 'manager',
                    comment: reason.trim(),
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.message || 'Failed to reject');
                return;
            }
            setOpen(false);
            setReason('');
            onComplete?.();
        }
        catch {
            setError('Network error');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (!open) {
        return (_jsx("button", { onClick: () => setOpen(true), className: "rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950", children: "\u2717 Reject" }));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", onClick: () => setOpen(false), children: _jsxs("div", { className: "w-full max-w-md rounded-lg bg-card p-6 shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("h3", { className: "text-lg font-semibold text-red-600", children: ["Reject ", documentType] }), documentNumber && _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: documentNumber }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Reason for rejection (required)...", rows: 3, className: "mt-4 w-full rounded-md border bg-background p-3 text-sm outline-none ring-red-300 focus:ring-2" }), error && _jsx("p", { className: "mt-2 text-sm text-red-500", children: error }), _jsxs("div", { className: "mt-4 flex justify-end gap-3", children: [_jsx("button", { onClick: () => { setOpen(false); setError(''); }, className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "Cancel" }), _jsx("button", { onClick: handleReject, disabled: submitting || !reason.trim(), className: "rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50", children: submitting ? 'Rejecting...' : '✗ Reject' })] })] }) }));
}
// ── RETURN DIALOG ───────────────────────────────────────────
export function ReturnDialog({ instanceId, documentType, documentNumber, userId, userName, userRole, onComplete }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const handleReturn = async () => {
        if (!reason.trim()) {
            setError('Return reason is required');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/workflow/instances/${instanceId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'return',
                    userId: userId || 'system',
                    userName: userName || 'System',
                    userRole: userRole || 'manager',
                    comment: reason.trim(),
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.message || 'Failed to return');
                return;
            }
            setOpen(false);
            setReason('');
            onComplete?.();
        }
        catch {
            setError('Network error');
        }
        finally {
            setSubmitting(false);
        }
    };
    if (!open) {
        return (_jsx("button", { onClick: () => setOpen(true), className: "rounded-md border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950", children: "\u21A9 Return" }));
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", onClick: () => setOpen(false), children: _jsxs("div", { className: "w-full max-w-md rounded-lg bg-card p-6 shadow-xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("h3", { className: "text-lg font-semibold text-yellow-600", children: ["Return ", documentType] }), documentNumber && _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: documentNumber }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Reason for return (required)...", rows: 3, className: "mt-4 w-full rounded-md border bg-background p-3 text-sm outline-none ring-yellow-300 focus:ring-2" }), error && _jsx("p", { className: "mt-2 text-sm text-red-500", children: error }), _jsxs("div", { className: "mt-4 flex justify-end gap-3", children: [_jsx("button", { onClick: () => { setOpen(false); setError(''); }, className: "rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted", children: "Cancel" }), _jsx("button", { onClick: handleReturn, disabled: submitting || !reason.trim(), className: "rounded-md bg-yellow-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50", children: submitting ? 'Returning...' : '↩ Return' })] })] }) }));
}
//# sourceMappingURL=approval-dialogs.js.map