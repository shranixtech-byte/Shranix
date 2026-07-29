/**
 * DEV MODE AUTH BYPASS
 * Provides mock authenticated user for screenshot capture
 * when the backend API is not available.
 *
 * This wraps the real AuthContext with mock data so all consumers work.
 */
import { type ReactNode } from 'react';
import type { AuthContextValue } from './AuthContext';
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthContextValue;
//# sourceMappingURL=AuthContext.dev.d.ts.map