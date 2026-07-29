import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
export function AnimatedValue({ value, duration = 1000, prefix = '', suffix = '', className }) {
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
    const formatted = target >= 100000
        ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(display))
        : target % 1 === 0
            ? Math.round(display).toString()
            : display.toFixed(1);
    return _jsxs("span", { className: className, children: [prefix, formatted, suffix] });
}
export function AnimatedScore({ value, suffix = '', className }) {
    return _jsx(AnimatedValue, { value: value, duration: 1200, suffix: suffix, className: className });
}
const iconBlockColors = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-emerald-600' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-500 to-blue-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-500 to-amber-600' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', gradient: 'from-purple-500 to-purple-600' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-rose-600' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-500 to-cyan-600' },
};
function MiniSparklineRight({ data, color }) {
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
    return (_jsxs("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, className: "shrink-0", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: `${id}-fill`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.35 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.02 })] }) }), _jsx("path", { d: `${d} L ${w},${h} L 0,${h} Z`, fill: `url(#${id}-fill)` }), _jsx("path", { d: d, fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("circle", { cx: pts[pts.length - 1]?.split(',')[0] || 0, cy: pts[pts.length - 1]?.split(',')[1] || 0, r: 3, fill: color, stroke: "#fff", strokeWidth: 1.5 })] }));
}
function ChangeBadge({ change }) {
    if (change === null) {
        return (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800/50 dark:text-slate-500", children: [_jsx(Minus, { className: "h-3 w-3" }), "N/A"] }));
    }
    const isPositive = change >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (_jsxs("span", { className: `inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${isPositive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`, children: [_jsx(Icon, { className: "h-3 w-3" }), Math.abs(change).toFixed(1), "%"] }));
}
export function KPICard({ title, value, change, icon: Icon, iconColor: _iconColor, iconGradient, subtitle, trend, onClick, }) {
    const iconColor = _iconColor || iconGradient || 'emerald';
    const [isHovered, setIsHovered] = useState(false);
    const colors = iconBlockColors[iconColor] || iconBlockColors.emerald;
    return (_jsxs("div", { className: `group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${onClick ? 'cursor-pointer' : ''} hover:shadow-2xl hover:shadow-slate-200/70 hover:-translate-y-1 dark:hover:shadow-slate-900/70 dark:hover:shadow-black/30`, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), onClick: onClick, role: onClick ? 'button' : undefined, tabIndex: onClick ? 0 : undefined, onKeyDown: onClick ? (e) => { if (e.key === 'Enter') {
            onClick();
        } } : undefined, children: [_jsx("div", { className: `absolute -inset-1 bg-gradient-to-r ${colors.gradient} opacity-0 blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-10' : ''}` }), _jsxs("div", { className: "relative flex items-start justify-between", children: [_jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: `flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${colors.bg} ${colors.icon} ${isHovered ? 'scale-110 -translate-y-1 shadow-xl' : 'shadow-md'}`, children: _jsx(Icon, { className: "h-7 w-7", strokeWidth: 1.5 }) }), _jsxs("div", { className: "pt-0.5", children: [_jsx("p", { className: "text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400", children: title }), _jsx("p", { className: "mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white", children: value })] })] }), _jsx("div", { className: "pt-1", children: trend && trend.length > 1 && (_jsx(MiniSparklineRight, { data: trend, color: isHovered ? '#10b981' : '#94a3b8' })) })] }), _jsxs("div", { className: "relative mt-5 flex items-center gap-3", children: [_jsx(ChangeBadge, { change: change }), subtitle && (_jsx("span", { className: "text-[11px] font-medium text-slate-400 dark:text-slate-500", children: subtitle }))] }), onClick && (_jsxs("div", { className: `relative mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition-all duration-300 dark:text-blue-400 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`, children: ["View details ", _jsx(ArrowUpRight, { className: "h-3 w-3" })] }))] }));
}
//# sourceMappingURL=KPICard.js.map