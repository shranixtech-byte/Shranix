import { ClipboardList, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Calendar } from 'lucide-react';
import { useMemo } from 'react';

interface TaskItem {
  id: string;
  title: string;
  documentType: string;
  dueDate: string | null;
  priority: string;
}

interface TodayTasksProps {
  tasks: TaskItem[];
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  if (p === 'high' || p === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle className="h-2.5 w-2.5" /> High
      </span>
    );
  }
  if (p === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
        <Clock className="h-2.5 w-2.5" /> Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Normal
    </span>
  );
}

export function TodayTasks({ tasks }: TodayTasksProps) {
  const items = useMemo(() => tasks.slice(0, 5), [tasks]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Tasks</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {items.length > 0 ? `${items.length} pending` : 'All caught up'}
            </p>
          </div>
          {items.length > 0 && (
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
              {items.length}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {items.length > 0 ? (
            items.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all hover:border-slate-100 hover:bg-slate-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/30"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-600">
                  <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-800 truncate dark:text-slate-200">{task.title}</p>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{task.documentType}</span>
                    {task.dueDate && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">All tasks completed</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">No pending approvals or tasks</p>
            </div>
          )}
        </div>

        <button className="relative mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300">
          View all tasks
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
