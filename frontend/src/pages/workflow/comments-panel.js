import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function CommentsPanel({ instanceId, documentType, documentId, currentUserId, currentUserName }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const loadComments = async () => {
        try {
            const res = await fetch(`/workflow/comments/instance/${instanceId}`);
            const data = await res.json();
            setComments(Array.isArray(data) ? data : data.data || []);
        }
        catch {
            setComments([]);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadComments(); }, [instanceId]);
    const handleSubmit = async () => {
        if (!newComment.trim() || sending) {
            return;
        }
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
        }
        catch {
            // ignore
        }
        finally {
            setSending(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col rounded-lg border bg-card shadow-sm", children: [_jsx("div", { className: "border-b px-4 py-3", children: _jsx("h3", { className: "text-sm font-semibold", children: "Comments & Activity" }) }), _jsx("div", { className: "flex-1 space-y-3 overflow-y-auto p-4", children: loading ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "Loading comments..." })) : comments.length === 0 ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-muted-foreground", children: "No comments yet" })) : (comments.map((comment) => (_jsxs("div", { className: "rounded-lg border bg-card p-3 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary", children: (comment.userName || 'U')[0].toUpperCase() }), _jsx("span", { className: "text-sm font-medium", children: comment.userName || 'Unknown' }), _jsx("span", { className: "rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", children: comment.commentType })] }), _jsx("span", { className: "text-xs text-muted-foreground", children: new Date(comment.createdAt).toLocaleString() })] }), _jsx("p", { className: "mt-2 text-sm leading-relaxed", children: comment.message }), comment.attachmentUrl && (_jsxs("div", { className: "mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2", children: [_jsx("span", { className: "text-xs", children: "\uD83D\uDCCE" }), _jsx("a", { href: comment.attachmentUrl, className: "text-xs text-primary hover:underline", target: "_blank", rel: "noreferrer", children: comment.attachmentName || 'Attachment' })] }))] }, comment.id)))) }), _jsx("div", { className: "border-t p-4", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: newComment, onChange: (e) => setNewComment(e.target.value), onKeyDown: handleKeyDown, placeholder: "Type a comment... (Enter to send, Shift+Enter for new line)", className: "flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2", disabled: sending }), _jsx("button", { onClick: handleSubmit, disabled: !newComment.trim() || sending, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50", children: sending ? '...' : 'Send' })] }) })] }));
}
//# sourceMappingURL=comments-panel.js.map