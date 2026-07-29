import { Download, Warehouse, MapPin, ArrowRightLeft, Lock, Activity, BarChart3, Search, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { apiRequest } from '@/services/api-client';

type ReportType = 'summary' | 'stock' | 'location' | 'transfer' | 'reservation' | 'movement';

interface ReportData {
  [key: string]: any;
}

const reportMeta: Record<ReportType, { label: string; icon: any; description: string }> = {
  summary: { label: 'Warehouse Summary', icon: Warehouse, description: 'Overview of all warehouses with capacity and stock metrics' },
  stock: { label: 'Warehouse Stock', icon: BarChart3, description: 'Stock levels per warehouse with batch details' },
  location: { label: 'Location Stock', icon: MapPin, description: 'Stock at godown/rack/shelf/bin level' },
  transfer: { label: 'Transfer Report', icon: ArrowRightLeft, description: 'Historical stock transfer records' },
  reservation: { label: 'Reservation Report', icon: Lock, description: 'Reserved stock and allocation status' },
  movement: { label: 'Movement Report', icon: Activity, description: 'Stock movement and transaction log' },
};

export function WarehouseReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (reportType) {
        case 'summary': endpoint = '/inventory/warehouse-dashboard'; break;
        case 'stock': endpoint = `/inventory/warehouse-stock${warehouseFilter ? `?warehouseId=${warehouseFilter}` : ''}`; break;
        case 'location': endpoint = `/inventory/warehouse-locations?pageSize=500`; break;
        case 'transfer': endpoint = `/inventory/transfers?pageSize=500`; break;
        case 'reservation': endpoint = `/inventory/batches?pageSize=500`; break;
        case 'movement': endpoint = `/inventory/stock-movements?pageSize=500`; break;
      }
      const result: any = await apiRequest(endpoint);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, warehouseFilter]);

  useEffect(() => { void load(); }, [load]);

  const exportCSV = () => {
    if (!data) {return;}
    let csv = '';
    const rows = data.data || data || [];

    if (reportType === 'summary') {
      csv = 'Metric,Value\n';
      csv += `Total Warehouses,${(data as any).totalWarehouses || 0}\n`;
      csv += `Total Godowns,${(data as any).totalGodowns || 0}\n`;
      csv += `Total Locations,${(data as any).totalLocations || 0}\n`;
      csv += `Stock Value,${(data as any).totalStockValue || 0}\n`;
      csv += `Total Transfers,${(data as any).totalTransfers || 0}\n`;
      csv += `Pending Transfers,${(data as any).pendingTransfers || 0}\n`;
    } else if (Array.isArray(rows) && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      csv = `${headers.join(',')  }\n`;
      rows.forEach((row: any) => {
        csv += `${headers.map((h) => String(row[h] ?? '')).join(',')  }\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (!data) {return <p className="text-center text-sm text-muted-foreground py-8">No data available</p>;}

    if (reportType === 'summary') {
      const stats = [
        { label: 'Total Warehouses', value: (data as any).totalWarehouses ?? 0 },
        { label: 'Total Godowns', value: (data as any).totalGodowns ?? 0 },
        { label: 'Total Locations', value: (data as any).totalLocations ?? 0 },
        { label: 'Stock Value', value: (data as any).totalStockValue ?? 0 },
        { label: 'Total Transfers', value: (data as any).totalTransfers ?? 0 },
        { label: 'Pending Transfers', value: (data as any).pendingTransfers ?? 0 },
      ];
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">{typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}</p>
            </div>
          ))}
        </div>
      );
    }

    // For simple array data
    const rows = data.data || data;
    if (!Array.isArray(rows) || rows.length === 0) {
      return <p className="text-center text-sm text-muted-foreground py-8">No data found</p>;
    }

    const headers = Object.keys(rows[0]);
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {h.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.slice(0, 100).map((row: any, idx: number) => (
                <tr key={idx} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{idx + 1}</td>
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2.5 text-sm">
                      {typeof row[h] === 'boolean' ? (row[h] ? 'Yes' : 'No') : String(row[h] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && (
          <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
            Showing 100 of {rows.length} records. Use CSV export for full data.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Warehouse Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">{reportMeta[reportType].description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={!data}
            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => load()} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(reportMeta) as ReportType[]).map((type) => {
          const meta = reportMeta[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                reportType === type
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : 'bg-card hover:bg-muted/50 hover:shadow-sm'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                reportType === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-medium leading-tight">{meta.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters for stock report */}
      {reportType === 'stock' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by Warehouse ID"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading report...</p>
          </div>
        </div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
