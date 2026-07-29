import { jsx as _jsx } from "react/jsx-runtime";
/**
 * DEV MODE AUTH BYPASS
 * Provides mock authenticated user for screenshot capture
 * when the backend API is not available.
 *
 * This wraps the real AuthContext with mock data so all consumers work.
 */
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
// ── Mock user data ──────────────────────────────────────
const mockUser = {
    id: 'dev-user-001',
    email: 'admin@shranix.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    permissions: ['all'],
    isActive: true,
};
const mockContextValue = {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    refreshSession: async () => true,
};
export function AuthProvider({ children }) {
    return _jsx(AuthContext.Provider, { value: mockContextValue, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
//# sourceMappingURL=AuthContext.dev.js.map