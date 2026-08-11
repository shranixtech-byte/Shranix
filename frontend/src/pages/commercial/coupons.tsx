import { Loader2, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

import { commercialService } from '@/services/commercial.service';

export function CommercialCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await commercialService.listCoupons();
      setCoupons(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (form.id) {
      await commercialService.updateCoupon(form.id, form);
    } else {
      await commercialService.createCoupon(form);
    }
    setShowForm(false);
    setForm({});
    void load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Coupons &amp; Promotions</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Discount codes with usage limits and plan applicability
          </p>
        </div>
        <button
          onClick={() => {
            setForm({});
            setShowForm(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
        >
          <Ticket className="h-4 w-4" /> New Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="text-primary h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="bg-card rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <p className="font-mono text-sm font-bold">{c.couponCode}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'expired' ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'}`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">{c.description || '—'}</p>
              <p className="mt-2 text-sm font-semibold">
                {c.discountType === 'percent'
                  ? `${c.discountValue}% off`
                  : `₹${Number(c.discountValue).toLocaleString('en-IN')} off`}
                {c.maxDiscount ? (
                  <span className="text-muted-foreground text-[10px] font-normal">
                    {' '}
                    (max ₹{Number(c.maxDiscount).toLocaleString('en-IN')})
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Valid {String(c.startDate || '—').slice(0, 10)} →{' '}
                {String(c.endDate || '—').slice(0, 10)}
                {c.usageLimit ? ` • limit ${c.usageLimit}` : ''}
              </p>
              <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px]">
                <span className="text-muted-foreground">Used {c.usedCount || 0}×</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setForm({ ...c, applicablePlanIds: JSON.parse(c.applicablePlanIds || '[]') });
                      setShowForm(true);
                    }}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      await commercialService.deleteCoupon(c.id);
                      void load();
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {coupons.length === 0 && (
            <p className="text-muted-foreground col-span-full py-10 text-center text-xs">
              No coupons created yet
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold">{form.id ? 'Edit Coupon' : 'New Coupon'}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Code *
                </span>
                <input
                  className="input w-full uppercase"
                  value={form.couponCode || ''}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Type
                </span>
                <select
                  className="input w-full"
                  value={form.discountType || 'percent'}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Value *
                </span>
                <input
                  type="number"
                  className="input w-full"
                  value={form.discountValue || ''}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Max discount
                </span>
                <input
                  type="number"
                  className="input w-full"
                  value={form.maxDiscount ?? ''}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Start date
                </span>
                <input
                  type="date"
                  className="input w-full"
                  value={String(form.startDate || '').slice(0, 10)}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  End date
                </span>
                <input
                  type="date"
                  className="input w-full"
                  value={String(form.endDate || '').slice(0, 10)}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Usage limit
                </span>
                <input
                  type="number"
                  className="input w-full"
                  value={form.usageLimit ?? ''}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Per-customer limit
                </span>
                <input
                  type="number"
                  className="input w-full"
                  value={form.perCustomerLimit ?? 1}
                  onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Min billing amount
                </span>
                <input
                  type="number"
                  className="input w-full"
                  value={form.minBillingAmount ?? 0}
                  onChange={(e) => setForm({ ...form, minBillingAmount: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Status
                </span>
                <select
                  className="input w-full"
                  value={form.status || 'active'}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="col-span-2 block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Applicable plan IDs (comma separated, empty = all)
                </span>
                <input
                  className="input w-full"
                  placeholder="plan-id-1, plan-id-2"
                  value={(form.applicablePlanIds || []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      applicablePlanIds: e.target.value
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="col-span-2 block">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium">
                  Description
                </span>
                <input
                  className="input w-full"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="border-input hover:bg-muted rounded-lg border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
