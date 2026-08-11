import type { ActivationState } from '@/services/activation.service';

/**
 * Local activation state + device identity (Phase 14).
 *
 * The state file is NOT a security boundary — the server is the authority.
 * It exists so the app can start without a server round-trip on every launch
 * and to know when revalidation is due. The signed token inside is what the
 * client (optionally) verifies with the RSA public key.
 */

const STATE_KEY = 'shranix_activation_state_v1';
const DEVICE_ID_KEY = 'shranix_device_identity_v1';
const INSTALL_ID_KEY = 'shranix_install_id_v1';

export interface LocalActivation {
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
  tokenIssuedAt?: string;
  tokenExpiresAt?: string;
  activationReference?: string;
  deviceIdentifierHash?: string;
  installationId?: string;
  lastValidation?: string;
  nextValidationDue?: string;
  lastRevalidationFailed?: boolean;
  revalidationError?: string;
  serverReference?: string;
}

export interface DeviceContext {
  deviceIdentifierHash: string;
  installationId: string;
  platform?: string;
  os?: string;
  applicationVersion?: string;
  machineFingerprintHash?: string;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function isTauriRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    (Boolean((window as any).__TAURI_INTERNALS__) || window.location.protocol === 'file:')
  );
}

/** Persistent device identity — resilient, never a single hardware component. */
export function getDeviceContext(): DeviceContext {
  let identity = '';
  try {
    identity = localStorage.getItem(DEVICE_ID_KEY) || '';
  } catch {
    /* storage unavailable */
  }
  if (!identity) {
    // Combination of a generated secret + coarse platform signal. The server
    // sees only the hashed value and re-hashes before storing.
    identity = `${randomId()}:${navigator.platform || 'unknown'}`;
    try {
      localStorage.setItem(DEVICE_ID_KEY, identity);
    } catch {
      /* ephemeral identity */
    }
  }

  let installationId = '';
  try {
    installationId = localStorage.getItem(INSTALL_ID_KEY) || '';
  } catch {
    /* storage unavailable */
  }
  if (!installationId) {
    installationId = randomId();
    try {
      localStorage.setItem(INSTALL_ID_KEY, installationId);
    } catch {
      /* ephemeral install id */
    }
  }

  // NOTE: these values are intentionally NOT hashed on the client. The
  // server is the authority and re-hashes (sha-256) everything before it is
  // stored (Phase 13 registerDevice). Client-side hashing would be cosmetic.
  return {
    deviceIdentifierHash: identity,
    installationId,
    platform: navigator.platform || undefined,
    os: navigator.userAgent?.includes('Windows')
      ? 'Windows'
      : navigator.userAgent?.includes('Mac')
        ? 'macOS'
        : navigator.userAgent?.includes('Linux')
          ? 'Linux'
          : undefined,
    applicationVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
    machineFingerprintHash: installationId,
  };
}

export function saveActivation(
  state: ActivationState & { licenseNumber?: string },
): LocalActivation {
  const now = new Date().toISOString();
  const local: LocalActivation = {
    valid: Boolean(state.valid),
    licenseNumber: state.licenseNumber,
    licenseReference: state.licenseReference,
    planName: state.planName,
    status: state.status,
    expiresAt: state.expiresAt,
    graceUntil: state.graceUntil,
    allowedDevices: state.allowedDevices,
    usedDevices: state.usedDevices,
    entitlements: state.entitlements,
    limits: state.limits,
    token: state.token,
    tokenIssuedAt: now,
    tokenExpiresAt: state.tokenExpiresAt,
    activationReference: state.activationReference,
    lastValidation: now,
    nextValidationDue: new Date(Date.now() + 12 * 3600_000).toISOString(),
    lastRevalidationFailed: false,
    serverReference: state.licenseReference,
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(local));
  } catch {
    /* storage unavailable — in-memory only */
  }
  return local;
}

export function loadActivation(): LocalActivation | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LocalActivation;
  } catch {
    return null;
  }
}

export function clearActivation(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

/** Token + license validity window (grace included) decide "usable now". */
export function isActivationUsable(state: LocalActivation | null, now = Date.now()): boolean {
  if (!state?.valid || !state.token) {
    return false;
  }
  if (state.tokenExpiresAt && new Date(state.tokenExpiresAt).getTime() <= now) {
    return false;
  }
  const expiresAt = state.expiresAt ? new Date(state.expiresAt).getTime() : null;
  const graceUntil = state.graceUntil ? new Date(state.graceUntil).getTime() : null;
  if (expiresAt && expiresAt <= now) {
    // Within grace → still usable; past grace → locked.
    if (!graceUntil || graceUntil <= now) {
      return false;
    }
  }
  return true;
}

/** True when a server round-trip is due (throttled, not on every click). */
export function isRevalidationDue(state: LocalActivation | null, now = Date.now()): boolean {
  if (!state) {
    return false;
  }
  if (state.lastRevalidationFailed) {
    // Revalidate sooner when the last attempt failed but token still valid.
    return (
      !state.nextValidationDue || now >= new Date(state.nextValidationDue).getTime() - 3 * 3600_000
    );
  }
  return Boolean(state.nextValidationDue && now >= new Date(state.nextValidationDue).getTime());
}

export function touchRevalidation(
  state: LocalActivation,
  ok: boolean,
  error?: string,
): LocalActivation {
  const now = new Date().toISOString();
  const next = new Date(Date.now() + (ok ? 12 * 3600_000 : 2 * 3600_000)).toISOString();
  const nextState: LocalActivation = {
    ...state,
    lastValidation: now,
    nextValidationDue: next,
    lastRevalidationFailed: !ok,
    revalidationError: ok ? undefined : error,
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
  } catch {
    /* ignore */
  }
  return nextState;
}
