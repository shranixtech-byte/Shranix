import { jsx as _jsx } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
// ═════════════════════════════════════════════════════════
// 1. ITEMS (Enterprise Item Master)
// ═════════════════════════════════════════════════════════
const itemColumns = [
    { key: 'name', label: 'Item Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'hsnCode', label: 'HSN' },
    { key: 'purchaseRate', label: 'Purchase ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'salesRate', label: 'Sales ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'mrp', label: 'MRP ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'currentStock', label: 'Stock' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const itemFields = [
    { name: 'name', label: 'Item Name', type: 'text', required: true },
    { name: 'sku', label: 'SKU Code', type: 'text', required: true },
    { name: 'shortName', label: 'Short Name', type: 'text' },
    { name: 'type', label: 'Type', type: 'select', options: [
            { label: 'Product', value: 'product' }, { label: 'Service', value: 'service' },
            { label: 'Raw Material', value: 'raw_material' }, { label: 'Packaging', value: 'packaging' },
            { label: 'Consumable', value: 'consumable' }, { label: 'Asset', value: 'asset' },
        ] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'categoryId', label: 'Category', type: 'text' },
    { name: 'brandId', label: 'Brand', type: 'text' },
    { name: 'unitId', label: 'Unit', type: 'text' },
    { name: 'hsnCode', label: 'HSN Code', type: 'text' },
    { name: 'productCode', label: 'Product Code', type: 'text' },
    { name: 'qrCode', label: 'QR Code', type: 'text' },
    { name: 'subCategoryId', label: 'Sub Category', type: 'text' },
    { name: 'packSize', label: 'Pack Size', type: 'text' },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { name: 'supplierId', label: 'Supplier ID', type: 'text' },
    { name: 'gstRateId', label: 'GST Rate', type: 'text' },
    { name: 'purchaseRate', label: 'Purchase Rate', type: 'number' },
    { name: 'salesRate', label: 'Sales Rate', type: 'number' },
    { name: 'mrp', label: 'MRP', type: 'number' },
    { name: 'openingStock', label: 'Opening Stock', type: 'number' },
    { name: 'minStock', label: 'Min Stock', type: 'number' },
    { name: 'maxStock', label: 'Max Stock', type: 'number' },
    { name: 'reorderLevel', label: 'Reorder Level', type: 'number' },
    { name: 'hasBatch', label: 'Batch Tracking', type: 'boolean' },
    { name: 'hasSerial', label: 'Serial Tracking', type: 'boolean' },
    { name: 'hasExpiry', label: 'Expiry Tracking', type: 'boolean' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function ItemsPage() {
    return (_jsx(MasterDataPage, { title: "Items", description: "Enterprise item master with stock, pricing, GST, batch/serial tracking", columns: itemColumns, apiPath: "/inventory/items", formFields: itemFields }));
}
// ═════════════════════════════════════════════════════════
// 2. ITEM GROUPS
// ═════════════════════════════════════════════════════════
const groupColumns = [
    { key: 'name', label: 'Group Name' },
    { key: 'description', label: 'Description' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const groupFields = [
    { name: 'name', label: 'Group Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
];
export function ItemGroupsPage() {
    return (_jsx(MasterDataPage, { title: "Item Groups", description: "Group items for pricing and discount management", columns: groupColumns, apiPath: "/inventory/groups", formFields: groupFields }));
}
// ═════════════════════════════════════════════════════════
// 3. ITEM VARIANTS
// ═════════════════════════════════════════════════════════
const variantColumns = [
    { key: 'name', label: 'Variant Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'salesRate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const variantFields = [
    { name: 'name', label: 'Variant Name', type: 'text', required: true },
    { name: 'sku', label: 'SKU Code', type: 'text', required: true },
    { name: 'barcode', label: 'Barcode', type: 'text' },
    { name: 'purchaseRate', label: 'Purchase Rate', type: 'number' },
    { name: 'salesRate', label: 'Sales Rate', type: 'number' },
    { name: 'mrp', label: 'MRP', type: 'number' },
    { name: 'attributes', label: 'Attributes (JSON)', type: 'textarea' },
];
export function ItemVariantsPage() {
    return (_jsx(MasterDataPage, { title: "Item Variants", description: "Manage product variations (size, color, pack size)", columns: variantColumns, apiPath: "/inventory/variants", formFields: variantFields }));
}
// ═════════════════════════════════════════════════════════
// 4. ITEM PRICING
// ═════════════════════════════════════════════════════════
const pricingColumns = [
    { key: 'itemId', label: 'Item ID' },
    { key: 'priceList', label: 'Price List' },
    { key: 'salesRate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'discountPercent', label: 'Disc %' },
    { key: 'minQuantity', label: 'Min Qty' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const pricingFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'priceList', label: 'Price List', type: 'select', options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Wholesale', value: 'wholesale' },
            { label: 'Retail', value: 'retail' },
            { label: 'Promotional', value: 'promotional' },
            { label: 'Contract', value: 'contract' },
        ] },
    { name: 'purchaseRate', label: 'Purchase Rate', type: 'number' },
    { name: 'salesRate', label: 'Sales Rate', type: 'number' },
    { name: 'mrp', label: 'MRP', type: 'number' },
    { name: 'discountPercent', label: 'Discount %', type: 'number' },
    { name: 'minQuantity', label: 'Min Quantity', type: 'number' },
    { name: 'partyId', label: 'Party ID', type: 'text' },
];
export function ItemPricingPage() {
    return (_jsx(MasterDataPage, { title: "Item Pricing", description: "Tiered pricing by price list, customer group, and quantity", columns: pricingColumns, apiPath: "/inventory/pricing", formFields: pricingFields }));
}
// ═════════════════════════════════════════════════════════
// 5. ITEM BARCODES
// ═════════════════════════════════════════════════════════
const barcodeColumns = [
    { key: 'barcode', label: 'Barcode' },
    { key: 'type', label: 'Type' },
    { key: 'isDefault', label: 'Default', render: (v) => v ? '✅ Yes' : '—' },
];
const barcodeFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'barcode', label: 'Barcode', type: 'text', required: true },
    { name: 'type', label: 'Barcode Type', type: 'select', options: [
            { label: 'EAN-13', value: 'ean13' },
            { label: 'UPC', value: 'upc' },
            { label: 'Code-128', value: 'code128' },
            { label: 'QR Code', value: 'qr' },
            { label: 'Custom', value: 'custom' },
        ] },
    { name: 'isDefault', label: 'Default Barcode', type: 'boolean' },
];
export function ItemBarcodesPage() {
    return (_jsx(MasterDataPage, { title: "Item Barcodes & QR", description: "Manage barcodes, QR codes, and scanning identifiers", columns: barcodeColumns, apiPath: "/inventory/barcodes", formFields: barcodeFields }));
}
// ═════════════════════════════════════════════════════════
// 6. HSN / SAC CODES
// ═════════════════════════════════════════════════════════
const hsnColumns = [
    { key: 'code', label: 'HSN/SAC Code' },
    { key: 'description', label: 'Description' },
    { key: 'gstRate', label: 'GST Rate %' },
    { key: 'igst', label: 'IGST %' },
    { key: 'cgst', label: 'CGST %' },
    { key: 'sgst', label: 'SGST %' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const hsnFields = [
    { name: 'code', label: 'HSN/SAC Code', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'type', label: 'Type', type: 'select', options: [
            { label: 'HSN', value: 'hsn' },
            { label: 'SAC', value: 'sac' },
        ] },
    { name: 'gstRate', label: 'GST Rate %', type: 'number' },
    { name: 'igst', label: 'IGST %', type: 'number' },
    { name: 'cgst', label: 'CGST %', type: 'number' },
    { name: 'sgst', label: 'SGST %', type: 'number' },
    { name: 'cess', label: 'Cess %', type: 'number' },
    { name: 'chapter', label: 'Chapter', type: 'text' },
    { name: 'heading', label: 'Heading', type: 'text' },
];
export function HsnCodesPage() {
    return (_jsx(MasterDataPage, { title: "HSN / SAC Codes", description: "Harmonized System codes for GST compliance and customs", columns: hsnColumns, apiPath: "/inventory/hsn-codes", formFields: hsnFields }));
}
// ═════════════════════════════════════════════════════════
// 7. STOCK OPENING
// ═════════════════════════════════════════════════════════
const stockColumns = [
    { key: 'itemId', label: 'Item ID' },
    { key: 'batchNo', label: 'Batch No' },
    { key: 'quantity', label: 'Qty' },
    { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'amount', label: 'Amount ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'isPosted', label: 'Posted', render: (v) => v ? '✅ Posted' : '⏳ Pending' },
];
const stockFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse ID', type: 'text' },
    { name: 'batchNo', label: 'Batch No', type: 'text' },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'rate', label: 'Rate', type: 'number' },
    { name: 'mfgDate', label: 'Mfg Date', type: 'date' },
    { name: 'expDate', label: 'Expiry Date', type: 'date' },
    { name: 'serialNumbers', label: 'Serial Numbers', type: 'textarea' },
];
export function StockOpeningPage() {
    return (_jsx(MasterDataPage, { title: "Stock Opening", description: "Opening stock entries with batch, serial, and expiry details", columns: stockColumns, apiPath: "/inventory/stock-opening", formFields: stockFields }));
}
// ═════════════════════════════════════════════════════════
// 8. ITEM IMAGES
// ═════════════════════════════════════════════════════════
const imageColumns = [
    { key: 'itemId', label: 'Item ID' },
    { key: 'url', label: 'Image URL' },
    { key: 'isPrimary', label: 'Primary', render: (v) => v ? '⭐ Yes' : '—' },
    { key: 'sortOrder', label: 'Order' },
];
const imageFields = [
    { name: 'itemId', label: 'Item ID', type: 'text', required: true },
    { name: 'variantId', label: 'Variant ID', type: 'text' },
    { name: 'url', label: 'Image URL', type: 'text', required: true },
    { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text' },
    { name: 'alt', label: 'Alt Text', type: 'text' },
    { name: 'sortOrder', label: 'Sort Order', type: 'number' },
    { name: 'isPrimary', label: 'Primary Image', type: 'boolean' },
];
export function ItemImagesPage() {
    return (_jsx(MasterDataPage, { title: "Item Images", description: "Manage product images, thumbnails, and gallery", columns: imageColumns, apiPath: "/inventory/images", formFields: imageFields }));
}
// ═════════════════════════════════════════════════════════
// 9. INVENTORY SETTINGS
// ═════════════════════════════════════════════════════════
const settingsFields = [
    { name: 'method', label: 'Valuation Method', type: 'select', options: [
            { label: 'FIFO', value: 'fifo' },
            { label: 'LIFO', value: 'lifo' },
            { label: 'Weighted Average', value: 'weighted_average' },
            { label: 'Standard', value: 'standard' },
        ] },
    { name: 'stockValuation', label: 'Stock Valuation', type: 'select', options: [
            { label: 'Cost', value: 'cost' },
            { label: 'MRP', value: 'mrp' },
            { label: 'Sales', value: 'sales' },
        ] },
    { name: 'negativeStock', label: 'Allow Negative Stock', type: 'boolean' },
    { name: 'autoReorder', label: 'Auto Reorder', type: 'boolean' },
    { name: 'batchTracking', label: 'Batch Tracking', type: 'boolean' },
    { name: 'serialTracking', label: 'Serial Tracking', type: 'boolean' },
    { name: 'expiryTracking', label: 'Expiry Tracking', type: 'boolean' },
    { name: 'enableWarehouse', label: 'Enable Warehouse', type: 'boolean' },
    { name: 'enableBatch', label: 'Enable Batch', type: 'boolean' },
    { name: 'enableSerial', label: 'Enable Serial', type: 'boolean' },
    { name: 'enableExpiry', label: 'Enable Expiry', type: 'boolean' },
    { name: 'roundOff', label: 'Round Off Decimals', type: 'number' },
];
export function InventorySettingsPage() {
    return (_jsx(MasterDataPage, { title: "Inventory Settings", description: "Global inventory configuration: valuation, tracking, warehouse management", columns: [{ key: 'method', label: 'Method' }, { key: 'enableWarehouse', label: 'Warehouse', render: (v) => v ? '✅ On' : '❌ Off' }], apiPath: "/inventory/settings", formFields: settingsFields }));
}
export { BatchesPage } from './batches';
export { StockMovementsPage } from './stock-movements';
export { WarehouseLocationsPage } from './warehouse-locations';
export { NearExpiryPage, DamageRegisterPage, RecallRegisterPage, DistributorReturnsPage, ReplacementQueuePage } from './agriculture';
export { InventorySummaryPage, StockLedgerPage, BatchLedgerPage, ExpiryReportPage, MovementReportPage, ValuationReportPage, WarehouseReportPage, DeadStockPage, FastMovingPage, SlowMovingPage } from './reports';
export { BarcodeGenPage } from './barcode-gen';
export { ProductsPage } from './products';
export { ProductDetailPage } from './product-detail';
export { SubCategoriesPage } from './sub-categories';
export { NewStockEntryPage } from './stock-entry';
export { StockAdjustmentPage } from './stock-adjustment';
export { StockLedgerEnhancedPage } from './stock-ledger-enhanced';
export { WarehouseDashboardPage } from './warehouse-dashboard';
export { LocationTreePage } from './location-tree';
export { StockTransfersPage, CreateTransferPage } from './stock-transfers';
export { StockReservationPage } from './stock-reservation';
export { WarehouseReportsPage } from './warehouse-reports';
export { CreateProductPage, EditProductPage } from './product-form';
//# sourceMappingURL=index.js.map