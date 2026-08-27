import { Leaf, Building2, Calendar, Sun, MapPin } from 'lucide-react';
import { useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';

interface HeroBannerProps {
  companyName?: string;
  financialYear?: string;
  weather?: string;
  location?: string;
}

const HERO_IMAGE_URL = '/assets/dashboard-bg.png';

export function HeroBanner({
  companyName = 'Default Company',
  financialYear = 'FY 2025-26',
  weather = '28°C • ढगाळ वातावरण',
  location = 'Pune, Maharashtra',
}: HeroBannerProps) {
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'शुभ सकाळ';
    }
    if (hour >= 12 && hour < 17) {
      return 'शुभ दुपार';
    }
    if (hour >= 17 && hour < 22) {
      return 'शुभ संध्याकाळ';
    }
    return 'शुभ रात्री';
  }, []);

  const displayName = user?.firstName || (user as any)?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/30 bg-gradient-to-r from-[#072418] via-[#093524] to-[#0d4732] text-white shadow-md">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_IMAGE_URL}
          alt="Agricultural background"
          className="h-full w-full object-cover object-right opacity-35 mix-blend-luminosity sm:opacity-45"
          loading="eager"
        />
        {/* Soft Multi-Layer Overlays for optimal readability and agricultural depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#062015] via-[#082e1f]/95 via-60% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062015]/60 via-transparent to-black/20" />
      </div>

      {/* Decorative subtle ambient lights */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />

      {/* Hero Banner Content (Comfortable Premium Layout) */}
      <div className="relative z-10 flex max-w-3xl flex-col justify-center px-5 py-3 sm:px-6 sm:py-3.5 lg:px-7 lg:py-3.5">
        {/* Top Brand Pill */}
        <div className="shadow-xs inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-400/30 bg-emerald-950/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300 backdrop-blur-md">
          <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-200">
            <Leaf className="h-2 w-2" strokeWidth={2.5} />
          </div>
          <span>SHRANIX KRUSHI ERP</span>
        </div>

        {/* Dynamic Marathi Greeting */}
        <h1 className="font-poppins mt-1.5 text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl lg:text-[22px]">
          {greeting}, {displayName}! 👋
        </h1>

        {/* Subtitle in Marathi */}
        <p className="mt-0.5 max-w-xl text-xs font-medium leading-normal text-emerald-100/85 sm:text-[13px]">
          तुमच्या व्यवसायाचा संपूर्ण आढावा एकाच ठिकाणी.
        </p>

        {/* Metadata Badges Row */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs sm:gap-2">
          {/* Company Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-medium text-slate-100 backdrop-blur-md transition-colors hover:bg-white/15">
            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>{companyName}</span>
          </span>

          {/* Financial Year Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-medium text-slate-100 backdrop-blur-md transition-colors hover:bg-white/15">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>{financialYear}</span>
          </span>

          {/* Weather Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-100 backdrop-blur-md">
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>{weather}</span>
          </span>

          {/* Location Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-500/15 px-2.5 py-0.5 font-medium text-teal-100 backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-teal-400" />
            <span>{location}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
