import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';

interface CustomerForm {
  code: string;
  name: string;
  gstin: string;
  pan: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pin: string;
  creditLimit: number;
  creditDays: number;
  status: string;
  remarks: string;
}

const initialForm: CustomerForm = {
  code: '', name: '', gstin: '', pan: '', contactPerson: '', mobile: '', email: '',
  address: '', state: '', district: '', city: '', pin: '',
  creditLimit: 0, creditDays: 0,
  status: 'active', remarks: '',
};

export function CreateCustomerPage() {
  return <CustomerFormPage />;
}

export function EditCustomerPage() {
  return <CustomerFormPage isEditing />;
}

function CustomerFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      // Use /customers if available, fallback to sales endpoint
      apiRequest<CustomerForm>(`/customers/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as CustomerForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof CustomerForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/customers', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/customers');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'General Information',
      description: 'Basic customer details',
      fields: (
        <>
          <FormInput label="Customer Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter customer name" />
          <FormInput label="Customer Code" value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="CUS-001" />
          <FormInput label="Contact Person" value={form.contactPerson} onChange={(e) => update('contactPerson', e.target.value)} placeholder="Person name" />
          <FormInput label="Mobile" type="tel" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} placeholder="+91-9876543210" />
          <FormInput label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="customer@example.com" />
        </>
      ),
    },
    {
      title: 'Tax Information',
      description: 'GST, PAN and compliance',
      fields: (
        <>
          <FormInput label="GSTIN" value={form.gstin} onChange={(e) => update('gstin', e.target.value)} placeholder="22AAAAA0000A1Z5" />
          <FormInput label="PAN" value={form.pan} onChange={(e) => update('pan', e.target.value)} placeholder="AAAAA0000A" />
          <FormSelect label="Status" value={form.status} onChange={(e) => update('status', e.target.value)}
            options={[
              { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Blocked', value: 'blocked' },
            ]}
          />
        </>
      ),
    },
    {
      title: 'Address',
      description: 'Customer location',
      className: 'md:col-span-2',
      fields: (
        <>
          <FormTextarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, building, area..." />
          <div className="grid gap-4 sm:grid-cols-4">
            <FormInput label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
            <FormInput label="District" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="District" />
            <FormInput label="State" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" />
            <FormInput label="PIN Code" value={form.pin} onChange={(e) => update('pin', e.target.value)} placeholder="PIN" />
          </div>
        </>
      ),
    },
    {
      title: 'Credit & Payments',
      description: 'Financial terms',
      fields: (
        <>
          <FormInput label="Credit Limit" type="number" value={String(form.creditLimit)} onChange={(e) => update('creditLimit', Number(e.target.value))} placeholder="0" />
          <FormInput label="Credit Days" type="number" value={String(form.creditDays)} onChange={(e) => update('creditDays', Number(e.target.value))} placeholder="30" />
        </>
      ),
    },
    {
      title: 'Remarks',
      fields: (
        <FormTextarea label="Remarks" value={form.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Additional notes..." />
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Customer"
      description="Manage customer master with GST and credit information"
      module="Customers"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/customers')}
    />
  );
}
