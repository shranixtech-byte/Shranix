import { useEffect, useState } from 'react';

import { apiRequest } from '@/services/api-client';

function fmtDate(v: string | null | undefined): string {
  if (!v) {
    return '—';
  }
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PortalAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    email: '',
    name: '',
    mobile: '',
    role: 'viewer',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiRequest<any>('/portal-admin/users'),
      apiRequest<any>('/portal-admin/analytics'),
    ])
      .then(([u, a]) => {
        setUsers(u || []);
        setAnalytics(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await apiRequest('/portal-admin/users', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ customerId: '', email: '', name: '', mobile: '', role: 'viewer', password: '' });
      setMsg('Portal user created');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/portal-admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const kpis = [
    { label: 'Portal Users', value: analytics?.portalUsers ?? 0 },
    { label: 'Active', value: analytics?.activeUsers ?? 0 },
    { label: 'Blocked', value: analytics?.blockedUsers ?? 0 },
    { label: 'Logged in (30d)', value: analytics?.loggedInLast30Days ?? 0 },
    {
      label: 'Online Payments',
      value: `₹${(analytics?.payments?.volume ?? 0).toLocaleString('en-IN')}`,
    },
    { label: 'Open Tickets', value: analytics?.tickets?.open ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Customer Portal Admin
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage portal access — never exposes customer passwords
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          {showCreate ? 'Cancel' : '+ Create Portal User'}
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {k.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={create}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">
            New Portal User
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              required
              placeholder="Customer ID"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              placeholder="Mobile"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="viewer">Viewer</option>
              <option value="accounts">Accounts</option>
              <option value="purchase">Purchase</option>
              <option value="admin">Admin</option>
            </select>
            <input
              required
              minLength={6}
              type="password"
              placeholder="Initial password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create User'}
          </button>
        </form>
      )}

      {/* Users table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-700">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Login</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {u.name}
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                <td className="px-4 py-3 capitalize text-slate-500 dark:text-slate-400">
                  {u.role}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {fmtDate(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {u.status !== 'active' && (
                      <button
                        onClick={() => setStatus(u.id, 'active')}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Activate
                      </button>
                    )}
                    {u.status === 'active' && (
                      <>
                        <button
                          onClick={() => setStatus(u.id, 'inactive')}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Deactivate
                        </button>
                        <button
                          onClick={() => setStatus(u.id, 'blocked')}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Block
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No portal users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
