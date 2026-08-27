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
  Settings,
  Layers,
  ShieldCheck,
  Headset,
  ChevronDown,
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
  MessageSquare,
  Gift,
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
  module?: string;
}

interface SectionGroup {
  label: string;
  icon: string;
  module: string;
  isPrimary?: boolean;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

// ═══════════════════════════════════════════════════════════
// 1. PRIMARY MODULES — Visible in Core Navigation (11 Items)
// ═══════════════════════════════════════════════════════════

const primarySections: SectionGroup[] = [
  {
    label: 'डॅशबोर्ड',
    icon: 'LayoutDashboard',
    module: 'dashboard',
    isPrimary: true,
    items: [{ label: 'डॅशबोर्ड', icon: 'LayoutDashboard', path: '/' }],
  },
  {
    label: 'विक्री',
    icon: 'ShoppingCart',
    module: 'sales',
    isPrimary: true,
    items: [
      { label: 'नवीन विक्री बीजक', icon: 'Receipt', path: '/sales/invoices/create' },
      { label: 'विक्री यादी (Invoices)', icon: 'FileText', path: '/sales/invoices' },
      { label: 'विक्री ऑर्डर', icon: 'ShoppingCart', path: '/sales/orders' },
      { label: 'कोटेशन (Quotations)', icon: 'FileSearch', path: '/sales/quotations' },
      { label: 'विक्री परत (Returns)', icon: 'Undo2', path: '/sales/returns' },
      { label: 'वितरण चलान (Challan)', icon: 'Truck', path: '/sales/delivery-challans' },
      { label: 'क्रेडिट नोट', icon: 'FileEdit', path: '/sales/returns/credit-notes' },
      { label: 'पेमेंट कलेक्शन', icon: 'Wallet', path: '/sales/payments' },
      { label: 'कस्टमर लेजर', icon: 'BookOpen', path: '/sales/customer-ledger' },
    ],
  },
  {
    label: 'खरेदी',
    icon: 'Receipt',
    module: 'purchase',
    isPrimary: true,
    items: [
      { label: 'खरेदी नोंद (Bills)', icon: 'FileEdit', path: '/purchase/invoices' },
      { label: 'खरेदी ऑर्डर', icon: 'FileText', path: '/purchase/orders' },
      { label: 'खरेदी परत (Returns)', icon: 'Undo2', path: '/purchase/returns' },
      { label: 'देयके (Payments)', icon: 'Wallet', path: '/purchase/payments' },
      { label: 'डेबिट नोट', icon: 'FileSpreadsheet', path: '/sales/returns/debit-notes' },
    ],
  },
  {
    label: 'इन्व्हेंटरी',
    icon: 'Package',
    module: 'stock',
    isPrimary: true,
    items: [
      { label: 'वस्तू मास्टर (Products)', icon: 'Package', path: '/inventory/products' },
      { label: 'बॅच आणि मुदत (Expiry)', icon: 'ListTodo', path: '/inventory/batches' },
      { label: 'स्टॉक लेजर', icon: 'ClipboardList', path: '/inventory/ledger' },
      {
        label: 'स्टॉक हस्तांतरण (Transfer)',
        icon: 'ArrowRightLeft',
        path: '/inventory/create-transfer',
      },
      { label: 'गोदाम (Warehouses)', icon: 'Warehouse', path: '/warehouses' },
      {
        label: 'स्टॉक समायोजन (Adjustment)',
        icon: 'Activity',
        path: '/inventory/stock-adjustment',
      },
      { label: 'भौतिक गणना (Stock Entry)', icon: 'ClipboardList', path: '/inventory/stock-entry' },
      { label: 'अनुक्रमांक / बारकोड', icon: 'Scan', path: '/inventory/serials' },
    ],
  },
  {
    label: 'ग्राहक',
    icon: 'Users',
    module: 'customers',
    isPrimary: true,
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
    isPrimary: true,
    items: [
      { label: 'पुरवठादार यादी', icon: 'Truck', path: '/suppliers' },
      { label: 'पुरवठादार डॅशबोर्ड', icon: 'BarChart3', path: '/suppliers/dashboard' },
      { label: 'देणी थकबाकी (Outstanding)', icon: 'Wallet', path: '/suppliers/outstanding' },
    ],
  },
  {
    label: 'उत्पादने',
    icon: 'Boxes',
    module: 'products',
    isPrimary: true,
    items: [
      { label: 'सर्व उत्पादने', icon: 'Boxes', path: '/products' },
      { label: 'उत्पादन डॅशबोर्ड', icon: 'BarChart3', path: '/products/dashboard' },
      { label: 'श्रेण्या व उपश्रेण्या', icon: 'Boxes', path: '/categories' },
      { label: 'उत्पादन अहवाल', icon: 'BarChart3', path: '/products/reports' },
    ],
  },
  {
    label: 'देयके व पावती',
    icon: 'Wallet',
    module: 'payments',
    isPrimary: true,
    items: [
      { label: 'देयके व दर (Pricing)', icon: 'Wallet', path: '/sales/customer-prices' },
      { label: 'क्रेडिट नियंत्रण', icon: 'DollarSign', path: '/sales/credit/dashboard' },
      { label: 'कॅश इन हँड (Cash Book)', icon: 'BookOpen', path: '/finance/cash-book' },
    ],
  },
  {
    label: 'अहवाल',
    icon: 'BarChart3',
    module: 'reports',
    isPrimary: true,
    items: [
      { label: 'विक्री अहवाल', icon: 'BarChart3', path: '/sales/reports/dashboard' },
      { label: 'खरेदी अहवाल', icon: 'BarChart3', path: '/purchase/reports/purchase-register' },
      { label: 'स्टॉक अहवाल', icon: 'BarChart3', path: '/inventory/reports/summary' },
      { label: 'आर्थिक अहवाल', icon: 'BarChart3', path: '/gl/trial-balance' },
      { label: 'मुख्य विश्लेषण (Analytics)', icon: 'LayoutDashboard', path: '/analytics/overview' },
      { label: 'GST अहवाल व विश्लेषण', icon: 'FileSpreadsheet', path: '/analytics/gst' },
    ],
  },
  {
    label: 'वित्त व हिशोब',
    icon: 'BookOpen',
    module: 'accounts',
    isPrimary: true,
    items: [
      { label: 'खात्यांचा तक्ता (Chart)', icon: 'BookOpen', path: '/finance/chart-of-accounts' },
      { label: 'जर्नल नोंदी (Journals)', icon: 'FileEdit', path: '/finance/journal-entries' },
      { label: 'लेजर (General Ledgers)', icon: 'BookOpen', path: '/finance/ledgers' },
    ],
  },
  {
    label: 'HR & Payroll',
    icon: 'Users',
    module: 'hr',
    isPrimary: true,
    items: [
      { label: 'HR डॅशबोर्ड', icon: 'LayoutDashboard', path: '/hr/dashboard' },
      { label: 'कर्मचारी यादी', icon: 'Users', path: '/hr/employees' },
      { label: 'उपस्थिती (Attendance)', icon: 'ClipboardList', path: '/hr/attendance' },
      { label: 'रजा व्यवस्थापन (Leave)', icon: 'FileText', path: '/hr/leave' },
      { label: 'पेरोल / पगार (Payroll)', icon: 'Wallet', path: '/hr/payroll' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// 2. SECONDARY MODULES — Inside "अधिक मॉड्यूल्स (More)"
// ═══════════════════════════════════════════════════════════

const secondaryModules: NavItem[] = [
  {
    label: 'CRM',
    icon: 'Users',
    module: 'crm',
    children: [
      { label: 'CRM डॅशबोर्ड', icon: 'LayoutDashboard', path: '/crm/dashboard' },
      { label: 'लीड्स (Leads)', icon: 'ListTodo', path: '/crm/leads' },
      { label: 'पाइपलाइन', icon: 'Activity', path: '/crm/pipeline' },
      { label: 'फॉलो-अप', icon: 'ClipboardList', path: '/crm/follow-ups' },
      { label: 'कार्ये (Tasks)', icon: 'FileEdit', path: '/crm/tasks' },
    ],
  },
  {
    label: 'DMS / कागदपत्रे',
    icon: 'FileText',
    module: 'workflow',
    children: [
      { label: 'दस्तऐवज यादी', icon: 'FileText', path: '/dms/documents' },
      { label: 'फोल्डर्स', icon: 'Boxes', path: '/dms/folders' },
      { label: 'OCR स्कॅनिंग', icon: 'Scan', path: '/dms/ocr' },
      { label: 'डिजिटल स्वाक्षरी', icon: 'FileEdit', path: '/dms/signatures' },
    ],
  },
  {
    label: 'Assets & Expenses',
    icon: 'Boxes',
    module: 'assets',
    children: [
      { label: 'मालमत्ता डॅशबोर्ड', icon: 'LayoutDashboard', path: '/assets' },
      { label: 'मालमत्ता यादी', icon: 'Boxes', path: '/assets/list' },
      { label: 'दैनंदिन खर्च (Expenses)', icon: 'FileText', path: '/expenses' },
      { label: 'देखभाल वेळापत्रक', icon: 'Wrench', path: '/assets/maintenance' },
    ],
  },
  {
    label: 'Controls',
    icon: 'ShieldAlert',
    module: 'workflow',
    children: [
      { label: 'बिझनेस कंट्रोल सेंटर', icon: 'LayoutDashboard', path: '/workflow/control' },
      { label: 'व्यवसाय नियम', icon: 'FileSearch', path: '/control/business-rules' },
      { label: 'कस्टम फील्ड्स', icon: 'FileText', path: '/control/custom-fields' },
      { label: 'टॅग्ज व्यवस्थापन', icon: 'Tag', path: '/control/tags' },
    ],
  },
  {
    label: 'Communication',
    icon: 'MessageSquare',
    module: 'communication',
    children: [
      { label: 'नोटिफिकेशन केंद्र', icon: 'MessageSquare', path: '/communications/center' },
      { label: 'कम्युनिकेशन लॉग', icon: 'ClipboardList', path: '/communications/log' },
      { label: 'SMS/Email टेम्पलेट्स', icon: 'FileText', path: '/communications/templates' },
    ],
  },
  {
    label: 'Customer Portal',
    icon: 'Globe',
    module: 'portal',
    path: '/portal-admin',
  },
  {
    label: 'Commercial',
    icon: 'CreditCard',
    module: 'commercial',
    children: [
      { label: 'कमर्शियल डॅशबोर्ड', icon: 'LayoutDashboard', path: '/commercial/dashboard' },
      { label: 'प्लॅन्स व्यवस्थापन', icon: 'Package', path: '/commercial/plans' },
      { label: 'सबस्क्रिप्शन्स', icon: 'ShoppingCart', path: '/commercial/subscriptions' },
      { label: 'सवलत कूपन्स', icon: 'Ticket', path: '/commercial/coupons' },
      { label: 'बिलिंग', icon: 'Wallet', path: '/commercial/billing' },
    ],
  },
  {
    label: 'Licensing',
    icon: 'KeyRound',
    module: 'license',
    children: [
      { label: 'लायसन्स डॅशबोर्ड', icon: 'LayoutDashboard', path: '/license/dashboard' },
      { label: 'लायसन्स माहिती', icon: 'KeyRound', path: '/license' },
    ],
  },
  {
    label: 'Offers',
    icon: 'Gift',
    module: 'offers',
    path: '/offers',
  },
];

// ═══════════════════════════════════════════════════════════
// 3. SYSTEM & SETTINGS SECTION — Separated Below More
// ═══════════════════════════════════════════════════════════

const systemSections: SectionGroup[] = [
  {
    label: 'सेटिंग्ज',
    icon: 'Settings',
    module: 'settings',
    isPrimary: true,
    items: [{ label: 'सेटिंग्ज', icon: 'Settings', path: '/finance/settings' }],
  },
  {
    label: 'प्रणाली व्यवस्थापन',
    icon: 'ShieldCheck',
    module: 'workflow',
    isPrimary: true,
    items: [
      { label: 'मंजुरी डॅशबोर्ड (Approvals)', icon: 'ShieldCheck', path: '/workflow/approvals' },
      { label: 'प्रलंबित कार्ये (Tasks)', icon: 'ListTodo', path: '/workflow/tasks' },
      { label: 'एस्केलेशन डॅशबोर्ड', icon: 'Activity', path: '/workflow/escalation' },
    ],
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
  Layers,
  ShieldCheck,
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
  PanelRightClose,
};

const moduleIconColors: Record<string, string> = {
  dashboard: 'text-emerald-500',
  sales: 'text-emerald-500',
  purchase: 'text-blue-500',
  stock: 'text-teal-500',
  customers: 'text-orange-500',
  suppliers: 'text-indigo-500',
  products: 'text-cyan-500',
  payments: 'text-amber-500',
  reports: 'text-violet-500',
  accounts: 'text-blue-500',
  hr: 'text-emerald-500',
  more: 'text-slate-400',
  settings: 'text-slate-400',
  system: 'text-slate-400',
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

// ═══════════════════════════════════════════════════════════
// FLATTEN ITEMS & ROUTE DETECTION
// ═══════════════════════════════════════════════════════════

function flattenItems(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.children) {
      result.push(...flattenItems(item.children));
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
// SUBMENU GROUP — Second level accordion
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
    <div className="my-0.5">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-[34px] w-full items-center justify-between gap-2 rounded-lg px-2 text-[12px] font-semibold transition-all duration-150',
          isOpen || isActive
            ? 'bg-slate-100/80 font-bold text-slate-900 dark:bg-white/[0.06] dark:text-white'
            : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon
            className={cn(
              'h-[17px] w-[17px] shrink-0',
              isOpen || isActive ? 'text-emerald-500' : 'text-slate-400',
            )}
            strokeWidth={1.85}
          />
          <span className="truncate text-left">{item.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-emerald-500',
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
        <div className="ml-2.5 space-y-0.5 border-l-2 border-emerald-500/20 py-0.5 pl-2 dark:border-emerald-500/30">
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
// NAV ITEM LINK — Single Route Link
// ═══════════════════════════════════════════════════════════

function NavItemLink({
  item,
  collapsed,
  isSubmenu,
  locationPath,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  isSubmenu?: boolean;
  locationPath?: string;
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
            'mx-auto flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-all duration-150',
            active
              ? 'shadow-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/30 ring-1 ring-emerald-400/40'
              : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-white',
          );
        }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} />
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
            ? 'flex h-[32px] items-center gap-2 rounded-md px-2 text-[12px] font-medium transition-all duration-150'
            : 'flex h-[38px] items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-semibold transition-all duration-150',
          active
            ? 'shadow-xs border border-emerald-400/30 bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-emerald-500/20'
            : isSubmenu
              ? 'text-slate-500 hover:bg-emerald-50/70 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-emerald-300'
              : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-white/[0.04] dark:hover:text-emerald-300',
        );
      }}
    >
      <Icon
        className={cn(isSubmenu ? 'h-[16px] w-[16px] shrink-0' : 'h-[18px] w-[18px] shrink-0')}
        strokeWidth={1.85}
      />
      <span className="flex-1 truncate text-left">{item.label}</span>
    </NavLink>
  );
}

// ═══════════════════════════════════════════════════════════
// NAV SECTION — Top Level Primary Item or Accordion (38px Height)
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
      <div className="flex flex-col items-center gap-0.5">
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

  const accentColor = moduleIconColors[section.module] || 'text-slate-400';

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
            'flex h-[38px] w-full items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-semibold transition-all duration-150',
            active
              ? 'shadow-xs border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-emerald-500/25 ring-1 ring-emerald-400/40'
              : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-white/[0.04] dark:hover:text-emerald-300',
          );
        }}
      >
        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0',
            isRouteActive(directItem.path, locationPath) ? 'text-white' : accentColor,
          )}
          strokeWidth={1.85}
        />
        <span className="flex-1 truncate text-left">{section.label}</span>
      </NavLink>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className={cn(
          'flex h-[38px] w-full items-center justify-between gap-2 rounded-xl px-2.5 text-[13px] font-semibold transition-all duration-150',
          isSectionActive && !isOpen
            ? 'border border-emerald-500/25 bg-emerald-500/10 font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/[0.04] dark:hover:text-white',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-transform duration-150',
              isSectionActive || isOpen ? 'text-emerald-500' : accentColor,
            )}
            strokeWidth={1.85}
          />
          <span className="flex-1 truncate text-left">{section.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-emerald-500',
          )}
          strokeWidth={2}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="my-0.5 ml-3 space-y-0.5 border-l-2 border-slate-200 py-0.5 pl-2 dark:border-emerald-500/25">
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
// MORE MODULES EXPANDABLE ACCORDION SECTION (Collapsed by default)
// ═══════════════════════════════════════════════════════════

function MoreModulesSection({
  modules,
  isOpen,
  onToggle,
  locationPath,
  onNavigate,
}: {
  modules: NavItem[];
  isOpen: boolean;
  onToggle: () => void;
  locationPath: string;
  onNavigate?: () => void;
}) {
  const isAnyActive = useMemo(() => {
    const all = flattenItems(modules);
    return all.some((m) => isRouteActive(m.path, locationPath));
  }, [modules, locationPath]);

  return (
    <div className="my-1 border-t border-slate-200/80 pt-1.5 dark:border-white/[0.06]">
      <button
        onClick={onToggle}
        className={cn(
          'flex h-[38px] w-full items-center justify-between gap-2 rounded-xl px-2.5 text-[12.5px] font-bold tracking-tight transition-all duration-150',
          isAnyActive && !isOpen
            ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
            : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-white',
        )}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.85} />
          <span>अधिक मॉड्यूल्स (More)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="py-0.2 rounded-md bg-slate-200/70 px-1.5 text-[9.5px] font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
            {modules.length}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-emerald-500',
            )}
            strokeWidth={2}
          />
        </div>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="mt-0.5 space-y-0.5 pl-1.5">
          {modules.map((item) =>
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
// FIXED ADMIN USER FOOTER
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
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin'
    : 'Admin';
  const userRole = user?.role ? String(user.role).toUpperCase() : 'व्यवस्थापक';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'A';

  if (collapsed) {
    return (
      <div className="relative z-10 flex flex-col items-center space-y-1.5 border-t border-slate-200/80 bg-slate-50/80 p-2 dark:border-white/[0.08] dark:bg-[#111827]/90">
        <div
          className="shadow-2xs flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-extrabold text-white"
          title={userName}
        >
          {userInitial}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-6.5 w-6.5 flex items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
          title="SHRANIX काळजी / Support"
        >
          <Headset className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        {expanded && (
          <div className="absolute bottom-full left-2 mb-2 w-52 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xl backdrop-blur-md dark:border-white/[0.1] dark:bg-[#1F2937]">
            <div className="mb-2 flex items-center gap-2">
              <Headset className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.75} />
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
      </div>
    );
  }

  return (
    <div className="relative z-10 border-t border-slate-200/80 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111827]">
      <div className="relative space-y-1 px-2.5 py-2">
        {/* User / Account Card */}
        <div className="shadow-2xs flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5 transition-all hover:border-emerald-500/30 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="shadow-2xs flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-600 to-teal-600 text-xs font-extrabold text-white">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-poppins truncate text-xs font-bold text-slate-800 dark:text-white">
              {userName}
            </p>
            <p className="truncate text-[9.5px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {userRole}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
            title="SHRANIX काळजी Support"
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
          <span className="font-poppins flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            v1.0.0 ENTERPRISE
          </span>
          {toggleFn && (
            <button
              onClick={toggleFn}
              className="h-5.5 w-5.5 flex items-center justify-center rounded-md text-slate-400 transition-all hover:bg-emerald-500/15 hover:text-emerald-500"
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
  const [favorites] = useState<string[]>(loadFavorites);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // ── Filter primary sections based on user module access ──
  const visiblePrimarySections = useMemo(
    () => primarySections.filter((s) => hasModuleAccess(user, s.module)),
    [user],
  );

  // ── Filter secondary modules based on user module access ──
  const visibleSecondaryModules = useMemo(
    () => secondaryModules.filter((m) => hasModuleAccess(user, m.module || '')),
    [user],
  );

  // ── Filter system sections ──
  const visibleSystemSections = useMemo(
    () => systemSections.filter((s) => hasModuleAccess(user, s.module)),
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

  // ── Auto-detect if current route is inside Secondary Modules ──
  useEffect(() => {
    const allSecondary = flattenItems(visibleSecondaryModules);
    if (allSecondary.some((i) => isRouteActive(i.path, location.pathname))) {
      setMoreOpen(true);
    }
  }, [visibleSecondaryModules, location.pathname]);

  // ── Derive which primary section the current path belongs to ──
  const currentSectionLabel = useMemo(() => {
    for (const section of visiblePrimarySections) {
      const allLeafItems = flattenItems(section.items);
      if (allLeafItems.some((i) => isRouteActive(i.path, location.pathname))) {
        return section.label;
      }
    }
    for (const section of visibleSystemSections) {
      const allLeafItems = flattenItems(section.items);
      if (allLeafItems.some((i) => isRouteActive(i.path, location.pathname))) {
        return section.label;
      }
    }
    return null;
  }, [visiblePrimarySections, visibleSystemSections, location.pathname]);

  // ── Auto-open the section containing current page ──
  useEffect(() => {
    if (currentSectionLabel) {
      setActiveSection(currentSectionLabel);
    }
  }, [currentSectionLabel]);

  // ── All items for favorite lookup ──
  const allFlattenedItems = useMemo(
    () => [
      ...visiblePrimarySections.flatMap((s) => flattenItems(s.items)),
      ...flattenItems(visibleSecondaryModules),
      ...visibleSystemSections.flatMap((s) => flattenItems(s.items)),
    ],
    [visiblePrimarySections, visibleSecondaryModules, visibleSystemSections],
  );

  const favoriteItems = useMemo(
    () => allFlattenedItems.filter((i) => i.path && favorites.includes(i.path)),
    [allFlattenedItems, favorites],
  );

  const toggleSection = useCallback((label: string) => {
    setActiveSection((prev) => (prev === label ? null : label));
  }, []);

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
        className={cn(
          'relative flex h-full shrink-0 select-none flex-col rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5 backdrop-blur-2xl transition-all duration-200 ease-in-out dark:border-white/[0.08] dark:bg-[#111827]/95 dark:shadow-black/50',
          collapsed ? 'w-16' : 'w-[250px]',
          onClose && [
            'fixed left-2 top-2 z-50 h-[calc(100vh-16px)] shadow-2xl shadow-black/70',
            'animate-in slide-in-from-left-1/2 fade-in duration-200',
          ],
        )}
        role={onClose ? 'dialog' : undefined}
        aria-modal={onClose ? true : undefined}
        aria-label={onClose ? 'नेव्हिगेशन मेनू' : undefined}
      >
        {/* ── Ambient glow ── */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-teal-500/[0.05] blur-3xl" />

        {/* ── Brand Header (Approx 80-95px height) ── */}
        <div
          className={cn(
            'relative z-10 flex shrink-0 items-center border-b border-slate-200/80 transition-all duration-200 dark:border-white/[0.08]',
            collapsed ? 'h-[85px] justify-center px-2 py-3' : 'h-[85px] items-center px-4 py-3.5',
          )}
        >
          {collapsed ? (
            <img
              src="/logo.png"
              alt="SHRANIX"
              className="h-10 w-10 object-contain transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="flex w-full items-center gap-3">
              <img
                src="/logo.png"
                alt="SHRANIX"
                className="h-10 w-10 shrink-0 object-contain transition-transform duration-200 hover:scale-105"
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

        {/* ── Navigation Body (Clean, focused, 38px items) ── */}
        <nav className="sidebar-scrollbar-premium relative z-10 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {/* ⭐ आवडते (Favorites) */}
          {!collapsed && favoriteItems.length > 0 && (
            <div className="mb-1.5">
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
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
              <div className="mx-2 my-1 border-t border-slate-200/80 dark:border-white/[0.06]" />
            </div>
          )}

          {/* ── CORE PRIMARY MODULES ── */}
          {visiblePrimarySections.map((section) => (
            <NavSection
              key={section.label}
              section={section}
              isOpen={activeSection === section.label}
              onToggle={() => toggleSection(section.label)}
              collapsed={collapsed}
              locationPath={location.pathname}
              onNavigate={onClose}
            />
          ))}

          {/* ── SECONDARY EXPANDABLE "अधिक मॉड्यूल्स" (More) ── */}
          {!collapsed && visibleSecondaryModules.length > 0 && (
            <MoreModulesSection
              modules={visibleSecondaryModules}
              isOpen={moreOpen}
              onToggle={() => setMoreOpen((prev) => !prev)}
              locationPath={location.pathname}
              onNavigate={onClose}
            />
          )}

          {/* ── SYSTEM & SETTINGS SECTION (Separated below More) ── */}
          <div className="mt-1.5 border-t border-slate-200/80 pt-1.5 dark:border-white/[0.06]">
            {visibleSystemSections.map((section) => (
              <NavSection
                key={section.label}
                section={section}
                isOpen={activeSection === section.label}
                onToggle={() => toggleSection(section.label)}
                collapsed={collapsed}
                locationPath={location.pathname}
                onNavigate={onClose}
              />
            ))}
          </div>
        </nav>

        {/* ── Fixed Admin User Footer ── */}
        <div className="relative z-10">
          <PremiumFooter collapsed={collapsed} onToggle={onToggle} />
        </div>
      </aside>
    </>
  );
}
