import { CalendarClock, Loader2, Mail, Pencil, Phone, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getEmployee,
  getLeaveBalances,
  type Employee,
  type LeaveBalance,
} from '@/services/hr.service';

const TL_ICON: Record<string, string> = {
  joined: '🟢',
  department_changed: '🏢',
  designation_changed: '📈',
  status_changed: '🔁',
  resigned: '🚪',
  terminated: '⛔',
  retired: '🎓',
  user_mapped: '👤',
};

export function EmployeeDetailPage() {
  const { id } = useParams();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await getEmployee(id!);
      setEmp(e);
      const b = (await getLeaveBalances(id!).catch(() => [])) as LeaveBalance[];
      setBalances(b);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!emp) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">Employee not found</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="from-primary/20 to-primary/10 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-xl font-bold">
            {emp.firstName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {emp.firstName} {emp.lastName || ''}
            </h1>
            <p className="text-muted-foreground text-sm">
              {emp.employeeCode} • {emp.departmentName || '—'} • {emp.designationName || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              emp.status === 'active'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {emp.status}
          </span>
          <Link
            to={`/hr/employees/${emp.id}/edit`}
            className="border-border hover:border-primary/40 text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Contact + org */}
        <div className="bg-card rounded-xl border p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <p className="text-muted-foreground flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> {emp.mobile || '—'}
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> {emp.email || '—'}
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> {emp.gender || '—'}
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" /> Joined{' '}
              {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'}
            </p>
            <div className="border-border border-t pt-2 text-xs">
              <p className="text-muted-foreground">
                Employment:{' '}
                <span className="text-foreground capitalize">
                  {emp.employmentType?.replace('_', ' ')}
                </span>
              </p>
              <p className="text-muted-foreground mt-1">
                PAN: <span className="text-foreground">{emp.pan || '—'}</span>
              </p>
              <p className="text-muted-foreground mt-1">
                Bank: <span className="text-foreground">{emp.bankAccount || '—'}</span>
              </p>
              <p className="text-muted-foreground mt-1">
                IFSC: <span className="text-foreground">{emp.ifsc || '—'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Leave balances */}
        <div className="bg-card rounded-xl border p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold">Leave Balances</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((b) => (
              <div key={b.leaveType} className="border-border rounded-lg border p-3">
                <p className="text-muted-foreground text-xs capitalize">{b.leaveType} leave</p>
                <p
                  className={`mt-1 text-2xl font-bold ${b.available < 0 ? 'text-red-500' : 'text-emerald-600'}`}
                >
                  {b.available}
                </p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Used {b.used} • Pending {b.pending} • Allocated {b.allocated}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Timeline</h2>
        <div className="mt-4 space-y-0">
          {(emp.timeline || [])
            .slice()
            .reverse()
            .map((t, i) => (
              <div key={t.id} className="relative flex gap-3 pb-4">
                {i < (emp.timeline || []).length - 1 && (
                  <span className="bg-border absolute left-[9px] top-5 h-full w-px" />
                )}
                <span className="bg-muted relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px]">
                  {TL_ICON[t.eventType] || '•'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.description && (
                    <p className="text-muted-foreground text-xs">{t.description}</p>
                  )}
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                    {t.eventDate ? new Date(t.eventDate).toLocaleString('en-IN') : ''}
                  </p>
                </div>
              </div>
            ))}
          {(emp.timeline || []).length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">No timeline events yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
