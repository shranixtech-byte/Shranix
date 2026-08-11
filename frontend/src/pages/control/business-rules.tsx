import { FlaskConical, Loader2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { businessRuleApi, type BusinessRule } from '@/services/control.service';

const MODULES = [
  'sales',
  'purchase',
  'inventory',
  'accounts',
  'hr',
  'asset',
  'expense',
  'crm',
  'payment',
];
const ACTIONS = ['allow', 'block', 'warn', 'require_approval', 'notify', 'escalate', 'lock'];
const SEVERITIES = ['info', 'warning', 'error', 'critical'];

const ACTION_CLS: Record<string, string> = {
  allow: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  block: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  warn: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  require_approval: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  notify: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30',
  escalate: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30',
  lock: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

const inputCls =
  'border-border bg-card w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary/50';

export function BusinessRulesPage() {
  const [rows, setRows] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [form, setForm] = useState<any>({
    ruleCode: '',
    ruleName: '',
    module: 'sales',
    documentType: '',
    action: 'block',
    severity: 'error',
    message: '',
    priority: 100,
    status: 'active',
    condition: { field: 'amount', operator: 'gt', value: 100000 },
  });
  // Rule tester
  const [testAmount, setTestAmount] = useState('100000');
  const [testResult, setTestResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessRuleApi.list({ module: module || undefined, pageSize: 100 });
      setRows(res?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setCond = (k: string, v: any) =>
    setForm((f: any) => ({ ...f, condition: { ...f.condition, [k]: v } }));

  const save = async () => {
    try {
      if (editing) {
        await businessRuleApi.update(editing.id, form);
      } else {
        await businessRuleApi.create(form);
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  };

  const remove = async (r: BusinessRule) => {
    if (!window.confirm(`Delete rule "${r.ruleName}"?`)) {
      return;
    }
    try {
      await businessRuleApi.remove(r.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  const testRule = async () => {
    try {
      const res = await businessRuleApi.evaluate({
        module: form.module,
        documentType: form.documentType || undefined,
        amount: Number(testAmount) || 0,
        data: { amount: Number(testAmount) || 0 },
      });
      setTestResult(res);
    } catch (e: any) {
      alert(e?.message || 'Evaluation failed');
    }
  };

  const editRule = (r: BusinessRule) => {
    setEditing(r);
    setForm({
      ruleCode: r.ruleCode,
      ruleName: r.ruleName,
      module: r.module,
      documentType: r.documentType || '',
      action: r.action,
      severity: r.severity || 'error',
      message: r.message || '',
      priority: r.priority ?? 100,
      status: r.status || 'active',
      condition: r.condition || { field: 'amount', operator: 'gt', value: 100000 },
    });
    setShowForm(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Business Rules</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {rows.length} rules — allow / block / warn / require approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">All modules</option>
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New rule
          </button>
          <button
            onClick={() => void load()}
            className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Rule tester */}
      <div className="bg-card mt-5 rounded-xl border p-4 shadow-sm">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <FlaskConical className="h-4 w-4" /> Rule evaluator
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            className={`${inputCls} w-32`}
            placeholder="Amount ₹"
          />
          <button
            onClick={() => void testRule()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Evaluate
          </button>
          {testResult && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${testResult.triggered ? 'bg-red-50 text-red-600 dark:bg-red-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'}`}
            >
              {testResult.triggered
                ? `${testResult.action}: ${testResult.message}`
                : 'No rule triggered'}
            </span>
          )}
        </div>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="bg-card mt-4 rounded-xl border p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">{editing ? 'Edit rule' : 'New rule'}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Rule code *
              </span>
              <input
                value={form.ruleCode}
                onChange={(e) => set('ruleCode', e.target.value)}
                className={inputCls}
                placeholder="e.g. SALE_MIN_PRICE"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Rule name *
              </span>
              <input
                value={form.ruleName}
                onChange={(e) => set('ruleName', e.target.value)}
                className={inputCls}
                placeholder="Prevent sale below minimum price"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Module *
              </span>
              <select
                value={form.module}
                onChange={(e) => set('module', e.target.value)}
                className={inputCls}
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Document type
              </span>
              <input
                value={form.documentType}
                onChange={(e) => set('documentType', e.target.value)}
                className={inputCls}
                placeholder="e.g. sales_invoice"
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Action
              </span>
              <select
                value={form.action}
                onChange={(e) => set('action', e.target.value)}
                className={inputCls}
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Severity
              </span>
              <select
                value={form.severity}
                onChange={(e) => set('severity', e.target.value)}
                className={inputCls}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Priority (lower = checked first)
              </span>
              <input
                type="number"
                value={form.priority ?? 100}
                onChange={(e) => set('priority', Number(e.target.value))}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Message shown when rule triggers
              </span>
              <input
                value={form.message || ''}
                onChange={(e) => set('message', e.target.value)}
                className={inputCls}
                placeholder="Sale amount exceeds approval limit"
              />
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                Condition — field
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={form.condition.field}
                  onChange={(e) => setCond('field', e.target.value)}
                  className={inputCls}
                  placeholder="amount"
                />
                <select
                  value={form.condition.operator}
                  onChange={(e) => setCond('operator', e.target.value)}
                  className={inputCls}
                >
                  {[
                    'eq',
                    'neq',
                    'gt',
                    'gte',
                    'lt',
                    'lte',
                    'contains',
                    'between',
                    'in',
                    'not_in',
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input
                  value={form.condition.value ?? ''}
                  onChange={(e) => setCond('value', e.target.value)}
                  className={inputCls}
                  placeholder="100000"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t pt-4">
            <button
              onClick={() => setShowForm(false)}
              className="border-border text-muted-foreground hover:border-primary/40 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={!form.ruleCode || !form.ruleName}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {editing ? 'Save changes' : 'Create rule'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Condition</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <Loader2 className="text-primary mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground py-12 text-center text-xs">
                  No business rules configured
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-border hover:bg-muted/30 border-t transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.ruleCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.ruleName}</p>
                    <p className="text-muted-foreground max-w-[260px] truncate text-[11px]">
                      {r.message || ''}
                    </p>
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs capitalize">
                    {r.module}
                    {r.documentType ? ` / ${r.documentType}` : ''}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {r.condition?.field}.{r.condition?.operator}{' '}
                    {r.condition?.value !== undefined ? r.condition.value : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_CLS[r.action] || 'bg-muted'}`}
                    >
                      {r.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => editRule(r)}
                        className="text-primary hover:bg-primary/5 rounded-md px-2 py-1 text-[11px] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void remove(r)}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
