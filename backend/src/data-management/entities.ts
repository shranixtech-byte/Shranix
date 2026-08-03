// ═══════════════════════════════════════════════════════════════════
// IMPORT / EXPORT ENTITIES (master data)
// ═══════════════════════════════════════════════════════════════════

export interface EntityField {
  header: string; // friendly header shown in Excel/CSV/JSON files
  col: string; // DB column OR notes-JSON key (customers)
  type: 'text' | 'number' | 'boolean';
  inNotes?: boolean; // stored inside ledger_master.notes JSON (customers)
  exportOnly?: boolean; // exported but ignored on import (e.g. currentStock)
  required?: boolean; // must be non-empty on import
}

export interface ImportExportEntity {
  key: 'customers' | 'suppliers' | 'products';
  label: string;
  singular: string;
  table: string;
  repo: 'ledgerMaster' | 'suppliers' | 'items';
  ledgerType?: string; // ledger_master filter (customers)
  matchKeys: string[]; // used to find an existing record for upsert
  fields: EntityField[];
  importDefaults: Record<string, unknown>; // always applied on insert
}

export const IMPORT_EXPORT_ENTITIES: ImportExportEntity[] = [
  {
    key: 'customers',
    label: 'Customers',
    singular: 'customer',
    table: 'shranix_ledger_master',
    repo: 'ledgerMaster',
    ledgerType: 'customer',
    matchKeys: ['email', 'mobile'],
    importDefaults: {
      ledgerType: 'customer',
      openingBalance: 0,
      openingBalanceType: 'debit',
      currentBalance: 0,
    },
    fields: [
      { header: 'Name', col: 'partyId', type: 'text', required: true },
      { header: 'Code', col: 'code', type: 'text', inNotes: true },
      { header: 'GSTIN', col: 'gstin', type: 'text', inNotes: true },
      { header: 'PAN', col: 'pan', type: 'text', inNotes: true },
      { header: 'Contact Person', col: 'contactPerson', type: 'text', inNotes: true },
      { header: 'Mobile', col: 'mobile', type: 'text', inNotes: true },
      { header: 'Email', col: 'email', type: 'text', inNotes: true },
      { header: 'Address', col: 'address', type: 'text', inNotes: true },
      { header: 'City', col: 'city', type: 'text', inNotes: true },
      { header: 'District', col: 'district', type: 'text', inNotes: true },
      { header: 'State', col: 'state', type: 'text', inNotes: true },
      { header: 'PIN', col: 'pin', type: 'text', inNotes: true },
      { header: 'Credit Limit', col: 'creditLimit', type: 'number' },
      { header: 'Credit Days', col: 'creditDays', type: 'number' },
      { header: 'Status', col: 'status', type: 'text', inNotes: true },
      { header: 'Customer Group', col: 'customerGroup', type: 'text', inNotes: true },
      { header: 'Price List', col: 'priceList', type: 'text', inNotes: true },
      { header: 'Payment Terms', col: 'paymentTerms', type: 'text', inNotes: true },
    ],
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    singular: 'supplier',
    table: 'shranix_suppliers',
    repo: 'suppliers',
    matchKeys: ['email', 'mobile'],
    importDefaults: {},
    fields: [
      { header: 'Code', col: 'code', type: 'text' },
      { header: 'Name', col: 'name', type: 'text', required: true },
      { header: 'GSTIN', col: 'gstin', type: 'text' },
      { header: 'PAN', col: 'pan', type: 'text' },
      { header: 'Contact Person', col: 'contactPerson', type: 'text' },
      { header: 'Mobile', col: 'mobile', type: 'text' },
      { header: 'Email', col: 'email', type: 'text' },
      { header: 'Address', col: 'address', type: 'text' },
      { header: 'State', col: 'state', type: 'text' },
      { header: 'District', col: 'district', type: 'text' },
      { header: 'City', col: 'city', type: 'text' },
      { header: 'PIN', col: 'pin', type: 'text' },
      { header: 'Credit Limit', col: 'creditLimit', type: 'number' },
      { header: 'Credit Days', col: 'creditDays', type: 'number' },
      { header: 'Bank Name', col: 'bankName', type: 'text' },
      { header: 'Account No', col: 'bankAccountNo', type: 'text' },
      { header: 'IFSC', col: 'bankIfsc', type: 'text' },
      { header: 'Bank Branch', col: 'bankBranch', type: 'text' },
      { header: 'Status', col: 'status', type: 'text' },
      { header: 'Remarks', col: 'remarks', type: 'text' },
    ],
  },
  {
    key: 'products',
    label: 'Products',
    singular: 'product',
    table: 'shranix_items',
    repo: 'items',
    matchKeys: ['sku'],
    importDefaults: {},
    fields: [
      { header: 'Name', col: 'name', type: 'text', required: true },
      { header: 'Short Name', col: 'shortName', type: 'text' },
      { header: 'SKU', col: 'sku', type: 'text', required: true },
      { header: 'Type', col: 'type', type: 'text' },
      { header: 'Status', col: 'status', type: 'text' },
      { header: 'HSN Code', col: 'hsnCode', type: 'text' },
      { header: 'Purchase Rate', col: 'purchaseRate', type: 'number' },
      { header: 'Sales Rate', col: 'salesRate', type: 'number' },
      { header: 'MRP', col: 'mrp', type: 'number' },
      { header: 'Min Stock', col: 'minStock', type: 'number' },
      { header: 'Max Stock', col: 'maxStock', type: 'number' },
      { header: 'Reorder Level', col: 'reorderLevel', type: 'number' },
      { header: 'Opening Stock', col: 'openingStock', type: 'number' },
      { header: 'Current Stock', col: 'currentStock', type: 'number', exportOnly: true },
      { header: 'Batch Managed', col: 'hasBatch', type: 'boolean' },
      { header: 'Serial Managed', col: 'hasSerial', type: 'boolean' },
      { header: 'Expiry Managed', col: 'hasExpiry', type: 'boolean' },
      { header: 'Taxable', col: 'isTaxable', type: 'boolean' },
      { header: 'Active', col: 'isActive', type: 'boolean' },
      { header: 'Notes', col: 'notes', type: 'text' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// SOFT-DELETED RECORDS / CLEANUP ENTITIES
// (tables with is_deleted + deleted_at that can be restored or purged)
// ═══════════════════════════════════════════════════════════════════

export interface DeletableEntity {
  key: string;
  label: string;
  table: string;
  ledgerType?: string; // ledger_master filter
  childTables?: { table: string; fkCol: string }[]; // hard-deleted with the parent on purge
}

export const DELETABLE_ENTITIES: DeletableEntity[] = [
  { key: 'customers', label: 'Customers', table: 'shranix_ledger_master', ledgerType: 'customer' },
  { key: 'suppliers', label: 'Suppliers', table: 'shranix_suppliers' },
  {
    key: 'products',
    label: 'Products',
    table: 'shranix_items',
    childTables: [
      { table: 'shranix_item_variants', fkCol: 'item_id' },
      { table: 'shranix_item_pricing', fkCol: 'item_id' },
      { table: 'shranix_item_barcodes', fkCol: 'item_id' },
    ],
  },
  { key: 'categories', label: 'Categories', table: 'shranix_categories' },
  { key: 'brands', label: 'Brands', table: 'shranix_brands' },
  { key: 'units', label: 'Units', table: 'shranix_units' },
  { key: 'taxGroups', label: 'Tax Groups', table: 'shranix_tax_groups' },
  { key: 'gstRates', label: 'GST Rates', table: 'shranix_gst_rates' },
  { key: 'warehouses', label: 'Warehouses', table: 'shranix_warehouses' },
  { key: 'branches', label: 'Branches', table: 'shranix_branches' },
  { key: 'companies', label: 'Companies', table: 'shranix_companies' },
  { key: 'financialYears', label: 'Financial Years', table: 'shranix_financial_years' },
];

// ═══════════════════════════════════════════════════════════════════
// ARCHIVE ENTITIES (old closed transactions → archive file + soft-delete)
// ═══════════════════════════════════════════════════════════════════

export interface ArchiveEntity {
  key: 'salesInvoices' | 'purchaseInvoices' | 'journalEntries';
  label: string;
  table: string;
  dateCol: string; // invoice_date / voucher_date
  statuses: string[]; // only these statuses are eligible
  childTables: { table: string; fkCol: string; softDelete: boolean }[];
}

export const ARCHIVE_ENTITIES: ArchiveEntity[] = [
  {
    key: 'salesInvoices',
    label: 'Sales Invoices',
    table: 'shranix_sales_invoices',
    dateCol: 'invoice_date',
    statuses: ['posted', 'paid', 'cancelled'],
    childTables: [{ table: 'shranix_invoice_items', fkCol: 'invoice_id', softDelete: false }],
  },
  {
    key: 'purchaseInvoices',
    label: 'Purchase Invoices',
    table: 'shranix_purchase_invoices',
    dateCol: 'invoice_date',
    statuses: ['posted', 'paid', 'cancelled'],
    childTables: [],
  },
  {
    key: 'journalEntries',
    label: 'Journal Entries',
    table: 'shranix_journal_entries',
    dateCol: 'voucher_date',
    statuses: ['posted'],
    childTables: [
      { table: 'shranix_journal_entry_items', fkCol: 'journal_entry_id', softDelete: true },
    ],
  },
];

// ── helpers ────────────────────────────────────────────────────────

export function findImportExportEntity(key: string): ImportExportEntity | undefined {
  return IMPORT_EXPORT_ENTITIES.find((e) => e.key === key);
}

export function findDeletableEntity(key: string): DeletableEntity | undefined {
  return DELETABLE_ENTITIES.find((e) => e.key === key);
}

export function findArchiveEntity(key: string): ArchiveEntity | undefined {
  return ARCHIVE_ENTITIES.find((e) => e.key === key);
}
