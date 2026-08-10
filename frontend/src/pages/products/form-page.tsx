import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  Percent,
  Save,
  Scale,
  StickyNote,
  Truck,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Field, SelectInput, TabBar, TextAreaInput, TextInput } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import {
  createProduct,
  getFormMasters,
  getProduct,
  PRODUCT_TYPE_OPTIONS,
  updateProduct,
  type FormMasters,
  type ProductDocument,
  type ProductRecord,
} from '@/services/product-master.service';

const TABS = [
  { key: 'basic', label: 'Basic Info', icon: <Info className="h-4 w-4" /> },
  { key: 'tax', label: 'Tax', icon: <Percent className="h-4 w-4" /> },
  { key: 'units', label: 'Units', icon: <Scale className="h-4 w-4" /> },
  { key: 'pricing', label: 'Pricing', icon: <Wallet className="h-4 w-4" /> },
  { key: 'inventory', label: 'Inventory', icon: <Boxes className="h-4 w-4" /> },
  { key: 'supplier', label: 'Supplier', icon: <Truck className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'remarks', label: 'Remarks', icon: <StickyNote className="h-4 w-4" /> },
];

interface FormState {
  name: string;
  shortName: string;
  productCode: string;
  sku: string;
  barcode: string;
  description: string;
  type: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  manufacturer: string;
  manufacturerCode: string;
  hsnCode: string;
  sacCode: string;
  gstRateId: string;
  isTaxable: boolean;
  taxPreference: string;
  unitId: string;
  purchaseUnitId: string;
  salesUnitId: string;
  stockUnitId: string;
  conversionFactor: number;
  packSize: string;
  mrp: number;
  purchaseRate: number;
  salesRate: number;
  wholesalePrice: number;
  dealerPrice: number;
  minSellingPrice: number;
  maxDiscountPercent: number;
  openingStock: number;
  openingRate: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  hasBatch: boolean;
  hasExpiry: boolean;
  hasSerial: boolean;
  trackInventory: boolean;
  allowNegativeStock: boolean;
  preferredSupplierId: string;
  status: string;
  notes: string;
  cropSeason: string;
  variety: string;
  organic: boolean;
  documents: { fileName: string; docType: string; fileUrl?: string; notes?: string }[];
}

type FormDoc = { fileName: string; docType: string; fileUrl?: string; notes?: string };

function toFormDocs(docs: ProductDocument[] | undefined): FormDoc[] {
  return (docs || []).map((d) => ({
    fileName: d.fileName,
    docType: d.docType || 'other',
    fileUrl: d.fileUrl || undefined,
    notes: d.notes || undefined,
  }));
}

const emptyForm: FormState = {
  name: '',
  shortName: '',
  productCode: '',
  sku: '',
  barcode: '',
  description: '',
  type: 'goods',
  categoryId: '',
  subCategoryId: '',
  brandId: '',
  manufacturer: '',
  manufacturerCode: '',
  hsnCode: '',
  sacCode: '',
  gstRateId: '',
  isTaxable: true,
  taxPreference: 'taxable',
  unitId: '',
  purchaseUnitId: '',
  salesUnitId: '',
  stockUnitId: '',
  conversionFactor: 1,
  packSize: '',
  mrp: 0,
  purchaseRate: 0,
  salesRate: 0,
  wholesalePrice: 0,
  dealerPrice: 0,
  minSellingPrice: 0,
  maxDiscountPercent: 0,
  openingStock: 0,
  openingRate: 0,
  minStock: 0,
  maxStock: 0,
  reorderLevel: 0,
  hasBatch: false,
  hasExpiry: false,
  hasSerial: false,
  trackInventory: true,
  allowNegativeStock: false,
  preferredSupplierId: '',
  status: 'active',
  notes: '',
  cropSeason: '',
  variety: '',
  organic: false,
  documents: [],
};

function toForm(p: ProductRecord): FormState {
  return {
    name: p.name || '',
    shortName: p.shortName || '',
    productCode: p.productCode || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    description: p.description || '',
    type: p.type || 'goods',
    categoryId: p.categoryId || '',
    subCategoryId: p.subCategoryId || '',
    brandId: p.brandId || '',
    manufacturer: p.manufacturer || '',
    manufacturerCode: p.manufacturerCode || '',
    hsnCode: p.hsnCode || '',
    sacCode: p.sacCode || '',
    gstRateId: p.gstRateId || '',
    isTaxable: p.isTaxable ?? true,
    taxPreference: p.taxPreference || 'taxable',
    unitId: p.unitId || '',
    purchaseUnitId: p.purchaseUnitId || '',
    salesUnitId: p.salesUnitId || '',
    stockUnitId: p.stockUnitId || '',
    conversionFactor: p.conversionFactor ?? 1,
    packSize: p.packSize || '',
    mrp: p.mrp ?? 0,
    purchaseRate: p.purchaseRate ?? 0,
    salesRate: p.salesRate ?? 0,
    wholesalePrice: p.wholesalePrice ?? 0,
    dealerPrice: p.dealerPrice ?? 0,
    minSellingPrice: p.minSellingPrice ?? 0,
    maxDiscountPercent: p.maxDiscountPercent ?? 0,
    openingStock: p.openingStock ?? 0,
    openingRate: 0,
    minStock: p.minStock ?? 0,
    maxStock: p.maxStock ?? 0,
    reorderLevel: p.reorderLevel ?? 0,
    hasBatch: p.hasBatch ?? false,
    hasExpiry: p.hasExpiry ?? false,
    hasSerial: p.hasSerial ?? false,
    trackInventory: p.trackInventory ?? true,
    allowNegativeStock: p.allowNegativeStock ?? false,
    preferredSupplierId: p.preferredSupplierId || '',
    status: p.status || 'active',
    notes: p.notes || '',
    cropSeason: p.cropSeason || '',
    variety: p.variety || '',
    organic: p.organic ?? false,
    documents: toFormDocs(p.documents),
  };
}

const num = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function CreateProductPage() {
  return <ProductFormPage mode="create" />;
}

export function EditProductPage() {
  return <ProductFormPage mode="edit" />;
}

function ProductFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = mode === 'edit' && !!id;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [tab, setTab] = useState('basic');
  const [masters, setMasters] = useState<FormMasters | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    void getFormMasters()
      .then(setMasters)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isEdit) {
      return;
    }
    void getProduct(id as string)
      .then((p) => {
        setForm(toForm(p));
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, [id, isEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const subCategories = useMemo(() => {
    const cats = masters?.subCategories || [];
    if (!form.categoryId) {
      return cats;
    }
    const withCat = cats.filter((c) => !c.categoryId || c.categoryId === form.categoryId);
    return withCat.length > 0 ? withCat : cats;
  }, [masters, form.categoryId]);

  const validate = (): string | null => {
    if (!form.name.trim()) {
      return 'Product Name is required';
    }
    if (form.mrp > 0 && form.salesRate > 0 && form.salesRate > form.mrp) {
      return 'MRP must be >= Selling Price';
    }
    if (form.minSellingPrice > 0 && form.salesRate > 0 && form.salesRate < form.minSellingPrice) {
      return 'Selling Price must be >= Minimum Selling Price';
    }
    if (form.wholesalePrice > 0 && form.salesRate > 0 && form.wholesalePrice > form.salesRate) {
      return 'Wholesale Price must be <= Selling Price';
    }
    if (form.dealerPrice > 0 && form.salesRate > 0 && form.dealerPrice > form.salesRate) {
      return 'Dealer Price must be <= Selling Price';
    }
    if (form.openingStock < 0) {
      return 'Opening Stock cannot be negative';
    }
    return null;
  };

  const handleSave = async () => {
    setError(null);
    setFieldError(null);
    const errMsg = validate();
    if (errMsg) {
      setFieldError(errMsg);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        shortName: form.shortName || undefined,
        productCode: form.productCode || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        type: form.type || 'goods',
        categoryId: form.categoryId || undefined,
        subCategoryId: form.subCategoryId || undefined,
        brandId: form.brandId || undefined,
        manufacturer: form.manufacturer || undefined,
        manufacturerCode: form.manufacturerCode || undefined,
        hsnCode: form.hsnCode || undefined,
        sacCode: form.sacCode || undefined,
        gstRateId: form.gstRateId || undefined,
        isTaxable: form.isTaxable,
        taxPreference: form.taxPreference,
        unitId: form.unitId || undefined,
        purchaseUnitId: form.purchaseUnitId || undefined,
        salesUnitId: form.salesUnitId || undefined,
        stockUnitId: form.stockUnitId || undefined,
        conversionFactor: form.conversionFactor || 1,
        packSize: form.packSize || undefined,
        mrp: num(String(form.mrp)),
        purchaseRate: num(String(form.purchaseRate)),
        salesRate: num(String(form.salesRate)),
        wholesalePrice: num(String(form.wholesalePrice)),
        dealerPrice: num(String(form.dealerPrice)),
        minSellingPrice: num(String(form.minSellingPrice)),
        maxDiscountPercent: num(String(form.maxDiscountPercent)),
        openingStock: num(String(form.openingStock)),
        minStock: num(String(form.minStock)),
        maxStock: num(String(form.maxStock)),
        reorderLevel: num(String(form.reorderLevel)),
        hasBatch: form.hasBatch,
        hasExpiry: form.hasExpiry,
        hasSerial: form.hasSerial,
        trackInventory: form.trackInventory,
        allowNegativeStock: form.allowNegativeStock,
        preferredSupplierId: form.preferredSupplierId || undefined,
        status: form.status || 'active',
        notes: form.notes || undefined,
        cropSeason: form.cropSeason || undefined,
        variety: form.variety || undefined,
        organic: form.organic,
        documents: form.documents.filter((d) => d.fileName),
      };
      const result = isEdit
        ? await updateProduct(id as string, payload)
        : await createProduct(payload);
      navigate(`/products/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
      setFieldError(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEdit ? 'Edit Product' : 'New Product'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEdit ? form.productCode || form.sku || form.name : 'उत्पाद मास्टर — नवीन नोंदणी'}
          </p>
        </div>
      </div>

      {(error || fieldError) && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fieldError || error}</span>
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tab === 'basic' && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Product Name *">
              <TextInput
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Urea 46% — 50 KG"
              />
            </Field>
            <Field label="Short Name">
              <TextInput
                value={form.shortName}
                onChange={(e) => set('shortName', e.target.value)}
                placeholder="e.g. Urea 50kg"
              />
            </Field>
            <Field label="Product Code (auto if blank)">
              <TextInput
                value={form.productCode}
                onChange={(e) => set('productCode', e.target.value.toUpperCase())}
                placeholder="PRD-0001"
                disabled={isEdit}
              />
            </Field>
            <Field label="SKU">
              <TextInput
                value={form.sku}
                onChange={(e) => set('sku', e.target.value.toUpperCase())}
                placeholder="Auto from name"
              />
            </Field>
            <Field label="Barcode">
              <TextInput
                value={form.barcode}
                onChange={(e) => set('barcode', e.target.value)}
                placeholder="Scanner / EAN / UPC"
              />
            </Field>
            <Field label="Product Type">
              <SelectInput value={form.type} onChange={(e) => set('type', e.target.value)}>
                {PRODUCT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Category">
              <SelectInput
                value={form.categoryId}
                onChange={(e) => {
                  set('categoryId', e.target.value);
                  set('subCategoryId', '');
                }}
              >
                <option value="">— Select —</option>
                {(masters?.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Sub Category">
              <SelectInput
                value={form.subCategoryId}
                onChange={(e) => set('subCategoryId', e.target.value)}
              >
                <option value="">— Select —</option>
                {subCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Brand">
              <SelectInput value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
                <option value="">— Select —</option>
                {(masters?.brands || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Manufacturer">
              <TextInput
                value={form.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
              />
            </Field>
            <Field label="Manufacturer Code">
              <TextInput
                value={form.manufacturerCode}
                onChange={(e) => set('manufacturerCode', e.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <TextAreaInput
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {tab === 'tax' && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="HSN Code">
              <TextInput
                value={form.hsnCode}
                onChange={(e) => set('hsnCode', e.target.value)}
                placeholder="e.g. 310210"
              />
            </Field>
            <Field label="SAC Code (Services)">
              <TextInput
                value={form.sacCode}
                onChange={(e) => set('sacCode', e.target.value)}
                placeholder="e.g. 9987"
              />
            </Field>
            <Field label="GST Rate">
              <SelectInput
                value={form.gstRateId}
                onChange={(e) => set('gstRateId', e.target.value)}
              >
                <option value="">— None / Exempt —</option>
                {(masters?.gstRates || []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {Number(g.rate)}%
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Tax Type">
              <SelectInput
                value={form.taxPreference}
                onChange={(e) => set('taxPreference', e.target.value)}
              >
                <option value="taxable">Taxable</option>
                <option value="exempt">Exempt</option>
                <option value="nil_rated">Nil Rated</option>
              </SelectInput>
            </Field>
            <Field label="Taxable">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isTaxable}
                  onChange={(e) => set('isTaxable', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                GST applies to this product
              </label>
            </Field>
          </div>
        )}

        {tab === 'units' && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Stock Unit">
              <SelectInput value={form.unitId} onChange={(e) => set('unitId', e.target.value)}>
                <option value="">— Select —</option>
                {(masters?.units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.shortName || u.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Purchase Unit">
              <SelectInput
                value={form.purchaseUnitId}
                onChange={(e) => set('purchaseUnitId', e.target.value)}
              >
                <option value="">Same as stock unit</option>
                {(masters?.units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.shortName || u.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Sales Unit">
              <SelectInput
                value={form.salesUnitId}
                onChange={(e) => set('salesUnitId', e.target.value)}
              >
                <option value="">Same as stock unit</option>
                {(masters?.units || []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.shortName || u.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Conversion Factor (1 stock unit = N sales units)">
              <TextInput
                type="number"
                min="0"
                value={form.conversionFactor}
                onChange={(e) => set('conversionFactor', num(e.target.value))}
              />
            </Field>
            <Field label="Pack Size">
              <TextInput
                value={form.packSize}
                onChange={(e) => set('packSize', e.target.value)}
                placeholder="e.g. 50 KG"
              />
            </Field>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="MRP (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.mrp}
                onChange={(e) => set('mrp', num(e.target.value))}
              />
            </Field>
            <Field label="Purchase Price (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.purchaseRate}
                onChange={(e) => set('purchaseRate', num(e.target.value))}
              />
            </Field>
            <Field label="Selling Price (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.salesRate}
                onChange={(e) => set('salesRate', num(e.target.value))}
              />
            </Field>
            <Field label="Wholesale Price (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.wholesalePrice}
                onChange={(e) => set('wholesalePrice', num(e.target.value))}
              />
            </Field>
            <Field label="Dealer Price (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.dealerPrice}
                onChange={(e) => set('dealerPrice', num(e.target.value))}
              />
            </Field>
            <Field label="Minimum Selling Price (₹)">
              <TextInput
                type="number"
                min="0"
                value={form.minSellingPrice}
                onChange={(e) => set('minSellingPrice', num(e.target.value))}
              />
            </Field>
            <Field label="Max Discount %">
              <TextInput
                type="number"
                min="0"
                value={form.maxDiscountPercent}
                onChange={(e) => set('maxDiscountPercent', num(e.target.value))}
              />
            </Field>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
              <Field label="Opening Stock">
                <TextInput
                  type="number"
                  min="0"
                  value={form.openingStock}
                  onChange={(e) => set('openingStock', num(e.target.value))}
                />
              </Field>
              <Field label="Opening Rate (₹)">
                <TextInput
                  type="number"
                  min="0"
                  value={form.openingRate}
                  onChange={(e) => set('openingRate', num(e.target.value))}
                />
              </Field>
              <Field label="Minimum Stock">
                <TextInput
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => set('minStock', num(e.target.value))}
                />
              </Field>
              <Field label="Maximum Stock">
                <TextInput
                  type="number"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) => set('maxStock', num(e.target.value))}
                />
              </Field>
              <Field label="Reorder Level">
                <TextInput
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => set('reorderLevel', num(e.target.value))}
                />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { key: 'hasBatch', label: 'Batch Tracking', desc: 'Track batch numbers & lots' },
                {
                  key: 'hasExpiry',
                  label: 'Expiry Tracking',
                  desc: 'Expiry date alerts & reports',
                },
                { key: 'hasSerial', label: 'Serial Tracking', desc: 'Unique serial numbers' },
                {
                  key: 'trackInventory',
                  label: 'Track Inventory',
                  desc: 'Stock ledger integration',
                },
              ].map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean((form as any)[key])}
                    onChange={(e) => set(key as keyof FormState, e.target.checked as never)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                      {label}
                    </span>
                    <span className="block text-xs text-slate-400">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.allowNegativeStock}
                onChange={(e) => set('allowNegativeStock', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              Allow negative stock (only if system config permits)
            </label>
          </div>
        )}

        {tab === 'supplier' && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Preferred Supplier">
              <SelectInput
                value={form.preferredSupplierId}
                onChange={(e) => set('preferredSupplierId', e.target.value)}
              >
                <option value="">— Select —</option>
                {(masters?.suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Crop Season">
              <TextInput
                value={form.cropSeason}
                onChange={(e) => set('cropSeason', e.target.value)}
                placeholder="e.g. Kharif 2026"
              />
            </Field>
            <Field label="Variety">
              <TextInput value={form.variety} onChange={(e) => set('variety', e.target.value)} />
            </Field>
            <Field label="Organic">
              <label className="flex items-center gap-2 pt-6 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.organic}
                  onChange={(e) => set('organic', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                Certified organic product
              </label>
            </Field>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <ImageIcon className="h-4 w-4" />
              Product images, license documents and certificates are managed from the Product Detail
              page after creation.
            </div>
            {form.documents.length > 0 && (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {form.documents.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {d.fileName}
                    </span>
                    <button
                      onClick={() =>
                        set(
                          'documents',
                          form.documents.filter((_, j) => j !== i),
                        )
                      }
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'remarks' && (
          <div className="space-y-5">
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
                <option value="discontinued">Discontinued</option>
              </SelectInput>
            </Field>
            <Field label="Notes / Remarks">
              <TextAreaInput
                rows={4}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
            {isEdit && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Price changes are recorded in the price history — historical prices are never
                overwritten.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </div>
  );
}
