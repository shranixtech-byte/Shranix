import { HeroLogo } from '@/components/brand/Logo';

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
      <div className="flex flex-col items-center gap-6">
        <HeroLogo />
        {/* Animated progress bar */}
        <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-emerald-400" />
        </div>
        <p className="text-sm text-slate-500">Loading SHRANIX Krushi ERP...</p>
      </div>
      <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}
