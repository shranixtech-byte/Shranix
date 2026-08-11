import {
  CalendarClock,
  Clock,
  Loader2,
  RefreshCw,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getHrDashboard, type HrDashboard } from '@/services/hr.service';

export function HrDashboardPage() {
  const [data, setData] = useState<HrDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getHrDashboard());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDept = Math.max(1, ...(data?.departmentDistribution || []).map((d) => d.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">HR Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Employees, attendance, leave and payroll at a glance
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="border-border hover:border-primary/40 text-muted-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Employees',
                value: data?.totalEmployees ?? 0,
                icon: Users,
                cls: 'border-l-blue-500',
              },
              {
                label: 'Active',
                value: data?.activeEmployees ?? 0,
                icon: UserCheck,
                cls: 'border-l-emerald-500',
              },
              {
                label: 'Present Today',
                value: data?.presentToday ?? 0,
                icon: UserCheck,
                cls: 'border-l-teal-500',
              },
              {
                label: 'On Leave Today',
                value: data?.onLeaveToday ?? 0,
                icon: CalendarClock,
                cls: 'border-l-amber-500',
              },
              {
                label: 'Absent Today',
                value: data?.absentToday ?? 0,
                icon: UserMinus,
                cls: 'border-l-red-500',
              },
              {
                label: 'Late Today',
                value: data?.lateToday ?? 0,
                icon: Clock,
                cls: 'border-l-orange-500',
              },
              {
                label: 'Pending Leaves',
                value: data?.pendingLeaveRequests ?? 0,
                icon: CalendarClock,
                cls: 'border-l-violet-500',
              },
              {
                label: 'Payroll Pending',
                value: data?.pendingPayroll ?? 0,
                icon: Wallet,
                cls: 'border-l-purple-500',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className={`bg-card rounded-lg border-l-4 p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${kpi.cls}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs font-medium">{kpi.label}</p>
                    <Icon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Department distribution */}
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Department Distribution</h2>
              <div className="mt-4 space-y-3">
                {(data?.departmentDistribution || []).map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">{d.count}</span>
                    </div>
                    <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${(d.count / maxDept) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(data?.departmentDistribution || []).length === 0 && (
                  <p className="text-muted-foreground text-xs">No employees yet</p>
                )}
              </div>
            </div>

            {/* Recent joining */}
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Recent Joining</h2>
              <div className="mt-3 divide-y">
                {(data?.recentJoining || []).slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {e.employeeCode} • {e.department || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          e.status === 'active'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {e.status}
                      </span>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {e.joiningDate ? new Date(e.joiningDate).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </div>
                  </div>
                ))}
                {(data?.recentJoining || []).length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-xs">No employees yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Payroll strip */}
          <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Payroll Overview</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Total net across payroll runs
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  ₹{(data?.totalPayrollNet ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-muted-foreground text-xs">
                  {data?.pendingPayroll ?? 0} runs pending payment
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
