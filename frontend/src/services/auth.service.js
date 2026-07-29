const API_BASE = `${(import.meta.env.VITE_API_URL || (window.location.protocol === 'file:' ? 'http://localhost:4001/api/v1' : '/api/v1')).replace(/\/$/, '')}/auth`;
const SESSION_KEY = 'shranix_session';
// ── JWT helper — decode payload without a library ──
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''));
        return JSON.parse(jsonPayload);
    }
    catch {
        return null;
    }
}
class AuthService {
    accessToken = null;
    constructor() {
        // Access tokens deliberately stay in memory. The API owns refresh tokens
        // in an HttpOnly cookie, so JavaScript never persists either token.
        // The shranix_session flag is kept in localStorage to know if a session exists.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
    getAccessToken() {
        return this.accessToken;
    }
    setTokens(tokens) {
        this.accessToken = tokens.accessToken;
        localStorage.setItem(SESSION_KEY, 'true');
    }
    clearTokens() {
        this.accessToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem(SESSION_KEY);
    }
    async login(data) {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(err.message || 'Login failed');
        }
        const body = await res.json();
        this.setTokens(body.data.tokens);
        // Decode JWT to enrich user data with role/permissions from the token
        const userData = body.data.user;
        const payload = body.data.tokens.accessToken ? decodeJwtPayload(body.data.tokens.accessToken) : null;
        if (payload && typeof payload.role === 'string') {
            userData.role = payload.role;
        }
        if (payload && Array.isArray(payload.permissions)) {
            userData.permissions = payload.permissions;
        }
        return body.data;
    }
    async register(data) {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Registration failed' }));
            throw new Error(err.message || 'Registration failed');
        }
        const body = await res.json();
        this.setTokens(body.data.tokens);
        // Decode JWT to enrich user data with role/permissions from the token
        const userData = body.data.user;
        const payload = body.data.tokens.accessToken ? decodeJwtPayload(body.data.tokens.accessToken) : null;
        if (payload && typeof payload.role === 'string') {
            userData.role = payload.role;
        }
        if (payload && Array.isArray(payload.permissions)) {
            userData.permissions = payload.permissions;
        }
        return body.data;
    }
    hasRefreshToken() {
        return localStorage.getItem(SESSION_KEY) !== null;
    }
    async refreshToken() {
        // Do NOT make a network request if no session has been established yet.
        // This prevents spurious 401 errors on a fresh page load.
        if (!this.hasRefreshToken()) {
            return null;
        }
        const res = await fetch(`${API_BASE}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            credentials: 'include',
        });
        if (!res.ok) {
            this.clearTokens();
            return null;
        }
        const body = await res.json();
        this.setTokens(body.data);
        return body.data;
    }
    async getMe() {
        const token = this.accessToken;
        if (!token) {
            return null;
        }
        // Try to get fresh data from API
        try {
            const res = await fetch(`${API_BASE}/me`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                const body = await res.json();
                // Enrich with JWT claims if API didn't return role/permissions
                const userData = body.data;
                const payload = this.accessToken ? decodeJwtPayload(this.accessToken) : null;
                if (payload) {
                    if (!userData.role && typeof payload.role === 'string') {
                        userData.role = payload.role;
                    }
                    if (Array.isArray(payload.permissions)) {
                        userData.permissions = payload.permissions;
                    }
                }
                return userData;
            }
        }
        catch {
            // Silently fail
        }
        return null;
    }
    async logout() {
        const token = this.accessToken;
        this.clearTokens();
        if (token) {
            try {
                // Read CSRF token from cookie (httpOnly: false, readable by JS)
                const csrfCookie = document.cookie
                    .split('; ')
                    .find((c) => c.startsWith('csrf_token='));
                const csrfToken = csrfCookie ? csrfCookie.split('=').slice(1).join('=') : undefined;
                const headers = {
                    Authorization: `Bearer ${token}`,
                };
                if (csrfToken) {
                    headers['x-csrf-token'] = csrfToken;
                }
                await fetch(`${API_BASE}/logout`, {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                });
            }
            catch {
                // Silently fail — tokens are already cleared
            }
        }
    }
    async changePassword(currentPassword, newPassword) {
        const token = this.accessToken;
        if (!token) {
            throw new Error('Not authenticated');
        }
        const res = await fetch(`${API_BASE}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Change password failed' }));
            throw new Error(err.message || 'Change password failed');
        }
    }
    isAuthenticated() {
        return this.accessToken !== null;
    }
    async validateSession() {
        const token = this.accessToken;
        if (!token) {
            return false;
        }
        // Try to refresh if needed
        try {
            const res = await fetch(`${API_BASE}/me`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                return true;
            }
            // Token expired, try refresh
            const newTokens = await this.refreshToken();
            return newTokens !== null;
        }
        catch {
            return false;
        }
    }
}
export const authService = new AuthService();
//# sourceMappingURL=auth.service.js.map