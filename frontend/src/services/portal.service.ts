import { resolveApiBase } from '@/lib/api-base';

const API_BASE = `${resolveApiBase()}/portal`;
const PORTAL_TOKEN_KEY = 'shranix_portal_token';
const PORTAL_SESSION_KEY = 'shranix_portal_session';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  customerId: string;
  status: string;
}

export interface PortalLoginResponse {
  accessToken: string;
  user: PortalUser;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPortalToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const body = (await response.json()) as T;
  return body;
}

export function getPortalToken(): string | null {
  return localStorage.getItem(PORTAL_TOKEN_KEY);
}

export function getPortalUser(): PortalUser | null {
  try {
    const raw = localStorage.getItem('shranix_portal_user');
    return raw ? (JSON.parse(raw) as PortalUser) : null;
  } catch {
    return null;
  }
}

export function hasPortalSession(): boolean {
  return localStorage.getItem(PORTAL_SESSION_KEY) === 'true';
}

export function setPortalSession(accessToken: string, user: PortalUser): void {
  localStorage.setItem(PORTAL_TOKEN_KEY, accessToken);
  localStorage.setItem('shranix_portal_user', JSON.stringify(user));
  localStorage.setItem(PORTAL_SESSION_KEY, 'true');
}

export function clearPortalSession(): void {
  localStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem('shranix_portal_user');
  localStorage.removeItem(PORTAL_SESSION_KEY);
}

export const portalService = {
  async login(email: string, password: string): Promise<PortalLoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(body.message || 'Login failed');
    }
    const body = (await res.json()) as PortalLoginResponse;
    setPortalSession(body.accessToken, body.user);
    const payload = decodeJwtPayload(body.accessToken);
    if (payload && typeof payload.customerId === 'string') {
      body.user.customerId = payload.customerId as string;
    }
    return body;
  },

  async me(): Promise<PortalUser | null> {
    try {
      return await request<PortalUser>('/auth/me');
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    } finally {
      clearPortalSession();
    }
  },

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(body.message || 'Request failed');
    }
    return res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Reset failed' }));
      throw new Error(body.message || 'Reset failed');
    }
    return res.json();
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ changed: boolean }> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ── Data ───────────────────────────────────────────────
  getDashboard: () => request('/dashboard'),
  getQuotations: () => request('/quotations'),
  getQuotation: (id: string) => request(`/quotations/${id}`),
  respondQuotation: (id: string, action: string, comment?: string) =>
    request(`/quotations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    }),
  getOrders: () => request('/orders'),
  getOrder: (id: string) => request(`/orders/${id}`),
  getInvoices: () => request('/invoices'),
  getInvoice: (id: string) => request(`/invoices/${id}`),
  getPayments: () => request('/payments'),
  getOutstanding: () => request('/outstanding'),
  getLedger: (params: { from?: string; to?: string; page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.from) {
      qs.set('from', params.from);
    }
    if (params.to) {
      qs.set('to', params.to);
    }
    if (params.page) {
      qs.set('page', String(params.page));
    }
    if (params.pageSize) {
      qs.set('pageSize', String(params.pageSize));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/ledger${suffix}`);
  },
  getProfile: () => request('/profile'),
  getNotifications: (limit = 20) => request(`/notifications?limit=${limit}`),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  async downloadDocument(type: string, id: string, filename: string): Promise<void> {
    const token = getPortalToken();
    const res = await fetch(`${API_BASE}/documents/${type}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || 'Download failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ── Tickets ────────────────────────────────────────────
  getTickets: () => request('/tickets'),
  getTicket: (id: string) => request(`/tickets/${id}`),
  createTicket: (data: unknown) =>
    request('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  replyTicket: (id: string, message: string, attachment?: unknown) =>
    request(`/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, attachment }),
    }),

  // ── Payments ───────────────────────────────────────────
  createPayment: (data: {
    invoiceId?: string;
    amount: number;
    mode: string;
    idempotencyKey: string;
  }) => request('/payments/create', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (id: string, verification?: unknown) =>
    request(`/payments/${id}/verify`, { method: 'POST', body: JSON.stringify(verification || {}) }),
  getPortalPayments: () => request('/payments'),

  // ── Billing (Phase 12) ────────────────────────────────
  getBillingOverview: () => request<Record<string, any>>('/billing/overview'),
  getBillingPlans: () => request<any[]>('/billing/plans'),
  getBillingInvoices: () => request<any[]>('/billing/invoices'),
  getBillingPayments: () => request<any[]>('/billing/payments'),
  getBillingHistory: () => request<any[]>('/billing/history'),
  subscribeToPlan: (data: { planId: string; couponCode?: string; autoRenew?: boolean }) =>
    request<Record<string, any>>('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyBillingPayment: (id: string, signature?: string) =>
    request<Record<string, any>>(`/billing/payments/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(signature ? { signature } : {}),
    }),

  // ── License (Phase 13) ────────────────────────────────
  getLicenseOverview: () => request<Record<string, any>>('/license'),
  getLicenseDevices: () => request<Record<string, any>>('/license/devices'),
  deactivateLicenseDevice: (devicePublicId: string, reason?: string) =>
    request<Record<string, any>>('/license/devices/deactivate', {
      method: 'POST',
      body: JSON.stringify({ devicePublicId, reason }),
    }),
  requestLicenseTransfer: (body: {
    fromDevicePublicId: string;
    toDeviceIdentifierHash: string;
    toDeviceName?: string;
    reason?: string;
  }) =>
    request<Record<string, any>>('/license/devices/transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  requestLicenseReactivation: (reason?: string) =>
    request<Record<string, any>>('/license/reactivate', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const portalAdminService = {
  listUsers: (params: { customerId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.customerId) {
      qs.set('customerId', params.customerId);
    }
    if (params.status) {
      qs.set('status', params.status);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/portal-admin/users${suffix}`);
  },
};
