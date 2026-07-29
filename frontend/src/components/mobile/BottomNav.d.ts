import React from 'react';
interface BottomNavItem {
    label: string;
    icon: React.ElementType;
    path: string;
    badge?: number;
}
interface BottomNavProps {
    items?: BottomNavItem[];
    onMenuToggle?: () => void;
    notificationCount?: number;
}
export declare function BottomNav({ items, onMenuToggle, notificationCount, }: BottomNavProps): React.JSX.Element;
export declare function NotificationBell({ count, onClick }: {
    count?: number;
    onClick?: () => void;
}): React.JSX.Element;
export {};
//# sourceMappingURL=BottomNav.d.ts.map