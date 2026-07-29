import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';

interface CompanyForm {
  name: string;
  alias: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  cin: string;
  website: string;
  isHeadOffice: boolean;
  financialYearStart: string;
  currency: string;
}

const initialForm: CompanyForm = {
  name: '', alias: '', address: '', city: '', state: '', pincode: '',
  phone: '', email: '', gstin: '', pan: '', cin: '', website: '',
  isHeadOffice: false, financialYearStart: '', currency: 'INR',
};

export function CreateCompanyPage() {
  return <CompanyFormPage />;
}

export function EditCompanyPage() {
  return <CompanyFormPage isEditing />;
}

function CompanyFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CompanyForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<CompanyForm>(`/companies/${id}`)
        .then((data) => {
          if (data && typeof data === 'object') {
            setForm({ ...initialForm, ...data } as CompanyForm);
          }
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof CompanyForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/companies/${id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/companies', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      navigate('/companies');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'General Information',
      description: 'Basic company identification details',
      fields: (
        <>
          <FormInput label="Company Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter company name" />
          <FormInput label="Alias" value={form.alias} onChange={(e) => update('alias', e.target.value)} placeholder="Short name / alias" />
          <FormInput label="Website" type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://example.com" />
          <FormInput label="Currency" value={form.currency} onChange={(e) => update('currency', e.target.value)} placeholder="INR" />
        </>
      ),
    },
    {
      title: 'Tax & Compliance',
      description: 'GST, PAN and other registration details',
      fields: (
        <>
          <FormInput label="GSTIN" value={form.gstin} onChange={(e) => update('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
          <FormInput label="PAN" value={form.pan} onChange={(e) => update('pan', e.target.value)} placeholder="AAAAA0000A" />
          <FormInput label="CIN" value={form.cin} onChange={(e) => update('cin', e.target.value)} placeholder="U12345MH2020PTC123456" />
          <FormSelect label="FY Start Month" value={form.financialYearStart} onChange={(e) => update('financialYearStart', e.target.value)} placeholder="Select month"
            options={[
              { label: 'April', value: 'april' }, { label: 'January', value: 'january' },
              { label: 'July', value: 'july' }, { label: 'October', value: 'october' },
            ]}
          />
        </>
      ),
    },
    {
      title: 'Address',
      description: 'Registered office address',
      className: 'md:col-span-2',
      fields: (
        <>
          <FormTextarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, building, area..." />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
            <FormInput label="State" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" />
            <FormInput label="Pincode" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} placeholder="PIN code" />
          </div>
        </>
      ),
    },
    {
      title: 'Contact',
      description: 'Primary contact details',
      fields: (
        <>
          <FormInput label="Phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91-9876543210" />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="company@example.com" />
        </>
      ),
    },
    {
      title: 'Settings',
      description: 'Additional preferences',
      fields: (
        <>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
            <input
              type="checkbox"
              checked={form.isHeadOffice}
              onChange={(e) => update('isHeadOffice', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Head Office</p>
              <p className="text-xs text-slate-500">Mark as the primary/head office location</p>
            </div>
          </label>
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Company"
      description="Manage business entity and company profile"
      module="Companies"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/companies')}
    />
  );
}
