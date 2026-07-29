import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';

interface FYForm {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

const initialForm: FYForm = { name: '', startDate: '', endDate: '', isActive: true, isClosed: false };

export function CreateFinancialYearPage() {
  return <FYFormPage />;
}

export function EditFinancialYearPage() {
  return <FYFormPage isEditing />;
}

function FYFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FYForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<FYForm>(`/financial-years/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as FYForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof FYForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/financial-years/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/financial-years', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/financial-years');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Financial Year Details',
      description: 'Define the financial period',
      fields: (
        <>
          <FormInput label="FY Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="2025-2026" />
          <FormInput label="Start Date" required type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          <FormInput label="End Date" required type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
        </>
      ),
    },
    {
      title: 'Status',
      description: 'Financial year status settings',
      fields: (
        <>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Active</p>
              <p className="text-xs text-slate-500">Set as the active financial year</p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <input type="checkbox" checked={form.isClosed} onChange={(e) => update('isClosed', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Closed</p>
              <p className="text-xs text-slate-500">Mark as closed (no further entries allowed)</p>
            </div>
          </label>
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Financial Year"
      description="Configure financial period for accounting cycles"
      module="Financial Years"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/financial-years')}
    />
  );
}
