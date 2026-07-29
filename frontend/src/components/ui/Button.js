import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm border-transparent',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600 dark:border-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 border-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700',
    outline: 'bg-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100 border-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-600',
};
const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
};
export const Button = forwardRef(({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    return (_jsxs("button", { ref: ref, disabled: disabled || loading, className: cn('inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]', variants[variant], sizes[size], className), ...props, children: [loading ? (_jsxs("svg", { className: "h-4 w-4 animate-spin", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] })) : icon ? (_jsx("span", { className: "shrink-0", children: icon })) : null, children && _jsx("span", { children: children })] }));
});
Button.displayName = 'Button';
//# sourceMappingURL=Button.js.map