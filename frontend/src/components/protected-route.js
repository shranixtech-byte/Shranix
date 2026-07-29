import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/context/AuthContext';
/**
 * ProtectedRoute validates authentication on every navigation.
 * - Shows LoadingScreen while checking session
 * - Redirects to /auth/login if not authenticated
 * - Attempts token refresh if session expires
 * - Passes `from` location for post-login redirect
 */
export function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading, refreshSession } = useAuth();
    const location = useLocation();
    const [checking, setChecking] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    useEffect(() => {
        const check = async () => {
            if (isLoading) {
                // AuthProvider is still initializing
                return;
            }
            if (isAuthenticated) {
                setAuthenticated(true);
                setChecking(false);
                return;
            }
            // Try to refresh the session
            const valid = await refreshSession();
            setAuthenticated(valid);
            setChecking(false);
        };
        check();
    }, [isAuthenticated, isLoading, refreshSession]);
    // Show loading while checking
    if (isLoading || checking) {
        return _jsx(LoadingScreen, {});
    }
    // Redirect to login if not authenticated
    if (!authenticated) {
        return _jsx(Navigate, { to: "/auth/login", state: { from: location }, replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=protected-route.js.map