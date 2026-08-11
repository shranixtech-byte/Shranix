import { Cpu, KeyRound, Loader2, MonitorDown, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { portalService } from '@/services/portal.service';

export function PortalLicensePage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await portalService.getLicenseOverview());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data?.license) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="bg-card rounded-xl border p-8 text-center shadow-sm">
          <KeyRound className="text-muted-foreground mx-auto h-8 w-8" />
          <h2 className="mt-3 text-lg font-semibold">No license yet</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Once you subscribe to a plan, your license will appear here.
          </p>
        </div>
      </div>
    );
  }

  const lic = data.license;
  const statusCls =
    lic.status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-700'
      : lic.status === 'GRACE_PERIOD'
        ? 'bg-amber-100 text-amber-700'
        : lic.status === 'SUSPENDED' || lic.status === 'EXPIRED'
          ? 'bg-red-100 text-red-700'
          : 'bg-muted text-muted-foreground';

  const deactivate = async (devicePublicId: string, deviceName: string) => {
    if (!window.confirm(`Deactivate "${deviceName}"? This frees up one of your device slots.`)) {
      return;
    }
    setBusy(true);
    try {
      await portalService.deactivateLicenseDevice(devicePublicId, 'Deactivated from portal');
      alert('Device deactivated. You can now activate a new device.');
      void load();
    } catch (err: any) {
      alert(err.message || 'Deactivation failed');
    } finally {
      setBusy(false);
    }
  };

  const requestTransfer = async () => {
    const name = window.prompt('New device name (optional):') || undefined;
    const hash = window.prompt('New device identifier (machine id):');
    if (!hash) {
      return;
    }
    const source = data.devices.find((d: any) => d.status === 'active');
    if (!source) {
      alert('No active device to transfer from.');
      return;
    }
    setBusy(true);
    try {
      await portalService.requestLicenseTransfer({
        fromDevicePublicId: source.devicePublicId,
        toDeviceIdentifierHash: hash,
        toDeviceName: name,
        reason: 'Device transfer requested from portal',
      });
      alert('Transfer request submitted for admin approval.');
    } catch (err: any) {
      alert(err.message || 'Transfer request failed');
    } finally {
      setBusy(false);
    }
  };

  const requestReactivation = async () => {
    const reason = window.prompt('Reason for reactivation (optional):') || undefined;
    setBusy(true);
    try {
      const res = await portalService.requestLicenseReactivation(reason);
      alert(res.message || 'Reactivation requested');
    } catch (err: any) {
      alert(err.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My License</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Your software license and devices</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusCls}`}>
          {lic.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">License details</h3>
          <dl className="space-y-2 text-xs">
            {[
              ['License number', lic.licenseNumber],
              ['Plan', lic.plan?.planName || '—'],
              ['Type', lic.licenseType],
              ['Valid from', String(lic.startsAt || '').slice(0, 10) || '—'],
              ['Expires on', String(lic.expiresAt || '').slice(0, 10) || '—'],
              ['Grace until', String(lic.graceUntil || '').slice(0, 10) || '—'],
              ['Auto renew', String(Boolean(lic.autoRenew))],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Device slots</h3>
          <div className="flex items-center gap-3">
            <div className="flex flex-1">
              {Array.from({ length: Math.max(1, lic.allowedDevices || 1) }).map((_, i) => (
                <div
                  key={i}
                  className={`mx-0.5 h-9 flex-1 rounded-md ${i < (lic.usedDevices || 0) ? 'bg-emerald-500' : 'bg-muted'}`}
                  title={i < (lic.usedDevices || 0) ? 'Used' : 'Free'}
                />
              ))}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold">
                {lic.usedDevices}
                <span className="text-muted-foreground text-sm"> / {lic.allowedDevices}</span>
              </p>
              <p className="text-muted-foreground text-[10px]">{lic.availableSlots} slot(s) free</p>
            </div>
          </div>
          <h4 className="text-muted-foreground mb-1.5 mt-4 text-[11px] font-semibold">
            Included features
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(
              data.entitlementList ||
              Object.keys(lic.entitlements || {}).filter((k) => Boolean(lic.entitlements[k]))
            ).map((f: string) => (
              <span
                key={f}
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700"
              >
                {f}
              </span>
            ))}
          </div>
          {lic.status !== 'ACTIVE' && lic.status !== 'GRACE_PERIOD' && (
            <button
              onClick={requestReactivation}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Request reactivation
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">My devices ({data.devices?.length || 0})</h3>
        <button
          onClick={requestTransfer}
          disabled={
            busy || (data.devices?.filter((d: any) => d.status === 'active') || []).length === 0
          }
          className="border-input bg-background flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs disabled:opacity-50"
        >
          <MonitorDown className="h-3.5 w-3.5" /> Transfer device
        </button>
      </div>

      <div className="bg-card mt-2 overflow-hidden rounded-xl border shadow-sm">
        {!data.devices?.length ? (
          <p className="text-muted-foreground py-10 text-center text-xs">
            No devices activated yet
          </p>
        ) : (
          <ul className="divide-y text-xs">
            {data.devices.map((d: any) => (
              <li
                key={d.devicePublicId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">{d.deviceName || 'Unnamed device'}</p>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      {d.platform || 'Unknown platform'}
                      {d.os ? ` · ${d.os}` : ''}
                      {d.applicationVersion ? ` · v${d.applicationVersion}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {d.status}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    seen {String(d.lastSeenAt || d.firstSeenAt || '').slice(0, 10)}
                  </span>
                  {d.status === 'active' && (
                    <button
                      onClick={() => void deactivate(d.devicePublicId, d.deviceName || 'device')}
                      disabled={busy}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-card mt-4 rounded-xl border p-4 shadow-sm">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security note
        </h3>
        <p className="text-muted-foreground text-xs">
          Your license is bound to the devices you activate. Raw machine identifiers are never
          stored or shared — only secure hashes. If you replace a device, deactivate the old one
          first (or request a transfer) so your device slots are freed.
        </p>
      </div>
    </div>
  );
}
