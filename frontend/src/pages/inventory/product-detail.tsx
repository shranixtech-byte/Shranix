import {
  Package, ArrowLeft, Edit, Tag, DollarSign, Receipt, Image as ImageIcon,
  Shield, BarChart3, Layers, TrendingUp, ShoppingCart,
  AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  productCode?: string;
  barcode?: string;
  qrCode?: string;
  hsnCode?: string;
  gstRateId?: string;
  type?: string;
  description?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  packSize?: string;
  manufacturer?: string;
  supplierId?: string;
  purchaseRate?: number;
  salesRate?: number;
  mrp?: number;
  minStock?: number;
  maxStock?: number;
  reorderLevel?: number;
  openingStock?: number;
  currentStock?: number;
  isActive?: boolean;
  hasBatch?: boolean;
  hasSerial?: boolean;
  hasExpiry?: boolean;
  isTaxable?: boolean;
  taxPreference?: string;
  weight?: number;
  weightUnit?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) {return;}
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<ProductDetail>(`/inventory/items/${id}`);
      setProduct(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchProduct(); }, [fetchProduct]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="space-y-6">
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-lg font-semibold">Product not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error || 'The requested product could not be loaded.'}</p>
          <button onClick={() => navigate('/inventory/products')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </button>
        </div>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] truncate">{value ?? '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/inventory/products')} className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card transition-all hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight">{product.name}</h1>
              {product.isActive !== false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <XCircle className="h-3 w-3" /> Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              SKU: <span className="font-mono font-medium">{product.sku}</span>
              {product.productCode && <> · Code: <span className="font-mono">{product.productCode}</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/inventory/items/${product.id}/edit`)} className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
            <Edit className="h-4 w-4" /> Edit Product
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - General Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">General Information</h2>
            </div>
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div>
                <InfoRow label="Product Name" value={product.name} />
                <InfoRow label="SKU" value={product.sku} />
                <InfoRow label="Product Code" value={product.productCode} />
                <InfoRow label="Type" value={product.type} />
                <InfoRow label="Description" value={product.description} />
                <InfoRow label="Category" value={product.categoryId} />
                <InfoRow label="Sub Category" value={product.subCategoryId} />
                <InfoRow label="Brand" value={product.brandId} />
              </div>
              <div>
                <InfoRow label="Unit" value={product.unitId} />
                <InfoRow label="Pack Size" value={product.packSize} />
                <InfoRow label="Manufacturer" value={product.manufacturer} />
                <InfoRow label="Supplier" value={product.supplierId} />
                <InfoRow label="Weight" value={product.weight ? `${product.weight} ${product.weightUnit || ''}` : null} />
                <InfoRow label="Barcode" value={product.barcode} />
                <InfoRow label="QR Code" value={product.qrCode} />
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <DollarSign className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Pricing Information</h2>
            </div>
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div>
                <InfoRow label="Purchase Rate" value={product.purchaseRate ? `₹${product.purchaseRate.toFixed(2)}` : null} />
                <InfoRow label="Sales Rate" value={product.salesRate ? `₹${product.salesRate.toFixed(2)}` : null} />
                <InfoRow label="MRP" value={product.mrp ? `₹${product.mrp.toFixed(2)}` : null} />
              </div>
              <div>
                <InfoRow label="Min Stock Level" value={product.minStock} />
                <InfoRow label="Max Stock Level" value={product.maxStock} />
                <InfoRow label="Reorder Level" value={product.reorderLevel} />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <Receipt className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Tax Information</h2>
            </div>
            <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              <div>
                <InfoRow label="HSN/SAC Code" value={product.hsnCode} />
                <InfoRow label="GST Rate" value={product.gstRateId} />
              </div>
              <div>
                <InfoRow label="Taxable" value={product.isTaxable ? 'Yes' : 'No'} />
                <InfoRow label="Tax Preference" value={product.taxPreference} />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md">
                <ImageIcon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Product Images</h2>
            </div>
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8">
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">No images uploaded</p>
                <p className="text-xs text-muted-foreground/60">Manage images from the Images section</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stock & Audit */}
        <div className="space-y-6">
          {/* Stock Information */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Stock Information</h2>
            </div>
            <div className="space-y-0">
              <InfoRow label="Current Stock" value={product.currentStock?.toFixed(0)} />
              <InfoRow label="Opening Stock" value={product.openingStock?.toFixed(0)} />
              <InfoRow label="Min Stock" value={product.minStock} />
              <InfoRow label="Max Stock" value={product.maxStock} />
              <InfoRow label="Reorder Level" value={product.reorderLevel} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.hasBatch && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"><Layers className="h-3 w-3" /> Batch</span>}
              {product.hasSerial && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-400"><Tag className="h-3 w-3" /> Serial</span>}
              {product.hasExpiry && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> Expiry</span>}
            </div>
          </div>

          {/* Audit Information */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md">
                <Shield className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold">Audit Information</h2>
            </div>
            <div className="space-y-0">
              <InfoRow label="Created" value={product.createdAt ? new Date(product.createdAt).toLocaleString('en-IN') : null} />
              <InfoRow label="Updated" value={product.updatedAt ? new Date(product.updatedAt).toLocaleString('en-IN') : null} />
              <InfoRow label="Created By" value={product.createdBy} />
              <InfoRow label="Notes" value={product.notes} />
            </div>
          </div>

          {/* Future Placeholders */}
          <div className="rounded-2xl border border-dashed bg-muted/20 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                <Layers className="mx-auto h-5 w-5 text-blue-500" />
                <p className="mt-1.5 text-[11px] font-medium">Batches</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                <TrendingUp className="mx-auto h-5 w-5 text-emerald-500" />
                <p className="mt-1.5 text-[11px] font-medium">Sales History</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                <ShoppingCart className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1.5 text-[11px] font-medium">Purchase History</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                <BarChart3 className="mx-auto h-5 w-5 text-purple-500" />
                <p className="mt-1.5 text-[11px] font-medium">Inventory</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">Coming in PRM-015B</p>
          </div>
        </div>
      </div>
    </div>
  );
}
