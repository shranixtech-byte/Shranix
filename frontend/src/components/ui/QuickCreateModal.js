import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    fullscreen: 'max-w-[95vw] max-h-[95vh]',
};
export function QuickCreateModal({ open, onClose, title, size = 'md', children, className, onSuccess: _onSuccess, }) {
    const overlayRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const handleEsc = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { ref: overlayRef, className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200", onClick: (e) => {
            if (e.target === overlayRef.current)
                onClose();
        }, children: _jsxs("div", { className: cn('w-full rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800', size === 'fullscreen' ? 'overflow-hidden flex flex-col' : '', sizeClasses[size], className), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-slate-100", children: title }), _jsx("button", { type: "button", onClick: onClose, className: "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: cn('p-6', size === 'fullscreen' ? 'flex-1 overflow-y-auto' : ''), children: children })] }) }));
}
//# sourceMappingURL=QuickCreateModal.js.map