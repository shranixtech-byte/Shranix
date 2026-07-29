import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function FormCard({ title, description, children, className, actions }) {
    return (_jsxs("div", { className: cn('rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50', className), children: [_jsxs("div", { className: "flex items-center justify-between px-6 pt-6 pb-0", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-slate-100", children: title }), description && (_jsx("p", { className: "mt-0.5 text-sm text-slate-500 dark:text-slate-400", children: description }))] }), actions && _jsx("div", { className: "flex items-center gap-2", children: actions })] }), _jsx("div", { className: "mx-6 mt-4 mb-4 border-t border-slate-100 dark:border-slate-700" }), _jsx("div", { className: "px-6 pb-6", children: children })] }));
}
//# sourceMappingURL=FormCard.js.map