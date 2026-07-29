import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { LayoutDashboard, Bell, Building2, GitBranch, Calendar, Warehouse, MapPin, Ruler, FolderTree, Tag, FileCode, Percent, Receipt, Package, Copy, Layers, PackageCheck, Box, Activity, ArrowRightLeft, FileText, AlertTriangle, Undo2, Scan, Image, Settings, DollarSign, Truck, FileEdit, FileSearch, ShoppingCart, BookOpen, Landmark, Scale, ChartLine, Sparkles, Lightbulb, TrendingUp, Play, Zap, Heart, CheckSquare, List, Lock, Users, ChevronRight, PanelRightClose, Star, Pin, PinOff, } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from './brand/Logo';
// ═══════════════════════════════════════════════════════════
// ENTERPRISE MODULES (grouped by domain)
// ═══════════════════════════════════════════════════════════
const sections = [
    {
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        items: [
            { label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
        ],
    },
    {
        label: 'Masters',
        icon: 'Building2',
        items: [
            {
                label: 'Organization', icon: 'Building2',
                children: [
                    { label: 'Companies', icon: 'Building2', path: '/companies' },
                    { label: 'Branches', icon: 'GitBranch', path: '/branches' },
                    { label: 'Financial Years', icon: 'Calendar', path: '/financial-years' },
                ],
            },
            {
                label: 'Locations', icon: 'MapPin',
                children: [
                    { label: 'Warehouses', icon: 'Warehouse', path: '/warehouses' },
                    { label: 'Locations', icon: 'MapPin', path: '/inventory/warehouse-locations' },
                ],
            },
            {
                label: 'Products Setup', icon: 'Tag',
                children: [
                    { label: 'Categories', icon: 'FolderTree', path: '/categories' },
                    { label: 'Sub Categories', icon: 'FolderTree', path: '/inventory/sub-categories' },
                    { label: 'Brands', icon: 'Tag', path: '/brands' },
                    { label: 'Units', icon: 'Ruler', path: '/units' },
                ],
            },
            {
                label: 'Tax & Compliance', icon: 'Percent',
                children: [
                    { label: 'HSN/SAC Codes', icon: 'FileCode', path: '/inventory/hsn-codes' },
                    { label: 'GST Rates', icon: 'Percent', path: '/gst-rates' },
                    { label: 'Tax Groups', icon: 'Receipt', path: '/tax-groups' },
                ],
            },
        ],
    },
    {
        label: 'Inventory',
        icon: 'Package',
        items: [
            {
                label: 'Products', icon: 'Package',
                children: [
                    { label: 'All Products', icon: 'Package', path: '/inventory/products' },
                    { label: 'Variants', icon: 'Copy', path: '/inventory/variants' },
                    { label: 'Batches', icon: 'Layers', path: '/inventory/batches' },
                    { label: 'Barcodes & QR', icon: 'Scan', path: '/inventory/barcodes' },
                    { label: 'Barcode Generation', icon: 'Scan', path: '/inventory/barcode-gen' },
                    { label: 'Images', icon: 'Image', path: '/inventory/images' },
                    { label: 'Pricing', icon: 'DollarSign', path: '/inventory/pricing' },
                ],
            },
            {
                label: 'Stock Operations', icon: 'PackageCheck',
                children: [
                    { label: 'Stock Entry', icon: 'PackageCheck', path: '/inventory/stock-entry' },
                    { label: 'Stock Opening', icon: 'Box', path: '/inventory/stock-opening' },
                    { label: 'Stock Adjustment', icon: 'Activity', path: '/inventory/stock-adjustment' },
                    { label: 'Stock Transfer', icon: 'ArrowRightLeft', path: '/inventory/create-transfer' },
                    { label: 'Stock Movements', icon: 'Activity', path: '/inventory/stock-movements' },
                    { label: 'Stock Ledger', icon: 'FileText', path: '/inventory/ledger' },
                ],
            },
            {
                label: 'Quality Control', icon: 'AlertTriangle',
                children: [
                    { label: 'Near Expiry', icon: 'AlertTriangle', path: '/inventory/near-expiry' },
                    { label: 'Damage Register', icon: 'AlertTriangle', path: '/inventory/damage-register' },
                    { label: 'Recall Register', icon: 'AlertTriangle', path: '/inventory/recall-register' },
                    { label: 'Distributor Returns', icon: 'Undo2', path: '/inventory/distributor-returns' },
                    { label: 'Replacement Queue', icon: 'Undo2', path: '/inventory/replacement-queue' },
                ],
            },
            {
                label: 'Reports & Dashboards', icon: 'ChartLine',
                children: [
                    { label: 'Warehouse Reports', icon: 'FileText', path: '/inventory/reports/warehouse' },
                    { label: 'Settings', icon: 'Settings', path: '/inventory/settings' },
                ],
            },
        ],
    },
    {
        label: 'Purchase',
        icon: 'Truck',
        items: [
            { label: 'Suppliers', icon: 'Truck', path: '/suppliers' },
            {
                label: 'Transactions', icon: 'FileText',
                children: [
                    { label: 'Requisitions', icon: 'FileEdit', path: '/purchase/requisitions' },
                    { label: 'Quotations', icon: 'FileSearch', path: '/purchase/quotations' },
                    { label: 'Purchase Orders', icon: 'FileText', path: '/purchase/orders' },
                    { label: 'Goods Receipt', icon: 'PackageCheck', path: '/purchase/grn' },
                ],
            },
            {
                label: 'Invoicing', icon: 'Receipt',
                children: [
                    { label: 'Purchase Invoice', icon: 'Receipt', path: '/purchase/invoices' },
                    { label: 'Purchase Returns', icon: 'Undo2', path: '/purchase/returns' },
                ],
            },
            { label: 'Reports', icon: 'ChartLine', path: '/purchase/reports/purchase-register' },
        ],
    },
    {
        label: 'Sales',
        icon: 'ShoppingCart',
        items: [
            { label: 'Customers', icon: 'Users', path: '/customers' },
            {
                label: 'Transactions', icon: 'ShoppingCart',
                children: [
                    { label: 'Quotations', icon: 'FileSearch', path: '/sales/quotations' },
                    { label: 'Sales Orders', icon: 'ShoppingCart', path: '/sales/orders' },
                    { label: 'Delivery Challan', icon: 'Truck', path: '/sales/delivery-challans' },
                ],
            },
            {
                label: 'Invoicing', icon: 'Receipt',
                children: [
                    { label: 'Sales Invoice', icon: 'Receipt', path: '/sales/invoices' },
                    { label: 'Sales Returns', icon: 'Undo2', path: '/sales/returns' },
                ],
            },
            { label: 'Payments', icon: 'DollarSign', path: '/sales/customer-prices' },
        ],
    },
    {
        label: 'Finance',
        icon: 'Landmark',
        items: [
            {
                label: 'Accounts Setup', icon: 'FolderTree',
                children: [
                    { label: 'Chart of Accounts', icon: 'FolderTree', path: '/finance/chart-of-accounts' },
                    { label: 'Ledgers', icon: 'BookOpen', path: '/finance/ledgers' },
                    { label: 'Cost Centres', icon: 'GitBranch', path: '/finance/cost-centers' },
                ],
            },
            {
                label: 'Transactions', icon: 'FileEdit',
                children: [
                    { label: 'Journal Entries', icon: 'FileEdit', path: '/finance/journal-entries' },
                ],
            },
            {
                label: 'Books', icon: 'BookOpen',
                children: [
                    { label: 'Cash Book', icon: 'DollarSign', path: '/finance/cash-book' },
                    { label: 'Bank Book', icon: 'Landmark', path: '/finance/bank-book' },
                ],
            },
            { label: 'Reports', icon: 'ChartLine', path: '/gl/trial-balance' },
        ],
    },
    {
        label: 'GST',
        icon: 'Receipt',
        items: [
            { label: 'Registrations', icon: 'Receipt', path: '/gst/registrations' },
            { label: 'Returns', icon: 'FileText', path: '/gst/returns' },
            { label: 'Tax Posting', icon: 'DollarSign', path: '/gst/tax-postings' },
        ],
    },
    {
        label: 'Reports',
        icon: 'ChartLine',
        items: [
            { label: 'Purchase Reports', icon: 'ChartLine', path: '/purchase/reports/purchase-register' },
            { label: 'Inventory Reports', icon: 'ChartLine', path: '/inventory/reports/summary' },
            { label: 'Finance Reports', icon: 'ChartLine', path: '/gl/trial-balance' },
        ],
    },
    {
        label: 'Administration',
        icon: 'Settings',
        items: [
            {
                label: 'Access Control', icon: 'Lock',
                children: [
                    { label: 'Users', icon: 'Users', path: '/executive/admin' },
                    { label: 'Roles', icon: 'Lock', path: '/executive/operations' },
                    { label: 'Permissions', icon: 'CheckSquare', path: '/workflow/approvals' },
                ],
            },
            { label: 'Settings', icon: 'Settings', path: '/finance/settings' },
        ],
    },
];
// ═══════════════════════════════════════════════════════════
// ICON MAP — consistent strokeWidth={1.5}
// ═══════════════════════════════════════════════════════════
const iconMap = {
    LayoutDashboard, Bell, Building2, GitBranch, Calendar, Warehouse, MapPin,
    Ruler, FolderTree, Tag, FileCode, Percent, Receipt, Package, Copy, Layers,
    PackageCheck, Box, Activity, ArrowRightLeft, FileText, AlertTriangle, Undo2,
    Scan, Image, Settings, DollarSign, Truck, FileEdit, FileSearch, ShoppingCart,
    BookOpen, Landmark, Scale, ChartLine, Sparkles, Lightbulb, TrendingUp,
    Play, Zap, Heart, CheckSquare, List, Lock, Users,
};
// ═══════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════
const FAVORITES_KEY = 'shranix_sidebar_favorites';
function loadFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    }
    catch {
        return [];
    }
}
function saveFavorites(favs) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}
// ═══════════════════════════════════════════════════════════
// SUB-NAV GROUP — second-level accordion
// ═══════════════════════════════════════════════════════════
function SubNavGroup({ item, collapsed, locationPath, onNavigate, }) {
    const [isOpen, setIsOpen] = useState(false);
    // Auto-open if any child is active
    const isActive = useMemo(() => item.children?.some((child) => child.path === locationPath) ?? false, [item.children, locationPath]);
    useEffect(() => {
        if (isActive)
            setIsOpen(true);
    }, [isActive]);
    if (collapsed) {
        return (_jsx("div", { className: "space-y-0.5", children: item.children?.map((child) => (_jsx(NavItemLink, { item: child, collapsed: true, onNavigate: onNavigate }, child.path))) }));
    }
    return (_jsxs("div", { className: "mb-0.5", children: [_jsxs("button", { onClick: () => setIsOpen((prev) => !prev), className: cn('flex w-full items-center gap-2 rounded-lg transition-all duration-150', 'h-7 px-2.5 text-[11px] font-medium', isOpen || isActive
                    ? 'text-blue-300/80'
                    : 'text-slate-400/70 hover:text-slate-300 hover:bg-white/[0.04]'), children: [_jsx(ChevronRight, { className: cn('h-2.5 w-2.5 shrink-0 transition-transform duration-200', isOpen && 'rotate-90'), strokeWidth: 2 }), _jsx("span", { className: "truncate", children: item.label }), _jsx("span", { className: "ml-auto text-[9px] font-normal text-slate-500/40 tabular-nums", children: item.children?.length })] }), _jsx("div", { className: cn('overflow-hidden transition-all duration-200 ease-out', isOpen ? 'max-h-[50vh]' : 'max-h-0'), children: _jsx("div", { className: "ml-2 space-y-0.5 border-l border-white/[0.06] pb-0.5 pl-2 pt-0.5", children: item.children?.map((child) => (_jsx(NavItemLink, { item: child, collapsed: false, showPin: true, onNavigate: onNavigate }, child.path))) }) })] }));
}
// ═══════════════════════════════════════════════════════════
// NAV ITEM LINK — compact row height 36px
// ═══════════════════════════════════════════════════════════
function NavItemLink({ item, collapsed, showPin, isPinned, onTogglePin, onNavigate, }) {
    const Icon = iconMap[item.icon] || LayoutDashboard;
    // Group headers without a path aren't rendered as links
    if (!item.path)
        return null;
    return (_jsxs(NavLink, { to: item.path, end: item.path === '/', onClick: onNavigate, title: collapsed ? item.label : undefined, className: ({ isActive }) => cn('group flex items-center rounded-lg transition-all duration-150', collapsed ? 'justify-center w-10 h-9 mx-auto' : 'w-full h-9 px-2.5 gap-2.5', isActive
            ? 'bg-blue-500/15 text-blue-300 font-medium shadow-sm shadow-blue-500/5'
            : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'), children: [_jsx("span", { className: "flex shrink-0 items-center justify-center w-5 h-5", children: _jsx(Icon, { className: "w-[18px] h-[18px]", strokeWidth: 1.5 }) }), !collapsed && (_jsxs(_Fragment, { children: [_jsx("span", { className: "truncate text-xs leading-tight", children: item.label }), showPin && onTogglePin && (_jsx("button", { onClick: (e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(e); }, className: "ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", title: isPinned ? 'Remove from favorites' : 'Add to favorites', children: isPinned ? (_jsx(PinOff, { className: "w-3 h-3 text-amber-400", strokeWidth: 1.5 })) : (_jsx(Pin, { className: "w-3 h-3 text-slate-500", strokeWidth: 1.5 })) }))] }))] }));
}
// ═══════════════════════════════════════════════════════════
// CATEGORY SECTION — accordion, independent scroll, counter
// ═══════════════════════════════════════════════════════════
// ── Flatten items with children for matched path detection ──
function flattenItems(items) {
    const result = [];
    for (const item of items) {
        if (item.children) {
            result.push(...item.children);
        }
        else if (item.path) {
            result.push(item);
        }
    }
    return result;
}
function NavSection({ section, isOpen, onToggle, collapsed, filteredQuery, onNavigate, locationPath, }) {
    const itemsRef = useRef(null);
    const [scrollHeight, setScrollHeight] = useState(0);
    useEffect(() => {
        if (itemsRef.current) {
            setScrollHeight(itemsRef.current.scrollHeight);
        }
    }, [section.items.length]);
    // ── Helper: check if any item (or its children) matches a query ──
    const itemMatchesQuery = useMemo(() => {
        return (item, q) => item.label.toLowerCase().includes(q) ||
            (item.path && item.path.toLowerCase().includes(q)) ||
            (item.children && item.children.some((c) => c.label.toLowerCase().includes(q) || (c.path && c.path.toLowerCase().includes(q))));
    }, []);
    // Determine if this section matches the search filter
    const matchesFilter = useMemo(() => {
        if (!filteredQuery)
            return true;
        const q = filteredQuery.toLowerCase();
        return section.items.some((i) => itemMatchesQuery(i, q));
    }, [filteredQuery, section, itemMatchesQuery]);
    // ── Collapsed mode: show all flattened matching items as icons ──
    if (collapsed) {
        if (!matchesFilter)
            return null;
        const allItems = flattenItems(section.items);
        const filtered = filteredQuery
            ? allItems.filter((i) => {
                const q = filteredQuery.toLowerCase();
                return i.label.toLowerCase().includes(q) ||
                    (i.path && i.path.toLowerCase().includes(q));
            })
            : allItems;
        return (_jsx("div", { className: "space-y-0.5", children: filtered.map((item) => (_jsx(NavItemLink, { item: item, collapsed: true, onNavigate: onNavigate }, item.path || item.label))) }));
    }
    // ── Filter items when searching ──
    const displayItems = useMemo(() => {
        if (!filteredQuery)
            return section.items;
        const q = filteredQuery.toLowerCase();
        return section.items.filter((i) => itemMatchesQuery(i, q)).map((i) => {
            // If a group's children partially match, show the group with only matching children
            if (i.children) {
                const matchingChildren = i.children.filter((c) => c.label.toLowerCase().includes(q) ||
                    (c.path && c.path.toLowerCase().includes(q)));
                return { ...i, children: matchingChildren };
            }
            return i;
        });
    }, [filteredQuery, section.items, itemMatchesQuery]);
    if (displayItems.length === 0)
        return null;
    // Count total leaf items
    const totalLeafCount = useMemo(() => flattenItems(displayItems).length, [displayItems]);
    return (_jsxs("div", { className: "mb-0.5", children: [_jsxs("button", { onClick: onToggle, className: cn('flex w-full items-center gap-2 rounded-lg transition-all duration-150', 'h-8 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em]', isOpen
                    ? 'text-blue-400/80 bg-blue-500/8'
                    : 'text-slate-500/60 hover:text-slate-400 hover:bg-white/[0.04]'), children: [_jsx(ChevronRight, { className: cn('h-3 w-3 shrink-0 transition-transform duration-200', isOpen && 'rotate-90'), strokeWidth: 2 }), _jsx("span", { className: "truncate", children: section.label }), _jsx("span", { className: "ml-auto text-[9px] font-normal text-slate-500/40 tabular-nums", children: totalLeafCount })] }), _jsx("div", { className: cn('overflow-hidden transition-all duration-200 ease-out', isOpen ? 'max-h-[70vh]' : 'max-h-0'), style: isOpen ? { maxHeight: `${Math.min(scrollHeight + 8, 500)}px` } : undefined, children: _jsx("div", { ref: itemsRef, className: cn('space-y-0.5 ml-1 pl-1.5 border-l border-white/[0.06]', itemsRef.current && itemsRef.current.scrollHeight > 300
                        ? 'overflow-y-auto max-h-[300px]'
                        : ''), children: displayItems.map((item) => item.children ? (_jsx(SubNavGroup, { item: item, collapsed: false, locationPath: locationPath, onNavigate: onNavigate }, item.label)) : (_jsx(NavItemLink, { item: item, collapsed: false, showPin: true, onNavigate: onNavigate }, item.path || item.label))) }) })] }));
}
// ═══════════════════════════════════════════════════════════
// HOVER EXPAND OVERLAY (collapsed mode)
// ═══════════════════════════════════════════════════════════
function HoverExpandPanel({ children, visible, onClose, }) {
    const panelRef = useRef(null);
    useEffect(() => {
        if (!visible)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);
    if (!visible)
        return null;
    return (_jsx("div", { ref: panelRef, className: "fixed left-14 top-0 z-50 h-full w-60 rounded-r-xl border-r border-white/[0.06] sidebar-navy-hover shadow-2xl shadow-black/50 animate-in slide-in-from-left-1 fade-in duration-200", children: _jsx("div", { className: "h-full overflow-y-auto px-3 py-4 sidebar-scrollbar", children: children }) }));
}
// ═══════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════
export function Sidebar({ collapsed, onToggle, onClose }) {
    const location = useLocation();
    const [favorites, setFavorites] = useState(loadFavorites);
    const [activeSection, setActiveSection] = useState(null);
    const [hoverExpanded, setHoverExpanded] = useState(false);
    const sidebarRef = useRef(null);
    // ── Close on Escape key (mobile drawer) ──
    useEffect(() => {
        if (!onClose)
            return;
        const handleKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);
    // ── Derive which section the current path belongs to ──
    const currentSectionLabel = useMemo(() => {
        for (const section of sections) {
            const allLeafItems = flattenItems(section.items);
            if (allLeafItems.some((i) => i.path === location.pathname)) {
                return section.label;
            }
        }
        return null;
    }, [location.pathname]);
    // ── Auto-open the section containing current page ──
    useEffect(() => {
        if (currentSectionLabel) {
            setActiveSection(currentSectionLabel);
        }
    }, [currentSectionLabel]);
    // ── Persist to localStorage ──
    useEffect(() => { saveFavorites(favorites); }, [favorites]);
    // ── Flatten all items (including submenu children) ──
    const allItems = useMemo(() => sections.flatMap((s) => flattenItems(s.items)), []);
    // ── Favorite items data ──
    const favoriteItems = useMemo(() => allItems.filter((i) => i.path && favorites.includes(i.path)), [allItems, favorites]);
    // ── Accordion toggle: only one section at a time ──
    const toggleSection = useCallback((label) => {
        setActiveSection((prev) => (prev === label ? null : label));
    }, []);
    // ── Collapsed hover expand ──
    const handleMouseEnter = useCallback(() => {
        if (collapsed)
            setHoverExpanded(true);
    }, [collapsed]);
    const handleMouseLeave = useCallback(() => {
        if (collapsed)
            setHoverExpanded(false);
    }, [collapsed]);
    return (_jsxs(_Fragment, { children: [onClose && (_jsx("div", { className: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200", onClick: onClose, "aria-hidden": "true" })), _jsxs("aside", { ref: sidebarRef, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, className: cn('relative flex flex-col sidebar-navy text-white', 'transition-all duration-200 ease-in-out shrink-0', collapsed ? 'w-14' : 'w-60', onClose && [
                    'fixed left-0 top-0 z-50 h-full shadow-2xl shadow-black/50',
                    'animate-in slide-in-from-left-1/2 fade-in duration-200',
                ]), role: onClose ? 'dialog' : undefined, "aria-modal": onClose ? true : undefined, "aria-label": onClose ? 'Navigation menu' : undefined, children: [_jsx("div", { className: "pointer-events-none absolute -top-20 -right-20 h-48 w-48 bg-blue-600/[0.10] blur-3xl rounded-full" }), _jsx("div", { className: "pointer-events-none absolute -bottom-20 -left-20 h-36 w-36 bg-blue-500/[0.05] blur-3xl rounded-full" }), _jsx("div", { className: cn('relative z-10 flex shrink-0 items-center border-b border-white/[0.06]', collapsed ? 'h-20 justify-center' : 'h-20 gap-4 px-4'), children: _jsx(Logo, { variant: collapsed ? 'icon-only' : 'compact' }) }), _jsxs("nav", { className: "relative z-10 flex-1 overflow-y-auto px-2 pt-10 pb-2 sidebar-scrollbar", children: [!collapsed && favoriteItems.length > 0 && (_jsxs("div", { className: "mb-1", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-amber-400/50", children: [_jsx(Star, { className: "w-2.5 h-2.5", strokeWidth: 1.5 }), "Favorites"] }), _jsx("div", { className: "space-y-0.5", children: favoriteItems.map((item) => (_jsx(NavItemLink, { item: item, collapsed: false, onNavigate: onClose }, item.path))) }), _jsx("div", { className: "my-1 mx-2.5 border-t border-white/[0.04]" })] })), _jsx("div", { className: "space-y-0.5", children: sections.map((section) => (_jsx(NavSection, { section: section, isOpen: activeSection === section.label, onToggle: () => toggleSection(section.label), collapsed: false, filteredQuery: "", locationPath: location.pathname, onNavigate: onClose }, section.label))) })] }), _jsxs("div", { className: "relative z-10 flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-gradient-to-t from-sidebar-gradient-from/90 to-transparent px-2.5 py-2", children: [!collapsed && (_jsx("span", { className: "text-[9px] font-medium text-slate-600", children: "v2.0" })), _jsx("button", { onClick: onToggle, className: cn('flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-white/10 hover:text-white', collapsed && 'mx-auto'), title: collapsed ? 'Expand sidebar' : 'Collapse sidebar', children: collapsed ? (_jsx(ChevronRight, { className: "h-3.5 w-3.5", strokeWidth: 1.5 })) : (_jsx(PanelRightClose, { className: "h-3 w-3", strokeWidth: 1.5 })) })] })] }), _jsxs(HoverExpandPanel, { visible: collapsed && hoverExpanded, onClose: () => setHoverExpanded(false), children: [favoriteItems.length > 0 && (_jsxs("div", { className: "mb-1", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-amber-400/50", children: [_jsx(Star, { className: "w-2.5 h-2.5", strokeWidth: 1.5 }), "Favorites"] }), _jsx("div", { className: "space-y-0.5", children: favoriteItems.map((item) => (_jsx(NavItemLink, { item: item, collapsed: false }, item.path))) }), _jsx("div", { className: "my-1 mx-2.5 border-t border-white/[0.04]" })] })), sections.map((section) => (_jsxs("div", { className: "mb-0.5", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500/60", children: [section.label, _jsx("span", { className: "ml-auto text-[8px] text-slate-600", children: flattenItems(section.items).length })] }), _jsx("div", { className: "space-y-0.5", children: section.items.map((item) => item.children ? (_jsx(SubNavGroup, { item: item, collapsed: false, locationPath: location.pathname, onNavigate: () => setHoverExpanded(false) }, item.label)) : (_jsx(NavItemLink, { item: item, collapsed: false, showPin: true, isPinned: item.path ? favorites.includes(item.path) : false, onTogglePin: item.path ? () => {
                                        setFavorites((prev) => prev.includes(item.path)
                                            ? prev.filter((p) => p !== item.path)
                                            : [...prev, item.path]);
                                    } : undefined, onNavigate: () => setHoverExpanded(false) }, item.path || item.label))) })] }, section.label)))] })] }));
}
//# sourceMappingURL=sidebar.js.map