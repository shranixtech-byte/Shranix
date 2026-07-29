import { Warehouse, Building2, Layers, Grid3X3, Box, ChevronRight, ChevronDown, Plus, RefreshCw, Search, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiRequest } from '@/services/api-client';

interface LocationNode {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  godown: string;
  rack: string;
  shelf: string;
  bin: string;
  locationCode: string;
  isActive: boolean;
}

interface GroupedLocation {
  warehouseId: string;
  warehouseName: string;
  godowns: Map<string, {
    racks: Map<string, {
      shelves: Map<string, { bins: LocationNode[] }>;
    }>;
  }>;
}

export function LocationTreePage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locResult, whResult] = await Promise.all([
        apiRequest('/inventory/warehouse-locations?pageSize=1000'),
        apiRequest('/warehouses?pageSize=1000'),
      ]);
      const locData = ((locResult as any)?.data || locResult || []) as any[];
      const whData = ((whResult as any)?.data || whResult || []) as any[];
      const whMap: Record<string, string> = {};
      (Array.isArray(whData) ? whData : []).forEach((w: any) => { whMap[w.id] = w.name || w.code; });
      setNodes(
        (Array.isArray(locData) ? locData : []).map((n: any) => ({
          id: n.id || '',
          warehouseId: n.warehouseId || '',
          warehouseName: whMap[n.warehouseId] || n.warehouseId,
          godown: n.godown || '',
          rack: n.rack || '',
          shelf: n.shelf || '',
          bin: n.bin || '',
          locationCode: n.locationCode || '',
          isActive: n.isActive !== false,
        }))
      );
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Group locations by hierarchy
  const grouped = new Map<string, GroupedLocation>();
  nodes
    .filter((n) => !search || n.locationCode.toLowerCase().includes(search.toLowerCase()) || n.godown.toLowerCase().includes(search.toLowerCase()) || n.rack.toLowerCase().includes(search.toLowerCase()) || n.shelf.toLowerCase().includes(search.toLowerCase()) || n.bin.toLowerCase().includes(search.toLowerCase()) || n.warehouseName?.toLowerCase().includes(search.toLowerCase()))
    .forEach((n) => {
      if (!grouped.has(n.warehouseId)) {
        grouped.set(n.warehouseId, { warehouseId: n.warehouseId, warehouseName: n.warehouseName || n.warehouseId, godowns: new Map() });
      }
      const wh = grouped.get(n.warehouseId)!;
      if (!wh.godowns.has(n.godown)) {
        wh.godowns.set(n.godown, { racks: new Map() });
      }
      const gd = wh.godowns.get(n.godown)!;
      if (!gd.racks.has(n.rack)) {
        gd.racks.set(n.rack, { shelves: new Map() });
      }
      const rk = gd.racks.get(n.rack)!;
      if (!rk.shelves.has(n.shelf)) {
        rk.shelves.set(n.shelf, { bins: [] });
      }
      rk.shelves.get(n.shelf)!.bins.push(n);
    });

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading location tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Location Hierarchy Tree</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explore warehouse locations — Warehouse → Godown → Rack → Shelf → Bin</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load()}
            className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/inventory/warehouse-locations')}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Manage Locations
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search warehouse, godown, rack, shelf, bin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-4">
        {Array.from(grouped.entries()).length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">No locations found</p>
            <p className="text-xs text-muted-foreground/60">Create warehouse locations to see the hierarchy tree</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([whId, wh]) => (
            <div key={whId} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              {/* Warehouse Header */}
              <button
                onClick={() => toggle(`wh-${whId}`)}
                className="flex w-full items-center gap-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 px-5 py-4 text-left transition-colors hover:from-blue-50 hover:to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30"
              >
                {expanded[`wh-${whId}`] ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <Warehouse className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{wh.warehouseName || whId}</p>
                  <p className="text-xs text-muted-foreground">{wh.godowns.size} godowns</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {nodes.filter((n) => n.warehouseId === whId).length} locations
                </span>
              </button>

              {expanded[`wh-${whId}`] && (
                <div className="border-t px-4 pb-4 pt-2">
                  {Array.from(wh.godowns.entries()).length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">No godowns configured</p>
                  ) : (
                    Array.from(wh.godowns.entries()).map(([godownName, gd]) => (
                      <div key={godownName} className="ml-4 mt-2">
                        <button
                          onClick={() => toggle(`gd-${whId}-${godownName}`)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                        >
                          {expanded[`gd-${whId}-${godownName}`] ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <Building2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-medium">{godownName || '(Unnamed Godown)'}</span>
                          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            {Array.from(gd.racks.values()).reduce((s, r) => s + r.shelves.size, 0)} shelves
                          </span>
                        </button>

                        {expanded[`gd-${whId}-${godownName}`] && (
                          <div className="ml-8 mt-1 space-y-1">
                            {Array.from(gd.racks.entries()).length === 0 ? (
                              <p className="py-2 text-center text-xs text-muted-foreground">No racks configured</p>
                            ) : (
                              Array.from(gd.racks.entries()).map(([rackName, rk]) => (
                                <div key={rackName}>
                                  <button
                                    onClick={() => toggle(`rk-${whId}-${godownName}-${rackName}`)}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/30"
                                  >
                                    {expanded[`rk-${whId}-${godownName}-${rackName}`] ? (
                                      <ChevronDown className="h-3 w-3 shrink-0 text-amber-600" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    )}
                                    <Layers className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-medium">{rackName || '(Unnamed Rack)'}</span>
                                  </button>

                                  {expanded[`rk-${whId}-${godownName}-${rackName}`] && (
                                    <div className="ml-8 mt-1 space-y-1">
                                      {Array.from(rk.shelves.entries()).length === 0 ? (
                                        <p className="py-2 text-center text-xs text-muted-foreground">No shelves configured</p>
                                      ) : (
                                        Array.from(rk.shelves.entries()).map(([shelfName, sh]) => (
                                          <div key={shelfName}>
                                            <button
                                              onClick={() => toggle(`sh-${whId}-${godownName}-${rackName}-${shelfName}`)}
                                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/20"
                                            >
                                              {expanded[`sh-${whId}-${godownName}-${rackName}-${shelfName}`] ? (
                                                <ChevronDown className="h-3 w-3 shrink-0 text-violet-600" />
                                              ) : (
                                                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                              )}
                                              <Grid3X3 className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                                              <span className="text-xs font-medium">{shelfName || '(Unnamed Shelf)'}</span>
                                              <span className="ml-auto text-[10px] text-muted-foreground">{sh.bins.length} bins</span>
                                            </button>

                                            {expanded[`sh-${whId}-${godownName}-${rackName}-${shelfName}`] && (
                                              <div className="ml-10 mt-1 space-y-1">
                                                {sh.bins.length === 0 ? (
                                                  <p className="py-1.5 text-center text-xs text-muted-foreground">No bins configured</p>
                                                ) : (
                                                  sh.bins.map((bin) => (
                                                    <div key={bin.id} className="flex items-center gap-2.5 rounded-lg bg-muted/20 px-3 py-1.5">
                                                      <Box className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                      <span className="text-xs">{bin.bin || '(Unnamed Bin)'}</span>
                                                      {bin.locationCode && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                                                          {bin.locationCode}
                                                        </span>
                                                      )}
                                                      <span className="ml-auto">
                                                        {bin.isActive ? (
                                                          <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                                                            <ToggleRight className="h-3 w-3" /> Active
                                                          </span>
                                                        ) : (
                                                          <span className="flex items-center gap-1 text-[10px] text-red-500">
                                                            <ToggleLeft className="h-3 w-3" /> Inactive
                                                          </span>
                                                        )}
                                                      </span>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
