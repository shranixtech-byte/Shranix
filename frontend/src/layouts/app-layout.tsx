import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/mobile/BottomNav';
import { Sidebar } from '@/components/sidebar';
import { UpdateBanner } from '@/components/update-banner';
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
    <div className="relative flex h-screen overflow-hidden bg-[#F3F4F6] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white dark:bg-[#0B0F17] dark:text-slate-100">
      {/* GLOBAL BACKGROUND ATMOSPHERIC AMBIENT GLOW */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.04] blur-3xl dark:bg-emerald-500/[0.07]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-teal-500/[0.03] blur-3xl dark:bg-teal-500/[0.05]" />
      </div>

      {/* Desktop sidebar - Floating Curved Card */}
      {(isMobile ? mobileSidebarOpen : true) && (
        <div className={isMobile ? '' : 'h-full shrink-0 p-2 pr-0'}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onClose={isMobile ? () => setMobileSidebarOpen(false) : undefined}
          />
        </div>
      )}

      {/* Main Container - Floating Header + Content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className={isMobile ? '' : 'px-2.5 pt-2'}>
          <Header onToggleSidebar={handleToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        </div>
        <UpdateBanner />
        <main
          className={`flex-1 overflow-y-auto ${isMobile ? 'px-4 pb-20 pt-4' : 'flex min-h-0 flex-col p-2 sm:p-2.5 xl:p-2.5'}`}
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
