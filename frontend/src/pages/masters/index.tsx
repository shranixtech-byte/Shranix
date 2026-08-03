import { MasterDataPage, type ColumnDef, type FormField } from './master-data-page';

// ── Company ─────────────────────────────────────────────
const companyColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'phone', label: 'Phone' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const companyFields: FormField[] = [
  { name: 'name', label: 'Company Name', type: 'text', required: true },
  { name: 'alias', label: 'Alias', type: 'text' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'pincode', label: 'Pincode', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'gstin', label: 'GSTIN', type: 'text' },
  { name: 'pan', label: 'PAN', type: 'text' },
  { name: 'cin', label: 'CIN', type: 'text' },
  { name: 'licenseNo', label: 'License No', type: 'text' },
  { name: 'pesticidesLicense', label: 'Pesticides License', type: 'text' },
  { name: 'fertilizerLicense', label: 'Fertilizer License', type: 'text' },
  { name: 'seedsLicense', label: 'Seeds License', type: 'text' },
  { name: 'cottonLicense', label: 'Cotton License', type: 'text' },
  { name: 'retailLicense', label: 'Retail License', type: 'text' },
  { name: 'website', label: 'Website', type: 'text' },
  { name: 'isHeadOffice', label: 'Head Office', type: 'boolean' },
  { name: 'financialYearStart', label: 'FY Start Month', type: 'text' },
  { name: 'currency', label: 'Currency', type: 'text' },
];

export function CompaniesPage() {
  return (
    <MasterDataPage
      title="Companies"
      description="Manage your business entities and company profiles"
      columns={companyColumns}
      apiPath="/companies"
      formFields={companyFields}
    />
  );
}

// ── Financial Year ──────────────────────────────────────
const fyColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'isActive', label: 'Active', render: (v) => (v ? '🟢 Yes' : '🔴 No') },
  { key: 'isClosed', label: 'Closed', render: (v) => (v ? '🔒 Closed' : '📂 Open') },
];

const fyFields: FormField[] = [
  { name: 'name', label: 'FY Name', type: 'text', required: true },
  { name: 'startDate', label: 'Start Date', type: 'date', required: true },
  { name: 'endDate', label: 'End Date', type: 'date', required: true },
  { name: 'isActive', label: 'Active', type: 'boolean' },
  { name: 'isClosed', label: 'Closed', type: 'boolean' },
];

export function FinancialYearsPage() {
  return (
    <MasterDataPage
      title="Financial Years"
      description="Configure financial periods for accounting cycles"
      columns={fyColumns}
      apiPath="/financial-years"
      formFields={fyFields}
    />
  );
}

// ── Branch ──────────────────────────────────────────────
const branchColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const branchFields: FormField[] = [
  { name: 'name', label: 'Branch Name', type: 'text', required: true },
  { name: 'code', label: 'Branch Code', type: 'text', required: true },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
];

export function BranchesPage() {
  return (
    <MasterDataPage
      title="Branches"
      description="Manage branch offices and regional locations"
      columns={branchColumns}
      apiPath="/branches"
      formFields={branchFields}
    />
  );
}

// ── Warehouse ───────────────────────────────────────────
const warehouseColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'warehouseType', label: 'Type' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'contactPerson', label: 'Contact' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'isMain', label: 'Main', render: (v) => (v ? '⭐ Yes' : '—') },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const warehouseFields: FormField[] = [
  { name: 'name', label: 'Warehouse Name', type: 'text', required: true },
  { name: 'code', label: 'Warehouse Code', type: 'text', required: true },
  {
    name: 'warehouseType',
    label: 'Warehouse Type',
    type: 'select',
    options: [
      { label: 'Storage', value: 'storage' },
      { label: 'Distribution', value: 'distribution' },
      { label: 'Transit', value: 'transit' },
    ],
  },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'district', label: 'District', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'pincode', label: 'PIN Code', type: 'text' },
  { name: 'contactPerson', label: 'Contact Person', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'mobile', label: 'Mobile', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'gstin', label: 'GST Number', type: 'text' },
  { name: 'remarks', label: 'Remarks', type: 'textarea' },
  { name: 'isMain', label: 'Main Warehouse', type: 'boolean' },
];

export function WarehousesPage() {
  return (
    <MasterDataPage
      title="Warehouses"
      description="Manage storage locations, distribution centers, and inventory points"
      columns={warehouseColumns}
      apiPath="/warehouses"
      formFields={warehouseFields}
    />
  );
}

// ── Unit ────────────────────────────────────────────────
const unitColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'shortName', label: 'Short Name' },
  { key: 'type', label: 'Type' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const unitFields: FormField[] = [
  { name: 'name', label: 'Unit Name', type: 'text', required: true },
  { name: 'shortName', label: 'Short Name', type: 'text', required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'General', value: 'general' },
      { label: 'Weight', value: 'weight' },
      { label: 'Volume', value: 'volume' },
      { label: 'Length', value: 'length' },
      { label: 'Area', value: 'area' },
      { label: 'Count', value: 'count' },
    ],
  },
];

export function UnitsPage() {
  return (
    <MasterDataPage
      title="Units"
      description="Define measurement units for items and commodities"
      columns={unitColumns}
      apiPath="/units"
      formFields={unitFields}
    />
  );
}

// ── Category ────────────────────────────────────────────
const categoryColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const categoryFields: FormField[] = [
  { name: 'name', label: 'Category Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'Item', value: 'item' },
      { label: 'Party', value: 'party' },
      { label: 'Expense', value: 'expense' },
      { label: 'Income', value: 'income' },
    ],
  },
  { name: 'sortOrder', label: 'Sort Order', type: 'number' },
];

export function CategoriesPage() {
  return (
    <MasterDataPage
      title="Categories"
      description="Organize items, parties, and transactions into categories"
      columns={categoryColumns}
      apiPath="/categories"
      formFields={categoryFields}
    />
  );
}

// ── Brand ───────────────────────────────────────────────
const brandColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const brandFields: FormField[] = [
  { name: 'name', label: 'Brand Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function BrandsPage() {
  return (
    <MasterDataPage
      title="Brands"
      description="Manage product brands and manufacturers"
      columns={brandColumns}
      apiPath="/brands"
      formFields={brandFields}
    />
  );
}

// ── Tax Group ───────────────────────────────────────────
const taxGroupColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'isDefault', label: 'Default', render: (v) => (v ? '✅ Yes' : '—') },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const taxGroupFields: FormField[] = [
  { name: 'name', label: 'Tax Group Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'GST', value: 'gst' },
      { label: 'VAT', value: 'vat' },
      { label: 'Custom', value: 'custom' },
    ],
  },
  { name: 'isDefault', label: 'Default Group', type: 'boolean' },
];

export function TaxGroupsPage() {
  return (
    <MasterDataPage
      title="Tax Groups"
      description="Configure tax categories and groupings"
      columns={taxGroupColumns}
      apiPath="/tax-groups"
      formFields={taxGroupFields}
    />
  );
}

// ── GST Rate ────────────────────────────────────────────
const gstRateColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'rate', label: 'Rate (%)' },
  { key: 'type', label: 'Type' },
  { key: 'igst', label: 'IGST' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'isDefault', label: 'Default', render: (v) => (v ? '✅ Yes' : '—') },
  { key: 'isActive', label: 'Status', render: (v) => (v ? '🟢 Active' : '🔴 Inactive') },
];

const gstRateFields: FormField[] = [
  { name: 'name', label: 'Rate Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'rate', label: 'Rate (%)', type: 'number', required: true },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { label: 'IGST', value: 'igst' },
      { label: 'CGST+SGST', value: 'cgst_sgst' },
      { label: 'Cess', value: 'cess' },
    ],
  },
  { name: 'igst', label: 'IGST %', type: 'number' },
  { name: 'cgst', label: 'CGST %', type: 'number' },
  { name: 'sgst', label: 'SGST %', type: 'number' },
  { name: 'cess', label: 'Cess %', type: 'number' },
  { name: 'isDefault', label: 'Default Rate', type: 'boolean' },
  { name: 'hsnSacCode', label: 'HSN/SAC Code', type: 'text' },
];

export function GSTRatesPage() {
  return (
    <MasterDataPage
      title="GST Rates"
      description="Configure GST tax slabs and rates for compliance"
      columns={gstRateColumns}
      apiPath="/gst-rates"
      formFields={gstRateFields}
    />
  );
}

// ── Form Page Exports ─────────────────────────────────────
export { CreateCompanyPage, EditCompanyPage } from './company-form';
export { CreateBranchPage, EditBranchPage } from './branch-form';
export { CreateWarehousePage, EditWarehousePage } from './warehouse-form';
export { CreateFinancialYearPage, EditFinancialYearPage } from './financial-year-form';
export { CreateUnitPage, EditUnitPage } from './unit-form';
export { CreateCategoryPage, EditCategoryPage } from './category-form';
export { CreateBrandPage, EditBrandPage } from './brand-form';
export { CreateTaxGroupPage, EditTaxGroupPage } from './tax-form';
export { CreateGstRatePage, EditGstRatePage } from './tax-form';
