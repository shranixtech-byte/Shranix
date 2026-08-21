import { TrendingUp, TrendingDown, Minus, type LucideIcon, ArrowUpRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export function AnimatedValue({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  className,
}: {
  value: string | number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const target = useMemo(() => {
    if (typeof value === 'number') {
      return value;
    }
    const cleaned = value.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  }, [value]);

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const startTime = performance.now();
    const startVal = 0;
    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      setDisplay(current);
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  const formatted =
    target >= 100000
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(display))
      : target % 1 === 0
        ? Math.round(display).toString()
        : display.toFixed(1);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export function AnimatedScore({
  value,
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  return <AnimatedValue value={value} duration={1200} suffix={suffix} className={className} />;
}

interface KPICardProps {
  title: string;
  value: string | React.ReactNode;
  change: number | null;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  trend?: number[];
  onClick?: () => void;
  variant?: string;
  format?: string;
  iconGradient?: string;
}

const iconBlockColors: Record<string, { bg: string; icon: string; gradient: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500 to-amber-600',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    icon: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-500 to-rose-600',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    icon: 'text-cyan-600 dark:text-cyan-400',
    gradient: 'from-cyan-500 to-cyan-600',
  },
};

function MiniSparklineRight({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) {
    return null;
  }
  const w = 72;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  const id = `spk-${color.replace(/[#\s]/g, '')}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w},${h} L 0,${h} Z`} fill={`url(#${id}-fill)`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1]?.split(',')[0] || 0}
        cy={pts[pts.length - 1]?.split(',')[1] || 0}
        r={3}
        fill={color}
        stroke="#fff"
        strokeWidth={1.5}
      />
    </svg>
  );
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
        <Minus className="h-3 w-3" />
        N/A
      </span>
    );
  }
  const isPositive = change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  iconColor: _iconColor,
  iconGradient,
  subtitle,
  trend,
  onClick,
}: KPICardProps) {
  const iconColor = _iconColor || iconGradient || 'emerald';
  const [isHovered, setIsHovered] = useState(false);
  const colors = iconBlockColors[iconColor] || iconBlockColors.emerald;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all duration-200 sm:p-4 dark:border-white/[0.08] dark:bg-[#111827] ${
        onClick ? 'cursor-pointer' : ''
      } hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/40`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter') {
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Hover glow effect */}
      <div
        className={`absolute -inset-1 bg-gradient-to-r ${colors.gradient} opacity-0 blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-10' : ''}`}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${colors.bg} ${colors.icon} ${
              isHovered ? 'scale-105 shadow-md' : 'shadow-xs'
            }`}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {value}
            </p>
          </div>
        </div>
        <div className="pt-0.5">
          {trend && trend.length > 1 && (
            <MiniSparklineRight data={trend} color={isHovered ? '#10b981' : '#94a3b8'} />
          )}
        </div>
      </div>

      <div className="relative mt-2.5 flex items-center gap-2.5">
        <ChangeBadge change={change} />
        {subtitle && (
          <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
            {subtitle}
          </span>
        )}
      </div>

      {onClick && (
        <div
          className={`relative mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 transition-all duration-200 dark:text-emerald-400 ${
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          View details <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
