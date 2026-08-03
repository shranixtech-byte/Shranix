import { Loader2, Search, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import {
  getPostedInvoices,
  getInvoiceItems,
  getReturnReasons,
  createReturn,
  type ReturnItem,
} from '@/services/sales-return.service';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

export function CreateReturnPage() {
  const [step, setStep] = useState<'select_invoice' | 'select_items' | 'review'>('select_invoice');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reasons, setReasons] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPostedInvoices({ pageSize: 100, search: searchInvoice });
      setInvoices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchInvoice]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    getReturnReasons()
      .then(setReasons)
      .catch(() => {});
  }, []);

  const selectInvoice = async (inv: any) => {
    setLoading(true);
    setSelectedInvoice(inv);
    try {
      const res = (await getInvoiceItems(inv.id)) as any;
      const items = res?.items || res?.invoiceItems || [];
      setInvoiceItems(items);
      setReturnItems(
        items.map((i: any) => ({
          invoiceItemId: i.id,
          itemId: i.itemId,
          quantity: 0,
          rate: Number(i.rate || 0),
          taxableValue: Number(i.taxableValue || 0),
          gstRate: Number(i.gstRate || 0),
          igst: Number(i.igst || 0),
          cgst: Number(i.cgst || 0),
          sgst: Number(i.sgst || 0),
          cess: Number(i.cess || 0),
          totalAmount: Number(i.totalAmount || 0),
          reason: 'damaged',
          itemStatus: 'good',
        })),
      );
      setStep('select_items');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateReturnQty = (index: number, qty: number) => {
    const updated = [...returnItems];
    const maxQty = Number(invoiceItems[index]?.quantity || 0);
    updated[index] = { ...updated[index], quantity: Math.min(Math.max(0, qty), maxQty) };
    setReturnItems(updated);
  };

  const updateReturnReason = (index: number, reason: string) => {
    const updated = [...returnItems];
    updated[index] = { ...updated[index], reason };
    setReturnItems(updated);
  };

  const selectedItems = returnItems.filter((i) => i.quantity > 0);
  const grandTotal = selectedItems.reduce((s, i) => s + i.rate * i.quantity, 0);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('Select at least one item to return');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const returnNumber = `SR-${Date.now().toString(36).toUpperCase()}`;
      const result = await createReturn({
        returnNumber,
        invoiceId: selectedInvoice.id,
        customerId: selectedInvoice.customerId,
        returnDate: new Date().toISOString().split('T')[0],
        returnReason: 'customer_cancelled',
        notes: '',
        items: selectedItems,
      });
      setResult(result);
      setStep('review');
    } catch (e: any) {
      setError(e.message || 'Failed to create return');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center">
          <Check className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-bold">Return Created Successfully</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Return #{result.returnNumber} has been created with auto-generated Credit Note
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="bg-card rounded-md border p-3 text-left">
              <p className="text-muted-foreground text-xs">Return Number</p>
              <p className="font-medium">{result.returnNumber}</p>
            </div>
            <div className="bg-card rounded-md border p-3 text-left">
              <p className="text-muted-foreground text-xs">Credit Note</p>
              <p className="font-medium">{result.creditNote?.creditNoteNo || 'Auto-generated'}</p>
            </div>
            <div className="bg-card rounded-md border p-3 text-left">
              <p className="text-muted-foreground text-xs">Items</p>
              <p className="font-medium">{result.items?.length || 0}</p>
            </div>
            <div className="bg-card rounded-md border p-3 text-left">
              <p className="text-muted-foreground text-xs">Amount</p>
              <p className="font-medium">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setStep('select_invoice');
              setResult(null);
              setSelectedInvoice(null);
              setReturnItems([]);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-4 py-2 text-sm font-medium"
          >
            Create Another Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {step !== 'select_invoice' && (
          <button
            onClick={() => setStep('select_invoice')}
            className="bg-background hover:bg-accent rounded-md border p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Return</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'select_invoice'
              ? 'Select a posted invoice to return'
              : step === 'select_items'
                ? `Return items from ${selectedInvoice?.invoiceNumber}`
                : 'Review and confirm'}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {['select_invoice', 'select_items', 'review'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : (step === 'select_items' && i < 1) || (step === 'review' && i < 2)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={step === s ? 'text-foreground' : 'text-muted-foreground'}>
              {s === 'select_invoice'
                ? 'Select Invoice'
                : s === 'select_items'
                  ? 'Select Items'
                  : 'Review'}
            </span>
            {i < 2 && <div className="bg-border h-px w-6" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Invoice */}
      {step === 'select_invoice' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder="Search invoices by number or customer..."
              className="bg-background focus:ring-primary/50 w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {invoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => selectInvoice(inv)}
                  className="bg-card hover:border-primary/50 rounded-lg border p-4 text-left shadow-sm transition-all hover:shadow-md"
                >
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <p className="text-muted-foreground text-xs">
                    {inv.customerName || inv.customerId}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(Number(inv.grandTotal || 0))}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ''}
                  </p>
                </button>
              ))}
              {invoices.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
                  No posted invoices found
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Items */}
      {step === 'select_items' && selectedInvoice && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border">
            <div className="bg-muted/30 text-muted-foreground grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-3 border-b px-4 py-2.5 text-xs font-medium">
              <span>Item</span>
              <span className="text-right">Sold Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Return Qty</span>
              <span>Reason</span>
            </div>
            <div className="divide-y">
              {returnItems.map((item, idx) => {
                const invItem = invoiceItems[idx];
                const maxQty = Number(invItem?.quantity || 0);
                return (
                  <div
                    key={idx}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] items-center gap-3 px-4 py-3 text-sm ${item.quantity > 0 ? 'bg-primary/5' : ''}`}
                  >
                    <div>
                      <p className="font-medium">{invItem?.description || invItem?.itemId}</p>
                      <p className="text-muted-foreground text-xs">
                        HSN: {invItem?.hsnCode || '—'}
                      </p>
                    </div>
                    <p className="text-right tabular-nums">{maxQty}</p>
                    <p className="text-muted-foreground text-right tabular-nums">
                      {formatCurrency(item.rate)}
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={maxQty}
                      value={item.quantity || ''}
                      onChange={(e) => updateReturnQty(idx, Number(e.target.value))}
                      className="bg-background focus:ring-primary/50 ml-auto block w-20 rounded-md border px-2 py-1 text-right text-sm tabular-nums outline-none focus:ring-2"
                    />
                    <select
                      value={item.reason}
                      onChange={(e) => updateReturnReason(idx, e.target.value)}
                      className="bg-background focus:ring-primary/50 rounded-md border px-2 py-1 text-xs outline-none focus:ring-2"
                    >
                      {reasons.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground text-sm">
                {selectedItems.length} items selected for return
              </p>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Return Amount</p>
              <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
              <button
                onClick={() => setStep('review')}
                disabled={selectedItems.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Review Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Return Summary</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs">Invoice</p>
                <p className="font-medium">{selectedInvoice?.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Items</p>
                <p className="font-medium">{selectedItems.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Return Amount</p>
                <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <div className="bg-muted/30 text-muted-foreground grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b px-4 py-2.5 text-xs font-medium">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
              <span>Reason</span>
            </div>
            <div className="divide-y">
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 text-sm"
                >
                  <p className="font-medium">{item.itemId}</p>
                  <p className="text-right tabular-nums">{item.quantity}</p>
                  <p className="text-right tabular-nums">
                    {formatCurrency(item.rate * item.quantity)}
                  </p>
                  <p className="text-muted-foreground text-xs capitalize">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setStep('select_items')}
              className="bg-background hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-6 py-2 text-sm font-medium disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
