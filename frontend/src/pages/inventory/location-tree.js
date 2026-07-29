import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Warehouse, Building2, Layers, Grid3X3, Box, ChevronRight, ChevronDown, Plus, RefreshCw, Search, MapPin, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
export function LocationTreePage() {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [search, setSearch] = useState('');
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [locResult, whResult] = await Promise.all([
                apiRequest('/inventory/warehouse-locations?pageSize=1000'),
                apiRequest('/warehouses?pageSize=1000'),
            ]);
            const locData = (locResult?.data || locResult || []);
            const whData = (whResult?.data || whResult || []);
            const whMap = {};
            (Array.isArray(whData) ? whData : []).forEach((w) => { whMap[w.id] = w.name || w.code; });
            setNodes((Array.isArray(locData) ? locData : []).map((n) => ({
                id: n.id || '',
                warehouseId: n.warehouseId || '',
                warehouseName: whMap[n.warehouseId] || n.warehouseId,
                godown: n.godown || '',
                rack: n.rack || '',
                shelf: n.shelf || '',
                bin: n.bin || '',
                locationCode: n.locationCode || '',
                isActive: n.isActive !== false,
            })));
        }
        catch {
            setNodes([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    // Group locations by hierarchy
    const grouped = new Map();
    nodes
        .filter((n) => !search || n.locationCode.toLowerCase().includes(search.toLowerCase()) || n.godown.toLowerCase().includes(search.toLowerCase()) || n.rack.toLowerCase().includes(search.toLowerCase()) || n.shelf.toLowerCase().includes(search.toLowerCase()) || n.bin.toLowerCase().includes(search.toLowerCase()) || n.warehouseName?.toLowerCase().includes(search.toLowerCase()))
        .forEach((n) => {
        if (!grouped.has(n.warehouseId)) {
            grouped.set(n.warehouseId, { warehouseId: n.warehouseId, warehouseName: n.warehouseName || n.warehouseId, godowns: new Map() });
        }
        const wh = grouped.get(n.warehouseId);
        if (!wh.godowns.has(n.godown)) {
            wh.godowns.set(n.godown, { racks: new Map() });
        }
        const gd = wh.godowns.get(n.godown);
        if (!gd.racks.has(n.rack)) {
            gd.racks.set(n.rack, { shelves: new Map() });
        }
        const rk = gd.racks.get(n.rack);
        if (!rk.shelves.has(n.shelf)) {
            rk.shelves.set(n.shelf, { bins: [] });
        }
        rk.shelves.get(n.shelf).bins.push(n);
    });
    const toggle = (key) => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading location tree..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Location Hierarchy Tree" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Explore warehouse locations \u2014 Warehouse \u2192 Godown \u2192 Rack \u2192 Shelf \u2192 Bin" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => load(), className: "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all hover:bg-muted active:scale-[0.98]", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Refresh"] }), _jsxs("button", { onClick: () => navigate('/inventory/warehouse-locations'), className: "flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]", children: [_jsx(Plus, { className: "h-4 w-4" }), "Manage Locations"] })] })] }), _jsxs("div", { className: "relative max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search warehouse, godown, rack, shelf, bin...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none ring-0 transition-all focus:border-primary focus:ring-1 focus:ring-primary" })] }), _jsx("div", { className: "space-y-4", children: Array.from(grouped.entries()).length === 0 ? (_jsxs("div", { className: "flex flex-col items-center py-16 text-center", children: [_jsx(MapPin, { className: "h-12 w-12 text-muted-foreground/30" }), _jsx("p", { className: "mt-4 text-sm font-medium text-muted-foreground", children: "No locations found" }), _jsx("p", { className: "text-xs text-muted-foreground/60", children: "Create warehouse locations to see the hierarchy tree" })] })) : (Array.from(grouped.entries()).map(([whId, wh]) => (_jsxs("div", { className: "overflow-hidden rounded-2xl border bg-card shadow-sm", children: [_jsxs("button", { onClick: () => toggle(`wh-${whId}`), className: "flex w-full items-center gap-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 px-5 py-4 text-left transition-colors hover:from-blue-50 hover:to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30", children: [expanded[`wh-${whId}`] ? (_jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-primary" })) : (_jsx(ChevronRight, { className: "h-4 w-4 shrink-0 text-muted-foreground" })), _jsx(Warehouse, { className: "h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-sm font-semibold", children: wh.warehouseName || whId }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [wh.godowns.size, " godowns"] })] }), _jsxs("span", { className: "shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300", children: [nodes.filter((n) => n.warehouseId === whId).length, " locations"] })] }), expanded[`wh-${whId}`] && (_jsx("div", { className: "border-t px-4 pb-4 pt-2", children: Array.from(wh.godowns.entries()).length === 0 ? (_jsx("p", { className: "py-4 text-center text-xs text-muted-foreground", children: "No godowns configured" })) : (Array.from(wh.godowns.entries()).map(([godownName, gd]) => (_jsxs("div", { className: "ml-4 mt-2", children: [_jsxs("button", { onClick: () => toggle(`gd-${whId}-${godownName}`), className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50", children: [expanded[`gd-${whId}-${godownName}`] ? (_jsx(ChevronDown, { className: "h-3.5 w-3.5 shrink-0 text-emerald-600" })) : (_jsx(ChevronRight, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })), _jsx(Building2, { className: "h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" }), _jsx("span", { className: "text-sm font-medium", children: godownName || '(Unnamed Godown)' }), _jsxs("span", { className: "ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", children: [Array.from(gd.racks.values()).reduce((s, r) => s + r.shelves.size, 0), " shelves"] })] }), expanded[`gd-${whId}-${godownName}`] && (_jsx("div", { className: "ml-8 mt-1 space-y-1", children: Array.from(gd.racks.entries()).length === 0 ? (_jsx("p", { className: "py-2 text-center text-xs text-muted-foreground", children: "No racks configured" })) : (Array.from(gd.racks.entries()).map(([rackName, rk]) => (_jsxs("div", { children: [_jsxs("button", { onClick: () => toggle(`rk-${whId}-${godownName}-${rackName}`), className: "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/30", children: [expanded[`rk-${whId}-${godownName}-${rackName}`] ? (_jsx(ChevronDown, { className: "h-3 w-3 shrink-0 text-amber-600" })) : (_jsx(ChevronRight, { className: "h-3 w-3 shrink-0 text-muted-foreground" })), _jsx(Layers, { className: "h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" }), _jsx("span", { className: "text-xs font-medium", children: rackName || '(Unnamed Rack)' })] }), expanded[`rk-${whId}-${godownName}-${rackName}`] && (_jsx("div", { className: "ml-8 mt-1 space-y-1", children: Array.from(rk.shelves.entries()).length === 0 ? (_jsx("p", { className: "py-2 text-center text-xs text-muted-foreground", children: "No shelves configured" })) : (Array.from(rk.shelves.entries()).map(([shelfName, sh]) => (_jsxs("div", { children: [_jsxs("button", { onClick: () => toggle(`sh-${whId}-${godownName}-${rackName}-${shelfName}`), className: "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/20", children: [expanded[`sh-${whId}-${godownName}-${rackName}-${shelfName}`] ? (_jsx(ChevronDown, { className: "h-3 w-3 shrink-0 text-violet-600" })) : (_jsx(ChevronRight, { className: "h-3 w-3 shrink-0 text-muted-foreground" })), _jsx(Grid3X3, { className: "h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" }), _jsx("span", { className: "text-xs font-medium", children: shelfName || '(Unnamed Shelf)' }), _jsxs("span", { className: "ml-auto text-[10px] text-muted-foreground", children: [sh.bins.length, " bins"] })] }), expanded[`sh-${whId}-${godownName}-${rackName}-${shelfName}`] && (_jsx("div", { className: "ml-10 mt-1 space-y-1", children: sh.bins.length === 0 ? (_jsx("p", { className: "py-1.5 text-center text-xs text-muted-foreground", children: "No bins configured" })) : (sh.bins.map((bin) => (_jsxs("div", { className: "flex items-center gap-2.5 rounded-lg bg-muted/20 px-3 py-1.5", children: [_jsx(Box, { className: "h-3.5 w-3.5 shrink-0 text-slate-400" }), _jsx("span", { className: "text-xs", children: bin.bin || '(Unnamed Bin)' }), bin.locationCode && (_jsx("span", { className: "rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground", children: bin.locationCode })), _jsx("span", { className: "ml-auto", children: bin.isActive ? (_jsxs("span", { className: "flex items-center gap-1 text-[10px] text-emerald-600", children: [_jsx(ToggleRight, { className: "h-3 w-3" }), " Active"] })) : (_jsxs("span", { className: "flex items-center gap-1 text-[10px] text-red-500", children: [_jsx(ToggleLeft, { className: "h-3 w-3" }), " Inactive"] })) })] }, bin.id)))) }))] }, shelfName)))) }))] }, rackName)))) }))] }, godownName)))) }))] }, whId)))) })] }));
}
//# sourceMappingURL=location-tree.js.map