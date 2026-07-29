import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═════════════════════════════════════════════════════════
// 1. SALES QUOTATIONS
// ═════════════════════════════════════════════════════════
export const sqliteSalesQuotations = sqliteTableBase('shranix_sales_quotations', {
  ...sqliteBase,
  quoteNumber: sqliteText('quote_number').notNull(),
  customerId: sqliteText('customer_id').notNull(),
  quoteDate: sqliteText('quote_date').notNull(),
  validTill: sqliteText('valid_till'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, rejected, expired, converted
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
  convertedToOrder: sqliteInteger('converted_to_order', { mode: 'boolean' }).notNull().default(false),
  orderId: sqliteText('order_id'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ quoteNumberIdx: uniqueIndex('sq_quote_number_idx').on(table.quoteNumber) }));

export const pgSalesQuotations = pgTableBase('shranix_sales_quotations', {
  ...pgBase,
  quoteNumber: pgText('quote_number').notNull(),
  customerId: pgUuid('customer_id').notNull(),
  quoteDate: pgTimestamp('quote_date', { withTimezone: true }).notNull(),
  validTill: pgTimestamp('valid_till', { withTimezone: true }),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0),
  roundOff: pgReal('round_off').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0),
  notes: pgText('notes'),
  terms: pgText('terms'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  convertedToOrder: pgBoolean('converted_to_order').notNull().default(false),
  orderId: pgUuid('order_id'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ quoteNumberIdx: pgUniqueIndex('sq_quote_number_idx').on(table.quoteNumber) }));

// Quotation Items
export const sqliteQuotationItems = sqliteTableBase('shranix_quotation_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quotationId: sqliteText('quotation_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  description: sqliteText('description'),
  quantity: sqliteReal('quantity').notNull().default(1),
  unitId: sqliteText('unit_id'),
  rate: sqliteReal('rate').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0),
  sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0),
  totalAmount: sqliteReal('total_amount').notNull().default(0),
});

export const pgQuotationItems = pgTableBase('shranix_quotation_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  quotationId: pgUuid('quotation_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  description: pgText('description'),
  quantity: pgReal('quantity').notNull().default(1),
  unitId: pgUuid('unit_id'),
  rate: pgReal('rate').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxableValue: pgReal('taxable_value').notNull().default(0),
  gstRate: pgReal('gst_rate').notNull().default(0),
  igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0),
  sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0),
  totalAmount: pgReal('total_amount').notNull().default(0),
});

// ═════════════════════════════════════════════════════════
// 2. SALES ORDERS
// ═════════════════════════════════════════════════════════
export const sqliteSalesOrders = sqliteTableBase('shranix_sales_orders', {
  ...sqliteBase,
  orderNumber: sqliteText('order_number').notNull(),
  customerId: sqliteText('customer_id').notNull(),
  quotationId: sqliteText('quotation_id'),
  orderDate: sqliteText('order_date').notNull(),
  deliveryDate: sqliteText('delivery_date'),
  warehouseId: sqliteText('warehouse_id'),
  branchId: sqliteText('branch_id'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, partially_delivered, delivered, cancelled
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
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ orderNumberIdx: uniqueIndex('so_order_number_idx').on(table.orderNumber) }));

export const pgSalesOrders = pgTableBase('shranix_sales_orders', {
  ...pgBase,
  orderNumber: pgText('order_number').notNull(),
  customerId: pgUuid('customer_id').notNull(),
  quotationId: pgUuid('quotation_id'),
  orderDate: pgTimestamp('order_date', { withTimezone: true }).notNull(),
  deliveryDate: pgTimestamp('delivery_date', { withTimezone: true }),
  warehouseId: pgUuid('warehouse_id'),
  branchId: pgUuid('branch_id'),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0),
  roundOff: pgReal('round_off').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0),
  notes: pgText('notes'),
  terms: pgText('terms'),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  rejectionReason: pgText('rejection_reason'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ orderNumberIdx: pgUniqueIndex('so_order_number_idx').on(table.orderNumber) }));

// Sales Order Items
export const sqliteSalesOrderItems = sqliteTableBase('shranix_sales_order_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: sqliteText('order_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  description: sqliteText('description'),
  quantity: sqliteReal('quantity').notNull().default(1),
  deliveredQuantity: sqliteReal('delivered_quantity').notNull().default(0),
  reservedQuantity: sqliteReal('reserved_quantity').notNull().default(0),
  unitId: sqliteText('unit_id'),
  rate: sqliteReal('rate').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0),
  sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0),
  totalAmount: sqliteReal('total_amount').notNull().default(0),
});

export const pgSalesOrderItems = pgTableBase('shranix_sales_order_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  orderId: pgUuid('order_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  description: pgText('description'),
  quantity: pgReal('quantity').notNull().default(1),
  deliveredQuantity: pgReal('delivered_quantity').notNull().default(0),
  reservedQuantity: pgReal('reserved_quantity').notNull().default(0),
  unitId: pgUuid('unit_id'),
  rate: pgReal('rate').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxableValue: pgReal('taxable_value').notNull().default(0),
  gstRate: pgReal('gst_rate').notNull().default(0),
  igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0),
  sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0),
  totalAmount: pgReal('total_amount').notNull().default(0),
});

// ═════════════════════════════════════════════════════════
// 3. DELIVERY CHALLAN
// ═════════════════════════════════════════════════════════
export const sqliteDeliveryChallans = sqliteTableBase('shranix_delivery_challans', {
  ...sqliteBase,
  challanNumber: sqliteText('challan_number').notNull(),
  orderId: sqliteText('order_id').notNull(),
  customerId: sqliteText('customer_id').notNull(),
  warehouseId: sqliteText('warehouse_id'),
  dispatchDate: sqliteText('dispatch_date').notNull(),
  dispatchType: sqliteText('dispatch_type').notNull().default('full'), // full, partial
  vehicleNo: sqliteText('vehicle_no'),
  vehicleType: sqliteText('vehicle_type'),
  driverName: sqliteText('driver_name'),
  driverMobile: sqliteText('driver_mobile'),
  transporterName: sqliteText('transporter_name'),
  lrNo: sqliteText('lr_no'),
  lrDate: sqliteText('lr_date'),
  status: sqliteText('status').notNull().default('pending'), // pending, dispatched, delivered, cancelled
  notes: sqliteText('notes'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ challanNumberIdx: uniqueIndex('dc_challan_number_idx').on(table.challanNumber) }));

export const pgDeliveryChallans = pgTableBase('shranix_delivery_challans', {
  ...pgBase,
  challanNumber: pgText('challan_number').notNull(),
  orderId: pgUuid('order_id').notNull(),
  customerId: pgUuid('customer_id').notNull(),
  warehouseId: pgUuid('warehouse_id'),
  dispatchDate: pgTimestamp('dispatch_date', { withTimezone: true }).notNull(),
  dispatchType: pgText('dispatch_type').notNull().default('full'),
  vehicleNo: pgText('vehicle_no'),
  vehicleType: pgText('vehicle_type'),
  driverName: pgText('driver_name'),
  driverMobile: pgText('driver_mobile'),
  transporterName: pgText('transporter_name'),
  lrNo: pgText('lr_no'),
  lrDate: pgTimestamp('lr_date', { withTimezone: true }),
  status: pgText('status').notNull().default('pending'),
  notes: pgText('notes'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ challanNumberIdx: pgUniqueIndex('dc_challan_number_idx').on(table.challanNumber) }));

// Delivery Challan Items
export const sqliteChallanItems = sqliteTableBase('shranix_challan_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  challanId: sqliteText('challan_id').notNull(),
  orderItemId: sqliteText('order_item_id'),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  quantity: sqliteReal('quantity').notNull().default(0),
  deliveredQuantity: sqliteReal('delivered_quantity').notNull().default(0),
  rate: sqliteReal('rate').notNull().default(0),
  batchNo: sqliteText('batch_no'),
  serialNumbers: sqliteText('serial_numbers'),
  mfgDate: sqliteText('mfg_date'),
  expDate: sqliteText('exp_date'),
  warehouseId: sqliteText('warehouse_id'),
  notes: sqliteText('notes'),
});

export const pgChallanItems = pgTableBase('shranix_challan_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  challanId: pgUuid('challan_id').notNull(),
  orderItemId: pgUuid('order_item_id'),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  quantity: pgReal('quantity').notNull().default(0),
  deliveredQuantity: pgReal('delivered_quantity').notNull().default(0),
  rate: pgReal('rate').notNull().default(0),
  batchNo: pgText('batch_no'),
  serialNumbers: pgText('serial_numbers'),
  mfgDate: pgTimestamp('mfg_date', { withTimezone: true }),
  expDate: pgTimestamp('exp_date', { withTimezone: true }),
  warehouseId: pgUuid('warehouse_id'),
  notes: pgText('notes'),
});

// ═════════════════════════════════════════════════════════
// 4. SALES INVOICES
// ═════════════════════════════════════════════════════════
export const sqliteSalesInvoices = sqliteTableBase('shranix_sales_invoices', {
  ...sqliteBase,
  invoiceNumber: sqliteText('invoice_number').notNull(),
  orderId: sqliteText('order_id'),
  challanId: sqliteText('challan_id'),
  customerId: sqliteText('customer_id').notNull(),
  customerInvoiceNo: sqliteText('customer_invoice_no'),
  invoiceDate: sqliteText('invoice_date').notNull(),
  dueDate: sqliteText('due_date'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, paid, partially_paid, cancelled
  subTotal: sqliteReal('sub_total').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0),
  roundOff: sqliteReal('round_off').notNull().default(0),
  grandTotal: sqliteReal('grand_total').notNull().default(0),
  paidAmount: sqliteReal('paid_amount').notNull().default(0),
  balanceAmount: sqliteReal('balance_amount').notNull().default(0),
  paymentStatus: sqliteText('payment_status').notNull().default('unpaid'), // unpaid, partial, paid
  notes: sqliteText('notes'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ invoiceNumberIdx: uniqueIndex('si_number_idx').on(table.invoiceNumber) }));

export const pgSalesInvoices = pgTableBase('shranix_sales_invoices', {
  ...pgBase,
  invoiceNumber: pgText('invoice_number').notNull(),
  orderId: pgUuid('order_id'),
  challanId: pgUuid('challan_id'),
  customerId: pgUuid('customer_id').notNull(),
  customerInvoiceNo: pgText('customer_invoice_no'),
  invoiceDate: pgTimestamp('invoice_date', { withTimezone: true }).notNull(),
  dueDate: pgTimestamp('due_date', { withTimezone: true }),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0),
  roundOff: pgReal('round_off').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0),
  paidAmount: pgReal('paid_amount').notNull().default(0),
  balanceAmount: pgReal('balance_amount').notNull().default(0),
  paymentStatus: pgText('payment_status').notNull().default('unpaid'),
  notes: pgText('notes'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ invoiceNumberIdx: pgUniqueIndex('si_number_idx').on(table.invoiceNumber) }));

// Sales Invoice Items
export const sqliteInvoiceItems = sqliteTableBase('shranix_invoice_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: sqliteText('invoice_id').notNull(),
  orderItemId: sqliteText('order_item_id'),
  challanItemId: sqliteText('challan_item_id'),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  description: sqliteText('description'),
  quantity: sqliteReal('quantity').notNull().default(1),
  unitId: sqliteText('unit_id'),
  rate: sqliteReal('rate').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0),
  sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0),
  totalAmount: sqliteReal('total_amount').notNull().default(0),
});

export const pgInvoiceItems = pgTableBase('shranix_invoice_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  invoiceId: pgUuid('invoice_id').notNull(),
  orderItemId: pgUuid('order_item_id'),
  challanItemId: pgUuid('challan_item_id'),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  description: pgText('description'),
  quantity: pgReal('quantity').notNull().default(1),
  unitId: pgUuid('unit_id'),
  rate: pgReal('rate').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  taxableValue: pgReal('taxable_value').notNull().default(0),
  gstRate: pgReal('gst_rate').notNull().default(0),
  igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0),
  sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0),
  totalAmount: pgReal('total_amount').notNull().default(0),
});

// ═════════════════════════════════════════════════════════
// 5. SALES RETURNS
// ═════════════════════════════════════════════════════════
export const sqliteSalesReturns = sqliteTableBase('shranix_sales_returns', {
  ...sqliteBase,
  returnNumber: sqliteText('return_number').notNull(),
  invoiceId: sqliteText('invoice_id').notNull(),
  customerId: sqliteText('customer_id').notNull(),
  returnDate: sqliteText('return_date').notNull(),
  returnReason: sqliteText('return_reason'),
  status: sqliteText('status').notNull().default('draft'), // draft, submitted, approved, rejected
  subTotal: sqliteReal('sub_total').notNull().default(0),
  taxAmount: sqliteReal('tax_amount').notNull().default(0),
  grandTotal: sqliteReal('grand_total').notNull().default(0),
  creditNoteNo: sqliteText('credit_note_no'),
  creditNoteDate: sqliteText('credit_note_date'),
  approvedBy: sqliteText('approved_by'),
  approvedAt: sqliteText('approved_at'),
  notes: sqliteText('notes'),
  financialYearId: sqliteText('financial_year_id'),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({ returnNumberIdx: uniqueIndex('sr_number_idx').on(table.returnNumber) }));

export const pgSalesReturns = pgTableBase('shranix_sales_returns', {
  ...pgBase,
  returnNumber: pgText('return_number').notNull(),
  invoiceId: pgUuid('invoice_id').notNull(),
  customerId: pgUuid('customer_id').notNull(),
  returnDate: pgTimestamp('return_date', { withTimezone: true }).notNull(),
  returnReason: pgText('return_reason'),
  status: pgText('status').notNull().default('draft'),
  subTotal: pgReal('sub_total').notNull().default(0),
  taxAmount: pgReal('tax_amount').notNull().default(0),
  grandTotal: pgReal('grand_total').notNull().default(0),
  creditNoteNo: pgText('credit_note_no'),
  creditNoteDate: pgTimestamp('credit_note_date', { withTimezone: true }),
  approvedBy: pgUuid('approved_by'),
  approvedAt: pgTimestamp('approved_at', { withTimezone: true }),
  notes: pgText('notes'),
  financialYearId: pgUuid('financial_year_id'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({ returnNumberIdx: pgUniqueIndex('sr_number_idx').on(table.returnNumber) }));

// Sales Return Items
export const sqliteReturnItems = sqliteTableBase('shranix_return_items', {
  id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  returnId: sqliteText('return_id').notNull(),
  invoiceItemId: sqliteText('invoice_item_id'),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  quantity: sqliteReal('quantity').notNull().default(0),
  rate: sqliteReal('rate').notNull().default(0),
  taxableValue: sqliteReal('taxable_value').notNull().default(0),
  gstRate: sqliteReal('gst_rate').notNull().default(0),
  igst: sqliteReal('igst').notNull().default(0),
  cgst: sqliteReal('cgst').notNull().default(0),
  sgst: sqliteReal('sgst').notNull().default(0),
  cess: sqliteReal('cess').notNull().default(0),
  totalAmount: sqliteReal('total_amount').notNull().default(0),
  reason: sqliteText('reason'),
});

export const pgReturnItems = pgTableBase('shranix_return_items', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  returnId: pgUuid('return_id').notNull(),
  invoiceItemId: pgUuid('invoice_item_id'),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  quantity: pgReal('quantity').notNull().default(0),
  rate: pgReal('rate').notNull().default(0),
  taxableValue: pgReal('taxable_value').notNull().default(0),
  gstRate: pgReal('gst_rate').notNull().default(0),
  igst: pgReal('igst').notNull().default(0),
  cgst: pgReal('cgst').notNull().default(0),
  sgst: pgReal('sgst').notNull().default(0),
  cess: pgReal('cess').notNull().default(0),
  totalAmount: pgReal('total_amount').notNull().default(0),
  reason: pgText('reason'),
});

// ═════════════════════════════════════════════════════════
// 6. CUSTOMER PRICE LIST
// ═════════════════════════════════════════════════════════
export const sqliteCustomerPriceList = sqliteTableBase('shranix_customer_price_list', {
  ...sqliteBase,
  customerId: sqliteText('customer_id').notNull(),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  rate: sqliteReal('rate').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  minQuantity: sqliteReal('min_quantity').notNull().default(1),
  effectiveFrom: sqliteText('effective_from'),
  effectiveTo: sqliteText('effective_to'),
  currency: sqliteText('currency').notNull().default('INR'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({ customerPriceIdx: uniqueIndex('customer_price_idx').on(table.customerId, table.itemId) }));

export const pgCustomerPriceList = pgTableBase('shranix_customer_price_list', {
  ...pgBase,
  customerId: pgUuid('customer_id').notNull(),
  itemId: pgUuid('item_id').notNull(),
  variantId: pgUuid('variant_id'),
  rate: pgReal('rate').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  minQuantity: pgReal('min_quantity').notNull().default(1),
  effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
  effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
  currency: pgText('currency').notNull().default('INR'),
  isActive: pgBoolean('is_active').notNull().default(true),
}, (table) => ({ customerPriceIdx: pgUniqueIndex('customer_price_idx').on(table.customerId, table.itemId) }));

// ═════════════════════════════════════════════════════════
// 7. SALES APPROVAL WORKFLOW
// ═════════════════════════════════════════════════════════
export const sqliteSalesApprovals = sqliteTableBase('shranix_sales_approvals', {
  ...sqliteBase,
  documentType: sqliteText('document_type').notNull(), // quotation, order, invoice, return
  documentId: sqliteText('document_id').notNull(),
  requestedBy: sqliteText('requested_by').notNull(),
  approvedBy: sqliteText('approved_by'),
  status: sqliteText('status').notNull().default('pending'), // pending, approved, rejected
  approvalDate: sqliteText('approval_date'),
  comments: sqliteText('comments'),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
});

export const pgSalesApprovals = pgTableBase('shranix_sales_approvals', {
  ...pgBase,
  documentType: pgText('document_type').notNull(),
  documentId: pgUuid('document_id').notNull(),
  requestedBy: pgUuid('requested_by').notNull(),
  approvedBy: pgUuid('approved_by'),
  status: pgText('status').notNull().default('pending'),
  approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
  comments: pgText('comments'),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
});

// ═════════════════════════════════════════════════════════
// 8. SALES SETTINGS
// ═════════════════════════════════════════════════════════
export const sqliteSalesSettings = sqliteTableBase('shranix_sales_settings', {
  ...sqliteBase,
  companyId: sqliteText('company_id'),
  autoQuoteNumber: sqliteInteger('auto_quote_number', { mode: 'boolean' }).notNull().default(true),
  quotePrefix: sqliteText('quote_prefix').notNull().default('SQ-'),
  quoteNextNumber: sqliteInteger('quote_next_number').notNull().default(1),
  autoOrderNumber: sqliteInteger('auto_order_number', { mode: 'boolean' }).notNull().default(true),
  orderPrefix: sqliteText('order_prefix').notNull().default('SO-'),
  orderNextNumber: sqliteInteger('order_next_number').notNull().default(1),
  challanPrefix: sqliteText('challan_prefix').notNull().default('DC-'),
  challanNextNumber: sqliteInteger('challan_next_number').notNull().default(1),
  autoInvoiceNumber: sqliteInteger('auto_invoice_number', { mode: 'boolean' }).notNull().default(true),
  invoicePrefix: sqliteText('invoice_prefix').notNull().default('SI-'),
  invoiceNextNumber: sqliteInteger('invoice_next_number').notNull().default(1),
  returnPrefix: sqliteText('return_prefix').notNull().default('SR-'),
  returnNextNumber: sqliteInteger('return_next_number').notNull().default(1),
  requireApproval: sqliteInteger('require_approval', { mode: 'boolean' }).notNull().default(false),
  approvalLevels: sqliteInteger('approval_levels').notNull().default(1),
  gstEnabled: sqliteInteger('gst_enabled', { mode: 'boolean' }).notNull().default(true),
  roundOffDecimals: sqliteInteger('round_off_decimals').notNull().default(2),
  defaultPaymentTerms: sqliteText('default_payment_terms').notNull().default('30 days'),
}, (table) => ({ salesSettingsCompanyIdx: uniqueIndex('sales_settings_company_idx').on(table.companyId) }));

export const pgSalesSettings = pgTableBase('shranix_sales_settings', {
  ...pgBase,
  companyId: pgUuid('company_id'),
  autoQuoteNumber: pgBoolean('auto_quote_number').notNull().default(true),
  quotePrefix: pgText('quote_prefix').notNull().default('SQ-'),
  quoteNextNumber: pgInteger('quote_next_number').notNull().default(1),
  autoOrderNumber: pgBoolean('auto_order_number').notNull().default(true),
  orderPrefix: pgText('order_prefix').notNull().default('SO-'),
  orderNextNumber: pgInteger('order_next_number').notNull().default(1),
  challanPrefix: pgText('challan_prefix').notNull().default('DC-'),
  challanNextNumber: pgInteger('challan_next_number').notNull().default(1),
  autoInvoiceNumber: pgBoolean('auto_invoice_number').notNull().default(true),
  invoicePrefix: pgText('invoice_prefix').notNull().default('SI-'),
  invoiceNextNumber: pgInteger('invoice_next_number').notNull().default(1),
  returnPrefix: pgText('return_prefix').notNull().default('SR-'),
  returnNextNumber: pgInteger('return_next_number').notNull().default(1),
  requireApproval: pgBoolean('require_approval').notNull().default(false),
  approvalLevels: pgInteger('approval_levels').notNull().default(1),
  gstEnabled: pgBoolean('gst_enabled').notNull().default(true),
  roundOffDecimals: pgInteger('round_off_decimals').notNull().default(2),
  defaultPaymentTerms: pgText('default_payment_terms').notNull().default('30 days'),
}, (table) => ({ salesSettingsCompanyIdx: pgUniqueIndex('sales_settings_company_idx').on(table.companyId) }));
