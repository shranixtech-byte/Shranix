import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { expenseApi } from '@/services/asset-expense.service';

const inputCls =
  'border-border bg-card w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary/50';

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const [employees, setEmployees] = useState<
    { id: string; firstName: string; lastName?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [nextNumber, setNextNumber] = useState('');
  const [form, setForm] = useState<any>({
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryId: '',
    amount: 0,
    taxAmount: 0,
    paymentMode: 'bank',
    description: '',
    reference: '',
  });

  useEffect(() => {
    void (async () => {
      try {
        const [cats, { nextNumber: nn }] = await Promise.all([
          expenseApi.categories(),
          expenseApi.nextNumber(),
        ]);
        setCategories(cats || []);
        setNextNumber(nn);
        const emps = (await import('@/services/hr.service')).getEmployees({ ps: 100 });
        const res = (await emps) as any;
        setEmployees(res?.data || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const total = Math.round((Number(form.amount) + Number(form.taxAmount)) * 100) / 100;

  const save = async () => {
    setSaving(true);
    try {
      await expenseApi.create({
        ...form,
        employeeId: form.employeeId || undefined,
        categoryId: form.categoryId || undefined,
        status: 'draft',
      });
      navigate('/expenses');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to="/expenses"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to expenses
      </Link>
      <h1 className="text-xl font-bold">New expense</h1>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Number will be <span className="font-mono">{nextNumber}</span>
      </p>

      <div className="bg-card mt-5 rounded-xl border p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Expense date *
            </span>
            <input
              type="date"
              value={form.expenseDate || ''}
              onChange={(e) => set('expenseDate', e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Category
            </span>
            <select
              value={form.categoryId || ''}
              onChange={(e) => set('categoryId', e.target.value)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Amount (₹) *
            </span>
            <input
              type="number"
              min={0}
              value={form.amount || 0}
              onChange={(e) => set('amount', Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Tax amount (₹)
            </span>
            <input
              type="number"
              min={0}
              value={form.taxAmount || 0}
              onChange={(e) => set('taxAmount', Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Payment mode
            </span>
            <select
              value={form.paymentMode || 'bank'}
              onChange={(e) => set('paymentMode', e.target.value)}
              className={inputCls}
            >
              {['cash', 'bank', 'upi', 'cheque', 'other'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Employee (if claim)
            </span>
            <select
              value={form.employeeId || ''}
              onChange={(e) => set('employeeId', e.target.value)}
              className={inputCls}
            >
              <option value="">No employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName || ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Reference
            </span>
            <input
              value={form.reference || ''}
              onChange={(e) => set('reference', e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
              Payment reference
            </span>
            <input
              value={form.paymentReference || ''}
              onChange={(e) => set('paymentReference', e.target.value)}
              className={inputCls}
            />
          </label>
          <div className="sm:col-span-2">
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Description
              </span>
              <textarea
                value={form.description || ''}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className={inputCls}
              />
            </label>
          </div>
        </div>

        <div className="bg-muted/40 mt-4 flex items-center justify-between rounded-lg px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono text-base font-bold">
            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Link
            to="/expenses"
            className="border-border text-muted-foreground hover:border-primary/40 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => void save()}
            disabled={saving || !form.amount}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Create expense
          </button>
        </div>
      </div>
    </div>
  );
}
