import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  FileText,
  History,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { TabBar } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  addProductDocument,
  deleteProduct,
  formatMoney,
  formatNumber,
  getProduct,
  getProductBatches,
  getProductDeleteGuard,
  getProductHistory,
  getProductPrices,
  getProductStock,
  productStatusBadge,
  removeProductDocument,
  type ProductRecord,
} from '@/services/product-master.service';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Package className="h-4 w-4" /> },
  { key: 'pricing', label: 'Pricing', icon: <Wallet className="h-4 w-4" /> },
  { key: 'stock', label: 'Stock', icon: <Boxes className="h-4 w-4" /> },
  { key: 'batches', label: 'Batches', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
];

const DOC_TYPES = ['product_image', 'product_doc', 'license', 'gst_certificate', 'other'];

export function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Detail data
  const [stockData, setStockData] = useState<any>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [deleteGuard, setDeleteGuard] = useState<any>(null);

  // Document add
  const [docFile, setDocFile] = useState('');
  const [docType, setDocType] = useState('other');
  const [docUrl, setDocUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getProduct(id as string);
      setProduct(p);
      setDeleteGuard(await getProductDeleteGuard(id as string).catch(() => null));
      const [, stock, prices, batches, history] = await Promise.all([
        Promise.resolve(),
        getProductStock(id as string).catch(() => null),
        getProductPrices(id as string).catch(() => null),
        getProductBatches(id as string).catch(() => null),
        getProductHistory(id as string).catch(() => null),
      ]);
      setStockData(stock);
      setPriceData(prices);
      setBatchData(batches);
      setHistoryData(history);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (
      !window.confirm('Delete this product? Products with transaction history cannot be deleted.')
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteProduct(id as string);
      navigate('/products');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddDoc = async () => {
    if (!docFile.trim()) {
      return;
    }
    setBusy(true);
    try {
      await addProductDocument({
        productId: id as string,
        docType,
        fileName: docFile.trim(),
        fileUrl: docUrl || undefined,
      });
      setDocFile('');
      setDocUrl('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    if (!window.confirm('Remove this document?')) {
      return;
    }
    setBusy(true);
    try {
      await removeProductDocument(docId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-24 text-center text-sm text-slate-400">{error || 'Product not found'}</div>
    );
  }

  const card =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
  const row = 'flex items-center justify-between py-1.5 text-sm';
  const labelCls = 'text-slate-500 dark:text-slate-400';
  const valueCls = 'font-medium text-slate-800 dark:text-slate-100';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/products')}
            className="mt-1 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {product.name}
              </h1>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  productStatusBadge(product.status),
                )}
              >
                {product.status}
              </span>
              {product.stockStatus === 'low_stock' && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Low stock
                </span>
              )}
              {product.stockStatus === 'out_of_stock' && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  Out of stock
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {product.productCode || '—'} · {product.sku}{' '}
              {product.barcode ? `· ${product.barcode}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => navigate(`/products/${product.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            loading={busy}
          >
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className={`${card} lg:col-span-2`}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Basic Information
            </h2>
            <div className="grid gap-x-8 md:grid-cols-2">
              <div className={row}>
                <span className={labelCls}>Category</span>
                <span className={valueCls}>{product.categoryName || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Sub Category</span>
                <span className={valueCls}>{product.subCategoryName || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Brand</span>
                <span className={valueCls}>{product.brandName || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Type</span>
                <span className={valueCls}>{product.type || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Manufacturer</span>
                <span className={valueCls}>{product.manufacturer || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Pack Size</span>
                <span className={valueCls}>{product.packSize || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>HSN</span>
                <span className={valueCls}>{product.hsnCode || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>GST Rate</span>
                <span className={valueCls}>
                  {product.gstRate !== null && product.gstRate !== undefined
                    ? `${product.gstRate}%`
                    : '—'}
                </span>
              </div>
              <div className={row}>
                <span className={labelCls}>Preferred Supplier</span>
                <span className={valueCls}>{product.preferredSupplierName || '—'}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Batch / Expiry / Serial</span>
                <span className={valueCls}>
                  {[
                    product.hasBatch && 'Batch',
                    product.hasExpiry && 'Expiry',
                    product.hasSerial && 'Serial',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'None'}
                </span>
              </div>
            </div>
            {product.description && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {product.description}
              </p>
            )}
          </div>
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Current Stock
            </h2>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatNumber(product.currentStock)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {product.unitName || 'units'} · min {formatNumber(product.minStock)} · max{' '}
              {formatNumber(product.maxStock)} · reorder {formatNumber(product.reorderLevel)}
            </p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className={row}>
                <span className={labelCls}>Selling Price</span>
                <span className={valueCls}>{formatMoney(product.salesRate)}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>MRP</span>
                <span className={valueCls}>{formatMoney(product.mrp)}</span>
              </div>
              <div className={row}>
                <span className={labelCls}>Purchase Price</span>
                <span className={valueCls}>{formatMoney(product.purchaseRate)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Current Prices
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['MRP', product.mrp],
                ['Purchase', product.purchaseRate],
                ['Selling', product.salesRate],
                ['Wholesale', product.wholesalePrice],
                ['Dealer', product.dealerPrice],
                ['Min Selling', product.minSellingPrice],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {formatMoney(value as number)}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Max discount: {formatNumber(product.maxDiscountPercent)}%
            </p>
          </div>
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Price History
            </h2>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {(priceData?.history?.length ?? 0) === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  No price changes recorded
                </div>
              )}
              {(priceData?.history || []).map((h: any) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700 dark:text-slate-200">
                      {h.priceType}
                    </span>
                    <span className="text-xs text-slate-400">
                      {String(h.changedAt || '').slice(0, 10)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="text-slate-400 line-through">{formatMoney(h.oldValue)}</span>
                    <span className="mx-2 text-slate-300">→</span>
                    <span className="font-semibold text-emerald-600">
                      {formatMoney(h.newValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Warehouse Stock
            </h2>
            {(stockData?.warehouseBreakdown?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No warehouse stock records
              </div>
            )}
            <div className="space-y-2">
              {(stockData?.warehouseBreakdown || []).map((w: any) => (
                <div
                  key={w.warehouseId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 dark:border-slate-800"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    {w.warehouseName}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatNumber(w.onHand)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total On Hand
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {formatNumber(stockData?.totalOnHand ?? product.currentStock)}
              </span>
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Recent Stock Ledger
            </h2>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {(stockData?.recentLedger?.length ?? 0) === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">No stock movements</div>
              )}
              {(stockData?.recentLedger || []).slice(0, 20).map((l: any) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 dark:border-slate-800"
                >
                  <div>
                    <div className="text-sm text-slate-700 dark:text-slate-200">
                      {l.transactionType}
                    </div>
                    <div className="text-xs text-slate-400">
                      {String(l.transactionDate || l.createdAt || '').slice(0, 10)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      l.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {l.direction === 'IN' ? '+' : '−'}
                    {formatNumber(l.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'batches' && (
        <div className={card}>
          <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Batches</h2>
          {(batchData?.batches?.length ?? 0) === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              No batches{product.hasBatch ? '' : ' — batch tracking is off for this product'}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2">Batch No</th>
                  <th className="px-4 py-2">Mfg</th>
                  <th className="px-4 py-2">Expiry</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Available</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(batchData?.batches || []).map((b: any) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {b.batchNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {String(b.mfgDate || '').slice(0, 10) || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {String(b.expDate || '').slice(0, 10) || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {formatNumber(b.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-200">
                      {formatNumber(b.availableQuantity)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Add Document
            </h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>File Name</label>
                <input
                  value={docFile}
                  onChange={(e) => setDocFile(e.target.value)}
                  placeholder="e.g. GST-Cert-Urea.pdf"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className={labelCls}>File URL (optional)</label>
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://… or /uploads/…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <Button onClick={handleAddDoc} loading={busy} icon={<FileText className="h-4 w-4" />}>
                Add Document
              </Button>
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Documents ({product.documents?.length ?? 0})
            </h2>
            {(product.documents?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <ImageIcon className="mb-2 h-8 w-8" />
                <span className="text-sm">No documents yet</span>
              </div>
            )}
            <div className="space-y-2">
              {(product.documents || []).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {d.fileName}
                    </div>
                    <div className="text-xs capitalize text-slate-400">
                      {d.docType.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDoc(d.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Purchase History
            </h2>
            {(historyData?.purchaseHistory?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">No purchase records</div>
            )}
            {(historyData?.purchaseHistory || []).map((h: any) => (
              <div
                key={h.id}
                className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-200">{h.poId || h.id}</span>
                <span className="text-slate-500">
                  {formatNumber(h.quantity)} × {formatMoney(h.rate)}
                </span>
              </div>
            ))}
          </div>
          <div className={card}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Sales History
            </h2>
            {(historyData?.salesHistory?.length ?? 0) === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">No sales records</div>
            )}
            {(historyData?.salesHistory || []).map((h: any) => (
              <div
                key={h.id}
                className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-200">{h.invoiceId || h.id}</span>
                <span className="text-slate-500">
                  {formatNumber(h.quantity)} × {formatMoney(h.rate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteGuard && !deleteGuard.canDelete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          ⚠️ Product cannot be deleted because transaction history exists:{' '}
          {deleteGuard.blocking.map((b: any) => `${b.label} (${b.rows})`).join(', ')}
        </div>
      )}
    </div>
  );
}
