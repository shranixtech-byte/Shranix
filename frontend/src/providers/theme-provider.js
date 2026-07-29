import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(undefined);
export function ThemeProvider({ children, defaultTheme = 'light', storageKey = 'shranix-theme', }) {
    const [theme, setThemeState] = useState(() => localStorage.getItem(storageKey) || defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState('light');
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        let resolved;
        if (theme === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        else {
            resolved = theme;
        }
        root.classList.add(resolved);
        setResolvedTheme(resolved);
    }, [theme]);
    const setTheme = useCallback((newTheme) => {
        localStorage.setItem(storageKey, newTheme);
        setThemeState(newTheme);
    }, [storageKey]);
    return (_jsx(ThemeContext.Provider, { value: { theme, setTheme, resolvedTheme }, children: children }));
}
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
//# sourceMappingURL=theme-provider.js.map