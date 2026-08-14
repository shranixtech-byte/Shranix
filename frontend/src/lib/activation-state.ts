import type { ActivationState } from '@/services/activation.service';

/**
 * Local activation state + device identity (Phase 14) — hardened in Phase 15.
 *
 * The state file is NOT a security boundary — the server is the authority.
 * Phase 15 adds defense-in-depth for simple local tampering:
 *   - `lastServerTime`: the server's clock reference from the last successful
 *     activate/revalidate/offline-verify. If the local clock rolls back
 *     significantly behind it, online revalidation is required (15.9).
 *   - `integrity`: a sha-256 of the security-relevant fields + the device
 *     context. Casual edits (changing expiresAt, status, token) are detected
 *     and force revalidation (15.8). There is no client secret, so this is
 *     cosmetic protection only — cryptographic authority stays on the server.
 */

const STATE_KEY = 'shranix_activation_state_v1';
const DEVICE_ID_KEY = 'shranix_device_identity_v1';
const INSTALL_ID_KEY = 'shranix_install_id_v1';

/** Clock-skew tolerance — local time may drift this far before we revalidate. */
const CLOCK_SKEW_MS = 15 * 60_000;

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
  /** Phase 15.9 — server clock reference from the last online round-trip. */
  lastServerTime?: string;
  /** Phase 15.8 — sha-256 over security-relevant fields (cosmetic integrity). */
  integrity?: string;
  deviceConfidence?: string;
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

// ── Phase 15.8 integrity (sha-256 over security-relevant fields) ─────────

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Non-secure fallback (dev) — deterministic string hash.
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return `fallback-${(h >>> 0).toString(16)}`;
}

/** Canonical input for the integrity hash — only server-verifiable facts. */
function integrityPayload(state: LocalActivation, device: DeviceContext): string {
  return JSON.stringify({
    licenseReference: state.licenseReference,
    licenseNumber: state.licenseNumber,
    status: state.status,
    expiresAt: state.expiresAt,
    graceUntil: state.graceUntil,
    allowedDevices: state.allowedDevices,
    usedDevices: state.usedDevices,
    token: state.token,
    tokenExpiresAt: state.tokenExpiresAt,
    deviceIdentifierHash: device.deviceIdentifierHash,
    installationId: device.installationId,
  });
}

async function computeIntegrity(state: LocalActivation, device: DeviceContext): Promise<string> {
  return sha256Hex(integrityPayload(state, device));
}

/** True when the stored state matches its integrity hash (async, best-effort). */
export async function verifyIntegrity(state: LocalActivation | null): Promise<boolean> {
  if (!state || !state.integrity) {
    // No hash → nothing to verify; server revalidation remains the authority.
    return true;
  }
  try {
    const expected = await computeIntegrity(state, getDeviceContext());
    return expected === state.integrity;
  } catch {
    return true;
  }
}

// ── Phase 15.9 clock-rollback detection ──────────────────────────────────

/**
 * True when the local clock has rolled back significantly behind the last
 * server time reference. A rollback must force online validation — but never
 * destroy data or lock the user out of recovery.
 */
export function hasClockRollback(state: LocalActivation | null, now = Date.now()): boolean {
  if (!state?.lastServerTime) {
    return false;
  }
  const serverMs = new Date(state.lastServerTime).getTime();
  if (!Number.isFinite(serverMs)) {
    return false;
  }
  // Local time behind the server reference by more than the skew tolerance.
  return now < serverMs - CLOCK_SKEW_MS;
}

export function saveActivation(
  state: ActivationState & { licenseNumber?: string; serverTime?: string },
): LocalActivation {
  const now = new Date().toISOString();
  const device = getDeviceContext();
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
    lastServerTime: state.serverTime || now,
    deviceConfidence: (state as any).deviceConfidence,
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(local));
  } catch {
    /* storage unavailable — in-memory only */
  }
  // Integrity hash is computed async; store it as soon as ready.
  void computeIntegrity(local, device).then((integrity) => {
    try {
      const current = loadActivation();
      if (current && current.lastValidation === local.lastValidation) {
        localStorage.setItem(STATE_KEY, JSON.stringify({ ...current, integrity }));
      }
    } catch {
      /* ignore */
    }
  });
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
  // Phase 15.9 — a clock rollback or suspicious local state forces validation.
  if (hasClockRollback(state, now)) {
    return true;
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
  serverTime?: string,
): LocalActivation {
  const now = new Date().toISOString();
  const next = new Date(Date.now() + (ok ? 12 * 3600_000 : 2 * 3600_000)).toISOString();
  const nextState: LocalActivation = {
    ...state,
    lastValidation: now,
    nextValidationDue: next,
    lastRevalidationFailed: !ok,
    revalidationError: ok ? undefined : error,
    // Refresh the server clock reference on every successful round-trip.
    ...(ok && serverTime ? { lastServerTime: serverTime } : {}),
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
  } catch {
    /* ignore */
  }
  void computeIntegrity(nextState, getDeviceContext()).then((integrity) => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...nextState, integrity }));
    } catch {
      /* ignore */
    }
  });
  return nextState;
}
