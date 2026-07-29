import type { ReactNode } from 'react';
type Theme = 'dark' | 'light' | 'system';
interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}
interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'dark' | 'light';
}
export declare function ThemeProvider({ children, defaultTheme, storageKey, }: ThemeProviderProps): import("react").JSX.Element;
export declare function useTheme(): ThemeContextValue;
export {};
//# sourceMappingURL=theme-provider.d.ts.map