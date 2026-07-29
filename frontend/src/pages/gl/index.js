import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
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
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Financial Dashboard" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Enterprise financial overview with real-time GL summary and report access" })] }), _jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: statCards.map((card) => (_jsxs("div", { className: `rounded-lg border-l-4 p-4 shadow-sm ${card.color} ${card.bg}`, children: [_jsx("p", { className: "text-sm font-medium text-muted-foreground", children: card.label }), _jsx("p", { className: "mt-1 text-2xl font-bold", children: card.value })] }, card.label))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Financial Statements" }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: [
                            { label: 'Trial Balance', desc: 'Account-wise debit/credit balances', icon: '⚖️' },
                            { label: 'Profit & Loss', desc: 'Revenue, expenses, and net profit', icon: '📈' },
                            { label: 'Balance Sheet', desc: 'Assets, liabilities, and equity', icon: '📊' },
                            { label: 'Cash Flow Statement', desc: 'Operating, investing, financing activities', icon: '💵' },
                            { label: 'Day Book', desc: 'Daily voucher register', icon: '📅' },
                            { label: 'Account Statement', desc: 'Ledger-wise detailed statement', icon: '📋' },
                        ].map((report) => (_jsx("div", { className: "cursor-pointer rounded-md border p-4 transition-all hover:bg-accent hover:shadow-md", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-2xl", children: report.icon }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: report.label }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: report.desc })] })] }) }, report.label))) })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Quick Actions" }), _jsx("div", { className: "flex flex-wrap gap-3", children: ['Generate Trial Balance', 'Run P&L', 'Generate Balance Sheet', 'View GL Entries', 'Posting Rules', 'Fiscal Closing'].map((action) => (_jsx("button", { className: "rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20", children: action }, action))) })] })] }));
}
// ═════════════════════════════════════════════════════════
// Status Badge Helpers
// ═════════════════════════════════════════════════════════
const statusStyles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    reversed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
function getStatusBadge(status) {
    const style = statusStyles[status] || statusStyles.draft;
    return (_jsx("span", { className: `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`, children: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
}
// ═════════════════════════════════════════════════════════
// 1. GENERAL LEDGER ENTRIES
// ═════════════════════════════════════════════════════════
const glColumns = [
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
const glFields = [
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
    return (_jsx(MasterDataPage, { title: "General Ledger Entries", description: "Posted ledger entries with debit/credit balances, multi-currency support, and reversal tracking", columns: glColumns, apiPath: "/gl/entries", formFields: glFields }));
}
// ═════════════════════════════════════════════════════════
// 2. POSTING RULES
// ═════════════════════════════════════════════════════════
const ruleColumns = [
    { key: 'ruleName', label: 'Rule Name' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'debitAccountId', label: 'Debit Account' },
    { key: 'creditAccountId', label: 'Credit Account' },
    { key: 'isActive', label: 'Status', render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];
const ruleFields = [
    { name: 'ruleName', label: 'Rule Name', type: 'text', required: true },
    { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
    { name: 'debitAccountId', label: 'Debit Account ID', type: 'text' },
    { name: 'creditAccountId', label: 'Credit Account ID', type: 'text' },
    { name: 'condition', label: 'Condition (JSON)', type: 'textarea' },
    { name: 'description', label: 'Description', type: 'textarea' },
];
export function PostingRulesPage() {
    return (_jsx(MasterDataPage, { title: "Posting Rules", description: "Auto-posting rules that define debit/credit mappings for voucher types", columns: ruleColumns, apiPath: "/gl/posting-rules", formFields: ruleFields }));
}
// ═════════════════════════════════════════════════════════
// 3. FISCAL CLOSING
// ═════════════════════════════════════════════════════════
const closingColumns = [
    { key: 'financialYearId', label: 'Financial Year' },
    { key: 'closingDate', label: 'Closing Date' },
    { key: 'closingType', label: 'Type' },
    { key: 'totalRevenue', label: 'Revenue ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'totalExpenses', label: 'Expenses ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'netProfitLoss', label: 'Net P&L ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
    { key: 'status', label: 'Status', render: (v) => getStatusBadge(v) },
];
const closingFields = [
    { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
    { name: 'closingDate', label: 'Closing Date', type: 'date', required: true },
    { name: 'closingType', label: 'Closing Type', type: 'select', options: [
            { label: 'Monthly', value: 'monthly' },
            { label: 'Quarterly', value: 'quarterly' },
            { label: 'Yearly', value: 'yearly' },
        ] },
    { name: 'retainedEarningsAccountId', label: 'Retained Earnings Account', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
export function FiscalClosingPage() {
    return (_jsx(MasterDataPage, { title: "Fiscal Closing Records", description: "Period-end closing with revenue/expense summary and retained earnings transfer", columns: closingColumns, apiPath: "/gl/fiscal-closing", formFields: closingFields }));
}
// ═════════════════════════════════════════════════════════
// 4. TRIAL BALANCE REPORT VIEW
// ═════════════════════════════════════════════════════════
export function TrialBalancePage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Trial Balance" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Account-wise debit and credit balances with opening and closing totals" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "From date" }), _jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "To date" }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDDA8\uFE0F Print" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Trial Balance data will display here after generation" })] })] }));
}
// ═════════════════════════════════════════════════════════
// 5. PROFIT & LOSS REPORT VIEW
// ═════════════════════════════════════════════════════════
export function ProfitLossPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Profit & Loss Statement" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Revenue, cost of goods sold, gross profit, operating expenses, and net profit" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "From date" }), _jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "To date" }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDDA8\uFE0F Print" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Profit & Loss data will display here after generation" })] })] }));
}
// ═════════════════════════════════════════════════════════
// 6. BALANCE SHEET REPORT VIEW
// ═════════════════════════════════════════════════════════
export function BalanceSheetPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Balance Sheet" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Assets, liabilities, and equity with comparative year support" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "As on date" }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Balance Sheet data will display here after generation" })] })] }));
}
// ═════════════════════════════════════════════════════════
// 7. CASH FLOW STATEMENT VIEW
// ═════════════════════════════════════════════════════════
export function CashFlowPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Cash Flow Statement" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Operating, investing, and financing activities with net cash flow" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "From date" }), _jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "To date" }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Cash Flow data will display here after generation" })] })] }));
}
// ═════════════════════════════════════════════════════════
// 8. DAY BOOK REPORT VIEW
// ═════════════════════════════════════════════════════════
export function DayBookPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Day Book" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Daily voucher register with filters and search" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "Select date" }), _jsxs("select", { className: "rounded-lg border bg-background px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "All Voucher Types" }), _jsx("option", { value: "journal", children: "Journal" }), _jsx("option", { value: "payment", children: "Payment" }), _jsx("option", { value: "receipt", children: "Receipt" }), _jsx("option", { value: "contra", children: "Contra" }), _jsx("option", { value: "sales", children: "Sales" }), _jsx("option", { value: "purchase", children: "Purchase" })] }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Search" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDDA8\uFE0F Print" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Day Book entries will display here after search" })] })] }));
}
// ═════════════════════════════════════════════════════════
// 9. ACCOUNT STATEMENT REPORT VIEW
// ═════════════════════════════════════════════════════════
export function AccountStatementPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Account Statement" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Ledger-wise detailed statement with opening balance, transactions, and closing balance" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { type: "text", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "Account ID" }), _jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "From date" }), _jsx("input", { type: "date", className: "rounded-lg border bg-background px-3 py-2 text-sm", placeholder: "To date" }), _jsx("button", { className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90", children: "Generate" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCC4 PDF" }), _jsx("button", { className: "rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted", children: "\uD83D\uDCE4 Export" })] }), _jsx("div", { className: "mt-6 flex h-48 items-center justify-center rounded-md border-2 border-dashed text-sm text-muted-foreground", children: "Account Statement data will display here after generation" })] })] }));
}
//# sourceMappingURL=index.js.map