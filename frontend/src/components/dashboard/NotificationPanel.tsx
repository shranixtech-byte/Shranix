import { Bell, CheckCircle, AlertTriangle, Info, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string | null;
}

const notificationStyles: Record<string, { icon: typeof Bell; bg: string; dot: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    dot: 'bg-amber-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/20',
    dot: 'bg-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    dot: 'bg-sky-500',
  },
};

interface NotificationPanelProps {
  notifications: Notification[];
  viewAllPath?: string;
}

export function NotificationPanel({ notifications, viewAllPath = '/workflow/my-tasks' }: NotificationPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Bell className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {notifications.length > 0
                ? `${notifications.length} unread notification${notifications.length !== 1 ? 's' : ''}`
                : 'No unread notifications'}
            </p>
          </div>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={() => navigate(viewAllPath)}
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-1 text-sm text-muted-foreground">All caught up!</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[17px] top-3 h-[calc(100%-24px)] w-px bg-border" />

          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => {
              const styles = notificationStyles[notification.type] || notificationStyles.info;
              const Icon = styles.icon;
              return (
                <div key={notification.id} className={`relative flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 ${styles.bg}`}>
                  {/* Timeline dot */}
                  <div className={`relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center`}>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={`absolute h-2 w-2 rounded-full ${styles.dot} ring-2 ring-background`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    {notification.createdAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground/60">
                        {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
