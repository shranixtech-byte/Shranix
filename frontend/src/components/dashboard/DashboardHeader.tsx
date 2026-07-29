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
  Building2,
  ChevronDown,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/providers/theme-provider';

interface BreadcrumbMap {
  [key: string]: string;
}

const breadcrumbLabels: BreadcrumbMap = {
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
  'opening-balance-transfers': 'Opening Balance Transfers',
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

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('SHRANIX Technologies');
  const [selectedFY, setSelectedFY] = useState('2026-2027');
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
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

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Breadcrumb */}
      <nav className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex" aria-label="Breadcrumb">
        <Link to="/" className="transition-colors hover:text-foreground">
          <Home className="h-4 w-4" />
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {index === breadcrumbs.length - 1 ? (
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
      <div className="hidden items-center gap-2 lg:flex">
        <div className="relative">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="h-8 appearance-none rounded-lg border bg-muted/50 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus:border-primary focus:bg-background"
          >
            <option value="SHRANIX Technologies">SHRANIX Technologies</option>
            <option value="SHRANIX Agri">SHRANIX Agri</option>
            <option value="SHRANix Exports">SHRANIX Exports</option>
          </select>
          <Building2 className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Financial Year Selector */}
      <div className="hidden items-center gap-2 lg:flex">
        <div className="relative">
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="h-8 appearance-none rounded-lg border bg-muted/50 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus:border-primary focus:bg-background"
          >
            <option value="2026-2027">FY 2026-27</option>
            <option value="2025-2026">FY 2025-26</option>
            <option value="2024-2025">FY 2024-25</option>
          </select>
          <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Current Date */}
      <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
        <Calendar className="h-4 w-4" />
        <span className="text-xs">
          {currentTime.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Global Search */}
      <div className="relative">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="h-9 w-56 rounded-lg border bg-muted/50 pl-9 pr-4 text-sm outline-none transition-all focus:w-72 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary lg:w-64"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      {/* Notifications */}
      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
      </button>

      {/* User Profile */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {userInitials}
          </div>
          <div className="hidden text-left lg:block">
            <p className="text-sm font-medium leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">{user?.role || 'Loading...'}</p>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground lg:block" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
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
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
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
