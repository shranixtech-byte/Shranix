import { MasterDataPage, type ColumnDef, type FormField } from '../masters/master-data-page';

const customerColumns: ColumnDef[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Customer Name' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'contactPerson', label: 'Contact' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'creditLimit', label: 'Credit Limit ₹', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
  { key: 'status', label: 'Status', render: (v) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
      inactive: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      blocked: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    };
    return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[(v as string)] || styles.active}`}>{(v as string) || 'active'}</span>;
  }},
];

const customerFields: FormField[] = [
  { name: 'code', label: 'Customer Code', type: 'text' },
  { name: 'name', label: 'Customer Name', type: 'text', required: true },
  { name: 'gstin', label: 'GSTIN', type: 'text' },
  { name: 'pan', label: 'PAN', type: 'text' },
  { name: 'contactPerson', label: 'Contact Person', type: 'text' },
  { name: 'mobile', label: 'Mobile', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'pin', label: 'PIN Code', type: 'text' },
  { name: 'creditLimit', label: 'Credit Limit', type: 'number' },
  { name: 'creditDays', label: 'Credit Days', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Blocked', value: 'blocked' },
  ]},
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
];

export function CustomersPage() {
  return (
    <MasterDataPage
      title="Customers"
      description="Manage customer master with GST, contact, and credit information"
      columns={customerColumns}
      apiPath="/customers"
      formFields={customerFields}
    />
  );
}
