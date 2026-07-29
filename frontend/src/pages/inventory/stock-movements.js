import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
const movementColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'movementType', label: 'Type', render: (v) => {
            const types = {
                purchase_receipt: '📥 Purchase', sales_delivery: '📤 Sales',
                sales_return: '↩️ Sales Return', purchase_return: '↩️ Purchase Return',
                stock_adjustment: '⚖️ Adjustment', damage: '💔 Damage',
                transfer: '🔄 Transfer', opening: '📦 Opening', correction: '✏️ Correction',
            };
            return types[String(v)] || String(v);
        } },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty', render: (v, r) => {
            const isIn = ['purchase_receipt', 'sales_return', 'opening', 'correction'].includes(String(r.movementType));
            return _jsxs("span", { className: isIn ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium', children: [isIn ? '+' : '-', Number(v).toFixed(0)] });
        } },
    { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'afterQuantity', label: 'Balance' },
    { key: 'referenceType', label: 'Reference' },
    { key: 'reason', label: 'Reason' },
];
const movementFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'movementType', label: 'Movement Type', type: 'select', required: true, options: [
            { label: 'Purchase Receipt', value: 'purchase_receipt' },
            { label: 'Sales Delivery', value: 'sales_delivery' },
            { label: 'Sales Return', value: 'sales_return' },
            { label: 'Purchase Return', value: 'purchase_return' },
            { label: 'Stock Adjustment', value: 'stock_adjustment' },
            { label: 'Damage', value: 'damage' },
            { label: 'Transfer', value: 'transfer' },
            { label: 'Opening Stock', value: 'opening' },
            { label: 'Manual Correction', value: 'correction' },
        ] },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'rate', label: 'Rate', type: 'number' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'referenceType', label: 'Reference Type', type: 'text' },
    { name: 'referenceId', label: 'Reference ID', type: 'text' },
    { name: 'beforeQuantity', label: 'Qty Before', type: 'number' },
    { name: 'afterQuantity', label: 'Qty After', type: 'number' },
    { name: 'reason', label: 'Reason / Notes', type: 'textarea' },
];
export function StockMovementsPage() {
    return (_jsx(MasterDataPage, { title: "Stock Movements", description: "Complete audit trail of every stock change \u2014 purchases, sales, adjustments, transfers, and corrections", columns: movementColumns, apiPath: "/inventory/stock-movements", formFields: movementFields }));
}
//# sourceMappingURL=stock-movements.js.map