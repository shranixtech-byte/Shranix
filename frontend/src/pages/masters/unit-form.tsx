import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';

interface UnitForm {
  name: string;
  shortName: string;
  type: string;
}

const initialForm: UnitForm = { name: '', shortName: '', type: 'general' };

export function CreateUnitPage() {
  return <UnitFormPage />;
}

export function EditUnitPage() {
  return <UnitFormPage isEditing />;
}

function UnitFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<UnitForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<UnitForm>(`/units/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as UnitForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof UnitForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/units/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/units', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/units');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Unit Details',
      description: 'Measurement unit information',
      fields: (
        <>
          <FormInput label="Unit Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Kilogram" />
          <FormInput label="Short Name" required value={form.shortName} onChange={(e) => update('shortName', e.target.value)} placeholder="kg" />
          <FormSelect label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}
            options={[
              { label: 'General', value: 'general' }, { label: 'Weight', value: 'weight' },
              { label: 'Volume', value: 'volume' }, { label: 'Length', value: 'length' },
              { label: 'Area', value: 'area' }, { label: 'Count', value: 'count' },
            ]}
          />
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Unit"
      description="Define measurement units for items and commodities"
      module="Units"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/units')}
    />
  );
}
