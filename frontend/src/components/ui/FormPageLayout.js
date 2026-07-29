import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Breadcrumb } from './Breadcrumb';
export function FormPageLayout({ title, description, breadcrumbs, actions, children, className, size = 'default', }) {
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-300", children: [breadcrumbs && breadcrumbs.length > 0 && (_jsx(Breadcrumb, { items: breadcrumbs })), _jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100", children: title }), description && (_jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: description }))] }), actions && actions.length > 0 && (_jsx("div", { className: "flex items-center gap-3", children: actions.map((action, idx) => (_jsx(Button, { variant: action.variant || 'primary', loading: action.loading, icon: action.icon, onClick: action.onClick, children: action.label }, idx))) }))] }), _jsx("div", { className: cn(size === 'full' ? '' : 'max-w-5xl', className), children: _jsx("div", { className: "grid gap-6 md:grid-cols-2", children: children }) })] }));
}
//# sourceMappingURL=FormPageLayout.js.map