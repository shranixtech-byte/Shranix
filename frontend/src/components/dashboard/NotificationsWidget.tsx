import { Bell, Info, AlertTriangle, CheckCircle2, XCircle, Clock, ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string | null;
}

interface NotificationsWidgetProps {
  notifications: NotificationItem[];
}

function notifIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'warning': return AlertTriangle;
    case 'error': return XCircle;
    case 'success': return CheckCircle2;
    default: return Info;
  }
}

function notifColor(type: string) {
  switch (type.toLowerCase()) {
    case 'warning': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
    case 'error': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
    case 'success': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
    default: return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
  }
}

export function NotificationsWidget({ notifications }: NotificationsWidgetProps) {
  const items = useMemo(() => notifications.slice(0, 5), [notifications]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-red-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {items.length > 0 ? `${items.length} unread` : 'All clear'}
            </p>
          </div>
          {items.length > 0 && (
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
              {items.length}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {items.length > 0 ? (
            items.map((n) => {
              const Icon = notifIcon(n.type);
              const colors = notifColor(n.type);
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all hover:border-slate-100 hover:bg-slate-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/30"
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">{n.message}</p>
                    {n.createdAt && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <CheckCircle2 className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No notifications</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">You're all caught up</p>
            </div>
          )}
        </div>

        <button className="relative mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300">
          View all notifications
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
