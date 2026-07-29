import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Leaf, Building2, Calendar } from 'lucide-react';
import { useMemo } from 'react';
function getGreeting() {
    const hour = new Date().getHours();
    const marathiGreeting = {
        morning: 'शुभ प्रभात',
        afternoon: 'शुभ दुपार',
        evening: 'शुभ संध्याकाळ',
    };
    if (hour < 12) {
        return marathiGreeting.morning;
    }
    if (hour < 17) {
        return marathiGreeting.afternoon;
    }
    return marathiGreeting.evening;
}
function getEnglishGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good Morning';
    }
    if (hour < 17) {
        return 'Good Afternoon';
    }
    return 'Good Evening';
}
const HERO_IMAGE_URL = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80';
export function WelcomeBanner({ userName, companyName = 'Default Company', financialYear = '2025-2026' }) {
    const greeting = useMemo(() => getGreeting(), []);
    const englishGreeting = useMemo(() => getEnglishGreeting(), []);
    return (_jsxs("div", { className: "relative flex h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 shadow-xl shadow-emerald-900/20 sm:h-60", children: [_jsxs("div", { className: "absolute inset-0", children: [_jsx("img", { src: HERO_IMAGE_URL, alt: "", className: "h-full w-full object-cover opacity-60", loading: "eager" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-800/40" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" })] }), _jsx("div", { className: "absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" }), _jsx("div", { className: "absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-300/5 blur-xl" }), _jsx("div", { className: "absolute right-12 top-4 opacity-[0.04]", children: _jsxs("svg", { width: "120", height: "120", viewBox: "0 0 120 120", children: [_jsx("pattern", { id: "welcome-dots", x: "0", y: "0", width: "16", height: "16", patternUnits: "userSpaceOnUse", children: _jsx("circle", { cx: "2", cy: "2", r: "1", fill: "white" }) }), _jsx("rect", { width: "120", height: "120", fill: "url(#welcome-dots)" })] }) }), _jsxs("div", { className: "relative z-10 flex w-full flex-col justify-center px-6 sm:w-3/5 sm:px-8 lg:w-1/2", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-emerald-200 shadow-lg", children: _jsx(Leaf, { className: "h-4 w-4" }) }), _jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200/80", children: "SHRANIX Krushi ERP" })] }), _jsxs("h1", { className: "mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl", children: [greeting, ", ", userName, "! \uD83D\uDC4B"] }), _jsxs("p", { className: "mt-1 text-sm leading-relaxed text-emerald-100/70", children: [englishGreeting, "! Welcome to your enterprise dashboard. Here's your business overview for today."] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-200/60", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Building2, { className: "h-3.5 w-3.5" }), companyName] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Calendar, { className: "h-3.5 w-3.5" }), "FY ", financialYear] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" }), "All systems operational"] })] })] }), _jsx("div", { className: "absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-950/40 to-transparent sm:block" })] }));
}
//# sourceMappingURL=WelcomeBanner.js.map