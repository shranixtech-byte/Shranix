import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export function GstDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">GST &amp; Financial Closing Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Active GST Registrations</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Returns Pending</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Periods Locked</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Years Closed</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">New GST Return</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Post Tax Entries</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Close Financial Year</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Generate Audit Report</button>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Reports</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'GST Summary', desc: 'Input/output tax summary by period' },
            { title: 'GST Register', desc: 'Detailed GST transaction register' },
            { title: 'Tax Ledger', desc: 'Tax account ledger with balances' },
            { title: 'Audit Report', desc: 'Complete audit trail report' },
            { title: 'Year Closing', desc: 'Financial year closing report' },
            { title: 'Financial Summary', desc: 'Comprehensive financial summary' },
          ].map((report) => (
            <div key={report.title} className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <h3 className="font-semibold">{report.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{report.desc}</p>
              <div className="mt-3 flex gap-2">
                <button className="text-xs text-primary hover:underline">PDF</button>
                <button className="text-xs text-primary hover:underline">Export</button>
                <button className="text-xs text-primary hover:underline">Print</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export function FinanceAnalyticsDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Finance Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold text-green-600">$0.00</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">GST Payable</p>
          <p className="text-2xl font-bold text-amber-600">$0.00</p>
        </div>
      </div>

      {/* Financial Health Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Receivables', value: '$0.00', icon: '💰' },
          { title: 'Payables', value: '$0.00', icon: '💳' },
          { title: 'Cash Balance', value: '$0.00', icon: '💵' },
          { title: 'Bank Balance', value: '$0.00', icon: '🏛️' },
          { title: 'Sales', value: '$0.00', icon: '📈' },
          { title: 'Purchases', value: '$0.00', icon: '📉' },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <span className="text-lg">{card.icon}</span>
            </div>
            <p className="mt-1 text-xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder Chart Area */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="font-semibold">Financial Trends</h3>
        <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Chart — Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. GST REGISTRATIONS
// ═══════════════════════════════════════════════════════════════════
const gstRegColumns: ColumnDef[] = [
  { key: 'gstin', label: 'GSTIN' },
  { key: 'tradeName', label: 'Trade Name' },
  { key: 'legalName', label: 'Legal Name' },
  { key: 'registrationType', label: 'Type' },
  { key: 'status', label: 'Status' },
];

const gstRegFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="GST Registrations"
      description="GST registration details with GSTIN, trade name, and compliance settings"
      columns={gstRegColumns}
      apiPath="/gst/registrations"
      formFields={gstRegFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. GST LEDGER
// ═══════════════════════════════════════════════════════════════════
const gstLedgerColumns: ColumnDef[] = [
  { key: 'voucherNumber', label: 'Voucher #' },
  { key: 'voucherType', label: 'Type' },
  { key: 'gstType', label: 'GST Type' },
  { key: 'gstRate', label: 'Rate', render: (v) => `${v}%` },
  { key: 'taxableValue', label: 'Taxable Value' },
  { key: 'gstAmount', label: 'GST Amount' },
  { key: 'inputOutput', label: 'I/O' },
];

const gstLedgerFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="GST Ledger"
      description="Line-level GST entries with CGST, SGST, IGST, CESS, and input/output tracking"
      columns={gstLedgerColumns}
      apiPath="/gst/ledger"
      formFields={gstLedgerFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. GST RETURNS
// ═══════════════════════════════════════════════════════════════════
const gstReturnColumns: ColumnDef[] = [
  { key: 'returnType', label: 'Return Type' },
  { key: 'returnPeriod', label: 'Period' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'status', label: 'Status' },
  { key: 'netTaxPayable', label: 'Net Tax' },
  { key: 'balanceDue', label: 'Balance Due' },
];

const gstReturnFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="GST Returns"
      description="GSTR1, GSTR3B, GSTR9 return preparation with tax calculations"
      columns={gstReturnColumns}
      apiPath="/gst/returns"
      formFields={gstReturnFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. TAX POSTINGS
// ═══════════════════════════════════════════════════════════════════
const taxPostingColumns: ColumnDef[] = [
  { key: 'postingType', label: 'Posting Type' },
  { key: 'sourceType', label: 'Source' },
  { key: 'sourceNumber', label: 'Source #' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
];

const taxPostingFields: FormField[] = [
  { name: 'postingType', label: 'Posting Type', type: 'text', required: true },
  { name: 'sourceType', label: 'Source Type', type: 'text', required: true },
  { name: 'sourceId', label: 'Source ID', type: 'text', required: true },
  { name: 'sourceNumber', label: 'Source Number', type: 'text' },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'taxAmount', label: 'Tax Amount', type: 'number' },
  { name: 'totalAmount', label: 'Total Amount', type: 'number' },
];

export function TaxPostingsPage() {
  return (
    <MasterDataPage
      title="Tax Postings"
      description="Automated tax posting records for purchase, sales, expense, and payroll"
      columns={taxPostingColumns}
      apiPath="/gst/tax-postings"
      formFields={taxPostingFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. YEAR CLOSING
// ═══════════════════════════════════════════════════════════════════
const yearClosingColumns: ColumnDef[] = [
  { key: 'closingNumber', label: 'Closing #' },
  { key: 'closingType', label: 'Type' },
  { key: 'closingDate', label: 'Closing Date' },
  { key: 'status', label: 'Status' },
  { key: 'netProfit', label: 'Net Profit' },
  { key: 'retainedEarnings', label: 'Retained Earnings' },
];

const yearClosingFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Year Closing Records"
      description="Financial year closing with profit/loss transfer and retained earnings"
      columns={yearClosingColumns}
      apiPath="/gst/year-closing"
      formFields={yearClosingFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 6. PERIOD LOCKS
// ═══════════════════════════════════════════════════════════════════
const periodLockColumns: ColumnDef[] = [
  { key: 'periodType', label: 'Period Type' },
  { key: 'periodKey', label: 'Period Key' },
  { key: 'isLocked', label: 'Locked' },
  { key: 'module', label: 'Module' },
  { key: 'roleRequired', label: 'Role Required' },
];

const periodLockFields: FormField[] = [
  { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
  { name: 'periodType', label: 'Period Type', type: 'text', required: true },
  { name: 'periodKey', label: 'Period Key', type: 'text', required: true },
  { name: 'periodStart', label: 'Period Start', type: 'date', required: true },
  { name: 'periodEnd', label: 'Period End', type: 'date', required: true },
  { name: 'module', label: 'Module', type: 'text' },
  { name: 'roleRequired', label: 'Role Required', type: 'text' },
];

export function PeriodLocksPage() {
  return (
    <MasterDataPage
      title="Period Locks"
      description="Daily, monthly, quarterly, and yearly period locking with role-based unlock"
      columns={periodLockColumns}
      apiPath="/gst/period-locks"
      formFields={periodLockFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 7. OPENING BALANCE TRANSFERS
// ═══════════════════════════════════════════════════════════════════
const obTransferColumns: ColumnDef[] = [
  { key: 'transferNumber', label: 'Transfer #' },
  { key: 'fromFinancialYearId', label: 'From FY' },
  { key: 'toFinancialYearId', label: 'To FY' },
  { key: 'status', label: 'Status' },
  { key: 'totalDebit', label: 'Total Debit' },
  { key: 'totalCredit', label: 'Total Credit' },
];

const obTransferFields: FormField[] = [
  { name: 'transferNumber', label: 'Transfer Number', type: 'text', required: true },
  { name: 'fromFinancialYearId', label: 'From Financial Year ID', type: 'text', required: true },
  { name: 'toFinancialYearId', label: 'To Financial Year ID', type: 'text', required: true },
  { name: 'transferDate', label: 'Transfer Date', type: 'date', required: true },
  { name: 'transferType', label: 'Transfer Type', type: 'text' },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
];

export function OpeningBalanceTransfersPage() {
  return (
    <MasterDataPage
      title="Opening Balance Transfers"
      description="Carry forward opening balances from one financial year to another"
      columns={obTransferColumns}
      apiPath="/gst/opening-balance-transfers"
      formFields={obTransferFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 8. YEAR-END ENTRIES
// ═══════════════════════════════════════════════════════════════════
const yeColumns: ColumnDef[] = [
  { key: 'entryNumber', label: 'Entry #' },
  { key: 'entryType', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'debitAmount', label: 'Debit' },
  { key: 'creditAmount', label: 'Credit' },
  { key: 'status', label: 'Status' },
];

const yeFields: FormField[] = [
  { name: 'closingRecordId', label: 'Closing Record ID', type: 'text', required: true },
  { name: 'entryNumber', label: 'Entry Number', type: 'text', required: true },
  { name: 'entryType', label: 'Entry Type', type: 'text', required: true },
  { name: 'amount', label: 'Amount', type: 'number', required: true },
  { name: 'debitAmount', label: 'Debit Amount', type: 'number' },
  { name: 'creditAmount', label: 'Credit Amount', type: 'number' },
  { name: 'narration', label: 'Narration', type: 'textarea' },
];

export function YearEndEntriesPage() {
  return (
    <MasterDataPage
      title="Year-End Entries"
      description="Closing entries for profit transfer, loss transfer, and retained earnings"
      columns={yeColumns}
      apiPath="/gst/year-end-entries"
      formFields={yeFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 9. AUDIT DETAILS
// ═══════════════════════════════════════════════════════════════════
const auditColumns: ColumnDef[] = [
  { key: 'action', label: 'Action' },
  { key: 'entityType', label: 'Entity' },
  { key: 'userName', label: 'User' },
  { key: 'module', label: 'Module' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'status', label: 'Status' },
];

const auditFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Audit Trail"
      description="Comprehensive audit log with create, update, delete, approval, posting, and login tracking"
      columns={auditColumns}
      apiPath="/gst/audit-details"
      formFields={auditFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 10. NUMBER SERIES
// ═══════════════════════════════════════════════════════════════════
const nsColumns: ColumnDef[] = [
  { key: 'seriesName', label: 'Series Name' },
  { key: 'seriesCode', label: 'Code' },
  { key: 'module', label: 'Module' },
  { key: 'documentType', label: 'Document Type' },
  { key: 'currentNumber', label: 'Current #' },
  { key: 'isActive', label: 'Active' },
];

const nsFields: FormField[] = [
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
  return (
    <MasterDataPage
      title="Number Series"
      description="Centralized auto-numbering configuration for all document types with prefix, suffix, and reset"
      columns={nsColumns}
      apiPath="/gst/number-series"
      formFields={nsFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 11. VOUCHER APPROVALS
// ═══════════════════════════════════════════════════════════════════
const vaColumns: ColumnDef[] = [
  { key: 'approvalNumber', label: 'Approval #' },
  { key: 'voucherType', label: 'Voucher Type' },
  { key: 'voucherNumber', label: 'Voucher #' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount' },
  { key: 'approvalLevel', label: 'Level' },
];

const vaFields: FormField[] = [
  { name: 'approvalNumber', label: 'Approval Number', type: 'text', required: true },
  { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
  { name: 'voucherId', label: 'Voucher ID', type: 'text', required: true },
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
  { name: 'module', label: 'Module', type: 'text', required: true },
  { name: 'amount', label: 'Amount', type: 'number' },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
];

export function VoucherApprovalsPage() {
  return (
    <MasterDataPage
      title="Voucher Approvals"
      description="Multi-level approval workflow for journal, sales, purchase, and other vouchers"
      columns={vaColumns}
      apiPath="/gst/voucher-approvals"
      formFields={vaFields}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// 12. GST/AUDIT SETTINGS
// ═══════════════════════════════════════════════════════════════════
const gasColumns: ColumnDef[] = [
  { key: 'settingKey', label: 'Setting Key' },
  { key: 'settingValue', label: 'Value' },
  { key: 'settingGroup', label: 'Group' },
  { key: 'dataType', label: 'Data Type' },
];

const gasFields: FormField[] = [
  { name: 'settingKey', label: 'Setting Key', type: 'text', required: true },
  { name: 'settingValue', label: 'Setting Value', type: 'text', required: true },
  { name: 'settingGroup', label: 'Group', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'dataType', label: 'Data Type', type: 'text' },
];

export function GstAuditSettingsPage() {
  return (
    <MasterDataPage
      title="GST & Audit Settings"
      description="Configuration for GST, audit, closing, number series, and approval settings"
      columns={gasColumns}
      apiPath="/gst/settings"
      formFields={gasFields}
    />
  );
}
