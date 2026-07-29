import type { ReactNode } from 'react';
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
export declare const AuthContext: import("react").Context<AuthContextValue | undefined>;
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthContextValue;
//# sourceMappingURL=AuthContext.d.ts.map