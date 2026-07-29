interface ProtectedRouteProps {
    children: React.ReactNode;
}
/**
 * ProtectedRoute validates authentication on every navigation.
 * - Shows LoadingScreen while checking session
 * - Redirects to /auth/login if not authenticated
 * - Attempts token refresh if session expires
 * - Passes `from` location for post-login redirect
 */
export declare function ProtectedRoute({ children }: ProtectedRouteProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=protected-route.d.ts.map