import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  createLead,
  getLead,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  STATUS_LABELS,
  updateLead,
  type Lead,
} from '@/services/crm.service';

const inputCls =
  'w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary/50';

export function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Lead>>({
    leadName: '',
    source: 'walk-in',
    priority: 'medium',
    status: 'new',
    leadType: 'individual',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      void getLead(id).then((lead) => {
        // Read-only collections are deliberately excluded from the editable form payload.
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const {
          activities: _a,
          followUps: _f,
          tasks: _t,
          notes: _n,
          opportunities: _o,
          ...rest
        } = lead as any;
        /* eslint-enable @typescript-eslint/no-unused-vars */
        setForm(rest);
      });
    }
  }, [id]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.activities;
      if (isEdit && id) {
        await updateLead(id, payload);
      } else {
        await createLead(payload);
      }
      navigate('/crm/leads');
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-card rounded-lg border p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-muted-foreground mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-card hover:border-primary/40 rounded-lg border p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? `Edit ${form.leadNumber || 'Lead'}` : 'New Lead'}
            </h1>
            <p className="text-muted-foreground text-sm">
              Capture lead details and assign to a salesperson
            </p>
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Lead'}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Section title="Contact Information">
          <Field label="Lead / Person Name *">
            <input
              required
              className={inputCls}
              value={String(form.leadName || '')}
              onChange={(e) => set('leadName', e.target.value)}
            />
          </Field>
          <Field label="Company / Firm">
            <input
              className={inputCls}
              value={String(form.companyName || '')}
              onChange={(e) => set('companyName', e.target.value)}
            />
          </Field>
          <Field label="Contact Person">
            <input
              className={inputCls}
              value={String(form.contactPerson || '')}
              onChange={(e) => set('contactPerson', e.target.value)}
            />
          </Field>
          <Field label="Mobile">
            <input
              className={inputCls}
              value={String(form.mobile || '')}
              onChange={(e) => set('mobile', e.target.value)}
            />
          </Field>
          <Field label="Alternate Mobile">
            <input
              className={inputCls}
              value={String(form.altMobile || '')}
              onChange={(e) => set('altMobile', e.target.value)}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              className={inputCls}
              value={String(form.whatsapp || '')}
              onChange={(e) => set('whatsapp', e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={String(form.email || '')}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Village">
            <input
              className={inputCls}
              value={String(form.village || '')}
              onChange={(e) => set('village', e.target.value)}
            />
          </Field>
          <Field label="Taluka">
            <input
              className={inputCls}
              value={String(form.taluka || '')}
              onChange={(e) => set('taluka', e.target.value)}
            />
          </Field>
          <Field label="District">
            <input
              className={inputCls}
              value={String(form.district || '')}
              onChange={(e) => set('district', e.target.value)}
            />
          </Field>
          <Field label="State">
            <input
              className={inputCls}
              value={String(form.state || '')}
              onChange={(e) => set('state', e.target.value)}
            />
          </Field>
          <Field label="Pincode">
            <input
              className={inputCls}
              value={String(form.pincode || '')}
              onChange={(e) => set('pincode', e.target.value)}
            />
          </Field>
          <Field label="Address">
            <textarea
              rows={2}
              className={inputCls}
              value={String(form.address || '')}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Opportunity Details">
          <Field label="Source">
            <select
              className={inputCls}
              value={String(form.source)}
              onChange={(e) => set('source', e.target.value)}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lead Type">
            <select
              className={inputCls}
              value={String(form.leadType || 'individual')}
              onChange={(e) => set('leadType', e.target.value)}
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </Field>
          <Field label="Priority">
            <select
              className={inputCls}
              value={String(form.priority)}
              onChange={(e) => set('priority', e.target.value)}
            >
              {LEAD_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={String(form.status)}
              onChange={(e) => set('status', e.target.value)}
            >
              {LEAD_STATUSES.filter((s) => s !== 'converted').map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] || s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Salesperson ID">
            <input
              className={inputCls}
              value={String(form.assignedTo || '')}
              onChange={(e) => set('assignedTo', e.target.value)}
            />
          </Field>
          <Field label="Expected Value (₹)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={Number(form.expectedValue || 0)}
              onChange={(e) => set('expectedValue', Number(e.target.value))}
            />
          </Field>
          <Field label="Expected Close Date">
            <input
              type="date"
              className={inputCls}
              value={String(form.expectedCloseDate || '')}
              onChange={(e) => set('expectedCloseDate', e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              className={inputCls}
              value={String(form.notes || '')}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </Section>
      </form>
    </div>
  );
}
