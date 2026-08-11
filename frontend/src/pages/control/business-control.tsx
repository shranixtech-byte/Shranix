import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldAlert, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

import { businessControlApi, type ControlDashboard } from '@/services/control.service';

export function BusinessControlPage() {
  const [data, setData] = useState<ControlDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await businessControlApi.dashboard();
        setData(res);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Pending Approvals',
      value: String(data?.pendingApprovals || 0),
      icon: Clock,
      cls: 'text-blue-600',
      sub: `${data?.myPendingApprovals || 0} assigned to you`,
    },
    {
      label: 'Overdue Approvals',
      value: String(data?.overdueApprovals || 0),
      icon: Timer,
      cls: 'text-red-600',
      sub: 'past SLA due date',
    },
    {
      label: 'Active Business Rules',
      value: String(data?.activeRules || 0),
      icon: ShieldAlert,
      cls: 'text-amber-600',
      sub: `${data?.blockRules || 0} blocking • ${data?.requireApprovalRules || 0} require approval`,
    },
    {
      label: 'Approved Today',
      value: String(data?.approvedToday || 0),
      icon: CheckCircle2,
      cls: 'text-emerald-600',
      sub: `${data?.rejectedToday || 0} rejected • ${data?.returnedToday || 0} returned`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Business Control Center</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Approvals, escalations and business rule enforcement
            {data?.averageApprovalHours !== null &&
              data?.averageApprovalHours !== undefined &&
              ` • avg approval time ${data.averageApprovalHours}h`}
          </p>
        </div>
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
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Configured rule violations
          </h3>
          {!data?.ruleViolations?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No business rules configured
            </p>
          ) : (
            <ul className="divide-y">
              {data.ruleViolations.map((v) => (
                <li key={v.ruleCode} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-medium">{v.ruleName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {v.module} • {v.severity}
                    </p>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">{v.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Pending approvals by type</h3>
          {!data?.pendingByType?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">No pending approvals</p>
          ) : (
            <ul className="space-y-2">
              {data.pendingByType.map((p) => (
                <li key={p.documentType} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{p.documentType.replace(/_/g, ' ')}</span>
                  <div className="bg-muted h-1.5 w-40 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (p.count / Math.max(1, data.pendingApprovals)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-mono">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Module distribution</h3>
          {!data?.moduleBreakdown?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No workflow activity yet
            </p>
          ) : (
            <ul className="space-y-2">
              {data.moduleBreakdown.slice(0, 8).map((m) => (
                <li key={m.module} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{m.module}</span>
                  <span className="font-mono">{m.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Escalated workflows</h3>
          {!data?.escalated?.length ? (
            <p className="text-muted-foreground py-6 text-center text-xs">No escalations</p>
          ) : (
            <ul className="divide-y">
              {data.escalated.slice(0, 6).map((e: any) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-medium">{e.documentNumber || e.documentId}</p>
                    <p className="text-muted-foreground text-[11px] capitalize">
                      {e.module} • {e.status}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-amber-600">
                    escalation ×{e.escalationCount || 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
