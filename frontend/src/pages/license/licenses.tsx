import { Loader2, Plus, RefreshCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { commercialService } from '@/services/commercial.service';
import { licenseService, type License } from '@/services/license.service';

const STATUSES = [
  '',
  'ACTIVE',
  'PENDING',
  'GRACE_PERIOD',
  'SUSPENDED',
  'EXPIRED',
  'REVOKED',
  'CANCELLED',
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-slate-100 text-slate-600',
    GRACE_PERIOD: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    EXPIRED: 'bg-red-100 text-red-700',
    REVOKED: 'bg-violet-100 text-violet-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-muted text-muted-foreground';
}

export function LicensesPage() {
  const [rows, setRows] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [expiring, setExpiring] = useState('');
  const [subs, setSubs] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await licenseService.list({
        search: search || undefined,
        status: status || undefined,
        expiringWithinDays: expiring || undefined,
      });
      setRows(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void commercialService
      .listSubscriptions({})
      .then((r: any) => setSubs(r.data || []))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createFromSub = async () => {
    if (!selectedSub) {
      return;
    }
    setBusy(true);
    try {
      const license = await licenseService.createFromSubscription(selectedSub);
      alert(`License created — ${license.licenseNumber}`);
      setSelectedSub('');
      void load();
    } catch (err: any) {
      alert(err.message || 'Failed to create license');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Licenses</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            License master — search, filter and manage
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSub}
            onChange={(e) => setSelectedSub(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-2 text-xs"
          >
            <option value="">Create from subscription…</option>
            {subs
              .filter((s: any) => ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(String(s.status)))
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.subscriptionNumber} — {s.plan?.planName || s.planId} ({s.status})
                </option>
              ))}
          </select>
          <button
            onClick={createFromSub}
            disabled={!selectedSub || busy}
            className="bg-primary text-primary-foreground flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}{' '}
            Create
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load()}
            placeholder="Search number, reference, customer…"
            className="border-input bg-background h-9 w-64 rounded-md border pl-8 pr-2 text-xs"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
          }}
          className="border-input bg-background h-9 rounded-md border px-2 text-xs"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st === '' ? 'All statuses' : st}
            </option>
          ))}
        </select>
        <select
          value={expiring}
          onChange={(e) => {
            setExpiring(e.target.value);
          }}
          className="border-input bg-background h-9 rounded-md border px-2 text-xs"
        >
          <option value="">Any expiry</option>
          <option value="7">Expiring in 7 days</option>
          <option value="30">Expiring in 30 days</option>
          <option value="90">Expiring in 90 days</option>
        </select>
        <button
          onClick={() => void load()}
          className="border-input bg-background flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Apply
        </button>
      </div>

      <div className="bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">License</th>
                <th className="px-3 py-2.5 font-medium">Customer</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Expires</th>
                <th className="px-3 py-2.5 font-medium">Devices</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-10 text-center">
                    No licenses found
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/license/${l.id}`}
                        className="font-mono font-medium text-blue-600 hover:underline"
                      >
                        {l.licenseNumber}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                        {l.licensePublicId}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{l.customer?.name || l.customerId}</td>
                    <td className="px-3 py-2.5">
                      {l.plan?.planName || l.planId}
                      <div className="text-muted-foreground mt-0.5 text-[10px]">
                        {l.licenseType}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(l.status)}`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {l.expiresAt ? String(l.expiresAt).slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono">{l.activeDevices}</span>
                      <span className="text-muted-foreground"> / {l.maxDevices}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
