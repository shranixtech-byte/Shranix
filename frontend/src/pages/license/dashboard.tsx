import {
  Activity,
  CalendarClock,
  Cpu,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { licenseService } from '@/services/license.service';

export function LicenseDashboardPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await licenseService.dashboard());
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  const s = data?.byStatus || {};
  const cards = [
    {
      label: 'Total Licenses',
      value: String(data?.totalLicenses || 0),
      icon: KeyRound,
      cls: 'text-blue-600',
      sub: `${data?.trial || 0} trial`,
    },
    {
      label: 'Active',
      value: String(s.ACTIVE || 0),
      icon: ShieldCheck,
      cls: 'text-emerald-600',
      sub: 'currently valid',
    },
    {
      label: 'Grace Period',
      value: String(s.GRACE_PERIOD || 0),
      icon: Activity,
      cls: 'text-amber-600',
      sub: 'expired, grace running',
    },
    {
      label: 'Suspended / Expired',
      value: String((s.SUSPENDED || 0) + (s.EXPIRED || 0)),
      icon: ShieldAlert,
      cls: 'text-red-600',
      sub: `${s.EXPIRED || 0} expired • ${s.SUSPENDED || 0} suspended`,
    },
    {
      label: 'Revoked / Cancelled',
      value: String((s.REVOKED || 0) + (s.CANCELLED || 0)),
      icon: TriangleAlert,
      cls: 'text-violet-600',
      sub: `${s.REVOKED || 0} revoked • ${s.CANCELLED || 0} cancelled`,
    },
    {
      label: 'Active Devices',
      value: String(data?.activeDevices || 0),
      icon: Cpu,
      cls: 'text-sky-600',
      sub: `${data?.availableDeviceSlots || 0} free slots`,
    },
    {
      label: 'Activation attempts (30d)',
      value: String(data?.activationAttempts || 0),
      icon: Activity,
      cls: 'text-indigo-600',
      sub: `${data?.failedActivations || 0} failed`,
    },
    {
      label: 'Upcoming expiry (30d)',
      value: String(data?.upcomingExpiry?.length || 0),
      icon: CalendarClock,
      cls: 'text-rose-600',
      sub: 'licenses expiring soon',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">License Dashboard</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          License, device and activation analytics
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-xs">{c.label}</p>
                <p className="mt-1 text-xl font-bold">{c.value}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px]">{c.sub}</p>
              </div>
              <c.icon className={`h-5 w-5 ${c.cls}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Status distribution</h3>
          <ul className="space-y-2 text-xs">
            {Object.entries(s).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <span>{status}</span>
                <div className="bg-muted h-1.5 w-40 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : status === 'REVOKED' ? 'bg-red-500' : status === 'GRACE_PERIOD' ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{
                      width: `${((Number(count) || 0) / Math.max(1, data?.totalLicenses || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-mono">{String(count)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Upcoming expiry (next 30 days)</h3>
          {!data?.upcomingExpiry?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">Nothing expiring soon</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {data.upcomingExpiry.map((l: any) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5"
                >
                  <span className="font-mono">{l.licenseNumber}</span>
                  <span className="text-muted-foreground">
                    {String(l.expiresAt || '').slice(0, 10)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${l.status === 'GRACE_PERIOD' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Recent license events</h3>
          {!data?.recentEvents?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">No events yet</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
              {data.recentEvents.map((e: any, i: number) => (
                <li
                  key={i}
                  className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-1.5"
                >
                  <span className="font-mono">{e.eventType}</span>
                  <span className="text-muted-foreground">
                    {String(e.eventTime).slice(0, 16).replace('T', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Quick facts</h3>
          <ul className="space-y-2 text-xs">
            <li className="flex justify-between">
              <span className="text-muted-foreground">Total registered devices</span>
              <span className="font-mono">{data?.totalDevices || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Available device slots</span>
              <span className="font-mono">{data?.availableDeviceSlots || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Pending licenses</span>
              <span className="font-mono">{s.PENDING || 0}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-muted-foreground">Failed activations (30d)</span>
              <span className="font-mono">{data?.failedActivations || 0}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
