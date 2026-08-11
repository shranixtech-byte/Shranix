import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { usePortalAuth } from '@/context/PortalAuthContext';

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" />
    </svg>
  );
}

export function PortalLoginPage() {
  const { login, isAuthenticated } = usePortalAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot-password mode
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [info, setInfo] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/portal', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { portalService } = await import('@/services/portal.service');
      await portalService.forgotPassword(email);
      setInfo('If an account exists for this email, a password reset link has been sent.');
      setMode('login');
    } catch (err) {
      setError((err as Error).message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-green-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            SHRANIX <span className="text-emerald-400">ग्राहक पोर्टल</span>
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70">Customer Portal &amp; Self-Service</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Welcome Back</h2>
                <p className="mt-1 text-sm text-emerald-100/60">
                  Sign in to view your quotations, orders &amp; invoices
                </p>
              </div>

              {info && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {info}
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="portal-email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
                >
                  Email
                </label>
                <input
                  id="portal-email"
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
                  htmlFor="portal-password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="portal-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 pr-12 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="font-medium text-emerald-300 transition hover:text-emerald-200 hover:underline"
                >
                  Forgot password?
                </button>
                <Link to="/login" className="text-emerald-100/60 transition hover:text-emerald-200">
                  ← Back to ERP login
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition-all hover:-translate-y-0.5 hover:shadow-emerald-800/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Reset Password</h2>
                <p className="mt-1 text-sm text-emerald-100/60">
                  Enter your portal email and we&apos;ll send a reset token
                </p>
              </div>
              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-100/80"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-sm text-emerald-100/60 hover:text-emerald-200"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-emerald-100/40">
          © {new Date().getFullYear()} SHRANIX Technologies Pvt. Ltd. · Secure customer self-service
        </p>
      </div>
    </div>
  );
}
