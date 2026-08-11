import { Check, Loader2, Minus, PackagePlus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService, type Plan } from '@/services/commercial.service';

const FEATURE_LABELS: Record<string, string> = {
  sales: 'Sales',
  purchase: 'Purchase',
  inventory: 'Inventory',
  accounts: 'Accounts',
  reports: 'Reports',
  crm: 'CRM',
  communication: 'Communication',
  hr: 'HR',
  assets: 'Assets',
  workflow: 'Workflow',
  customer_portal: 'Customer Portal',
  advanced_analytics: 'Advanced Analytics',
  api_access: 'API Access',
  multi_branch: 'Multi-Branch',
};

const LIMIT_LABELS: Record<string, string> = {
  users: 'Users',
  branches: 'Branches',
  warehouses: 'Warehouses',
  customers: 'Customers',
  products: 'Products',
  invoices: 'Invoices / month',
  sales_orders: 'Sales Orders / month',
  purchase_orders: 'Purchase Orders / month',
  storage: 'Storage (MB)',
  api_requests: 'API requests / month',
};

const EMPTY_FEATURES: Record<string, boolean> = {
  sales: true,
  purchase: true,
  inventory: true,
  accounts: true,
  reports: false,
  crm: false,
  communication: false,
  hr: false,
  assets: false,
  workflow: false,
  customer_portal: false,
  advanced_analytics: false,
  api_access: false,
  multi_branch: false,
};

export function CommercialPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [matrix, setMatrix] = useState<{ features: string[]; plans: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans' | 'matrix'>('plans');
  const [showCreate, setShowCreate] = useState(false);
  const [versionFor, setVersionFor] = useState<Plan | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        commercialService.listPlans(),
        commercialService.planMatrix(),
      ]);
      setPlans(p.data);
      setMatrix(m);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createPlan = async () => {
    const features: Record<string, boolean> = {};
    for (const key of Object.keys(EMPTY_FEATURES)) {
      features[key] = Boolean(form[`feature_${key}`] ?? EMPTY_FEATURES[key]);
    }
    const limits: Record<string, number> = {};
    for (const key of Object.keys(LIMIT_LABELS)) {
      const v = Number(form[`limit_${key}`]);
      if (v > 0) {
        limits[key] = v;
      }
    }
    await commercialService.createPlan({
      planCode: form.planCode,
      planName: form.planName,
      displayName: form.displayName || form.planName,
      description: form.description,
      planType: form.planType || 'monthly',
      billingCycle: form.billingCycle || 'monthly',
      trialPeriodDays: Number(form.trialPeriodDays) || 0,
      gracePeriodDays: Number(form.gracePeriodDays) || 3,
      price: Number(form.price) || 0,
      discountPercent: Number(form.discountPercent) || 0,
      taxRate: Number(form.taxRate) || 0,
      features,
      limits,
    });
    setShowCreate(false);
    setForm({});
    void load();
  };

  const createVersion = async () => {
    if (!versionFor) {
      return;
    }
    const features: Record<string, boolean> = {};
    for (const key of Object.keys(EMPTY_FEATURES)) {
      features[key] = Boolean(versionFor.features?.[key] ?? EMPTY_FEATURES[key]);
    }
    const limits: Record<string, number> = { ...(versionFor.limits || {}) };
    await commercialService.createPlanVersion(versionFor.id, {
      price: Number(form.price) || 0,
      discountPercent: Number(form.discountPercent) || 0,
      taxRate: Number(form.taxRate) || 0,
      features,
      limits,
    });
    setVersionFor(null);
    setForm({});
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Commercial Plans</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Plan master, versioned pricing, feature entitlements &amp; usage limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTab('plans')}
              className={`rounded-md px-3 py-1.5 ${tab === 'plans' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              Plans
            </button>
            <button
              onClick={() => setTab('matrix')}
              className={`rounded-md px-3 py-1.5 ${tab === 'matrix' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              Feature Matrix
            </button>
          </div>
          {tab === 'plans' && (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            >
              <PackagePlus className="h-4 w-4" /> New Plan
            </button>
          )}
        </div>
      </div>

      {tab === 'matrix' && matrix ? (
        <div className="bg-card mt-5 overflow-x-auto rounded-xl border shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-left">
                <th className="px-4 py-3 font-semibold">Feature</th>
                {matrix.plans.map((p: any) => (
                  <th key={p.id} className="px-4 py-3 font-semibold">
                    {p.displayName}
                    <span className="text-muted-foreground block text-[10px] font-normal">
                      v{p.version} • ₹{Number(p.price).toLocaleString('en-IN')}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.features.map((feature: string) => (
                <tr key={feature} className="border-b last:border-0">
                  <td className="px-4 py-2.5 capitalize">
                    {FEATURE_LABELS[feature] || feature.replace(/_/g, ' ')}
                  </td>
                  {matrix.plans.map((p: any) => (
                    <td key={p.id} className="px-4 py-2.5">
                      {p.features[feature] ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Minus className="text-muted-foreground h-4 w-4" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t">
                <td className="px-4 py-2.5 font-medium">Limits</td>
                {matrix.plans.map((p: any) => (
                  <td key={p.id} className="px-4 py-2.5">
                    {Object.entries(p.limits || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="bg-muted mr-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                      >
                        {LIMIT_LABELS[k] || k}: {String(v)}
                      </span>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{p.displayName}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {p.planCode} • v{p.currentVersion ?? 1}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {p.status}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold">
                ₹{Number(p.price).toLocaleString('en-IN')}
                <span className="text-muted-foreground text-xs font-normal">
                  {' '}
                  / {p.billingCycle}
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {p.planType} • {p.trialPeriodDays > 0 ? `${p.trialPeriodDays}d trial` : 'no trial'}{' '}
                • {p.taxRate}% tax
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(p.features || {})
                  .filter(([, v]) => Boolean(v))
                  .slice(0, 6)
                  .map(([k]) => (
                    <span key={k} className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                      {FEATURE_LABELS[k] || k}
                    </span>
                  ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setVersionFor(p);
                    setForm({
                      price: String(p.price),
                      discountPercent: String(p.discountPercent || 0),
                      taxRate: String(p.taxRate || 0),
                    });
                  }}
                  className="border-input hover:bg-muted inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium"
                >
                  <Plus className="h-3 w-3" /> New version
                </button>
                <button
                  onClick={async () => {
                    await commercialService.setPlanStatus(
                      p.id,
                      p.status === 'active' ? 'inactive' : 'active',
                    );
                    void load();
                  }}
                  className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${p.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                >
                  {p.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              {p.versions && p.versions.length > 1 && (
                <div className="text-muted-foreground mt-2 border-t pt-2 text-[10px]">
                  {p.versions.length} versions — latest ₹
                  {Number(p.versions[0].price).toLocaleString('en-IN')} (v{p.versions[0].version})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <PlanFormModal
          title="Create Plan"
          form={form}
          setForm={setForm}
          onCancel={() => setShowCreate(false)}
          onSubmit={createPlan}
        />
      )}
      {versionFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setVersionFor(null)}
        >
          <div
            className="bg-card max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold">
              New version — {versionFor.displayName} (v{(versionFor.currentVersion ?? 1) + 1})
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              New customers use this pricing. Existing subscriptions keep their version.
            </p>
            <div className="mt-3 space-y-3">
              <Field label="Price (₹)">
                <input
                  className="input w-full"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Discount %">
                <input
                  className="input w-full"
                  value={form.discountPercent || ''}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                />
              </Field>
              <Field label="Tax Rate %">
                <input
                  className="input w-full"
                  value={form.taxRate || ''}
                  onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setVersionFor(null)}
                className="border-input hover:bg-muted rounded-lg border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => void createVersion()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                Create version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-[11px] font-medium">{label}</span>
      {children}
    </label>
  );
}

function PlanFormModal({
  title,
  form,
  setForm,
  onCancel,
  onSubmit,
}: {
  title: string;
  form: Record<string, any>;
  setForm: (f: Record<string, any>) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold">{title}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Plan Code *">
            <input
              className="input w-full"
              value={form.planCode || ''}
              onChange={(e) => setForm({ ...form, planCode: e.target.value })}
            />
          </Field>
          <Field label="Plan Name *">
            <input
              className="input w-full"
              value={form.planName || ''}
              onChange={(e) => setForm({ ...form, planName: e.target.value })}
            />
          </Field>
          <Field label="Display Name">
            <input
              className="input w-full"
              value={form.displayName || ''}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </Field>
          <Field label="Billing Cycle">
            <select
              className="input w-full"
              value={form.billingCycle || 'monthly'}
              onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Price (₹)">
            <input
              type="number"
              className="input w-full"
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field label="Tax Rate %">
            <input
              type="number"
              className="input w-full"
              value={form.taxRate || ''}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
            />
          </Field>
          <Field label="Trial (days)">
            <input
              type="number"
              className="input w-full"
              value={form.trialPeriodDays || ''}
              onChange={(e) => setForm({ ...form, trialPeriodDays: e.target.value })}
            />
          </Field>
          <Field label="Grace (days)">
            <input
              type="number"
              className="input w-full"
              value={form.gracePeriodDays || ''}
              onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })}
            />
          </Field>
          <Field label="Discount %">
            <input
              type="number"
              className="input w-full"
              value={form.discountPercent || ''}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-3">
          <span className="text-muted-foreground mb-1 block text-[11px] font-medium">Features</span>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(EMPTY_FEATURES).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-[11px]">
                <input
                  type="checkbox"
                  checked={Boolean(form[`feature_${key}`] ?? EMPTY_FEATURES[key])}
                  onChange={(e) => setForm({ ...form, [`feature_${key}`]: e.target.checked })}
                />
                {FEATURE_LABELS[key] || key}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
            Usage Limits (0 = unlimited)
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.keys(LIMIT_LABELS).map((key) => (
              <label key={key} className="flex items-center justify-between gap-1.5 text-[11px]">
                <span>{LIMIT_LABELS[key]}</span>
                <input
                  type="number"
                  className="input w-20"
                  value={form[`limit_${key}`] || ''}
                  onChange={(e) => setForm({ ...form, [`limit_${key}`]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="border-input hover:bg-muted rounded-lg border px-3 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-xs font-semibold"
          >
            Save plan
          </button>
        </div>
      </div>
    </div>
  );
}
