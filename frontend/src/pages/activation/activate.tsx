import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import {
  clearActivation,
  getDeviceContext,
  isActivationUsable,
  loadActivation,
  saveActivation,
} from '@/lib/activation-state';
import * as activationApi from '@/services/activation.service';
import type { ActivationError, ActivationState } from '@/services/activation.service';

const SUPPORT_MAILTO = 'mailto:support@shranix.com?subject=SHRANIX%20Activation%20Support';

/**
 * First-run activation experience (Phase 14).
 *
 * Online activation is the primary flow — the server authenticates the
 * customer with portal credentials, resolves the license server-side and
 * registers this device. The server is always the authority; this screen
 * never trusts a locally modified state file.
 */
export function ActivationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<ActivationState | null>(null);
  const [showOffline, setShowOffline] = useState(false);
  const [offlineToken, setOfflineToken] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  const existing = useMemo(() => loadActivation(), []);
  if (isActivationUsable(existing)) {
    return <Navigate to="/" replace />;
  }

  const device = getDeviceContext();

  const runActivation = async (fn: () => Promise<ActivationState | ActivationError>) => {
    setError(null);
    setErrorReason(null);
    setIsNetworkError(false);
    setIsSubmitting(true);
    try {
      const result = await fn();
      const isError = (result as Partial<ActivationError>).ok === false || !('valid' in result);
      if (isError) {
        const failed = result as ActivationError;
        setErrorReason(failed.reason || 'ACTIVATION_FAILED');
        setError(failed.message || 'Activation could not be completed.');
        return;
      }
      saveActivation(result as ActivationState);
      setSuccess(result as ActivationState);
    } catch (err) {
      const msg = (err as Error).message || 'Activation failed';
      if (/fetch|network|Failed to fetch|ECONNREFUSED|timeout/i.test(msg)) {
        setIsNetworkError(true);
        setError(
          'SHRANIX activation server is temporarily unavailable. Please check your internet connection and try again.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    void runActivation(() =>
      activationApi.activate({
        email,
        password,
        licenseReference: licenseNumber.trim(),
        activationReference:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,
        deviceIdentifierHash: device.deviceIdentifierHash,
        deviceName: deviceName.trim() || undefined,
        platform: device.platform,
        os: device.os,
        applicationVersion: device.applicationVersion,
        machineFingerprintHash: device.machineFingerprintHash,
      }),
    );
  };

  const handleTrial = () => {
    if (!email || !password) {
      setError('Enter your account email and password to continue the trial.');
      return;
    }
    void runActivation(() => activationApi.continueTrial({ email, password }));
  };

  const handleOfflineRequest = () => {
    if (!email || !password || !licenseNumber) {
      setError('Enter your account email, password and license number for offline recovery.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    void activationApi
      .offlineRequest({ email, password, licenseReference: licenseNumber.trim() })
      .then((res) => {
        if (res.valid && res.offlineToken) {
          setOfflineToken(res.offlineToken);
        } else {
          setError((res as any).message || 'Offline recovery could not be generated.');
        }
      })
      .catch(() => setError('Offline recovery could not be generated. Please try again later.'))
      .finally(() => setIsSubmitting(false));
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 px-4">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />

        <div className="relative w-full max-w-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <svg
                className="h-8 w-8 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Activation Successful
            </h1>
            <p className="mt-2 text-sm text-emerald-100/70">
              Your copy of SHRANIX Krushi ERP is ready.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <dt className="text-emerald-100/60">License</dt>
                <dd className="font-mono font-semibold text-white">{success.licenseNumber}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <dt className="text-emerald-100/60">Plan</dt>
                <dd className="font-semibold text-white">{success.planName || '—'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <dt className="text-emerald-100/60">Device</dt>
                <dd className="font-semibold text-white">{deviceName.trim() || 'This computer'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <dt className="text-emerald-100/60">Status</dt>
                <dd className="flex items-center gap-2 font-semibold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> {success.status}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <dt className="text-emerald-100/60">Valid Until</dt>
                <dd className="font-semibold text-white">
                  {success.expiresAt ? new Date(success.expiresAt).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-emerald-100/60">Allowed Devices</dt>
                <dd className="font-semibold text-white">
                  {success.usedDevices} / {success.allowedDevices}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="mt-8 h-12 w-full rounded-xl bg-emerald-500 font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            >
              Launch SHRANIX
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            WELCOME TO <span className="text-emerald-400">SHRANIX</span>
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70">License Activation</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Activate Online</h2>
              <p className="mt-1 text-sm text-emerald-100/60">
                Sign in with your customer account and enter your license number.
              </p>
            </div>

            {error && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  isNetworkError
                    ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                    : 'border-red-400/20 bg-red-500/10 text-red-200'
                }`}
              >
                {error}
              </div>
            )}

            {/* Device limit / status actions */}
            {errorReason === 'DEVICE_LIMIT_REACHED' && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <p className="font-semibold">Need another device?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to="/portal/license"
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 font-medium hover:bg-emerald-500/30"
                  >
                    Manage Devices
                  </Link>
                  <Link
                    to="/portal/billing"
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 font-medium hover:bg-emerald-500/30"
                  >
                    Upgrade Plan
                  </Link>
                  <a
                    href={SUPPORT_MAILTO}
                    className="rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            )}
            {(errorReason === 'LICENSE_REVOKED' || errorReason === 'LICENSE_SUSPENDED') && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <p className="font-semibold">This license is currently inactive.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={SUPPORT_MAILTO}
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 font-medium hover:bg-emerald-500/30"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            )}
            {errorReason === 'LICENSE_EXPIRED' && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <p className="font-semibold">Your SHRANIX subscription has expired.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to="/portal/billing"
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 font-medium hover:bg-emerald-500/30"
                  >
                    Renew Subscription
                  </Link>
                  <a
                    href={SUPPORT_MAILTO}
                    className="rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
                  >
                    Contact Support
                  </a>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="act-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
              >
                Email
              </label>
              <input
                id="act-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            <div>
              <label
                htmlFor="act-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
              >
                Password
              </label>
              <input
                id="act-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            <div>
              <label
                htmlFor="act-license"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
              >
                License Number
              </label>
              <input
                id="act-license"
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="SHR-LIC-2026-000001"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 font-mono text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            <div>
              <label
                htmlFor="act-device"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
              >
                Device Name <span className="normal-case text-emerald-100/40">(optional)</span>
              </label>
              <input
                id="act-device"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Office PC"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-emerald-500 font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Activating…' : 'Activate Online'}
            </button>
          </form>

          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={handleTrial}
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue Trial
            </button>
            <a
              href={SUPPORT_MAILTO}
              className="block text-center text-sm text-emerald-100/60 transition hover:text-emerald-100"
            >
              Contact Support
            </a>
            <button
              type="button"
              onClick={() => setShowOffline((v) => !v)}
              className="block w-full text-center text-xs text-emerald-100/40 transition hover:text-emerald-100/70"
            >
              {showOffline ? 'Hide offline recovery' : 'Offline recovery (exceptional)'}
            </button>
          </div>

          {showOffline && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-emerald-100/60">
                Offline mode is a limited recovery path for exceptional cases (no internet). The
                signed offline token expires automatically — online validation is required again
                afterwards.
              </p>
              {offlineToken ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-100/80">
                    Offline Token — save this safely
                  </p>
                  <textarea
                    readOnly
                    value={offlineToken}
                    rows={3}
                    className="w-full rounded-lg border border-white/15 bg-white/5 p-2 font-mono text-[11px] text-emerald-200 outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOfflineRequest}
                  disabled={isSubmitting}
                  className="mt-3 h-9 w-full rounded-lg border border-white/15 text-xs font-medium text-emerald-100 transition hover:bg-white/10 disabled:opacity-60"
                >
                  Generate Offline Token
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-emerald-100/40">
          Activation requires an internet connection on first launch. Your business data always
          stays on your computer.
        </p>
      </div>
    </div>
  );
}

export function ActivationResetButton() {
  return (
    <button
      type="button"
      onClick={() => clearActivation()}
      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-emerald-100/70 transition hover:bg-white/10"
    >
      Reset activation
    </button>
  );
}
