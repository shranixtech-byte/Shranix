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

// ── Field definitions (must match purchase/index.tsx ────

export const settingsFields: FormField[] = [
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

// ── Form Page Creators ──────────────────────────────────

export const CreatePurchaseSettingsPage = makeFormPage(
  'Purchase',
  '/purchase/settings',
  'Purchase Setting',
  'Add global purchase configuration: numbering, auto GRN, approvals, credit days, defaults',
  '/purchase/settings',
  settingsFields,
);
