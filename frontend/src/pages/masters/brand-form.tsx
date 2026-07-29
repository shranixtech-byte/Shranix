import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';

interface BrandForm {
  name: string;
  description: string;
}

const initialForm: BrandForm = { name: '', description: '' };

export function CreateBrandPage() {
  return <BrandFormPage />;
}

export function EditBrandPage() {
  return <BrandFormPage isEditing />;
}

function BrandFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<BrandForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<BrandForm>(`/brands/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as BrandForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof BrandForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/brands', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/brands');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Brand Details',
      description: 'Product brand information',
      fields: (
        <>
          <FormInput label="Brand Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter brand name" />
          <FormTextarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brand description..." />
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Brand"
      description="Manage product brands and manufacturers"
      module="Brands"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/brands')}
    />
  );
}
