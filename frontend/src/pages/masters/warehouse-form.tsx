import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormSelect } from '@/components/ui/FormSelect';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { apiRequest } from '@/services/api-client';

interface WarehouseForm {
  name: string;
  code: string;
  warehouseType: string;
  address: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  gstin: string;
  remarks: string;
  isMain: boolean;
}

const initialForm: WarehouseForm = {
  name: '',
  code: '',
  warehouseType: 'storage',
  address: '',
  state: '',
  district: '',
  city: '',
  pincode: '',
  contactPerson: '',
  phone: '',
  mobile: '',
  email: '',
  gstin: '',
  remarks: '',
  isMain: false,
};

export function CreateWarehousePage() {
  return <WarehouseFormPage />;
}

export function EditWarehousePage() {
  return <WarehouseFormPage isEditing />;
}

function WarehouseFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<WarehouseForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<WarehouseForm>(`/warehouses/${id}`)
        .then((data) => {
          if (data && typeof data === 'object') {
            setForm({ ...initialForm, ...data } as WarehouseForm);
          }
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof WarehouseForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/warehouses', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/warehouses');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'General Information',
      description: 'Warehouse identification',
      fields: (
        <>
          <FormInput
            label="Warehouse Name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Enter warehouse name"
          />
          <FormInput
            label="Warehouse Code"
            required
            value={form.code}
            onChange={(e) => update('code', e.target.value)}
            placeholder="WH-001"
          />
          <FormSelect
            label="Warehouse Type"
            value={form.warehouseType}
            onChange={(e) => update('warehouseType', e.target.value)}
            options={[
              { label: 'Storage', value: 'storage' },
              { label: 'Distribution', value: 'distribution' },
              { label: 'Transit', value: 'transit' },
            ]}
          />
        </>
      ),
    },
    {
      title: 'Contact Person',
      description: 'Warehouse in-charge details',
      fields: (
        <>
          <FormInput
            label="Contact Person"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Full name"
          />
          <FormInput
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="Landline"
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
            placeholder="warehouse@example.com"
          />
        </>
      ),
    },
    {
      title: 'Address',
      description: 'Warehouse location',
      className: 'md:col-span-2',
      fields: (
        <>
          <FormTextarea
            label="Address"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Street, building, area..."
          />
          <div className="grid gap-4 sm:grid-cols-3">
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Pincode"
              value={form.pincode}
              onChange={(e) => update('pincode', e.target.value)}
              placeholder="PIN code"
            />
            <FormInput
              label="GST Number"
              value={form.gstin}
              onChange={(e) => update('gstin', e.target.value)}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
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
              checked={form.isMain}
              onChange={(e) => update('isMain', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Main Warehouse
              </p>
              <p className="text-xs text-slate-500">Mark as the primary warehouse</p>
            </div>
          </label>
          <FormTextarea
            label="Remarks"
            value={form.remarks}
            onChange={(e) => update('remarks', e.target.value)}
            placeholder="Additional notes..."
          />
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Warehouse"
      description="Manage storage location and distribution center"
      module="Warehouses"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/warehouses')}
    />
  );
}
