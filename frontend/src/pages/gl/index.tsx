import React from 'react';

import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

// ═════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD (Enhanced)
// ═════════════════════════════════════════════════════════
const statCards = [
  { label: 'Total GL Entries', value: '—', color: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
  { label: 'Trial Balance', value: '—', color: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
  { label: 'Net Profit/Loss', value: '—', color: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
  { label: 'Cash Balance', value: '—', color: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
];

export function FinancialDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise financial overview with real-time GL summary and report access
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

      {/* Financial Reports Section */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Financial Statements</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Trial Balance', desc: 'Account-wise debit/credit balances', icon: '⚖️' },
            { label: 'Profit & Loss', desc: 'Revenue, expenses, and net profit', icon: '📈' },
            { label: 'Balance Sheet', desc: 'Assets, liabilities, and equity', icon: '📊' },
            { label: 'Cash Flow Statement', desc: 'Operating, investing, financing activities', icon: '💵' },
            { label: 'Day Book', desc: 'Daily voucher register', icon: '📅' },
            { label: 'Account Statement', desc: 'Ledger-wise detailed statement', icon: '📋' },
          ].map((report) => (
            <div
              key={report.label}
              className="cursor-pointer rounded-md border p-4 transition-all hover:bg-accent hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{report.icon}</span>
                <div>
                  <p className="font-medium">{report.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{report.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {['Generate Trial Balance', 'Run P&L', 'Generate Balance Sheet', 'View GL Entries', 'Posting Rules', 'Fiscal Closing'].map((action) => (
            <button
              key={action}
              className="rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// Status Badge Helpers
// ═════════════════════════════════════════════════════════
const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  reversed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
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
// 1. GENERAL LEDGER ENTRIES
// ═════════════════════════════════════════════════════════
const glColumns: ColumnDef[] = [
  { key: 'entryNumber', label: 'Entry#' },
  { key: 'entryDate', label: 'Date' },
  { key: 'accountId', label: 'Account' },
  { key: 'voucherType', label: 'Voucher Type' },
  { key: 'voucherNumber', label: 'Voucher#' },
  { key: 'debit', label: 'Debit ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'credit', label: 'Credit ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'balance', label: 'Balance ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'narration', label: 'Narration' },
];

const glFields: FormField[] = [
  { name: 'entryNumber', label: 'Entry Number', type: 'text', required: true },
  { name: 'entryDate', label: 'Entry Date', type: 'date', required: true },
  { name: 'accountId', label: 'Account ID', type: 'text', required: true },
  { name: 'ledgerId', label: 'Ledger ID', type: 'text' },
  { name: 'voucherId', label: 'Voucher ID', type: 'text', required: true },
  { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
  { name: 'debit', label: 'Debit Amount', type: 'number' },
  { name: 'credit', label: 'Credit Amount', type: 'number' },
  { name: 'narration', label: 'Narration', type: 'textarea' },
  { name: 'partyId', label: 'Party ID', type: 'text' },
  { name: 'costCenterId', label: 'Cost Center', type: 'text' },
  { name: 'branchId', label: 'Branch', type: 'text' },
];

export function GlEntriesPage() {
  return (
    <MasterDataPage
      title="General Ledger Entries"
      description="Posted ledger entries with debit/credit balances, multi-currency support, and reversal tracking"
      columns={glColumns}
      apiPath="/gl/entries"
      formFields={glFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 2. POSTING RULES
// ═════════════════════════════════════════════════════════
const ruleColumns: ColumnDef[] = [
  { key: 'ruleName', label: 'Rule Name' },
  { key: 'voucherType', label: 'Voucher Type' },
  { key: 'debitAccountId', label: 'Debit Account' },
  { key: 'creditAccountId', label: 'Credit Account' },
  { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];

const ruleFields: FormField[] = [
  { name: 'ruleName', label: 'Rule Name', type: 'text', required: true },
  { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
  { name: 'debitAccountId', label: 'Debit Account ID', type: 'text' },
  { name: 'creditAccountId', label: 'Credit Account ID', type: 'text' },
  { name: 'condition', label: 'Condition (JSON)', type: 'textarea' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function PostingRulesPage() {
  return (
    <MasterDataPage
      title="Posting Rules"
      description="Auto-posting rules that define debit/credit mappings for voucher types"
      columns={ruleColumns}
      apiPath="/gl/posting-rules"
      formFields={ruleFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 3. FISCAL CLOSING
// ═════════════════════════════════════════════════════════
const closingColumns: ColumnDef[] = [
  { key: 'financialYearId', label: 'Financial Year' },
  { key: 'closingDate', label: 'Closing Date' },
  { key: 'closingType', label: 'Type' },
  { key: 'totalRevenue', label: 'Revenue ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'totalExpenses', label: 'Expenses ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'netProfitLoss', label: 'Net P&L ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
  { key: 'status', label: 'Status', render: (v) => getStatusBadge(v as string) },
];

const closingFields: FormField[] = [
  { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
  { name: 'closingDate', label: 'Closing Date', type: 'date', required: true },
  { name: 'closingType', label: 'Closing Type', type: 'select', options: [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
  ]},
  { name: 'retainedEarningsAccountId', label: 'Retained Earnings Account', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function FiscalClosingPage() {
  return (
    <MasterDataPage
      title="Fiscal Closing Records"
      description="Period-end closing with revenue/expense summary and retained earnings transfer"
      columns={closingColumns}
      apiPath="/gl/fiscal-closing"
      formFields={closingFields}
    />
  );
}

// ═════════════════════════════════════════════════════════
// 4. TRIAL BALANCE REPORT VIEW
// ═════════════════════════════════════════════════════════
export function TrialBalancePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trial Balance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account-wise debit and credit balances with opening and closing totals
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="From date" />
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="To date" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Generate</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">🖨️ Print</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Trial Balance data will display here after generation
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 5. PROFIT & LOSS REPORT VIEW
// ═════════════════════════════════════════════════════════
export function ProfitLossPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, cost of goods sold, gross profit, operating expenses, and net profit
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="From date" />
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="To date" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Generate</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">🖨️ Print</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Profit & Loss data will display here after generation
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 6. BALANCE SHEET REPORT VIEW
// ═════════════════════════════════════════════════════════
export function BalanceSheetPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assets, liabilities, and equity with comparative year support
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="As on date" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Generate</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Balance Sheet data will display here after generation
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 7. CASH FLOW STATEMENT VIEW
// ═════════════════════════════════════════════════════════
export function CashFlowPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cash Flow Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operating, investing, and financing activities with net cash flow
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="From date" />
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="To date" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Generate</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Cash Flow data will display here after generation
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 8. DAY BOOK REPORT VIEW
// ═════════════════════════════════════════════════════════
export function DayBookPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Day Book</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily voucher register with filters and search
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Select date" />
          <select className="rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">All Voucher Types</option>
            <option value="journal">Journal</option>
            <option value="payment">Payment</option>
            <option value="receipt">Receipt</option>
            <option value="contra">Contra</option>
            <option value="sales">Sales</option>
            <option value="purchase">Purchase</option>
          </select>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Search</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">🖨️ Print</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Day Book entries will display here after search
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 9. ACCOUNT STATEMENT REPORT VIEW
// ═════════════════════════════════════════════════════════
export function AccountStatementPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ledger-wise detailed statement with opening balance, transactions, and closing balance
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="text" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Account ID" />
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="From date" />
          <input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="To date" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">Generate</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📄 PDF</button>
          <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">📤 Export</button>
        </div>
        <div className="mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground">
          Account Statement data will display here after generation
        </div>
      </div>
    </div>
  );
}
