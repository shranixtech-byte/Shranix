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
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { hasModuleAccess } from '@/lib/module-access';
import { cn } from '@/lib/utils';

import { Logo } from './brand/Logo';

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
    items: [{ label: 'ग्राहक', icon: 'Users', path: '/customers' }],
  },
  {
    label: 'पुरवठादार',
    icon: 'Truck',
    module: 'suppliers',
    items: [{ label: 'पुरवठादार', icon: 'Truck', path: '/suppliers' }],
  },
  {
    label: 'उत्पादने',
    icon: 'Boxes',
    module: 'products',
    items: [
      { label: 'उत्पादने', icon: 'Boxes', path: '/inventory/products' },
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
    label: 'एसएमएस / ईमेल',
    icon: 'MessageSquare',
    module: 'communication',
    items: [{ label: 'एसएमएस / ईमेल', icon: 'MessageSquare', path: '/sms' }],
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
  Star,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
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
    () => item.children?.some((child) => child.path === locationPath) ?? false,
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
          'flex w-full items-center gap-3 rounded-xl transition-all duration-200',
          'h-10 px-3',
          'font-poppins text-sm font-medium',
          isOpen || isActive
            ? 'text-white'
            : 'text-[#8899B0] hover:bg-[#163D63] hover:text-[#E0E6ED]',
        )}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          strokeWidth={2}
        />
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </span>
        <span className="flex-1 truncate text-left">{item.label}</span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[50vh]' : 'max-h-0',
        )}
      >
        <div className="ml-3 space-y-1 border-l border-white/[0.06] py-1 pl-3">
          {item.children?.map((child) => (
            <NavItemLink key={child.path} item={child} onNavigate={onNavigate} />
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
  showPin,
  isPinned,
  onTogglePin,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  showPin?: boolean;
  isPinned?: boolean;
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
        className={({ isActive }) =>
          cn(
            'mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
            isActive
              ? 'sidebar-premium-active sidebar-premium-text'
              : 'text-[#A7B4C8] hover:bg-[#163D63] hover:text-white',
          )
        }
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'sidebar-menu-item',
          isActive && 'active',
          !isActive && 'hover:bg-[#163D63] hover:text-white',
        )
      }
    >
      <Icon className="sidebar-menu-icon" strokeWidth={1.5} />
      <span className="flex-1 truncate">{item.label}</span>
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
              isPinned ? 'fill-amber-400 text-amber-400' : 'text-[#5A6B82]',
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

  // Check if any item (or its children) matches current path
  const isSectionActive = useMemo(() => {
    const allItems = flattenItems(section.items);
    return allItems.some((i) => i.path === locationPath);
  }, [section.items, locationPath]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {flattenItems(section.items).map((item) => (
          <NavItemLink
            key={item.path || item.label}
            item={item}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  // ── Single-item sections with direct path → render as NavLink (no accordion) ──
  const isDirectLink =
    section.items.length === 1 && !section.items[0].children && section.items[0].path;

  if (isDirectLink) {
    const directItem = section.items[0];
    return (
      <NavLink
        to={directItem.path!}
        end={directItem.path === '/'}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn('sidebar-menu-item w-full', isActive && 'active', !isActive && 'text-[#A7B4C8]')
        }
      >
        <Icon className="sidebar-menu-icon" strokeWidth={1.5} />
        <span className="flex-1 truncate text-left">{section.label}</span>
      </NavLink>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Section Button */}
      <button
        onClick={onToggle}
        className={cn(
          'sidebar-menu-item w-full',
          isSectionActive && !isOpen && 'active',
          !isSectionActive && 'text-[#A7B4C8]',
        )}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <Icon className="sidebar-menu-icon" strokeWidth={1.5} />
        <span className="flex-1 truncate text-left">{section.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[#5A6B82] transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>

      {/* Sub-items accordion */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[500px]' : 'max-h-0',
        )}
      >
        <div className="ml-2 space-y-1 border-l border-white/[0.06] py-1 pl-2">
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
                showPin
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
      className="animate-in slide-in-from-left-1 fade-in fixed left-14 top-0 z-50 h-full w-64 rounded-r-xl border-r border-white/[0.06] shadow-2xl shadow-black/50 duration-200"
      style={{ background: '#163D63' }}
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
  const [expanded, setExpanded] = useState(false);

  if (collapsed) {
    return (
      <div className="relative z-10 flex flex-col items-center border-t border-white/[0.06] pb-3 pt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#A7B4C8] transition-all duration-200 hover:bg-[#163D63] hover:text-white"
          title="सहाय्य"
        >
          <Headset className="h-5 w-5" strokeWidth={1.5} />
        </button>
        {expanded && (
          <div
            className="absolute bottom-full left-0 right-0 mx-2 mb-2 rounded-xl border border-white/[0.06] p-3 shadow-xl"
            style={{ background: '#0C2338' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Headset className="h-4 w-4 text-[#1E88E5]" strokeWidth={1.5} />
              <span
                className="text-xs font-medium text-white"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                SHRANIX काळजी
              </span>
            </div>
            <div className="space-y-1 text-[10px] text-[#8899B0]">
              <p>+91-XXXXXXXXXX</p>
              <p>support@shranix.com</p>
            </div>
            <div className="mt-2 border-t border-white/[0.06] pt-2 text-[9px] text-[#5A6B82]">
              v1.0.0
            </div>
          </div>
        )}
        <div className="mt-1 text-[8px] text-[#5A6B82]">v1.0.0</div>
      </div>
    );
  }

  return (
    <div className="relative z-10 border-t border-white/[0.06]">
      {/* Agriculture-themed subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234CAF50' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative px-3 py-3">
        {/* Support Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#8899B0] transition-all duration-200 hover:bg-[#163D63] hover:text-white"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <Headset className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">SHRANIX काळजी</span>
          <ChevronDown
            className={cn(
              'ml-auto h-3 w-3 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            strokeWidth={2}
          />
        </button>

        {/* Expanded Support Details */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-out',
            expanded ? 'max-h-32' : 'max-h-0',
          )}
        >
          <div className="space-y-1 px-2 py-1.5">
            <div className="flex items-center gap-2 text-[11px] text-[#8899B0]">
              <span className="text-[#5A6B82]">📞</span>
              <span>+91-XXXXXXXXXX</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#8899B0]">
              <span className="text-[#5A6B82]">✉</span>
              <span>support@shranix.com</span>
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="mt-1 flex items-center justify-between px-2">
          <span
            className="text-[9px] font-medium text-[#5A6B82]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            v1.0.0
          </span>
          <button
            onClick={toggleFn}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#5A6B82] transition-all duration-200 hover:bg-[#163D63] hover:text-white"
            title="बाजूची पट्टी लपवा"
          >
            <PanelRightClose className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
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

  // ── Module-wise access — ticked modules ke alawa sab hidden ──
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
      if (allLeafItems.some((i) => i.path === location.pathname)) {
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
        style={{ background: '#0C2338' }}
        className={cn(
          'relative flex flex-col',
          'shrink-0 transition-all duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          onClose && [
            'fixed left-0 top-0 z-50 h-full shadow-2xl shadow-black/50',
            'animate-in slide-in-from-left-1/2 fade-in duration-200',
          ],
        )}
        role={onClose ? 'dialog' : undefined}
        aria-modal={onClose ? true : undefined}
        aria-label={onClose ? 'नेव्हिगेशन मेनू' : undefined}
      >
        {/* ── Ambient glow effects ── */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#1E88E5]/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-40 w-40 rounded-full bg-[#1E88E5]/[0.04] blur-3xl" />

        {/* ── Brand Header ── */}
        <div
          className={cn(
            'relative z-10 flex shrink-0 items-center justify-center border-b border-white/[0.06]',
            collapsed ? 'h-24' : 'h-28 px-4',
          )}
        >
          {collapsed ? <Logo variant="icon-only" /> : <Logo variant="sidebar" />}
        </div>

        {/* ── Navigation Body ── */}
        <nav className="sidebar-scrollbar-premium relative z-10 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {/* ⭐ आवडते */}
          {!collapsed && favoriteItems.length > 0 && (
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#A7B4C8]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <Star className="h-3 w-3 text-amber-400/60" strokeWidth={1.5} />
                आवडते
              </div>
              <div className="space-y-0.5">
                {favoriteItems.map((item) => (
                  <NavItemLink key={item.path} item={item} onNavigate={onClose} />
                ))}
              </div>
              <div className="mx-2 my-1 border-t border-white/[0.04]" />
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
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-48 overflow-hidden opacity-[0.07]">
          <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
            <path
              d="M0,150 C30,140 60,160 90,145 C120,130 150,110 180,125 C210,140 240,155 270,140 C300,125 330,110 360,130 C390,150 400,145 400,145 L400,200 L0,200 Z"
              fill="#4CAF50"
            />
            <circle cx="80" cy="100" r="15" fill="#8BC34A" opacity="0.5" />
            <circle cx="200" cy="80" r="12" fill="#8BC34A" opacity="0.4" />
            <circle cx="320" cy="110" r="18" fill="#8BC34A" opacity="0.3" />
            <path
              d="M120,120 Q130,95 140,120"
              stroke="#8BC34A"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M260,100 Q270,75 280,100"
              stroke="#8BC34A"
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
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
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-400/60">
              <Star className="h-3 w-3" strokeWidth={1.5} />
              आवडते
            </div>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => (
                <NavItemLink key={item.path} item={item} />
              ))}
            </div>
            <div className="mx-2 my-1 border-t border-white/[0.04]" />
          </div>
        )}

        {visibleSections.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-[#8899B0]">
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
