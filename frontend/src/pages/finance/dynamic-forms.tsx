import { DynamicFormPage } from '@/components/ui/DynamicFormPage';

// ── Import field definitions from index ─────────────────
// These components wrap DynamicFormPage with the specific field configs
import type { FormField } from '../masters/master-data-page';

function makeFormPage(module: string, listPath: string, title: string, description: string, apiPath: string, fields: FormField[]) {
  return function FormPage() {
    return (
      <DynamicFormPage
        title={title}
        description={description}
        apiPath={apiPath}
        formFields={fields}
        module={module}
        listPath={listPath}
      />
    );
  };
}

// ── Field definitions (must match finance/index.tsx ────

export const accountGroupFields: FormField[] = [
  { name: 'name', label: 'Group Name', type: 'text', required: true },
  { name: 'alias', label: 'Alias', type: 'text' },
  { name: 'type', label: 'Type', type: 'select', options: [
    { label: 'Assets', value: 'assets' }, { label: 'Liabilities', value: 'liabilities' },
    { label: 'Income', value: 'income' }, { label: 'Expenses', value: 'expenses' }, { label: 'Equity', value: 'equity' },
  ], required: true },
  { name: 'parentId', label: 'Parent Group', type: 'text' },
  { name: 'level', label: 'Level', type: 'number' },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const coaFields: FormField[] = [
  { name: 'accountCode', label: 'Account Code', type: 'text', required: true },
  { name: 'accountName', label: 'Account Name', type: 'text', required: true },
  { name: 'accountType', label: 'Account Type', type: 'select', options: [
    { label: 'Assets', value: 'assets' }, { label: 'Liabilities', value: 'liabilities' },
    { label: 'Income', value: 'income' }, { label: 'Expenses', value: 'expenses' }, { label: 'Equity', value: 'equity' },
  ], required: true },
  { name: 'groupId', label: 'Group ID', type: 'text', required: true },
  { name: 'openingBalance', label: 'Opening Balance', type: 'number' },
  { name: 'openingBalanceType', label: 'Opening Type', type: 'select', options: [
    { label: 'Debit', value: 'debit' }, { label: 'Credit', value: 'credit' },
  ]},
  { name: 'currency', label: 'Currency', type: 'text' },
  { name: 'costCenterRequired', label: 'Cost Center Required', type: 'boolean' },
  { name: 'gstApplicable', label: 'GST Applicable', type: 'boolean' },
  { name: 'bankReconciliation', label: 'Bank Reconciliation', type: 'boolean' },
  { name: 'isCashAccount', label: 'Cash Account', type: 'boolean' },
  { name: 'isControlAccount', label: 'Control Account', type: 'boolean' },
  { name: 'allowManualPosting', label: 'Allow Manual Posting', type: 'boolean' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const ledgerFields: FormField[] = [
  { name: 'accountId', label: 'Account ID', type: 'text', required: true },
  { name: 'ledgerType', label: 'Ledger Type', type: 'select', options: [
    { label: 'Customer', value: 'customer' }, { label: 'Supplier', value: 'supplier' },
    { label: 'Cash', value: 'cash' }, { label: 'Bank', value: 'bank' },
    { label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }, { label: 'Tax', value: 'tax' },
  ], required: true },
  { name: 'partyId', label: 'Party ID', type: 'text' },
  { name: 'openingBalance', label: 'Opening Balance', type: 'number' },
  { name: 'openingBalanceType', label: 'Opening Type', type: 'select', options: [
    { label: 'Debit', value: 'debit' }, { label: 'Credit', value: 'credit' },
  ]},
  { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
  { name: 'creditDays', label: 'Credit Days', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const journalFields: FormField[] = [
  { name: 'voucherNumber', label: 'Voucher Number', type: 'text', required: true },
  { name: 'voucherDate', label: 'Voucher Date', type: 'date', required: true },
  { name: 'voucherType', label: 'Voucher Type', type: 'select', options: [
    { label: 'Journal', value: 'journal' }, { label: 'Payment', value: 'payment' },
    { label: 'Receipt', value: 'receipt' }, { label: 'Contra', value: 'contra' },
  ]},
  { name: 'narration', label: 'Narration', type: 'textarea' },
  { name: 'totalDebit', label: 'Total Debit', type: 'number' },
  { name: 'totalCredit', label: 'Total Credit', type: 'number' },
  { name: 'referenceNumber', label: 'Reference Number', type: 'text' },
  { name: 'costCenterId', label: 'Cost Center', type: 'text' },
];

export const costCenterFields: FormField[] = [
  { name: 'code', label: 'Cost Center Code', type: 'text', required: true },
  { name: 'name', label: 'Cost Center Name', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', options: [
    { label: 'Department', value: 'department' }, { label: 'Project', value: 'project' },
    { label: 'Branch', value: 'branch' }, { label: 'Warehouse', value: 'warehouse' }, { label: 'Profit Center', value: 'profit_center' },
  ]},
  { name: 'parentId', label: 'Parent ID', type: 'text' },
  { name: 'level', label: 'Level', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

// ── Form Page Creators ──────────────────────────────────

export const CreateAccountGroupPage = makeFormPage('Finance', '/finance/account-groups', 'Account Group', 'Nested hierarchy of account groups', '/finance/account-groups', accountGroupFields);
export const CreateChartOfAccountPage = makeFormPage('Finance', '/finance/chart-of-accounts', 'Chart of Account', 'Add a new account to the chart of accounts', '/finance/chart-of-accounts', coaFields);
export const CreateLedgerPage = makeFormPage('Finance', '/finance/ledgers', 'Ledger', 'Add customer, supplier, cash or bank ledger', '/finance/ledgers', ledgerFields);
export const CreateJournalEntryPage = makeFormPage('Finance', '/finance/journal-entries', 'Journal Entry', 'Create a double-entry voucher', '/finance/journal-entries', journalFields);
export const CreateCostCenterPage = makeFormPage('Finance', '/finance/cost-centers', 'Cost Center', 'Add cost center for departmental accounting', '/finance/cost-centers', costCenterFields);
