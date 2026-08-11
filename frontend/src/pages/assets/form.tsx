import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { assetApi, assetCategoryApi, type Asset } from '@/services/asset-expense.service';

export function AssetFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [categories, setCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState('');
  const [form, setForm] = useState<Partial<Asset>>({
    assetName: '',
    assetType: 'fixed_asset',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: 0,
    additionalCost: 0,
    usefulLifeYears: 5,
    depreciationMethod: 'straight_line',
    depreciationRate: 10,
    salvageValue: 0,
    warrantyStart: '',
    warrantyEnd: '',
    warrantyProvider: '',
    status: 'available',
    condition: 'good',
    notes: '',
  });

  useEffect(() => {
    void (async () => {
      try {
        const cats = await assetCategoryApi.list();
        setCategories(cats || []);
        if (id) {
          const a = await assetApi.get(id);
          // These read-only collections are deliberately excluded from the form payload.
          /* eslint-disable @typescript-eslint/no-unused-vars */
          const { history, allocations, maintenance, depreciation, transfers, disposals, ...rest } =
            a as any;
          /* eslint-enable @typescript-eslint/no-unused-vars */
          setForm({ ...rest });
        } else {
          const { nextCode: nc } = await assetApi.nextCode();
          setNextCode(nc);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [id]);

  const set = (k: keyof Asset, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!editing) {
        payload.assetCode = nextCode;
      }
      if (editing) {
        await assetApi.update(id!, payload);
      } else {
        await assetApi.create(payload);
      }
      navigate('/assets');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to="/assets"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assets
      </Link>
      <h1 className="text-xl font-bold">{editing ? 'Edit asset' : 'New asset'}</h1>
      {!editing && (
        <p className="text-muted-foreground mt-0.5 text-xs">
          Code will be <span className="font-mono">{nextCode}</span>
        </p>
      )}

      <div className="bg-card mt-5 rounded-xl border p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Asset name *">
            <input
              value={form.assetName || ''}
              onChange={(e) => set('assetName', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.categoryId || ''}
              onChange={(e) => set('categoryId', e.target.value || null)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Asset type">
            <select
              value={form.assetType || 'fixed_asset'}
              onChange={(e) => set('assetType', e.target.value)}
              className={inputCls}
            >
              {[
                'fixed_asset',
                'it_asset',
                'vehicle',
                'equipment',
                'furniture',
                'machinery',
                'tool',
                'other',
              ].map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Serial number">
            <input
              value={form.serialNumber || ''}
              onChange={(e) => set('serialNumber', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Brand">
            <input
              value={form.brand || ''}
              onChange={(e) => set('brand', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Model">
            <input
              value={form.model || ''}
              onChange={(e) => set('model', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Purchase date">
            <input
              type="date"
              value={form.purchaseDate || ''}
              onChange={(e) => set('purchaseDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Purchase cost (₹)">
            <input
              type="number"
              min={0}
              value={form.purchaseCost || 0}
              onChange={(e) => set('purchaseCost', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Additional cost (₹)">
            <input
              type="number"
              min={0}
              value={form.additionalCost || 0}
              onChange={(e) => set('additionalCost', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Depreciation method">
            <select
              value={form.depreciationMethod || 'straight_line'}
              onChange={(e) => set('depreciationMethod', e.target.value)}
              className={inputCls}
            >
              <option value="straight_line">Straight line</option>
              <option value="written_down_value">Written down value</option>
            </select>
          </Field>
          <Field label="Useful life (years)">
            <input
              type="number"
              min={1}
              value={form.usefulLifeYears || ''}
              onChange={(e) =>
                set('usefulLifeYears', e.target.value ? Number(e.target.value) : null)
              }
              className={inputCls}
            />
          </Field>
          <Field label="Depreciation rate (% p.a.)">
            <input
              type="number"
              min={0}
              value={form.depreciationRate || 0}
              onChange={(e) => set('depreciationRate', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Warranty start">
            <input
              type="date"
              value={form.warrantyStart || ''}
              onChange={(e) => set('warrantyStart', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Warranty end">
            <input
              type="date"
              value={form.warrantyEnd || ''}
              onChange={(e) => set('warrantyEnd', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Warranty provider">
            <input
              value={form.warrantyProvider || ''}
              onChange={(e) => set('warrantyProvider', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status || 'available'}
              onChange={(e) => set('status', e.target.value)}
              className={inputCls}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="under_maintenance">Under maintenance</option>
            </select>
          </Field>
          <Field label="Condition">
            <select
              value={form.condition || 'good'}
              onChange={(e) => set('condition', e.target.value)}
              className={inputCls}
            >
              {['new', 'good', 'fair', 'damaged', 'under_repair', 'unserviceable'].map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                value={form.notes || ''}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Link
            to="/assets"
            className="border-border text-muted-foreground hover:border-primary/40 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => void save()}
            disabled={saving || !form.assetName}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {editing ? 'Save changes' : 'Create asset'}
          </button>
        </div>
      </div>
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

const inputCls =
  'border-border bg-card w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-primary/50';
