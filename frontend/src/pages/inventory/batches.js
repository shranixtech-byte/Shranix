import { jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
const batchColumns = [
    { key: 'batchNo', label: 'Batch No' },
    { key: 'itemId', label: 'Item ID' },
    { key: 'lotNo', label: 'Lot No' },
    { key: 'quantity', label: 'Qty' },
    { key: 'availableQuantity', label: 'Available' },
    { key: 'purchaseRate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'mrp', label: 'MRP ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'expDate', label: 'Expiry' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const batchFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'batchNo', label: 'Batch Number', type: 'text', required: true },
    { name: 'lotNo', label: 'Lot Number', type: 'text' },
    { name: 'mfgDate', label: 'Manufacturing Date', type: 'date' },
    { name: 'expDate', label: 'Expiry Date', type: 'date' },
    { name: 'shelfLife', label: 'Shelf Life', type: 'text' },
    { name: 'purchaseRate', label: 'Purchase Rate', type: 'number' },
    { name: 'mrp', label: 'MRP', type: 'number' },
    { name: 'sellingPrice', label: 'Selling Price', type: 'number' },
    { name: 'distributorPrice', label: 'Distributor Price', type: 'number' },
    { name: 'retailPrice', label: 'Retail Price', type: 'number' },
    { name: 'quantity', label: 'Current Quantity', type: 'number' },
    { name: 'reservedQuantity', label: 'Reserved Quantity', type: 'number' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'locationCode', label: 'Location Code', type: 'text' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
];
export function BatchesPage() {
    return (_jsx(MasterDataPage, { title: "Batches", description: "Enterprise batch management with lot tracking, shelf life, expiry, and multi-tier pricing", columns: batchColumns, apiPath: "/inventory/batches", formFields: batchFields }));
}
//# sourceMappingURL=batches.js.map