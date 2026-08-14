import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import {
  getDeviceContext,
  isActivationUsable,
  isRevalidationDue,
  isTauriRuntime,
  loadActivation,
  touchRevalidation,
  verifyIntegrity,
} from '@/lib/activation-state';
import * as activationApi from '@/services/activation.service';

const TERMINAL_REASONS = new Set([
  'LICENSE_REVOKED',
  'LICENSE_EXPIRED',
  'LICENSE_SUSPENDED',
  'LICENSE_CANCELLED',
]);

/**
 * Activation gate — applies on the desktop (Tauri) runtime, or when the web
 * deployment explicitly enables `VITE_REQUIRE_ACTIVATION=1`. Development and
 * ordinary web deployments are unaffected.
 *
 * Local state is never a security boundary: the server re-validates on a
 * throttle schedule and terminal failures (revoked/expired/suspended) clear
 * the local state immediately.
 */
export function ActivationGate({ children }: { children: ReactNode }) {
  const enforcing =
    !import.meta.env.DEV && (isTauriRuntime() || import.meta.env.VITE_REQUIRE_ACTIVATION === '1');
  const revalidateRan = useRef(false);

  useEffect(() => {
    if (!enforcing || revalidateRan.current) {
      return;
    }
    revalidateRan.current = true;

    const state = loadActivation();
    if (!state?.valid || !state.licenseReference) {
      return;
    }
    const licenseReference = state.licenseReference;

    const device = getDeviceContext();
    const run = async () => {
      // Phase 15.8 — local tampering detected → force online validation.
      const tampered = !(await verifyIntegrity(loadActivation()));
      if (!tampered && !isRevalidationDue(loadActivation())) {
        return;
      }
      try {
        const result = await activationApi.revalidate({
          licenseReference,
          deviceIdentifierHash: device.deviceIdentifierHash,
          applicationVersion: device.applicationVersion,
          source: 'desktop-app',
        });
        if (result.valid) {
          touchRevalidation(state, true, undefined, result.serverTime);
          return;
        }
        // Terminal server verdicts invalidate local state (no offline bypass).
        if (result.reason && TERMINAL_REASONS.has(result.reason)) {
          const current = loadActivation();
          if (current) {
            touchRevalidation({ ...current, valid: false }, false, result.reason);
          }
        } else {
          touchRevalidation(state, false, result.reason || 'VALIDATION_FAILED');
        }
      } catch {
        // Network failure — keep local state usable until token/license expiry
        // (bounded by the server, not by this client).
        touchRevalidation(state, false, 'NETWORK_ERROR');
      }
    };
    void run();
  }, [enforcing]);

  if (!enforcing) {
    return <>{children}</>;
  }

  const state = loadActivation();
  if (!isActivationUsable(state)) {
    return <Navigate to="/activate" replace />;
  }

  return <>{children}</>;
}
