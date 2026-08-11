import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  approveLeave,
  getEmployees,
  getLeaveRequests,
  rejectLeave,
  submitLeave,
  type LeaveRequest,
} from '@/services/hr.service';

const LEAVE_TYPES = ['casual', 'sick', 'earned', 'paid', 'unpaid', 'other'];
const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  approved: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  rejected: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export function LeavePage() {
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; firstName: string; lastName?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    employeeId: '',
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leaves, emps] = await Promise.all([
        getLeaveRequests({ ps: 50, status: status || undefined }),
        getEmployees({ ps: 200 }),
      ]);
      setRows((leaves as any)?.data || []);
      setEmployees((emps as any)?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      setError('Employee, start date and end date are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await submitLeave(form);
      setForm({ employeeId: '', leaveType: 'casual', startDate: '', endDate: '', reason: '' });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Requests, approvals and balances</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All statuses</option>
            {Object.keys(STATUS_CLS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-lg border px-4 py-2 text-xs">
          {error}
        </div>
      )}

      {/* Submit leave */}
      <div className="bg-card mt-4 rounded-xl border p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Submit Leave Request</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-muted-foreground text-xs font-medium">Employee</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName || ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">Type</label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">From</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">To</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-muted-foreground text-xs font-medium">Reason</label>
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* Leave list */}
      <div className="mt-4 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Days</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted-foreground py-12 text-center text-xs">
                  No leave requests
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-medium">
                    {r.employeeName || r.employeeId}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{r.leaveType}</td>
                  <td className="px-4 py-3 text-xs">{r.startDate}</td>
                  <td className="px-4 py-3 text-xs">{r.endDate}</td>
                  <td className="px-4 py-3 text-xs">{r.numberOfDays}</td>
                  <td className="text-muted-foreground max-w-[180px] truncate px-4 py-3 text-xs">
                    {r.reason || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[r.status] || 'bg-muted'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => void approveLeave(r.id).then(load)}
                          className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => void rejectLeave(r.id).then(load)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
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
  );
}
