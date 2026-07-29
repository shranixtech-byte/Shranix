import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const notificationStyles = {
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
export function NotificationPanel({ notifications, viewAllPath = '/workflow/my-tasks' }) {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "rounded-xl border bg-card p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground", children: _jsx(Bell, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: "Notifications" }), _jsx("p", { className: "text-xs text-muted-foreground", children: notifications.length > 0
                                            ? `${notifications.length} unread notification${notifications.length !== 1 ? 's' : ''}`
                                            : 'No unread notifications' })] })] }), notifications.length > 0 && (_jsxs("button", { onClick: () => navigate(viewAllPath), className: "flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80", children: ["View All", _jsx(ArrowRight, { className: "h-3.5 w-3.5" })] }))] }), notifications.length === 0 ? (_jsx("div", { className: "flex h-24 items-center justify-center rounded-lg border-2 border-dashed", children: _jsxs("div", { className: "text-center", children: [_jsx(Bell, { className: "mx-auto h-6 w-6 text-muted-foreground/50" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "All caught up!" })] }) })) : (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute left-[17px] top-3 h-[calc(100%-24px)] w-px bg-border" }), _jsx("div", { className: "space-y-3", children: notifications.slice(0, 5).map((notification) => {
                            const styles = notificationStyles[notification.type] || notificationStyles.info;
                            const Icon = styles.icon;
                            return (_jsxs("div", { className: `relative flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 ${styles.bg}`, children: [_jsxs("div", { className: `relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center`, children: [_jsx(Icon, { className: "h-3.5 w-3.5 text-muted-foreground" }), _jsx("span", { className: `absolute h-2 w-2 rounded-full ${styles.dot} ring-2 ring-background` })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium", children: notification.title }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground line-clamp-2", children: notification.message }), notification.createdAt && (_jsx("p", { className: "mt-1 text-[11px] text-muted-foreground/60", children: new Date(notification.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }) }))] })] }, notification.id));
                        }) })] }))] }));
}
//# sourceMappingURL=NotificationPanel.js.map