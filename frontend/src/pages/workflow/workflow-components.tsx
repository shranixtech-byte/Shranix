import { useEffect, useState } from 'react';

// ═════════════════════════════════════════════════════════════
// WORKFLOW STATUS BADGE
// ═════════════════════════════════════════════════════════════
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const badgeStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  submitted: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
  under_review: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
  approved: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  rejected: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  closed: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  pending: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
  active: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
};

const dotColors: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  under_review: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-400',
  closed: 'bg-slate-400',
  pending: 'bg-yellow-500',
  active: 'bg-blue-500',
};

export function WorkflowStatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const style = badgeStyles[status] || 'bg-gray-100 text-gray-600';
  const dot = dotColors[status] || 'bg-gray-400';
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${style} ${sizeClasses}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {showLabel && (status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '))}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════
// WORKFLOW PROGRESS INDICATOR
// ═════════════════════════════════════════════════════════════
interface ProgressIndicatorProps {
  currentState: string;
  steps?: string[];
  size?: 'sm' | 'md';
}

const defaultSteps = ['draft', 'submitted', 'under_review', 'approved', 'completed'];

const stepLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Review',
  approved: 'Approved',
  completed: 'Completed',
  closed: 'Closed',
};

export function WorkflowProgressIndicator({ currentState, steps = defaultSteps, size = 'md' }: ProgressIndicatorProps) {
  const currentIdx = steps.indexOf(currentState);
  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step} className="flex items-center">
            {/* Step dot + label */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center rounded-full font-bold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700'
                } ${isSmall ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs'}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              {!isSmall && (
                <span className={`mt-1 text-[10px] font-medium ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {stepLabels[step] || step}
                </span>
              )}
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 ${isSmall ? 'mx-1' : 'mx-2'} ${
                idx < currentIdx ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// WORKFLOW SUMMARY CARD
// ═════════════════════════════════════════════════════════════
interface SummaryCardProps {
  workflowInstanceId?: string;
  documentType?: string;
  documentId?: string;
  onViewDetails?: () => void;
}

interface WorkflowSummary {
  id: string;
  currentState: string;
  status: string;
  priority: string;
  approvalLevel: number;
  maxApprovalLevel: number;
  assignedToName?: string;
  dueDate?: string;
  templateName?: string;
}

export function WorkflowSummaryCard({ workflowInstanceId, documentType, documentId, onViewDetails }: SummaryCardProps) {
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workflowInstanceId && (!documentType || !documentId)) {
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        if (workflowInstanceId) {
          const res = await fetch(`/workflow/instances/${workflowInstanceId}`);
          const data = await res.json();
          setSummary(data);
        } else if (documentType && documentId) {
          const res = await fetch(`/workflow/instances/by-document/${documentType}/${documentId}`);
          const data = await res.json();
          if (data) {setSummary(data);}
        }
      } catch {
        // No workflow exists
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [workflowInstanceId, documentType, documentId]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-dashed bg-card/50 p-4">
        <p className="text-xs text-muted-foreground">No active workflow</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Workflow</span>
          <WorkflowStatusBadge status={summary.currentState} size="sm" />
        </div>
        {summary.priority === 'high' || summary.priority === 'urgent' ? (
          <span className={`text-[10px] font-medium ${summary.priority === 'urgent' ? 'text-red-500' : 'text-yellow-600'}`}>
            {summary.priority.toUpperCase()}
          </span>
        ) : null}
      </div>

      {/* Progress */}
      <div className="mt-3">
        <WorkflowProgressIndicator currentState={summary.currentState} size="sm" />
      </div>

      {/* Details */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Level</span>
          <p className="font-medium">{summary.approvalLevel}/{summary.maxApprovalLevel}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Status</span>
          <p className="font-medium">{summary.status}</p>
        </div>
        {summary.dueDate && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Due</span>
            <p className="font-medium">{new Date(summary.dueDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* View button */}
      {onViewDetails && (
        <button onClick={onViewDetails} className="mt-3 w-full rounded-md border bg-background py-1.5 text-xs font-medium hover:bg-muted">
          View Workflow Details
        </button>
      )}
    </div>
  );
}
