import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { apiRequest } from '@/services/api-client';

import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

// ═════════════════════════════════════════════════════════
// SHARED HELPERS
// ═════════════════════════════════════════════════════════
const statusStyles: Record<string, string> = {
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

function getStatusBadge(status: string): React.ReactNode {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status.replace(/_/g, ' ')}
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

function formatCurrency(v: unknown): string {
  return `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ═════════════════════════════════════════════════════════
// 1. SUPPLIER MASTER (PRM-016 Module 1)
// ═════════════════════════════════════════════════════════
const supplierColumns: ColumnDef[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Supplier Name' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'contactPerson', label: 'Contact' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'state', label: 'State' },
  { key: 'creditLimit', label: 'Credit Limit ₹', render: (v) => formatCurrency(v) },
  { key: 'creditDays', label: 'Credit Days' },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const supplierFields: FormField[] = [
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
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Blocked', value: 'blocked' },
    ],
  },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
];

export function SuppliersPage() {
  return (
    <MasterDataPage
      title="Suppliers"
      description="Manage supplier master with GST, banking, and credit information"
      columns={supplierColumns}
      apiPath="/suppliers"
      formFields={supplierFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 2. PURCHASE REQUISITION (PRM-016 Module 2)
// ═════════════════════════════════════════════════════════
const requisitionColumns: ColumnDef[] = [
  { key: 'prNumber', label: 'PR Number' },
  { key: 'department', label: 'Department' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'requiredDate', label: 'Required Date' },
  {
    key: 'priority',
    label: 'Priority',
    render: (v) => {
      const colors: Record<string, string> = {
        low: 'text-gray-500',
        medium: 'text-yellow-600',
        high: 'text-orange-600',
        urgent: 'text-red-600',
      };
      return (
        <span className={`font-medium capitalize ${colors[v as string] || ''}`}>
          {(v as string) || '—'}
        </span>
      );
    },
  },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
  { key: 'remarks', label: 'Remarks' },
];

const requisitionFields: FormField[] = [
  { name: 'prNumber', label: 'PR Number', type: 'text', required: true },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'requestedBy', label: 'Requested By', type: 'text' },
  { name: 'requiredDate', label: 'Required Date', type: 'date' },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
      { label: 'Urgent', value: 'urgent' },
    ],
  },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
];

export function PurchaseRequisitionsPage() {
  return (
    <MasterDataPage
      title="Purchase Requisitions"
      description="Create and manage purchase requisitions with multi-level approval"
      columns={requisitionColumns}
      apiPath="/purchase/requisitions"
      formFields={requisitionFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 3. PURCHASE DASHBOARD (PRM-016 Module 7)
// ═════════════════════════════════════════════════════════
interface DashboardData {
  pendingPos: number;
  pendingGrns: number;
  todayReceipts: number;
  purchaseValue: number;
  supplierOutstanding: number;
  pendingPayments: number;
  topSuppliers: Array<{ id: string; name: string; count: number; amount: number }>;
  recentPurchases: Array<{
    id: string;
    poNumber: string;
    supplierId: string;
    orderDate: string;
    grandTotal: number;
    status: string;
  }>;
}

export function PurchaseDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await apiRequest<DashboardData>('/purchase/dashboard');
      setData(result);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Pending Purchase Orders',
      value: data?.pendingPos ?? '—',
      color: 'border-l-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    },
    {
      label: 'Pending GRNs',
      value: data?.pendingGrns ?? '—',
      color: 'border-l-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
    },
    {
      label: "Today's Receipts",
      value: data?.todayReceipts ?? '—',
      color: 'border-l-green-500',
      bg: 'bg-green-50 dark:bg-green-900/10',
    },
    {
      label: 'Purchase Value (Month)',
      value: data?.purchaseValue ? `₹${data.purchaseValue.toLocaleString('en-IN')}` : '₹0',
      color: 'border-l-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/10',
    },
    {
      label: 'Supplier Outstanding',
      value: data?.supplierOutstanding
        ? `₹${Number(data.supplierOutstanding).toLocaleString('en-IN')}`
        : '₹0',
      color: 'border-l-red-500',
      bg: 'bg-red-50 dark:bg-red-900/10',
    },
    {
      label: 'Pending Payments',
      value: data?.pendingPayments ?? '—',
      color: 'border-l-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
    },
  ];

  return (
    <div className="animate-in fade-in space-y-6 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of purchase operations, pending actions, and key metrics
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border-l-4 p-5 shadow-sm transition-all hover:shadow-md ${card.color} ${card.bg}`}
          >
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'New Purchase Order', path: '/purchase/orders' },
            { label: 'New GRN', path: '/purchase/grn' },
            { label: 'New Supplier', path: '/suppliers' },
            { label: 'New Requisition', path: '/purchase/requisitions' },
            { label: 'Purchase Returns', path: '/purchase/returns' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-[0.98]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Suppliers + Recent Purchases */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Suppliers */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Top Suppliers</h2>
          {data?.topSuppliers && data.topSuppliers.length > 0 ? (
            <div className="space-y-3">
              {data.topSuppliers.map((s, i) => (
                <div
                  key={s.id}
                  className="bg-muted/30 hover:bg-muted/50 flex items-center justify-between rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-muted-foreground text-xs">{s.count} orders</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(s.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No supplier data available</p>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Recent Purchases</h2>
          {data?.recentPurchases && data.recentPurchases.length > 0 ? (
            <div className="space-y-2">
              {data.recentPurchases.slice(0, 8).map((po) => (
                <div
                  key={po.id}
                  className="hover:bg-muted/30 flex items-center justify-between rounded-lg p-2.5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{po.poNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      {po.supplierId} · {po.orderDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">{formatCurrency(po.grandTotal)}</p>
                    {getStatusBadge(po.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No recent purchases</p>
          )}
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Reports</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: 'Purchase Register',
              desc: 'Complete purchase transaction log',
              path: '/purchase/reports/purchase-register',
            },
            {
              label: 'GRN Register',
              desc: 'Goods receipt history with details',
              path: '/purchase/reports/grn-register',
            },
            {
              label: 'GST Purchase Summary',
              desc: 'GST-wise purchase summary for returns',
              path: '/purchase/reports/gst-purchase',
            },
            {
              label: 'Pending Purchase Orders',
              desc: 'All open and partially received POs',
              path: '/purchase/reports/pending-pos',
            },
            {
              label: 'Purchase Return Report',
              desc: 'Return transactions with reasons',
              path: '/purchase/reports/purchase-returns',
            },
            {
              label: 'Supplier-wise Purchase',
              desc: 'Supplier-wise purchase analysis',
              path: '/purchase/reports/supplier-wise',
            },
          ].map((report) => (
            <div
              key={report.label}
              onClick={() => navigate(report.path)}
              className="hover:bg-accent cursor-pointer rounded-lg border p-4 transition-all hover:shadow-sm"
            >
              <p className="text-sm font-medium">{report.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">{report.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 4. PURCHASE ORDERS (PRM-016 Module 3)
// ═════════════════════════════════════════════════════════
const poColumns: ColumnDef[] = [
  { key: 'poNumber', label: 'PO Number' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'orderDate', label: 'Order Date' },
  { key: 'expectedDelivery', label: 'Expected Delivery' },
  { key: 'grandTotal', label: 'Total ₹', render: (v) => formatCurrency(v) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const poFields: FormField[] = [
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTypeParam = searchParams.get('type') || 'all';

  return (
    <>
      {/* Cash vs Credit Filter Bar */}
      <div className="shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-white/[0.08] dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filter Mode:
          </span>
          {[
            { id: 'all', label: 'All Purchases (एकूण)', emoji: '📑' },
            { id: 'cash', label: 'Cash Purchases (नगद)', emoji: '💵' },
            { id: 'credit', label: 'Credit Purchases (उधारी)', emoji: '💳' },
          ].map((tab) => {
            const isActive = currentTypeParam === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'all') {
                    searchParams.delete('type');
                    setSearchParams(searchParams);
                  } else {
                    setSearchParams({ type: tab.id });
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  isActive
                    ? 'shadow-xs bg-teal-600 text-white shadow-teal-600/30 ring-1 ring-teal-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
                )}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {currentTypeParam !== 'all' && (
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
            Filtering by: {currentTypeParam.toUpperCase()} PURCHASES
          </span>
        )}
      </div>

      <MasterDataPage
        title="Purchase Orders & Bills"
        description="Create and manage purchase orders with item details, tax calculations, and approval workflow"
        columns={poColumns}
        apiPath={
          currentTypeParam !== 'all'
            ? `/purchase/orders?type=${currentTypeParam}`
            : '/purchase/orders'
        }
        formFields={poFields}
      />
    </>
  );
}

// ═════════════════════════════════════════════════════════
// 5. PURCHASE QUOTATIONS
// ═════════════════════════════════════════════════════════
const quoteColumns: ColumnDef[] = [
  { key: 'quoteNumber', label: 'Quote#' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'quoteDate', label: 'Date' },
  { key: 'validUntil', label: 'Valid Until' },
  { key: 'grandTotal', label: 'Total ₹', render: (v) => formatCurrency(v) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const quoteFields: FormField[] = [
  { name: 'quoteNumber', label: 'Quote Number', type: 'text', required: true },
  { name: 'supplierId', label: 'Supplier', type: 'text', required: true },
  { name: 'quoteDate', label: 'Quote Date', type: 'date', required: true },
  { name: 'validUntil', label: 'Valid Until', type: 'date' },
  { name: 'grandTotal', label: 'Grand Total', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function PurchaseQuotationsPage() {
  return (
    <MasterDataPage
      title="Purchase Quotations"
      description="Request and compare supplier quotations with auto-conversion to purchase orders"
      columns={quoteColumns}
      apiPath="/purchase/quotations"
      formFields={quoteFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 6. GOODS RECEIPT NOTES (PRM-016 Module 4)
// ═════════════════════════════════════════════════════════
const grnColumns: ColumnDef[] = [
  { key: 'grnNumber', label: 'GRN#' },
  { key: 'poId', label: 'PO Ref' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'receivedDate', label: 'Received Date' },
  {
    key: 'receiptType',
    label: 'Type',
    render: (v) => <span className="capitalize">{v as string}</span>,
  },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const grnFields: FormField[] = [
  { name: 'grnNumber', label: 'GRN Number', type: 'text', required: true },
  { name: 'poId', label: 'Purchase Order ID', type: 'text', required: true },
  { name: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
  { name: 'warehouseId', label: 'Warehouse', type: 'text' },
  { name: 'receivedDate', label: 'Received Date', type: 'date', required: true },
  {
    name: 'receiptType',
    label: 'Receipt Type',
    type: 'select',
    options: [
      { label: 'Full Receipt', value: 'full' },
      { label: 'Partial Receipt', value: 'partial' },
    ],
  },
  { name: 'deliveryChallanNo', label: 'Delivery Challan No', type: 'text' },
  { name: 'transporterName', label: 'Transporter', type: 'text' },
  { name: 'vehicleNo', label: 'Vehicle No', type: 'text' },
  { name: 'invoiceNumber', label: 'Invoice Number', type: 'text' },
  { name: 'invoiceDate', label: 'Invoice Date', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function GrnPage() {
  return (
    <MasterDataPage
      title="Goods Receipt Notes (GRN)"
      description="Record incoming inventory with partial/full receipt, batch tracking, and quality checks"
      columns={grnColumns}
      apiPath="/purchase/grn"
      formFields={grnFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 7. PURCHASE INVOICES
// ═════════════════════════════════════════════════════════
const invoiceColumns: ColumnDef[] = [
  { key: 'invoiceNumber', label: 'Invoice#' },
  { key: 'supplierInvoiceNo', label: 'Supplier Inv#' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'invoiceDate', label: 'Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
  { key: 'paymentStatus', label: 'Payment', render: (v) => getPaymentBadge(v as string) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const invoiceFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Purchase Invoices"
      description="Manage supplier invoices with tax breakdown, payment tracking, and PO/GRN linking"
      columns={invoiceColumns}
      apiPath="/purchase/invoices"
      formFields={invoiceFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 8. PURCHASE RETURNS (PRM-016 Module 6)
// ═════════════════════════════════════════════════════════
const returnColumns: ColumnDef[] = [
  { key: 'returnNumber', label: 'Return#' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'returnDate', label: 'Return Date' },
  { key: 'returnReason', label: 'Reason' },
  { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const returnFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Purchase Returns"
      description="Manage purchase returns with debit notes, stock reversal, and approval workflow"
      columns={returnColumns}
      apiPath="/purchase/returns"
      formFields={returnFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 9. SUPPLIER PRICE LIST
// ═════════════════════════════════════════════════════════
const priceColumns: ColumnDef[] = [
  { key: 'supplierId', label: 'Supplier' },
  { key: 'itemId', label: 'Item' },
  { key: 'rate', label: 'Rate ₹', render: (v) => `₹${Number(v || 0).toFixed(2)}` },
  { key: 'discountPercent', label: 'Disc %' },
  { key: 'minQuantity', label: 'Min Qty' },
  { key: 'effectiveFrom', label: 'Effective From' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const priceFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Supplier Price List"
      description="Maintain supplier-wise item rates, discounts, and contract pricing"
      columns={priceColumns}
      apiPath="/purchase/supplier-prices"
      formFields={priceFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 10. PURCHASE APPROVALS
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
      { label: 'Purchase Order', value: 'po' },
      { label: 'Quotation', value: 'quotation' },
      { label: 'Invoice', value: 'invoice' },
      { label: 'Return', value: 'return' },
      { label: 'Requisition', value: 'requisition' },
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

export function PurchaseApprovalsPage() {
  return (
    <MasterDataPage
      title="Purchase Approvals"
      description="Multi-level approval workflow for purchase documents"
      columns={approvalColumns}
      apiPath="/purchase/approvals"
      formFields={approvalFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 11. PURCHASE SETTINGS
// ═════════════════════════════════════════════════════════
const settingsFields: FormField[] = [
  { name: 'autoPoNumber', label: 'Auto PO Numbering', type: 'boolean' },
  { name: 'poPrefix', label: 'PO Prefix', type: 'text' },
  { name: 'poNextNumber', label: 'Next PO Number', type: 'number' },
  { name: 'quotationPrefix', label: 'Quotation Prefix', type: 'text' },
  { name: 'quotationNextNumber', label: 'Next Quotation Number', type: 'number' },
  { name: 'grnPrefix', label: 'GRN Prefix', type: 'text' },
  { name: 'grnNextNumber', label: 'Next GRN Number', type: 'number' },
  { name: 'invoicePrefix', label: 'Invoice Prefix', type: 'text' },
  { name: 'invoiceNextNumber', label: 'Next Invoice Number', type: 'number' },
  { name: 'returnPrefix', label: 'Purchase Return Prefix', type: 'text' },
  { name: 'returnNextNumber', label: 'Next Return Number', type: 'number' },
  { name: 'autoGrn', label: 'Auto GRN on PO Approval', type: 'boolean' },
  { name: 'requireApproval', label: 'Require Purchase Approval', type: 'boolean' },
  { name: 'approvalLevels', label: 'Approval Levels', type: 'number' },
  { name: 'supplierCreditDays', label: 'Supplier Credit Days', type: 'number' },
  { name: 'defaultSupplierCategory', label: 'Supplier Category (Default)', type: 'text' },
  {
    name: 'defaultVendorRating',
    label: 'Vendor Rating (Default)',
    type: 'select',
    options: [
      { label: '⭐ 1 — Poor', value: '1' },
      { label: '⭐⭐ 2 — Fair', value: '2' },
      { label: '⭐⭐⭐ 3 — Good', value: '3' },
      { label: '⭐⭐⭐⭐ 4 — Very Good', value: '4' },
      { label: '⭐⭐⭐⭐⭐ 5 — Excellent', value: '5' },
    ],
  },
  { name: 'defaultGstRate', label: 'Default GST Rate (%)', type: 'number' },
  { name: 'requireVendorApproval', label: 'Vendor Approval Required', type: 'boolean' },
  { name: 'defaultPaymentTerms', label: 'Default Payment Terms', type: 'text' },
  { name: 'defaultTaxGroupId', label: 'Default Tax Group', type: 'text' },
  { name: 'defaultWarehouseId', label: 'Default Warehouse', type: 'text' },
  {
    name: 'defaultPaymentMode',
    label: 'Default Payment Mode',
    type: 'select',
    options: [
      { label: 'Credit', value: 'credit' },
      { label: 'Cash', value: 'cash' },
      { label: 'UPI', value: 'upi' },
      { label: 'Bank Transfer', value: 'bank_transfer' },
    ],
  },
  { name: 'gstEnabled', label: 'GST Enabled', type: 'boolean' },
  { name: 'roundOffDecimals', label: 'Round Off Decimals', type: 'number' },
];

export function PurchaseSettingsPage() {
  return (
    <MasterDataPage
      title="Purchase Settings"
      description="Global purchase configuration: numbering, auto GRN, approvals, credit days, defaults"
      columns={[
        { key: 'autoPoNumber', label: 'Auto PO#' },
        { key: 'autoGrn', label: 'Auto GRN', render: (v) => (v ? '✅ Yes' : '❌ No') },
        {
          key: 'requireApproval',
          label: 'Approval Required',
          render: (v) => (v ? '✅ Yes' : '❌ No'),
        },
      ]}
      apiPath="/purchase/settings"
      formFields={settingsFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 12. PURCHASE REPORTS (PRM-016 Module 9)
// ═════════════════════════════════════════════════════════
interface ReportPageProps {
  title: string;
  description: string;
  apiPath: string;
  columns: ColumnDef[];
}

function ReportPage({ title, description, apiPath, columns }: ReportPageProps) {
  return (
    <MasterDataPage
      title={title}
      description={description}
      columns={columns}
      apiPath={apiPath}
      formFields={[]}
    />
  );
}

const reportColumns: ColumnDef[] = [
  { key: 'poNumber', label: 'PO/Ref#' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'orderDate', label: 'Date' },
  { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const grnReportColumns: ColumnDef[] = [
  { key: 'grnNumber', label: 'GRN#' },
  { key: 'poId', label: 'PO Ref' },
  { key: 'supplierId', label: 'Supplier' },
  { key: 'receivedDate', label: 'Date' },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

export function PurchaseRegisterReport() {
  return (
    <ReportPage
      title="Purchase Register"
      description="Complete purchase transaction log"
      apiPath="/purchase/reports/purchase-register"
      columns={reportColumns}
    />
  );
}

export function GrnRegisterReport() {
  return (
    <ReportPage
      title="GRN Register"
      description="Goods receipt history with details"
      apiPath="/purchase/reports/grn-register"
      columns={grnReportColumns}
    />
  );
}

export function PendingPOReport() {
  return (
    <ReportPage
      title="Pending Purchase Orders"
      description="All open and partially received POs"
      apiPath="/purchase/reports/pending-pos"
      columns={reportColumns}
    />
  );
}

export function PurchaseReturnReport() {
  const returnReportColumns: ColumnDef[] = [
    { key: 'returnNumber', label: 'Return#' },
    { key: 'supplierId', label: 'Supplier' },
    { key: 'returnDate', label: 'Date' },
    { key: 'returnReason', label: 'Reason' },
    { key: 'grandTotal', label: 'Amount ₹', render: (v) => formatCurrency(v) },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
  ];
  return (
    <ReportPage
      title="Purchase Return Report"
      description="Return transactions with reasons"
      apiPath="/purchase/reports/purchase-returns"
      columns={returnReportColumns}
    />
  );
}

export function GstPurchaseReport() {
  return (
    <ReportPage
      title="GST Purchase Summary"
      description="GST-wise purchase summary for returns"
      apiPath="/purchase/reports/gst-purchase"
      columns={reportColumns}
    />
  );
}

export { CreateSupplierPage, EditSupplierPage } from './supplier-form';
