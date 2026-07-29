import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header';
import { BottomNav } from '@/components/mobile/BottomNav';
import { Sidebar } from '@/components/sidebar';
import { useResponsive } from '@/hooks/useResponsive';
export function AppLayout() {
    const { isMobile, hasBottomNav } = useResponsive();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const handleToggleSidebar = () => {
        if (isMobile) {
            setMobileSidebarOpen((prev) => !prev);
        }
        else {
            setSidebarCollapsed((prev) => !prev);
        }
    };
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-950 dark:to-slate-900", children: [(isMobile ? mobileSidebarOpen : true) && (_jsx(Sidebar, { collapsed: sidebarCollapsed, onToggle: () => setSidebarCollapsed(!sidebarCollapsed), onClose: isMobile ? () => setMobileSidebarOpen(false) : undefined })), _jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [_jsx(Header, { onToggleSidebar: handleToggleSidebar, sidebarCollapsed: sidebarCollapsed }), _jsx("main", { className: `flex-1 overflow-y-auto ${isMobile ? 'pb-20 px-4 pt-4' : 'p-5 lg:p-8'}`, style: {
                            paddingBottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : undefined,
                        }, children: _jsx(Outlet, {}) }), hasBottomNav && _jsx(BottomNav, {})] })] }));
}
//# sourceMappingURL=app-layout.js.map