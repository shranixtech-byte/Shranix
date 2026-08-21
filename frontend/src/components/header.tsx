import {
  Calendar,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  Building2,
  Clock,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { hasModuleAccess } from '@/lib/module-access';
import { useTheme } from '@/providers/theme-provider';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/services/communication.service';

interface BreadcrumbLabel {
  [key: string]: string;
}

const breadcrumbLabels: BreadcrumbLabel = {
  '': 'Dashboard',
  companies: 'Companies',
  'financial-years': 'Financial Years',
  branches: 'Branches',
  warehouses: 'Warehouses',
  units: 'Units',
  categories: 'Categories',
  brands: 'Brands',
  'tax-groups': 'Tax Groups',
  'gst-rates': 'GST Rates',
  inventory: 'Inventory',
  items: 'Items',
  groups: 'Groups',
  variants: 'Variants',
  pricing: 'Pricing',
  barcodes: 'Barcodes',
  'hsn-codes': 'HSN Codes',
  'stock-opening': 'Stock Opening',
  images: 'Images',
  settings: 'Settings',
  purchase: 'Purchase',
  orders: 'Orders',
  quotations: 'Quotations',
  grn: 'Goods Receipt',
  invoices: 'Invoices',
  returns: 'Returns',
  'supplier-prices': 'Supplier Prices',
  approvals: 'Approvals',
  dashboard: 'Dashboard',
  sales: 'Sales',
  'delivery-challans': 'Delivery Challans',
  'customer-prices': 'Customer Prices',
  finance: 'Finance',
  'account-groups': 'Account Groups',
  'chart-of-accounts': 'Chart of Accounts',
  ledgers: 'Ledgers',
  'journal-entries': 'Journal Entries',
  'cash-book': 'Cash Book',
  'bank-book': 'Bank Book',
  'cost-centers': 'Cost Centers',
  gl: 'GL & Reports',
  entries: 'Entries',
  'posting-rules': 'Posting Rules',
  'fiscal-closing': 'Fiscal Closing',
  'trial-balance': 'Trial Balance',
  'profit-loss': 'Profit & Loss',
  'balance-sheet': 'Balance Sheet',
  'cash-flow': 'Cash Flow',
  'day-book': 'Day Book',
  'account-statement': 'Account Statement',
  automation: 'Automation',
  posting: 'Posting',
  monitor: 'Monitor',
  integration: 'Integration',
  health: 'Health',
  gst: 'GST & Closing',
  analytics: 'Analytics',
  registrations: 'Registrations',
  ledger: 'Ledger',
  'tax-postings': 'Tax Postings',
  'year-closing': 'Year Closing',
  'period-locks': 'Period Locks',
  'opening-balance-transfers': 'Opening Balances',
  'year-end-entries': 'Year-End Entries',
  'audit-details': 'Audit Details',
  'number-series': 'Number Series',
  'voucher-approvals': 'Voucher Approvals',
  workflow: 'Workflow',
  tasks: 'Tasks',
  'my-tasks': 'My Tasks',
  escalation: 'Escalation',
  dms: 'Documents',
  documents: 'Documents',
  folders: 'Folders',
  tags: 'Tags',
  ocr: 'OCR Queue',
  signatures: 'Signatures',
  compliance: 'Compliance',
  ai: 'AI Intelligence',
  insights: 'Insights',
  forecasts: 'Forecasts',
  usage: 'Usage',
  executive: 'Executive',
  ceo: 'CEO',
  director: 'Director',
  admin: 'Admin',
  operations: 'Operations',
  user: 'My Dashboard',
  bi: 'BI Analytics',
  customers: 'Customers',
  outstanding: 'Outstanding',
  suppliers: 'Suppliers',
  profitability: 'Profitability',
  growth: 'Growth',
};

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showFyDropdown, setShowFyDropdown] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const fyRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        getMyNotifications(1, 10),
        getUnreadNotificationCount(),
      ]);
      setNotifications((list as any)?.data || []);
      setUnreadCount((unread as any)?.count || 0);
    } catch {
      /* header badge must never break the app */
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    const notifTimer = setInterval(() => void loadNotifications(), 60_000);
    return () => {
      clearInterval(timer);
      clearInterval(notifTimer);
    };
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
      if (fyRef.current && !fyRef.current.contains(event.target as Node)) {
        setShowFyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => ({
    label:
      breadcrumbLabels[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    path: `/${pathSegments.slice(0, index + 1).join('/')}`,
  }));

  if (location.pathname === '/') {
    breadcrumbs.unshift({ label: 'Dashboard', path: '/' });
  }

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
    : 'U';

  const pageTitle =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 shadow-lg shadow-slate-900/5 backdrop-blur-2xl transition-all duration-200 sm:px-6 lg:px-6 dark:border-white/[0.08] dark:bg-[#111827]/90 dark:shadow-black/40">
      {/* ── Left: Sidebar Toggle + Title + Breadcrumbs ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="shadow-xs group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-600 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-600 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110" />
        </button>

        {/* Current Page Title */}
        <div className="hidden sm:block">
          <h1 className="font-poppins text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {pageTitle}
          </h1>
        </div>

        {/* Breadcrumb Navigation */}
        <nav
          className="hidden items-center gap-1.5 text-xs text-slate-400 lg:flex"
          aria-label="Breadcrumb"
        >
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <Link
            to="/"
            className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.slice(1).map((crumb, index) => (
            <span key={crumb.path} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-slate-400/60" />
              {index === breadcrumbs.slice(1).length - 1 ? (
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right Actions: Company, FY, Clock, Theme, Notifs, Profile ── */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Company Selector */}
        <div className="relative hidden xl:block" ref={companyRef}>
          <button
            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50/60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="max-w-[110px] truncate">Default Co.</span>
            <span className="shadow-xs h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showCompanyDropdown && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#0B1A33]/95">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Organization
              </p>
              <div className="mt-1 rounded-xl border border-emerald-500/30 bg-emerald-50/60 p-2.5 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    SHRANIX Agro Pvt Ltd
                  </p>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                    Live
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  GSTIN: 27AAAAA0000A1Z5
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Financial Year Selector */}
        <div className="relative hidden xl:block" ref={fyRef}>
          <button
            onClick={() => setShowFyDropdown(!showFyDropdown)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50/60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>FY 2025-26</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showFyDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#0B1A33]/95">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Financial Years
              </p>
              <div className="mt-1 space-y-0.5">
                {['2025-2026', '2024-2025', '2023-2024'].map((fy) => (
                  <button
                    key={fy}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ${
                      fy === '2025-2026'
                        ? 'bg-emerald-500/15 font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>FY {fy}</span>
                    {fy === '2025-2026' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Clock & Date Pill */}
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-100/60 px-3 py-1 text-xs font-medium text-slate-600 2xl:flex dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-300">
          <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>
            {currentTime.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="shadow-xs group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-600 transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-50/60 hover:text-amber-600 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-amber-400/40 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-45" />
          ) : (
            <Moon className="h-4.5 w-4.5 transition-transform duration-300 group-hover:-rotate-12" />
          )}
        </button>

        {/* Notifications Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="shadow-xs group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 text-slate-600 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50/60 hover:text-emerald-600 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white dark:ring-[#071A2F]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#0B1A33]/95">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <p className="font-poppins text-sm font-bold text-slate-800 dark:text-slate-100">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => void handleMarkAllRead()}
                    className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <div className="rounded-xl bg-slate-50/50 py-8 text-center dark:bg-white/[0.02]">
                    <Bell className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      No unread notifications
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => void handleMarkRead(n.id)}
                      className={`flex w-full flex-col gap-1 rounded-xl p-2.5 text-left transition-colors ${
                        n.isRead
                          ? 'opacity-65 hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
                          : 'bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="shadow-xs h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-300">
                        {n.message}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400">
                        {new Date(n.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-2 dark:border-slate-800">
                <Link
                  to="/communications/center"
                  onClick={() => setShowNotifDropdown(false)}
                  className="flex items-center justify-center rounded-xl bg-slate-50 py-2 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-50 dark:bg-white/[0.04] dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  View Notification Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── User Profile Pill ── */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 pr-2.5 transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-50/50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-xs font-extrabold text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30">
              {userInitials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#071A2F]" />
            </div>

            <div className="hidden text-left md:block">
              <p className="font-poppins text-xs font-bold leading-tight text-slate-800 dark:text-slate-100">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <div className="flex items-center gap-1">
                <span className="py-0.2 rounded bg-emerald-500/10 px-1 text-[9.5px] font-extrabold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {user?.role || 'Admin'}
                </span>
              </div>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/[0.1] dark:bg-[#0B1A33]/95">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-white/[0.03]">
                <p className="font-poppins text-xs font-bold text-slate-800 dark:text-slate-100">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="truncate text-[11px] text-slate-400">{user?.email || ''}</p>
              </div>

              <div className="mt-1.5 space-y-1">
                {hasModuleAccess(user, 'settings') && (
                  <Link
                    to="/finance/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                  >
                    <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    System Settings
                  </Link>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
