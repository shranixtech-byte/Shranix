import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function SplashScreen({ onComplete, duration = 2500 }) {
    const [progress, setProgress] = useState(0);
    const [fadeOut, setFadeOut] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 15 + 5;
                return Math.min(next, 100);
            });
        }, 200);
        const timer = setTimeout(() => {
            clearInterval(interval);
            setProgress(100);
            setFadeOut(true);
            setTimeout(() => {
                onComplete?.();
            }, 500);
        }, duration);
        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [duration, onComplete]);
    return (_jsxs("div", { className: `fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-green-900 to-green-800 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`, children: [_jsx("div", { className: "mb-8 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/10 backdrop-blur-sm shadow-xl ring-1 ring-white/10", children: _jsx("img", { src: "/logo.png", alt: "SHRANIX", className: "h-full w-full object-cover", width: 80, height: 80 }) }), _jsx("h1", { className: "mb-2 text-2xl font-bold tracking-tight text-white", children: "SHRANIX Krushi ERP" }), _jsx("p", { className: "mb-8 text-sm font-medium text-green-200/80", children: "Enterprise Agriculture Management" }), _jsx("div", { className: "h-1.5 w-64 overflow-hidden rounded-full bg-white/10", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-all duration-300 ease-out", style: { width: `${progress}%` } }) }), _jsxs("p", { className: "mt-4 text-xs font-medium text-green-200/60", children: [progress < 30 && 'Initializing...', progress >= 30 && progress < 60 && 'Loading modules...', progress >= 60 && progress < 90 && 'Preparing workspace...', progress >= 90 && 'Ready to launch...'] }), _jsx("p", { className: "absolute bottom-6 text-xs text-green-200/40", children: "v1.0.0" })] }));
}
//# sourceMappingURL=splash-screen.js.map