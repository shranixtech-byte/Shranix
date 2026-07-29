import { Warehouse, Building2, MapPin, ArrowRightLeft, Clock, Package, Percent, RefreshCw, LayoutGrid, ListTree, FileText, Lock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

interface DashboardData {
  totalWarehouses: number;
  totalGodowns: number;
  totalLocations: number;
  totalStockValue: number;
  totalTransfers: number;
  pendingTransfers: number;
  warehouses: any[];
  transfers: any[];
  totalReserved?: number;
  totalAvailable?: number;
}

export function WarehouseDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashResult, batchResult]: any = await Promise.all([
        apiRequest('/inventory/warehouse-dashboard'),
        apiRequest('/inventory/batches?pageSize=1000').catch(() => ({ data: [] })),
      ]);
      const batchData = batchResult?.data || batchResult || [];
      const totalReserved = (Array.isArray(batchData) ? batchData : []).reduce((s: number, b: any) => s + (b.reservedQuantity || 0), 0);
      const totalAvailable = (Array.isArray(batchData) ? batchData : []).reduce((s: number, b: any) => s + ((b.availableQuantity ?? b.quantity ?? 0) - (b.reservedQuantity ?? 0)), 0);
      setData({ ...dashResult, totalReserved, totalAvailable });
    } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-card p-6">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-3 h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalBatchQty = (data?.totalReserved ?? 0) + (data?.totalAvailable ?? 0);
  const occupancyPct = totalBatchQty > 0 ? Math.round(((data?.totalReserved ?? 0) / totalBatchQty) * 100) : 0;

  const stats = [
    { label: 'Total Warehouses', value: data?.totalWarehouses ?? 0, icon: Warehouse, color: 'from-blue-500 to-indigo-600' },
    { label: 'Total Godowns', value: data?.totalGodowns ?? 0, icon: Building2, color: 'from-emerald-500 to-teal-600' },
    { label: 'Total Locations', value: data?.totalLocations ?? 0, icon: MapPin, color: 'from-amber-500 to-orange-600' },
    { label: 'Total Transfers', value: data?.totalTransfers ?? 0, icon: ArrowRightLeft, color: 'from-cyan-500 to-sky-600' },
    { label: 'Pending Transfers', value: data?.pendingTransfers ?? 0, icon: Clock, color: 'from-rose-500 to-red-600' },
    { label: 'Reserved Stock', value: data?.totalReserved ?? 0, icon: Lock, color: 'from-amber-500 to-orange-600' },
    { label: 'Available Stock', value: data?.totalAvailable ?? 0, icon: Package, color: 'from-emerald-500 to-green-600' },
    { label: 'Occupancy', value: `${occupancyPct}%`, icon: Percent, color: 'from-violet-500 to-purple-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of warehouse operations, locations, and stock transfers</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className={`absolute -inset-1 bg-gradient-to-r ${s.color} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-5`} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{s.label}</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}</p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Occupancy Progress Bar */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Warehouse Occupancy</h3>
          <span className="text-xs font-medium text-muted-foreground">{occupancyPct}% Reserved</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-700 ease-in-out"
            style={{ width: `${Math.min(occupancyPct, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>Available: {data?.totalAvailable ?? 0}</span>
          <span>Reserved: {data?.totalReserved ?? 0}</span>
          <span>Total: {totalBatchQty}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => navigate('/inventory/location-tree')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <ListTree className="h-4 w-4 text-indigo-500" /> Location Tree
            </button>
            <button onClick={() => navigate('/inventory/warehouse-locations')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <MapPin className="h-4 w-4 text-blue-500" /> Manage Locations
            </button>
            <button onClick={() => navigate('/warehouses')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <Warehouse className="h-4 w-4 text-emerald-500" /> Manage Warehouses
            </button>
            <button onClick={() => navigate('/inventory/create-transfer')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <ArrowRightLeft className="h-4 w-4 text-amber-500" /> New Transfer
            </button>
            <button onClick={() => navigate('/inventory/stock-transfers')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <LayoutGrid className="h-4 w-4 text-cyan-500" /> All Transfers
            </button>
            <button onClick={() => navigate('/inventory/stock-reservation')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <Lock className="h-4 w-4 text-rose-500" /> Stock Reservation
            </button>
            <button onClick={() => navigate('/inventory/reports/warehouse')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <FileText className="h-4 w-4 text-violet-500" /> Warehouse Reports
            </button>
            <button onClick={() => navigate('/inventory/batches')} className="flex items-center gap-2 rounded-xl border bg-background p-2.5 text-xs font-medium transition-all hover:bg-muted hover:border-primary/30">
              <Package className="h-4 w-4 text-violet-500" /> Manage Batches
            </button>
          </div>
        </div>

        {/* Warehouse Cards */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Warehouse Cards</h3>
            <button onClick={() => navigate('/warehouses')} className="text-xs font-medium text-primary hover:underline">Manage</button>
          </div>
          {(data?.warehouses ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Warehouse className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">No warehouses configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.warehouses ?? []).slice(0, 4).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="font-medium truncate">{w.name || w.code}</span>
                    <span className="text-muted-foreground">({w.code})</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    w.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transfers */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Transfers</h3>
            <button onClick={() => navigate('/inventory/stock-transfers')} className="text-xs font-medium text-primary hover:underline">View all</button>
          </div>
          {(data?.transfers ?? []).length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.transfers ?? []).slice(0, 4).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium">{t.transferNumber}</span>
                    <span className="text-muted-foreground truncate">{t.fromLocation} → {t.toLocation}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    t.status === 'approved' ? 'bg-blue-50 text-blue-700' :
                    t.status === 'rejected' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
