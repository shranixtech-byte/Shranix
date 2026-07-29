import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HeroLogo } from '@/components/brand/Logo';
export function LoadingScreen() {
    return (_jsxs("div", { className: "flex h-screen w-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950", children: [_jsxs("div", { className: "flex flex-col items-center gap-6", children: [_jsx(HeroLogo, {}), _jsx("div", { className: "mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/10", children: _jsx("div", { className: "h-full w-1/2 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-emerald-400" }) }), _jsx("p", { className: "text-sm text-slate-500", children: "Loading SHRANIX Krushi ERP..." })] }), _jsx("style", { children: `@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }` })] }));
}
//# sourceMappingURL=loading-screen.js.map