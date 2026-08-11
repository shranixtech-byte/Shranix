import { ArrowLeft, Loader2, RefreshCw, Repeat, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { assetApi, type Asset } from '@/services/asset-expense.service';
import { getEmployees } from '@/services/hr.service';

const fmt = (n?: number | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<
    { id: string; firstName: string; lastName?: string }[]
  >([]);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [transferTo, setTransferTo] = useState('employee');
  const [transferToId, setTransferToId] = useState('');
  const [disposeSale, setDisposeSale] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const a = await assetApi.get(id);
      setAsset(a);
      const emps = (await getEmployees({ ps: 100 })) as any;
      setEmployees(emps?.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!asset) {
    return <div className="text-muted-foreground p-10 text-center text-sm">Asset not found</div>;
  }

  const depreciate = async () => {
    try {
      await assetApi.depreciate(asset.id, period);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Depreciation failed');
    }
  };

  const requestTransfer = async () => {
    if (!transferToId) {
      return;
    }
    try {
      await assetApi.transfer(asset.id, {
        toType: transferTo,
        toId: transferToId,
        reason: 'Manual transfer',
      });
      setTransferToId('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Transfer failed');
    }
  };

  const dispose = async () => {
    const sale = Number(disposeSale) || 0;
    if (
      !window.confirm(`Dispose ${asset.assetName} for ${fmt(sale)}? This posts accounting entries.`)
    ) {
      return;
    }
    try {
      await assetApi.dispose(asset.id, { disposalType: 'sale', saleValue: sale });
      setDisposeSale('');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Disposal failed');
    }
  };

  const info: [string, string][] = [
    ['Category', asset.categoryName || '—'],
    ['Type', asset.assetType || '—'],
    ['Brand / Model', `${asset.brand || ''} ${asset.model || ''}`.trim() || '—'],
    ['Serial number', asset.serialNumber || '—'],
    ['Purchase date', asset.purchaseDate || '—'],
    ['Supplier', asset.supplierName || '—'],
    ['Location', asset.location || '—'],
    ['Condition', asset.condition || '—'],
    ['Warranty', asset.warrantyEnd ? `until ${asset.warrantyEnd}` : '—'],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link
        to="/assets"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to assets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{asset.assetName}</h1>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[11px]">
              {asset.assetCode}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Book value:{' '}
            <span className="text-foreground font-semibold">{fmt(asset.currentBookValue)}</span> •
            Depreciation: {fmt(asset.accumulatedDepreciation)}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="border-border hover:border-primary/40 text-muted-foreground rounded-lg border p-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Details</h3>
          <dl className="space-y-2">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs">
                <dt className="text-muted-foreground shrink-0">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Depreciation</h3>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground flex justify-between">
              <span>Method</span>
              <span className="text-foreground capitalize">
                {asset.depreciationMethod?.replace('_', ' ')}
              </span>
            </p>
            <p className="text-muted-foreground flex justify-between">
              <span>Useful life</span>
              <span>{asset.usefulLifeYears ? `${asset.usefulLifeYears} years` : '—'}</span>
            </p>
            <p className="text-muted-foreground flex justify-between">
              <span>Salvage value</span>
              <span>{fmt(asset.salvageValue)}</span>
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border-border bg-card w-28 rounded-lg border px-2 py-1.5 text-xs outline-none"
            />
            <button
              onClick={() => void depreciate()}
              disabled={asset.status === 'disposed'}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Post period
            </button>
          </div>
          <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
            {(asset.depreciation || []).map((d) => (
              <div
                key={d.id}
                className="bg-muted/40 flex justify-between rounded-md px-2 py-1.5 text-[11px]"
              >
                <span className="font-mono">{d.period}</span>
                <span className="font-mono">{fmt(d.amount)}</span>
                <span className="text-muted-foreground">→ {fmt(d.bookValueAfter)}</span>
              </div>
            ))}
            {!asset.depreciation?.length && (
              <p className="text-muted-foreground py-2 text-center text-[11px]">No postings yet</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Repeat className="h-3.5 w-3.5" /> Transfer
          </h3>
          <div className="flex flex-col gap-2">
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
            >
              <option value="employee">Employee</option>
              <option value="department">Department</option>
              <option value="location">Location</option>
            </select>
            {transferTo === 'employee' ? (
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName || ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                placeholder="Department / location ID or name"
                className="border-border bg-card rounded-lg border px-2 py-1.5 text-xs outline-none"
              />
            )}
            <button
              onClick={() => void requestTransfer()}
              disabled={!transferToId}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Request transfer
            </button>
          </div>
          {asset.status !== 'disposed' && (
            <div className="mt-4 border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold">Dispose asset</h4>
              <div className="flex gap-2">
                <input
                  value={disposeSale}
                  onChange={(e) => setDisposeSale(e.target.value)}
                  placeholder="Sale value"
                  className="border-border bg-card w-full rounded-lg border px-2 py-1.5 text-xs outline-none"
                />
                <button
                  onClick={() => void dispose()}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3 w-3" /> Dispose
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Allocation history</h3>
          {!asset.allocations?.length ? (
            <p className="text-muted-foreground py-4 text-center text-xs">No allocations</p>
          ) : (
            <ul className="divide-y">
              {asset.allocations.map((al) => (
                <li key={al.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-medium capitalize">
                      {al.assignedToType}: {al.assignedToId.slice(0, 8)}
                    </p>
                    <p className="text-muted-foreground">
                      {al.assignmentDate || ''} →{' '}
                      {al.status === 'returned'
                        ? `returned ${al.returnedAt || ''}`
                        : al.expectedReturnDate || 'open'}
                    </p>
                  </div>
                  {al.status === 'assigned' && (
                    <button
                      onClick={() => void assetApi.returnAsset(asset.id, al.id).then(load)}
                      className="text-primary hover:bg-primary/5 rounded-md px-2 py-1 text-[11px] font-medium"
                    >
                      Return
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Condition history</h3>
          {!asset.history?.length ? (
            <p className="text-muted-foreground py-4 text-center text-xs">No condition changes</p>
          ) : (
            <ul className="divide-y">
              {asset.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="font-medium capitalize">{h.condition.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{h.changedAt?.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
