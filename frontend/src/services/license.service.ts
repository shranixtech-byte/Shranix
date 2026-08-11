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

export interface License {
  id: string;
  licenseNumber: string;
  licensePublicId: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  licenseType: string;
  status: string;
  startsAt?: string;
  expiresAt?: string;
  graceUntil?: string;
  maxUsers: number;
  maxDevices: number;
  maxBranches: number;
  maxInstallations: number;
  activeDevices: number;
  autoRenew: boolean;
  entitlements: Record<string, any>;
  limits: Record<string, number>;
  revokedAt?: string;
  revocationReason?: string;
  availableDeviceSlots: number;
  plan?: { id: string; planCode: string; planName: string; displayName: string } | null;
  subscription?: {
    id: string;
    subscriptionNumber: string;
    status: string;
    endDate?: string;
  } | null;
  customer?: { id: string; name: string } | null;
}

export const licenseService = {
  // ── Admin ──────────────────────────────────────────────
  list: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v));
      }
    }
    return request<{ data: License[]; total: number }>(`licenses?${qs.toString()}`);
  },
  get: (id: string) => request<License>(`licenses/${id}`),
  createFromSubscription: (subscriptionId: string) =>
    request<License>('licenses', { method: 'POST', body: JSON.stringify({ subscriptionId }) }),
  validate: (id: string, body: Record<string, any> = {}) =>
    request<Record<string, any>>(`licenses/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  issueToken: (id: string, body: { ttlDays?: number; purpose?: string } = {}) =>
    request<{ token: string; jti: string; expiresAt: string }>(`licenses/${id}/token`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revoke: (id: string, reason: string) =>
    request<License>(`licenses/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivate: (id: string, reason?: string) =>
    request<License>(`licenses/${id}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  checkDowngrade: (id: string, planId: string) =>
    request<Record<string, any>>(`licenses/${id}/check-downgrade`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  devices: (id: string) => request<any[]>(`licenses/${id}/devices`),
  deactivateDevice: (id: string, devicePublicId: string, reason?: string) =>
    request<any>(`licenses/${id}/devices/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ devicePublicId, reason }),
    }),
  requestTransfer: (id: string, body: any) =>
    request<any>(`licenses/${id}/devices/transfer`, { method: 'POST', body: JSON.stringify(body) }),
  approveTransfer: (id: string, transferId: string) =>
    request<any>(`licenses/${id}/devices/transfer/${transferId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  activations: (id: string) => request<any[]>(`licenses/${id}/activations`),
  approveActivation: (id: string, activationId: string) =>
    request<any>(`licenses/${id}/activations/${activationId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rejectActivation: (id: string, activationId: string, reason?: string) =>
    request<any>(`licenses/${id}/activations/${activationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  events: (id: string) => request<any[]>(`licenses/${id}/events`),
  dashboard: () => request<Record<string, any>>('licenses/dashboard'),
  reports: {
    register: (status?: string) =>
      request<{ data: License[]; total: number }>(
        `licenses/reports/register${status ? `?status=${status}` : ''}`,
      ),
    byStatus: () => request<Record<string, any>>('licenses/reports/by-status'),
    deviceUtilization: () => request<Record<string, any>>('licenses/reports/device-utilization'),
    activations: () => request<Record<string, any>>('licenses/reports/activations'),
    transfers: () => request<Record<string, any>>('licenses/reports/transfers'),
    expiryForecast: () => request<Record<string, any>>('licenses/reports/expiry-forecast'),
    planWise: () => request<Record<string, any>>('licenses/reports/plan-wise'),
  },
};

export const licensePortalService = {
  overview: () => request<Record<string, any>>('portal/license'),
  devices: () => request<Record<string, any>>('portal/license/devices'),
  deactivateDevice: (devicePublicId: string, reason?: string) =>
    request<Record<string, any>>('portal/license/devices/deactivate', {
      method: 'POST',
      body: JSON.stringify({ devicePublicId, reason }),
    }),
  requestTransfer: (body: any) =>
    request<Record<string, any>>('portal/license/devices/transfer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  requestReactivation: (reason?: string) =>
    request<Record<string, any>>('portal/license/reactivate', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
