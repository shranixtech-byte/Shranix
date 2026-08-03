import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { LoadingScreen } from '@/components/loading-screen';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute validates authentication on every navigation.
 * - Shows LoadingScreen while checking session
 * - Redirects to /auth/login if not authenticated
 * - NO silent session auto-restore: a fresh page load always lands on
 *   the login page unless an in-memory session exists from this tab
 * - Passes `from` location for post-login redirect
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const check = () => {
      if (isLoading) {
        // AuthProvider is still initializing
        return;
      }

      // Only an in-memory session (from a login in this tab) grants access.
      // We deliberately DO NOT auto-refresh the session — every app start
      // shows the login page instead of skipping straight to the dashboard.
      setAuthenticated(isAuthenticated);
      setChecking(false);
    };

    check();
  }, [isAuthenticated, isLoading]);

  // Show loading while checking
  if (isLoading || checking) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
