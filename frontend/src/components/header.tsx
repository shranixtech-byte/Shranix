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
import { useTheme } from '@/providers/theme-provider';

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
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showFyDropdown, setShowFyDropdown] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const fyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
    label: breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    path: `/${  pathSegments.slice(0, index + 1).join('/')}`,
  }));

  if (location.pathname === '/') {
    breadcrumbs.unshift({ label: 'Dashboard', path: '/' });
  }

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
    : 'U';

  const pageTitle = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-5 border-b border-border/60 bg-white px-5 shadow-sm dark:bg-slate-900 dark:shadow-white/5 lg:px-7">
      {/* Sidebar Toggle + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="hidden md:block">
          <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-foreground">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {breadcrumbs.slice(1).map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {index === breadcrumbs.slice(1).length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="transition-colors hover:text-foreground">
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
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span className="max-w-[100px] truncate">Default Co.</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showCompanyDropdown && (
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border bg-popover p-1.5 shadow-xl">
            <p className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">Companies</p>
            <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Default Company</p>
              <p className="text-[10px]">Connected</p>
            </div>
          </div>
        )}
      </div>

      {/* Financial Year Selector */}
      <div className="relative hidden lg:block" ref={fyRef}>
        <button
          onClick={() => setShowFyDropdown(!showFyDropdown)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>FY 2025-26</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {showFyDropdown && (
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border bg-popover p-1.5 shadow-xl">
            <p className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">Financial Years</p>
            <div className="space-y-0.5">
              {['2025-2026', '2024-2025', '2023-2024'].map((fy) => (
                <button
                  key={fy}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted ${
                    fy === '2025-2026' ? 'bg-primary/5 font-medium text-primary' : 'text-foreground'
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
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {currentTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Current Date */}
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <form
          onSubmit={handleSearch}
          className={`${
            showSearch ? 'absolute right-0 top-full mt-2 flex' : 'hidden'
          } lg:relative lg:flex lg:mt-0`}
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 w-48 rounded-lg border bg-muted/50 pl-8 pr-3 text-xs outline-none transition-all focus:w-56 focus:border-primary/50 focus:bg-background lg:w-52"
            />
            <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1 py-0.5 text-[9px] font-medium text-muted-foreground lg:inline">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      {/* Notifications Dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>

        {showNotifDropdown && (
          <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">3 new</span>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {/* Sample notifications — real data renders via the widget */}
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <FileText className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">View all notifications in the dashboard widget</p>
              </div>
            </div>
            <div className="border-t p-2">
              <Link
                to="/"
                className="flex items-center justify-center rounded-lg py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
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
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-[11px] font-semibold text-white shadow-sm">
            {userInitials}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-medium leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            {isLoading ? (
              <span className="inline-block h-2.5 w-16 animate-pulse rounded bg-muted-foreground/20" />
            ) : (
              <p className="text-[10px] leading-tight text-muted-foreground capitalize">{user?.role || 'User'}</p>
            )}
          </div>
          <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border bg-popover p-1.5 shadow-xl">
            <div className="border-b px-2.5 py-2">
              <p className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            </div>
            <div className="mt-1 space-y-0.5">
              <Link
                to="/settings"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
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
