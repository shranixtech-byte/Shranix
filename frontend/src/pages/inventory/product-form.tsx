import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { CreateEditPage, type FormSection } from '@/components/ui/CreateEditPage';
import { FormInput } from '@/components/ui/FormInput';
import { FormTextarea } from '@/components/ui/FormTextarea';
import { FormSelect } from '@/components/ui/FormSelect';

interface ProductForm {
  name: string;
  sku: string;
  productCode: string;
  hsnCode: string;
  barcode: string;
  qrCode: string;
  type: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  unitId: string;
  packSize: string;
  manufacturer: string;
  supplierId: string;
  gstRateId: string;
  purchaseRate: number;
  salesRate: number;
  mrp: number;
  openingStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  hasBatch: boolean;
  hasSerial: boolean;
  hasExpiry: boolean;
  notes: string;
}

const initialForm: ProductForm = {
  name: '', sku: '', productCode: '', hsnCode: '', barcode: '', qrCode: '',
  type: 'product', description: '', categoryId: '', subCategoryId: '', brandId: '',
  unitId: '', packSize: '', manufacturer: '', supplierId: '', gstRateId: '',
  purchaseRate: 0, salesRate: 0, mrp: 0,
  openingStock: 0, minStock: 0, maxStock: 0, reorderLevel: 0,
  hasBatch: false, hasSerial: false, hasExpiry: false, notes: '',
};

export function CreateProductPage() {
  return <ProductFormPage />;
}

export function EditProductPage() {
  return <ProductFormPage isEditing />;
}

function ProductFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      apiRequest<ProductForm>(`/inventory/items/${id}`)
        .then((data) => { if (data && typeof data === 'object') setForm({ ...initialForm, ...data } as ProductForm); })
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [isEditing, id]);

  const update = useCallback((field: keyof ProductForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await apiRequest(`/inventory/items/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiRequest('/inventory/items', { method: 'POST', body: JSON.stringify(form) });
      }
      navigate('/inventory/products');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditing, id, navigate]);

  const sections: FormSection[] = [
    {
      title: 'Basic Information',
      description: 'Product identification and naming',
      fields: (
        <>
          <FormInput label="Product Name" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter product name" />
          <FormInput label="SKU Code" required value={form.sku} onChange={(e) => update('sku', e.target.value)} placeholder="SKU-001" />
          <FormInput label="Product Code" value={form.productCode} onChange={(e) => update('productCode', e.target.value)} placeholder="Optional code" />
          <FormSelect label="Type" value={form.type} onChange={(e) => update('type', e.target.value)}
            options={[
              { label: 'Product', value: 'product' }, { label: 'Service', value: 'service' },
              { label: 'Raw Material', value: 'raw_material' }, { label: 'Packaging', value: 'packaging' },
              { label: 'Consumable', value: 'consumable' }, { label: 'Asset', value: 'asset' },
            ]}
          />
        </>
      ),
    },
    {
      title: 'Classification',
      description: 'Category, brand and unit',
      fields: (
        <>
          <FormInput label="Category ID" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} placeholder="Category" />
          <FormInput label="Sub Category ID" value={form.subCategoryId} onChange={(e) => update('subCategoryId', e.target.value)} placeholder="Sub category" />
          <FormInput label="Brand ID" value={form.brandId} onChange={(e) => update('brandId', e.target.value)} placeholder="Brand" />
          <FormInput label="Unit ID" value={form.unitId} onChange={(e) => update('unitId', e.target.value)} placeholder="Unit" />
        </>
      ),
    },
    {
      title: 'Pricing',
      description: 'Product pricing information',
      fields: (
        <>
          <FormInput label="Purchase Rate (₹)" type="number" value={String(form.purchaseRate)} onChange={(e) => update('purchaseRate', Number(e.target.value))} placeholder="0.00" />
          <FormInput label="Sales Rate (₹)" type="number" value={String(form.salesRate)} onChange={(e) => update('salesRate', Number(e.target.value))} placeholder="0.00" />
          <FormInput label="MRP (₹)" type="number" value={String(form.mrp)} onChange={(e) => update('mrp', Number(e.target.value))} placeholder="0.00" />
        </>
      ),
    },
    {
      title: 'Tax & Compliance',
      description: 'GST and HSN details',
      fields: (
        <>
          <FormInput label="HSN Code" value={form.hsnCode} onChange={(e) => update('hsnCode', e.target.value)} placeholder="HSN code" />
          <FormInput label="GST Rate ID" value={form.gstRateId} onChange={(e) => update('gstRateId', e.target.value)} placeholder="GST rate" />
          <FormInput label="Barcode" value={form.barcode} onChange={(e) => update('barcode', e.target.value)} placeholder="Barcode" />
          <FormInput label="QR Code" value={form.qrCode} onChange={(e) => update('qrCode', e.target.value)} placeholder="QR code" />
        </>
      ),
    },
    {
      title: 'Stock Settings',
      description: 'Inventory management settings',
      fields: (
        <>
          <FormInput label="Opening Stock" type="number" value={String(form.openingStock)} onChange={(e) => update('openingStock', Number(e.target.value))} placeholder="0" />
          <FormInput label="Min Stock" type="number" value={String(form.minStock)} onChange={(e) => update('minStock', Number(e.target.value))} placeholder="0" />
          <FormInput label="Max Stock" type="number" value={String(form.maxStock)} onChange={(e) => update('maxStock', Number(e.target.value))} placeholder="0" />
          <FormInput label="Reorder Level" type="number" value={String(form.reorderLevel)} onChange={(e) => update('reorderLevel', Number(e.target.value))} placeholder="0" />
        </>
      ),
    },
    {
      title: 'Tracking',
      description: 'Batch, serial and expiry tracking',
      fields: (
        <>
          {[
            { key: 'hasBatch' as const, label: 'Batch Tracking', desc: 'Track inventory by batch numbers' },
            { key: 'hasSerial' as const, label: 'Serial Tracking', desc: 'Track individual serial numbers' },
            { key: 'hasExpiry' as const, label: 'Expiry Tracking', desc: 'Track manufacturing and expiry dates' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800">
              <input type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </label>
          ))}
        </>
      ),
    },
    {
      title: 'Additional Info',
      description: 'Manufacturer, supplier and notes',
      className: 'md:col-span-2',
      fields: (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput label="Pack Size" value={form.packSize} onChange={(e) => update('packSize', e.target.value)} placeholder="10 kg" />
            <FormInput label="Manufacturer" value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} placeholder="Manufacturer" />
            <FormInput label="Supplier ID" value={form.supplierId} onChange={(e) => update('supplierId', e.target.value)} placeholder="Supplier" />
          </div>
          <FormTextarea label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Product description..." />
          <FormTextarea label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Additional notes..." />
        </>
      ),
    },
  ];

  return (
    <CreateEditPage
      title="Product"
      description="Enterprise product master with stock, pricing, GST, batch/serial tracking"
      module="Inventory"
      listPath="/inventory/products"
      sections={sections}
      isEditing={isEditing}
      loading={loading}
      submitting={submitting}
      error={error}
      onSave={handleSave}
      onCancel={() => navigate('/inventory/products')}
    />
  );
}
