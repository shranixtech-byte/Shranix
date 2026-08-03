import {
  CheckCircle2,
  XCircle,
  ArrowLeftCircle,
  UserPlus,
  Eye,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

import type { ApprovalMaster } from '@/services/sales-approval.service';
import {
  approveApproval,
  rejectApproval,
  sendBackApproval,
  assignApproval,
} from '@/services/sales-approval.service';

function formatCurrency(v: number): string {
  return `₹${(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-100 text-blue-600 border-blue-200',
  high: 'bg-orange-100 text-orange-600 border-orange-200',
  critical: 'bg-red-100 text-red-600 border-red-200',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  posted: 'bg-purple-100 text-purple-700 border-purple-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface ApprovalCardProps {
  approval: ApprovalMaster;
  onRefresh: () => void;
  onView: (id: string) => void;
}

export function ApprovalCard({ approval, onRefresh, onView }: ApprovalCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState<{
    type: 'approve' | 'reject' | 'send_back';
  } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignUserName, setAssignUserName] = useState('');

  const handleAction = async (type: 'approve' | 'reject' | 'send_back', comment: string) => {
    setActionLoading(type);
    try {
      if (type === 'approve') {
        await approveApproval(approval.id, comment);
      } else if (type === 'reject') {
        await rejectApproval(approval.id, comment, comment);
      } else if (type === 'send_back') {
        await sendBackApproval(approval.id, comment, comment);
      }
      setShowCommentModal(null);
      setCommentText('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async () => {
    if (!assignUserId.trim()) {
      return;
    }
    setActionLoading('assign');
    try {
      await assignApproval(approval.id, assignUserId, assignUserName || assignUserId);
      setAssignModal(false);
      setAssignUserId('');
      setAssignUserName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const documentTypeLabel = approval.documentType.replace(/_/g, ' ');
  const isPending = approval.status === 'pending' || approval.status === 'under_review';

  return (
    <>
      <div className="bg-card hover:border-primary/20 rounded-lg border p-4 shadow-sm transition-all hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-4 w-4" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{approval.documentNumber}</span>
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${statusColors[approval.status] || ''}`}
                >
                  {approval.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-muted-foreground text-xs capitalize">{documentTypeLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${priorityColors[approval.priority] || ''}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {approval.priority}
            </span>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${riskColors[approval.risk] || ''}`}
            >
              {approval.risk}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Customer: </span>
            <span className="font-medium">
              {approval.customerName || approval.customerId?.slice(0, 12)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-bold tabular-nums">{formatCurrency(approval.amount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created by: </span>
            <span>{approval.createdByName || approval.createdBy.slice(0, 12)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Level: </span>
            <span className="font-medium">
              {approval.currentLevel}/{approval.totalLevels}
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Clock className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground">
              {new Date(approval.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {approval.isOverdue && (
              <span className="text-[10px] font-medium text-red-600">⚠ Overdue</span>
            )}
          </div>
        </div>

        {/* Assigned To */}
        {approval.assignedToName && (
          <div className="mt-2 text-xs">
            <span className="text-muted-foreground">Assigned to: </span>
            <span className="font-medium">{approval.assignedToName}</span>
          </div>
        )}

        {/* Action Buttons */}
        {isPending && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            <button
              onClick={() => setShowCommentModal({ type: 'approve' })}
              disabled={actionLoading === 'approve'}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {actionLoading === 'approve' ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => setShowCommentModal({ type: 'reject' })}
              disabled={actionLoading === 'reject'}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              onClick={() => setShowCommentModal({ type: 'send_back' })}
              disabled={actionLoading === 'send_back'}
              className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <ArrowLeftCircle className="h-3.5 w-3.5" />
              Send Back
            </button>
            <button
              onClick={() => setAssignModal(true)}
              disabled={actionLoading === 'assign'}
              className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </button>
            <button
              onClick={() => onView(approval.id)}
              className="bg-background hover:bg-accent inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCommentModal(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-lg border p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold capitalize">
              {showCommentModal.type === 'approve'
                ? 'Approve'
                : showCommentModal.type === 'reject'
                  ? 'Reject'
                  : 'Send Back'}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {showCommentModal.type === 'approve'
                ? 'Optional approval comment'
                : 'Comment is required for this action'}
            </p>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="bg-background focus:ring-primary/50 mt-3 min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              placeholder="Enter your comment..."
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommentModal(null);
                  setCommentText('');
                }}
                className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(showCommentModal.type, commentText)}
                disabled={showCommentModal.type !== 'approve' && !commentText.trim()}
                className={`rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                  showCommentModal.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : showCommentModal.type === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm{' '}
                {showCommentModal.type === 'approve'
                  ? 'Approve'
                  : showCommentModal.type === 'reject'
                    ? 'Reject'
                    : 'Send Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAssignModal(false)}
        >
          <div
            className="bg-card w-full max-w-md rounded-lg border p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold">Assign Approval</h3>
            <p className="text-muted-foreground mt-1 text-xs">Assign this approval to a user</p>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                placeholder="User ID"
              />
              <input
                type="text"
                value={assignUserName}
                onChange={(e) => setAssignUserName(e.target.value)}
                className="bg-background focus:ring-primary/50 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                placeholder="User Name"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setAssignModal(false)}
                className="bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignUserId.trim()}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                {actionLoading === 'assign' ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
