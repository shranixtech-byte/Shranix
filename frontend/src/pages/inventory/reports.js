import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
// ── Inventory Summary ───────────────────────────────────
const summaryColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'sku', label: 'SKU' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'stockValue', label: 'Stock Value ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'movementCount', label: 'Movements' },
    { key: 'lastMovementDate', label: 'Last Movement', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
];
const summaryFields = [
    { name: 'itemId', label: 'Item ID', type: 'text' },
    { name: 'sku', label: 'SKU', type: 'text' },
];
export function InventorySummaryPage() {
    return (_jsx(MasterDataPage, { title: "Inventory Summary", description: "Overview of all inventory items with stock levels, values, and movement activity", columns: summaryColumns, apiPath: "/inventory/items", formFields: summaryFields }));
}
// ── Stock Ledger ────────────────────────────────────────
const stockLedgerColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'movementType', label: 'Type' },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty', render: (v, r) => {
            const isIn = ['purchase_receipt', 'sales_return', 'opening', 'correction'].includes(String(r.movementType));
            return _jsxs("span", { className: isIn ? 'text-emerald-600' : 'text-red-600', children: [isIn ? '+' : '-', Number(v).toFixed(0)] });
        } },
    { key: 'beforeQuantity', label: 'Before' },
    { key: 'afterQuantity', label: 'After' },
    { key: 'referenceType', label: 'Doc Type' },
    { key: 'reason', label: 'Reason' },
];
const stockLedgerFields = [
    { name: 'itemId', label: 'Item ID', type: 'text' },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
];
export function StockLedgerPage() {
    return (_jsx(MasterDataPage, { title: "Stock Ledger", description: "Complete chronological record of all stock movements with before/after quantities", columns: stockLedgerColumns, apiPath: "/inventory/stock-movements", formFields: stockLedgerFields }));
}
// ── Batch Ledger ────────────────────────────────────────
const batchLedgerColumns = [
    { key: 'batchNo', label: 'Batch' },
    { key: 'itemId', label: 'Item' },
    { key: 'lotNo', label: 'Lot' },
    { key: 'quantity', label: 'Stock' },
    { key: 'purchaseRate', label: 'Cost ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'mfgDate', label: 'Mfg', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'expDate', label: 'Expiry', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'shelfLife', label: 'Shelf Life' },
];
const batchLedgerFields = [
    { name: 'itemId', label: 'Item ID', type: 'text' },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
];
export function BatchLedgerPage() {
    return (_jsx(MasterDataPage, { title: "Batch Ledger", description: "Detailed view of all batches with manufacturing dates, expiry, cost, and stock levels", columns: batchLedgerColumns, apiPath: "/inventory/batches", formFields: batchLedgerFields }));
}
// ── Expiry Report ───────────────────────────────────────
const expiryColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'expDate', label: 'Expiry', render: (v) => {
            const d = v ? new Date(v) : null;
            if (!d) {
                return '—';
            }
            const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const color = days <= 0 ? 'text-red-600 font-bold' : days <= 15 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-emerald-600';
            return _jsxs("span", { className: color, children: [d.toLocaleDateString('en-IN'), " (", days > 0 ? `${days}d` : 'Expired', ")"] });
        } },
    { key: 'quantity', label: 'Qty at Risk' },
    { key: 'warehouseId', label: 'Warehouse' },
];
export function ExpiryReportPage() {
    return (_jsx(MasterDataPage, { title: "Expiry Report", description: "Monitor product expiry dates to minimize waste and manage near-expiry stock", columns: expiryColumns, apiPath: "/inventory/batches", formFields: [] }));
}
// ── Movement Report ─────────────────────────────────────
const movementReportColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'movementType', label: 'Type' },
    { key: 'itemId', label: 'Item' },
    { key: 'warehouseId', label: 'Warehouse' },
    { key: 'quantity', label: 'Qty' },
    { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'referenceType', label: 'Reference' },
];
export function MovementReportPage() {
    return (_jsx(MasterDataPage, { title: "Movement Report", description: "Analyze inventory movement patterns by type, item, and warehouse", columns: movementReportColumns, apiPath: "/inventory/stock-movements", formFields: [] }));
}
// ── Valuation Report ────────────────────────────────────
const valuationColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'sku', label: 'SKU' },
    { key: 'currentStock', label: 'Stock' },
    { key: 'purchaseRate', label: 'Avg Cost ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'stockValue', label: 'Value ₹', render: (v, r) => `₹${(Number(r.currentStock || 0) * Number(v || 0)).toFixed(2)}` },
    { key: 'reorderLevel', label: 'Reorder' },
];
export function ValuationReportPage() {
    return (_jsx(MasterDataPage, { title: "Valuation Report", description: "Inventory valuation based on cost price, FIFO, or weighted average method", columns: valuationColumns, apiPath: "/inventory/items", formFields: [] }));
}
// ── Warehouse Report ────────────────────────────────────
const warehouseReportColumns = [
    { key: 'warehouseId', label: 'Warehouse' },
    { key: 'totalItems', label: 'Total Items' },
    { key: 'totalStock', label: 'Total Stock' },
    { key: 'lowStockCount', label: 'Low Stock' },
    { key: 'nearExpiryCount', label: 'Near Expiry' },
    { key: 'stockValue', label: 'Value ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
];
export function WarehouseReportPage() {
    return (_jsx(MasterDataPage, { title: "Warehouse Report", description: "Stock distribution and health metrics by warehouse location", columns: warehouseReportColumns, apiPath: "/inventory/stock-movements", formFields: [] }));
}
// ── Dead Stock Report ───────────────────────────────────
const deadStockColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'sku', label: 'SKU' },
    { key: 'currentStock', label: 'Stock' },
    { key: 'stockValue', label: 'Value ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'lastMovementDate', label: 'Last Movement', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : 'No movement' },
    { key: 'daysSinceMovement', label: 'Days Inactive', render: (v) => {
            const d = Number(v);
            return _jsxs("span", { className: d > 180 ? 'text-red-600 font-semibold' : d > 90 ? 'text-amber-500' : 'text-slate-500', children: [d, "d"] });
        } },
];
export function DeadStockPage() {
    return (_jsx(MasterDataPage, { title: "Dead Stock Report", description: "Identify slow-moving and non-moving inventory that may need write-off or discount", columns: deadStockColumns, apiPath: "/inventory/items", formFields: [] }));
}
// ── Fast Moving Report ──────────────────────────────────
const fastMovingColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'sku', label: 'SKU' },
    { key: 'currentStock', label: 'Stock' },
    { key: 'reorderLevel', label: 'Reorder' },
    { key: 'monthlyMovement', label: 'Monthly Movement' },
    { key: 'stockValue', label: 'Value ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
];
export function FastMovingPage() {
    return (_jsx(MasterDataPage, { title: "Fast Moving Report", description: "High-turnover inventory items that require frequent replenishment", columns: fastMovingColumns, apiPath: "/inventory/items", formFields: [] }));
}
// ── Slow Moving Report ──────────────────────────────────
const slowMovingColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'sku', label: 'SKU' },
    { key: 'currentStock', label: 'Stock' },
    { key: 'stockValue', label: 'Value ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'monthlyMovement', label: 'Monthly' },
    { key: 'daysSinceSale', label: 'Days Since Sale', render: (v) => {
            const d = Number(v);
            return _jsxs("span", { className: d > 90 ? 'text-amber-600' : 'text-slate-500', children: [d, "d"] });
        } },
];
export function SlowMovingPage() {
    return (_jsx(MasterDataPage, { title: "Slow Moving Report", description: "Low-turnover items that may indicate overstocking or declining demand", columns: slowMovingColumns, apiPath: "/inventory/items", formFields: [] }));
}
//# sourceMappingURL=reports.js.map