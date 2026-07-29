import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
export const FormTextarea = forwardRef(({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (_jsxs("div", { className: "space-y-1.5", children: [label && (_jsxs("label", { htmlFor: textareaId, className: "block text-sm font-medium text-slate-700 dark:text-slate-300", children: [label, props.required && _jsx("span", { className: "ml-0.5 text-red-500", children: "*" })] })), _jsx("textarea", { ref: ref, id: textareaId, className: cn('w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150', 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20', 'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20', error
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
                    : 'border-slate-200', 'disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed dark:disabled:bg-slate-900', className), "aria-invalid": !!error, "aria-describedby": error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined, rows: 3, ...props }), error && (_jsx("p", { id: `${textareaId}-error`, className: "text-xs text-red-500", role: "alert", children: error })), hint && !error && (_jsx("p", { id: `${textareaId}-hint`, className: "text-xs text-slate-400", children: hint }))] }));
});
FormTextarea.displayName = 'FormTextarea';
//# sourceMappingURL=FormTextarea.js.map