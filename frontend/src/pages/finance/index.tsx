import React from 'react';
import { useNavigate } from 'react-router-dom';

import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

// ═════════════════════════════════════════════════════════
// Status Badge Helpers
// ═════════════════════════════════════════════════════════
const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  cleared: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  bounced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function getStatusBadge(status: string): React.ReactNode {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

// ═════════════════════════════════════════════════════════
// FINANCE DASHBOARD
// ═════════════════════════════════════════════════════════
const quickActions: Array<{ label: string; path: string }> = [
  { label: 'New Journal Entry', path: '/finance/journal-entries/create' },
  { label: 'New Account', path: '/finance/chart-of-accounts/create' },
  { label: 'New Ledger', path: '/finance/ledgers/create' },
  { label: 'Cost Centers', path: '/finance/cost-centers' },
  { label: 'Settings', path: '/finance/settings' },
];

const statCards = [
  {
    label: 'Total Accounts',
    value: '—',
    color: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
  },
  {
    label: 'Pending Vouchers',
    value: '—',
    color: 'border-l-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
  },
  {
    label: 'Cash Balance',
    value: '—',
    color: 'border-l-green-500',
    bg: 'bg-green-50 dark:bg-green-900/10',
  },
  {
    label: 'Bank Balance',
    value: '—',
    color: 'border-l-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/10',
  },
];

export function FinanceDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of accounting operations, account balances, and key metrics
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
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Reports</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Chart of Accounts', desc: 'Full chart of accounts listing' },
            { label: 'Ledger List', desc: 'All ledger accounts with balances' },
            { label: 'Journal Register', desc: 'Voucher-wise journal entries' },
            { label: 'Cash Book Report', desc: 'Cash receipt and payment log' },
            { label: 'Bank Book Report', desc: 'Bank transactions with reconciliation' },
            { label: 'Account Group Report', desc: 'Group-wise account summary' },
            { label: 'Financial Year Report', desc: 'FY-wise financial summary' },
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
// 1. ACCOUNT GROUPS
// ═════════════════════════════════════════════════════════
const groupColumns: ColumnDef[] = [
  { key: 'name', label: 'Group Name' },
  { key: 'alias', label: 'Alias' },
  {
    key: 'type',
    label: 'Type',
    render: (v) => {
      const types: Record<string, string> = {
        assets: '📊 Assets',
        liabilities: '📋 Liabilities',
        income: '📈 Income',
        expenses: '📉 Expenses',
        equity: '🏛️ Equity',
      };
      return types[v as string] || String(v);
    },
  },
  { key: 'level', label: 'Level' },
  { key: 'sortOrder', label: 'Sort' },
  { key: 'isSystem', label: 'System', render: (v) => (v ? '✅' : '—') },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const groupFields: FormField[] = [
  { name: 'name', label: 'Group Name', type: 'text', required: true },
  { name: 'alias', label: 'Alias', type: 'text' },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Assets', value: 'assets' },
      { label: 'Liabilities', value: 'liabilities' },
      { label: 'Income', value: 'income' },
      { label: 'Expenses', value: 'expenses' },
      { label: 'Equity', value: 'equity' },
    ],
    required: true,
  },
  { name: 'parentId', label: 'Parent Group', type: 'text' },
  { name: 'level', label: 'Level', type: 'number' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function AccountGroupsPage() {
  return (
    <MasterDataPage
      title="Account Groups"
      description="Nested hierarchy of account groups: Assets, Liabilities, Income, Expenses, Equity"
      columns={groupColumns}
      apiPath="/finance/account-groups"
      formFields={groupFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 2. CHART OF ACCOUNTS
// ═════════════════════════════════════════════════════════
const coaColumns: ColumnDef[] = [
  { key: 'accountCode', label: 'Code' },
  { key: 'accountName', label: 'Account Name' },
  {
    key: 'accountType',
    label: 'Type',
    render: (v) => {
      const types: Record<string, string> = {
        assets: 'Assets',
        liabilities: 'Liabilities',
        income: 'Income',
        expenses: 'Expenses',
        equity: 'Equity',
      };
      return types[v as string] || String(v);
    },
  },
  { key: 'groupId', label: 'Group' },
  {
    key: 'openingBalance',
    label: 'Opening ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  { key: 'isCashAccount', label: 'Cash', render: (v) => (v ? '✅' : '—') },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const coaFields: FormField[] = [
  { name: 'accountCode', label: 'Account Code', type: 'text', required: true },
  { name: 'accountName', label: 'Account Name', type: 'text', required: true },
  {
    name: 'accountType',
    label: 'Account Type',
    type: 'select',
    options: [
      { label: 'Assets', value: 'assets' },
      { label: 'Liabilities', value: 'liabilities' },
      { label: 'Income', value: 'income' },
      { label: 'Expenses', value: 'expenses' },
      { label: 'Equity', value: 'equity' },
    ],
    required: true,
  },
  { name: 'groupId', label: 'Group ID', type: 'text', required: true },
  { name: 'openingBalance', label: 'Opening Balance', type: 'number' },
  {
    name: 'openingBalanceType',
    label: 'Opening Type',
    type: 'select',
    options: [
      { label: 'Debit', value: 'debit' },
      { label: 'Credit', value: 'credit' },
    ],
  },
  { name: 'currency', label: 'Currency', type: 'text' },
  { name: 'costCenterRequired', label: 'Cost Center Required', type: 'boolean' },
  { name: 'gstApplicable', label: 'GST Applicable', type: 'boolean' },
  { name: 'bankReconciliation', label: 'Bank Reconciliation', type: 'boolean' },
  { name: 'isCashAccount', label: 'Cash Account', type: 'boolean' },
  { name: 'isControlAccount', label: 'Control Account', type: 'boolean' },
  { name: 'allowManualPosting', label: 'Allow Manual Posting', type: 'boolean' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function ChartOfAccountsPage() {
  return (
    <MasterDataPage
      title="Chart of Accounts"
      description="Complete chart of accounts with auto account codes, opening balances, and GST/bank settings"
      columns={coaColumns}
      apiPath="/finance/chart-of-accounts"
      formFields={coaFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 3. LEDGER MASTER
// ═════════════════════════════════════════════════════════
const ledgerColumns: ColumnDef[] = [
  { key: 'accountId', label: 'Account' },
  {
    key: 'ledgerType',
    label: 'Type',
    render: (v) => {
      const types: Record<string, string> = {
        customer: '👤 Customer',
        supplier: '🏭 Supplier',
        cash: '💵 Cash',
        bank: '🏦 Bank',
        expense: '📉 Expense',
        income: '📈 Income',
        tax: '🧾 Tax',
      };
      return types[v as string] || String(v);
    },
  },
  { key: 'partyId', label: 'Party' },
  {
    key: 'openingBalance',
    label: 'Opening ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'currentBalance',
    label: 'Balance ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  { key: 'creditLimit', label: 'Credit Limit' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const ledgerFields: FormField[] = [
  { name: 'accountId', label: 'Account ID', type: 'text', required: true },
  {
    name: 'ledgerType',
    label: 'Ledger Type',
    type: 'select',
    options: [
      { label: 'Customer', value: 'customer' },
      { label: 'Supplier', value: 'supplier' },
      { label: 'Cash', value: 'cash' },
      { label: 'Bank', value: 'bank' },
      { label: 'Expense', value: 'expense' },
      { label: 'Income', value: 'income' },
      { label: 'Tax', value: 'tax' },
    ],
    required: true,
  },
  { name: 'partyId', label: 'Party ID', type: 'text' },
  { name: 'openingBalance', label: 'Opening Balance', type: 'number' },
  {
    name: 'openingBalanceType',
    label: 'Opening Type',
    type: 'select',
    options: [
      { label: 'Debit', value: 'debit' },
      { label: 'Credit', value: 'credit' },
    ],
  },
  { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
  { name: 'creditDays', label: 'Credit Days', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function LedgerMasterPage() {
  return (
    <MasterDataPage
      title="Ledger Master"
      description="Customer, supplier, cash, bank, expense, income, and tax ledgers with balance tracking"
      columns={ledgerColumns}
      apiPath="/finance/ledgers"
      formFields={ledgerFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 4. JOURNAL ENTRIES
// ═════════════════════════════════════════════════════════
const journalColumns: ColumnDef[] = [
  { key: 'voucherNumber', label: 'Voucher#' },
  { key: 'voucherDate', label: 'Date' },
  { key: 'voucherType', label: 'Type' },
  { key: 'narration', label: 'Narration' },
  {
    key: 'totalDebit',
    label: 'Total Debit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'totalCredit',
    label: 'Total Credit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  { key: 'isPosted', label: 'Posted', render: (v) => (v ? '✅ Posted' : '📝 Draft') },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const journalFields: FormField[] = [
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
  { name: 'voucherDate', label: 'Voucher Date', type: 'date', required: true },
  {
    name: 'voucherType',
    label: 'Voucher Type',
    type: 'select',
    options: [
      { label: 'Journal', value: 'journal' },
      { label: 'Payment', value: 'payment' },
      { label: 'Receipt', value: 'receipt' },
      { label: 'Contra', value: 'contra' },
    ],
  },
  { name: 'narration', label: 'Narration', type: 'textarea' },
  { name: 'totalDebit', label: 'Total Debit', type: 'number' },
  { name: 'totalCredit', label: 'Total Credit', type: 'number' },
  { name: 'referenceNumber', label: 'Reference Number', type: 'text' },
  { name: 'costCenterId', label: 'Cost Center', type: 'text' },
];

export function JournalEntriesPage() {
  return (
    <MasterDataPage
      title="Journal Entries"
      description="Double-entry vouchers with debit/credit validation, narration, attachments, and approval workflow"
      columns={journalColumns}
      apiPath="/finance/journal-entries"
      formFields={journalFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 5. CASH BOOK
// ═════════════════════════════════════════════════════════
const cashBookColumns: ColumnDef[] = [
  { key: 'voucherNumber', label: 'Voucher#' },
  { key: 'entryDate', label: 'Date' },
  {
    key: 'voucherType',
    label: 'Type',
    render: (v) => ((v as string) === 'receipt' ? '📥 Receipt' : '📤 Payment'),
  },
  { key: 'ledgerId', label: 'Ledger' },
  {
    key: 'debit',
    label: 'Debit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'credit',
    label: 'Credit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'runningBalance',
    label: 'Balance ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  { key: 'narration', label: 'Narration' },
];

const cashBookFields: FormField[] = [
  { name: 'cashAccountId', label: 'Cash Account ID', type: 'text', required: true },
  { name: 'entryDate', label: 'Entry Date', type: 'date', required: true },
  {
    name: 'voucherType',
    label: 'Voucher Type',
    type: 'select',
    options: [
      { label: 'Receipt', value: 'receipt' },
      { label: 'Payment', value: 'payment' },
    ],
    required: true,
  },
  { name: 'voucherId', label: 'Voucher ID', type: 'text' },
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text' },
  { name: 'ledgerId', label: 'Ledger ID', type: 'text' },
  { name: 'partyId', label: 'Party ID', type: 'text' },
  { name: 'debit', label: 'Debit Amount', type: 'number' },
  { name: 'credit', label: 'Credit Amount', type: 'number' },
  { name: 'narration', label: 'Narration', type: 'textarea' },
];

export function CashBookPage() {
  return (
    <MasterDataPage
      title="Cash Book"
      description="Cash receipts and payments with running balance, opening/closing balance tracking"
      columns={cashBookColumns}
      apiPath="/finance/cash-book"
      formFields={cashBookFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 6. BANK BOOK
// ═════════════════════════════════════════════════════════
const bankBookColumns: ColumnDef[] = [
  { key: 'voucherNumber', label: 'Voucher#' },
  { key: 'entryDate', label: 'Date' },
  { key: 'voucherType', label: 'Type' },
  { key: 'chequeNumber', label: 'Cheque#' },
  { key: 'utrNumber', label: 'UTR#' },
  {
    key: 'debit',
    label: 'Debit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'credit',
    label: 'Credit ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'runningBalance',
    label: 'Balance ₹',
    render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  { key: 'reconciliationStatus', label: 'Recon', render: (v) => getStatusBadge(v as string) },
];

const bankBookFields: FormField[] = [
  { name: 'bankAccountId', label: 'Bank Account ID', type: 'text', required: true },
  { name: 'entryDate', label: 'Entry Date', type: 'date', required: true },
  {
    name: 'voucherType',
    label: 'Voucher Type',
    type: 'select',
    options: [
      { label: 'Receipt', value: 'receipt' },
      { label: 'Payment', value: 'payment' },
      { label: 'Transfer', value: 'transfer' },
    ],
    required: true,
  },
  { name: 'voucherId', label: 'Voucher ID', type: 'text' },
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text' },
  { name: 'chequeNumber', label: 'Cheque Number', type: 'text' },
  { name: 'utrNumber', label: 'UTR Number', type: 'text' },
  { name: 'referenceNumber', label: 'Reference Number', type: 'text' },
  { name: 'debit', label: 'Debit Amount', type: 'number' },
  { name: 'credit', label: 'Credit Amount', type: 'number' },
  { name: 'narration', label: 'Narration', type: 'textarea' },
];

export function BankBookPage() {
  return (
    <MasterDataPage
      title="Bank Book"
      description="Bank receipts, payments, and transfers with cheque/UTR tracking and reconciliation"
      columns={bankBookColumns}
      apiPath="/finance/bank-book"
      formFields={bankBookFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 7. COST CENTERS
// ═════════════════════════════════════════════════════════
const costCenterColumns: ColumnDef[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  {
    key: 'type',
    label: 'Type',
    render: (v) => {
      const types: Record<string, string> = {
        department: '🏢 Dept',
        project: '📋 Project',
        branch: '🏪 Branch',
        warehouse: '🏭 Warehouse',
        profit_center: '💰 Profit',
      };
      return types[v as string] || String(v);
    },
  },
  { key: 'parentId', label: 'Parent' },
  { key: 'level', label: 'Level' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const costCenterFields: FormField[] = [
  { name: 'code', label: 'Cost Center Code', type: 'text', required: true },
  { name: 'name', label: 'Cost Center Name', type: 'text', required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Department', value: 'department' },
      { label: 'Project', value: 'project' },
      { label: 'Branch', value: 'branch' },
      { label: 'Warehouse', value: 'warehouse' },
      { label: 'Profit Center', value: 'profit_center' },
    ],
  },
  { name: 'parentId', label: 'Parent ID', type: 'text' },
  { name: 'level', label: 'Level', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function CostCentersPage() {
  return (
    <MasterDataPage
      title="Cost Centers"
      description="Hierarchical cost centers for departmental, project, and branch-wise accounting"
      columns={costCenterColumns}
      apiPath="/finance/cost-centers"
      formFields={costCenterFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 8. ACCOUNTING SETTINGS — password-protected direct form
// (design + gate: ./settings-page.tsx)
// ═════════════════════════════════════════════════════════
export { AccountingSettingsPage } from './settings-page';
