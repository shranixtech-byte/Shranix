import React from 'react';

import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

// ═════════════════════════════════════════════════════════
// Status Badge Helpers
// ═════════════════════════════════════════════════════════
const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  partially_delivered: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  dispatched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  converted: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  pending: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function getStatusBadge(status: string): React.ReactNode {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

const paymentStyles: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

function getPaymentBadge(status: string): React.ReactNode {
  const style = paymentStyles[status] || paymentStyles.unpaid;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// SALES DASHBOARD
// ═════════════════════════════════════════════════════════
const statCards = [
  { label: 'Pending Quotations', value: '—', color: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
  { label: 'Pending Orders', value: '—', color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
  { label: 'Overdue Invoices', value: '—', color: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
  { label: 'Today\'s Despatches', value: '—', color: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
];

export function SalesDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of sales operations, pending actions, and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border-l-4 p-4 shadow-sm ${card.color} ${card.bg}`}
          >
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {['New Sales Order', 'New Delivery Challan', 'New Sales Invoice', 'View Returns', 'Customer Price List'].map((action) => (
            <button
              key={action}
              className="rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Section */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Reports</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Sales Register', desc: 'Complete sales transaction log' },
            { label: 'Customer Ledger', desc: 'Customer-wise outstanding balances' },
            { label: 'Outstanding Report', desc: 'Overdue and pending receivables' },
            { label: 'Sales Return Report', desc: 'Return transactions with reasons' },
            { label: 'Daily Sales Report', desc: 'Day-wise sales summary' },
            { label: 'Monthly Sales Report', desc: 'Month-wise sales trends' },
            { label: 'GST Sales Summary', desc: 'GST-wise sales summary for returns' },
          ].map((report) => (
            <div
              key={report.label}
              className="cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent"
            >
              <p className="font-medium">{report.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{report.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 1. SALES QUOTATIONS
// ═════════════════════════════════════════════════════════
const quoteColumns: ColumnDef[] = [
  { key: 'quoteNumber', label: 'Quote#' },
  { key: 'customerId', label: 'Customer' },
  { key: 'quoteDate', label: 'Date' },
  { key: 'validTill', label: 'Valid Till' },
  { key: 'grandTotal', label: 'Total ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const quoteFields: FormField[] = [
  { name: 'quoteNumber', label: 'Quote Number', type: 'text', required: true },
  { name: 'customerId', label: 'Customer', type: 'text', required: true },
  { name: 'quoteDate', label: 'Quote Date', type: 'date', required: true },
  { name: 'validTill', label: 'Valid Till', type: 'date' },
  { name: 'subTotal', label: 'Sub Total', type: 'number' },
  { name: 'discountPercent', label: 'Discount %', type: 'number' },
  { name: 'grandTotal', label: 'Grand Total', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'terms', label: 'Terms & Conditions', type: 'textarea' },
];

export function SalesQuotationsPage() {
  return (
    <MasterDataPage
      title="Sales Quotations"
      description="Create and manage sales quotations with item details, tax calculations, and approval workflow"
      columns={quoteColumns}
      apiPath="/sales/quotations"
      formFields={quoteFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 2. SALES ORDERS
// ═════════════════════════════════════════════════════════
const orderColumns: ColumnDef[] = [
  { key: 'orderNumber', label: 'Order#' },
  { key: 'customerId', label: 'Customer' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'grandTotal', label: 'Total ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const orderFields: FormField[] = [
  { name: 'orderNumber', label: 'Order Number', type: 'text', required: true },
  { name: 'customerId', label: 'Customer', type: 'text', required: true },
  { name: 'quotationId', label: 'Linked Quotation', type: 'text' },
  { name: 'orderDate', label: 'Order Date', type: 'date', required: true },
  { name: 'deliveryDate', label: 'Delivery Date', type: 'date' },
  { name: 'warehouseId', label: 'Warehouse', type: 'text' },
  { name: 'branchId', label: 'Branch', type: 'text' },
  { name: 'subTotal', label: 'Sub Total', type: 'number' },
  { name: 'discountPercent', label: 'Discount %', type: 'number' },
  { name: 'grandTotal', label: 'Grand Total', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'terms', label: 'Terms & Conditions', type: 'textarea' },
];

export function SalesOrdersPage() {
  return (
    <MasterDataPage
      title="Sales Orders"
      description="Create and manage sales orders with linked quotations, stock reservation, and delivery planning"
      columns={orderColumns}
      apiPath="/sales/orders"
      formFields={orderFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 3. DELIVERY CHALLAN
// ═════════════════════════════════════════════════════════
const challanColumns: ColumnDef[] = [
  { key: 'challanNumber', label: 'Challan#' },
  { key: 'orderId', label: 'Order Ref' },
  { key: 'dispatchDate', label: 'Dispatch Date' },
  { key: 'dispatchType', label: 'Type' },
  { key: 'vehicleNo', label: 'Vehicle' },
  { key: 'driverName', label: 'Driver' },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const challanFields: FormField[] = [
  { name: 'challanNumber', label: 'Challan Number', type: 'text', required: true },
  { name: 'orderId', label: 'Sales Order ID', type: 'text', required: true },
  { name: 'customerId', label: 'Customer ID', type: 'text', required: true },
  { name: 'warehouseId', label: 'Warehouse', type: 'text' },
  { name: 'dispatchDate', label: 'Dispatch Date', type: 'date', required: true },
  { name: 'dispatchType', label: 'Dispatch Type', type: 'select', options: [
    { label: 'Full Dispatch', value: 'full' },
    { label: 'Partial Dispatch', value: 'partial' },
  ]},
  { name: 'vehicleNo', label: 'Vehicle No', type: 'text' },
  { name: 'vehicleType', label: 'Vehicle Type', type: 'text' },
  { name: 'driverName', label: 'Driver Name', type: 'text' },
  { name: 'driverMobile', label: 'Driver Mobile', type: 'text' },
  { name: 'transporterName', label: 'Transporter', type: 'text' },
  { name: 'lrNo', label: 'LR No', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function DeliveryChallansPage() {
  return (
    <MasterDataPage
      title="Delivery Challans"
      description="Record dispatches with vehicle and driver details, batch/serial tracking, and partial delivery support"
      columns={challanColumns}
      apiPath="/sales/delivery-challans"
      formFields={challanFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 4. SALES INVOICES
// ═════════════════════════════════════════════════════════
const invoiceColumns: ColumnDef[] = [
  { key: 'invoiceNumber', label: 'Invoice#' },
  { key: 'customerInvoiceNo', label: 'Cust Inv#' },
  { key: 'customerId', label: 'Customer' },
  { key: 'invoiceDate', label: 'Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'grandTotal', label: 'Amount ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'paymentStatus', label: 'Payment', render: (v) => getPaymentBadge(v as string) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const invoiceFields: FormField[] = [
  { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
  { name: 'customerInvoiceNo', label: 'Customer Invoice No', type: 'text' },
  { name: 'orderId', label: 'Sales Order', type: 'text' },
  { name: 'challanId', label: 'Delivery Challan', type: 'text' },
  { name: 'customerId', label: 'Customer', type: 'text', required: true },
  { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'grandTotal', label: 'Grand Total', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function SalesInvoicesPage() {
  return (
    <MasterDataPage
      title="Sales Invoices"
      description="Manage customer invoices with GST, discount, round-off, payment tracking, and order/challan linking"
      columns={invoiceColumns}
      apiPath="/sales/invoices"
      formFields={invoiceFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 5. SALES RETURNS
// ═════════════════════════════════════════════════════════
const returnColumns: ColumnDef[] = [
  { key: 'returnNumber', label: 'Return#' },
  { key: 'customerId', label: 'Customer' },
  { key: 'invoiceId', label: 'Invoice Ref' },
  { key: 'returnDate', label: 'Return Date' },
  { key: 'returnReason', label: 'Reason' },
  { key: 'grandTotal', label: 'Amount ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'creditNoteNo', label: 'Credit Note' },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const returnFields: FormField[] = [
  { name: 'returnNumber', label: 'Return Number', type: 'text', required: true },
  { name: 'customerId', label: 'Customer', type: 'text', required: true },
  { name: 'invoiceId', label: 'Linked Invoice', type: 'text', required: true },
  { name: 'returnDate', label: 'Return Date', type: 'date', required: true },
  { name: 'returnReason', label: 'Return Reason', type: 'textarea', required: true },
  { name: 'grandTotal', label: 'Grand Total', type: 'number' },
  { name: 'creditNoteNo', label: 'Credit Note No', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function SalesReturnsPage() {
  return (
    <MasterDataPage
      title="Sales Returns"
      description="Manage sales returns with credit notes, stock reversal, and approval workflow"
      columns={returnColumns}
      apiPath="/sales/returns"
      formFields={returnFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 6. CUSTOMER PRICE LIST
// ═════════════════════════════════════════════════════════
const priceColumns: ColumnDef[] = [
  { key: 'customerId', label: 'Customer' },
  { key: 'itemId', label: 'Item' },
  { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
  { key: 'discountPercent', label: 'Disc %' },
  { key: 'minQuantity', label: 'Min Qty' },
  { key: 'effectiveFrom', label: 'Effective From' },
  { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];

const priceFields: FormField[] = [
  { name: 'customerId', label: 'Customer', type: 'text', required: true },
  { name: 'itemId', label: 'Item', type: 'text', required: true },
  { name: 'variantId', label: 'Variant', type: 'text' },
  { name: 'rate', label: 'Rate', type: 'number', required: true },
  { name: 'discountPercent', label: 'Discount %', type: 'number' },
  { name: 'minQuantity', label: 'Min Quantity', type: 'number' },
  { name: 'effectiveFrom', label: 'Effective From', type: 'date' },
  { name: 'effectiveTo', label: 'Effective To', type: 'date' },
];

export function CustomerPriceListPage() {
  return (
    <MasterDataPage
      title="Customer Price List"
      description="Maintain customer-wise item rates, discounts, and contract pricing"
      columns={priceColumns}
      apiPath="/sales/customer-prices"
      formFields={priceFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 7. SALES APPROVALS
// ═════════════════════════════════════════════════════════
const approvalColumns: ColumnDef[] = [
  { key: 'documentType', label: 'Doc Type' },
  { key: 'documentId', label: 'Doc Ref' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'approvalLevel', label: 'Level' },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
  { key: 'comments', label: 'Comments' },
];

const approvalFields: FormField[] = [
  { name: 'documentType', label: 'Document Type', type: 'select', options: [
    { label: 'Quotation', value: 'quotation' },
    { label: 'Order', value: 'order' },
    { label: 'Invoice', value: 'invoice' },
    { label: 'Return', value: 'return' },
  ], required: true },
  { name: 'documentId', label: 'Document ID', type: 'text', required: true },
  { name: 'requestedBy', label: 'Requested By', type: 'text', required: true },
  { name: 'approvalLevel', label: 'Approval Level', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ]},
  { name: 'comments', label: 'Comments', type: 'textarea' },
];

export function SalesApprovalsPage() {
  return (
    <MasterDataPage
      title="Sales Approvals"
      description="Multi-level approval workflow for sales documents"
      columns={approvalColumns}
      apiPath="/sales/approvals"
      formFields={approvalFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 8. SALES SETTINGS
// ═════════════════════════════════════════════════════════
const settingsFields: FormField[] = [
  { name: 'autoQuoteNumber', label: 'Auto Quote Numbering', type: 'boolean' },
  { name: 'quotePrefix', label: 'Quote Prefix', type: 'text' },
  { name: 'quoteNextNumber', label: 'Next Quote Number', type: 'number' },
  { name: 'autoOrderNumber', label: 'Auto Order Numbering', type: 'boolean' },
  { name: 'orderPrefix', label: 'Order Prefix', type: 'text' },
  { name: 'orderNextNumber', label: 'Next Order Number', type: 'number' },
  { name: 'challanPrefix', label: 'Challan Prefix', type: 'text' },
  { name: 'challanNextNumber', label: 'Next Challan Number', type: 'number' },
  { name: 'autoInvoiceNumber', label: 'Auto Invoice Numbering', type: 'boolean' },
  { name: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
  { name: 'invoiceNextNumber', label: 'Next Invoice Number', type: 'number' },
  { name: 'returnPrefix', label: 'Return Prefix', type: 'text' },
  { name: 'returnNextNumber', label: 'Next Return Number', type: 'number' },
  { name: 'requireApproval', label: 'Require Approval', type: 'boolean' },
  { name: 'approvalLevels', label: 'Approval Levels', type: 'number' },
  { name: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
  { name: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
  { name: 'defaultPaymentTerms', label: 'Default Payment Terms', type: 'text' },
];

export function SalesSettingsPage() {
  return (
    <MasterDataPage
      title="Sales Settings"
      description="Global sales configuration: numbering, approvals, payment terms, GST"
      columns={[{ key: 'autoQuoteNumber', label: 'Auto Quote#' }, { key: 'requireApproval', label: 'Approval Required', render: (v) => v ? '✅ Yes' : '❌ No' }]}
      apiPath="/sales/settings"
      formFields={settingsFields}
    />
  );
}

export { CustomersPage } from './customers-page';
export { CreateCustomerPage, EditCustomerPage } from './customer-form';
export { CreateSalesInvoicePage } from './create-invoice-page';
export { CustomerSelectionScreen } from './customer-selection-screen';
