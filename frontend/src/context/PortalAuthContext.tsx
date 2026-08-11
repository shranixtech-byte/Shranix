import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearPortalSession,
  getPortalToken,
  getPortalUser,
  hasPortalSession,
  portalService,
  type PortalUser,
} from '@/services/portal.service';

interface PortalAuthContextValue {
  user: PortalUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(() => getPortalUser());

  // Restore session on mount — validate token server-side via /auth/me
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!hasPortalSession() || !getPortalToken()) {
        return;
      }
      const me = await portalService.me().catch(() => null);
      if (!cancelled) {
        if (me) {
          setUser(me);
        } else {
          clearPortalSession();
          setUser(null);
        }
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await portalService.login(email, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await portalService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!getPortalToken(),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) {
    throw new Error('usePortalAuth must be used within PortalAuthProvider');
  }
  return ctx;
}
