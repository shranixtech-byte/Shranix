import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Clock, PackageX, Undo2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const alertVariants = {
    warning: {
        bg: 'bg-amber-50/80 dark:bg-amber-950/15',
        border: 'border-amber-200/50 dark:border-amber-800/30',
        icon: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
    },
    danger: {
        bg: 'bg-red-50/80 dark:bg-red-950/15',
        border: 'border-red-200/50 dark:border-red-800/30',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-700 dark:text-red-300',
    },
    info: {
        bg: 'bg-sky-50/80 dark:bg-sky-950/15',
        border: 'border-sky-200/50 dark:border-sky-800/30',
        icon: 'text-sky-600 dark:text-sky-400',
        text: 'text-sky-700 dark:text-sky-300',
    },
    neutral: {
        bg: 'bg-gray-50/80 dark:bg-gray-800/30',
        border: 'border-gray-200/50 dark:border-gray-700/30',
        icon: 'text-gray-600 dark:text-gray-400',
        text: 'text-gray-700 dark:text-gray-300',
    },
};
export function InventoryAlerts({ lowStockCount, nearExpiryCount = 0, expiredCount = 0, pendingReturnsCount = 0, }) {
    const navigate = useNavigate();
    const alerts = [
        {
            label: 'Near Expiry',
            count: nearExpiryCount,
            icon: Clock,
            variant: 'warning',
            path: '/inventory/items',
        },
        {
            label: 'Expired Products',
            count: expiredCount,
            icon: PackageX,
            variant: 'danger',
            path: '/inventory/items',
        },
        {
            label: 'Low Stock',
            count: lowStockCount,
            icon: AlertTriangle,
            variant: 'warning',
            path: '/inventory/items',
        },
        {
            label: 'Pending Returns',
            count: pendingReturnsCount,
            icon: Undo2,
            variant: 'info',
            path: '/purchase/returns',
        },
    ];
    return (_jsxs("div", { className: "rounded-xl border bg-card p-6", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-base font-semibold", children: "Inventory Alerts" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Items requiring immediate attention" })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: alerts.map((alert) => {
                    const styles = alertVariants[alert.variant];
                    const Icon = alert.icon;
                    const hasItems = alert.count > 0;
                    return (_jsxs("button", { onClick: () => navigate(alert.path), className: `group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${hasItems
                            ? `${styles.bg} ${styles.border} hover:shadow-md hover:-translate-y-0.5`
                            : 'border-dashed opacity-60'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: `flex h-9 w-9 items-center justify-center rounded-lg ${styles.bg} ${styles.icon}`, children: _jsx(Icon, { className: "h-4 w-4" }) }), hasItems && (_jsxs("span", { className: "flex items-center gap-1 text-[11px] font-medium text-primary transition-all group-hover:gap-1.5", children: ["View ", _jsx(ArrowRight, { className: "h-3 w-3" })] }))] }), _jsxs("div", { className: "mt-3", children: [_jsx("p", { className: `text-2xl font-bold ${hasItems ? styles.text : 'text-muted-foreground'}`, children: hasItems ? alert.count : 0 }), _jsx("p", { className: `mt-0.5 text-sm ${hasItems ? 'text-foreground' : 'text-muted-foreground'}`, children: alert.label })] })] }, alert.label));
                }) })] }));
}
//# sourceMappingURL=InventoryAlerts.js.map