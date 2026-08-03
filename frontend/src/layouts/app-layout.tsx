import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/mobile/BottomNav';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { getUserLandingPath, isPathAllowed } from '@/lib/module-access';

export function AppLayout() {
  const { isMobile, hasBottomNav } = useResponsive();
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restricted user (tick-based module access) — agar current URL kisi allowed
  // module ke andar nahi hai to landing page par bhej do. Direct URL typing
  // se bhi unallowed module khol nahi sakta.
  if (!isPathAllowed(location.pathname, user)) {
    return <Navigate to={getUserLandingPath(user)} replace />;
  }

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-950 dark:to-slate-900">
      {/* Desktop sidebar - with mobile drawer */}
      {(isMobile ? mobileSidebarOpen : true) && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={isMobile ? () => setMobileSidebarOpen(false) : undefined}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={handleToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <main
          className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pb-20 pt-4' : 'p-5 lg:p-8'}`}
          style={{
            paddingBottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : undefined,
          }}
        >
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        {hasBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
