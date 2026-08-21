import { Leaf, Building2, Calendar } from 'lucide-react';
import { useMemo } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'शुभ प्रभात';
  }
  if (hour >= 12 && hour < 17) {
    return 'शुभ दुपार';
  }
  if (hour >= 17 && hour < 22) {
    return 'शुभ संध्याकाळ';
  }
  return 'शुभ रात्री';
}

function getEnglishGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good Evening';
  }
  return 'Good Night';
}

interface WelcomeBannerProps {
  userName: string;
  companyName?: string;
  financialYear?: string;
}

const HERO_IMAGE_URL = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80';

export function WelcomeBanner({
  userName,
  companyName = 'Default Company',
  financialYear = '2025-2026',
}: WelcomeBannerProps) {
  const greeting = useMemo(() => getGreeting(), []);
  const englishGreeting = useMemo(() => getEnglishGreeting(), []);

  return (
    <div className="relative flex h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 shadow-xl shadow-emerald-900/20 sm:h-60">
      {/* Hero Image Background */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE_URL}
          alt=""
          className="h-full w-full object-cover opacity-60"
          loading="eager"
        />
        {/* Premium multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-800/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-300/5 blur-xl" />
      <div className="absolute right-12 top-4 opacity-[0.04]">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <pattern
            id="welcome-dots"
            x="0"
            y="0"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="white" />
          </pattern>
          <rect width="120" height="120" fill="url(#welcome-dots)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 sm:w-3/5 sm:px-8 lg:w-1/2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-emerald-200 shadow-lg backdrop-blur-sm">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200/80">
            SHRANIX Krushi ERP
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          {greeting}, {userName}! 👋
        </h1>

        <p className="mt-1 text-sm leading-relaxed text-emerald-100/70">
          {englishGreeting}! Welcome to your enterprise dashboard. Here&apos;s your business
          overview for today.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-200/60">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {companyName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            FY {financialYear}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
            All systems operational
          </span>
        </div>
      </div>

      {/* Right decorative fade */}
      <div className="absolute bottom-0 right-0 top-0 w-32 bg-gradient-to-l from-emerald-950/40 to-transparent sm:block" />
    </div>
  );
}
