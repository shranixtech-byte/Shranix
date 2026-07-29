import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
export function Breadcrumb({ items, className }) {
    return (_jsxs("nav", { className: cn('flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400', className), "aria-label": "Breadcrumb", children: [_jsx(Link, { to: "/", className: "flex items-center transition-colors hover:text-slate-700 dark:hover:text-slate-200", children: _jsx(Home, { className: "h-4 w-4" }) }), items.map((item, index) => (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(ChevronRight, { className: "h-3.5 w-3.5 text-slate-400" }), item.path && index < items.length - 1 ? (_jsx(Link, { to: item.path, className: "transition-colors hover:text-slate-700 dark:hover:text-slate-200", children: item.label })) : (_jsx("span", { className: "font-medium text-slate-900 dark:text-slate-100", children: item.label }))] }, index)))] }));
}
//# sourceMappingURL=Breadcrumb.js.map