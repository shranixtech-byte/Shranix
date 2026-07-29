import { useEffect, useState } from 'react';

interface HistoryEntry {
  id: string;
  action: string;
  actionLabel?: string;
  fromState?: string;
  toState?: string;
  userId: string;
  userName?: string;
  userRole?: string;
  comment?: string;
  createdAt: string;
}

interface WorkflowTimelineProps {
  instanceId: string;
}

const stateColors: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  under_review: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-500',
  closed: 'bg-slate-500',
};

const actionIcons: Record<string, string> = {
  create: '●',
  submit: '↑',
  review: '◎',
  approve: '✓',
  reject: '✗',
  return: '↩',
  cancel: '✕',
  complete: '✓',
  close: '◉',
  reopen: '↻',
  resubmit: '↻',
};

export function WorkflowTimeline({ instanceId }: WorkflowTimelineProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/workflow/instances/${instanceId}/history`)
      .then((r) => r.json())
      .then((d) => {
        const data = Array.isArray(d) ? d : d.data || [];
        setHistory(data.sort((a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [instanceId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading timeline...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
        No workflow history available
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {history.map((entry, index) => (
        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Timeline line */}
          {index < history.length - 1 && (
            <div className="absolute left-[11px] top-5 h-full w-0.5 bg-border" />
          )}

          {/* Timeline dot */}
          <div className="relative z-10 mt-1 flex-shrink-0">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                stateColors[entry.toState || ''] || 'bg-blue-500'
              }`}
              title={entry.toState}
            >
              <span className="text-[10px]">{actionIcons[entry.action] || '•'}</span>
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{entry.actionLabel || entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>

            {entry.fromState && entry.toState && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-medium">{entry.fromState}</span>
                {' → '}
                <span className="font-medium">{entry.toState}</span>
              </p>
            )}

            {entry.userName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                by {entry.userName}{entry.userRole ? ` (${entry.userRole})` : ''}
              </p>
            )}

            {entry.comment && (
              <div className="mt-2 rounded-md bg-muted/50 p-3">
                <p className="text-sm text-foreground">{entry.comment}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
