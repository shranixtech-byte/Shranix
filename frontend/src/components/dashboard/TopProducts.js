import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Package, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});
export function TopProducts({ products }) {
    const navigate = useNavigate();
    const displayed = products.slice(0, 4);
    return (_jsxs("div", { className: "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-900/50", children: [_jsxs("div", { className: "mb-5 flex items-start justify-between", children: [_jsxs("div", { className: "flex items-start gap-3.5", children: [_jsx("div", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm dark:from-blue-900/30 dark:to-blue-900/10 dark:text-blue-400", children: _jsx(Package, { className: "h-6 w-6", strokeWidth: 1.5 }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold text-slate-900 dark:text-white", children: "Top Products" }), _jsx("p", { className: "mt-0.5 text-xs text-slate-500 dark:text-slate-400", children: "Best selling this period" })] })] }), products.length > 4 && (_jsxs("button", { onClick: () => navigate('/inventory/items'), className: "flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400", children: ["View All ", _jsx(ArrowRight, { className: "h-3 w-3" })] }))] }), displayed.length === 0 ? (_jsx("div", { className: "flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/20", children: _jsxs("div", { className: "text-center", children: [_jsx(TrendingUp, { className: "mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" }), _jsx("p", { className: "mt-1.5 text-xs font-medium text-slate-400 dark:text-slate-500", children: "No product data yet" })] }) })) : (_jsx("div", { className: "space-y-2", children: displayed.map((product, idx) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl p-3 transition-all hover:bg-slate-50 hover:shadow-sm dark:hover:bg-slate-800/40", children: [_jsxs("div", { className: "flex items-center gap-3.5 min-w-0 flex-1", children: [_jsx("span", { className: `flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm ${idx === 0
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                                        : idx === 1
                                            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                                            : idx === 2
                                                ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`, children: idx + 1 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-semibold text-slate-900 dark:text-white truncate", children: product.name }), _jsx("p", { className: "mt-0.5 text-[11px] font-medium text-slate-400", children: product.sku })] })] }), _jsxs("div", { className: "ml-3 text-right", children: [_jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: currency.format(product.revenue) }), _jsxs("p", { className: "text-[11px] font-medium text-slate-400", children: [product.quantity, " units"] })] })] }, product.sku || idx))) }))] }));
}
//# sourceMappingURL=TopProducts.js.map