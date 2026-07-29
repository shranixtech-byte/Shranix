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
  { commodity: 'Wheat', rate: 2450, unit: 'quintal', change: 25, changePct: 1.0, market: 'Lasalgaon' },
  { commodity: 'Rice (Basmati)', rate: 5200, unit: 'quintal', change: -75, changePct: -1.4, market: 'Lasalgaon' },
  { commodity: 'Onion', rate: 1850, unit: 'quintal', change: 120, changePct: 6.9, market: 'Nashik' },
  { commodity: 'Tomato', rate: 980, unit: 'quintal', change: -45, changePct: -4.4, market: 'Nashik' },
  { commodity: 'Soybean', rate: 4200, unit: 'ton', change: 150, changePct: 3.7, market: 'Lasalgaon' },
  { commodity: 'Cotton', rate: 7250, unit: 'quintal', change: -200, changePct: -2.7, market: 'Malegaon' },
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
  { type: 'sale', text: 'New Sale to GreenField Farms', subtitle: 'INV-2026-0108', amount: 45800, time: '2 min ago', icon: TrendingUp, color: 'blue' },
  { type: 'purchase', text: 'Purchase from AgriCorp Supplies', subtitle: 'PO-2026-0042', amount: 32500, time: '15 min ago', icon: Truck, color: 'emerald' },
  { type: 'stock', text: 'Stock Transfer to Warehouse B', subtitle: 'DAP Fertilizer - 50 bags', time: '1 hr ago', icon: Warehouse, color: 'purple' },
  { type: 'product', text: 'New Product Added: Bio Fungicide', subtitle: 'SKU: PEST-BIO-007', time: '2 hr ago', icon: Package, color: 'amber' },
  { type: 'customer', text: 'New Customer: Shri Ram Agrotech', subtitle: 'Credit limit: ₹50,000', time: '3 hr ago', icon: UserPlus, color: 'orange' },
  { type: 'payment', text: 'Payment Received from Balaji Ent.', subtitle: 'INV-2026-0105', amount: 52300, time: '5 hr ago', icon: DollarSign, color: 'green' },
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
  { name: 'GreenField Farms', totalPurchases: 245800, visits: 12, lastPurchase: '2026-07-28', status: 'vip' },
  { name: 'Shri Ram Agrotech', totalPurchases: 189200, visits: 8, lastPurchase: '2026-07-27', status: 'active' },
  { name: 'Balaji Enterprises', totalPurchases: 167500, visits: 9, lastPurchase: '2026-07-25', status: 'vip' },
  { name: 'Om Sai Traders', totalPurchases: 124800, visits: 6, lastPurchase: '2026-07-26', status: 'active' },
  { name: 'Krishi Solutions', totalPurchases: 98700, visits: 5, lastPurchase: '2026-07-24', status: 'new' },
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
  { type: 'approval', text: 'Purchase orders pending approval', count: 2, icon: ClipboardList, color: 'blue', urgent: false },
  { type: 'gst', text: 'GST return due in 5 days', count: 1, icon: FileText, color: 'amber', urgent: true },
  { type: 'expiry', text: 'Products expiring this week', count: 4, icon: Calendar, color: 'orange', urgent: true },
  { type: 'lowstock', text: 'Items below reorder level', count: 8, icon: AlertTriangle, color: 'red', urgent: true },
  { type: 'payment', text: 'Pending payments from customers', count: 3, icon: CreditCard, color: 'purple', urgent: false },
];

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

const number = new Intl.NumberFormat('en-IN');

function formatCurrency(amount: number): string {
  return `₹${number.format(Math.round(amount))}`;
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}



// ═══════════════════════════════════════════════════════════
// SPARKLINE SVG
// ═══════════════════════════════════════════════════════════

function Sparkline({ data, color = '#10b981', height = 32, width = 64 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-label="Trend sparkline">
      <title>Trend line</title>
      <defs>
        <linearGradient id={`sg-${color.replace(/[#]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width},${height} L 0,${height} Z`} fill={`url(#sg-${color.replace(/[#]/g, '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r={2.5} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// HERO BANNER — with tractor/field image & Marathi greeting
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
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-xl shadow-blue-900/20">
      {/* Agricultural landscape image — full visibility, no overlay */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE_URL}
          alt="Agricultural fields"
          className="h-full w-full object-cover opacity-30"
          loading="eager"
        />
      </div>

      {/* Decorative pattern */}
      <div className="pointer-events-none absolute right-6 top-6 opacity-[0.04]">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <pattern id="hero-dots2" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="white" />
          </pattern>
          <rect width="100" height="100" fill="url(#hero-dots2)" />
        </svg>
      </div>

      {/* Notifications Bell — near admin user */}
      <div className="absolute right-4 top-4 z-20" ref={notifRef}>
        <button
          onClick={() => setShowNotifDropdown(!showNotifDropdown)}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-blue-900 shadow-sm">
            3
          </span>
        </button>

        {showNotifDropdown && (
          <div className="absolute right-0 top-full mt-2 w-72 animate-in fade-in slide-in-from-top-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-2 py-2">
              <p className="text-xs font-semibold text-white">Notifications</p>
              <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-medium text-red-400">3 new</span>
            </div>
            <div className="space-y-1 py-1">
              {[
                { icon: FileText, text: 'New purchase order #PO-2026-0042', time: '2 min ago', color: 'text-emerald-400' },
                { icon: Mail, text: 'Invoice #INV-2026-0108 awaiting payment', time: '15 min ago', color: 'text-amber-400' },
                { icon: AlertTriangle, text: 'DAP Fertilizer stock below reorder level', time: '1 hour ago', color: 'text-red-400' },
              ].map((notif, i) => {
                const NotifIcon = notif.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10 cursor-pointer">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 ${notif.color}`}>
                      <NotifIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium leading-tight text-white/90">{notif.text}</p>
                      <p className="mt-0.5 text-[9px] text-white/40">{notif.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/10 pt-1">
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-medium text-blue-400 transition-colors hover:bg-white/5">
                <Shield className="h-3 w-3" strokeWidth={1.5} />
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accent glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-emerald-200 shadow-lg">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="text-[14px] font-bold uppercase tracking-[0.22em] text-emerald-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            SHRANIX Krushi ERP
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          🌾 स्वागत आहे, Admin!
        </h1>

        <p className="mt-2 text-base leading-relaxed text-blue-100/70 sm:text-lg">
          Good Morning! Here's your farm business overview.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-blue-200/60">
          <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            Default Company
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5" />
            {generatedAt ? formatDate(generatedAt) : 'Today'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KPI CARD — compact size
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
  const isPositive = change !== null && change.value >= 0;
  const colorStyles: Record<string, { dot: string; iconBg: string; iconColor: string; accent: string; glow: string; border: string; cardBg: string }> = {
    blue: { dot: 'bg-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', accent: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20', border: 'hover:border-blue-500/30', cardBg: 'bg-blue-50/80 dark:bg-slate-900' },
    green: { dot: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20', border: 'hover:border-emerald-500/30', cardBg: 'bg-green-50/80 dark:bg-slate-900' },
    emerald: { dot: 'bg-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20', border: 'hover:border-emerald-500/30', cardBg: 'bg-emerald-50/80 dark:bg-slate-900' },
    purple: { dot: 'bg-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', accent: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20', border: 'hover:border-purple-500/30', cardBg: 'bg-purple-50/80 dark:bg-slate-900' },
    orange: { dot: 'bg-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', accent: 'from-orange-500 to-orange-600', glow: 'shadow-orange-500/20', border: 'hover:border-orange-500/30', cardBg: 'bg-orange-50/80 dark:bg-slate-900' },
    amber: { dot: 'bg-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400', accent: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/20', border: 'hover:border-amber-500/30', cardBg: 'bg-amber-50/80 dark:bg-slate-900' },
    red: { dot: 'bg-red-500', iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400', accent: 'from-red-500 to-red-600', glow: 'shadow-red-500/20', border: 'hover:border-red-500/30', cardBg: 'bg-red-50/80 dark:bg-slate-900' },
  };
  const cs = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}              className={`group relative rounded-lg border border-slate-200 ${cs.cardBg} p-1.5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Hover glow effect */}
      <div className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04] bg-gradient-to-br ${cs.accent}`} />

      {/* Top row */}
      <div className="flex items-start justify-between relative">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${cs.iconBg} ${cs.iconColor}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
        {change && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] font-semibold transition-all duration-200 ${
            isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="h-2 w-2" /> : <ArrowDownRight className="h-2 w-2" />}
            {Math.abs(change.value).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Title - Marathi + English */}
      <p className="mt-1 text-[18px] font-medium text-slate-500 dark:text-slate-400 relative truncate">{titleMr}</p>
      <p className="text-[15px] text-slate-400 dark:text-slate-500 -mt-0.5 relative truncate">{title}</p>

      {/* Value */}
      <p className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white relative">{value}</p>

      {/* Change label */}
      {change && (
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 relative">{change.label}</p>
      )}

      {/* Bottom sparkline */}
      {trend && trend.length > 1 && (
        <div className="mt-0.5 -mb-1 flex justify-end relative">
          <Sparkline data={trend} color={cs.dot.replace('bg-', '#')} height={20} width={48} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DAILY OVERVIEW CHART — premium with gradient fills
// ═══════════════════════════════════════════════════════════

function DailyOverviewChart({ monthlySeries }: { monthlySeries: Array<{ month: string; sales: number; purchases: number }> }) {
  if (!monthlySeries || monthlySeries.length < 2) return null;

  const maxVal = Math.max(...monthlySeries.flatMap((m) => [m.sales, m.purchases]), 1);
  const yMax = Math.ceil(maxVal / 5000) * 5000;
  const chartH = 160;
  const chartW = 100;

  const salesPoints = monthlySeries.map((m, i) => ({
    x: ((i / (monthlySeries.length - 1)) * chartW).toFixed(1),
    y: (chartH - ((m.sales / yMax) * chartH * 0.85)).toFixed(1),
  }));
  const purchasePoints = monthlySeries.map((m, i) => ({
    x: ((i / (monthlySeries.length - 1)) * chartW).toFixed(1),
    y: (chartH - ((m.purchases / yMax) * chartH * 0.85)).toFixed(1),
  }));

  const salesD = `M ${salesPoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const purchaseD = `M ${purchasePoints.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaSalesD = `${salesD} L ${chartW},${chartH} L 0,${chartH} Z`;
  const areaPurchaseD = `${purchaseD} L ${chartW},${chartH} L 0,${chartH} Z`;

  const yLabels = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].map((v) => ({
    value: v,
    y: chartH - ((v / yMax) * chartH * 0.85),
  }));

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Overview</h3>
          <p className="text-[12px] text-slate-400">दैनंदिन आढावा</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" />
            Vikri (Sales)
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
            Kharedi (Purchase)
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${chartW} ${chartH + 20}`} className="w-full h-44" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {yLabels.map((label) => (
            <line key={label.value} x1="0" y1={label.y} x2={chartW} y2={label.y} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={0.5} strokeDasharray="3 3" />
          ))}
          {yLabels.map((label) => (
            <text key={label.value} x="-2" y={label.y + 3} textAnchor="end" className="fill-slate-400 text-[4px]">{formatCompactCurrency(label.value)}</text>
          ))}
          {/* Area fills */}
          <path d={areaSalesD} fill="url(#salesGrad)" />
          <path d={areaPurchaseD} fill="url(#purchaseGrad)" />
          {/* Lines */}
          <path d={salesD} fill="none" stroke="#2563EB" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 group-hover:opacity-80" />
          <path d={purchaseD} fill="none" stroke="#16A34A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 group-hover:opacity-80" />
          {/* Data points */}
          {salesPoints.map((p, i) => (
            <g key={i} className="cursor-pointer transition-all duration-200 hover:opacity-100 opacity-0 group-hover:opacity-100">
              <circle cx={p.x} cy={p.y} r={3.5} fill="#2563EB" stroke="white" strokeWidth={2} className="drop-shadow-sm" />
            </g>
          ))}
          {purchasePoints.map((p, i) => (
            <g key={i} className="cursor-pointer transition-all duration-200 hover:opacity-100 opacity-0 group-hover:opacity-100">
              <circle cx={p.x} cy={p.y} r={3.5} fill="#16A34A" stroke="white" strokeWidth={2} className="drop-shadow-sm" />
            </g>
          ))}
          {/* Always visible end dots */}
          <circle cx={salesPoints[salesPoints.length - 1].x} cy={salesPoints[salesPoints.length - 1].y} r={4} fill="#2563EB" stroke="white" strokeWidth={2} className="drop-shadow-md" />
          <circle cx={purchasePoints[purchasePoints.length - 1].x} cy={purchasePoints[purchasePoints.length - 1].y} r={4} fill="#16A34A" stroke="white" strokeWidth={2} className="drop-shadow-md" />
        </svg>
        <div className="flex justify-between px-1 -mt-1">
          {monthlySeries.map((m) => (<span key={m.month} className="text-[11px] text-slate-400 font-medium">{m.month.slice(0, 3)}</span>))}
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════

const TopProductsData = [
  { name: 'DAP Fertilizer', qty: 45, sales: 234500 },
  { name: 'Urea 50kg', qty: 38, sales: 114000 },
  { name: 'NPK 12:32:16', qty: 22, sales: 83600 },
  { name: 'Pesticide Gold', qty: 18, sales: 75600 },
  { name: 'Potash 25kg', qty: 15, sales: 52500 },
];

const rankColors = ['bg-amber-500 text-white', 'bg-slate-400 text-white', 'bg-orange-400 text-white', 'bg-slate-300 text-slate-700', 'bg-slate-200 text-slate-600'];

function TopProductsTable() {
  const maxQty = Math.max(...TopProductsData.map(p => p.qty), 1);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Products Today</h3>
          <p className="text-[12px] text-slate-400">आजची टॉप उत्पादने</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="pb-2 w-6" />
              <th className="pb-2 font-semibold text-slate-500 dark:text-slate-400">Product</th>
              <th className="pb-2 font-semibold text-slate-500 dark:text-slate-400 text-right">Qty</th>
              <th className="pb-2 font-semibold text-slate-500 dark:text-slate-400 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {TopProductsData.map((product, i) => (
              <tr key={i} className="group border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/20">
                <td className="py-2.5">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${rankColors[i] || rankColors[4]}`}>{i + 1}</span>
                </td>
                <td className="py-2.5">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{product.name}</p>
                </td>
                <td className="py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(product.qty / maxQty) * 100}%` }} />
                    </div>
                    <span className="text-right text-slate-600 dark:text-slate-400 font-medium w-6">{product.qty}</span>
                  </div>
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(product.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// LOW STOCK WIDGET — enhanced with out-of-stock & reorder
// ═══════════════════════════════════════════════════════════

const sampleLowStockFull = [
  { name: 'DAP Fertilizer', sku: 'FERT-DAP-001', currentStock: 0, reorderLevel: 50, status: 'out' as const },
  { name: 'Urea 50kg', sku: 'FERT-UREA-002', currentStock: 8, reorderLevel: 40, status: 'low' as const },
  { name: 'NPK 12:32:16', sku: 'FERT-NPK-003', currentStock: 3, reorderLevel: 30, status: 'critical' as const },
  { name: 'Pesticide Gold', sku: 'PEST-GLD-004', currentStock: 5, reorderLevel: 25, status: 'critical' as const },
  { name: 'Potash 25kg', sku: 'FERT-POT-005', currentStock: 0, reorderLevel: 20, status: 'out' as const },
  { name: 'Weedicide Pro', sku: 'PEST-WED-006', currentStock: 2, reorderLevel: 15, status: 'critical' as const },
];

function LowStockWidget() {
  const outOfStock = sampleLowStockFull.filter(i => i.status === 'out');
  const critical = sampleLowStockFull.filter(i => i.status === 'critical');
  const low = sampleLowStockFull.filter(i => i.status === 'low');

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stock Status</h3>
          <p className="text-[12px] text-slate-400">स्टॉक स्थिती</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[12px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <Package className="h-3 w-3" />
          {outOfStock.length + critical.length} alerts
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-red-50 p-2 text-center dark:bg-red-950/20">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{outOfStock.length}</p>
          <p className="text-[10px] font-medium text-red-500">Out of Stock</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-2 text-center dark:bg-orange-950/20">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{critical.length}</p>
          <p className="text-[10px] font-medium text-orange-500">Critical</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/20">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{low.length}</p>
          <p className="text-[10px] font-medium text-amber-500">Low Stock</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
        {sampleLowStockFull.map((item, i) => {
          const isOut = item.status === 'out';
          const isCrit = item.status === 'critical';
          const dotColor = isOut ? 'bg-red-500' : isCrit ? 'bg-orange-500' : 'bg-amber-500';
          const textCol = isOut ? 'text-red-600 dark:text-red-400' : isCrit ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400';
          const bgRow = isOut ? 'bg-red-50/50 dark:bg-red-950/10' : isCrit ? 'bg-orange-50/30 dark:bg-orange-950/5' : '';
          const statusLabel = isOut ? 'Out' : isCrit ? 'Critical' : 'Low';
          return (
            <div key={i} className={`group flex items-center justify-between rounded-lg ${bgRow} px-3 py-2 transition-all duration-200 hover:shadow-sm`}>
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor} shadow-sm`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                    <span className={`text-[10px] font-semibold px-1 rounded ${textCol} bg-white/60 dark:bg-white/5`}>{statusLabel}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{item.sku}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className={`text-xs font-bold ${textCol}`}>{item.currentStock}</p>
                <p className="text-[10px] text-slate-400">min: {item.reorderLevel}</p>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weather</h3>
          <p className="text-[12px] text-slate-400">हवामान</p>
        </div>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {weather.location}
        </span>
      </div>

      {/* Main temp */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Sun className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{weather.temperature}°C</p>
          <p className="text-[12px] text-slate-500">{weather.condition}</p>
        </div>
      </div>

      {/* Detail metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-blue-50 p-2.5 text-center dark:bg-blue-950/20">
          <Droplets className="h-4 w-4 mx-auto text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{weather.humidity}%</p>
          <p className="text-[10px] text-slate-400">Humidity</p>
        </div>
        <div className="rounded-lg bg-cyan-50 p-2.5 text-center dark:bg-cyan-950/20">
          <Thermometer className="h-4 w-4 mx-auto text-cyan-500 dark:text-cyan-400" strokeWidth={1.5} />
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{weather.rainChance}%</p>
          <p className="text-[10px] text-slate-400">Rain</p>
        </div>
        <div className="rounded-lg bg-teal-50 p-2.5 text-center dark:bg-teal-950/20">
          <Wind className="h-4 w-4 mx-auto text-teal-500 dark:text-teal-400" strokeWidth={1.5} />
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{weather.windSpeed} km/h</p>
          <p className="text-[10px] text-slate-400">Wind</p>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Mandi Rates</h3>
          <p className="text-[12px] text-slate-400">आजचे बाजार भाव</p>
        </div>
        <span className="text-[11px] text-slate-400">लासलगाव · नाशिक</span>
      </div>
      <div className="space-y-1.5">
        {sampleMandiRates.map((item, i) => (
          <div key={i} className="group flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/30">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{item.commodity}</p>
                <p className="text-[10px] text-slate-400">{item.market} · per {item.unit}</p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">₹{number.format(item.rate)}</p>
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${item.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {item.change >= 0 ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                {item.changePct >= 0 ? '+' : ''}{item.changePct}%
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inventory Summary</h3>
          <p className="text-[12px] text-slate-400">इन्व्हेंटरी सारांश</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/30">
          <p className="text-lg font-bold text-slate-900 dark:text-white">{inv.totalProducts}</p>
          <p className="text-[11px] text-slate-500">Total Products</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{inv.activeProducts}</p>
          <p className="text-[11px] text-emerald-500">Active</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{inv.nearExpiry}</p>
          <p className="text-[11px] text-amber-500">Near Expiry</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{inv.expired}</p>
          <p className="text-[11px] text-red-500">Expired</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{inv.lowStock}</p>
          <p className="text-[11px] text-orange-500">Low Stock</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20">
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{inv.outOfStock}</p>
          <p className="text-[11px] text-purple-500">Out of Stock</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20 col-span-2">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{inv.reservedStock}</p>
          <p className="text-[11px] text-blue-500">Reserved Stock</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RECENT ACTIVITY TIMELINE
// ═══════════════════════════════════════════════════════════

const activityColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function RecentActivityTimeline() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activity</h3>
          <p className="text-[12px] text-slate-400">अलीकडील क्रिया</p>
        </div>
        <span className="text-[11px] text-blue-500 flex items-center gap-1 cursor-pointer hover:underline">
          View all <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-0">
          {sampleActivities.map((act, i) => {
            const ActIcon = act.icon;
            return (
              <div key={i} className="group relative flex gap-3 py-2 pl-0">
                {/* Timeline dot */}
                <div className="relative z-10 flex items-center justify-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 ${activityColors[act.color] || activityColors.blue}`}>
                    <ActIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pb-1 group-last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{act.text}</p>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2">{act.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{act.subtitle}</p>
                  {act.amount && (
                    <p className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(act.amount)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TOP CUSTOMERS WIDGET
// ═══════════════════════════════════════════════════════════

function TopCustomersWidget() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Customers</h3>
          <p className="text-[12px] text-slate-400">टॉप ग्राहक</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {sampleTopCustomers.map((customer, i) => {
          const rankColors = ['#F59E0B', '#94A3B8', '#D97706', '#CBD5E1', '#E2E8F0'];
          const isVIP = customer.status === 'vip';
          const isNew = customer.status === 'new';
          return (
            <div key={i} className="group flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0`} style={{ backgroundColor: rankColors[i] }}>
                    {i + 1}
                  </div>
                  {isVIP && <Star className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 fill-amber-400" strokeWidth={1} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{customer.name}</p>
                    {isNew && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded dark:bg-emerald-950/30 dark:text-emerald-400">New</span>}
                    {isVIP && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 rounded dark:bg-amber-950/30 dark:text-amber-400">VIP</span>}
                  </div>
                  <p className="text-[11px] text-slate-400">{customer.visits} visits · Last: {formatDate(customer.lastPurchase)}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{formatCurrency(customer.totalPurchases)}</p>
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
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  orange: 'text-orange-600 dark:text-orange-400',
  red: 'text-red-600 dark:text-red-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

const notifBgColors: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-950/20',
  amber: 'bg-amber-50 dark:bg-amber-950/20',
  orange: 'bg-orange-50 dark:bg-orange-950/20',
  red: 'bg-red-50 dark:bg-red-950/20',
  purple: 'bg-purple-50 dark:bg-purple-950/20',
};

function NotificationsPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
          <p className="text-[12px] text-slate-400">सूचना</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
          <Bell className="h-3 w-3" />
          {sampleNotifications.filter(n => n.urgent).length} urgent
        </span>
      </div>
      <div className="space-y-1.5">
        {sampleNotifications.map((notif, i) => {
          const NotifIcon = notif.icon;
          return (
            <div key={i} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:shadow-sm cursor-pointer ${notifBgColors[notif.color] || notifBgColors.blue}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 ${notifColors[notif.color]} bg-white/60 dark:bg-white/10`}>
                <NotifIcon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate">{notif.text}</p>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center justify-center h-5 min-w-[20px] rounded-full px-1.5 text-[11px] font-bold ${
                  notif.urgent ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {notif.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// QUICK ACTIONS PANEL — improved with 7 buttons
// ═══════════════════════════════════════════════════════════

const quickActions = [
  { label: 'New Sale', labelMr: 'नवीन विक्री', icon: TrendingUp, color: 'blue', path: '/sales/invoices' },
  { label: 'New Purchase', labelMr: 'नवीन खरेदी', icon: Truck, color: 'emerald', path: '/purchase/orders' },
  { label: 'New Product', labelMr: 'नवीन उत्पादन', icon: Box, color: 'amber', path: '/inventory/products' },
  { label: 'New Customer', labelMr: 'नवीन ग्राहक', icon: UserPlus, color: 'purple', path: '/customers' },
  { label: 'New Supplier', labelMr: 'नवीन पुरवठादार', icon: Store, color: 'orange', path: '/suppliers' },
  { label: 'Stock Transfer', labelMr: 'स्टॉक हस्तांतरण', icon: Warehouse, color: 'cyan', path: '/inventory/stock-transfer' },
  { label: 'Print Barcode', labelMr: 'बारकोड प्रिंट', icon: QrCode, color: 'slate', path: '/inventory/barcodes' },
];

const actionColors: Record<string, { bg: string; hover: string; active: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:shadow-blue-500/10', active: 'active:bg-blue-200 dark:active:bg-blue-900/40' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:shadow-emerald-500/10', active: 'active:bg-emerald-200 dark:active:bg-emerald-900/40' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:shadow-amber-500/10', active: 'active:bg-amber-200 dark:active:bg-amber-900/40' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:shadow-purple-500/10', active: 'active:bg-purple-200 dark:active:bg-purple-900/40' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:shadow-orange-500/10', active: 'active:bg-orange-200 dark:active:bg-orange-900/40' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:shadow-cyan-500/10', active: 'active:bg-cyan-200 dark:active:bg-cyan-900/40' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-800', hover: 'hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-slate-500/10', active: 'active:bg-slate-300 dark:active:bg-slate-600' },
};

const actionTextColors: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  slate: 'text-slate-600 dark:text-slate-400',
};

function QuickActionsPanel() {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions</h3>
      <p className="text-[10px] text-slate-400 mb-3">द्रुत कृती</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const ActionIcon = action.icon;
          const c = actionColors[action.color] || actionColors.slate;
          const txt = actionTextColors[action.color] || actionTextColors.slate;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`group flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-all duration-200 ${c.bg} ${c.hover} ${c.active} hover:shadow-sm active:scale-[0.97]`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${txt} bg-white/60 dark:bg-white/10 shadow-sm`}>
                <ActionIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className={`text-[12px] font-semibold leading-tight truncate transition-colors duration-200 ${txt}`}>{action.labelMr}</p>
                <p className="text-[10px] text-slate-400 truncate">{action.label}</p>
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

  // ── Sample KPI values ──
  const sampleKPIs = {
    revenue: { value: 25430, change: 12.5, period: 'today' },
    purchases: { value: 12850, change: 8.3, period: 'today' },
    inventoryValue: 345680,
    pendingApprovals: 5,
  };

  const salesTrend = [42000, 38000, 51000, 46000, 48000, 52000, 49500];
  const purchaseTrend = [28000, 32000, 29000, 35000, 31000, 37000, 34000];

  const kpiData = sampleKPIs;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ════════════════════════════════════════════════════
          ROW 1: HERO BANNER
      ════════════════════════════════════════════════════ */}
      <HeroBanner generatedAt={'Today'} />

      {/* ════════════════════════════════════════════════════
          ROW 2: TODAY'S SUMMARY — 8 KPI Cards (4x2 grid)
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-4">
        <KPICard title="Today's Sales" titleMr="आजची विक्री" value={formatCompactCurrency(kpiData.revenue.value)} change={{ value: kpiData.revenue.change ?? 12.5, label: 'vs yesterday' }} icon={TrendingUp} color="blue" trend={salesTrend} />
        <KPICard title="Today's Purchase" titleMr="आजची खरेदी" value={formatCompactCurrency(kpiData.purchases.value)} change={{ value: kpiData.purchases.change ?? 8.3, label: 'vs yesterday' }} icon={ShoppingCart} color="green" trend={purchaseTrend} />
        <KPICard title="Today's Revenue" titleMr="आजचा महसूल" value={formatCompactCurrency((kpiData.revenue.value + kpiData.purchases.value) * 1.15)} change={{ value: 15.2, label: 'profit margin' }} icon={DollarSign} color="emerald" />
        <KPICard title="Total Customers" titleMr="एकूण ग्राहक" value={'1,236'} change={{ value: 18, label: 'new this month' }} icon={Users} color="orange" />
        <KPICard title="Total Suppliers" titleMr="एकूण पुरवठादार" value="48" change={{ value: 2, label: 'new this month' }} icon={Truck} color="purple" />
        <KPICard title="Total Products" titleMr="एकूण उत्पादने" value={number.format(245)} change={{ value: 12, label: 'active products' }} icon={Package} color="blue" />
        <KPICard title="Stock Value" titleMr="स्टॉक मूल्य" value="₹1.2Cr" change={{ value: 5.6, label: 'vs last month' }} icon={Warehouse} color="amber" />
        <KPICard title="Pending Orders" titleMr="प्रलंबित ऑर्डर" value="18" change={{ value: -8.3, label: 'reduced' }} icon={ClipboardList} color="red" />
      </div>

      {/* ════════════════════════════════════════════════════
          ROW 3: EXPIRY ALERT + LOW STOCK
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2"><ExpiryAlertWidget /></div>
        <div className="lg:col-span-2"><LowStockWidget /></div>
      </div>

      {/* ════════════════════════════════════════════════════
          ROW 4: WEATHER + MANDI RATES + RECENT ACTIVITY
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1"><WeatherWidget /></div>
        <div className="lg:col-span-1"><MandiRatesWidget /></div>
        <div className="lg:col-span-2"><RecentActivityTimeline /></div>
      </div>

      {/* ════════════════════════════════════════════════════
          ROW 5: INVENTORY SUMMARY + NOTIFICATIONS
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2"><InventorySummaryWidget /></div>
        <div className="lg:col-span-2"><NotificationsPanel /></div>
      </div>

      {/* ════════════════════════════════════════════════════
          ROW 6: DAILY OVERVIEW CHART + QUICK ACTIONS
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <DailyOverviewChart monthlySeries={[
            { month: 'Feb', sales: 42000, purchases: 28000 },
            { month: 'Mar', sales: 38000, purchases: 32000 },
            { month: 'Apr', sales: 51000, purchases: 29000 },
            { month: 'May', sales: 46000, purchases: 35000 },
            { month: 'Jun', sales: 48000, purchases: 31000 },
            { month: 'Jul', sales: 52000, purchases: 37000 },
            { month: 'Aug', sales: 49500, purchases: 34000 },
          ]} />
        </div>
        <div className="lg:col-span-1"><QuickActionsPanel /></div>
      </div>

      {/* ════════════════════════════════════════════════════
          ROW 7: TOP PRODUCTS + TOP CUSTOMERS
      ════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopProductsTable />
        <TopCustomersWidget />
      </div>
    </div>
  );
}
