import { DynamicFormPage } from '@/components/ui/DynamicFormPage';

import type { FormField } from '../masters/master-data-page';

function makeFormPage(
  module: string,
  listPath: string,
  title: string,
  description: string,
  apiPath: string,
  fields: FormField[],
) {
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

// ── Field definitions (must match sales/index.tsx ──────

export const settingsFields: FormField[] = [
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

// ── Form Page Creators ──────────────────────────────────

export const CreateSalesSettingsPage = makeFormPage(
  'Sales',
  '/sales/settings',
  'Sales Setting',
  'Add global sales configuration: numbering, approvals, discount & credit rules, alerts',
  '/sales/settings',
  settingsFields,
);
