import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { apiRequest } from '@/services/api-client';

interface BranchForm {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

const initialForm: BranchForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  email: '',
};

export function CreateBranchPage() {
  return <BranchFormPage />;
}

export function EditBranchPage() {
  return <BranchFormPage isEditing />;
}

function BranchFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<BranchForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<BranchForm>(`/branches/${id}`)
        .then((data) => {
          if (data && typeof data === 'object') {
            setForm({ ...initialForm, ...data } as BranchForm);
          }
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof BranchForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/branches', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/branches');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Branch Details',
      description: 'Basic branch identification',
      fields: (
        <>
          <FormInput
            label="Branch Name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Enter branch name"
          />
          <FormInput
            label="Branch Code"
            required
            value={form.code}
            onChange={(e) => update('code', e.target.value)}
            placeholder="BR-001"
          />
        </>
      ),
    },
    {
      title: 'Contact',
      description: 'Primary contact details',
      fields: (
        <>
          <FormInput
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+91-9876543210"
          />
          <FormInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="branch@example.com"
          />
        </>
      ),
    },
    {
      title: 'Address',
      description: 'Branch location',
      className: 'md:col-span-2',
      fields: (
        <>
          <FormTextarea
            label="Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Street, building, area..."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="City"
            />
            <FormInput
              label="State"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="State"
            />
          </div>
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Branch"
      description="Manage branch office and regional location"
      module="Branches"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/branches')}
    />
  );
}
