import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
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
        }
        catch {
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
    const login = useCallback(async (data) => {
        const response = await authService.login(data);
        setUser(response.user);
    }, []);
    const register = useCallback(async (data) => {
        const response = await authService.register(data);
        setUser(response.user);
    }, []);
    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);
    return (_jsx(AuthContext.Provider, { value: {
            user,
            isLoading,
            isAuthenticated: user !== null,
            login,
            register,
            logout,
            refreshSession,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
//# sourceMappingURL=AuthContext.js.map