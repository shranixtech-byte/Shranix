export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface UserData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
    isActive: boolean;
}
export interface AuthResponse {
    user: UserData;
    tokens: AuthTokens;
}
declare class AuthService {
    private accessToken;
    constructor();
    getAccessToken(): string | null;
    setTokens(tokens: AuthTokens): void;
    clearTokens(): void;
    login(data: LoginRequest): Promise<AuthResponse>;
    register(data: RegisterRequest): Promise<AuthResponse>;
    hasRefreshToken(): boolean;
    refreshToken(): Promise<AuthTokens | null>;
    getMe(): Promise<UserData | null>;
    logout(): Promise<void>;
    changePassword(currentPassword: string, newPassword: string): Promise<void>;
    isAuthenticated(): boolean;
    validateSession(): Promise<boolean>;
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth.service.d.ts.map