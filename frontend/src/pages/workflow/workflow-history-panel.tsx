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

interface HistoryPanelProps {
  instanceId: string;
  maxEntries?: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-200 text-gray-500',
  closed: 'bg-slate-100 text-slate-600',
};

export function WorkflowHistoryPanel({ instanceId, maxEntries = 20 }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/workflow/instances/${instanceId}/history`)
      .then((r) => r.json())
      .then((d) => {
        const data = Array.isArray(d) ? d : d.data || [];
        setHistory(data.slice(0, maxEntries));
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [instanceId, maxEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No workflow history available
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Workflow History</h3>
      </div>
      <div className="divide-y">
        {history.map((entry) => (
          <div key={entry.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  statusColors[entry.toState || ''] || 'bg-gray-100 text-gray-600'
                }`}>
                  {entry.actionLabel || entry.action.replace(/_/g, ' ')}
                </span>
                {entry.fromState && entry.toState && (
                  <span className="text-xs text-muted-foreground">
                    {entry.fromState} → {entry.toState}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>by {entry.userName || entry.userId || 'System'}</span>
              {entry.userRole && <span>({entry.userRole})</span>}
            </div>
            {entry.comment && (
              <p className="mt-1 text-xs text-foreground/80">{entry.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
