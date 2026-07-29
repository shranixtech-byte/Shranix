import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
// ═══════════════════════════════════════════════════════════
// ICONS (inline SVG to avoid lucide dependency for login page)
// ═══════════════════════════════════════════════════════════
function MoonIcon({ className }) {
    return (_jsx("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }) }));
}
function EyeIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
}
function EyeOffIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" }), _jsx("path", { d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" }), _jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23", strokeWidth: "2" })] }));
}
function CheckIcon({ className }) {
    return (_jsx("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
}
function FarmersIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
}
function CropIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M2 22V2l20 20" }), _jsx("path", { d: "M6 12V6h6" }), _jsx("path", { d: "M10 2h4v4" })] }));
}
function InventoryIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M22 7.5v9L12 22 2 16.5v-9L12 2l10 5.5z" }), _jsx("path", { d: "M2 7.5l10 5.5 10-5.5" }), _jsx("path", { d: "M12 22V11.5" })] }));
}
function SalesIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 20V10" }), _jsx("path", { d: "M18 20V4" }), _jsx("path", { d: "M6 20v-4" })] }));
}
function AnalyticsIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M3 3v18h18" }), _jsx("path", { d: "M7 16l4-8 4 4 4-6" })] }));
}
function WeatherIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 2v2" }), _jsx("path", { d: "M4.93 4.93l1.41 1.41" }), _jsx("path", { d: "M20 12h2" }), _jsx("path", { d: "M19.07 4.93l-1.41 1.41" }), _jsx("path", { d: "M15.5 12a3.5 3.5 0 0 0-7 0" }), _jsx("path", { d: "M12 14h.01" }), _jsx("path", { d: "M12 18c-3.31 0-6-2.69-6-6a6 6 0 1 1 12 0c0 .34-.03.67-.08 1" }), _jsx("path", { d: "M16 18c0 2.21-1.79 4-4 4a4 4 0 0 1-4-4" })] }));
}
function HumidityIcon({ className }) {
    return (_jsx("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" }) }));
}
function CalendarIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" })] }));
}
function GlobeIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "2", y1: "12", x2: "22", y2: "12" }), _jsx("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })] }));
}
function SunIcon({ className }) {
    return (_jsxs("svg", { className: className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M12 2v2" }), _jsx("path", { d: "M12 20v2" }), _jsx("path", { d: "M4.93 4.93l1.41 1.41" }), _jsx("path", { d: "M17.66 17.66l1.41 1.41" }), _jsx("path", { d: "M2 12h2" }), _jsx("path", { d: "M20 12h2" }), _jsx("path", { d: "M6.34 17.66l-1.41 1.41" }), _jsx("path", { d: "M19.07 4.93l-1.41 1.41" })] }));
}
// ═══════════════════════════════════════════════════════════
// OFFICIAL SHRANIX LOGIN BACKGROUND — login.png
// ═══════════════════════════════════════════════════════════
// Official approved background: tractor in green fields with sunrise/sunset lighting
const HERO_IMAGE_URL = '/login-bg.png';
// ═══════════════════════════════════════════════════════════
// FEATURE LIST
// ═══════════════════════════════════════════════════════════
const features = [
    { icon: FarmersIcon, labelEn: 'Farmer Management', labelMr: 'शेतकरी व्यवस्थापन' },
    { icon: CropIcon, labelEn: 'Crop Planning', labelMr: 'पीक नियोजन' },
    { icon: InventoryIcon, labelEn: 'Inventory Management', labelMr: 'स्टॉक व्यवस्थापन' },
    { icon: SalesIcon, labelEn: 'Sales & Billing', labelMr: 'विक्री व बिलिंग' },
    { icon: AnalyticsIcon, labelEn: 'Analytics & Reports', labelMr: 'विश्लेषण व अहवाल' },
    { icon: WeatherIcon, labelEn: 'Weather Integration', labelMr: 'हवामान एकत्रीकरण' },
];
// ═══════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════
export function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [language, setLanguage] = useState('en');
    const [theme, setTheme] = useState('dark');
    // Redirect if already authenticated
    if (isAuthenticated) {
        return _jsx(Navigate, { to: from, replace: true });
    }
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await login({ email, password });
            navigate(from, { replace: true });
        }
        catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return (_jsxs("div", { className: "relative flex min-h-screen overflow-hidden", children: [_jsxs("div", { className: "absolute inset-0", children: [_jsx("img", { src: HERO_IMAGE_URL, alt: "SHRANIX Krushi ERP \u2014 Agriculture landscape", className: "h-full w-full object-cover", loading: "eager" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-emerald-950/25 via-emerald-900/12 to-amber-950/6" })] }), _jsxs("div", { className: "absolute top-5 right-5 z-50 flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center rounded-full bg-white/10 backdrop-blur-md border border-white/15 p-0.5", children: [_jsxs("button", { onClick: () => setLanguage('en'), className: `flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${language === 'en'
                                    ? 'bg-white/20 text-white shadow-sm'
                                    : 'text-white/50 hover:text-white/80'}`, children: [_jsx(GlobeIcon, { className: "h-3 w-3" }), "EN"] }), _jsx("button", { onClick: () => setLanguage('mr'), className: `flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${language === 'mr'
                                    ? 'bg-white/20 text-white shadow-sm'
                                    : 'text-white/50 hover:text-white/80'}`, children: "MR" })] }), _jsx("button", { onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), className: "flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/70 hover:text-white transition-all duration-200 hover:bg-white/20", title: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', children: theme === 'dark' ? _jsx(SunIcon, { className: "h-4 w-4" }) : _jsx(MoonIcon, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "hidden md:flex md:w-[55%] lg:w-[60%] relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-emerald-950/50 via-emerald-950/15 to-transparent z-[1]" }), _jsxs("div", { className: "relative z-20 flex flex-col justify-between h-full w-full px-10 lg:px-14 pt-12 pb-8", children: [_jsx("div", { className: "-ml-6", children: _jsxs("div", { className: "flex items-center gap-0", children: [_jsx("img", { src: "/logo.png", alt: "SHRANIX", className: "object-contain shrink-0 animate-[fadeInUp_0.7s_ease-out]", style: { width: '280px', height: '280px' } }), _jsxs("div", { className: "animate-[fadeInUp_0.7s_ease-out_0.2s_both]", children: [_jsx("h1", { className: "text-5xl font-extrabold tracking-tight", style: { color: '#FBBF24', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }, children: "SHRANIX" }), _jsx("p", { className: "text-sm font-bold tracking-[0.35em] text-[#22C55E] uppercase pl-1", style: { textShadow: '0 1px 4px rgba(0,0,0,0.25)' }, children: "KRUSHI ERP" }), _jsx("p", { className: "mt-2 text-base font-medium tracking-wide text-white/80", style: { textShadow: '0 1px 4px rgba(0,0,0,0.2)' }, children: language === 'mr' ? 'स्मार्ट कृषी व्यवस्थापन प्रणाली' : 'Smart Agriculture Management System' })] }), _jsx("img", { src: "/god/ganpati.png", alt: "Ganpati Bappa", className: "h-24 w-24 sm:h-28 sm:w-28 object-contain self-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]", style: { transform: 'translateX(-140px) translateY(-20px) rotate(-20deg)' }, loading: "eager" })] }) }), _jsxs("div", { className: "space-y-10", children: [_jsxs("div", { className: "-mt-10", children: [_jsxs("h2", { className: "text-4xl leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight", style: {
                                                    fontWeight: 800,
                                                    textShadow: '0 2px 10px rgba(0,0,0,0.25)',
                                                }, children: [language === 'mr' ? 'स्मार्ट शेती' : 'Smart Farming', ",", _jsx("br", {}), _jsx("span", { className: "text-emerald-300", children: language === 'mr' ? 'स्मार्ट व्यवसाय' : 'Smarter Business' })] }), _jsx("p", { className: "mt-4 text-sm leading-relaxed max-w-md", style: { color: 'rgba(255,255,255,0.88)' }, children: language === 'mr'
                                                    ? 'आधुनिक शेती व्यवसायांसाठी डिझाइन केलेले एंड-टू-एंड कृषी ERP प्लॅटफॉर्म. शेतापासून बाजारापर्यंत तुमची संपूर्ण कृषी मूल्य साखळी व्यवस्थापित करा.'
                                                    : 'End-to-end agriculture ERP platform designed for modern farming enterprises. Manage your entire agricultural value chain from field to market.' })] }), _jsx("div", { className: "grid grid-cols-2 gap-x-10 gap-y-2", children: features.map((feature) => {
                                            const Icon = feature.icon;
                                            return (_jsxs("div", { className: "flex items-center gap-4 group", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-emerald-300/90 group-hover:bg-white/15 group-hover:text-emerald-300 transition-all duration-300", children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm text-white group-hover:text-white transition-colors", style: { fontWeight: 600 }, children: language === 'mr' ? feature.labelMr : feature.labelEn })] }, feature.labelEn));
                                        }) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-8 mb-6", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/8 backdrop-blur-md border border-white/18 px-5 py-3 shadow-lg shadow-black/10 animate-[fadeInUp_0.5s_ease-out_0.6s_both]", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20", children: _jsx(WeatherIcon, { className: "h-5 w-5 text-amber-300" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[9px] uppercase tracking-widest", style: { fontWeight: 600, color: 'rgba(255,255,255,0.8)' }, children: language === 'mr' ? 'हवामान' : 'Weather' }), _jsx("p", { className: "text-sm text-white", style: { fontWeight: 700 }, children: "28\u00B0C \u00B7 Sunny" })] })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/8 backdrop-blur-md border border-white/18 px-5 py-3 shadow-lg shadow-black/10 animate-[fadeInUp_0.5s_ease-out_0.7s_both]", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/20", children: _jsx(HumidityIcon, { className: "h-5 w-5 text-blue-300" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[9px] uppercase tracking-widest", style: { fontWeight: 600, color: 'rgba(255,255,255,0.8)' }, children: language === 'mr' ? 'आर्द्रता' : 'Humidity' }), _jsx("p", { className: "text-sm text-white", style: { fontWeight: 700 }, children: "62%" })] })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-2xl bg-white/8 backdrop-blur-md border border-white/18 px-5 py-3 shadow-lg shadow-black/10 animate-[fadeInUp_0.5s_ease-out_0.8s_both]", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/20", children: _jsx(CalendarIcon, { className: "h-5 w-5 text-emerald-300" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[9px] uppercase tracking-widest", style: { fontWeight: 600, color: 'rgba(255,255,255,0.8)' }, children: language === 'mr' ? 'तारीख' : 'Date' }), _jsx("p", { className: "text-sm text-white", style: { fontWeight: 700 }, children: dateStr })] })] })] }), _jsxs("div", { className: "flex items-center justify-between text-xs border-t border-white/8 pt-4", style: { color: 'rgba(255,255,255,0.5)' }, children: [_jsxs("span", { children: ["\u00A9 ", today.getFullYear(), " ", language === 'mr' ? 'श्रानिक्स टेक्नॉलॉजीज प्रा. लि.' : 'SHRANIX Technologies Pvt. Ltd.'] }), _jsx("span", { children: language === 'mr' ? 'आवृत्ती १.०.०' : 'Version 1.0.0' })] })] })] })] }), _jsx("div", { className: "w-full md:w-[45%] lg:w-[40%] relative flex items-center justify-center", children: _jsxs("div", { className: "relative w-full max-w-[480px] mx-auto px-6 py-8 sm:px-10", children: ["              ", _jsxs("div", { className: "rounded-[12px] p-8 sm:p-10 pt-3", style: {
                                background: 'rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(2px)',
                                WebkitBackdropFilter: 'blur(2px)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                borderRadius: '12px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.30)',
                                animation: 'cardEntrance 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
                            }, children: [_jsxs("div", { className: "text-center mb-1.5", children: [_jsx("h2", { className: "text-2xl font-bold text-white", style: { textShadow: '0 1px 6px rgba(0,0,0,0.2)' }, children: language === 'mr' ? 'पुन्हा स्वागत आहे' : 'Welcome Back' }), _jsx("p", { className: "text-sm mt-1", style: { color: 'rgba(255,255,255,0.75)' }, children: language === 'mr' ? 'खात्यात प्रवेश करा' : 'Sign in to continue' })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [error && (_jsx("div", { className: "rounded-xl px-4 py-3 text-sm font-medium backdrop-blur-sm animate-[fadeInUp_0.5s_ease-out_0.05s_both]", style: {
                                                backgroundColor: 'rgba(239,68,68,0.1)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239,68,68,0.15)',
                                            }, children: error })), _jsxs("div", { className: "animate-[fadeInUp_0.5s_ease-out_0.1s_both]", children: [_jsx("label", { htmlFor: "email", className: "mb-2 block text-xs font-semibold uppercase tracking-wider", style: { color: 'rgba(255,255,255,0.92)' }, children: language === 'mr' ? 'ईमेल पत्ता' : 'Email Address' }), _jsx("div", { className: "relative", children: _jsx("input", { id: "email", type: "email", autoComplete: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: language === 'mr' ? 'तुमचा ईमेल टाका' : 'you@company.com', className: "w-full h-12 rounded-2xl border px-4 text-sm outline-none transition-all duration-200 placeholder:text-sm placeholder:text-white/70", style: {
                                                            color: '#ffffff',
                                                            borderColor: 'rgba(255,255,255,0.25)',
                                                            backgroundColor: 'rgba(255,255,255,0.08)',
                                                            backdropFilter: 'blur(8px)',
                                                            WebkitBackdropFilter: 'blur(8px)',
                                                        }, onFocus: (e) => {
                                                            e.target.style.borderColor = '#16A34A';
                                                            e.target.style.boxShadow = '0 0 0 4px rgba(22,163,74,0.15)';
                                                        }, onBlur: (e) => {
                                                            e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                                                            e.target.style.boxShadow = 'none';
                                                        } }) })] }), _jsxs("div", { className: "animate-[fadeInUp_0.5s_ease-out_0.18s_both]", children: [_jsx("label", { htmlFor: "password", className: "mb-2 block text-xs font-semibold uppercase tracking-wider", style: { color: 'rgba(255,255,255,0.92)' }, children: language === 'mr' ? 'पासवर्ड' : 'Password' }), _jsxs("div", { className: "relative", children: [_jsx("input", { id: "password", type: showPassword ? 'text' : 'password', autoComplete: "current-password", required: true, value: password, onChange: (e) => setPassword(e.target.value), placeholder: language === 'mr' ? 'तुमचा पासवर्ड टाका' : 'Enter your password', className: "w-full h-12 rounded-2xl border px-4 text-sm outline-none transition-all duration-200 placeholder:text-sm placeholder:text-white/70 pr-12", style: {
                                                                color: '#ffffff',
                                                                borderColor: 'rgba(255,255,255,0.25)',
                                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                                backdropFilter: 'blur(8px)',
                                                                WebkitBackdropFilter: 'blur(8px)',
                                                            }, onFocus: (e) => {
                                                                e.target.style.borderColor = '#16A34A';
                                                                e.target.style.boxShadow = '0 0 0 4px rgba(22,163,74,0.15)';
                                                            }, onBlur: (e) => {
                                                                e.target.style.borderColor = 'rgba(255,255,255,0.25)';
                                                                e.target.style.boxShadow = 'none';
                                                            } }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors", tabIndex: -1, children: showPassword ? _jsx(EyeOffIcon, { className: "h-5 w-5" }) : _jsx(EyeIcon, { className: "h-5 w-5" }) })] })] }), _jsxs("div", { className: "flex items-center justify-between animate-[fadeInUp_0.5s_ease-out_0.26s_both]", children: [_jsxs("label", { className: "flex items-center gap-2.5 cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: rememberMe, onChange: () => setRememberMe(!rememberMe), className: "sr-only", "aria-label": language === 'mr' ? 'लक्षात ठेवा' : 'Remember me' }), _jsx("div", { onClick: () => setRememberMe(!rememberMe), role: "checkbox", "aria-checked": rememberMe, tabIndex: 0, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setRememberMe(!rememberMe);
                                                            } }, className: "flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-all duration-150 cursor-pointer", style: {
                                                                borderColor: rememberMe ? '#16A34A' : 'rgba(255,255,255,0.3)',
                                                                backgroundColor: rememberMe ? '#16A34A' : 'rgba(255,255,255,0.08)',
                                                            }, children: rememberMe && _jsx(CheckIcon, { className: "h-3 w-3 text-white" }) }), _jsx("span", { className: "text-sm", style: { fontWeight: 600, color: 'rgba(255,255,255,0.95)' }, children: language === 'mr' ? 'लक्षात ठेवा' : 'Remember me' })] }), _jsx(Link, { to: "/auth/forgot-password", className: "text-sm transition-all duration-200 hover:text-[#16A34A] hover:underline", style: { fontWeight: 600, color: 'rgba(255,255,255,0.95)' }, children: language === 'mr' ? 'पासवर्ड विसरलात?' : 'Forgot password?' })] }), _jsx("div", { className: "animate-[fadeInUp_0.5s_ease-out_0.34s_both]", children: _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full h-11 rounded-2xl text-sm text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0", style: {
                                                    fontWeight: 700,
                                                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                                                    boxShadow: '0 4px 20px rgba(22,163,74,0.35)',
                                                }, onMouseEnter: (e) => {
                                                    if (!isSubmitting) {
                                                        e.currentTarget.style.background = 'linear-gradient(135deg, #15803D 0%, #166534 100%)';
                                                        e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.5)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }
                                                }, onMouseLeave: (e) => {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)';
                                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(22,163,74,0.35)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }, children: isSubmitting ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsxs("svg", { className: "animate-spin h-4 w-4", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", fill: "none" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), language === 'mr' ? 'साइन इन करत आहे...' : 'Signing in...'] })) : (language === 'mr' ? 'साइन इन करा' : 'Sign In') }) }), _jsx("div", { className: "text-center animate-[fadeInUp_0.5s_ease-out_0.42s_both]", children: _jsx("button", { type: "button", className: "w-full rounded-2xl border px-4 py-2.5 text-xs uppercase tracking-wider transition-all duration-200 hover:bg-white/10", style: {
                                                    fontWeight: 700,
                                                    color: 'rgba(255,255,255,0.88)',
                                                    borderColor: 'rgba(255,255,255,0.18)',
                                                    backdropFilter: 'blur(4px)',
                                                    WebkitBackdropFilter: 'blur(4px)',
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                }, children: language === 'mr' ? 'OTP द्वारे लॉगिन करा' : 'Login with OTP' }) })] }), _jsxs("div", { className: "mt-6 text-center text-xs animate-[fadeInUp_0.5s_ease-out_0.5s_both]", style: { color: 'rgba(255,255,255,0.7)' }, children: [language === 'mr' ? 'खाते नाही?' : "Don't have an account?", ' ', _jsx(Link, { to: "/auth/register", className: "font-semibold transition-colors hover:text-[#16A34A] hover:underline", style: { color: '#16A34A' }, children: language === 'mr' ? 'खाते तयार करा' : 'Create account' })] })] }), _jsxs("p", { className: "mt-6 text-center text-[10px] lg:hidden", style: { color: 'rgba(255,255,255,0.7)' }, children: ["\u00A9 ", today.getFullYear(), " ", language === 'mr' ? 'श्रानिक्स टेक्नॉलॉजीज प्रा. लि.' : 'SHRANIX Technologies Pvt. Ltd.'] })] }) })] }));
}
//# sourceMappingURL=login.js.map