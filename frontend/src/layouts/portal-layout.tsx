import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { usePortalAuth } from '@/context/PortalAuthContext';
import { portalService } from '@/services/portal.service';

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/portal', label: 'Dashboard', end: true },
  { to: '/portal/quotations', label: 'Quotations' },
  { to: '/portal/orders', label: 'Orders' },
  { to: '/portal/invoices', label: 'Invoices' },
  { to: '/portal/outstanding', label: 'Outstanding' },
  { to: '/portal/ledger', label: 'Ledger' },
  { to: '/portal/documents', label: 'Documents' },
  { to: '/portal/tickets', label: 'Support' },
  { to: '/portal/billing', label: 'Billing' },
  { to: '/portal/license', label: 'License' },
  { to: '/portal/profile', label: 'Profile' },
];

export function PortalLayout() {
  const { user, isAuthenticated, logout } = usePortalAuth();
  const navigate = useNavigate();

  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = (await portalService.getNotifications(6)) as any;
      setNotifications(res?.items || []);
      setUnread(res?.totalUnread || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
    const timer = setInterval(() => void refreshNotifications(), 60_000);
    return () => clearInterval(timer);
  }, [refreshNotifications]);

  // Close notification panel on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login', { replace: true });
  };

  const markAllRead = async () => {
    await portalService.markAllNotificationsRead().catch(() => {});
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SHRANIX" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-sm font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                SHRANIX
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Customer Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Notifications
                    </p>
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        No notifications
                      </p>
                    )}
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`border-b border-slate-50 px-4 py-3 dark:border-slate-700/50 ${n.isRead ? '' : 'bg-emerald-50/60 dark:bg-emerald-900/20'}`}
                      >
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {user?.name}
              </p>
              <p className="text-xs capitalize text-slate-400">
                {user?.role} · {user?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30"
              title="Logout"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="sticky top-16 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
        SHRANIX Krushi ERP · Customer Portal · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
