interface LogoProps {
    variant?: 'default' | 'compact' | 'icon-only';
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
export declare function Logo({ variant, className }: LogoProps): import("react").JSX.Element;
/**
 * Full hero logo for login screen and splash screen.
 */
export declare function HeroLogo({ className }: {
    className?: string;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=Logo.d.ts.map