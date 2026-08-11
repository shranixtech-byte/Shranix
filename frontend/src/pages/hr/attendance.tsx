import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getAttendance,
  getAttendanceSummary,
  getEmployees,
  markAttendance,
  type AttendanceRecord,
} from '@/services/hr.service';

const STATUSES = [
  'present',
  'absent',
  'half_day',
  'late',
  'early_exit',
  'work_from_home',
  'holiday',
  'leave',
];
const STATUS_CLS: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  absent: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  half_day: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  late: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30',
  early_exit: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30',
  work_from_home: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30',
  holiday: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30',
  leave: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

export function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; firstName: string; lastName?: string }[]
  >([]);
  const [date] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [markForm, setMarkForm] = useState({
    employeeId: '',
    status: 'present',
    checkIn: '09:00',
    checkOut: '18:00',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [att, emps, sum] = await Promise.all([
        getAttendance({ ps: 50, month }),
        getEmployees({ ps: 200 }),
        getAttendanceSummary(date),
      ]);
      setRows((att as any)?.data || []);
      setEmployees((emps as any)?.data || []);
      setSummary(sum as any);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [month, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMark = async () => {
    if (!markForm.employeeId) {
      return;
    }
    setSaving(true);
    try {
      await markAttendance({ ...markForm, attendanceDate: date });
      setMarkForm({ ...markForm, employeeId: '' });
      await load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Mark and review employee attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          />
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Daily summary */}
      {summary && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Present', value: Number(summary.present || 0), cls: 'text-emerald-600' },
            { label: 'Late', value: Number(summary.late || 0), cls: 'text-orange-500' },
            { label: 'Absent', value: Number(summary.absent || 0), cls: 'text-red-500' },
            { label: 'Leave', value: Number(summary.leave || 0), cls: 'text-slate-500' },
            { label: 'Half day', value: Number(summary.halfDay || 0), cls: 'text-amber-600' },
            { label: 'WFH', value: Number(summary.workFromHome || 0), cls: 'text-sky-600' },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border p-3 shadow-sm">
              <p className="text-muted-foreground text-[11px] font-medium">{s.label}</p>
              <p className={`mt-0.5 text-xl font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mark attendance */}
      <div className="bg-card mt-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-muted-foreground text-xs font-medium">Employee</label>
            <select
              value={markForm.employeeId}
              onChange={(e) => setMarkForm({ ...markForm, employeeId: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName || ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">Status</label>
            <select
              value={markForm.status}
              onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}
              className="border-border bg-card mt-1 rounded-lg border px-3 py-2 text-sm outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">Check-in</label>
            <input
              type="time"
              value={markForm.checkIn}
              onChange={(e) => setMarkForm({ ...markForm, checkIn: e.target.value })}
              className="border-border bg-card mt-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">Check-out</label>
            <input
              type="time"
              value={markForm.checkOut}
              onChange={(e) => setMarkForm({ ...markForm, checkOut: e.target.value })}
              className="border-border bg-card mt-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => void handleMark()}
            disabled={saving || !markForm.employeeId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Mark for {date}
          </button>
        </div>
      </div>

      {/* Attendance list */}
      <div className="mt-4 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
              <th className="px-4 py-3 font-medium">Check-out</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">OT</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground py-12 text-center text-xs">
                  No attendance records
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 text-xs">{r.attendanceDate}</td>
                  <td className="px-4 py-3 text-xs font-medium">
                    {r.employeeName || r.employeeId}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.checkIn || '—'}</td>
                  <td className="px-4 py-3 text-xs">{r.checkOut || '—'}</td>
                  <td className="px-4 py-3 text-xs">{r.workingHours ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{r.overtimeHours ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[r.status] || 'bg-muted'}`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
