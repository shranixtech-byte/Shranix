import { resolveApiBase } from '@/lib/api-base';

const API_BASE = `${resolveApiBase()}/activation`;

export interface ActivationError {
  ok: false;
  reason: string;
  message: string;
  status: number;
}

export interface ActivationState {
  valid: boolean;
  licenseNumber?: string;
  licenseReference?: string;
  planName?: string;
  status?: string;
  expiresAt?: string;
  graceUntil?: string;
  allowedDevices?: number;
  usedDevices?: number;
  entitlements?: string[];
  limits?: Record<string, number>;
  token?: string;
  tokenExpiresAt?: string;
  activationReference?: string;
  revalidateAfterHours?: number;
}

export interface RevalidateResult {
  valid: boolean;
  reason?: string;
  status?: string;
  expiresAt?: string;
  graceUntil?: string;
  entitlements?: string[];
  limits?: Record<string, number>;
  licenseReference?: string;
  revalidateAfterHours?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Activation request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

/**
 * Online activation — authenticates the customer with portal credentials,
 * registers this device and returns a signed token + activation state.
 */
export async function activate(input: {
  email: string;
  password: string;
  licenseReference: string;
  activationReference: string;
  deviceIdentifierHash: string;
  deviceName?: string;
  platform?: string;
  os?: string;
  osVersion?: string;
  applicationVersion?: string;
  machineFingerprintHash?: string;
}): Promise<ActivationState | ActivationError> {
  return post<ActivationState | ActivationError>('activate', input);
}

/** Periodic online revalidation of the local activation state. */
export function revalidate(input: {
  licenseReference: string;
  deviceIdentifierHash?: string;
  applicationVersion?: string;
  source?: string;
}): Promise<RevalidateResult> {
  return post<RevalidateResult>('validate', input);
}

/** Continue trial — only succeeds when a Phase-12 trial exists for the account. */
export function continueTrial(input: {
  email: string;
  password: string;
}): Promise<ActivationState | ActivationError> {
  return post<ActivationState | ActivationError>('trial', input);
}

/** Exceptional offline recovery — signed, bounded offline token. */
export function offlineRequest(input: {
  email: string;
  password: string;
  licenseReference: string;
  deviceIdentifierHash?: string;
}): Promise<{ valid: boolean; offlineToken?: string; expiresInDays?: number; message?: string }> {
  return post('offline/request', input);
}

/** Verify an offline recovery token locally. */
export function offlineVerify(
  token: string,
): Promise<{ valid: boolean; reason?: string; licenseNumber?: string }> {
  return post('offline/verify', { token });
}

/** RSA public key for client-side token signature verification. */
export async function getPublicKey(): Promise<{ publicKeyPem: string }> {
  return request<{ publicKeyPem: string }>('public-key');
}

/** Server availability probe. */
export async function ping(): Promise<{ ok: boolean; serverTime?: string }> {
  return request<{ ok: boolean; serverTime?: string }>('ping');
}

/** Update-channel metadata. */
export async function getUpdateInfo(currentVersion?: string): Promise<{
  ok: boolean;
  channel?: string;
  currentVersion?: string | null;
  latestVersion?: string | null;
  minVersion?: string | null;
  updateAvailable: boolean;
  updateUrl?: string;
  signatureRequired?: boolean;
}> {
  const q = currentVersion ? `?currentVersion=${encodeURIComponent(currentVersion)}` : '';
  return request(`update${q}`);
}
