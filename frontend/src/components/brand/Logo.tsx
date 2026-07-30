import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'default' | 'compact' | 'icon-only' | 'sidebar';
  className?: string;
}

/**
 * SHRANIX Krushi ERP — Official Logo
 *
 * Uses the official SHRANIX logo image.
 * Variants:
 *   - default: Full logo + tagline (login, splash)
 *   - compact: Logo + product name (sidebar header)
 *   - icon-only: Just the mark (sidebar collapsed, favicon)
 */
export function Logo({ variant = 'default', className }: LogoProps) {
  const mark = (
    <img
      src="/logo.png"
      alt="SHRANIX"
      className="h-10 w-10 object-contain"
      width={40}
      height={40}
    />
  );

  if (variant === 'icon-only') {
    return (
      <div className={cn('shrink-0', className)}>
        <img
          src="/logo.png"
          alt="SHRANIX"
          className="h-10 w-10 object-contain"
          width={40}
          height={40}
        />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={cn('flex flex-col items-center gap-1.5', className)}>
        <div className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="SHRANIX"
            className="h-14 w-14 object-contain"
            width={56}
            height={56}
          />
        </div>
        <div className="flex flex-col items-center gap-0">
          <span className="text-[15px] font-bold tracking-wider text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
            SHRANIX TECHNOLOGIES
          </span>
          <span className="text-[10px] font-medium tracking-[0.12em] text-blue-400/70 uppercase" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>
            KRUSHI ERP
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      {mark}
      {variant === 'default' && (
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tracking-wide text-white">
            SHRANIX
          </span>
          <span className="text-[10px] font-medium tracking-[0.15em] text-emerald-400/70 uppercase">
            Krushi ERP
          </span>
        </div>
      )}
      {variant === 'compact' && (
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tracking-wide text-white">
            SHRANIX
          </span>
          <span className="text-[10px] font-semibold tracking-[0.15em] text-blue-400/70 uppercase">
            Krushi ERP
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Full hero logo for login screen and splash screen.
 */
export function HeroLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10">
        <img
          src="/logo.png"
          alt="SHRANIX"
          className="h-full w-full object-cover"
          width={80}
          height={80}
        />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          SHRANIX
        </h1>
        <p className="text-sm font-medium tracking-[0.2em] text-emerald-300/80 uppercase">
          Krushi ERP
        </p>
        <p className="mt-1 text-xs text-slate-400">Enterprise Agriculture ERP</p>
      </div>
    </div>
  );
}
