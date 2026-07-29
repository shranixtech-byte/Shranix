import { useEffect, useState } from 'react';

interface Comment {
  id: string;
  instanceId: string;
  userId: string;
  userName?: string;
  commentType: string;
  message: string;
  mentions?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

interface CommentsPanelProps {
  instanceId: string;
  documentType?: string;
  documentId?: string;
  currentUserId?: string;
  currentUserName?: string;
}

export function CommentsPanel({ instanceId, documentType, documentId, currentUserId, currentUserName }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadComments = async () => {
    try {
      const res = await fetch(`/workflow/comments/instance/${instanceId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.data || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(); }, [instanceId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || sending) {return;}
    setSending(true);
    try {
      const res = await fetch('/workflow/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          documentId,
          documentType,
          userId: currentUserId || 'system',
          userName: currentUserName || 'System',
          commentType: 'comment',
          message: newComment.trim(),
        }),
      });
      if (res.ok) {
        setNewComment('');
        await loadComments();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Comments & Activity</h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {(comment.userName || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{comment.userName || 'Unknown'}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {comment.commentType}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{comment.message}</p>
              {comment.attachmentUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2">
                  <span className="text-xs">📎</span>
                  <a href={comment.attachmentUrl} className="text-xs text-primary hover:underline" target="_blank" rel="noreferrer">
                    {comment.attachmentName || 'Attachment'}
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a comment... (Enter to send, Shift+Enter for new line)"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            disabled={sending}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || sending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
