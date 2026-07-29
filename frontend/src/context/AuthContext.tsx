import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { authService } from '@/services/auth.service';
import type { UserData, LoginRequest, RegisterRequest } from '@/services/auth.service';

export interface AuthContextValue {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      // First try to refresh the token
      const tokens = await authService.refreshToken();
      if (!tokens) {
        setUser(null);
        return false;
      }

      // Then get user data
      const userData = await authService.getMe();
      setUser(userData);
      return userData !== null;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (authService.isAuthenticated()) {
        await refreshSession();
      }
      setIsLoading(false);
    };
    init();
  }, [refreshSession]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authService.register(data);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
