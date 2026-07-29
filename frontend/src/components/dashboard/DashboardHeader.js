import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Calendar, Search, Bell, Moon, Sun, ChevronRight, Home, LogOut, Settings, Building2, ChevronDown, } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/providers/theme-provider';
const breadcrumbLabels = {
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
    const userMenuRef = useRef(null);
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        function handleClickOutside(event) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = pathSegments.map((segment, index) => ({
        label: breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        path: `/${pathSegments.slice(0, index + 1).join('/')}`,
    }));
    if (location.pathname === '/') {
        breadcrumbs.unshift({ label: 'Dashboard', path: '/' });
    }
    const handleSearch = useCallback((e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    }, [searchQuery, navigate]);
    const userInitials = user
        ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
        : 'U';
    return (_jsxs("header", { className: "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6", children: [_jsxs("nav", { className: "hidden items-center gap-1.5 text-sm text-muted-foreground md:flex", "aria-label": "Breadcrumb", children: [_jsx(Link, { to: "/", className: "transition-colors hover:text-foreground", children: _jsx(Home, { className: "h-4 w-4" }) }), breadcrumbs.map((crumb, index) => (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(ChevronRight, { className: "h-3.5 w-3.5" }), index === breadcrumbs.length - 1 ? (_jsx("span", { className: "font-medium text-foreground", children: crumb.label })) : (_jsx(Link, { to: crumb.path, className: "transition-colors hover:text-foreground", children: crumb.label }))] }, crumb.path)))] }), _jsx("div", { className: "flex-1" }), _jsx("div", { className: "hidden items-center gap-2 lg:flex", children: _jsxs("div", { className: "relative", children: [_jsxs("select", { value: selectedCompany, onChange: (e) => setSelectedCompany(e.target.value), className: "h-8 appearance-none rounded-lg border bg-muted/50 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus:border-primary focus:bg-background", children: [_jsx("option", { value: "SHRANIX Technologies", children: "SHRANIX Technologies" }), _jsx("option", { value: "SHRANIX Agri", children: "SHRANIX Agri" }), _jsx("option", { value: "SHRANix Exports", children: "SHRANIX Exports" })] }), _jsx(Building2, { className: "pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" })] }) }), _jsx("div", { className: "hidden items-center gap-2 lg:flex", children: _jsxs("div", { className: "relative", children: [_jsxs("select", { value: selectedFY, onChange: (e) => setSelectedFY(e.target.value), className: "h-8 appearance-none rounded-lg border bg-muted/50 pl-2.5 pr-7 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus:border-primary focus:bg-background", children: [_jsx("option", { value: "2026-2027", children: "FY 2026-27" }), _jsx("option", { value: "2025-2026", children: "FY 2025-26" }), _jsx("option", { value: "2024-2025", children: "FY 2024-25" })] }), _jsx(Calendar, { className: "pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" })] }) }), _jsxs("div", { className: "hidden items-center gap-2 text-sm text-muted-foreground lg:flex", children: [_jsx(Calendar, { className: "h-4 w-4" }), _jsx("span", { className: "text-xs", children: currentTime.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }) })] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowSearch(!showSearch), className: "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden", "aria-label": "Search", children: _jsx(Search, { className: "h-4 w-4" }) }), _jsx("form", { onSubmit: handleSearch, className: `${showSearch ? 'absolute right-0 top-full mt-2 flex' : 'hidden'} lg:relative lg:flex lg:mt-0`, children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search anything...", className: "h-9 w-56 rounded-lg border bg-muted/50 pl-9 pr-4 text-sm outline-none transition-all focus:w-72 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary lg:w-64" }), _jsx("kbd", { className: "absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline", children: "\u2318K" })] }) })] }), _jsx("button", { onClick: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), className: "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", "aria-label": `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`, children: resolvedTheme === 'dark' ? (_jsx(Sun, { className: "h-4 w-4" })) : (_jsx(Moon, { className: "h-4 w-4" })) }), _jsxs("button", { className: "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", "aria-label": "Notifications", children: [_jsx(Bell, { className: "h-4 w-4" }), _jsx("span", { className: "absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" })] }), _jsxs("div", { className: "relative", ref: userMenuRef, children: [_jsxs("button", { onClick: () => setShowUserMenu(!showUserMenu), className: "flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground", children: userInitials }), _jsxs("div", { className: "hidden text-left lg:block", children: [_jsx("p", { className: "text-sm font-medium leading-tight", children: user ? `${user.firstName} ${user.lastName}` : 'User' }), _jsx("p", { className: "text-[11px] leading-tight text-muted-foreground", children: user?.role || 'Loading...' })] }), _jsx(ChevronDown, { className: "hidden h-3.5 w-3.5 text-muted-foreground lg:block" })] }), showUserMenu && (_jsxs("div", { className: "absolute right-0 top-full mt-1 w-56 rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1", children: [_jsxs("div", { className: "border-b px-2.5 py-2", children: [_jsx("p", { className: "text-sm font-medium", children: user ? `${user.firstName} ${user.lastName}` : 'User' }), _jsx("p", { className: "text-xs text-muted-foreground", children: user?.email || '' })] }), _jsxs("div", { className: "mt-1 space-y-0.5", children: [_jsxs(Link, { to: "/settings", className: "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted", children: [_jsx(Settings, { className: "h-4 w-4" }), "Settings"] }), _jsxs("button", { onClick: logout, className: "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10", children: [_jsx(LogOut, { className: "h-4 w-4" }), "Sign Out"] })] })] }))] })] }));
}
//# sourceMappingURL=DashboardHeader.js.map