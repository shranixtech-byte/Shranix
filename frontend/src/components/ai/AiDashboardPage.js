import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot, Lightbulb, TrendingUp, Zap, ShieldCheck, Cpu, Sparkles, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiCopilotPanel } from './AiCopilotPanel';
import { ForecastWidget } from './ForecastWidget';
import { InsightCard } from './InsightCard';
export const AiDashboardPage = () => {
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [insights, setInsights] = useState([]);
    const [health, setHealth] = useState(null);
    const [forecasts, setForecasts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadDashboardData();
    }, []);
    const loadDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [healthRes, insightsRes, salesFc, revenueFc, cashflowFc] = await Promise.all([
                fetch('/api/ai/health').then((r) => r.ok ? r.json() : null),
                fetch('/api/ai/insights').then((r) => r.ok ? r.json() : []),
                fetch('/api/ai/forecast/sales?periods=6').then((r) => r.ok ? r.json() : null),
                fetch('/api/ai/forecast/revenue?periods=4').then((r) => r.ok ? r.json() : null),
                fetch('/api/ai/forecast/cashflow?periods=3').then((r) => r.ok ? r.json() : null),
            ]);
            setHealth(healthRes);
            setInsights(Array.isArray(insightsRes) ? insightsRes : []);
            setForecasts({
                sales: salesFc,
                revenue: revenueFc,
                cashflow: cashflowFc,
            });
        }
        catch {
            setError('Failed to load AI dashboard data');
        }
        finally {
            setIsLoading(false);
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-3 text-gray-500", children: [_jsx(Cpu, { className: "h-6 w-6 animate-pulse text-blue-500" }), _jsx("span", { className: "text-sm", children: "Initializing AI Engine..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white", children: [_jsx(Sparkles, { className: "h-6 w-6 text-blue-600" }), "AI Intelligence Hub"] }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "AI-powered insights, forecasts, and automation for your ERP" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => setIsCopilotOpen(!isCopilotOpen), className: "flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl", children: [_jsx(Bot, { className: "h-4 w-4" }), "Open Copilot"] }), _jsx("button", { onClick: loadDashboardData, className: "rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800", children: _jsx(RefreshCw, { className: "h-4 w-4" }) })] })] }), error && (_jsx("div", { className: "rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20", children: error })), health && (_jsxs("div", { className: "flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900", children: [_jsx(ShieldCheck, { className: `h-5 w-5 ${health.available ? 'text-green-500' : 'text-red-500'}` }), _jsxs("div", { className: "text-sm", children: [_jsxs("span", { className: "font-medium text-gray-900 dark:text-white", children: [health.provider, "/", health.model] }), _jsx("span", { className: "mx-2 text-gray-300", children: "|" }), _jsxs("span", { className: health.available ? 'text-green-600' : 'text-red-600', children: [health.available ? 'Available' : 'Unavailable', " (", health.latencyMs, "ms)"] }), health.fallbackAvailable && (_jsx("span", { className: "ml-2 text-xs text-amber-600", children: "Fallback ready" }))] })] })), _jsxs("div", { children: [_jsxs("h2", { className: "mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white", children: [_jsx(Lightbulb, { className: "h-5 w-5 text-amber-500" }), "AI Insights"] }), insights.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3", children: insights.map((insight) => (_jsx(InsightCard, { insight: insight }, insight.id))) })) : (_jsx("p", { className: "text-sm text-gray-400", children: "No insights available. Enable an AI provider to generate insights." }))] }), _jsxs("div", { children: [_jsxs("h2", { className: "mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white", children: [_jsx(TrendingUp, { className: "h-5 w-5 text-blue-500" }), "Predictive Forecasts"] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: [forecasts.sales && (_jsx(ForecastWidget, { title: "Sales Revenue Forecast", metric: "Monthly Sales", unit: "\u20B9", currentValue: forecasts.sales.currentValue, forecastValue: forecasts.sales.forecastValue, changePercent: forecasts.sales.changePercent, data: forecasts.sales.dataPoints })), forecasts.revenue && (_jsx(ForecastWidget, { title: "Revenue Forecast", metric: "Quarterly Revenue", unit: "\u20B9", currentValue: forecasts.revenue.currentValue, forecastValue: forecasts.revenue.forecastValue, changePercent: forecasts.revenue.changePercent, data: forecasts.revenue.dataPoints })), forecasts.cashflow && (_jsx(ForecastWidget, { title: "Cash Flow Forecast", metric: "Monthly Cash Flow", unit: "\u20B9", currentValue: forecasts.cashflow.currentValue, forecastValue: forecasts.cashflow.forecastValue, changePercent: forecasts.cashflow.changePercent, data: forecasts.cashflow.dataPoints })), !forecasts.sales && !forecasts.revenue && !forecasts.cashflow && (_jsx("p", { className: "col-span-3 text-sm text-gray-400", children: "No forecast data available. Enable an AI provider for predictions." }))] })] }), _jsxs("div", { children: [_jsxs("h2", { className: "mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white", children: [_jsx(Zap, { className: "h-5 w-5 text-amber-500" }), "AI Capabilities"] }), _jsx("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4", children: [
                            { icon: Bot, label: 'ERP Copilot', desc: 'Ask questions about your data', path: '#copilot', color: 'blue' },
                            { icon: Lightbulb, label: 'Smart Insights', desc: 'Proactive business analysis', path: '#insights', color: 'amber' },
                            { icon: TrendingUp, label: 'Forecasts', desc: 'Predictive trend analysis', path: '#forecasts', color: 'green' },
                            { icon: Zap, label: 'Automation', desc: 'AI-assisted task automation', path: '#automation', color: 'purple' },
                        ].map((item) => (_jsxs("button", { onClick: () => item.path === '#copilot' && setIsCopilotOpen(true), className: `rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900`, children: [_jsx("div", { className: `mb-2 inline-flex rounded-lg p-2 bg-${item.color}-100 text-${item.color}-600`, children: _jsx(item.icon, { className: "h-5 w-5" }) }), _jsx("h3", { className: "text-sm font-semibold text-gray-900 dark:text-white", children: item.label }), _jsx("p", { className: "mt-0.5 text-xs text-gray-500", children: item.desc })] }, item.label))) })] }), _jsx(AiCopilotPanel, {})] }));
};
//# sourceMappingURL=AiDashboardPage.js.map