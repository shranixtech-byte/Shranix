import { useEffect, useState } from 'react';

import { portalService } from '@/services/portal.service';

import { Card, PageHeader, PortalLoading } from './common';

export function PortalProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    portalService
      .getProfile()
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPwdMsg(null);
    if (pwd.next !== pwd.confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const { portalService: ps } = await import('@/services/portal.service');
      await ps.changePassword?.(pwd.current, pwd.next);
      setPwdMsg('Password changed successfully. Please log in again.');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }
  if (!profile) {
    return <PortalLoading />;
  }

  const { user, customer, addresses, contacts } = profile;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account and customer information" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">Account</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Name', user?.name],
              ['Email', user?.email],
              ['Mobile', user?.mobile || '—'],
              ['Role', user?.role],
              ['Status', user?.status],
              ['Last login', user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-medium capitalize text-slate-700 dark:text-slate-200">
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">Customer</h2>
          {customer ? (
            <dl className="space-y-3 text-sm">
              {[
                ['Code', customer.customerCode],
                ['Firm', customer.firmName || '—'],
                ['Name', customer.name],
                ['Type', customer.customerType],
                ['Mobile', customer.mobile || '—'],
                ['Email', customer.email || '—'],
                ['GSTIN', customer.gstin || '—'],
                ['Credit days', customer.creditDays],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="font-medium text-slate-700 dark:text-slate-200">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">No customer data</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">Addresses</h2>
          {addresses.length === 0 ? (
            <p className="text-sm text-slate-400">No addresses on file</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-100 p-3 dark:border-slate-800"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {a.addressType}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {[a.address, a.village, a.taluka, a.district, a.state, a.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">Contacts</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400">No contacts on file</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400">{c.designation || c.contactType}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    {c.mobile && <p>{c.mobile}</p>}
                    {c.email && <p>{c.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">
          Change Password
        </h2>
        {pwdMsg && (
          <div className="mb-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            {pwdMsg}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={changePassword} className="grid max-w-md gap-3">
          <input
            type="password"
            required
            placeholder="Current password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="New password (min 6 chars)"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Confirm new password"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Card>
    </div>
  );
}
