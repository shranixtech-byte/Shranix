import {
  AlertTriangle,
  Bell,
  CheckCircle,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/services/communication.service';

const typeStyles: Record<string, { icon: typeof Bell; cls: string }> = {
  success: { icon: CheckCircle, cls: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  warning: { icon: AlertTriangle, cls: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  error: { icon: XCircle, cls: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  approval: { icon: Bell, cls: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  escalation: { icon: AlertTriangle, cls: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' },
  reminder: { icon: Bell, cls: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30' },
};

export function NotificationCenterPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getMyNotifications(page, PAGE_SIZE, filter === 'unread')) as any;
      setItems(res?.data || []);
      setTotal(res?.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRead = async (id: string) => {
    await markNotificationRead(id).catch(() => undefined);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleAllRead = async () => {
    await markAllNotificationsRead().catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            In-app notifications, approvals and reminders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex rounded-lg p-0.5">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>
          <button
            onClick={() => void handleAllRead()}
            className="border-border hover:border-primary/40 hover:text-foreground text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 hover:text-foreground text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-16 text-center">
            <Bell className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground mt-3 text-sm">No notifications</p>
          </div>
        ) : (
          items.map((n) => {
            const style = typeStyles[n.type] || {
              icon: Info,
              cls: 'text-sky-500 bg-sky-50 dark:bg-sky-950/30',
            };
            const Icon = style.icon;
            return (
              <button
                key={n.id}
                onClick={() => void handleRead(n.id)}
                className={`bg-card hover:border-primary/30 flex w-full items-start gap-3 rounded-xl border p-4 text-left shadow-sm transition-all ${
                  n.isRead ? 'opacity-70' : 'border-primary/25'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.cls}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{n.title}</span>
                    {!n.isRead && <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {n.message}
                  </span>
                  <span className="text-muted-foreground/60 mt-1.5 block text-[11px]">
                    {new Date(n.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {n.documentType ? ` • ${n.documentType}` : ''}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-border hover:border-primary/40 rounded-lg border p-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages} ({total} notifications)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-border hover:border-primary/40 rounded-lg border p-1.5 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
