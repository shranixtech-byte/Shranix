import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutDashboard, ShoppingCart, Package, Bot, Menu, Bell, MoreHorizontal } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBottomNavVisible } from '@/hooks/useResponsive';
const defaultItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Sales', icon: ShoppingCart, path: '/sales/dashboard' },
    { label: 'Inventory', icon: Package, path: '/inventory/items' },
    { label: 'AI', icon: Bot, path: '/ai/dashboard' },
    { label: 'More', icon: MoreHorizontal, path: '/more' },
];
export function BottomNav({ items = defaultItems, onMenuToggle, notificationCount = 0, }) {
    const visible = useBottomNavVisible();
    const location = useLocation();
    return (_jsx("nav", { className: `fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg transition-transform duration-300 dark:border-gray-700 dark:bg-gray-900/95 ${visible ? 'translate-y-0' : 'translate-y-full'}`, style: {
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }, children: _jsxs("div", { className: "flex items-center justify-around px-2 py-1", children: [items.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    const Icon = item.icon;
                    return (_jsxs(NavLink, { to: item.path, className: `relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors ${isActive
                            ? 'text-primary-dark'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`, children: [_jsxs("div", { className: "relative", children: [_jsx(Icon, { className: "h-5 w-5" }), (item.badge || (item.label === 'Notifications' && notificationCount > 0)) && (_jsx("span", { className: "absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white", children: item.badge || notificationCount }))] }), _jsx("span", { className: "text-[10px] font-medium", children: item.label })] }, item.path));
                }), onMenuToggle && (_jsxs("button", { onClick: onMenuToggle, className: "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200", children: [_jsx(Menu, { className: "h-5 w-5" }), _jsx("span", { className: "text-[10px] font-medium", children: "Menu" })] }))] }) }));
}
export function NotificationBell({ count = 0, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: "relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800", children: [_jsx(Bell, { className: "h-5 w-5" }), count > 0 && (_jsx("span", { className: "absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white", children: count > 99 ? '99+' : count }))] }));
}
//# sourceMappingURL=BottomNav.js.map