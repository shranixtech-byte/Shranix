import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/api-client';
import { MasterDataPage } from '../masters/master-data-page';
// ═════════════════════════════════════════════════════════
// SHARED HELPERS
// ═════════════════════════════════════════════════════════
const statusStyles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    partially_received: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};
function getStatusBadge(status) {
    const style = statusStyles[status] || statusStyles.draft;
    return (_jsx("span", { className: `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`, children: status.replace(/_/g, ' ') }));
}
const paymentStyles = {
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};
function getPaymentBadge(status) {
    const style = paymentStyles[status] || paymentStyles.unpaid;
    return (_jsx("span", { className: `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`, children: status.charAt(0).toUpperCase() + status.slice(1) }));
}
function formatCurrency(v) {
    return `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
// ═════════════════════════════════════════════════════════
// 1. SUPPLIER MASTER (PRM-016 Module 1)
// ═════════════════════════════════════════════════════════
const supplierColumns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Supplier Name' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'contactPerson', label: 'Contact' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email' },
    { key: 'state', label: 'State' },
    { key: 'creditLimit', label: 'Credit Limit ₹', render: (v) => formatCurrency(v) },
    { key: 'creditDays', label: 'Credit Days' },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const supplierFields = [
    { name: 'code', label: 'Supplier Code', type: 'text' },
    { name: 'name', label: 'Supplier Name', type: 'text', required: true },
    { name: 'gstin', label: 'GSTIN', type: 'text' },
    { name: 'pan', label: 'PAN', type: 'text' },
    { name: 'contactPerson', label: 'Contact Person', type: 'text' },
    { name: 'mobile', label: 'Mobile', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'state', label: 'State', type: 'text' },
    { name: 'district', label: 'District', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'pin', label: 'PIN Code', type: 'text' },
    { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
    { name: 'creditDays', label: 'Credit Days', type: 'number' },
    { name: 'bankName', label: 'Bank Name', type: 'text' },
    { name: 'bankAccountNo', label: 'Bank Account No', type: 'text' },
    { name: 'bankIfsc', label: 'Bank IFSC', type: 'text' },
    { name: 'bankBranch', label: 'Bank Branch', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
            { label: 'Blocked', value: 'blocked' },
        ] },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function SuppliersPage() {
    return (_jsx(MasterDataPage, { title: "Suppliers", description: "Manage supplier master with GST, banking, and credit information", columns: supplierColumns, apiPath: "/suppliers", formFields: supplierFields }));
}
// ═════════════════════════════════════════════════════════
// 2. PURCHASE REQUISITION (PRM-016 Module 2)
// ═════════════════════════════════════════════════════════
const requisitionColumns = [
    { key: 'prNumber', label: 'PR Number' },
    { key: 'department', label: 'Department' },
    { key: 'requestedBy', label: 'Requested By' },
    { key: 'requiredDate', label: 'Required Date' },
    { key: 'priority', label: 'Priority', render: (v) => {
            const colors = { low: 'text-gray-500', medium: 'text-yellow-600', high: 'text-orange-600', urgent: 'text-red-600' };
            return _jsx("span", { className: `font-medium capitalize ${colors[v] || ''}`, children: v || '—' });
        } },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
    { key: 'remarks', label: 'Remarks' },
];
const requisitionFields = [
    { name: 'prNumber', label: 'PR Number', type: 'text', required: true },
    { name: 'department', label: 'Department', type: 'text' },
    { name: 'requestedBy', label: 'Requested By', type: 'text' },
    { name: 'requiredDate', label: 'Required Date', type: 'date' },
    { name: 'priority', label: 'Priority', type: 'select', options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
        ] },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function PurchaseRequisitionsPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Requisitions", description: "Create and manage purchase requisitions with multi-level approval", columns: requisitionColumns, apiPath: "/purchase/requisitions", formFields: requisitionFields }));
}
export function PurchaseDashboardPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        try {
            const result = await apiRequest('/purchase/dashboard');
            setData(result);
        }
        catch (err) {
            console.error('Dashboard load error:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    if (loading) {
        return (_jsx("div", { className: "flex h-64 items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Loading dashboard..." })] }) }));
    }
    const statCards = [
        { label: 'Pending Purchase Orders', value: data?.pendingPos ?? '—', color: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
        { label: 'Pending GRNs', value: data?.pendingGrns ?? '—', color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { label: "Today's Receipts", value: data?.todayReceipts ?? '—', color: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
        { label: 'Purchase Value (Month)', value: data?.purchaseValue ? `₹${(data.purchaseValue).toLocaleString('en-IN')}` : '₹0', color: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
    ];
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-500", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Purchase Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Overview of purchase operations, pending actions, and key metrics" })] }) }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: statCards.map((card) => (_jsxs("div", { className: `rounded-xl border-l-4 p-5 shadow-sm transition-all hover:shadow-md ${card.color} ${card.bg}`, children: [_jsx("p", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wide", children: card.label }), _jsx("p", { className: "mt-2 text-2xl font-bold", children: card.value })] }, card.label))) }), _jsxs("div", { className: "rounded-xl border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Quick Actions" }), _jsx("div", { className: "flex flex-wrap gap-3", children: [
                            { label: 'New Purchase Order', path: '/purchase/orders' },
                            { label: 'New GRN', path: '/purchase/grn' },
                            { label: 'New Supplier', path: '/suppliers' },
                            { label: 'New Requisition', path: '/purchase/requisitions' },
                            { label: 'Purchase Returns', path: '/purchase/returns' },
                        ].map((action) => (_jsx("button", { onClick: () => navigate(action.path), className: "rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20 active:scale-[0.98]", children: action.label }, action.label))) })] }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-xl border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Top Suppliers" }), data?.topSuppliers && data.topSuppliers.length > 0 ? (_jsx("div", { className: "space-y-3", children: data.topSuppliers.map((s, i) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary", children: ["#", i + 1] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: s.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [s.count, " orders"] })] })] }), _jsx("p", { className: "text-sm font-semibold", children: formatCurrency(s.amount) })] }, s.id))) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "No supplier data available" }))] }), _jsxs("div", { className: "rounded-xl border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Recent Purchases" }), data?.recentPurchases && data.recentPurchases.length > 0 ? (_jsx("div", { className: "space-y-2", children: data.recentPurchases.slice(0, 8).map((po) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/30", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: po.poNumber }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [po.supplierId, " \u00B7 ", po.orderDate] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("p", { className: "text-sm font-semibold", children: formatCurrency(po.grandTotal) }), getStatusBadge(po.status)] })] }, po.id))) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "No recent purchases" }))] })] }), _jsxs("div", { className: "rounded-xl border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Reports" }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: [
                            { label: 'Purchase Register', desc: 'Complete purchase transaction log', path: '/purchase/reports/purchase-register' },
                            { label: 'GRN Register', desc: 'Goods receipt history with details', path: '/purchase/reports/grn-register' },
                            { label: 'GST Purchase Summary', desc: 'GST-wise purchase summary for returns', path: '/purchase/reports/gst-purchase' },
                            { label: 'Pending Purchase Orders', desc: 'All open and partially received POs', path: '/purchase/reports/pending-pos' },
                            { label: 'Purchase Return Report', desc: 'Return transactions with reasons', path: '/purchase/reports/purchase-returns' },
                            { label: 'Supplier-wise Purchase', desc: 'Supplier-wise purchase analysis', path: '/purchase/reports/supplier-wise' },
                        ].map((report) => (_jsxs("div", { onClick: () => navigate(report.path), className: "cursor-pointer rounded-lg border p-4 transition-all hover:bg-accent hover:shadow-sm", children: [_jsx("p", { className: "font-medium text-sm", children: report.label }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: report.desc })] }, report.label))) })] })] }));
}
// ═════════════════════════════════════════════════════════
// 4. PURCHASE ORDERS (PRM-016 Module 3)
// ═════════════════════════════════════════════════════════
const poColumns = [
    { key: 'poNumber', label: 'PO Number' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'orderDate', label: 'Order Date' },
    { key: 'expectedDelivery', label: 'Expected Delivery' },
    { key: 'grandTotal', label: 'Total ₹', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const poFields = [
    { name: 'poNumber', label: 'PO Number', type: 'text', required: true },
    { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
    { name: 'branchId', label: 'Branch', type: 'text' },
    { name: 'warehouseId', label: 'Warehouse', type: 'text' },
    { name: 'orderDate', label: 'Order Date', type: 'date', required: true },
    { name: 'expectedDelivery', label: 'Expected Delivery', type: 'date' },
    { name: 'paymentTerms', label: 'Payment Terms', type: 'text' },
    { name: 'transportDetails', label: 'Transport Details', type: 'text' },
    { name: 'subTotal', label: 'Sub Total', type: 'number' },
    { name: 'discountPercent', label: 'Discount %', type: 'number' },
    { name: 'grandTotal', label: 'Grand Total', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'terms', label: 'Terms & Conditions', type: 'textarea' },
];
export function PurchaseOrdersPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Orders", description: "Create and manage purchase orders with item details, tax calculations, and approval workflow", columns: poColumns, apiPath: "/purchase/orders", formFields: poFields }));
}
// ═════════════════════════════════════════════════════════
// 5. PURCHASE QUOTATIONS
// ═════════════════════════════════════════════════════════
const quoteColumns = [
    { key: 'quoteNumber', label: 'Quote#' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'quoteDate', label: 'Date' },
    { key: 'validUntil', label: 'Valid Until' },
    { key: 'grandTotal', label: 'Total ₹', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const quoteFields = [
    { name: 'quoteNumber', label: 'Quote Number', type: 'text', required: true },
    { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
    { name: 'quoteDate', label: 'Quote Date', type: 'date', required: true },
    { name: 'validUntil', label: 'Valid Until', type: 'date' },
    { name: 'grandTotal', label: 'Grand Total', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function PurchaseQuotationsPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Quotations", description: "Request and compare supplier quotations with auto-conversion to purchase orders", columns: quoteColumns, apiPath: "/purchase/quotations", formFields: quoteFields }));
}
// ═════════════════════════════════════════════════════════
// 6. GOODS RECEIPT NOTES (PRM-016 Module 4)
// ═════════════════════════════════════════════════════════
const grnColumns = [
    { key: 'grnNumber', label: 'GRN#' },
    { key: 'poId', label: 'PO Ref' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'receivedDate', label: 'Received Date' },
    { key: 'receiptType', label: 'Type', render: (v) => _jsx("span", { className: "capitalize", children: v }) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const grnFields = [
    { name: 'grnNumber', label: 'GRN Number', type: 'text', required: true },
    { name: 'poId', label: 'Purchase Order ID', type: 'text', required: true },
    { name: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
    { name: 'warehouseId', label: 'Warehouse', type: 'text' },
    { name: 'receivedDate', label: 'Received Date', type: 'date', required: true },
    { name: 'receiptType', label: 'Receipt Type', type: 'select', options: [
            { label: 'Full Receipt', value: 'full' },
            { label: 'Partial Receipt', value: 'partial' },
        ] },
    { name: 'deliveryChallanNo', label: 'Delivery Challan No', type: 'text' },
    { name: 'transporterName', label: 'Transporter', type: 'text' },
    { name: 'vehicleNo', label: 'Vehicle No', type: 'text' },
    { name: 'invoiceNumber', label: 'Invoice Number', type: 'text' },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function GrnPage() {
    return (_jsx(MasterDataPage, { title: "Goods Receipt Notes (GRN)", description: "Record incoming inventory with partial/full receipt, batch tracking, and quality checks", columns: grnColumns, apiPath: "/purchase/grn", formFields: grnFields }));
}
// ═════════════════════════════════════════════════════════
// 7. PURCHASE INVOICES
// ═════════════════════════════════════════════════════════
const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice#' },
    { key: 'supplierInvoiceNo', label: 'Supplier Inv#' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'invoiceDate', label: 'Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
    { key: 'paymentStatus', label: 'Payment', render: (v) => getPaymentBadge(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const invoiceFields = [
    { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
    { name: 'supplierInvoiceNo', label: 'Supplier Invoice No', type: 'text' },
    { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
    { name: 'poId', label: 'Purchase Order', type: 'text' },
    { name: 'grnId', label: 'GRN', type: 'text' },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
    { name: 'dueDate', label: 'Due Date', type: 'date' },
    { name: 'grandTotal', label: 'Grand Total', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function PurchaseInvoicesPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Invoices", description: "Manage supplier invoices with tax breakdown, payment tracking, and PO/GRN linking", columns: invoiceColumns, apiPath: "/purchase/invoices", formFields: invoiceFields }));
}
// ═════════════════════════════════════════════════════════
// 8. PURCHASE RETURNS (PRM-016 Module 6)
// ═════════════════════════════════════════════════════════
const returnColumns = [
    { key: 'returnNumber', label: 'Return#' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'returnDate', label: 'Return Date' },
    { key: 'returnReason', label: 'Reason' },
    { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const returnFields = [
    { name: 'returnNumber', label: 'Return Number', type: 'text', required: true },
    { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
    { name: 'invoiceId', label: 'Linked Invoice', type: 'text' },
    { name: 'grnId', label: 'Linked GRN', type: 'text' },
    { name: 'returnDate', label: 'Return Date', type: 'date', required: true },
    { name: 'returnReason', label: 'Return Reason', type: 'textarea', required: true },
    { name: 'grandTotal', label: 'Grand Total', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function PurchaseReturnsPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Returns", description: "Manage purchase returns with debit notes, stock reversal, and approval workflow", columns: returnColumns, apiPath: "/purchase/returns", formFields: returnFields }));
}
// ═════════════════════════════════════════════════════════
// 9. SUPPLIER PRICE LIST
// ═════════════════════════════════════════════════════════
const priceColumns = [
    { key: 'supplierId', label: 'Supplier' },
    { key: 'itemId', label: 'Item' },
    { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
    { key: 'discountPercent', label: 'Disc %' },
    { key: 'minQuantity', label: 'Min Qty' },
    { key: 'effectiveFrom', label: 'Effective From' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const priceFields = [
    { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
    { name: 'itemId', label: 'Item', type: 'text', required: true },
    { name: 'variantId', label: 'Variant', type: 'text' },
    { name: 'rate', label: 'Rate', type: 'number', required: true },
    { name: 'discountPercent', label: 'Discount %', type: 'number' },
    { name: 'effectiveFrom', label: 'Effective From', type: 'date' },
    { name: 'effectiveTo', label: 'Effective To', type: 'date' },
    { name: 'minQuantity', label: 'Min Quantity', type: 'number' },
];
export function SupplierPriceListPage() {
    return (_jsx(MasterDataPage, { title: "Supplier Price List", description: "Maintain supplier-wise item rates, discounts, and contract pricing", columns: priceColumns, apiPath: "/purchase/supplier-prices", formFields: priceFields }));
}
// ═════════════════════════════════════════════════════════
// 10. PURCHASE APPROVALS
// ═════════════════════════════════════════════════════════
const approvalColumns = [
    { key: 'documentType', label: 'Doc Type' },
    { key: 'documentId', label: 'Doc Ref' },
    { key: 'requestedBy', label: 'Requested By' },
    { key: 'approvalLevel', label: 'Level' },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
    { key: 'comments', label: 'Comments' },
];
const approvalFields = [
    { name: 'documentType', label: 'Document Type', type: 'select', options: [
            { label: 'Purchase Order', value: 'po' },
            { label: 'Quotation', value: 'quotation' },
            { label: 'Invoice', value: 'invoice' },
            { label: 'Return', value: 'return' },
            { label: 'Requisition', value: 'requisition' },
        ], required: true },
    { name: 'documentId', label: 'Document ID', type: 'text', required: true },
    { name: 'requestedBy', label: 'Requested By', type: 'text', required: true },
    { name: 'approvalLevel', label: 'Approval Level', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
        ] },
    { name: 'comments', label: 'Comments', type: 'textarea' },
];
export function PurchaseApprovalsPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Approvals", description: "Multi-level approval workflow for purchase documents", columns: approvalColumns, apiPath: "/purchase/approvals", formFields: approvalFields }));
}
// ═════════════════════════════════════════════════════════
// 11. PURCHASE SETTINGS
// ═════════════════════════════════════════════════════════
const settingsFields = [
    { name: 'autoPoNumber', label: 'Auto PO Numbering', type: 'boolean' },
    { name: 'poPrefix', label: 'PO Prefix', type: 'text' },
    { name: 'poNextNumber', label: 'Next PO Number', type: 'number' },
    { name: 'requireApproval', label: 'Require Approval', type: 'boolean' },
    { name: 'approvalLevels', label: 'Approval Levels', type: 'number' },
    { name: 'defaultPaymentTerms', label: 'Default Payment Terms', type: 'text' },
    { name: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
    { name: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
];
export function PurchaseSettingsPage() {
    return (_jsx(MasterDataPage, { title: "Purchase Settings", description: "Global purchase configuration: numbering, approvals, payment terms, GST", columns: [{ key: 'autoPoNumber', label: 'Auto PO#' }, { key: 'requireApproval', label: 'Approval Required', render: (v) => v ? '✅ Yes' : '❌ No' }], apiPath: "/purchase/settings", formFields: settingsFields }));
}
function ReportPage({ title, description, apiPath, columns }) {
    return (_jsx(MasterDataPage, { title: title, description: description, columns: columns, apiPath: apiPath, formFields: [] }));
}
const reportColumns = [
    { key: 'poNumber', label: 'PO/Ref#' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'orderDate', label: 'Date' },
    { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const grnReportColumns = [
    { key: 'grnNumber', label: 'GRN#' },
    { key: 'poId', label: 'PO Ref' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'receivedDate', label: 'Date' },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
export function PurchaseRegisterReport() {
    return _jsx(ReportPage, { title: "Purchase Register", description: "Complete purchase transaction log", apiPath: "/purchase/reports/purchase-register", columns: reportColumns });
}
export function GrnRegisterReport() {
    return _jsx(ReportPage, { title: "GRN Register", description: "Goods receipt history with details", apiPath: "/purchase/reports/grn-register", columns: grnReportColumns });
}
export function PendingPOReport() {
    return _jsx(ReportPage, { title: "Pending Purchase Orders", description: "All open and partially received POs", apiPath: "/purchase/reports/pending-pos", columns: reportColumns });
}
export function PurchaseReturnReport() {
    const returnReportColumns = [
        { key: 'returnNumber', label: 'Return#' },
        { key: 'supplierId', label: 'Supplier' },
        { key: 'returnDate', label: 'Date' },
        { key: 'returnReason', label: 'Reason' },
        { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
        { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
    ];
    return _jsx(ReportPage, { title: "Purchase Return Report", description: "Return transactions with reasons", apiPath: "/purchase/reports/purchase-returns", columns: returnReportColumns });
}
export function GstPurchaseReport() {
    return _jsx(ReportPage, { title: "GST Purchase Summary", description: "GST-wise purchase summary for returns", apiPath: "/purchase/reports/gst-purchase", columns: reportColumns });
}
export { CreateSupplierPage, EditSupplierPage } from './supplier-form';
//# sourceMappingURL=index.js.map