import { MessageSquare, History, Send, User, Clock } from 'lucide-react';
import { useState } from 'react';

import { addApprovalComment } from '@/services/sales-approval.service';
import type { ApprovalComment, ApprovalHistory } from '@/services/sales-approval.service';

interface CommentsPanelProps {
  approvalId: string;
  comments: ApprovalComment[];
  history: ApprovalHistory[];
  onRefresh: () => void;
}

const actionIcons: Record<string, string> = {
  approve: '✅',
  reject: '❌',
  send_back: '↩️',
  assign: '👤',
  view: '👁️',
};

export function CommentsPanel({ approvalId, comments, history, onRefresh }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'timeline'>('comments');

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await addApprovalComment(approvalId, newComment);
      setNewComment('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Sort history by timestamp
  const sortedHistory = [...(history || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const sortedComments = [...(comments || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === 'comments'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Comments ({sortedComments.length})
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === 'timeline'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4" />
          Timeline ({sortedHistory.length})
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'comments' ? (
          <>
            {/* Add Comment */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Add a comment..."
                className="bg-background focus:ring-primary/50 flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Comments List */}
            <div className="max-h-[300px] space-y-3 overflow-y-auto">
              {sortedComments.length > 0 ? (
                sortedComments.map((c) => (
                  <div key={c.id} className="bg-muted/30 flex gap-2 rounded-lg p-3">
                    <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {c.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{c.userName}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(c.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">{c.comment}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-4 text-center text-xs">No comments yet</p>
              )}
            </div>
          </>
        ) : (
          /* Timeline */
          <div className="relative max-h-[400px] overflow-y-auto">
            <div className="bg-muted absolute bottom-0 left-3 top-0 w-0.5" />
            <div className="space-y-4">
              {sortedHistory.length > 0 ? (
                sortedHistory.map((h, i) => (
                  <div key={h.id || i} className="relative flex gap-3 pl-8">
                    <div className="bg-background absolute left-1.5 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full">
                      <span className="text-[9px]">{actionIcons[h.action] || '•'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize">
                          {h.action === 'approve'
                            ? 'Approved'
                            : h.action === 'reject'
                              ? 'Rejected'
                              : h.action === 'send_back'
                                ? 'Sent Back'
                                : h.action === 'assign'
                                  ? 'Assigned'
                                  : 'Viewed'}
                        </span>
                        <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                          <Clock className="h-3 w-3" />
                          {new Date(h.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
                        <User className="h-3 w-3" />
                        <span>{h.actionByName}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {h.fromStatus} → {h.toStatus}
                        </span>
                      </div>
                      {h.comment && (
                        <p className="text-muted-foreground bg-muted/30 mt-1 rounded p-2 text-xs">
                          {h.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-4 text-center text-xs">No history records</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
