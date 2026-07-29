import { DynamicFormPage } from '@/components/ui/DynamicFormPage';
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

export const glEntryFields: FormField[] = [
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

export const postingRuleFields: FormField[] = [
  { name: 'ruleName', label: 'Rule Name', type: 'text', required: true },
  { name: 'voucherType', label: 'Voucher Type', type: 'text', required: true },
  { name: 'debitAccountId', label: 'Debit Account ID', type: 'text' },
  { name: 'creditAccountId', label: 'Credit Account ID', type: 'text' },
  { name: 'condition', label: 'Condition (JSON)', type: 'textarea' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export const closingFields: FormField[] = [
  { name: 'financialYearId', label: 'Financial Year ID', type: 'text', required: true },
  { name: 'closingDate', label: 'Closing Date', type: 'date', required: true },
  { name: 'closingType', label: 'Closing Type', type: 'select', options: [
    { label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'Yearly', value: 'yearly' },
  ]},
  { name: 'retainedEarningsAccountId', label: 'Retained Earnings Account', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const CreateGlEntryPage = makeFormPage('GL & Reports', '/gl/entries', 'GL Entry', 'Create a general ledger entry', '/gl/entries', glEntryFields);
export const CreatePostingRulePage = makeFormPage('GL & Reports', '/gl/posting-rules', 'Posting Rule', 'Define auto-posting debit/credit mappings', '/gl/posting-rules', postingRuleFields);
export const CreateFiscalClosingPage = makeFormPage('GL & Reports', '/gl/fiscal-closing', 'Fiscal Closing', 'Period-end closing record', '/gl/fiscal-closing', closingFields);
