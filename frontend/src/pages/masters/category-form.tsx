import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';

interface CategoryForm {
  name: string;
  description: string;
  type: string;
  sortOrder: number;
}

const initialForm: CategoryForm = { name: '', description: '', type: 'item', sortOrder: 0 };

export function CreateCategoryPage() {
  return <CategoryFormPage />;
}

export function EditCategoryPage() {
  return <CategoryFormPage isEditing />;
}

function CategoryFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<CategoryForm>(`/categories/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as CategoryForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof CategoryForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/categories', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/categories');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Category Information',
      description: 'Category identification and type',
      fields: (
        <>
          <FormInput label="Category Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter category name" />
          <FormSelect label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}
            options={[
              { label: 'Item', value: 'item' }, { label: 'Party', value: 'party' },
              { label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' },
            ]}
          />
          <FormInput label="Sort Order" type="number" value={String(form.sortOrder)} onChange={(e) => update('sortOrder', Number(e.target.value))} placeholder="0" />
        </>
      ),
    },
    {
      title: 'Description',
      description: 'Additional details',
      fields: (
        <>
          <FormTextarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Category description..." />
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Category"
      description="Organize items, parties, and transactions"
      module="Categories"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/categories')}
    />
  );
}
