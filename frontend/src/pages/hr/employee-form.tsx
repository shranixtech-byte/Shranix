import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createEmployee,
  getDepartments,
  getDesignations,
  getEmployee,
  getEmployees,
  getNextEmployeeCode,
  updateEmployee,
} from '@/services/hr.service';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'intern'];
const STATUSES = ['active', 'inactive', 'resigned', 'terminated', 'retired'];

interface Form {
  employeeCode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  departmentId: string;
  designationId: string;
  reportingManagerId: string;
  joiningDate: string;
  employmentType: string;
  workLocation: string;
  status: string;
  pan: string;
  bankAccount: string;
  ifsc: string;
  upi: string;
  notes: string;
}

const empty = (): Form => ({
  employeeCode: '',
  firstName: '',
  middleName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  mobile: '',
  email: '',
  departmentId: '',
  designationId: '',
  reportingManagerId: '',
  joiningDate: '',
  employmentType: 'full_time',
  workLocation: '',
  status: 'active',
  pan: '',
  bankAccount: '',
  ifsc: '',
  upi: '',
  notes: '',
});

export function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(empty());
  const [departments, setDepartments] = useState<{ id: string; departmentName: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; designationName: string }[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; firstName: string; lastName?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const [depts, desigs, emps] = await Promise.all([
        getDepartments({ ps: 100 }).catch(() => ({ data: [] })),
        getDesignations({ ps: 100 }).catch(() => ({ data: [] })),
        getEmployees({ ps: 200 }).catch(() => ({ data: [] })),
      ]);
      setDepartments((depts as any)?.data || []);
      setDesignations((desigs as any)?.data || []);
      setEmployees((emps as any)?.data || []);

      if (isEdit) {
        const emp = await getEmployee(id!).catch(() => null);
        if (emp) {
          setForm({
            employeeCode: emp.employeeCode,
            firstName: emp.firstName,
            middleName: emp.middleName || '',
            lastName: emp.lastName || '',
            gender: emp.gender || '',
            dateOfBirth: emp.dateOfBirth || '',
            mobile: emp.mobile || '',
            email: emp.email || '',
            departmentId: emp.departmentId || '',
            designationId: emp.designationId || '',
            reportingManagerId: emp.reportingManagerId || '',
            joiningDate: emp.joiningDate || '',
            employmentType: emp.employmentType || 'full_time',
            workLocation: emp.workLocation || '',
            status: emp.status || 'active',
            pan: emp.pan || '',
            bankAccount: emp.bankAccount || '',
            ifsc: emp.ifsc || '',
            upi: emp.upi || '',
            notes: emp.notes || '',
          });
        }
      } else {
        const nc = await getNextEmployeeCode().catch(() => ({ nextCode: '' }));
        setForm((f) => ({ ...f, employeeCode: (nc as any)?.nextCode || '' }));
      }
    })();
  }, [id, isEdit]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      setError('First name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateEmployee(id!, { ...form, employeeCode: undefined } as unknown as Record<
          string,
          unknown
        >);
      } else {
        await createEmployee(form as unknown as Record<string, unknown>);
      }
      navigate('/hr/employees');
    } catch (err: any) {
      setError(err?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'border-border bg-card mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary/50';
  const labelCls = 'text-muted-foreground text-xs font-medium';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{isEdit ? 'Edit Employee' : 'New Employee'}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{form.employeeCode}</p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {isEdit ? 'Update' : 'Create'}
        </button>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-lg border px-4 py-2 text-xs">
          {error}
        </div>
      )}

      <div className="bg-card mt-5 rounded-xl border p-5 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Personal
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>First name *</label>
            <input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Middle name</label>
            <input
              value={form.middleName}
              onChange={(e) => set('middleName', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Date of birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Joining date</label>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => set('joiningDate', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) => set('mobile', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Work location</label>
            <input
              value={form.workLocation}
              onChange={(e) => set('workLocation', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Organization
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => set('departmentId', e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Designation</label>
            <select
              value={form.designationId}
              onChange={(e) => set('designationId', e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.designationName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reporting manager</label>
            <select
              value={form.reportingManagerId}
              onChange={(e) => set('reportingManagerId', e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName || ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Employment type</label>
            <select
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value)}
              className={inputCls}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={inputCls}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Statutory & Bank
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>PAN</label>
            <input
              value={form.pan}
              onChange={(e) => set('pan', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Bank account</label>
            <input
              value={form.bankAccount}
              onChange={(e) => set('bankAccount', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>IFSC</label>
            <input
              value={form.ifsc}
              onChange={(e) => set('ifsc', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>UPI</label>
            <input
              value={form.upi}
              onChange={(e) => set('upi', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Notes
        </h2>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className={`${inputCls} mt-3`}
        />
      </div>
    </div>
  );
}
