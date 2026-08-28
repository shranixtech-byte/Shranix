import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { resolveApiBase } from '@/lib/api-base';

// ═══════════════════════════════════════════════════════════
// FIRST-RUN SETUP WIZARD — SHRANIX KRUSHI ERP
// ═══════════════════════════════════════════════════════════

type Step = 'welcome' | 'admin' | 'company' | 'year' | 'complete';

interface SetupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  financialYearStart: string;
  financialYearEnd: string;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
              i < current
                ? 'bg-emerald-600 text-white'
                : i === current
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 text-white/40'
            }`}
          >
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-0.5 w-8 transition-all duration-300 ${
                i < current ? 'bg-emerald-600' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StrengthBar({ strength }: { strength: number }) {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {colors.map((c, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? c : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium text-white/50">
        {strength > 0 ? labels[strength - 1] : ''}
      </span>
    </div>
  );
}

export function SetupWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SetupData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    financialYearStart: `${new Date().getFullYear()}-04-01`,
    financialYearEnd: `${new Date().getFullYear() + 1}-03-31`,
  });

  const apiBase = resolveApiBase();

  const getPasswordStrength = (pwd: string): number => {
    let s = 0;
    if (pwd.length >= 8) {
      s++;
    }
    if (pwd.length >= 12) {
      s++;
    }
    if (/[A-Z]/.test(pwd)) {
      s++;
    }
    if (/[0-9]/.test(pwd)) {
      s++;
    }
    if (/[^A-Za-z0-9]/.test(pwd)) {
      s++;
    }
    return s;
  };

  const updateField = (field: keyof SetupData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateAdmin = (): boolean => {
    if (!data.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!data.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setError('Invalid email address');
      return false;
    }
    if (data.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateCompany = (): boolean => {
    if (!data.companyName.trim()) {
      setError('Company name is required');
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${apiBase}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          companyName: data.companyName,
        }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.message || result.error || 'Setup failed');
      }

      // Store tokens
      if (result.data?.tokens?.accessToken) {
        localStorage.setItem('access_token', result.data.tokens.accessToken);
      }
      if (result.data?.tokens?.refreshToken) {
        localStorage.setItem('refresh_token', result.data.tokens.refreshToken);
      }
      if (result.data?.user) {
        localStorage.setItem('user', JSON.stringify(result.data.user));
      }

      // Mark setup complete
      localStorage.setItem('shranix_setup_complete', 'true');

      setStep('complete');
    } catch (err) {
      setError((err as Error).message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (step === 'admin' && !validateAdmin()) {
      return;
    }
    if (step === 'company' && !validateCompany()) {
      return;
    }

    const order: Step[] = ['welcome', 'admin', 'company', 'year', 'complete'];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) {
      setStep(order[idx + 1]);
      setError(null);
    }
  };

  const goBack = () => {
    const order: Step[] = ['welcome', 'admin', 'company', 'year', 'complete'];
    const idx = order.indexOf(step);
    if (idx > 0) {
      setStep(order[idx - 1]);
      setError(null);
    }
  };

  const stepIdx = (['welcome', 'admin', 'company', 'year', 'complete'] as Step[]).indexOf(step);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-[#0a1f14] to-[#0c2419] p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #22c55e 1px, transparent 1px), radial-gradient(circle at 75% 75%, #22c55e 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="SHRANIX" className="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
            SHRANIX Krushi ERP
          </h1>
          <p className="mt-1 text-sm text-emerald-300/70">First-Time Setup</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex justify-center">
          <StepIndicator current={stepIdx} total={5} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Welcome to SHRANIX Krushi ERP</h2>
              <p className="text-sm leading-relaxed text-white/60">
                This is your first time running the ERP. We'll help you set up your administrator
                account and basic business profile. This only takes a minute.
              </p>
              <button
                onClick={() => setStep('admin')}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                Get Started →
              </button>
            </div>
          )}

          {/* ── ADMIN ── */}
          {step === 'admin' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Create Administrator</h2>
                <p className="mt-1 text-xs text-white/50">Set up your admin login credentials</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={data.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    placeholder="Rahul"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={data.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    placeholder="Sharma"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Email *
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Password *
                </label>
                <input
                  type="password"
                  value={data.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="Minimum 8 characters"
                />
                <StrengthBar strength={getPasswordStrength(data.password)} />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={data.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="Re-enter password"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={goBack}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="flex-1 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:scale-[0.98]"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── COMPANY ── */}
          {step === 'company' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Business Profile</h2>
                <p className="mt-1 text-xs text-white/50">Set up your company details</p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Company / Business Name *
                </label>
                <input
                  type="text"
                  value={data.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  placeholder="Shranix Agro Pvt. Ltd."
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={goBack}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  onClick={goNext}
                  className="flex-1 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:scale-[0.98]"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── FINANCIAL YEAR ── */}
          {step === 'year' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Financial Year</h2>
                <p className="mt-1 text-xs text-white/50">Configure your accounting period</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={data.financialYearStart}
                    onChange={(e) => updateField('financialYearStart', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={data.financialYearEnd}
                    onChange={(e) => updateField('financialYearEnd', e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <p className="text-xs text-white/40">
                Default: April 1 – March 31 (Indian Financial Year). You can change this later.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={goBack}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Setting up…
                    </span>
                  ) : (
                    'Complete Setup →'
                  )}
                </button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETE ── */}
          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
                <svg
                  className="h-8 w-8 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Setup Complete!</h2>
              <p className="text-sm text-white/60">
                Your SHRANIX Krushi ERP is ready. You can now log in with your administrator
                credentials.
              </p>
              <button
                onClick={() => navigate('/auth/login', { replace: true })}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                Go to Login →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-white/30">
          SHRANIX Krushi ERP v1.0.0 — Offline Desktop
        </p>
      </div>
    </div>
  );
}
