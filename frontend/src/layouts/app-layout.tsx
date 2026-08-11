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
    <div className="relative flex h-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white dark:bg-[#071A2F] dark:text-slate-100">
      {/* GLOBAL REUSABLE AGRICULTURAL BACKGROUND LAYER */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/assets/dashboard-bg.png"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.05] mix-blend-multiply dark:opacity-[0.10] dark:mix-blend-overlay"
        />
        {/* Subtle top atmospheric radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-transparent dark:from-emerald-500/[0.06]" />
      </div>

      {/* Desktop sidebar - with mobile drawer */}
      {(isMobile ? mobileSidebarOpen : true) && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={isMobile ? () => setMobileSidebarOpen(false) : undefined}
        />
      )}

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={handleToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <UpdateBanner />
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
