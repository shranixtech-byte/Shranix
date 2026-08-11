import { BadgeCheck, Check, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  approvePayrollRun,
  generatePayrollRun,
  getPayrollRun,
  getPayrollRuns,
  markPayrollPaid,
  type PayrollRun,
} from '@/services/hr.service';

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  paid: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30',
  cancelled: 'bg-red-50 text-red-600 dark:bg-red-950/30',
};

export function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [genForm, setGenForm] = useState({ payPeriodStart: '', payPeriodEnd: '' });
  const [genLoading, setGenLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getPayrollRuns({ ps: 50, status: status || undefined })) as any;
      setRuns(res?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    if (!genForm.payPeriodStart || !genForm.payPeriodEnd) {
      return;
    }
    setGenLoading(true);
    try {
      await generatePayrollRun(genForm);
      setGenForm({ payPeriodStart: '', payPeriodEnd: '' });
      await load();
    } catch {
      /* ignore */
    } finally {
      setGenLoading(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    try {
      const run = await getPayrollRun(id);
      setLines((run as any)?.lines || []);
    } catch {
      setLines([]);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Payroll</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Salary runs, approval and payment</p>
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

      {/* Generate run */}
      <div className="bg-card mt-4 rounded-xl border p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Generate Payroll Run</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-muted-foreground text-xs font-medium">Pay period start</label>
            <input
              type="date"
              value={genForm.payPeriodStart}
              onChange={(e) => setGenForm({ ...genForm, payPeriodStart: e.target.value })}
              className="border-border bg-card mt-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs font-medium">Pay period end</label>
            <input
              type="date"
              value={genForm.payPeriodEnd}
              onChange={(e) => setGenForm({ ...genForm, payPeriodEnd: e.target.value })}
              className="border-border bg-card mt-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => void handleGenerate()}
            disabled={genLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {genLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wallet className="h-3.5 w-3.5" />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Runs */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">No payroll runs yet</div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="bg-card rounded-xl border shadow-sm">
              <button
                onClick={() => void toggleExpand(run.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{run.runNumber}</p>
                  <p className="text-muted-foreground text-xs">
                    {run.payPeriodStart} → {run.payPeriodEnd} • {run.employeeCount} employees
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{run.netTotal.toLocaleString('en-IN')}</p>
                    <p className="text-muted-foreground text-[10px]">Net</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[run.status] || 'bg-muted'}`}
                  >
                    {run.status}
                  </span>
                  {run.status === 'draft' && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void approvePayrollRun(run.id).then(load);
                      }}
                      className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      title="Approve"
                    >
                      <BadgeCheck className="h-4 w-4" />
                    </span>
                  )}
                  {run.status === 'approved' && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Mark this payroll run as paid?')) {
                          void markPayrollPaid(run.id).then(load);
                        }
                      }}
                      className="rounded-md p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                      title="Mark paid"
                    >
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </button>

              {expanded === run.id && (
                <div className="border-border border-t px-4 py-3">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-2 font-medium">Employee</th>
                        <th className="py-2 font-medium">Days</th>
                        <th className="py-2 font-medium">OT hrs</th>
                        <th className="py-2 font-medium">Gross</th>
                        <th className="py-2 font-medium">Deductions</th>
                        <th className="py-2 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.id} className="border-border/50 border-t">
                          <td className="py-2">
                            <span className="font-medium">{l.employeeName || l.employeeId}</span>
                            {l.employeeCode && (
                              <span className="text-muted-foreground ml-1 font-mono">
                                {l.employeeCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2">{l.attendanceDays}</td>
                          <td className="py-2">{l.overtimeHours}</td>
                          <td className="py-2">₹{l.grossSalary.toLocaleString('en-IN')}</td>
                          <td className="py-2">₹{l.totalDeductions.toLocaleString('en-IN')}</td>
                          <td className="py-2 font-semibold">
                            ₹{l.netSalary.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
