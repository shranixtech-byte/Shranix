import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { licenseService, type License } from '@/services/license.service';

type Tab = 'overview' | 'devices' | 'activations' | 'events';

export function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [license, setLicense] = useState<License | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [activations, setActivations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [validateResult, setValidateResult] = useState<Record<string, any> | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const load = async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [lic, devs, acts, evts] = await Promise.all([
        licenseService.get(id),
        licenseService.devices(id).catch(() => []),
        licenseService.activations(id).catch(() => []),
        licenseService.events(id).catch(() => []),
      ]);
      setLicense(lic);
      setDevices(devs);
      setActivations(acts);
      setEvents(evts);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="text-muted-foreground px-4 py-16 text-center text-sm">License not found</div>
    );
  }

  const run = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fn();
      alert(successMsg);
      setValidateResult(null);
      setToken(null);
      if (res?.id === license.id) {
        setLicense(res);
      }
      void load();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const statusCls =
    license.status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-700'
      : license.status === 'REVOKED'
        ? 'bg-violet-100 text-violet-700'
        : license.status === 'EXPIRED'
          ? 'bg-red-100 text-red-700'
          : license.status === 'GRACE_PERIOD'
            ? 'bg-amber-100 text-amber-700'
            : license.status === 'SUSPENDED'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-muted text-muted-foreground';

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: ShieldCheck },
    { key: 'devices', label: `Devices (${devices.length})`, icon: Cpu },
    { key: 'activations', label: `Activations (${activations.length})`, icon: KeyRound },
    { key: 'events', label: `Events (${events.length})`, icon: RefreshCcw },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/license"
            className="border-input bg-background flex h-8 w-8 items-center justify-center rounded-md border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <span className="font-mono">{license.licenseNumber}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                {license.status}
              </span>
            </h1>
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
              {license.licensePublicId}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await licenseService.validate(license.id);
                setValidateResult(r);
                return r;
              }, 'Validation complete')
            }
            className="border-input bg-background flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Validate
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const r = await licenseService.issueToken(license.id, { ttlDays: 30 });
                setToken(r.token);
                return r;
              }, 'Token issued')
            }
            className="border-input bg-background flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs disabled:opacity-50"
          >
            <KeyRound className="h-3.5 w-3.5" /> Issue token
          </button>
          {!['REVOKED', 'CANCELLED', 'EXPIRED'].includes(license.status) ? (
            <button
              disabled={busy}
              onClick={() => {
                const reason = prompt('Revocation reason (required):');
                if (reason) {
                  void run(() => licenseService.revoke(license.id, reason), 'License revoked');
                }
              }}
              className="flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> Revoke
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() =>
                void run(
                  () => licenseService.reactivate(license.id, 'Admin reactivation'),
                  'License reactivated',
                )
              }
              className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
            </button>
          )}
        </div>
      </div>

      {validateResult && (
        <div
          className={`mt-3 rounded-lg border px-4 py-2 text-xs ${validateResult.valid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
        >
          Validation: {validateResult.valid ? 'VALID' : validateResult.reason}{' '}
          {validateResult.reason ? `(${validateResult.reason})` : ''} — ref{' '}
          {validateResult.validationReference}
        </div>
      )}
      {token && (
        <div className="bg-muted mt-3 rounded-lg border px-4 py-2">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide">
            Signed token (server-side only — never expose to the client)
          </p>
          <code className="block max-h-24 overflow-auto break-all text-[10px]">{token}</code>
        </div>
      )}

      <div className="mt-4 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${tab === t.key ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">License details</h3>
            <dl className="space-y-2 text-xs">
              {[
                ['Customer', license.customer?.name || license.customerId],
                ['Plan', license.plan?.planName || license.planId],
                ['Type', license.licenseType],
                [
                  'Subscription',
                  `${license.subscription?.subscriptionNumber || license.subscriptionId} (${license.subscription?.status || '—'})`,
                ],
                ['Starts', license.startsAt ? String(license.startsAt).slice(0, 10) : '—'],
                ['Expires', license.expiresAt ? String(license.expiresAt).slice(0, 10) : '—'],
                ['Grace until', license.graceUntil ? String(license.graceUntil).slice(0, 10) : '—'],
                ['Auto renew', String(Boolean(license.autoRenew))],
                ['Revoked at', license.revokedAt ? String(license.revokedAt).slice(0, 10) : '—'],
                ['Revocation reason', license.revocationReason || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-card rounded-xl border p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Limits &amp; entitlements</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2.5">
                <p className="text-muted-foreground text-[10px]">Devices</p>
                <p className="mt-0.5 text-lg font-bold">
                  {license.activeDevices}
                  <span className="text-muted-foreground text-xs"> / {license.maxDevices}</span>
                </p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-muted-foreground text-[10px]">Users</p>
                <p className="mt-0.5 text-lg font-bold">{license.maxUsers}</p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-muted-foreground text-[10px]">Branches</p>
                <p className="mt-0.5 text-lg font-bold">{license.maxBranches}</p>
              </div>
              <div className="rounded-md border p-2.5">
                <p className="text-muted-foreground text-[10px]">Installations</p>
                <p className="mt-0.5 text-lg font-bold">{license.maxInstallations}</p>
              </div>
            </div>
            <h4 className="text-muted-foreground mb-1.5 mt-4 text-[11px] font-semibold">
              Enabled features
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(license.entitlements || {})
                .filter(([, v]) => Boolean(v))
                .map(([f]) => (
                  <span
                    key={f}
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700"
                  >
                    {f}
                  </span>
                ))}
            </div>
            <h4 className="text-muted-foreground mb-1.5 mt-3 text-[11px] font-semibold">
              Plan limits
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(license.limits || {}).map(([k, v]) => (
                <span key={k} className="bg-muted rounded-full px-2 py-0.5 text-[10px]">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Device</th>
                  <th className="px-3 py-2.5 font-medium">Platform</th>
                  <th className="px-3 py-2.5 font-medium">App version</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">First seen</th>
                  <th className="px-3 py-2.5 font-medium">Last seen</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground py-10 text-center">
                      No devices registered
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium">
                        {d.deviceName || d.devicePublicId}
                      </td>
                      <td className="px-3 py-2.5">
                        {d.platform || '—'} {d.os ? `· ${d.os}` : ''}
                      </td>
                      <td className="px-3 py-2.5 font-mono">{d.applicationVersion || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{String(d.firstSeenAt || '').slice(0, 10)}</td>
                      <td className="px-3 py-2.5">{String(d.lastSeenAt || '').slice(0, 10)}</td>
                      <td className="px-3 py-2.5">
                        {d.status === 'active' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Deactivation reason (optional):');
                              void run(
                                () =>
                                  licenseService.deactivateDevice(
                                    license.id,
                                    d.devicePublicId,
                                    reason || undefined,
                                  ),
                                'Device deactivated',
                              );
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activations' && (
        <div className="bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Reference</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Requested</th>
                  <th className="px-3 py-2.5 font-medium">Approved</th>
                  <th className="px-3 py-2.5 font-medium">Reason</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground py-10 text-center">
                      No activations
                    </td>
                  </tr>
                ) : (
                  activations.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono">{a.activationPublicId}</td>
                      <td className="px-3 py-2.5">{a.activationType}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : a.status === 'REJECTED' ? 'bg-red-100 text-red-700' : a.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{String(a.requestedAt || '').slice(0, 10)}</td>
                      <td className="px-3 py-2.5">
                        {a.approvedAt ? String(a.approvedAt).slice(0, 10) : '—'}
                      </td>
                      <td className="px-3 py-2.5">{a.reason || '—'}</td>
                      <td className="px-3 py-2.5">
                        {a.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                void run(
                                  () => licenseService.approveActivation(license.id, a.id),
                                  'Activation approved',
                                )
                              }
                              className="text-emerald-600 hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                void run(
                                  () =>
                                    licenseService.rejectActivation(
                                      license.id,
                                      a.id,
                                      'Rejected by admin',
                                    ),
                                  'Activation rejected',
                                )
                              }
                              className="text-red-600 hover:underline"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="bg-card mt-4 overflow-hidden rounded-xl border shadow-sm">
          <div className="max-h-[28rem] overflow-y-auto">
            <ul className="divide-y text-xs">
              {events.length === 0 ? (
                <li className="text-muted-foreground py-10 text-center">No events yet</li>
              ) : (
                events.map((e, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <div>
                      <p className="font-mono font-medium">{e.eventType}</p>
                      {e.metadata && (
                        <p className="text-muted-foreground mt-0.5 break-all text-[10px]">
                          {e.metadata}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-muted-foreground">
                        {String(e.eventTime).slice(0, 16).replace('T', ' ')}
                      </p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                        {e.fromStatus || '—'} → {e.toStatus || '—'} · {e.source || '—'}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
