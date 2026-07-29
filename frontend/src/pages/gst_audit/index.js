import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MasterDataPage } from '../masters/master-data-page';
// ═══════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export function GstDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "GST & Financial Closing Dashboard" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Active GST Registrations" }), _jsx("p", { className: "text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Returns Pending" }), _jsx("p", { className: "text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Periods Locked" }), _jsx("p", { className: "text-2xl font-bold", children: "0" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Years Closed" }), _jsx("p", { className: "text-2xl font-bold", children: "0" })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Quick Actions" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "New GST Return" }), _jsx("button", { className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "Post Tax Entries" }), _jsx("button", { className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "Close Financial Year" }), _jsx("button", { className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "Generate Audit Report" })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Reports" }), _jsx("div", { className: "grid gap-4 md:grid-cols-3", children: [
                            { title: 'GST Summary', desc: 'Input/output tax summary by period' },
                            { title: 'GST Register', desc: 'Detailed GST transaction register' },
                            { title: 'Tax Ledger', desc: 'Tax account ledger with balances' },
                            { title: 'Audit Report', desc: 'Complete audit trail report' },
                            { title: 'Year Closing', desc: 'Financial year closing report' },
                            { title: 'Financial Summary', desc: 'Comprehensive financial summary' },
                        ].map((report) => (_jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("h3", { className: "font-semibold", children: report.title }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: report.desc }), _jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("button", { className: "text-xs text-primary hover:underline", children: "PDF" }), _jsx("button", { className: "text-xs text-primary hover:underline", children: "Export" }), _jsx("button", { className: "text-xs text-primary hover:underline", children: "Print" })] })] }, report.title))) })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export function FinanceAnalyticsDashboardPage() {
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Finance Analytics Dashboard" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-4", children: [_jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Total Revenue" }), _jsx("p", { className: "text-2xl font-bold", children: "$0.00" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Total Expenses" }), _jsx("p", { className: "text-2xl font-bold", children: "$0.00" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Net Profit" }), _jsx("p", { className: "text-2xl font-bold text-green-600", children: "$0.00" })] }), _jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "GST Payable" }), _jsx("p", { className: "text-2xl font-bold text-amber-600", children: "$0.00" })] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-3", children: [
                    { title: 'Receivables', value: '$0.00', icon: '💰' },
                    { title: 'Payables', value: '$0.00', icon: '💳' },
                    { title: 'Cash Balance', value: '$0.00', icon: '💵' },
                    { title: 'Bank Balance', value: '$0.00', icon: '🏛️' },
                    { title: 'Sales', value: '$0.00', icon: '📈' },
                    { title: 'Purchases', value: '$0.00', icon: '📉' },
                ].map((card) => (_jsxs("div", { className: "rounded-lg border bg-card p-4 text-card-foreground shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: card.title }), _jsx("span", { className: "text-lg", children: card.icon })] }), _jsx("p", { className: "mt-1 text-xl font-bold", children: card.value })] }, card.title))) }), _jsxs("div", { className: "rounded-lg border bg-card p-6 text-card-foreground shadow-sm", children: [_jsx("h3", { className: "font-semibold", children: "Financial Trends" }), _jsx("div", { className: "mt-4 flex h-48 items-center justify-center rounded-md bg-muted/50", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "Chart \u2014 Coming Soon" }) })] })] }));
}
// ═══════════════════════════════════════════════════════════════════
// 1. GST REGISTRATIONS
// ═══════════════════════════════════════════════════════════════════
const gstRegColumns = [
    { key: 'gstin', label: 'GSTIN' },
    { key: 'tradeName', label: 'Trade Name' },
    { key: 'legalName', label: 'Legal Name' },
    { key: 'registrationType', label: 'Type' },
    { key: 'status', label: 'Status' },
];
const gstRegFields = [
    { name: 'gstin', label: 'GSTIN', type: 'text', required: true },
    { name: 'tradeName', label: 'Trade Name', type: 'text', required: true },
    { name: 'legalName', label: 'Legal Name', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'stateCode', label: 'State Code', type: 'text' },
    { name: 'registrationType', label: 'Registration Type', type: 'text' },
    { name: 'validFrom', label: 'Valid From', type: 'date' },
    { name: 'validTo', label: 'Valid To', type: 'date' },
];
export function GstRegistrationsPage() {
    return (_jsx(MasterDataPage, { title: "GST Registrations", description: "GST registration details with GSTIN, trade name, and compliance settings", columns: gstRegColumns, apiPath: "/gst/registrations", formFields: gstRegFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 2. GST LEDGER
// ═══════════════════════════════════════════════════════════════════
const gstLedgerColumns = [
    { key: 'voucherNumber', label: 'Voucher #' },
    { key: 'voucherType', label: 'Type' },
    { key: 'gstType', label: 'GST Type' },
    { key: 'gstRate', label: 'Rate', render: (v) => `${v}%` },
    { key: 'taxableValue', label: 'Taxable Value' },
    { key: 'gstAmount', label: 'GST Amount' },
    { key: 'inputOutput', label: 'I/O' },
];
const gstLedgerFields = [
    { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
    { name: 'voucherId', label: 'Voucher ID', type: 'text', required: true },
    { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
    { name: 'voucherDate', label: 'Voucher Date', type: 'date', required: true },
    { name: 'gstType', label: 'GST Type', type: 'text', required: true },
    { name: 'gstRate', label: 'GST Rate (%)', type: 'number', required: true },
    { name: 'taxableValue', label: 'Taxable Value', type: 'number', required: true },
    { name: 'gstAmount', label: 'GST Amount', type: 'number', required: true },
    { name: 'inputOutput', label: 'Input/Output', type: 'text', required: true },
    { name: 'hsnSacCode', label: 'HSN/SAC Code', type: 'text' },
];
export function GstLedgerPage() {
    return (_jsx(MasterDataPage, { title: "GST Ledger", description: "Line-level GST entries with CGST, SGST, IGST, CESS, and input/output tracking", columns: gstLedgerColumns, apiPath: "/gst/ledger", formFields: gstLedgerFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 3. GST RETURNS
// ═══════════════════════════════════════════════════════════════════
const gstReturnColumns = [
    { key: 'returnType', label: 'Return Type' },
    { key: 'returnPeriod', label: 'Period' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'status', label: 'Status' },
    { key: 'netTaxPayable', label: 'Net Tax' },
    { key: 'balanceDue', label: 'Balance Due' },
];
const gstReturnFields = [
    { name: 'returnType', label: 'Return Type', type: 'text', required: true },
    { name: 'returnPeriod', label: 'Return Period', type: 'text', required: true },
    { name: 'financialYear', label: 'Financial Year', type: 'text', required: true },
    { name: 'gstin', label: 'GSTIN', type: 'text', required: true },
    { name: 'totalOutwardSupply', label: 'Total Outward Supply', type: 'number' },
    { name: 'totalInwardSupply', label: 'Total Inward Supply', type: 'number' },
    { name: 'totalInputTaxCredit', label: 'Total ITC', type: 'number' },
    { name: 'totalOutputTax', label: 'Total Output Tax', type: 'number' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function GstReturnsPage() {
    return (_jsx(MasterDataPage, { title: "GST Returns", description: "GSTR1, GSTR3B, GSTR9 return preparation with tax calculations", columns: gstReturnColumns, apiPath: "/gst/returns", formFields: gstReturnFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 4. TAX POSTINGS
// ═══════════════════════════════════════════════════════════════════
const taxPostingColumns = [
    { key: 'postingType', label: 'Posting Type' },
    { key: 'sourceType', label: 'Source' },
    { key: 'sourceNumber', label: 'Source #' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
];
const taxPostingFields = [
    { name: 'postingType', label: 'Posting Type', type: 'text', required: true },
    { name: 'sourceType', label: 'Source Type', type: 'text', required: true },
    { name: 'sourceId', label: 'Source ID', type: 'text', required: true },
    { name: 'sourceNumber', label: 'Source Number', type: 'text' },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'taxAmount', label: 'Tax Amount', type: 'number' },
    { name: 'totalAmount', label: 'Total Amount', type: 'number' },
];
export function TaxPostingsPage() {
    return (_jsx(MasterDataPage, { title: "Tax Postings", description: "Automated tax posting records for purchase, sales, expense, and payroll", columns: taxPostingColumns, apiPath: "/gst/tax-postings", formFields: taxPostingFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 5. YEAR CLOSING
// ═══════════════════════════════════════════════════════════════════
const yearClosingColumns = [
    { key: 'closingNumber', label: 'Closing #' },
    { key: 'closingType', label: 'Type' },
    { key: 'closingDate', label: 'Closing Date' },
    { key: 'status', label: 'Status' },
    { key: 'netProfit', label: 'Net Profit' },
    { key: 'retainedEarnings', label: 'Retained Earnings' },
];
const yearClosingFields = [
    { name: 'closingNumber', label: 'Closing Number', type: 'text', required: true },
    { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
    { name: 'closingType', label: 'Closing Type', type: 'text', required: true },
    { name: 'closingDate', label: 'Closing Date', type: 'date', required: true },
    { name: 'totalRevenue', label: 'Total Revenue', type: 'number' },
    { name: 'totalExpenses', label: 'Total Expenses', type: 'number' },
    { name: 'netProfit', label: 'Net Profit', type: 'number' },
    { name: 'closingRemarks', label: 'Closing Remarks', type: 'textarea' },
];
export function YearClosingPage() {
    return (_jsx(MasterDataPage, { title: "Year Closing Records", description: "Financial year closing with profit/loss transfer and retained earnings", columns: yearClosingColumns, apiPath: "/gst/year-closing", formFields: yearClosingFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 6. PERIOD LOCKS
// ═══════════════════════════════════════════════════════════════════
const periodLockColumns = [
    { key: 'periodType', label: 'Period Type' },
    { key: 'periodKey', label: 'Period Key' },
    { key: 'isLocked', label: 'Locked' },
    { key: 'module', label: 'Module' },
    { key: 'roleRequired', label: 'Role Required' },
];
const periodLockFields = [
    { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
    { name: 'periodType', label: 'Period Type', type: 'text', required: true },
    { name: 'periodKey', label: 'Period Key', type: 'text', required: true },
    { name: 'periodStart', label: 'Period Start', type: 'date', required: true },
    { name: 'periodEnd', label: 'Period End', type: 'date', required: true },
    { name: 'module', label: 'Module', type: 'text' },
    { name: 'roleRequired', label: 'Role Required', type: 'text' },
];
export function PeriodLocksPage() {
    return (_jsx(MasterDataPage, { title: "Period Locks", description: "Daily, monthly, quarterly, and yearly period locking with role-based unlock", columns: periodLockColumns, apiPath: "/gst/period-locks", formFields: periodLockFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 7. OPENING BALANCE TRANSFERS
// ═══════════════════════════════════════════════════════════════════
const obTransferColumns = [
    { key: 'transferNumber', label: 'Transfer #' },
    { key: 'fromFinancialYearId', label: 'From FY' },
    { key: 'toFinancialYearId', label: 'To FY' },
    { key: 'status', label: 'Status' },
    { key: 'totalDebit', label: 'Total Debit' },
    { key: 'totalCredit', label: 'Total Credit' },
];
const obTransferFields = [
    { name: 'transferNumber', label: 'Transfer Number', type: 'text', required: true },
    { name: 'fromFinancialYearId', label: 'From Financial Year ID', type: 'text', required: true },
    { name: 'toFinancialYearId', label: 'To Financial Year ID', type: 'text', required: true },
    { name: 'transferDate', label: 'Transfer Date', type: 'date', required: true },
    { name: 'transferType', label: 'Transfer Type', type: 'text' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function OpeningBalanceTransfersPage() {
    return (_jsx(MasterDataPage, { title: "Opening Balance Transfers", description: "Carry forward opening balances from one financial year to another", columns: obTransferColumns, apiPath: "/gst/opening-balance-transfers", formFields: obTransferFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 8. YEAR-END ENTRIES
// ═══════════════════════════════════════════════════════════════════
const yeColumns = [
    { key: 'entryNumber', label: 'Entry #' },
    { key: 'entryType', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'debitAmount', label: 'Debit' },
    { key: 'creditAmount', label: 'Credit' },
    { key: 'status', label: 'Status' },
];
const yeFields = [
    { name: 'closingRecordId', label: 'Closing Record ID', type: 'text', required: true },
    { name: 'entryNumber', label: 'Entry Number', type: 'text', required: true },
    { name: 'entryType', label: 'Entry Type', type: 'text', required: true },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'debitAmount', label: 'Debit Amount', type: 'number' },
    { name: 'creditAmount', label: 'Credit Amount', type: 'number' },
    { name: 'narration', label: 'Narration', type: 'textarea' },
];
export function YearEndEntriesPage() {
    return (_jsx(MasterDataPage, { title: "Year-End Entries", description: "Closing entries for profit transfer, loss transfer, and retained earnings", columns: yeColumns, apiPath: "/gst/year-end-entries", formFields: yeFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 9. AUDIT DETAILS
// ═══════════════════════════════════════════════════════════════════
const auditColumns = [
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entity' },
    { key: 'userName', label: 'User' },
    { key: 'module', label: 'Module' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'status', label: 'Status' },
];
const auditFields = [
    { name: 'auditLogId', label: 'Audit Log ID', type: 'text', required: true },
    { name: 'action', label: 'Action', type: 'text', required: true },
    { name: 'entityType', label: 'Entity Type', type: 'text', required: true },
    { name: 'entityId', label: 'Entity ID', type: 'text' },
    { name: 'userName', label: 'User Name', type: 'text' },
    { name: 'module', label: 'Module', type: 'text', required: true },
    { name: 'actionType', label: 'Action Type', type: 'text', required: true },
    { name: 'timestamp', label: 'Timestamp', type: 'text', required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function AuditDetailsPage() {
    return (_jsx(MasterDataPage, { title: "Audit Trail", description: "Comprehensive audit log with create, update, delete, approval, posting, and login tracking", columns: auditColumns, apiPath: "/gst/audit-details", formFields: auditFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 10. NUMBER SERIES
// ═══════════════════════════════════════════════════════════════════
const nsColumns = [
    { key: 'seriesName', label: 'Series Name' },
    { key: 'seriesCode', label: 'Code' },
    { key: 'module', label: 'Module' },
    { key: 'documentType', label: 'Document Type' },
    { key: 'currentNumber', label: 'Current #' },
    { key: 'isActive', label: 'Active' },
];
const nsFields = [
    { name: 'seriesName', label: 'Series Name', type: 'text', required: true },
    { name: 'seriesCode', label: 'Series Code', type: 'text', required: true },
    { name: 'module', label: 'Module', type: 'text', required: true },
    { name: 'documentType', label: 'Document Type', type: 'text', required: true },
    { name: 'prefix', label: 'Prefix', type: 'text' },
    { name: 'suffix', label: 'Suffix', type: 'text' },
    { name: 'startNumber', label: 'Start Number', type: 'number' },
    { name: 'currentNumber', label: 'Current Number', type: 'number' },
    { name: 'padLength', label: 'Pad Length', type: 'number' },
    { name: 'resetFrequency', label: 'Reset Frequency', type: 'text' },
];
export function NumberSeriesPage() {
    return (_jsx(MasterDataPage, { title: "Number Series", description: "Centralized auto-numbering configuration for all document types with prefix, suffix, and reset", columns: nsColumns, apiPath: "/gst/number-series", formFields: nsFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 11. VOUCHER APPROVALS
// ═══════════════════════════════════════════════════════════════════
const vaColumns = [
    { key: 'approvalNumber', label: 'Approval #' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'voucherNumber', label: 'Voucher #' },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Amount' },
    { key: 'approvalLevel', label: 'Level' },
];
const vaFields = [
    { name: 'approvalNumber', label: 'Approval Number', type: 'text', required: true },
    { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
    { name: 'voucherId', label: 'Voucher ID', type: 'text', required: true },
    { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
    { name: 'module', label: 'Module', type: 'text', required: true },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
];
export function VoucherApprovalsPage() {
    return (_jsx(MasterDataPage, { title: "Voucher Approvals", description: "Multi-level approval workflow for journal, sales, purchase, and other vouchers", columns: vaColumns, apiPath: "/gst/voucher-approvals", formFields: vaFields }));
}
// ═══════════════════════════════════════════════════════════════════
// 12. GST/AUDIT SETTINGS
// ═══════════════════════════════════════════════════════════════════
const gasColumns = [
    { key: 'settingKey', label: 'Setting Key' },
    { key: 'settingValue', label: 'Value' },
    { key: 'settingGroup', label: 'Group' },
    { key: 'dataType', label: 'Data Type' },
];
const gasFields = [
    { name: 'settingKey', label: 'Setting Key', type: 'text', required: true },
    { name: 'settingValue', label: 'Setting Value', type: 'text', required: true },
    { name: 'settingGroup', label: 'Group', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'dataType', label: 'Data Type', type: 'text' },
];
export function GstAuditSettingsPage() {
    return (_jsx(MasterDataPage, { title: "GST & Audit Settings", description: "Configuration for GST, audit, closing, number series, and approval settings", columns: gasColumns, apiPath: "/gst/settings", formFields: gasFields }));
}
//# sourceMappingURL=index.js.map