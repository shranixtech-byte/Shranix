import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
export const FormSelect = forwardRef(({ className, label, error, hint, options, placeholder, quickCreate, onQuickCreate, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (_jsxs("div", { className: "space-y-1.5", children: [label && (_jsxs("label", { htmlFor: selectId, className: "block text-sm font-medium text-slate-700 dark:text-slate-300", children: [label, props.required && _jsx("span", { className: "ml-0.5 text-red-500", children: "*" })] })), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { ref: ref, id: selectId, className: cn('h-[42px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition-all duration-150 appearance-none cursor-pointer', 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20', 'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20', error
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
                            : 'border-slate-200', 'disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed dark:disabled:bg-slate-900', className), style: {
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.75rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.25rem',
                            paddingRight: '2.5rem',
                        }, "aria-invalid": !!error, "aria-describedby": error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined, ...props, children: [placeholder && (_jsx("option", { value: "", disabled: true, children: placeholder })), options.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] }), quickCreate && onQuickCreate && (_jsx("button", { type: "button", onClick: onQuickCreate, className: "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 text-lg font-medium text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-600 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400", title: `Create new ${label || 'item'}`, children: "+" }))] }), error && (_jsx("p", { id: `${selectId}-error`, className: "text-xs text-red-500", role: "alert", children: error })), hint && !error && (_jsx("p", { id: `${selectId}-hint`, className: "text-xs text-slate-400", children: hint }))] }));
});
FormSelect.displayName = 'FormSelect';
//# sourceMappingURL=FormSelect.js.map