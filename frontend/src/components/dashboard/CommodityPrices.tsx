import { Wheat, TrendingUp, Minus } from 'lucide-react';

const placeholderCommodities = [
  { name: 'Soybean', symbol: 'SB', change: null },
  { name: 'Cotton', symbol: 'CT', change: null },
  { name: 'Wheat', symbol: 'WH', change: null },
  { name: 'Sugarcane', symbol: 'SC', change: null },
  { name: 'Maize', symbol: 'MZ', change: null },
];

export function CommodityPrices() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
            <Wheat className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Commodity Prices</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Agriculture market</p>
          </div>
        </div>

        {/* Commodity table placeholder — premium empty state */}
        <div className="mt-4 space-y-1.5">
          {placeholderCommodities.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-all hover:border-slate-100 hover:bg-slate-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800/30"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-bold text-emerald-700 dark:from-emerald-900/30 dark:to-teal-900/30 dark:text-emerald-400">
                {c.symbol}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{c.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">-- / quintal</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-300 dark:text-slate-600">--</p>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-300 dark:text-slate-600">
                  <Minus className="h-2.5 w-2.5" /> --
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/20">
              <TrendingUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Commodity feed coming soon</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Connect market data API for live prices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
