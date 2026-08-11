import { resolveApiBase } from '@/lib/api-base';

const API_BASE = `${resolveApiBase()}`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('shranix_token');
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
  return (await response.json()) as T;
}

export interface Plan {
  id: string;
  planCode: string;
  planName: string;
  displayName: string;
  description?: string;
  planType: string;
  billingCycle: string;
  status: string;
  currency: string;
  trialPeriodDays: number;
  gracePeriodDays: number;
  setupFee: number;
  isRecommended?: boolean;
  isPublic?: boolean;
  price: number;
  discountPercent: number;
  taxRate: number;
  currentVersion: number | null;
  features: Record<string, boolean | number>;
  limits: Record<string, number>;
  versions: any[];
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: string;
  billingCycle: string;
  startDate: string;
  endDate: string;
  trialEnd?: string;
  graceEnd?: string;
  finalAmount: number;
  currency: string;
  paymentStatus: string;
  autoRenew: boolean;
  plan?: { id: string; planName: string; displayName: string } | null;
  customer?: { id: string; name: string } | null;
}

export const commercialService = {
  // ── Dashboard / reports ────────────────────────────────
  dashboard: () => request<Record<string, any>>('/commercial/dashboard'),

  // ── Plans ──────────────────────────────────────────────
  listPlans: (params: { status?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.search) {
      qs.set('search', params.search);
    }
    return request<{ data: Plan[] }>(`/commercial/plans${qs.toString() ? `?${qs}` : ''}`);
  },
  getPlan: (id: string) => request<Plan>(`/commercial/plans/${id}`),
  createPlan: (data: any) =>
    request<Plan>('/commercial/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: any) =>
    request<Plan>(`/commercial/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createPlanVersion: (id: string, data: any) =>
    request<Plan>(`/commercial/plans/${id}/version`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setPlanStatus: (id: string, status: string) =>
    request<Plan>(`/commercial/plans/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  planMatrix: () => request<{ features: string[]; plans: any[] }>('/commercial/plans/matrix'),
  publicPlans: () => request<Plan[]>('/commercial/plans/public'),

  // ── Subscriptions ──────────────────────────────────────
  listSubscriptions: (params: { status?: string; search?: string; customerId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.search) {
      qs.set('search', params.search);
    }
    if (params.customerId) {
      qs.set('customerId', params.customerId);
    }
    return request<{ data: Subscription[] }>(`/subscriptions${qs.toString() ? `?${qs}` : ''}`);
  },
  getSubscription: (id: string) => request<Subscription>(`/subscriptions/${id}`),
  subscriptionHistory: (id: string) => request<any[]>(`/subscriptions/${id}/history`),
  createSubscription: (data: any) =>
    request<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  activateSubscription: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/activate`, { method: 'POST' }),
  renewSubscription: (id: string) =>
    request<Subscription>(`/subscriptions/${id}/renew`, { method: 'POST' }),
  upgradeSubscription: (id: string, data: any) =>
    request<Subscription>(`/subscriptions/${id}/upgrade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  downgradeSubscription: (id: string, data: any) =>
    request<Subscription>(`/subscriptions/${id}/downgrade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelSubscription: (id: string, data: any) =>
    request<Subscription>(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Billing ────────────────────────────────────────────
  listInvoices: (params: { status?: string; customerId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.customerId) {
      qs.set('customerId', params.customerId);
    }
    return request<{ data: any[] }>(`/billing/invoices${qs.toString() ? `?${qs}` : ''}`);
  },
  getInvoice: (id: string) => request<any>(`/billing/invoices/${id}`),
  cancelInvoice: (id: string, reason?: string) =>
    request<any>(`/billing/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  listPayments: (params: { status?: string; customerId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.customerId) {
      qs.set('customerId', params.customerId);
    }
    return request<{ data: any[] }>(`/billing/payments${qs.toString() ? `?${qs}` : ''}`);
  },
  createPayment: (data: {
    subscriptionId: string;
    billingInvoiceId?: string;
    idempotencyKey: string;
  }) => request<any>('/billing/payments/create', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (id: string, signature?: string) =>
    request<any>(`/billing/payments/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    }),
  refundPayment: (id: string, data: { amount?: number; reason?: string }) =>
    request<any>(`/billing/payments/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Coupons ────────────────────────────────────────────
  listCoupons: (params: { status?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.search) {
      qs.set('search', params.search);
    }
    return request<{ data: any[] }>(`/commercial/coupons${qs.toString() ? `?${qs}` : ''}`);
  },
  createCoupon: (data: any) =>
    request<any>('/commercial/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: any) =>
    request<any>(`/commercial/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => request<any>(`/commercial/coupons/${id}`, { method: 'DELETE' }),

  // ── Entitlements / usage / settings ────────────────────
  entitlements: (customerId: string) => request<any>(`/commercial/entitlements/${customerId}`),
  usage: (customerId: string) => request<any>(`/commercial/usage/${customerId}`),
  getSettings: () => request<Record<string, any>>('/commercial/settings'),
  updateSettings: (data: Record<string, any>) =>
    request<Record<string, any>>('/commercial/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  runScheduler: () => request<any>('/commercial/scheduler/run', { method: 'POST' }),

  // ── Reports ────────────────────────────────────────────
  reportSubscriptions: (params: { status?: string; from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) {
      qs.set('status', params.status);
    }
    if (params.from) {
      qs.set('from', params.from);
    }
    if (params.to) {
      qs.set('to', params.to);
    }
    return request<any[]>(`/commercial/reports/subscriptions${qs.toString() ? `?${qs}` : ''}`);
  },
  reportActive: () => request<any[]>('/commercial/reports/active'),
  reportExpiring: (days = 30) => request<any[]>(`/commercial/reports/expiring?days=${days}`),
  reportTrials: () => request<any[]>('/commercial/reports/trials'),
  reportLifecycle: (eventType: string) =>
    request<any[]>(`/commercial/reports/lifecycle/${eventType}`),
  reportRevenue: () => request<any>('/commercial/reports/revenue'),
  reportPayments: () => request<any>('/commercial/reports/payments'),
  reportRefunds: () => request<any[]>('/commercial/reports/refunds'),
  reportCoupons: () => request<any[]>('/commercial/reports/coupons'),
  reportMrr: () => request<any>('/commercial/reports/mrr'),
  reportChurn: () => request<any>('/commercial/reports/churn'),
};
