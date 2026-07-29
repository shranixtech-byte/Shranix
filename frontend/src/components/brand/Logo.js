import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
/**
 * SHRANIX Krushi ERP — Official Logo
 *
 * Uses the official SHRANIX logo image.
 * Variants:
 *   - default: Full logo + tagline (login, splash)
 *   - compact: Logo + product name (sidebar header)
 *   - icon-only: Just the mark (sidebar collapsed, favicon)
 */
export function Logo({ variant = 'default', className }) {
    const mark = (_jsx("img", { src: "/logo.png", alt: "SHRANIX", className: "h-10 w-10 object-contain", width: 40, height: 40 }));
    if (variant === 'icon-only') {
        return _jsx("div", { className: cn('shrink-0', className), children: _jsx("img", { src: "/logo.png", alt: "SHRANIX", className: "h-8 w-8 object-contain", width: 32, height: 32 }) });
    }
    return (_jsxs("div", { className: cn('flex flex-col items-center gap-0.5', className), children: [mark, variant === 'default' && (_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "text-sm font-bold tracking-wide text-white", children: "SHRANIX" }), _jsx("span", { className: "text-[10px] font-medium tracking-[0.15em] text-emerald-400/70 uppercase", children: "Krushi ERP" })] })), variant === 'compact' && (_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "text-sm font-bold tracking-wide text-white", children: "SHRANIX" }), _jsx("span", { className: "text-[10px] font-semibold tracking-[0.15em] text-blue-400/70 uppercase", children: "Krushi ERP" })] }))] }));
}
/**
 * Full hero logo for login screen and splash screen.
 */
export function HeroLogo({ className }) {
    return (_jsxs("div", { className: cn('flex flex-col items-center gap-4', className), children: [_jsx("div", { className: "flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10", children: _jsx("img", { src: "/logo.png", alt: "SHRANIX", className: "h-full w-full object-cover", width: 80, height: 80 }) }), _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-white", children: "SHRANIX" }), _jsx("p", { className: "text-sm font-medium tracking-[0.2em] text-emerald-300/80 uppercase", children: "Krushi ERP" }), _jsx("p", { className: "mt-1 text-xs text-slate-400", children: "Enterprise Agriculture ERP" })] })] }));
}
//# sourceMappingURL=Logo.js.map