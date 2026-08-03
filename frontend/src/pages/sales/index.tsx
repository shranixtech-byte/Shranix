import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { UpiQrCode } from '@/components/ui/UpiQrCode';
import { apiRequest } from '@/services/api-client';

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
  {
    label: 'Pending Quotations',
    value: '—',
    color: 'border-l-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
  },
  {
    label: 'Pending Orders',
    value: '—',
    color: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
  },
  {
    label: 'Overdue Invoices',
    value: '—',
    color: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-900/10',
  },
  {
    label: "Today's Despatches",
    value: '—',
    color: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-900/10',
  },
];

export function SalesDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
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
            <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            'New Sales Order',
            'New Delivery Challan',
            'New Sales Invoice',
            'View Returns',
            'Customer Price List',
          ].map((action) => (
            <button
              key={action}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
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
              className="hover:bg-accent cursor-pointer rounded-md border p-3 transition-colors"
            >
              <p className="font-medium">{report.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">{report.desc}</p>
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
  {
    key: 'grandTotal',
    label: 'Total ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
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
  {
    key: 'grandTotal',
    label: 'Total ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
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
  {
    name: 'dispatchType',
    label: 'Dispatch Type',
    type: 'select',
    options: [
      { label: 'Full Dispatch', value: 'full' },
      { label: 'Partial Dispatch', value: 'partial' },
    ],
  },
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
  {
    key: 'grandTotal',
    label: 'Amount ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
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
  {
    key: 'grandTotal',
    label: 'Amount ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
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
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
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
  {
    name: 'documentType',
    label: 'Document Type',
    type: 'select',
    options: [
      { label: 'Quotation', value: 'quotation' },
      { label: 'Order', value: 'order' },
      { label: 'Invoice', value: 'invoice' },
      { label: 'Return', value: 'return' },
    ],
    required: true,
  },
  { name: 'documentId', label: 'Document ID', type: 'text', required: true },
  { name: 'requestedBy', label: 'Requested By', type: 'text', required: true },
  { name: 'approvalLevel', label: 'Approval Level', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
    ],
  },
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
  { name: 'quotationExpiryDays', label: 'Quotation Expiry (days)', type: 'number' },
  { name: 'requireApproval', label: 'Require Sales Approval', type: 'boolean' },
  { name: 'approvalLevels', label: 'Approval Levels', type: 'number' },
  { name: 'discountApproval', label: 'Discount Approval', type: 'boolean' },
  { name: 'discountApprovalLimit', label: 'Discount Approval Limit (%)', type: 'number' },
  { name: 'enforceCreditLimit', label: 'Enforce Credit Limit', type: 'boolean' },
  { name: 'overdueAlert', label: 'Overdue Alert', type: 'boolean' },
  { name: 'overdueAlertDays', label: 'Overdue Alert (days before)', type: 'number' },
  { name: 'salesmanMandatory', label: 'Salesman Mandatory', type: 'boolean' },
  { name: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
  { name: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
  { name: 'defaultPaymentTerms', label: 'Default Payment Terms', type: 'text' },
  // Customer Settings — defaults, groups, loyalty, validations
  { name: 'defaultCreditLimit', label: 'Default Credit Limit', type: 'number' },
  { name: 'customerGroups', label: 'Customer Groups (comma separated)', type: 'text' },
  { name: 'defaultCustomerGroup', label: 'Default Customer Group', type: 'text' },
  { name: 'loyaltyEnabled', label: 'Loyalty Program', type: 'boolean' },
  { name: 'loyaltyPointsPerAmount', label: 'Loyalty Points per ₹100', type: 'number' },
  {
    name: 'defaultPriceList',
    label: 'Default Price List',
    type: 'select',
    options: [
      { label: 'Standard', value: 'standard' },
      { label: 'Wholesale', value: 'wholesale' },
      { label: 'Retail', value: 'retail' },
      { label: 'Promotional', value: 'promotional' },
      { label: 'Contract', value: 'contract' },
    ],
  },
  { name: 'gstValidation', label: 'GST Validation', type: 'boolean' },
  { name: 'panValidation', label: 'PAN Validation', type: 'boolean' },
];

// ── UPI Payment settings card (dukandar ka UPI ID → bill ka QR) ──────
function UpiSettingsCard() {
  const [upiId, setUpiId] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ upiId?: string }>('/sales/settings/upi')
      .then((r) => {
        const id = (r as any)?.upiId || '';
        setUpiId(id);
        setSaved(id);
      })
      .catch(() => setError('UPI ID load nahi hua'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const clean = upiId.trim();
      const res = await apiRequest<{ upiId: string }>('/sales/settings/upi', {
        method: 'PUT',
        body: JSON.stringify({ upiId: clean }),
      });
      setSaved((res as any)?.upiId || clean);
      setMessage('✅ UPI ID save ho gaya! Ab bill par QR code dikhega');
    } catch (err) {
      setError((err as Error).message || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-800 dark:from-emerald-900/20 dark:to-slate-800/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Input side */}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              💳 UPI Payment (Bill QR Code)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Customer UPI se pay karega to bill par amount wala QR dikhega — GPay/PhonePe/Paytm se
              scan hoga
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Aapka UPI ID
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="jaise: dukandar@upi"
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="h-10 shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
            {message && (
              <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {message}
              </p>
            )}
            {!loading && !saved && !message && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ UPI ID set nahi hai — customer UPI mode select karega to QR ke liye ye zaroori
                hai
              </p>
            )}
          </div>

          {loading && <p className="text-xs text-slate-400">UPI ID load ho raha hai...</p>}
        </div>

        {/* QR preview */}
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
          {saved ? (
            <UpiQrCode upiId={saved} amount={0} name="Shranix Krushi ERP" size={130} />
          ) : (
            <div className="flex h-[130px] w-[130px] items-center justify-center rounded-lg bg-slate-50 text-center text-[10px] text-slate-400 dark:bg-slate-700/50">
              UPI ID save karo — QR yahin dikhega
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SalesSettingsPage() {
  return (
    <div className="space-y-6">
      <UpiSettingsCard />
      <MasterDataPage
        title="Sales Settings"
        description="Global sales configuration: numbering, approvals, discount & credit rules, alerts"
        columns={[
          { key: 'autoQuoteNumber', label: 'Auto Quote#' },
          {
            key: 'requireApproval',
            label: 'Approval Required',
            render: (v) => (v ? '✅ Yes' : '❌ No'),
          },
          {
            key: 'discountApproval',
            label: 'Discount Approval',
            render: (v) => (v ? '✅ Yes' : '❌ No'),
          },
        ]}
        apiPath="/sales/settings"
        formFields={settingsFields}
      />
    </div>
  );
}

export { CustomersPage } from './customers-page';
export { CreateCustomerPage, EditCustomerPage } from './customer-form';
export { CreateSalesInvoicePage } from './create-invoice-page';
export { SimpleInvoicePage } from './simple-invoice-page';
export { CustomerSelectionScreen } from './customer-selection-screen';
