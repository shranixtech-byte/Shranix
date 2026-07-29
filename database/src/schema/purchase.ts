import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═════════════════════════════════════════════════════════
// 1. PURCHASE ORDERS
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseOrders = sqliteTableBase('shranix_purchase_orders', {
  ...sqliteBase,
  poNumber: sqliteText('po_number').notNull(),
  supplierId: sqliteText('supplier_id').notNull(),
  branchId: sqliteText('branch_id'),
  warehouseId: sqliteText('warehouse_id'),
  orderDate: sqliteText('order_date').notNull(),
  expectedDelivery: sqliteText('expected_delivery'),
  currency: sqliteText('currency').notNull().default('INR'),
  paymentTerms: sqliteText('payment_terms'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, rejected, partially_received, received, cancelled
  subTotal: sqliteReal('sub_total').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0),
  roundOff: sqliteReal('round_off').notNull().default(0),
  grandTotal: sqliteReal('grand_total').notNull().default(0),
  notes: sqliteText('notes'),
  terms: sqliteText('terms'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
  rejectionReason: sqliteText('rejection_reason'),
  financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ poNumberIdx: uniqueIndex('po_number_idx').on(table.poNumber) }));

export const pgPurchaseOrders = pgTableBase('shranix_purchase_orders', {
  ...pgBase, poNumber: pgText('po_number').notNull(), supplierId: pgUuid('supplier_id').notNull(),
  branchId: pgUuid('branch_id'), warehouseId: pgUuid('warehouse_id'),
  orderDate: pgTimestamp('order_date', { withTimezone: true }).notNull(),
  expectedDelivery: pgTimestamp('expected_delivery', { withTimezone: true }),
  currency: pgText('currency').notNull().default('INR'), paymentTerms: pgText('payment_terms'),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0), discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0), taxAmount: pgReal('tax_amount').notNull().default(0),
  roundOff: pgReal('round_off').notNull().default(0), grandTotal: pgReal('grand_total').notNull().default(0),
  notes: pgText('notes'), terms: pgText('terms'), approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }), rejectionReason: pgText('rejection_reason'),
  financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ poNumberIdx: pgUniqueIndex('po_number_idx').on(table.poNumber) }));

// PO Items
export const sqlitePOItems = sqliteTableBase('shranix_po_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  poId: sqliteText('po_id').notNull(), itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'), description: sqliteText('description'),
  quantity: sqliteReal('quantity').notNull().default(1), receivedQuantity: sqliteReal('received_quantity').notNull().default(0),
  damagedQuantity: sqliteReal('damaged_quantity').notNull().default(0), unitId: sqliteText('unit_id'),
  rate: sqliteReal('rate').notNull().default(0), discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0), taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstRate: sqliteReal('gst_rate').notNull().default(0), igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0), sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0), totalAmount: sqliteReal('total_amount').notNull().default(0),
});

export const pgPOItems = pgTableBase('shranix_po_items', {
  id: pgUuid('id').primaryKey().defaultRandom(), poId: pgUuid('po_id').notNull(), itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'), description: pgText('description'),
  quantity: pgReal('quantity').notNull().default(1), receivedQuantity: pgReal('received_quantity').notNull().default(0),
  damagedQuantity: pgReal('damaged_quantity').notNull().default(0), unitId: pgUuid('unit_id'),
  rate: pgReal('rate').notNull().default(0), discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0), taxableValue: pgReal('taxable_value').notNull().default(0),
  gstRate: pgReal('gst_rate').notNull().default(0), igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0), sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0), totalAmount: pgReal('total_amount').notNull().default(0),
});

// ═════════════════════════════════════════════════════════
// 2. PURCHASE QUOTATIONS
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseQuotations = sqliteTableBase('shranix_purchase_quotations', {
  ...sqliteBase, quoteNumber: sqliteText('quote_number').notNull(), supplierId: sqliteText('supplier_id').notNull(),
  quoteDate: sqliteText('quote_date').notNull(), validUntil: sqliteText('valid_until'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, accepted, rejected, expired
  subTotal: sqliteReal('sub_total').notNull().default(0), discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0), grandTotal: sqliteReal('grand_total').notNull().default(0),
  notes: sqliteText('notes'), convertedToPo: sqliteInteger('converted_to_po', { mode: 'boolean' }).notNull().default(false),
  poId: sqliteText('po_id'), financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ quoteNumberIdx: uniqueIndex('quote_number_idx').on(table.quoteNumber) }));

export const pgPurchaseQuotations = pgTableBase('shranix_purchase_quotations', {
  ...pgBase, quoteNumber: pgText('quote_number').notNull(), supplierId: pgUuid('supplier_id').notNull(),
  quoteDate: pgTimestamp('quote_date', { withTimezone: true }).notNull(), validUntil: pgTimestamp('valid_until', { withTimezone: true }),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0), discountAmount: pgReal('discount_amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0), grandTotal: pgReal('grand_total').notNull().default(0),
  notes: pgText('notes'), convertedToPo: pgBoolean('converted_to_po').notNull().default(false),
  poId: pgUuid('po_id'), financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ quoteNumberIdx: pgUniqueIndex('quote_number_idx').on(table.quoteNumber) }));

// ═════════════════════════════════════════════════════════
// 3. GOODS RECEIPT NOTES (GRN)
// ═════════════════════════════════════════════════════════
export const sqliteGrn = sqliteTableBase('shranix_grn', {
  ...sqliteBase, grnNumber: sqliteText('grn_number').notNull(), poId: sqliteText('po_id').notNull(),
  supplierId: sqliteText('supplier_id').notNull(), warehouseId: sqliteText('warehouse_id'),
  receivedDate: sqliteText('received_date').notNull(), receiptType: sqliteText('receipt_type').notNull().default('full'), // full, partial
  deliveryChallanNo: sqliteText('delivery_challan_no'), transporterName: sqliteText('transporter_name'),
  vehicleNo: sqliteText('vehicle_no'), status: sqliteText('status').notNull().default('pending'), // pending, posted, cancelled
  notes: sqliteText('notes'), financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ grnNumberIdx: uniqueIndex('grn_number_idx').on(table.grnNumber) }));

export const pgGrn = pgTableBase('shranix_grn', {
  ...pgBase, grnNumber: pgText('grn_number').notNull(), poId: pgUuid('po_id').notNull(),
  supplierId: pgUuid('supplier_id').notNull(), warehouseId: pgUuid('warehouse_id'),
  receivedDate: pgTimestamp('received_date', { withTimezone: true }).notNull(),
  receiptType: pgText('receipt_type').notNull().default('full'),
  deliveryChallanNo: pgText('delivery_challan_no'), transporterName: pgText('transporter_name'),
  vehicleNo: pgText('vehicle_no'), status: pgText('status').notNull().default('pending'),
  notes: pgText('notes'), financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ grnNumberIdx: pgUniqueIndex('grn_number_idx').on(table.grnNumber) }));

// GRN Items
export const sqliteGRNItems = sqliteTableBase('shranix_grn_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  grnId: sqliteText('grn_id').notNull(), poItemId: sqliteText('po_item_id'),
  itemId: sqliteText('item_id').notNull(), variantId: sqliteText('variant_id'),
  orderedQuantity: sqliteReal('ordered_quantity').notNull().default(0),
  receivedQuantity: sqliteReal('received_quantity').notNull().default(0),
  acceptedQuantity: sqliteReal('accepted_quantity').notNull().default(0),
  rejectedQuantity: sqliteReal('rejected_quantity').notNull().default(0),
  damagedQuantity: sqliteReal('damaged_quantity').notNull().default(0),
  shortQuantity: sqliteReal('short_quantity').notNull().default(0),
  rate: sqliteReal('rate').notNull().default(0), batchNo: sqliteText('batch_no'),
  mfgDate: sqliteText('mfg_date'), expDate: sqliteText('exp_date'),
  serialNumbers: sqliteText('serial_numbers'), warehouseId: sqliteText('warehouse_id'),
  remarks: sqliteText('remarks'),
});

export const pgGRNItems = pgTableBase('shranix_grn_items', {
  id: pgUuid('id').primaryKey().defaultRandom(), grnId: pgUuid('grn_id').notNull(), poItemId: pgUuid('po_item_id'),
  itemId: pgUuid('item_id').notNull(), variantId: pgUuid('variant_id'),
  orderedQuantity: pgReal('ordered_quantity').notNull().default(0),
  receivedQuantity: pgReal('received_quantity').notNull().default(0),
  acceptedQuantity: pgReal('accepted_quantity').notNull().default(0),
  rejectedQuantity: pgReal('rejected_quantity').notNull().default(0),
  damagedQuantity: pgReal('damaged_quantity').notNull().default(0),
  shortQuantity: pgReal('short_quantity').notNull().default(0),
  rate: pgReal('rate').notNull().default(0), batchNo: pgText('batch_no'),
  mfgDate: pgTimestamp('mfg_date', { withTimezone: true }), expDate: pgTimestamp('exp_date', { withTimezone: true }),
  serialNumbers: pgText('serial_numbers'), warehouseId: pgUuid('warehouse_id'), remarks: pgText('remarks'),
});

// ═════════════════════════════════════════════════════════
// 4. PURCHASE INVOICES
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseInvoices = sqliteTableBase('shranix_purchase_invoices', {
  ...sqliteBase, invoiceNumber: sqliteText('invoice_number').notNull(),
  supplierInvoiceNo: sqliteText('supplier_invoice_no'),
  supplierId: sqliteText('supplier_id').notNull(), poId: sqliteText('po_id'), grnId: sqliteText('grn_id'),
  invoiceDate: sqliteText('invoice_date').notNull(), dueDate: sqliteText('due_date'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, paid, partially_paid, cancelled
  subTotal: sqliteReal('sub_total').notNull().default(0), discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0), roundOff: sqliteReal('round_off').notNull().default(0),
  grandTotal: sqliteReal('grand_total').notNull().default(0), paidAmount: sqliteReal('paid_amount').notNull().default(0),
  balanceAmount: sqliteReal('balance_amount').notNull().default(0),
  paymentStatus: sqliteText('payment_status').notNull().default('unpaid'), // unpaid, partial, paid
  notes: sqliteText('notes'), financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ invoiceNumberIdx: uniqueIndex('pi_number_idx').on(table.invoiceNumber) }));

export const pgPurchaseInvoices = pgTableBase('shranix_purchase_invoices', {
  ...pgBase, invoiceNumber: pgText('invoice_number').notNull(),
  supplierInvoiceNo: pgText('supplier_invoice_no'), supplierId: pgUuid('supplier_id').notNull(),
  poId: pgUuid('po_id'), grnId: pgUuid('grn_id'),
  invoiceDate: pgTimestamp('invoice_date', { withTimezone: true }).notNull(),
  dueDate: pgTimestamp('due_date', { withTimezone: true }),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0), discountAmount: pgReal('discount_amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0), roundOff: pgReal('round_off').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0), paidAmount: pgReal('paid_amount').notNull().default(0),
  balanceAmount: pgReal('balance_amount').notNull().default(0),
  paymentStatus: pgText('payment_status').notNull().default('unpaid'),
  notes: pgText('notes'), financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ invoiceNumberIdx: pgUniqueIndex('pi_number_idx').on(table.invoiceNumber) }));

// ═════════════════════════════════════════════════════════
// 5. PURCHASE RETURNS
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseReturns = sqliteTableBase('shranix_purchase_returns', {
  ...sqliteBase, returnNumber: sqliteText('return_number').notNull(),
  supplierId: sqliteText('supplier_id').notNull(), invoiceId: sqliteText('invoice_id'),
  grnId: sqliteText('grn_id'), returnDate: sqliteText('return_date').notNull(),
  returnReason: sqliteText('return_reason'), status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, rejected
  subTotal: sqliteReal('sub_total').notNull().default(0), taxAmount: sqliteReal('tax_amount').notNull().default(0),
  grandTotal: sqliteReal('grand_total').notNull().default(0),
  approvedBy: sqliteText('approved_by'), approvedAt: sqliteText('approved_at'),
  notes: sqliteText('notes'), financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ returnNumberIdx: uniqueIndex('pr_number_idx').on(table.returnNumber) }));

export const pgPurchaseReturns = pgTableBase('shranix_purchase_returns', {
  ...pgBase, returnNumber: pgText('return_number').notNull(), supplierId: pgUuid('supplier_id').notNull(),
  invoiceId: pgUuid('invoice_id'), grnId: pgUuid('grn_id'),
  returnDate: pgTimestamp('return_date', { withTimezone: true }).notNull(),
  returnReason: pgText('return_reason'), status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0), taxAmount: pgReal('tax_amount').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0), approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }), notes: pgText('notes'),
  financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ returnNumberIdx: pgUniqueIndex('pr_number_idx').on(table.returnNumber) }));

// ═════════════════════════════════════════════════════════
// 6. SUPPLIER PRICE LIST
// ═════════════════════════════════════════════════════════
export const sqliteSupplierPriceList = sqliteTableBase('shranix_supplier_price_list', {
  ...sqliteBase, supplierId: sqliteText('supplier_id').notNull(), itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'), rate: sqliteReal('rate').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0), effectiveFrom: sqliteText('effective_from'),
  effectiveTo: sqliteText('effective_to'), minQuantity: sqliteReal('min_quantity').notNull().default(1),
  currency: sqliteText('currency').notNull().default('INR'), isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({ supplierPriceIdx: uniqueIndex('supplier_price_idx').on(table.supplierId, table.itemId) }));

export const pgSupplierPriceList = pgTableBase('shranix_supplier_price_list', {
  ...pgBase, supplierId: pgUuid('supplier_id').notNull(), itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'), rate: pgReal('rate').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
  effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
  minQuantity: pgReal('min_quantity').notNull().default(1), currency: pgText('currency').notNull().default('INR'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({ supplierPriceIdx: pgUniqueIndex('supplier_price_idx').on(table.supplierId, table.itemId) }));

// ═════════════════════════════════════════════════════════
// 7. PURCHASE APPROVAL WORKFLOW
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseApprovals = sqliteTableBase('shranix_purchase_approvals', {
  ...sqliteBase, documentType: sqliteText('document_type').notNull(), // po, quotation, invoice, return
  documentId: sqliteText('document_id').notNull(), requestedBy: sqliteText('requested_by').notNull(),
  approvedBy: sqliteText('approved_by'), status: sqliteText('status').notNull().default('pending'), // pending, approved, rejected
  approvalDate: sqliteText('approval_date'), comments: sqliteText('comments'),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
});

export const pgPurchaseApprovals = pgTableBase('shranix_purchase_approvals', {
  ...pgBase, documentType: pgText('document_type').notNull(), documentId: pgUuid('document_id').notNull(),
  requestedBy: pgUuid('requested_by').notNull(), approvedBy: pgUuid('approved_by'),
  status: pgText('status').notNull().default('pending'),
  approvalDate: pgTimestamp('approval_date', { withTimezone: true }), comments: pgText('comments'),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
});

// ═════════════════════════════════════════════════════════
// 8a. SUPPLIERS (PRM-016 Module 1)
// ═════════════════════════════════════════════════════════
export const sqliteSuppliers = sqliteTableBase('shranix_suppliers', {
  ...sqliteBase,
  code: sqliteText('code'),
  name: sqliteText('name').notNull(),
  gstin: sqliteText('gstin'),
  pan: sqliteText('pan'),
  contactPerson: sqliteText('contact_person'),
  mobile: sqliteText('mobile'),
  email: sqliteText('email'),
  address: sqliteText('address'),
  state: sqliteText('state'),
  district: sqliteText('district'),
  city: sqliteText('city'),
  pin: sqliteText('pin'),
  creditLimit: sqliteReal('credit_limit').notNull().default(0),
  creditDays: sqliteInteger('credit_days').notNull().default(0),
  bankName: sqliteText('bank_name'),
  bankAccountNo: sqliteText('bank_account_no'),
  bankIfsc: sqliteText('bank_ifsc'),
  bankBranch: sqliteText('bank_branch'),
  status: sqliteText('status').notNull().default('active'), // active, inactive, blocked
  remarks: sqliteText('remarks'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({ supplierCodeIdx: uniqueIndex('supplier_code_idx').on(table.code), supplierNameIdx: uniqueIndex('supplier_name_idx').on(table.name) }));

export const pgSuppliers = pgTableBase('shranix_suppliers', {
  ...pgBase,
  code: pgText('code'),
  name: pgText('name').notNull(),
  gstin: pgText('gstin'),
  pan: pgText('pan'),
  contactPerson: pgText('contact_person'),
  mobile: pgText('mobile'),
  email: pgText('email'),
  address: pgText('address'),
  state: pgText('state'),
  district: pgText('district'),
  city: pgText('city'),
  pin: pgText('pin'),
  creditLimit: pgReal('credit_limit').notNull().default(0),
  creditDays: pgInteger('credit_days').notNull().default(0),
  bankName: pgText('bank_name'),
  bankAccountNo: pgText('bank_account_no'),
  bankIfsc: pgText('bank_ifsc'),
  bankBranch: pgText('bank_branch'),
  status: pgText('status').notNull().default('active'),
  isActive: pgBoolean('is_active').notNull().default(true),
  remarks: pgText('remarks'),
}, (table) => ({ supplierCodeIdx: pgUniqueIndex('supplier_code_idx').on(table.code), supplierNameIdx: pgUniqueIndex('supplier_name_idx').on(table.name) }));

// ═════════════════════════════════════════════════════════
// 8b. PURCHASE REQUISITIONS (PRM-016 Module 2)
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseRequisitions = sqliteTableBase('shranix_purchase_requisitions', {
  ...sqliteBase,
  prNumber: sqliteText('pr_number').notNull(),
  department: sqliteText('department'),
  requestedBy: sqliteText('requested_by'),
  requiredDate: sqliteText('required_date'),
  priority: sqliteText('priority').notNull().default('medium'), // low, medium, high, urgent
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, rejected, cancelled
  remarks: sqliteText('remarks'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
  rejectionReason: sqliteText('rejection_reason'),
  financialYearId: sqliteText('financial_year_id'),
}, (table) => ({ prNumberIdx: uniqueIndex('pr_number_idx').on(table.prNumber) }));

export const pgPurchaseRequisitions = pgTableBase('shranix_purchase_requisitions', {
  ...pgBase,
  prNumber: pgText('pr_number').notNull(),
  department: pgText('department'),
  requestedBy: pgUuid('requested_by'),
  requiredDate: pgTimestamp('required_date', { withTimezone: true }),
  priority: pgText('priority').notNull().default('medium'),
  status: pgText('status').notNull().default('draft'),
  remarks: pgText('remarks'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  rejectionReason: pgText('rejection_reason'),
  financialYearId: pgUuid('financial_year_id'),
}, (table) => ({ prNumberIdx: pgUniqueIndex('pr_number_idx').on(table.prNumber) }));

// Purchase Requisition Items
export const sqlitePurchaseRequisitionItems = sqliteTableBase('shranix_pr_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  prId: sqliteText('pr_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  description: sqliteText('description'),
  quantity: sqliteReal('quantity').notNull().default(1),
  estimatedRate: sqliteReal('estimated_rate').notNull().default(0),
  estimatedAmount: sqliteReal('estimated_amount').notNull().default(0),
  remarks: sqliteText('remarks'),
});

export const pgPurchaseRequisitionItems = pgTableBase('shranix_pr_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  prId: pgUuid('pr_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  description: pgText('description'),
  quantity: pgReal('quantity').notNull().default(1),
  estimatedRate: pgReal('estimated_rate').notNull().default(0),
  estimatedAmount: pgReal('estimated_amount').notNull().default(0),
  remarks: pgText('remarks'),
});

// ═════════════════════════════════════════════════════════
// 8c. STOCK LEDGER (PRM-016 Module 5)
// ═════════════════════════════════════════════════════════
export const sqliteStockLedger = sqliteTableBase('shranix_stock_ledger', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  itemId: sqliteText('item_id').notNull(),
  batchId: sqliteText('batch_id'),
  batchNo: sqliteText('batch_no'),
  warehouseId: sqliteText('warehouse_id'),
  transactionType: sqliteText('transaction_type').notNull(), // purchase_receipt, sales_return, stock_adjustment, purchase_return, opening
  documentRef: sqliteText('document_ref'),
  documentType: sqliteText('document_type'), // grn, sr, sa, pr
  quantity: sqliteReal('quantity').notNull(),
  beforeQty: sqliteReal('before_qty').notNull().default(0),
  afterQty: sqliteReal('after_qty').notNull().default(0),
  rate: sqliteReal('rate').notNull().default(0),
  amount: sqliteReal('amount').notNull().default(0),
  createdBy: sqliteText('created_by'),
  remarks: sqliteText('remarks'),
});

export const pgStockLedger = pgTableBase('shranix_stock_ledger', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  itemId: pgUuid('item_id').notNull(),
  batchId: pgUuid('batch_id'),
  batchNo: pgText('batch_no'),
  warehouseId: pgUuid('warehouse_id'),
  transactionType: pgText('transaction_type').notNull(),
  documentRef: pgText('document_ref'),
  documentType: pgText('document_type'),
  quantity: pgReal('quantity').notNull(),
  beforeQty: pgReal('before_qty').notNull().default(0),
  afterQty: pgReal('after_qty').notNull().default(0),
  rate: pgReal('rate').notNull().default(0),
  amount: pgReal('amount').notNull().default(0),
  createdBy: pgUuid('created_by'),
  remarks: pgText('remarks'),
});

// ═════════════════════════════════════════════════════════
// 8d. WAREHOUSE STOCK (PRM-016 Module 5)
// ═════════════════════════════════════════════════════════
export const sqliteWarehouseStock = sqliteTableBase('shranix_warehouse_stock', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  batchId: sqliteText('batch_id'),
  batchNo: sqliteText('batch_no'),
  warehouseId: sqliteText('warehouse_id').notNull(),
  quantity: sqliteReal('quantity').notNull().default(0),
  reservedQuantity: sqliteReal('reserved_quantity').notNull().default(0),
}, (table) => ({ warehouseStockIdx: uniqueIndex('warehouse_stock_idx').on(table.warehouseId, table.itemId) }));

export const pgWarehouseStock = pgTableBase('shranix_warehouse_stock', {
  ...pgBase,
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  batchId: pgUuid('batch_id'),
  batchNo: pgText('batch_no'),
  warehouseId: pgUuid('warehouse_id').notNull(),
  quantity: pgReal('quantity').notNull().default(0),
  reservedQuantity: pgReal('reserved_quantity').notNull().default(0),
}, (table) => ({ warehouseStockIdx: pgUniqueIndex('warehouse_stock_idx').on(table.warehouseId, table.itemId) }));

// ═════════════════════════════════════════════════════════
// 8e. PURCHASE RETURN ITEMS (extended from basic returns)
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseReturnItems = sqliteTableBase('shranix_purchase_return_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  returnId: sqliteText('return_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  batchId: sqliteText('batch_id'),
  batchNo: sqliteText('batch_no'),
  quantity: sqliteReal('quantity').notNull(),
  rate: sqliteReal('rate').notNull().default(0),
  amount: sqliteReal('amount').notNull().default(0),
  reason: sqliteText('reason'),
  warehouseId: sqliteText('warehouse_id'),
  remarks: sqliteText('remarks'),
});

export const pgPurchaseReturnItems = pgTableBase('shranix_purchase_return_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  returnId: pgUuid('return_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  batchId: pgUuid('batch_id'),
  batchNo: pgText('batch_no'),
  quantity: pgReal('quantity').notNull(),
  rate: pgReal('rate').notNull().default(0),
  amount: pgReal('amount').notNull().default(0),
  reason: pgText('reason'),
  warehouseId: pgUuid('warehouse_id'),
  remarks: pgText('remarks'),
});

// ═════════════════════════════════════════════════════════
// 9. PURCHASE SETTINGS
// ═════════════════════════════════════════════════════════
export const sqlitePurchaseSettings = sqliteTableBase('shranix_purchase_settings', {
  ...sqliteBase, companyId: sqliteText('company_id'),
  autoPoNumber: sqliteInteger('auto_po_number', { mode: 'boolean' }).notNull().default(true),
  poPrefix: sqliteText('po_prefix').notNull().default('PO-'), poNextNumber: sqliteInteger('po_next_number').notNull().default(1),
  quotationPrefix: sqliteText('quotation_prefix').notNull().default('QTN-'), quotationNextNumber: sqliteInteger('quotation_next_number').notNull().default(1),
  grnPrefix: sqliteText('grn_prefix').notNull().default('GRN-'), grnNextNumber: sqliteInteger('grn_next_number').notNull().default(1),
  invoicePrefix: sqliteText('invoice_prefix').notNull().default('PI-'), invoiceNextNumber: sqliteInteger('invoice_next_number').notNull().default(1),
  returnPrefix: sqliteText('return_prefix').notNull().default('PR-'), returnNextNumber: sqliteInteger('return_next_number').notNull().default(1),
  requireApproval: sqliteInteger('require_approval', { mode: 'boolean' }).notNull().default(false),
  approvalLevels: sqliteInteger('approval_levels').notNull().default(1),
  defaultPaymentTerms: sqliteText('default_payment_terms').notNull().default('30 days'),
  gstEnabled: sqliteInteger('gst_enabled', { mode: 'boolean' }).notNull().default(true),
  roundOffDecimals: sqliteInteger('round_off_decimals').notNull().default(2),
}, (table) => ({ purchaseSettingsCompanyIdx: uniqueIndex('purchase_settings_company_idx').on(table.companyId) }));

export const pgPurchaseSettings = pgTableBase('shranix_purchase_settings', {
  ...pgBase, companyId: pgUuid('company_id'),
  autoPoNumber: pgBoolean('auto_po_number').notNull().default(true),
  poPrefix: pgText('po_prefix').notNull().default('PO-'), poNextNumber: pgInteger('po_next_number').notNull().default(1),
  quotationPrefix: pgText('quotation_prefix').notNull().default('QTN-'), quotationNextNumber: pgInteger('quotation_next_number').notNull().default(1),
  grnPrefix: pgText('grn_prefix').notNull().default('GRN-'), grnNextNumber: pgInteger('grn_next_number').notNull().default(1),
  invoicePrefix: pgText('invoice_prefix').notNull().default('PI-'), invoiceNextNumber: pgInteger('invoice_next_number').notNull().default(1),
  returnPrefix: pgText('return_prefix').notNull().default('PR-'), returnNextNumber: pgInteger('return_next_number').notNull().default(1),
  requireApproval: pgBoolean('require_approval').notNull().default(false),
  approvalLevels: pgInteger('approval_levels').notNull().default(1),
  defaultPaymentTerms: pgText('default_payment_terms').notNull().default('30 days'),
  gstEnabled: pgBoolean('gst_enabled').notNull().default(true),
  roundOffDecimals: pgInteger('round_off_decimals').notNull().default(2),
}, (table) => ({ purchaseSettingsCompanyIdx: pgUniqueIndex('purchase_settings_company_idx').on(table.companyId) }));
