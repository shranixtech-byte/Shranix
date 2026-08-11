import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getUserLandingPath, isPathAllowed } from '@/lib/module-access';
import type { UserData } from '@/services/auth.service';

import { useTheme } from './theme-provider';

// ═══════════════════════════════════════════════════════════
// DASHBOARD / APP PREFERENCES (Settings Hub → Dashboard)
// Client-side (localStorage) — per device, applies instantly.
// ═══════════════════════════════════════════════════════════

export type Language = 'en' | 'mr';
export type ThemeColor = 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'cyan' | 'slate';

/** Dashboard widgets — har widget ON/OFF kiya jaa sakta hai. */
export interface DashboardWidgetPrefs {
  heroBanner: boolean;
  kpis: boolean;
  stockAlerts: boolean;
  weather: boolean;
  activity: boolean;
  inventorySummary: boolean;
  notifications: boolean;
  overviewChart: boolean;
  topProducts: boolean;
}

export type WidgetId = keyof DashboardWidgetPrefs;

export const WIDGET_DEFS: { id: WidgetId; label: string; hint: string }[] = [
  { id: 'heroBanner', label: 'Hero Banner', hint: 'Top greeting banner' },
  { id: 'kpis', label: 'KPI Summary Cards', hint: "Today's Sales, Purchase, Stock value…" },
  { id: 'stockAlerts', label: 'Stock Alerts', hint: 'Expiry alerts + low stock' },
  { id: 'weather', label: 'Weather & Mandi Rates', hint: 'Live weather + mandi price board' },
  { id: 'activity', label: 'Recent Activity', hint: 'Latest transactions timeline' },
  { id: 'inventorySummary', label: 'Inventory Summary', hint: 'Stock position snapshot' },
  { id: 'notifications', label: 'Notifications Panel', hint: 'Alerts & reminders' },
  {
    id: 'overviewChart',
    label: 'Overview Chart & Quick Actions',
    hint: 'Daily overview + shortcuts',
  },
  { id: 'topProducts', label: 'Top Products & Customers', hint: 'Best sellers + top buyers' },
];

export interface Preferences {
  widgets: DashboardWidgetPrefs;
  darkMode: 'light' | 'dark' | 'system';
  compactMode: boolean;
  language: Language;
  /** Default landing page (path) after login — validated against allowed modules. */
  landingPage: string;
  themeColor: ThemeColor;
}

export const DEFAULT_PREFERENCES: Preferences = {
  widgets: {
    heroBanner: true,
    kpis: true,
    stockAlerts: true,
    weather: true,
    activity: true,
    inventorySummary: true,
    notifications: true,
    overviewChart: true,
    topProducts: true,
  },
  darkMode: 'light',
  compactMode: false,
  language: 'en',
  landingPage: '/',
  themeColor: 'emerald',
};

const STORAGE_KEY = 'shranix-preferences';

/** Theme Color → HSL triplets (CSS vars --primary/--ring). Matches globals.css defaults. */
export const THEME_COLORS: Record<
  ThemeColor,
  { label: string; light: string; dark: string; swatch: string }
> = {
  emerald: { label: 'Emerald', light: '142 76% 20%', dark: '142 50% 45%', swatch: '#10b981' },
  blue: { label: 'Blue', light: '221 83% 40%', dark: '217 80% 55%', swatch: '#2563eb' },
  violet: { label: 'Violet', light: '262 83% 42%', dark: '262 80% 58%', swatch: '#8b5cf6' },
  rose: { label: 'Rose', light: '350 89% 42%', dark: '350 80% 55%', swatch: '#f43f5e' },
  amber: { label: 'Amber', light: '38 92% 38%', dark: '38 90% 50%', swatch: '#f59e0b' },
  cyan: { label: 'Cyan', light: '190 95% 32%', dark: '190 90% 50%', swatch: '#06b6d4' },
  slate: { label: 'Slate', light: '222 47% 24%', dark: '222 45% 55%', swatch: '#64748b' },
};

/** Safe localStorage read — corrupt JSON pe defaults par fallback. */
function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      widgets: { ...DEFAULT_PREFERENCES.widgets, ...(parsed.widgets ?? {}) },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface PreferencesContextValue {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  setWidget: (id: WidgetId, enabled: boolean) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [preferences, setPreferencesState] = useState<Preferences>(loadPreferences);

  // ── Persist ─────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      /* storage full/blocked — ignore */
    }
  }, [preferences]);

  // ── Dark Mode → ThemeProvider Sync ────────────────────────
  // ThemeProvider is the single source of truth for theme state.
  // We keep preferences.darkMode aligned with ThemeProvider theme state without circular loops.
  useEffect(() => {
    setPreferencesState((prev) => (prev.darkMode === theme ? prev : { ...prev, darkMode: theme }));
  }, [theme]);

  // ── Compact Mode → html.shranix-compact ─────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('shranix-compact', preferences.compactMode);
  }, [preferences.compactMode]);

  // ── Language → data-language attribute ──────────────────
  useEffect(() => {
    document.documentElement.dataset.language = preferences.language;
  }, [preferences.language]);

  // ── Theme Color → override --primary / --ring (light/dark aware) ──
  useEffect(() => {
    const root = document.documentElement;
    const t = THEME_COLORS[preferences.themeColor];
    const value = resolvedTheme === 'dark' ? t.dark : t.light;
    root.style.setProperty('--primary', value);
    root.style.setProperty('--ring', value);
  }, [preferences.themeColor, resolvedTheme]);

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferencesState((prev) => ({ ...prev, [key]: value }));
      if (key === 'darkMode') {
        setTheme(value as 'light' | 'dark' | 'system');
      }
    },
    [setTheme],
  );

  const setWidget = useCallback((id: WidgetId, enabled: boolean) => {
    setPreferencesState((prev) => ({ ...prev, widgets: { ...prev.widgets, [id]: enabled } }));
  }, []);

  const resetPreferences = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({ preferences, setPreference, setWidget, resetPreferences }),
    [preferences, setPreference, setWidget, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

/**
 * Default Landing Page — user ki preference path use karo, par sirf tab
 * jab wo path user ke allowed modules ke andar ho. Restricted users ke liye
 * fallback module-access landing (getUserLandingPath).
 */
export function getPreferredLandingPath(
  preferences: Preferences,
  user: UserData | null | undefined,
): string {
  const preferred = preferences.landingPage || '/';
  if (isPathAllowed(preferred, user)) {
    return preferred;
  }
  return getUserLandingPath(user);
}
