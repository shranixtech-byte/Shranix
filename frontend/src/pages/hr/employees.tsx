import { Eye, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getDepartments, getEmployees, type Employee } from '@/services/hr.service';

const STATUS_CLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  inactive: 'bg-muted text-muted-foreground',
  resigned: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  terminated: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  retired: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

export function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; departmentName: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getEmployees({
        ps: 50,
        search: search || undefined,
        status: status || undefined,
        departmentId: departmentId || undefined,
      })) as any;
      setRows(res?.data || []);
      setTotal(res?.total || 0);
      const depts = (await getDepartments({ ps: 100 })) as any;
      setDepartments(depts?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, status, departmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Employees</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{total} employees</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / code / mobile…"
              className="border-border bg-card placeholder:text-muted-foreground w-56 rounded-lg border py-1.5 pl-8 pr-3 text-xs outline-none"
            />
          </div>
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
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.departmentName}
              </option>
            ))}
          </select>
          <Link
            to="/hr/employees/new"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New employee
          </Link>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Designation</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Type</th>
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
                  No employees found
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr
                  key={e.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{e.employeeCode}</td>
                  <td className="px-4 py-3 font-medium">
                    {e.firstName} {e.lastName || ''}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {e.departmentName || '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {e.designationName || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">{e.mobile || '—'}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs capitalize">
                    {e.employmentType?.replace('_', ' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[e.status || 'active'] || 'bg-muted'}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/hr/employees/${e.id}`}
                      className="text-primary hover:bg-primary/5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
                    >
                      <Eye className="h-3 w-3" /> View
                    </Link>
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
