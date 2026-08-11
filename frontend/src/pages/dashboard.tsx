import {
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  Leaf,
  Users,
  FileText,
  Truck,
  UserPlus,
  Box,
  ClipboardList,
  Bell,
  Mail,
  Shield,
  Sun,
  Droplets,
  Wind,
  MapPin,
  Star,
  Calendar,
  CreditCard,
  QrCode,
  Warehouse,
  Store,
  DollarSign,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Thermometer,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ExpiryAlertWidget } from '@/components/dashboard/ExpiryAlertWidget';
import { usePreferences } from '@/providers/preferences-provider';
import { apiRequest } from '@/services/api-client';

// ═══════════════════════════════════════════════════════════
// SAMPLE INVENTORY SUMMARY DATA
// ═══════════════════════════════════════════════════════════

const sampleInventorySummary = {
  totalProducts: 245,
  activeProducts: 198,
  nearExpiry: 12,
  expired: 3,
  lowStock: 8,
  outOfStock: 2,
  reservedStock: 35,
};

// ═══════════════════════════════════════════════════════════
// SAMPLE WEATHER DATA
// ═══════════════════════════════════════════════════════════

interface WeatherData {
  temperature: number;
  humidity: number;
  rainChance: number;
  windSpeed: number;
  condition: string;
  location: string;
}

const sampleWeather: WeatherData = {
  temperature: 32,
  humidity: 68,
  rainChance: 15,
  windSpeed: 12,
  condition: 'Partly Cloudy',
  location: 'Nashik, Maharashtra',
};

// ═══════════════════════════════════════════════════════════
// SAMPLE MANDI RATES DATA
// ═══════════════════════════════════════════════════════════

interface MandiRate {
  commodity: string;
  rate: number;
  unit: string;
  change: number;
  changePct: number;
  market: string;
}

const sampleMandiRates: MandiRate[] = [
  {
    commodity: 'Wheat (गहू)',
    rate: 2450,
    unit: 'quintal',
    change: 25,
    changePct: 1.0,
    market: 'Lasalgaon',
  },
  {
    commodity: 'Rice - Basmati (तांदूळ)',
    rate: 5200,
    unit: 'quintal',
    change: -75,
    changePct: -1.4,
    market: 'Lasalgaon',
  },
  {
    commodity: 'Onion (कांदा)',
    rate: 1850,
    unit: 'quintal',
    change: 120,
    changePct: 6.9,
    market: 'Nashik',
  },
  {
    commodity: 'Tomato (टोमॅटो)',
    rate: 980,
    unit: 'quintal',
    change: -45,
    changePct: -4.4,
    market: 'Nashik',
  },
  {
    commodity: 'Soybean (सोयाबीन)',
    rate: 4200,
    unit: 'ton',
    change: 150,
    changePct: 3.7,
    market: 'Lasalgaon',
  },
  {
    commodity: 'Cotton (कापूस)',
    rate: 7250,
    unit: 'quintal',
    change: -200,
    changePct: -2.7,
    market: 'Malegaon',
  },
];

// ═══════════════════════════════════════════════════════════
// SAMPLE ACTIVITIES DATA
// ═══════════════════════════════════════════════════════════

interface ActivityItem {
  type: string;
  text: string;
  subtitle: string;
  amount?: number;
  time: string;
  icon: any;
  color: string;
}

const sampleActivities: ActivityItem[] = [
  {
    type: 'sale',
    text: 'New Sale to GreenField Farms',
    subtitle: 'INV-2026-0108',
    amount: 45800,
    time: '2 min ago',
    icon: TrendingUp,
    color: 'blue',
  },
  {
    type: 'purchase',
    text: 'Purchase from AgriCorp Supplies',
    subtitle: 'PO-2026-0042',
    amount: 32500,
    time: '15 min ago',
    icon: Truck,
    color: 'emerald',
  },
  {
    type: 'stock',
    text: 'Stock Transfer to Warehouse B',
    subtitle: 'DAP Fertilizer - 50 bags',
    time: '1 hr ago',
    icon: Warehouse,
    color: 'purple',
  },
  {
    type: 'product',
    text: 'New Product Added: Bio Fungicide',
    subtitle: 'SKU: PEST-BIO-007',
    time: '2 hr ago',
    icon: Package,
    color: 'amber',
  },
  {
    type: 'customer',
    text: 'New Customer: Shri Ram Agrotech',
    subtitle: 'Credit limit: ₹50,000',
    time: '3 hr ago',
    icon: UserPlus,
    color: 'orange',
  },
  {
    type: 'payment',
    text: 'Payment Received from Balaji Ent.',
    subtitle: 'INV-2026-0105',
    amount: 52300,
    time: '5 hr ago',
    icon: DollarSign,
    color: 'green',
  },
];

// ═══════════════════════════════════════════════════════════
// SAMPLE TOP CUSTOMERS DATA
// ═══════════════════════════════════════════════════════════

interface TopCustomer {
  name: string;
  totalPurchases: number;
  visits: number;
  lastPurchase: string;
  status: 'active' | 'new' | 'vip';
}

const sampleTopCustomers: TopCustomer[] = [
  {
    name: 'GreenField Farms',
    totalPurchases: 245800,
    visits: 12,
    lastPurchase: '2026-07-28',
    status: 'vip',
  },
  {
    name: 'Shri Ram Agrotech',
    totalPurchases: 189200,
    visits: 8,
    lastPurchase: '2026-07-27',
    status: 'active',
  },
  {
    name: 'Balaji Enterprises',
    totalPurchases: 167500,
    visits: 9,
    lastPurchase: '2026-07-25',
    status: 'vip',
  },
  {
    name: 'Om Sai Traders',
    totalPurchases: 124800,
    visits: 6,
    lastPurchase: '2026-07-26',
    status: 'active',
  },
  {
    name: 'Krishi Solutions',
    totalPurchases: 98700,
    visits: 5,
    lastPurchase: '2026-07-24',
    status: 'new',
  },
];

// ═══════════════════════════════════════════════════════════
// SAMPLE NOTIFICATIONS DATA
// ═══════════════════════════════════════════════════════════

interface NotificationItem {
  type: string;
  text: string;
  count: number;
  icon: any;
  color: string;
  urgent: boolean;
}

const sampleNotifications: NotificationItem[] = [
  {
    type: 'approval',
    text: 'Purchase orders pending approval',
    count: 2,
    icon: ClipboardList,
    color: 'blue',
    urgent: false,
  },
  {
    type: 'gst',
    text: 'GST return due in 5 days',
    count: 1,
    icon: FileText,
    color: 'amber',
    urgent: true,
  },
  {
    type: 'expiry',
    text: 'Products expiring this week',
    count: 4,
    icon: Calendar,
    color: 'orange',
    urgent: true,
  },
  {
    type: 'lowstock',
    text: 'Items below reorder level',
    count: 8,
    icon: AlertTriangle,
    color: 'red',
    urgent: true,
  },
  {
    type: 'payment',
    text: 'Pending payments from customers',
    count: 3,
    icon: CreditCard,
    color: 'purple',
    urgent: false,
  },
];

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

const number = new Intl.NumberFormat('en-IN');

function formatCurrency(amount: number): string {
  return `₹${number.format(Math.round(amount))}`;
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${Math.round(amount)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return '—';
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ═══════════════════════════════════════════════════════════
// SPARKLINE SVG
// ═══════════════════════════════════════════════════════════

function Sparkline({
  data,
  color = '#10b981',
  height = 32,
  width = 72,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) {
    return null;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  const gradientId = `sg-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-label="Trend sparkline"
    >
      <title>Trend line</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradientId})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1].split(',')[0]}
        cy={pts[pts.length - 1].split(',')[1]}
        r={3}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
        className="drop-shadow-sm"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// HERO BANNER — Enterprise Deep Ocean Navy & Emerald
// ═══════════════════════════════════════════════════════════

const HERO_IMAGE_URL = '/assets/dashboard-bg.png';

function HeroBanner({ generatedAt }: { generatedAt: string }) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-br from-[#0C2338] via-[#0B1A33] to-[#163D63] text-white shadow-xl shadow-slate-950/20">
      {/* Background image treatment */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_IMAGE_URL}
          alt="Agricultural background"
          className="h-full w-full object-cover opacity-20 mix-blend-overlay"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C2338]/95 via-[#0B1A33]/85 to-transparent" />
      </div>

      {/* Decorative dot pattern */}
      <div className="pointer-events-none absolute right-8 top-8 z-0 opacity-[0.06]">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <pattern id="hero-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="white" />
          </pattern>
          <rect width="120" height="120" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* Radial glow overlay */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header Notification Action */}
      <div className="absolute right-5 top-5 z-20" ref={notifRef}>
        <button
          onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95"
          aria-label="Toggle notifications menu"
          aria-expanded={showNotifDropdown}
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#0C2338]">
            3
          </span>
        </button>

        {showNotifDropdown && (
          <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 top-full z-50 mt-3 w-80 rounded-2xl border border-white/15 bg-[#0C2338]/95 p-3 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-2.5 pt-1">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-emerald-400" />
                <p className="text-xs font-semibold text-white">System Notifications</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                3 New
              </span>
            </div>
            <div className="space-y-1.5 py-2">
              {[
                {
                  icon: FileText,
                  text: 'New purchase order #PO-2026-0042',
                  time: '2 min ago',
                  color: 'text-emerald-400 bg-emerald-500/10',
                },
                {
                  icon: Mail,
                  text: 'Invoice #INV-2026-0108 awaiting payment',
                  time: '15 min ago',
                  color: 'text-amber-400 bg-amber-500/10',
                },
                {
                  icon: AlertTriangle,
                  text: 'DAP Fertilizer stock below reorder level',
                  time: '1 hour ago',
                  color: 'text-red-400 bg-red-500/10',
                },
              ].map((notif, i) => {
                const NotifIcon = notif.icon;
                return (
                  <div
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5 transition-all duration-200 hover:bg-white/10"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${notif.color}`}
                    >
                      <NotifIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-slate-100">
                        {notif.text}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">{notif.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/10 pt-2 text-center">
              <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-white/5">
                <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
                View Notification Center
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Banner Content */}
      <div className="relative z-10 flex flex-col justify-center px-6 py-7 sm:px-10 sm:py-9">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10 backdrop-blur-md">
            <Leaf className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            SHRANIX Krushi ERP
          </span>
        </div>

        <h1 className="font-poppins mt-3.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
          🌾 स्वागत आहे, Admin!
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-300/90 sm:text-base">
          Good Morning! Here is your real-time agribusiness operational summary.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-medium text-slate-200 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            Default Company
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-medium text-slate-200 backdrop-blur-md">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            {generatedAt ? formatDate(generatedAt) : 'Today'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-300">
            FY 2026-27
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ENTERPRISE KPI CARD
// ═══════════════════════════════════════════════════════════

function KPICard({
  title,
  titleMr,
  value,
  change,
  icon: Icon,
  color = 'blue',
  trend,
  onClick,
}: {
  title: string;
  titleMr: string;
  value: string;
  change: { value: number; label: string } | null;
  icon: typeof TrendingUp;
  color?: string;
  trend?: number[];
  onClick?: () => void;
}) {
  const { preferences } = usePreferences();
  const isPositive = change !== null && change.value >= 0;

  const colorStyles: Record<
    string,
    {
      dot: string;
      iconBg: string;
      iconColor: string;
      badgeBg: string;
      badgeText: string;
    }
  > = {
    blue: {
      dot: '#2563EB',
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-900/50',
      badgeText: 'text-blue-700 dark:text-blue-300',
    },
    green: {
      dot: '#10B981',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg:
        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-900/50',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
    },
    emerald: {
      dot: '#10B981',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg:
        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-900/50',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
    },
    purple: {
      dot: '#8B5CF6',
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-900/50',
      badgeText: 'text-purple-700 dark:text-purple-300',
    },
    orange: {
      dot: '#F97316',
      iconBg: 'bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      badgeBg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/50 dark:border-orange-900/50',
      badgeText: 'text-orange-700 dark:text-orange-300',
    },
    amber: {
      dot: '#F59E0B',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-900/50',
      badgeText: 'text-amber-700 dark:text-amber-300',
    },
    red: {
      dot: '#EF4444',
      iconBg: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      badgeBg: 'bg-red-50 dark:bg-red-950/40 border-red-200/50 dark:border-red-900/50',
      badgeText: 'text-red-700 dark:text-red-300',
    },
  };
  const cs = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`group relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${
        onClick
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500'
          : ''
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${cs.iconBg} ${cs.iconColor} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              isPositive
                ? 'border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-red-200/60 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Titles */}
      <div className="mt-3 min-w-0">
        {preferences.language === 'mr' && (
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {titleMr}
          </p>
        )}
        <p
          className={`truncate ${preferences.language === 'mr' ? 'text-[11px] text-slate-400 dark:text-slate-500' : 'text-xs font-semibold text-slate-500 dark:text-slate-400'}`}
        >
          {title}
        </p>
      </div>

      {/* Main Metric Value */}
      <div className="mt-1.5 flex items-baseline justify-between">
        <p className="font-poppins text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
        {trend && trend.length > 1 && (
          <div className="ml-2 shrink-0">
            <Sparkline data={trend} color={cs.dot} height={24} width={56} />
          </div>
        )}
      </div>

      {/* Subtitle / Change Label */}
      {change && (
        <p className="mt-1 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {change.label}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DAILY OVERVIEW CHART — Refined Area Chart
// ═══════════════════════════════════════════════════════════

function DailyOverviewChart({
  monthlySeries,
}: {
  monthlySeries: Array<{ month: string; sales: number; purchases: number }>;
}) {
  if (!monthlySeries || monthlySeries.length < 2) {
    return null;
  }

  const maxVal = Math.max(...monthlySeries.flatMap((m) => [m.sales, m.purchases]), 1);
  const yMax = Math.ceil(maxVal / 5000) * 5000;
  const chartH = 160;
  const chartW = 100;

  const salesPoints = monthlySeries.map((m, i) => ({
    x: ((i / (monthlySeries.length - 1)) * chartW).toFixed(1),
    y: (chartH - (m.sales / yMax) * chartH * 0.85).toFixed(1),
  }));
  const purchasePoints = monthlySeries.map((m, i) => ({
    x: ((i / (monthlySeries.length - 1)) * chartW).toFixed(1),
    y: (chartH - (m.purchases / yMax) * chartH * 0.85).toFixed(1),
  }));

  const salesD = `M ${salesPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const purchaseD = `M ${purchasePoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaSalesD = `${salesD} L ${chartW},${chartH} L 0,${chartH} Z`;
  const areaPurchaseD = `${purchaseD} L ${chartW},${chartH} L 0,${chartH} Z`;

  const yLabels = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].map((v) => ({
    value: v,
    y: chartH - (v / yMax) * chartH * 0.85,
  }));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Daily Overview
          </h3>
          <p className="text-xs font-medium text-slate-400">दैनंदिन विक्री व खरेदी आढावा</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="h-3 w-3 rounded-full bg-blue-600 shadow-sm" />
            Vikri (Sales)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="h-3 w-3 rounded-full bg-emerald-600 shadow-sm" />
            Kharedi (Purchase)
          </span>
        </div>
      </div>

      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 20}`}
          className="h-48 w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          {yLabels.map((label) => (
            <line
              key={label.value}
              x1="0"
              y1={label.y}
              x2={chartW}
              y2={label.y}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth={0.5}
              strokeDasharray="2 2"
            />
          ))}

          <path d={areaSalesD} fill="url(#salesGrad)" />
          <path d={areaPurchaseD} fill="url(#purchaseGrad)" />

          <path
            d={salesD}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={purchaseD}
            fill="none"
            stroke="#10B981"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {salesPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="#2563EB"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          ))}
          {purchasePoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="#10B981"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        <div className="mt-2 flex justify-between border-t border-slate-100 px-1 pt-2 dark:border-slate-800">
          {monthlySeries.map((m) => (
            <span key={m.month} className="text-xs font-medium text-slate-400">
              {m.month.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOP PRODUCTS TABLE
// ═══════════════════════════════════════════════════════════

const TopProductsData = [
  { name: 'DAP Fertilizer 50kg', qty: 45, sales: 234500 },
  { name: 'Urea Fertilizer 50kg', qty: 38, sales: 114000 },
  { name: 'NPK 12:32:16 Bag', qty: 22, sales: 83600 },
  { name: 'Pesticide Bio Gold', qty: 18, sales: 75600 },
  { name: 'Potash Fertilizer 25kg', qty: 15, sales: 52500 },
];

const rankBadgeStyles = [
  'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
  'bg-slate-400 text-white shadow-sm shadow-slate-400/30',
  'bg-amber-700 text-white shadow-sm shadow-amber-700/30',
  'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
];

function TopProductsTable() {
  const maxQty = Math.max(...TopProductsData.map((p) => p.qty), 1);
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Top Selling Products
          </h3>
          <p className="text-xs font-medium text-slate-400">आजची सर्वाधिक विक्री झालेली उत्पादने</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
              <th className="w-8 pb-2.5 font-semibold">#</th>
              <th className="pb-2.5 font-semibold">Product Name</th>
              <th className="pb-2.5 text-right font-semibold">Volume</th>
              <th className="pb-2.5 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {TopProductsData.map((product, i) => (
              <tr
                key={i}
                className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
              >
                <td className="py-3">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${rankBadgeStyles[i] || rankBadgeStyles[4]}`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                  {product.name}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(product.qty / maxQty) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {product.qty}
                    </span>
                  </div>
                </td>
                <td className="font-poppins py-3 text-right font-bold text-slate-900 dark:text-white">
                  {formatCurrency(product.sales)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOW STOCK WIDGET
// ═══════════════════════════════════════════════════════════

const sampleLowStockFull = [
  {
    name: 'DAP Fertilizer 50kg',
    sku: 'FERT-DAP-001',
    currentStock: 0,
    reorderLevel: 50,
    status: 'out' as const,
  },
  {
    name: 'Urea Fertilizer 50kg',
    sku: 'FERT-UREA-002',
    currentStock: 8,
    reorderLevel: 40,
    status: 'low' as const,
  },
  {
    name: 'NPK 12:32:16 Bag',
    sku: 'FERT-NPK-003',
    currentStock: 3,
    reorderLevel: 30,
    status: 'critical' as const,
  },
  {
    name: 'Pesticide Bio Gold',
    sku: 'PEST-GLD-004',
    currentStock: 5,
    reorderLevel: 25,
    status: 'critical' as const,
  },
  {
    name: 'Potash Fertilizer 25kg',
    sku: 'FERT-POT-005',
    currentStock: 0,
    reorderLevel: 20,
    status: 'out' as const,
  },
  {
    name: 'Weedicide Pro Liquid',
    sku: 'PEST-WED-006',
    currentStock: 2,
    reorderLevel: 15,
    status: 'critical' as const,
  },
];

function LowStockWidget() {
  const outOfStock = sampleLowStockFull.filter((i) => i.status === 'out');
  const critical = sampleLowStockFull.filter((i) => i.status === 'critical');
  const low = sampleLowStockFull.filter((i) => i.status === 'low');

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Inventory Stock Alerts
          </h3>
          <p className="text-xs font-medium text-slate-400">स्टॉक इशारा व पुनर्साठा पातळी</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {outOfStock.length + critical.length} Alerts
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-red-100 bg-red-50/80 p-2.5 dark:border-red-900/30 dark:bg-red-950/30">
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{outOfStock.length}</p>
          <p className="text-[10px] font-semibold text-red-600/80 dark:text-red-300">
            Out of Stock
          </p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50/80 p-2.5 dark:border-orange-900/30 dark:bg-orange-950/30">
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {critical.length}
          </p>
          <p className="text-[10px] font-semibold text-orange-600/80 dark:text-orange-300">
            Critical
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-2.5 dark:border-amber-900/30 dark:bg-amber-950/30">
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{low.length}</p>
          <p className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-300">
            Low Stock
          </p>
        </div>
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {sampleLowStockFull.map((item, i) => {
          const isOut = item.status === 'out';
          const isCrit = item.status === 'critical';
          const statusBadge = isOut
            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50'
            : isCrit
              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900/50'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50';

          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 transition-all duration-200 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </p>
                  <span
                    className={`py-0.25 rounded-md border px-1.5 text-[10px] font-bold ${statusBadge}`}
                  >
                    {isOut ? 'Out' : isCrit ? 'Critical' : 'Low'}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400">{item.sku}</p>
              </div>
              <div className="ml-2 shrink-0 text-right">
                <p className="font-poppins text-xs font-extrabold text-slate-900 dark:text-white">
                  {item.currentStock}
                </p>
                <p className="text-[10px] text-slate-400">reorder: {item.reorderLevel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WEATHER WIDGET
// ═══════════════════════════════════════════════════════════

function WeatherWidget() {
  const weather = sampleWeather;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Agri Weather
          </h3>
          <p className="text-xs font-medium text-slate-400">हवामान अंदाज</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-emerald-500" /> {weather.location}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3.5 rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
          <Sun className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-poppins text-2xl font-extrabold text-slate-900 dark:text-white">
            {weather.temperature}°C
          </p>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {weather.condition}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-2.5 text-center dark:border-blue-900/30 dark:bg-blue-950/20">
          <Droplets
            className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-400"
            strokeWidth={1.75}
          />
          <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
            {weather.humidity}%
          </p>
          <p className="text-[10px] font-medium text-slate-400">Humidity</p>
        </div>
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/80 p-2.5 text-center dark:border-cyan-900/30 dark:bg-cyan-950/20">
          <Thermometer
            className="mx-auto h-4 w-4 text-cyan-600 dark:text-cyan-400"
            strokeWidth={1.75}
          />
          <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
            {weather.rainChance}%
          </p>
          <p className="text-[10px] font-medium text-slate-400">Rain Risk</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-2.5 text-center dark:border-teal-900/30 dark:bg-teal-950/20">
          <Wind className="mx-auto h-4 w-4 text-teal-600 dark:text-teal-400" strokeWidth={1.75} />
          <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
            {weather.windSpeed} km/h
          </p>
          <p className="text-[10px] font-medium text-slate-400">Wind</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MANDI RATES WIDGET
// ═══════════════════════════════════════════════════════════

function MandiRatesWidget() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Live Mandi Rates
          </h3>
          <p className="text-xs font-medium text-slate-400">आजचे कृषी बाजार भाव</p>
        </div>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          लासलगाव · नाशिक
        </span>
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {sampleMandiRates.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-slate-200/60 hover:bg-slate-50 dark:hover:border-slate-700/60 dark:hover:bg-slate-800/40"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Store
                className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.commodity}
                </p>
                <p className="text-[10px] text-slate-400">
                  {item.market} · /{item.unit}
                </p>
              </div>
            </div>
            <div className="ml-2 shrink-0 text-right">
              <p className="font-poppins text-xs font-bold text-slate-900 dark:text-white">
                ₹{number.format(item.rate)}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                  item.change >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {item.change >= 0 ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {item.changePct >= 0 ? '+' : ''}
                {item.changePct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INVENTORY SUMMARY WIDGET
// ═══════════════════════════════════════════════════════════

function InventorySummaryWidget() {
  const inv = sampleInventorySummary;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Inventory Overview
          </h3>
          <p className="text-xs font-medium text-slate-400">इन्व्हेंटरी साठा वर्गीकरण</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <p className="font-poppins text-xl font-extrabold text-slate-900 dark:text-white">
            {inv.totalProducts}
          </p>
          <p className="text-xs font-medium text-slate-500">Total SKU Items</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <p className="font-poppins text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {inv.activeProducts}
          </p>
          <p className="text-xs font-medium text-emerald-600/80 dark:text-emerald-300">
            Active Stock
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
          <p className="font-poppins text-xl font-extrabold text-amber-600 dark:text-amber-400">
            {inv.nearExpiry}
          </p>
          <p className="text-xs font-medium text-amber-600/80 dark:text-amber-300">Near Expiry</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/80 p-3 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="font-poppins text-xl font-extrabold text-red-600 dark:text-red-400">
            {inv.expired}
          </p>
          <p className="text-xs font-medium text-red-600/80 dark:text-red-300">Expired Stock</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50/80 p-3 dark:border-orange-900/30 dark:bg-orange-950/20">
          <p className="font-poppins text-xl font-extrabold text-orange-600 dark:text-orange-400">
            {inv.lowStock}
          </p>
          <p className="text-xs font-medium text-orange-600/80 dark:text-orange-300">Low Stock</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50/80 p-3 dark:border-purple-900/30 dark:bg-purple-950/20">
          <p className="font-poppins text-xl font-extrabold text-purple-600 dark:text-purple-400">
            {inv.outOfStock}
          </p>
          <p className="text-xs font-medium text-purple-600/80 dark:text-purple-300">
            Out of Stock
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RECENT ACTIVITY TIMELINE
// ═══════════════════════════════════════════════════════════

const activityColors: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
  emerald:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
  purple:
    'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20',
  amber:
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
  orange:
    'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20',
  green:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
};

function RecentActivityTimeline() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Recent Transaction Log
          </h3>
          <p className="text-xs font-medium text-slate-400">अलीकडील प्रणाली व्यवहार</p>
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative space-y-3">
        {sampleActivities.map((act, i) => {
          const ActIcon = act.icon;
          return (
            <div
              key={i}
              className="group flex items-start gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${activityColors[act.color] || activityColors.blue}`}
              >
                <ActIcon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {act.text}
                  </p>
                  <span className="ml-2 shrink-0 text-[10px] font-medium text-slate-400">
                    {act.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{act.subtitle}</p>
              </div>
              {act.amount && (
                <div className="shrink-0 text-right">
                  <p className="font-poppins text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(act.amount)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOP CUSTOMERS WIDGET
// ═══════════════════════════════════════════════════════════

function TopCustomersWidget() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Top Customer Accounts
          </h3>
          <p className="text-xs font-medium text-slate-400">उच्च-मूल्य ग्राहक खाते</p>
        </div>
      </div>
      <div className="space-y-2">
        {sampleTopCustomers.map((customer, i) => {
          const rankColors = ['#F59E0B', '#94A3B8', '#D97706', '#CBD5E1', '#E2E8F0'];
          const isVIP = customer.status === 'vip';
          const isNew = customer.status === 'new';

          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/40 p-2.5 transition-all duration-200 hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800/60"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: rankColors[i] }}
                  >
                    {i + 1}
                  </div>
                  {isVIP && (
                    <Star
                      className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-amber-400 text-amber-400"
                      strokeWidth={1}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {customer.name}
                    </p>
                    {isNew && (
                      <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                        New
                      </span>
                    )}
                    {isVIP && (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {customer.visits} visits · Last: {formatDate(customer.lastPurchase)}
                  </p>
                </div>
              </div>
              <div className="ml-2 shrink-0 text-right">
                <p className="font-poppins text-xs font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(customer.totalPurchases)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS PANEL
// ═══════════════════════════════════════════════════════════

const notifColors: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
  red: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
};

function NotificationsPanel() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
            Critical System Alerts
          </h3>
          <p className="text-xs font-medium text-slate-400">प्रणाली सूचना व इशारे</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Bell className="h-3.5 w-3.5" />
          {sampleNotifications.filter((n) => n.urgent).length} Urgent
        </span>
      </div>
      <div className="space-y-2">
        {sampleNotifications.map((notif, i) => {
          const NotifIcon = notif.icon;
          return (
            <div
              key={i}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-2.5 transition-all duration-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${notifColors[notif.color] || notifColors.blue}`}
                >
                  <NotifIcon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {notif.text}
                </p>
              </div>
              <span
                className={`ml-2 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-2 text-xs font-extrabold ${
                  notif.urgent
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {notif.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUICK ACTIONS PANEL
// ═══════════════════════════════════════════════════════════

const quickActions = [
  {
    label: 'New Sale',
    labelMr: 'नवीन विक्री',
    icon: TrendingUp,
    color: 'blue',
    path: '/sales/invoices',
  },
  {
    label: 'New Purchase',
    labelMr: 'नवीन खरेदी',
    icon: Truck,
    color: 'emerald',
    path: '/purchase/orders',
  },
  {
    label: 'New Product',
    labelMr: 'नवीन उत्पादन',
    icon: Box,
    color: 'amber',
    path: '/inventory/products',
  },
  {
    label: 'New Customer',
    labelMr: 'नवीन ग्राहक',
    icon: UserPlus,
    color: 'purple',
    path: '/customers',
  },
  {
    label: 'New Supplier',
    labelMr: 'नवीन पुरवठादार',
    icon: Store,
    color: 'orange',
    path: '/suppliers',
  },
  {
    label: 'Stock Transfer',
    labelMr: 'स्टॉक हस्तांतरण',
    icon: Warehouse,
    color: 'cyan',
    path: '/inventory/stock-transfer',
  },
  {
    label: 'Print Barcode',
    labelMr: 'बारकोड प्रिंट',
    icon: QrCode,
    color: 'slate',
    path: '/inventory/barcodes',
  },
];

const actionColors: Record<string, { bg: string; icon: string }> = {
  blue: {
    bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-900',
    icon: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  },
  emerald: {
    bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-900',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  amber: {
    bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-900',
    icon: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  },
  purple: {
    bg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-900',
    icon: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  },
  orange: {
    bg: 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-200 dark:hover:border-orange-900',
    icon: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  },
  cyan: {
    bg: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-200 dark:hover:border-cyan-900',
    icon: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
  },
  slate: {
    bg: 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
    icon: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
  },
};

function QuickActionsPanel() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
        <h3 className="font-poppins text-base font-bold text-slate-900 dark:text-white">
          Quick Actions Hub
        </h3>
        <p className="text-xs font-medium text-slate-400">द्रुत व्यापार कृती</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const ActionIcon = action.icon;
          const c = actionColors[action.color] || actionColors.slate;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/40 p-2.5 text-left transition-all duration-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800/30 ${c.bg} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent transition-transform duration-200 group-hover:scale-105 ${c.icon}`}
              >
                <ActionIcon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {action.labelMr}
                </p>
                <p className="truncate text-[10px] font-medium text-slate-400">{action.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════

export function DashboardPage() {
  const navigate = useNavigate();
  const { preferences } = usePreferences();

  const sampleKPIs = {
    revenue: { value: 0, change: null as number | null, period: 'today' },
    purchases: { value: 0, change: null as number | null, period: 'today' },
    inventoryValue: 0,
    pendingApprovals: 0,
    todayInvoiceCount: 0,
  };

  const [kpiData, setKpiData] = useState(sampleKPIs);

  useEffect(() => {
    apiRequest<any>('/dashboard')
      .then((res) => {
        const k = res?.kpis;
        if (k) {
          setKpiData({
            revenue: {
              value: Number(k.today?.value ?? 0) || 0,
              change: k.today?.change ?? null,
              period: 'today',
            },
            purchases: {
              value: Number(k.todayPurchase?.value ?? 0) || 0,
              change: k.todayPurchase?.change ?? null,
              period: 'today',
            },
            inventoryValue: Number(k.inventoryValue || 0),
            pendingApprovals: Number(k.pendingApprovals || 0),
            todayInvoiceCount: Number(k.todayInvoiceCount || 0),
          });
        }
      })
      .catch((err) => console.warn('[Dashboard] KPI fetch failed:', (err as Error).message));
  }, []);

  const salesTrend = [42000, 38000, 51000, 46000, 48000, 52000, 49500];
  const purchaseTrend = [28000, 32000, 29000, 35000, 31000, 37000, 34000];

  return (
    <div className="animate-in fade-in space-y-6 pb-8 duration-300">
      {/* ROW 1: HERO BANNER */}
      {preferences.widgets.heroBanner && <HeroBanner generatedAt={'Today'} />}

      {/* ROW 2: TODAY'S SUMMARY — KPI Cards */}
      {preferences.widgets.kpis && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <KPICard
            title="Today's Sales"
            titleMr="आजची विक्री"
            value={formatCompactCurrency(kpiData.revenue.value)}
            change={
              kpiData.revenue.change !== null
                ? { value: kpiData.revenue.change, label: 'vs yesterday' }
                : null
            }
            icon={TrendingUp}
            color="blue"
            trend={salesTrend}
            onClick={() => navigate('/sales/invoices')}
          />
          <KPICard
            title="Today's Purchase"
            titleMr="आजची खरेदी"
            value={formatCompactCurrency(kpiData.purchases.value)}
            change={
              kpiData.purchases.change !== null
                ? { value: kpiData.purchases.change, label: 'vs yesterday' }
                : null
            }
            icon={ShoppingCart}
            color="green"
            trend={purchaseTrend}
            onClick={() => navigate('/purchase/orders')}
          />
          <KPICard
            title="Today's Invoices"
            titleMr="आजचे इनव्हॉइस"
            value={String(kpiData.todayInvoiceCount)}
            change={null}
            icon={FileText}
            color="emerald"
            onClick={() => navigate('/sales/invoices')}
          />
          <KPICard
            title="Total Customers"
            titleMr="एकूण ग्राहक"
            value={'1,236'}
            change={{ value: 18, label: 'new this month' }}
            icon={Users}
            color="orange"
          />
          <KPICard
            title="Total Suppliers"
            titleMr="एकूण पुरवठादार"
            value="48"
            change={{ value: 2, label: 'new this month' }}
            icon={Truck}
            color="purple"
          />
          <KPICard
            title="Total Products"
            titleMr="एकूण उत्पादने"
            value={number.format(245)}
            change={{ value: 12, label: 'active products' }}
            icon={Package}
            color="blue"
          />
          <KPICard
            title="Stock Value"
            titleMr="स्टॉक मूल्य"
            value="₹1.2Cr"
            change={{ value: 5.6, label: 'vs last month' }}
            icon={Warehouse}
            color="amber"
          />
          <KPICard
            title="Pending Orders"
            titleMr="प्रलंबित ऑर्डर"
            value="18"
            change={{ value: -8.3, label: 'reduced' }}
            icon={ClipboardList}
            color="red"
          />
        </div>
      )}

      {/* ROW 3: EXPIRY ALERT + LOW STOCK */}
      {preferences.widgets.stockAlerts && (
        <div className="grid gap-5 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <ExpiryAlertWidget />
          </div>
          <div className="lg:col-span-2">
            <LowStockWidget />
          </div>
        </div>
      )}

      {/* ROW 4: WEATHER + MANDI RATES + RECENT ACTIVITY */}
      {(preferences.widgets.weather || preferences.widgets.activity) && (
        <div className="grid gap-5 lg:grid-cols-4">
          {preferences.widgets.weather && (
            <div className="lg:col-span-1">
              <WeatherWidget />
            </div>
          )}
          {preferences.widgets.weather && (
            <div className="lg:col-span-1">
              <MandiRatesWidget />
            </div>
          )}
          {preferences.widgets.activity && (
            <div className="lg:col-span-2">
              <RecentActivityTimeline />
            </div>
          )}
        </div>
      )}

      {/* ROW 5: INVENTORY SUMMARY + NOTIFICATIONS */}
      {(preferences.widgets.inventorySummary || preferences.widgets.notifications) && (
        <div className="grid gap-5 lg:grid-cols-4">
          {preferences.widgets.inventorySummary && (
            <div className="lg:col-span-2">
              <InventorySummaryWidget />
            </div>
          )}
          {preferences.widgets.notifications && (
            <div className="lg:col-span-2">
              <NotificationsPanel />
            </div>
          )}
        </div>
      )}

      {/* ROW 6: DAILY OVERVIEW CHART + QUICK ACTIONS */}
      {preferences.widgets.overviewChart && (
        <div className="grid gap-5 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <DailyOverviewChart
              monthlySeries={[
                { month: 'Feb', sales: 42000, purchases: 28000 },
                { month: 'Mar', sales: 38000, purchases: 32000 },
                { month: 'Apr', sales: 51000, purchases: 29000 },
                { month: 'May', sales: 46000, purchases: 35000 },
                { month: 'Jun', sales: 48000, purchases: 31000 },
                { month: 'Jul', sales: 52000, purchases: 37000 },
                { month: 'Aug', sales: 49500, purchases: 34000 },
              ]}
            />
          </div>
          <div className="lg:col-span-1">
            <QuickActionsPanel />
          </div>
        </div>
      )}

      {/* ROW 7: TOP PRODUCTS + TOP CUSTOMERS */}
      {preferences.widgets.topProducts && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TopProductsTable />
          <TopCustomersWidget />
        </div>
      )}
    </div>
  );
}
