import { jsx as _jsx } from "react/jsx-runtime";
import { DynamicFormPage } from '@/components/ui/DynamicFormPage';
function makeFormPage(module, listPath, title, description, apiPath, fields) {
    return function FormPage() {
        return (_jsx(DynamicFormPage, { title: title, description: description, apiPath: apiPath, formFields: fields, module: module, listPath: listPath }));
    };
}
export const gstRegistrationFields = [
    { name: 'gstin', label: 'GSTIN', type: 'text', required: true },
    { name: 'tradeName', label: 'Trade Name', type: 'text', required: true },
    { name: 'legalName', label: 'Legal Name', type: 'text' },
    { name: 'state', label: 'State', type: 'text' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'registrationType', label: 'Registration Type', type: 'select', options: [
            { label: 'Regular', value: 'regular' }, { label: 'Composition', value: 'composition' },
            { label: 'Unregistered', value: 'unregistered' },
        ] },
    { name: 'taxpayerType', label: 'Taxpayer Type', type: 'select', options: [
            { label: 'Regular', value: 'regular' }, { label: 'Composition', value: 'composition' },
        ] },
    { name: 'returnType', label: 'Return Type', type: 'select', options: [
            { label: 'GSTR-1', value: 'gstr1' }, { label: 'GSTR-3B', value: 'gstr3b' }, { label: 'GSTR-9', value: 'gstr9' },
        ] },
    { name: 'filingFrequency', label: 'Filing Frequency', type: 'select', options: [
            { label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }, { label: 'Annual', value: 'annual' },
        ] },
    { name: 'isActive', label: 'Active', type: 'boolean' },
];
export const taxPostingFields = [
    { name: 'voucherId', label: 'Voucher ID', type: 'text', required: true },
    { name: 'voucherDate', label: 'Voucher Date', type: 'date', required: true },
    { name: 'voucherType', label: 'Voucher Type', type: 'select', options: [
            { label: 'Sales', value: 'sales' }, { label: 'Purchase', value: 'purchase' },
            { label: 'Sales Return', value: 'sales_return' }, { label: 'Purchase Return', value: 'purchase_return' },
        ] },
    { name: 'gstin', label: 'GSTIN', type: 'text' },
    { name: 'taxableValue', label: 'Taxable Value', type: 'number' },
    { name: 'igst', label: 'IGST', type: 'number' },
    { name: 'cgst', label: 'CGST', type: 'number' },
    { name: 'sgst', label: 'SGST', type: 'number' },
    { name: 'cess', label: 'Cess', type: 'number' },
    { name: 'totalTax', label: 'Total Tax', type: 'number' },
];
export const numberSeriesFields = [
    { name: 'seriesName', label: 'Series Name', type: 'text', required: true },
    { name: 'prefix', label: 'Prefix', type: 'text' },
    { name: 'nextNumber', label: 'Next Number', type: 'number' },
    { name: 'suffix', label: 'Suffix', type: 'text' },
    { name: 'padding', label: 'Padding', type: 'number' },
    { name: 'module', label: 'Module', type: 'select', options: [
            { label: 'Sales', value: 'sales' }, { label: 'Purchase', value: 'purchase' },
            { label: 'Finance', value: 'finance' }, { label: 'Inventory', value: 'inventory' },
        ] },
    { name: 'isActive', label: 'Active', type: 'boolean' },
];
export const CreateGstRegistrationPage = makeFormPage('GST & Closing', '/gst/registrations', 'GST Registration', 'Manage GST registration details', '/gst/registrations', gstRegistrationFields);
export const CreateTaxPostingPage = makeFormPage('GST & Closing', '/gst/tax-postings', 'Tax Posting', 'Create a GST tax posting entry', '/gst/tax-postings', taxPostingFields);
export const CreateNumberSeriesPage = makeFormPage('GST & Closing', '/gst/number-series', 'Number Series', 'Configure auto-numbering series', '/gst/number-series', numberSeriesFields);
//# sourceMappingURL=dynamic-forms.js.map