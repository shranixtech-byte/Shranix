import { CloudSun, MapPin, Cloud, Sun, Droplets, Wind } from 'lucide-react';

export function WeatherWidget() {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-sky-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5" />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md">
            <CloudSun className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Weather</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Local conditions</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[60px]">Location</span>
            </div>
          </div>
        </div>

        {/* Weather data placeholder — beautiful empty state */}
        <div className="mt-4 flex flex-col items-center rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 py-6 dark:from-sky-950/20 dark:to-cyan-950/20">
          <div className="flex items-center gap-3">
            <Sun className="h-10 w-10 text-amber-400" />
            <div>
              <p className="text-3xl font-bold tracking-tight text-slate-300 dark:text-slate-600">--°</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Connect weather data</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-sky-400" />
              <span>--%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-sky-400" />
              <span>-- km/h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
              <span>--%</span>
            </div>
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/20">
              <MapPin className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Connect weather data source</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">API integration required for live weather</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
