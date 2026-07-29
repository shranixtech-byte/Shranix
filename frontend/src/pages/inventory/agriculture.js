import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
// ── Near Expiry ─────────────────────────────────────────
const nearExpiryColumns = [
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'expDate', label: 'Expiry', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'quantity', label: 'Qty' },
    { key: 'daysRemaining', label: 'Days Left', render: (v) => {
            const d = Number(v);
            return _jsxs("span", { className: d <= 15 ? 'text-red-600 font-semibold' : d <= 30 ? 'text-amber-600 font-semibold' : 'text-emerald-600', children: [d, "d"] });
        } },
    { key: 'warehouseId', label: 'Warehouse' },
];
const nearExpiryFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'expDate', label: 'Expiry Date', type: 'date', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'daysRemaining', label: 'Days Remaining', type: 'number' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
];
export function NearExpiryPage() {
    return (_jsx(MasterDataPage, { title: "Near Expiry Products", description: "Track products approaching their expiry date for timely action", columns: nearExpiryColumns, apiPath: "/inventory/batches", formFields: nearExpiryFields }));
}
// ── Damage Register ──────────────────────────────────────
const damageColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty' },
    { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (v) => String(v) === 'approved' ? '✅ Approved' : String(v) === 'rejected' ? '❌ Rejected' : '⏳ Pending' },
];
const damageFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'quantity', label: 'Damaged Quantity', type: 'number', required: true },
    { name: 'rate', label: 'Rate', type: 'number' },
    { name: 'reason', label: 'Damage Reason', type: 'textarea', required: true },
    { name: 'referenceType', label: 'Reference Type', type: 'text' },
    { name: 'referenceId', label: 'Reference ID', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
        ] },
];
export function DamageRegisterPage() {
    return (_jsx(MasterDataPage, { title: "Damage Register", description: "Record and track damaged inventory for insurance claims and write-offs", columns: damageColumns, apiPath: "/inventory/damage-register", formFields: damageFields }));
}
// ── Recall Register ──────────────────────────────────────
const recallColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty' },
    { key: 'reason', label: 'Reason' },
    { key: 'notifiedBy', label: 'Notified By' },
    { key: 'status', label: 'Status', render: (v) => String(v) === 'completed' ? '✅ Completed' : String(v) === 'in_progress' ? '🔄 In Progress' : '⏳ Open' },
];
const recallFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'quantity', label: 'Quantity to Recall', type: 'number', required: true },
    { name: 'reason', label: 'Recall Reason', type: 'textarea', required: true },
    { name: 'notifiedBy', label: 'Notified By', type: 'text' },
    { name: 'referenceType', label: 'Reference Type', type: 'text' },
    { name: 'referenceId', label: 'Reference ID', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Open', value: 'open' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
        ] },
];
export function RecallRegisterPage() {
    return (_jsx(MasterDataPage, { title: "Recall Register", description: "Manage product recalls for quality, safety, and compliance", columns: recallColumns, apiPath: "/inventory/recall-register", formFields: recallFields }));
}
// ── Distributor Return Queue ─────────────────────────────
const returnColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty' },
    { key: 'distributorName', label: 'Distributor' },
    { key: 'expectedDate', label: 'Expected', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'status', label: 'Status', render: (v) => String(v) === 'resolved' ? '✅ Resolved' : String(v) === 'in_progress' ? '🔄 In Progress' : '⏳ Pending' },
];
const returnFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'quantity', label: 'Return Quantity', type: 'number', required: true },
    { name: 'reason', label: 'Return Reason', type: 'textarea' },
    { name: 'distributorName', label: 'Distributor Name', type: 'text' },
    { name: 'distributorId', label: 'Distributor ID', type: 'text' },
    { name: 'expectedDate', label: 'Expected Return Date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Pending', value: 'pending' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Resolved', value: 'resolved' },
        ] },
];
export function DistributorReturnsPage() {
    return (_jsx(MasterDataPage, { title: "Distributor Return Queue", description: "Track and manage returns from distributors with replacement and resolution workflow", columns: returnColumns, apiPath: "/inventory/distributor-returns", formFields: returnFields }));
}
// ── Replacement Queue ────────────────────────────────────
const replacementColumns = [
    { key: 'createdAt', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'itemId', label: 'Item' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'quantity', label: 'Qty' },
    { key: 'distributorName', label: 'Distributor' },
    { key: 'expectedDate', label: 'Expected', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { key: 'status', label: 'Status', render: (v) => String(v) === 'completed' ? '✅ Completed' : String(v) === 'in_progress' ? '🔄 In Progress' : '⏳ Pending' },
];
const replacementFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'originalReturnId', label: 'Original Return ID', type: 'text' },
    { name: 'quantity', label: 'Replacement Quantity', type: 'number', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea' },
    { name: 'distributorName', label: 'Distributor Name', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Pending', value: 'pending' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
        ] },
    { name: 'expectedDate', label: 'Expected Date', type: 'date' },
];
export function ReplacementQueuePage() {
    return (_jsx(MasterDataPage, { title: "Replacement Queue", description: "Track product replacements issued to distributors for returned or damaged goods", columns: replacementColumns, apiPath: "/inventory/replacement-queue", formFields: replacementFields }));
}
//# sourceMappingURL=agriculture.js.map