import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Truck,
  Boxes,
  Wallet,
  BarChart3,
  BookOpen,
  MessageSquare,
  Gift,
  Settings,
  Headset,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  Star,
  FileText,
  ListTodo,
  Scan,
  Warehouse,
  ClipboardList,
  ArrowRightLeft,
  Activity,
  FileSpreadsheet,
  DollarSign,
  Undo2,
  FileEdit,
  FileSearch,
  Wrench,
  ShieldAlert,
  Tag,
  Search,
  Globe,
  CreditCard,
  Ticket,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { hasModuleAccess } from '@/lib/module-access';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  children?: NavItem[];
}

interface SectionGroup {
  label: string;
  icon: string;
  module: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════
// ENTERPRISE MODULES — Premium ERP Menu Structure (मराठी)
// ═══════════════════════════════════════════════════════════

const sections: SectionGroup[] = [
  {
    label: 'डॅशबोर्ड',
    icon: 'LayoutDashboard',
    module: 'dashboard',
    items: [{ label: 'डॅशबोर्ड', icon: 'LayoutDashboard', path: '/' }],
  },
  {
    label: 'विक्री',
    icon: 'ShoppingCart',
    module: 'sales',
    items: [
      {
        label: 'बिलिंग',
        icon: 'FileText',
        children: [
          { label: 'विक्री बीजक', icon: 'Receipt', path: '/sales/invoices/create' },
          { label: 'कोटेशन', icon: 'FileSearch', path: '/sales/quotations' },
          { label: 'कोटेशन डॅशबोर्ड', icon: 'BarChart3', path: '/sales/quotations/dashboard' },
        ],
      },
      { label: 'विक्री ऑर्डर', icon: 'ShoppingCart', path: '/sales/orders' },
      { label: 'विक्री परत', icon: 'Undo2', path: '/sales/returns' },
      { label: 'वितरण चलान', icon: 'Truck', path: '/sales/delivery-challans' },
      { label: 'क्रेडिट नोट', icon: 'FileEdit', path: '/sales/returns/credit-notes' },
      { label: 'पेमेंट कलेक्शन', icon: 'Wallet', path: '/sales/payments' },
      { label: 'कस्टमर लेजर', icon: 'BookOpen', path: '/sales/customer-ledger' },
    ],
  },
  {
    label: 'खरेदी',
    icon: 'Receipt',
    module: 'purchase',
    items: [
      { label: 'खरेदी नोंद', icon: 'FileEdit', path: '/purchase/invoices' },
      { label: 'खरेदी ऑर्डर', icon: 'FileText', path: '/purchase/orders' },
      { label: 'खरेदी परत', icon: 'Undo2', path: '/purchase/returns' },
      { label: 'पेमेंट (देयके)', icon: 'Wallet', path: '/purchase/payments' },
      { label: 'डेबिट नोट', icon: 'FileSpreadsheet', path: '/sales/returns/debit-notes' },
    ],
  },
  {
    label: 'स्टॉक',
    icon: 'Package',
    module: 'stock',
    items: [
      { label: 'वस्तू मास्टर', icon: 'Package', path: '/inventory/products' },
      { label: 'बॅच आणि लॉट', icon: 'ListTodo', path: '/inventory/batches' },
      { label: 'अनुक्रमांक', icon: 'Scan', path: '/inventory/serials' },
      { label: 'गोदाम', icon: 'Warehouse', path: '/warehouses' },
      { label: 'स्टॉक लेजर', icon: 'ClipboardList', path: '/inventory/ledger' },
      { label: 'स्टॉक हस्तांतरण', icon: 'ArrowRightLeft', path: '/inventory/create-transfer' },
      { label: 'स्टॉक समायोजन', icon: 'Activity', path: '/inventory/stock-adjustment' },
      { label: 'भौतिक गणना', icon: 'ClipboardList', path: '/inventory/stock-entry' },
    ],
  },
  {
    label: 'ग्राहक',
    icon: 'Users',
    module: 'customers',
    items: [
      { label: 'ग्राहक यादी', icon: 'Users', path: '/customers' },
      { label: 'ग्राहक डॅशबोर्ड', icon: 'BarChart3', path: '/customers/dashboard' },
      { label: 'थकबाकी (Outstanding)', icon: 'Wallet', path: '/customers/outstanding' },
    ],
  },
  {
    label: 'पुरवठादार',
    icon: 'Truck',
    module: 'suppliers',
    items: [
      { label: 'पुरवठादार यादी', icon: 'Truck', path: '/suppliers' },
      { label: 'पुरवठादार डॅशबोर्ड', icon: 'BarChart3', path: '/suppliers/dashboard' },
      { label: 'थकबाकी (Outstanding)', icon: 'Wallet', path: '/suppliers/outstanding' },
    ],
  },
  {
    label: 'उत्पादने',
    icon: 'Boxes',
    module: 'products',
    items: [
      { label: 'उत्पादने', icon: 'Boxes', path: '/products' },
      { label: 'उत्पादन डॅशबोर्ड', icon: 'BarChart3', path: '/products/dashboard' },
      { label: 'उत्पादन अहवाल', icon: 'BarChart3', path: '/products/reports' },
      { label: 'श्रेण्या', icon: 'Boxes', path: '/categories' },
    ],
  },
  {
    label: 'देयके',
    icon: 'Wallet',
    module: 'payments',
    items: [
      { label: 'देयके', icon: 'Wallet', path: '/sales/customer-prices' },
      { label: 'क्रेडिट नियंत्रण', icon: 'DollarSign', path: '/sales/credit/dashboard' },
    ],
  },
  {
    label: 'अहवाल',
    icon: 'BarChart3',
    module: 'reports',
    items: [
      { label: 'विक्री अहवाल', icon: 'BarChart3', path: '/sales/reports/dashboard' },
      { label: 'खरेदी अहवाल', icon: 'BarChart3', path: '/purchase/reports/purchase-register' },
      { label: 'स्टॉक अहवाल', icon: 'BarChart3', path: '/inventory/reports/summary' },
      { label: 'आर्थिक अहवाल', icon: 'BarChart3', path: '/gl/trial-balance' },
    ],
  },
  {
    label: 'विश्लेषण',
    icon: 'BarChart3',
    module: 'reports',
    items: [
      { label: 'मुख्य विश्लेषण', icon: 'LayoutDashboard', path: '/analytics/overview' },
      { label: 'विक्री विश्लेषण', icon: 'Activity', path: '/analytics/sales' },
      { label: 'खरेदी विश्लेषण', icon: 'ShoppingCart', path: '/analytics/purchase' },
      { label: 'स्टॉक विश्लेषण', icon: 'Boxes', path: '/analytics/inventory' },
      { label: 'आर्थिक विश्लेषण', icon: 'Wallet', path: '/analytics/finance' },
      { label: 'GST विश्लेषण', icon: 'FileSpreadsheet', path: '/analytics/gst' },
      { label: 'ग्राहक विश्लेषण', icon: 'Users', path: '/analytics/customers' },
      { label: 'पुरवठादार विश्लेषण', icon: 'Truck', path: '/analytics/suppliers' },
      { label: 'नफा विश्लेषण', icon: 'BarChart3', path: '/analytics/profitability' },
      { label: 'टॉप/बॉटम', icon: 'Star', path: '/analytics/top-bottom' },
    ],
  },
  {
    label: 'CRM',
    icon: 'Users',
    module: 'crm',
    items: [
      { label: 'CRM डॅशबोर्ड', icon: 'LayoutDashboard', path: '/crm/dashboard' },
      { label: 'लीड्स', icon: 'ListTodo', path: '/crm/leads' },
      { label: 'पाइपलाइन', icon: 'Activity', path: '/crm/pipeline' },
      { label: 'फॉलो-अप', icon: 'ClipboardList', path: '/crm/follow-ups' },
      { label: 'कार्ये', icon: 'FileEdit', path: '/crm/tasks' },
      { label: 'CRM अहवाल', icon: 'BarChart3', path: '/crm/reports' },
    ],
  },
  {
    label: 'खाते',
    icon: 'BookOpen',
    module: 'accounts',
    items: [
      { label: 'खात्यांचा तक्ता', icon: 'BookOpen', path: '/finance/chart-of-accounts' },
      { label: 'जर्नल नोंदी', icon: 'FileEdit', path: '/finance/journal-entries' },
      { label: 'लेजर', icon: 'BookOpen', path: '/finance/ledgers' },
    ],
  },
  {
    label: 'एचआर / कर्मचारी',
    icon: 'Users',
    module: 'hr',
    items: [
      { label: 'HR डॅशबोर्ड', icon: 'LayoutDashboard', path: '/hr/dashboard' },
      { label: 'कर्मचारी', icon: 'Users', path: '/hr/employees' },
      { label: 'उपस्थिती', icon: 'ClipboardList', path: '/hr/attendance' },
      { label: 'रजा', icon: 'FileText', path: '/hr/leave' },
      { label: 'पेरोल', icon: 'Wallet', path: '/hr/payroll' },
    ],
  },
  {
    label: 'मालमत्ता आणि खर्च',
    icon: 'Boxes',
    module: 'assets',
    items: [
      { label: 'डॅशबोर्ड', icon: 'LayoutDashboard', path: '/assets' },
      { label: 'मालमत्ता', icon: 'Boxes', path: '/assets/list' },
      { label: 'खर्च', icon: 'FileText', path: '/expenses' },
      { label: 'सेवा वेळापत्रक', icon: 'Wrench', path: '/assets/maintenance' },
    ],
  },
  {
    label: 'व्यवसाय नियंत्रण',
    icon: 'ShieldAlert',
    module: 'workflow',
    items: [
      { label: 'बिझनेस कंट्रोल', icon: 'LayoutDashboard', path: '/workflow/control' },
      { label: 'व्यवसाय नियम', icon: 'FileSearch', path: '/control/business-rules' },
      { label: 'कस्टम फील्ड्स', icon: 'FileText', path: '/control/custom-fields' },
      { label: 'टॅग्ज', icon: 'Tag', path: '/control/tags' },
      { label: 'ग्लोबल शोध', icon: 'Search', path: '/control/global-search' },
    ],
  },
  {
    label: 'एसएमएस / ईमेल',
    icon: 'MessageSquare',
    module: 'communication',
    items: [
      { label: 'नोटिफिकेशन केंद्र', icon: 'Bell', path: '/communications/center' },
      { label: 'कम्युनिकेशन लॉग', icon: 'ClipboardList', path: '/communications/log' },
      { label: 'टेम्पलेट्स', icon: 'FileText', path: '/communications/templates' },
      { label: 'सेटिंग्ज', icon: 'Settings', path: '/communications/settings' },
    ],
  },
  {
    label: 'ग्राहक पोर्टल',
    icon: 'Globe',
    module: 'portal',
    items: [{ label: 'पोर्टल व्यवस्थापन', icon: 'Globe', path: '/portal-admin' }],
  },
  {
    label: 'कमर्शियल',
    icon: 'CreditCard',
    module: 'commercial',
    items: [
      { label: 'कमर्शियल डॅशबोर्ड', icon: 'LayoutDashboard', path: '/commercial/dashboard' },
      { label: 'प्लॅन्स', icon: 'Package', path: '/commercial/plans' },
      { label: 'सबस्क्रिप्शन्स', icon: 'ShoppingCart', path: '/commercial/subscriptions' },
      { label: 'कूपन्स', icon: 'Ticket', path: '/commercial/coupons' },
      { label: 'बिलिंग', icon: 'Wallet', path: '/commercial/billing' },
      { label: 'अहवाल', icon: 'BarChart3', path: '/commercial/reports' },
    ],
  },
  {
    label: 'लायसन्स',
    icon: 'KeyRound',
    module: 'license',
    items: [
      { label: 'लायसन्स डॅशबोर्ड', icon: 'LayoutDashboard', path: '/license/dashboard' },
      { label: 'लायसन्स', icon: 'KeyRound', path: '/license' },
    ],
  },
  {
    label: 'ऑफर',
    icon: 'Gift',
    module: 'offers',
    items: [{ label: 'ऑफर', icon: 'Gift', path: '/offers' }],
  },
];

// ═══════════════════════════════════════════════════════════
// ICON MAP
// ═══════════════════════════════════════════════════════════

const iconMap: Record<string, LucideIcon> = {
  KeyRound,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Truck,
  Boxes,
  Wallet,
  BarChart3,
  BookOpen,
  MessageSquare,
  Gift,
  Settings,
  Headset,
  FileText,
  ListTodo,
  Scan,
  Warehouse,
  ClipboardList,
  ArrowRightLeft,
  Activity,
  FileSpreadsheet,
  DollarSign,
  Undo2,
  FileEdit,
  FileSearch,
  Wrench,
  ShieldAlert,
  Tag,
  Search,
  Globe,
  CreditCard,
  Ticket,
  Star,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
};

const moduleIconColors: Record<string, string> = {
  dashboard: 'text-emerald-400',
  sales: 'text-sky-400',
  purchase: 'text-amber-400',
  inventory: 'text-teal-400',
  customers: 'text-indigo-400',
  suppliers: 'text-blue-400',
  products: 'text-rose-400',
  payments: 'text-emerald-400',
  reports: 'text-violet-400',
  accounts: 'text-blue-400',
  assets: 'text-teal-400',
  expenses: 'text-amber-400',
  workflow: 'text-rose-400',
  portal: 'text-sky-400',
  commercial: 'text-violet-400',
  business_rules: 'text-red-400',
  communication: 'text-cyan-400',
  offers: 'text-pink-400',
};

// ═══════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════════

const FAVORITES_KEY = 'shranix_sidebar_favorites';

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

// ═══════════════════════════════════════════════════════════
// FLATTEN ITEMS
// ═══════════════════════════════════════════════════════════

function flattenItems(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.children) {
      result.push(...item.children);
    } else if (item.path) {
      result.push(item);
    }
  }
  return result;
}

function isRouteActive(itemPath: string | undefined, currentPath: string): boolean {
  if (!itemPath) {
    return false;
  }
  if (itemPath === '/') {
    return currentPath === '/';
  }
  if (currentPath === itemPath) {
    return true;
  }
  if (currentPath.startsWith(`${itemPath}/`)) {
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// SUBMENU GROUP — expandable second-level
// ═══════════════════════════════════════════════════════════

function SubMenuGroup({
  item,
  locationPath,
  onNavigate,
}: {
  item: NavItem;
  locationPath: string;
  onNavigate?: () => void;
}) {
  const Icon = iconMap[item.icon] || LayoutDashboard;
  const [isOpen, setIsOpen] = useState(false);

  const isActive = useMemo(
    () => item.children?.some((child) => isRouteActive(child.path, locationPath)) ?? false,
    [item.children, locationPath],
  );

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'sidebar-menu-item w-full justify-between',
          isOpen || isActive ? 'font-semibold text-white' : 'text-slate-300/80',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon
            className={cn('sidebar-menu-icon', (isOpen || isActive) && 'text-emerald-400')}
            strokeWidth={1.75}
          />
          <span className="truncate text-left">{item.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-emerald-400',
          )}
          strokeWidth={2}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[50vh]' : 'max-h-0',
        )}
      >
        <div className="ml-3.5 space-y-1 border-l-2 border-emerald-500/20 py-1.5 pl-2.5 dark:border-emerald-500/30">
          {item.children?.map((child) => (
            <NavItemLink
              key={child.path}
              item={child}
              isSubmenu
              locationPath={locationPath}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NAV ITEM LINK — individual menu item
// ═══════════════════════════════════════════════════════════

function NavItemLink({
  item,
  collapsed,
  isSubmenu,
  showPin,
  isPinned,
  locationPath,
  onTogglePin,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  isSubmenu?: boolean;
  showPin?: boolean;
  isPinned?: boolean;
  locationPath?: string;
  onTogglePin?: (e: React.MouseEvent) => void;
  onNavigate?: () => void;
}) {
  const Icon = iconMap[item.icon] || LayoutDashboard;

  if (!item.path) {
    return null;
  }

  if (collapsed) {
    return (
      <NavLink
        to={item.path}
        end={item.path === '/'}
        onClick={onNavigate}
        title={item.label}
        className={({ isActive }) => {
          const active =
            isActive || (locationPath ? isRouteActive(item.path, locationPath) : false);
          return cn(
            'mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
            active
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
              : 'text-slate-400 hover:border hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-white',
          );
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = isActive || (locationPath ? isRouteActive(item.path, locationPath) : false);
        return cn(
          isSubmenu
            ? 'flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-all duration-200'
            : 'flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14px] font-semibold transition-all duration-200',
          active
            ? 'border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md shadow-emerald-500/25'
            : isSubmenu
              ? 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-300'
              : 'text-slate-700 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-300',
        );
      }}
    >
      <Icon
        className={cn(isSubmenu ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0')}
        strokeWidth={1.85}
      />
      <span className="flex-1 truncate text-left">{item.label}</span>
      {showPin && onTogglePin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(e);
          }}
          className="shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          title={isPinned ? 'आवडीतून काढा' : 'आवडीत जोडा'}
        >
          <Star
            className={cn(
              'h-3.5 w-3.5',
              isPinned ? 'fill-amber-400 text-amber-400' : 'text-slate-500',
            )}
            strokeWidth={1.5}
          />
        </button>
      )}
    </NavLink>
  );
}

// ═══════════════════════════════════════════════════════════
// NAV SECTION — top-level accordion
// ═══════════════════════════════════════════════════════════

function NavSection({
  section,
  isOpen,
  onToggle,
  collapsed,
  onNavigate,
  locationPath,
}: {
  section: SectionGroup;
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onNavigate?: () => void;
  locationPath: string;
}) {
  const Icon = iconMap[section.icon] || LayoutDashboard;

  const isSectionActive = useMemo(() => {
    const allItems = flattenItems(section.items);
    return allItems.some((i) => isRouteActive(i.path, locationPath));
  }, [section.items, locationPath]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        {flattenItems(section.items).map((item) => (
          <NavItemLink
            key={item.path || item.label}
            item={item}
            collapsed
            locationPath={locationPath}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  const isDirectLink =
    section.items.length === 1 && !section.items[0].children && section.items[0].path;

  const accentColor = moduleIconColors[section.module] || 'text-emerald-400';

  if (isDirectLink) {
    const directItem = section.items[0];
    return (
      <NavLink
        to={directItem.path!}
        end={directItem.path === '/'}
        onClick={onNavigate}
        className={({ isActive }) => {
          const active = isActive || isRouteActive(directItem.path, locationPath);
          return cn(
            'flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-[14px] font-semibold transition-all duration-200',
            active
              ? 'border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-700 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-300',
          );
        }}
      >
        <Icon className={cn('h-5 w-5 shrink-0', accentColor)} strokeWidth={1.85} />
        <span className="flex-1 truncate text-left">{section.label}</span>
      </NavLink>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 text-[14px] font-semibold transition-all duration-200',
          isSectionActive && !isOpen
            ? 'border border-emerald-500/30 bg-emerald-500/15 font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-slate-700 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-300',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 transition-transform duration-200',
              isSectionActive || isOpen ? 'text-emerald-500' : accentColor,
            )}
            strokeWidth={1.85}
          />
          <span className="flex-1 truncate text-left">{section.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-emerald-500',
          )}
          strokeWidth={2}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="my-1 ml-4 space-y-1 border-l-2 border-slate-200/80 py-1 pl-2.5 dark:border-emerald-500/25">
          {section.items.map((item) =>
            item.children ? (
              <SubMenuGroup
                key={item.label}
                item={item}
                locationPath={locationPath}
                onNavigate={onNavigate}
              />
            ) : (
              <NavItemLink
                key={item.path || item.label}
                item={item}
                isSubmenu
                showPin
                locationPath={locationPath}
                onNavigate={onNavigate}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HOVER EXPAND OVERLAY (collapsed mode)
// ═══════════════════════════════════════════════════════════

function HoverExpandPanel({
  children,
  visible,
  onClose,
}: {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
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

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="animate-in slide-in-from-left-1 fade-in fixed left-16 top-0 z-50 h-full w-64 rounded-r-2xl border-r border-white/[0.1] bg-[#0B1A33] shadow-2xl shadow-black/70 duration-200"
    >
      <div className="sidebar-scrollbar-premium h-full overflow-y-auto px-3 py-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PREMIUM FOOTER
// ═══════════════════════════════════════════════════════════

function PremiumFooter({
  collapsed,
  onToggle: toggleFn,
}: {
  collapsed: boolean;
  onToggle?: () => void;
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'SHRANIX काऊंटर'
    : 'SHRANIX काऊंटर';
  const userRole = user?.role ? String(user.role).toUpperCase() : 'व्यवस्थापक';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'S';

  if (collapsed) {
    return (
      <div className="relative z-10 flex flex-col items-center space-y-2 border-t border-slate-200/80 bg-slate-50/80 p-2.5 dark:border-white/[0.08] dark:bg-[#111827]/90">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-sm"
          title={userName}
        >
          {userInitial}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
          title="SHRANIX काळजी / Support"
        >
          <Headset className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {expanded && (
          <div className="absolute bottom-full left-2 mb-2 w-52 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xl backdrop-blur-md dark:border-white/[0.1] dark:bg-[#1F2937]">
            <div className="mb-2 flex items-center gap-2">
              <Headset className="h-4 w-4 text-emerald-500" strokeWidth={1.75} />
              <span className="font-poppins text-xs font-bold text-slate-800 dark:text-white">
                SHRANIX काळजी
              </span>
            </div>
            <div className="space-y-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <p>📞 +91-9881292045</p>
              <p>✉ support@shranix.com</p>
            </div>
            <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] font-semibold text-emerald-600 dark:border-slate-700 dark:text-emerald-400">
              v1.0.0 Enterprise
            </div>
          </div>
        )}
        <div className="text-[9px] font-bold text-slate-400">v1.0.0</div>
      </div>
    );
  }

  return (
    <div className="relative z-10 border-t border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111827]">
      <div className="relative space-y-2 px-3 py-2.5">
        {/* User / Account Card */}
        <div className="shadow-2xs flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 transition-all hover:border-emerald-500/30 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-extrabold text-white shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-poppins truncate text-xs font-bold text-slate-800 dark:text-white">
              {userName}
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {userRole}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
            title="SHRANIX काळजी"
          >
            <Headset className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Support Drawer */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            expanded ? 'max-h-32' : 'max-h-0',
          )}
        >
          <div className="space-y-1 rounded-xl border border-slate-200/80 bg-white p-2.5 text-[11px] text-slate-600 dark:border-white/[0.08] dark:bg-[#1F2937] dark:text-slate-300">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-800 dark:text-white">
              <Headset className="h-3.5 w-3.5 text-emerald-500" />
              SHRANIX काळजी Support
            </p>
            <p className="text-slate-500 dark:text-slate-400">📞 +91-9881292045 / 9021212045</p>
            <p className="text-slate-500 dark:text-slate-400">✉ support@shranix.com</p>
          </div>
        </div>

        {/* Footer Meta Row (Version & Collapse) */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className="font-poppins flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            v1.0.0 ENTERPRISE
          </span>
          {toggleFn && (
            <button
              onClick={toggleFn}
              className="h-6.5 w-6.5 flex items-center justify-center rounded-md text-slate-400 transition-all hover:bg-emerald-500/15 hover:text-emerald-500"
              title="बाजूची पट्टी लपवा (Collapse Sidebar)"
            >
              <PanelRightClose className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR COMPONENT — Main Export
// ═══════════════════════════════════════════════════════════

export function Sidebar({ collapsed, onToggle, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // ── Module-wise access ──
  const visibleSections = useMemo(
    () => sections.filter((s) => hasModuleAccess(user, s.module)),
    [user],
  );

  // ── Close on Escape key (mobile drawer) ──
  useEffect(() => {
    if (!onClose) {
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── Derive which section the current path belongs to ──
  const currentSectionLabel = useMemo(() => {
    for (const section of visibleSections) {
      const allLeafItems = flattenItems(section.items);
      if (allLeafItems.some((i) => isRouteActive(i.path, location.pathname))) {
        return section.label;
      }
    }
    return null;
  }, [visibleSections, location.pathname]);

  // ── Auto-open the section containing current page ──
  useEffect(() => {
    if (currentSectionLabel) {
      setActiveSection(currentSectionLabel);
    }
  }, [currentSectionLabel]);

  // ── Persist to localStorage ──
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // ── Flatten all items ──
  const allItems = useMemo(
    () => visibleSections.flatMap((s) => flattenItems(s.items)),
    [visibleSections],
  );

  // ── Favorite items data ──
  const favoriteItems = useMemo(
    () => allItems.filter((i) => i.path && favorites.includes(i.path)),
    [allItems, favorites],
  );

  // ── Accordion toggle ──
  const toggleSection = useCallback((label: string) => {
    setActiveSection((prev) => (prev === label ? null : label));
  }, []);

  // ── Collapsed hover expand ──
  const handleMouseEnter = useCallback(() => {
    if (collapsed) {
      setHoverExpanded(true);
    }
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (collapsed) {
      setHoverExpanded(false);
    }
  }, [collapsed]);

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      {onClose && (
        <div
          className="animate-in fade-in fixed inset-0 z-40 bg-black/60 backdrop-blur-sm duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative flex h-full shrink-0 select-none flex-col rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur-2xl transition-all duration-200 ease-in-out dark:border-white/[0.08] dark:bg-[#111827]/95 dark:shadow-black/50',
          collapsed ? 'w-18' : 'w-[275px]',
          onClose && [
            'fixed left-2 top-2 z-50 h-[calc(100vh-16px)] shadow-2xl shadow-black/70',
            'animate-in slide-in-from-left-1/2 fade-in duration-200',
          ],
        )}
        role={onClose ? 'dialog' : undefined}
        aria-modal={onClose ? true : undefined}
        aria-label={onClose ? 'नेव्हिगेशन मेनू' : undefined}
      >
        {/* ── Ambient glow effects ── */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-teal-500/[0.06] blur-3xl" />

        {/* ── Brand Header ── */}
        <div
          className={cn(
            'relative z-10 flex shrink-0 items-center border-b border-slate-200/80 transition-all duration-200 dark:border-white/[0.08]',
            collapsed ? 'h-16 justify-center px-2 py-2' : 'h-16 items-center px-3.5 py-2',
          )}
        >
          {collapsed ? (
            <img
              src="/logo.png"
              alt="SHRANIX"
              className="h-9 w-9 object-contain transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="flex w-full items-center gap-2.5">
              <img
                src="/logo.png"
                alt="SHRANIX"
                className="h-9 w-9 shrink-0 object-contain transition-transform duration-200 hover:scale-105"
              />
              <div className="flex min-w-0 flex-col justify-center leading-tight">
                <span className="font-poppins truncate text-[15px] font-extrabold tracking-wide text-amber-500 dark:text-amber-400">
                  SHRANIX
                </span>
                <span className="font-poppins truncate text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  KRUSHI ERP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation Body ── */}
        <nav className="sidebar-scrollbar-premium relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
          {/* ⭐ आवडते */}
          {!collapsed && favoriteItems.length > 0 && (
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-400/80"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <Star className="h-3 w-3 text-amber-400" strokeWidth={1.5} />
                आवडते
              </div>
              <div className="space-y-0.5">
                {favoriteItems.map((item) => (
                  <NavItemLink
                    key={item.path}
                    item={item}
                    locationPath={location.pathname}
                    onNavigate={onClose}
                  />
                ))}
              </div>
              <div className="mx-2 my-1.5 border-t border-white/[0.06]" />
            </div>
          )}

          {/* All Sections */}
          {visibleSections.map((section) => (
            <NavSection
              key={section.label}
              section={section}
              isOpen={activeSection === section.label}
              onToggle={() => toggleSection(section.label)}
              collapsed={false}
              locationPath={location.pathname}
              onNavigate={onClose}
            />
          ))}
        </nav>

        {/* ── Agriculture-themed Decorative Bottom ── */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-44 overflow-hidden opacity-[0.05]">
          <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
            <path
              d="M0,150 C30,140 60,160 90,145 C120,130 150,110 180,125 C210,140 240,155 270,140 C300,125 330,110 360,130 C390,150 400,145 400,145 L400,200 L0,200 Z"
              fill="#10B981"
            />
            <circle cx="80" cy="100" r="15" fill="#34D399" opacity="0.5" />
            <circle cx="200" cy="80" r="12" fill="#34D399" opacity="0.4" />
            <circle cx="320" cy="110" r="18" fill="#34D399" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C2338] via-[#0C2338]/80 to-transparent" />
        </div>

        {/* ── Premium Footer ── */}
        <div className="relative z-10">
          <PremiumFooter collapsed={collapsed} onToggle={onToggle} />
        </div>
      </aside>

      {/* ── Hover-Expand overlay (when collapsed) ── */}
      <HoverExpandPanel
        visible={collapsed && hoverExpanded}
        onClose={() => setHoverExpanded(false)}
      >
        {favoriteItems.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-400/80">
              <Star className="h-3 w-3" strokeWidth={1.5} />
              आवडते
            </div>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => (
                <NavItemLink key={item.path} item={item} locationPath={location.pathname} />
              ))}
            </div>
            <div className="mx-2 my-1 border-t border-white/[0.06]" />
          </div>
        )}

        {visibleSections.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="flex items-center gap-2 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-400/80">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) =>
                item.children ? (
                  <SubMenuGroup
                    key={item.label}
                    item={item}
                    locationPath={location.pathname}
                    onNavigate={() => setHoverExpanded(false)}
                  />
                ) : (
                  <NavItemLink
                    key={item.path || item.label}
                    item={item}
                    showPin
                    isPinned={item.path ? favorites.includes(item.path) : false}
                    onTogglePin={
                      item.path
                        ? () => {
                            setFavorites((prev) =>
                              prev.includes(item.path!)
                                ? prev.filter((p) => p !== item.path)
                                : [...prev, item.path!],
                            );
                          }
                        : undefined
                    }
                    onNavigate={() => setHoverExpanded(false)}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </HoverExpandPanel>
    </>
  );
}
