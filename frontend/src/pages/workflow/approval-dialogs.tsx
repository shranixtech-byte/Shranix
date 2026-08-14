import { useState } from 'react';

interface ApprovalDialogsProps {
  instanceId: string;
  documentType?: string;
  documentNumber?: string;
  userName?: string;
  onComplete?: () => void;
}

// ── APPROVE DIALOG ──────────────────────────────────────────
export function ApproveDialog({
  instanceId,
  documentType,
  documentNumber,
  userName,
  onComplete,
}: ApprovalDialogsProps) {
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
          // H2: userId/userRole are intentionally NOT sent — the backend derives
          // the approval actor from the authenticated session and rejects any
          // client-supplied identity that does not match.
          action: 'approve',
          userName: userName || 'System',
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
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        ✓ Approve
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Approve {documentType}</h3>
        {documentNumber && <p className="text-muted-foreground mt-1 text-sm">{documentNumber}</p>}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional approval comment..."
          rows={3}
          className="bg-background ring-primary/30 mt-4 w-full rounded-md border p-3 text-sm outline-none focus:ring-2"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError('');
            }}
            className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Approving...' : '✓ Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── REJECT DIALOG ───────────────────────────────────────────
export function RejectDialog({
  instanceId,
  documentType,
  documentNumber,
  userName,
  onComplete,
}: ApprovalDialogsProps) {
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
          userName: userName || 'System',
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
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        ✗ Reject
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-red-600">Reject {documentType}</h3>
        {documentNumber && <p className="text-muted-foreground mt-1 text-sm">{documentNumber}</p>}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (required)..."
          rows={3}
          className="bg-background mt-4 w-full rounded-md border p-3 text-sm outline-none ring-red-300 focus:ring-2"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError('');
            }}
            className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={submitting || !reason.trim()}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Rejecting...' : '✗ Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RETURN DIALOG ───────────────────────────────────────────
export function ReturnDialog({
  instanceId,
  documentType,
  documentNumber,
  userName,
  onComplete,
}: ApprovalDialogsProps) {
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
          userName: userName || 'System',
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
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950"
      >
        ↩ Return
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-yellow-600">Return {documentType}</h3>
        {documentNumber && <p className="text-muted-foreground mt-1 text-sm">{documentNumber}</p>}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for return (required)..."
          rows={3}
          className="bg-background mt-4 w-full rounded-md border p-3 text-sm outline-none ring-yellow-300 focus:ring-2"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError('');
            }}
            className="hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={submitting || !reason.trim()}
            className="rounded-md bg-yellow-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
          >
            {submitting ? 'Returning...' : '↩ Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
