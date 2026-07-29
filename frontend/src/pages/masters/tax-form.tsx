import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';

// ── Tax Group ──────────────────────────────────────────────

interface TaxGroupForm {
  name: string;
  description: string;
  type: string;
  isDefault: boolean;
}

const initialTaxGroup: TaxGroupForm = { name: '', description: '', type: 'gst', isDefault: false };

export function CreateTaxGroupPage() {
  return <TaxGroupFormPage />;
}

export function EditTaxGroupPage() {
  return <TaxGroupFormPage isEditing />;
}

function TaxGroupFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<TaxGroupForm>(initialTaxGroup);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<TaxGroupForm>(`/tax-groups/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialTaxGroup, ...data } as TaxGroupForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof TaxGroupForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/tax-groups/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/tax-groups', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/tax-groups');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Tax Group Details',
      description: 'Tax category information',
      fields: (
        <>
          <FormInput label="Tax Group Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter tax group name" />
          <FormSelect label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}
            options={[
              { label: 'GST', value: 'gst' }, { label: 'VAT', value: 'vat' }, { label: 'Custom', value: 'custom' },
            ]}
          />
          <FormTextarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tax group description..." />
        </>
      ),
    },
    {
      title: 'Settings',
      fields: (
        <>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => update('isDefault', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Default Group</p>
              <p className="text-xs text-slate-500">Set as the default tax group</p>
            </div>
          </label>
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Tax Group"
      description="Configure tax categories and groupings"
      module="Tax Groups"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/tax-groups')}
    />
  );
}

// ── GST Rate ──────────────────────────────────────────────

interface GstRateForm {
  name: string;
  description: string;
  rate: number;
  type: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  isDefault: boolean;
  hsnSacCode: string;
}

const initialGstRate: GstRateForm = {
  name: '', description: '', rate: 0, type: 'igst',
  igst: 0, cgst: 0, sgst: 0, cess: 0, isDefault: false, hsnSacCode: '',
};

export function CreateGstRatePage() {
  return <GstRateFormPage />;
}

export function EditGstRatePage() {
  return <GstRateFormPage isEditing />;
}

function GstRateFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<GstRateForm>(initialGstRate);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<GstRateForm>(`/gst-rates/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialGstRate, ...data } as GstRateForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof GstRateForm, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/gst-rates/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/gst-rates', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/gst-rates');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Rate Information',
      description: 'GST rate identification',
      fields: (
        <>
          <FormInput label="Rate Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="GST 18%" />
          <FormInput label="Rate (%)" required type="number" value={String(form.rate)} onChange={(e) => update('rate', Number(e.target.value))} placeholder="18" />
          <FormSelect label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}
            options={[
              { label: 'IGST', value: 'igst' }, { label: 'CGST+SGST', value: 'cgst_sgst' }, { label: 'Cess', value: 'cess' },
            ]}
          />
          <FormInput label="HSN/SAC Code" value={form.hsnSacCode} onChange={(e) => update('hsnSacCode', e.target.value)} placeholder="HSN code" />
        </>
      ),
    },
    {
      title: 'Tax Breakdown',
      description: 'Component-wise tax rates',
      fields: (
        <>
          <FormInput label="IGST %" type="number" value={String(form.igst)} onChange={(e) => update('igst', Number(e.target.value))} placeholder="18" />
          <FormInput label="CGST %" type="number" value={String(form.cgst)} onChange={(e) => update('cgst', Number(e.target.value))} placeholder="9" />
          <FormInput label="SGST %" type="number" value={String(form.sgst)} onChange={(e) => update('sgst', Number(e.target.value))} placeholder="9" />
          <FormInput label="Cess %" type="number" value={String(form.cess)} onChange={(e) => update('cess', Number(e.target.value))} placeholder="0" />
        </>
      ),
    },
    {
      title: 'Description & Settings',
      fields: (
        <>
          <FormTextarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Rate description..." />
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => update('isDefault', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Default Rate</p>
              <p className="text-xs text-slate-500">Set as the default GST rate</p>
            </div>
          </label>
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="GST Rate"
      description="Configure GST tax slabs and rates for compliance"
      module="GST Rates"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/gst-rates')}
    />
  );
}
