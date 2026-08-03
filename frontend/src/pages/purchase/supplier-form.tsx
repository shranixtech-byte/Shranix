import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { apiRequest } from '@/services/api-client';

interface SupplierForm {
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
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  status: string;
  remarks: string;
}

const initialForm: SupplierForm = {
  code: '',
  name: '',
  gstin: '',
  pan: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  district: '',
  city: '',
  pin: '',
  creditLimit: 0,
  creditDays: 0,
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  bankBranch: '',
  status: 'active',
  remarks: '',
};

export function CreateSupplierPage() {
  return <SupplierFormPage />;
}

export function EditSupplierPage() {
  return <SupplierFormPage isEditing />;
}

function SupplierFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<SupplierForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<SupplierForm>(`/suppliers/${id}`)
        .then((data) => {
          if (data && typeof data === 'object') {
            setForm({ ...initialForm, ...data } as SupplierForm);
          }
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof SupplierForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/suppliers');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'General Information',
      description: 'Basic supplier details',
      fields: (
        <>
          <FormInput
            label="Supplier Name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Enter supplier name"
          />
          <FormInput
            label="Supplier Code"
            value={form.code}
            onChange={(e) => update('code', e.target.value)}
            placeholder="SUP-001"
          />
          <FormInput
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Person name"
          />
          <FormInput
            label="Mobile"
            type="tel"
            value={form.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            placeholder="+91-9876543210"
          />
          <FormInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="supplier@example.com"
          />
        </>
      ),
    },
    {
      title: 'Tax Information',
      description: 'GST, PAN and compliance',
      fields: (
        <>
          <FormInput
            label="GSTIN"
            value={form.gstin}
            onChange={(e) => update('gstin', e.target.value)}
            placeholder="22AAAAA0000A1Z5"
          />
          <FormInput
            label="PAN"
            value={form.pan}
            onChange={(e) => update('pan', e.target.value)}
            placeholder="AAAAA0000A"
          />
          <FormSelect
            label="Status"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Blocked', value: 'blocked' },
            ]}
          />
        </>
      ),
    },
    {
      title: 'Address',
      description: 'Supplier location',
      className: 'md:col-span-2',
      fields: (
        <>
          <FormTextarea
            label="Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Street, building, area..."
          />
          <div className="grid gap-4 sm:grid-cols-4">
            <FormInput
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="City"
            />
            <FormInput
              label="District"
              value={form.district}
              onChange={(e) => update('district', e.target.value)}
              placeholder="District"
            />
            <FormInput
              label="State"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
              placeholder="State"
            />
            <FormInput
              label="PIN Code"
              value={form.pin}
              onChange={(e) => update('pin', e.target.value)}
              placeholder="PIN"
            />
          </div>
        </>
      ),
    },
    {
      title: 'Credit & Payments',
      description: 'Financial terms',
      fields: (
        <>
          <FormInput
            label="Credit Limit"
            type="number"
            value={String(form.creditLimit)}
            onChange={(e) => update('creditLimit', Number(e.target.value))}
            placeholder="0"
          />
          <FormInput
            label="Credit Days"
            type="number"
            value={String(form.creditDays)}
            onChange={(e) => update('creditDays', Number(e.target.value))}
            placeholder="30"
          />
        </>
      ),
    },
    {
      title: 'Bank Details',
      description: 'Banking information',
      className: 'md:col-span-2',
      fields: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Bank Name"
              value={form.bankName}
              onChange={(e) => update('bankName', e.target.value)}
              placeholder="Bank name"
            />
            <FormInput
              label="Account Number"
              value={form.bankAccountNo}
              onChange={(e) => update('bankAccountNo', e.target.value)}
              placeholder="Account number"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="IFSC Code"
              value={form.bankIfsc}
              onChange={(e) => update('bankIfsc', e.target.value)}
              placeholder="IFSC code"
            />
            <FormInput
              label="Bank Branch"
              value={form.bankBranch}
              onChange={(e) => update('bankBranch', e.target.value)}
              placeholder="Branch name"
            />
          </div>
        </>
      ),
    },
    {
      title: 'Remarks',
      fields: (
        <FormTextarea
          label="Remarks"
          value={form.remarks}
          onChange={(e) => update('remarks', e.target.value)}
          placeholder="Additional notes..."
        />
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Supplier"
      description="Manage supplier master with GST, banking, and credit information"
      module="Suppliers"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/suppliers')}
    />
  );
}
