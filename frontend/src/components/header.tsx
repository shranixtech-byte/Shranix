import {
  Calendar,
  Search,
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
  FileText,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
  const { user, isLoading, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
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

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, navigate],
  );

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
    : 'U';

  const pageTitle =
    breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Dashboard';

  return (
    <header className="border-border/60 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-5 border-b bg-white px-5 shadow-sm lg:px-7 dark:bg-slate-900 dark:shadow-white/5">
      {/* Sidebar Toggle + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="hidden md:block">
          <h1 className="text-foreground text-sm font-semibold">{pageTitle}</h1>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav
        className="text-muted-foreground hidden items-center gap-1 text-xs lg:flex"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs.slice(1).map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {index === breadcrumbs.slice(1).length - 1 ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Company Selector */}
      <div className="relative hidden lg:block" ref={companyRef}>
        <button
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="max-w-[100px] truncate">Default Co.</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showCompanyDropdown && (
          <div className="bg-popover absolute right-0 top-full mt-1.5 w-44 rounded-xl border p-1.5 shadow-xl">
            <p className="text-muted-foreground px-2.5 py-1.5 text-[11px] font-medium">Companies</p>
            <div className="bg-muted/50 text-muted-foreground rounded-lg px-2.5 py-2 text-xs">
              <p className="text-foreground font-medium">Default Company</p>
              <p className="text-[10px]">Connected</p>
            </div>
          </div>
        )}
      </div>

      {/* Financial Year Selector */}
      <div className="relative hidden lg:block" ref={fyRef}>
        <button
          onClick={() => setShowFyDropdown(!showFyDropdown)}
          className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>FY 2025-26</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showFyDropdown && (
          <div className="bg-popover absolute right-0 top-full mt-1.5 w-44 rounded-xl border p-1.5 shadow-xl">
            <p className="text-muted-foreground px-2.5 py-1.5 text-[11px] font-medium">
              Financial Years
            </p>
            <div className="space-y-0.5">
              {['2025-2026', '2024-2025', '2023-2024'].map((fy) => (
                <button
                  key={fy}
                  className={`hover:bg-muted w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    fy === '2025-2026' ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  FY {fy}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Clock */}
      <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {currentTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Current Date */}
      <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {currentTime.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors lg:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <form
          onSubmit={handleSearch}
          className={`${
            showSearch ? 'absolute right-0 top-full mt-2 flex' : 'hidden'
          } lg:relative lg:mt-0 lg:flex`}
        >
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-muted/50 focus:border-primary/50 focus:bg-background h-8 w-48 rounded-lg border pl-8 pr-3 text-xs outline-none transition-all focus:w-56 lg:w-52"
            />
            <kbd className="bg-background text-muted-foreground absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border px-1 py-0.5 text-[9px] font-medium lg:inline">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Notifications Dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="bg-destructive ring-background absolute right-2 top-1.5 h-2 w-2 rounded-full ring-2" />
          )}
        </button>

        {showNotifDropdown && (
          <div className="bg-popover absolute right-0 top-full mt-1.5 w-80 rounded-xl border shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {unreadCount} new
                  </span>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={() => void handleMarkAllRead()}
                    className="text-primary hover:text-primary/80 text-[10px] font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <FileText className="text-muted-foreground mx-auto h-5 w-5" />
                  <p className="text-muted-foreground mt-1 text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => void handleMarkRead(n.id)}
                    className={`hover:bg-muted/60 flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors ${
                      n.isRead ? 'opacity-70' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{n.title}</p>
                      {!n.isRead && (
                        <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-[11px]">{n.message}</p>
                    <p className="text-muted-foreground/70 mt-0.5 text-[10px]">
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
            <div className="border-t p-2">
              <Link
                to="/communications/center"
                onClick={() => setShowNotifDropdown(false)}
                className="text-primary hover:bg-primary/5 flex items-center justify-center rounded-lg py-2 text-xs font-medium transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="hover:bg-muted flex items-center gap-2 rounded-lg p-1 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-[11px] font-semibold text-white shadow-sm">
            {userInitials}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-medium leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            {isLoading ? (
              <span className="bg-muted-foreground/20 inline-block h-2.5 w-16 animate-pulse rounded" />
            ) : (
              <p className="text-muted-foreground text-[10px] capitalize leading-tight">
                {user?.role || 'User'}
              </p>
            )}
          </div>
          <ChevronDown className="text-muted-foreground hidden h-3 w-3 md:block" />
        </button>

        {showUserMenu && (
          <div className="border-border/80 absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-white p-1.5 shadow-xl dark:bg-slate-900 dark:shadow-black/40">
            <div className="border-border/50 border-b px-2.5 py-2">
              <p className="text-foreground text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="text-muted-foreground text-xs">{user?.email || ''}</p>
            </div>
            <div className="mt-1 space-y-0.5">
              {hasModuleAccess(user, 'settings') && (
                <Link
                  to="/finance/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="text-foreground hover:bg-muted flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              )}
              <button
                onClick={() => {
                  // Menu turant band karo + logout — bina menu band kiye user
                  // 'click karne ke baad waisa hi rehta hai' mehsoos karta hai
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/60"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
