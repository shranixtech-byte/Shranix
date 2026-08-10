import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  real as pgReal,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
  boolean as pgBoolean,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index as sqliteIndex,
} from 'drizzle-orm/sqlite-core';

const sqliteBase = {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// 1. SALES QUOTATIONS
// ═════════════════════════════════════════════════════════
export const sqliteSalesQuotations = sqliteTableBase(
  'shranix_sales_quotations',
  {
    ...sqliteBase,
    quoteNumber: sqliteText('quote_number').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    quoteDate: sqliteText('quote_date').notNull(),
    validTill: sqliteText('valid_till'),
    status: sqliteText('status').notNull().default('draft'),
    branchId: sqliteText('branch_id'),
    revision: sqliteInteger('revision').notNull().default(1),
    parentQuoteId: sqliteText('parent_quote_id'),
    billingAddress: sqliteText('billing_address'),
    shippingAddress: sqliteText('shipping_address'),
    contactPerson: sqliteText('contact_person'),
    paymentTerms: sqliteText('payment_terms'),
    deliveryTime: sqliteText('delivery_time'),
    freight: sqliteReal('freight').notNull().default(0),
    installationCharges: sqliteReal('installation_charges').notNull().default(0),
    warranty: sqliteText('warranty'),
    customerNotes: sqliteText('customer_notes'),
    sentAt: sqliteText('sent_at'),
    sentVia: sqliteText('sent_via'),
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
    convertedToOrder: sqliteInteger('converted_to_order', { mode: 'boolean' })
      .notNull()
      .default(false),
    orderId: sqliteText('order_id'),
    financialYearId: sqliteText('financial_year_id'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({ quoteNumberIdx: uniqueIndex('sq_quote_number_idx').on(table.quoteNumber) }),
);

export const pgSalesQuotations = pgTableBase(
  'shranix_sales_quotations',
  {
    ...pgBase,
    quoteNumber: pgText('quote_number').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    quoteDate: pgTimestamp('quote_date', { withTimezone: true }).notNull(),
    validTill: pgTimestamp('valid_till', { withTimezone: true }),
    status: pgText('status').notNull().default('draft'),
    branchId: pgUuid('branch_id'),
    revision: pgInteger('revision').notNull().default(1),
    parentQuoteId: pgUuid('parent_quote_id'),
    billingAddress: pgText('billing_address'),
    shippingAddress: pgText('shipping_address'),
    contactPerson: pgText('contact_person'),
    paymentTerms: pgText('payment_terms'),
    deliveryTime: pgText('delivery_time'),
    freight: pgReal('freight').notNull().default(0),
    installationCharges: pgReal('installation_charges').notNull().default(0),
    warranty: pgText('warranty'),
    customerNotes: pgText('customer_notes'),
    sentAt: pgTimestamp('sent_at', { withTimezone: true }),
    sentVia: pgText('sent_via'),
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
  },
  (table) => ({ quoteNumberIdx: pgUniqueIndex('sq_quote_number_idx').on(table.quoteNumber) }),
);

// Quotation Items
export const sqliteQuotationItems = sqliteTableBase('shranix_quotation_items', {
  ...sqliteBase,
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
  batchNo: sqliteText('batch_no'),
  hsnCode: sqliteText('hsn_code'),
  barcode: sqliteText('barcode'),
  freeQty: sqliteReal('free_qty').notNull().default(0),
  discountType: sqliteText('discount_type'),
  remarks: sqliteText('remarks'),
  warehouse: sqliteText('warehouse'),
  expiryDate: sqliteText('expiry_date'),
});

export const pgQuotationItems = pgTableBase('shranix_quotation_items', {
  ...pgBase,
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
  batchNo: pgText('batch_no'),
  hsnCode: pgText('hsn_code'),
  barcode: pgText('barcode'),
  freeQty: pgReal('free_qty').notNull().default(0),
  discountType: pgText('discount_type'),
  remarks: pgText('remarks'),
  warehouse: pgText('warehouse'),
  expiryDate: pgText('expiry_date'),
});

// ═════════════════════════════════════════════════════════
// 2. SALES ORDERS
// ═════════════════════════════════════════════════════════
export const sqliteSalesOrders = sqliteTableBase(
  'shranix_sales_orders',
  {
    ...sqliteBase,
    orderNumber: sqliteText('order_number').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    quotationId: sqliteText('quotation_id'),
    orderDate: sqliteText('order_date').notNull(),
    deliveryDate: sqliteText('delivery_date'),
    warehouseId: sqliteText('warehouse_id'),
    branchId: sqliteText('branch_id'),
    status: sqliteText('status').notNull().default('draft'),
    paymentTerms: sqliteText('payment_terms'),
    billingAddress: sqliteText('billing_address'),
    shippingAddress: sqliteText('shipping_address'),
    contactPerson: sqliteText('contact_person'),
    isPartial: sqliteInteger('is_partial', { mode: 'boolean' }).notNull().default(false),
    subTotal: sqliteReal('sub_total').notNull().default(0),
    discountPercent: sqliteReal('discount_percent').notNull().default(0),
    discountAmount: sqliteReal('discount_amount').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    cgstTotal: sqliteReal('cgst_total').notNull().default(0),
    sgstTotal: sqliteReal('sgst_total').notNull().default(0),
    igstTotal: sqliteReal('igst_total').notNull().default(0),
    cessTotal: sqliteReal('cess_total').notNull().default(0),
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
  },
  (table) => ({ orderNumberIdx: uniqueIndex('so_order_number_idx').on(table.orderNumber) }),
);

export const pgSalesOrders = pgTableBase(
  'shranix_sales_orders',
  {
    ...pgBase,
    orderNumber: pgText('order_number').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    quotationId: pgUuid('quotation_id'),
    orderDate: pgTimestamp('order_date', { withTimezone: true }).notNull(),
    deliveryDate: pgTimestamp('delivery_date', { withTimezone: true }),
    warehouseId: pgUuid('warehouse_id'),
    branchId: pgUuid('branch_id'),
    status: pgText('status').notNull().default('draft'),
    paymentTerms: pgText('payment_terms'),
    billingAddress: pgText('billing_address'),
    shippingAddress: pgText('shipping_address'),
    contactPerson: pgText('contact_person'),
    isPartial: pgBoolean('is_partial').notNull().default(false),
    subTotal: pgReal('sub_total').notNull().default(0),
    discountPercent: pgReal('discount_percent').notNull().default(0),
    discountAmount: pgReal('discount_amount').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    cgstTotal: pgReal('cgst_total').notNull().default(0),
    sgstTotal: pgReal('sgst_total').notNull().default(0),
    igstTotal: pgReal('igst_total').notNull().default(0),
    cessTotal: pgReal('cess_total').notNull().default(0),
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
  },
  (table) => ({ orderNumberIdx: pgUniqueIndex('so_order_number_idx').on(table.orderNumber) }),
);

// Sales Order Items
export const sqliteSalesOrderItems = sqliteTableBase('shranix_sales_order_items', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
export const sqliteDeliveryChallans = sqliteTableBase(
  'shranix_delivery_challans',
  {
    ...sqliteBase,
    challanNumber: sqliteText('challan_number').notNull(),
    orderId: sqliteText('order_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    warehouseId: sqliteText('warehouse_id'),
    dispatchDate: sqliteText('dispatch_date').notNull(),
    dispatchType: sqliteText('dispatch_type').notNull().default('full'),
    vehicleNo: sqliteText('vehicle_no'),
    vehicleType: sqliteText('vehicle_type'),
    driverName: sqliteText('driver_name'),
    driverMobile: sqliteText('driver_mobile'),
    transporterName: sqliteText('transporter_name'),
    lrNo: sqliteText('lr_no'),
    lrDate: sqliteText('lr_date'),
    // Phase 2: E-way Bill + Transport details + Dispatch totals
    ewayBillNo: sqliteText('eway_bill_no'),
    ewayBillDate: sqliteText('eway_bill_date'),
    transportDetails: sqliteText('transport_details'),
    totalQty: sqliteReal('total_qty').notNull().default(0),
    totalAmount: sqliteReal('total_amount').notNull().default(0),
    billingAddress: sqliteText('billing_address'),
    shippingAddress: sqliteText('shipping_address'),
    status: sqliteText('status').notNull().default('pending'),
    notes: sqliteText('notes'),
    financialYearId: sqliteText('financial_year_id'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({ challanNumberIdx: uniqueIndex('dc_challan_number_idx').on(table.challanNumber) }),
);

export const pgDeliveryChallans = pgTableBase(
  'shranix_delivery_challans',
  {
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
    // Phase 2: E-way Bill + Transport details + Dispatch totals
    ewayBillNo: pgText('eway_bill_no'),
    ewayBillDate: pgTimestamp('eway_bill_date', { withTimezone: true }),
    transportDetails: pgText('transport_details'),
    totalQty: pgReal('total_qty').notNull().default(0),
    totalAmount: pgReal('total_amount').notNull().default(0),
    billingAddress: pgText('billing_address'),
    shippingAddress: pgText('shipping_address'),
    status: pgText('status').notNull().default('pending'),
    notes: pgText('notes'),
    financialYearId: pgUuid('financial_year_id'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({ challanNumberIdx: pgUniqueIndex('dc_challan_number_idx').on(table.challanNumber) }),
);

// Delivery Challan Items
export const sqliteChallanItems = sqliteTableBase('shranix_challan_items', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  challanId: sqliteText('challan_id').notNull(),
  orderItemId: sqliteText('order_item_id'),
  itemId: sqliteText('item_id').notNull(),
  variantId: sqliteText('variant_id'),
  description: sqliteText('description'),
  unitId: sqliteText('unit_id'),
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
  description: pgText('description'),
  unitId: pgUuid('unit_id'),
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
export const sqliteSalesInvoices = sqliteTableBase(
  'shranix_sales_invoices',
  {
    ...sqliteBase,
    invoiceNumber: sqliteText('invoice_number').notNull(),
    orderId: sqliteText('order_id'),
    challanId: sqliteText('challan_id'),
    customerId: sqliteText('customer_id').notNull(),
    customerInvoiceNo: sqliteText('customer_invoice_no'),
    invoiceDate: sqliteText('invoice_date').notNull(),
    dueDate: sqliteText('due_date'),
    status: sqliteText('status').notNull().default('draft'),
    subTotal: sqliteReal('sub_total').notNull().default(0),
    discountPercent: sqliteReal('discount_percent').notNull().default(0),
    discountAmount: sqliteReal('discount_amount').notNull().default(0),
    freight: sqliteReal('freight').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    roundOff: sqliteReal('round_off').notNull().default(0),
    grandTotal: sqliteReal('grand_total').notNull().default(0),
    paidAmount: sqliteReal('paid_amount').notNull().default(0),
    balanceAmount: sqliteReal('balance_amount').notNull().default(0),
    paymentStatus: sqliteText('payment_status').notNull().default('unpaid'),
    paymentTerms: sqliteText('payment_terms').notNull().default('cash'),
    notes: sqliteText('notes'),
    financialYearId: sqliteText('financial_year_id'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({ invoiceNumberIdx: uniqueIndex('si_number_idx').on(table.invoiceNumber) }),
);

export const pgSalesInvoices = pgTableBase(
  'shranix_sales_invoices',
  {
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
    freight: pgReal('freight').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    roundOff: pgReal('round_off').notNull().default(0),
    grandTotal: pgReal('grand_total').notNull().default(0),
    paidAmount: pgReal('paid_amount').notNull().default(0),
    balanceAmount: pgReal('balance_amount').notNull().default(0),
    paymentStatus: pgText('payment_status').notNull().default('unpaid'),
    paymentTerms: pgText('payment_terms').notNull().default('cash'),
    notes: pgText('notes'),
    financialYearId: pgUuid('financial_year_id'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({ invoiceNumberIdx: pgUniqueIndex('si_number_idx').on(table.invoiceNumber) }),
);

// Sales Invoice Items
export const sqliteInvoiceItems = sqliteTableBase('shranix_invoice_items', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
export const sqliteSalesReturns = sqliteTableBase(
  'shranix_sales_returns',
  {
    ...sqliteBase,
    returnNumber: sqliteText('return_number').notNull(),
    invoiceId: sqliteText('invoice_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    returnDate: sqliteText('return_date').notNull(),
    returnReason: sqliteText('return_reason'),
    status: sqliteText('status').notNull().default('draft'),
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
  },
  (table) => ({ returnNumberIdx: uniqueIndex('sr_number_idx').on(table.returnNumber) }),
);

export const pgSalesReturns = pgTableBase(
  'shranix_sales_returns',
  {
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
  },
  (table) => ({ returnNumberIdx: pgUniqueIndex('sr_number_idx').on(table.returnNumber) }),
);

// Sales Return Items
export const sqliteReturnItems = sqliteTableBase('shranix_return_items', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
// 6. SALES SETTINGS
// ═════════════════════════════════════════════════════════
// NOTE: actual DB table uses FLAT columns (auto_quote_number, quote_prefix, ...),
// NOT key/value — schema ko DB se match karne ke liye flat columns declared hain.
// Kisi bhi settings query mein filter { field: 'key' } mat use karo (column exists nahi karta).
export const sqliteSalesSettings = sqliteTableBase('shranix_sales_settings', {
  ...sqliteBase,
  companyId: sqliteText('company_id'),
  autoQuoteNumber: sqliteInteger('auto_quote_number', { mode: 'boolean' }).notNull().default(true),
  quotePrefix: sqliteText('quote_prefix').notNull().default('SQ-'),
  quoteNextNumber: sqliteInteger('quote_next_number').notNull().default(1),
  quoteFyPrefix: sqliteInteger('quote_fy_prefix', { mode: 'boolean' }).notNull().default(false),
  quoteBranchPrefix: sqliteInteger('quote_branch_prefix', { mode: 'boolean' })
    .notNull()
    .default(false),
  autoOrderNumber: sqliteInteger('auto_order_number', { mode: 'boolean' }).notNull().default(true),
  orderPrefix: sqliteText('order_prefix').notNull().default('SO-'),
  orderNextNumber: sqliteInteger('order_next_number').notNull().default(1),
  challanPrefix: sqliteText('challan_prefix').notNull().default('DC-'),
  challanNextNumber: sqliteInteger('challan_next_number').notNull().default(1),
  autoInvoiceNumber: sqliteInteger('auto_invoice_number', { mode: 'boolean' })
    .notNull()
    .default(true),
  invoicePrefix: sqliteText('invoice_prefix').notNull().default('SI-'),
  invoiceNextNumber: sqliteInteger('invoice_next_number').notNull().default(1),
  returnPrefix: sqliteText('return_prefix').notNull().default('SR-'),
  returnNextNumber: sqliteInteger('return_next_number').notNull().default(1),
  requireApproval: sqliteInteger('require_approval', { mode: 'boolean' }).notNull().default(false),
  approvalLevels: sqliteInteger('approval_levels').notNull().default(1),
  gstEnabled: sqliteInteger('gst_enabled', { mode: 'boolean' }).notNull().default(true),
  roundOffDecimals: sqliteInteger('round_off_decimals').notNull().default(2),
  defaultPaymentTerms: sqliteText('default_payment_terms').notNull().default('30 days'),
  // Shopkeeper UPI ID — bill ke QR payments ke liye
  upiId: sqliteText('upi_id'),
  // Sales Settings — approvals, credit, alerts, defaults (Settings Hub → Sales)
  discountApproval: sqliteInteger('discount_approval', { mode: 'boolean' })
    .notNull()
    .default(false),
  discountApprovalLimit: sqliteInteger('discount_approval_limit').notNull().default(30),
  enforceCreditLimit: sqliteInteger('enforce_credit_limit', { mode: 'boolean' })
    .notNull()
    .default(true),
  overdueAlert: sqliteInteger('overdue_alert', { mode: 'boolean' }).notNull().default(false),
  overdueAlertDays: sqliteInteger('overdue_alert_days').notNull().default(5),
  salesmanMandatory: sqliteInteger('salesman_mandatory', { mode: 'boolean' })
    .notNull()
    .default(false),
  quotationExpiryDays: sqliteInteger('quotation_expiry_days').notNull().default(15),
  // Customer Settings — defaults, groups, loyalty, validations (Settings Hub → Customers)
  defaultCreditLimit: sqliteReal('default_credit_limit').notNull().default(0),
  customerGroups: sqliteText('customer_groups').notNull().default(''),
  defaultCustomerGroup: sqliteText('default_customer_group').notNull().default(''),
  loyaltyEnabled: sqliteInteger('loyalty_enabled', { mode: 'boolean' }).notNull().default(false),
  loyaltyPointsPerAmount: sqliteInteger('loyalty_points_per_amount').notNull().default(100),
  defaultPriceList: sqliteText('default_price_list').notNull().default('standard'),
  gstValidation: sqliteInteger('gst_validation', { mode: 'boolean' }).notNull().default(true),
  panValidation: sqliteInteger('pan_validation', { mode: 'boolean' }).notNull().default(true),
  // Invoice printing settings (Settings Hub → Invoice Settings)
  invoiceSuffix: sqliteText('invoice_suffix').notNull().default(''),
  printFormat: sqliteText('print_format').notNull().default('a4_portrait'),
  duplicateCopy: sqliteInteger('duplicate_copy', { mode: 'boolean' }).notNull().default(true),
  transportCopy: sqliteInteger('transport_copy', { mode: 'boolean' }).notNull().default(false),
  showQr: sqliteInteger('show_qr', { mode: 'boolean' }).notNull().default(true),
  showHsn: sqliteInteger('show_hsn', { mode: 'boolean' }).notNull().default(true),
  showBatch: sqliteInteger('show_batch', { mode: 'boolean' }).notNull().default(true),
  showExpiry: sqliteInteger('show_expiry', { mode: 'boolean' }).notNull().default(true),
  showDiscount: sqliteInteger('show_discount', { mode: 'boolean' }).notNull().default(true),
  showGst: sqliteInteger('show_gst', { mode: 'boolean' }).notNull().default(true),
  showBarcode: sqliteInteger('show_barcode', { mode: 'boolean' }).notNull().default(false),
});

export const pgSalesSettings = pgTableBase('shranix_sales_settings', {
  ...pgBase,
  companyId: pgUuid('company_id'),
  autoQuoteNumber: pgBoolean('auto_quote_number').notNull().default(true),
  quotePrefix: pgText('quote_prefix').notNull().default('SQ-'),
  quoteNextNumber: pgInteger('quote_next_number').notNull().default(1),
  quoteFyPrefix: pgBoolean('quote_fy_prefix').notNull().default(false),
  quoteBranchPrefix: pgBoolean('quote_branch_prefix').notNull().default(false),
  invoiceSuffix: pgText('invoice_suffix').notNull().default(''),
  printFormat: pgText('print_format').notNull().default('a4_portrait'),
  duplicateCopy: pgBoolean('duplicate_copy').notNull().default(true),
  transportCopy: pgBoolean('transport_copy').notNull().default(false),
  showQr: pgBoolean('show_qr').notNull().default(true),
  showHsn: pgBoolean('show_hsn').notNull().default(true),
  showBatch: pgBoolean('show_batch').notNull().default(true),
  showExpiry: pgBoolean('show_expiry').notNull().default(true),
  showDiscount: pgBoolean('show_discount').notNull().default(true),
  showGst: pgBoolean('show_gst').notNull().default(true),
  showBarcode: pgBoolean('show_barcode').notNull().default(false),
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
  // Shopkeeper UPI ID — bill ke QR payments ke liye
  upiId: pgText('upi_id'),
  // Sales Settings — approvals, credit, alerts, defaults (Settings Hub → Sales)
  discountApproval: pgBoolean('discount_approval').notNull().default(false),
  discountApprovalLimit: pgInteger('discount_approval_limit').notNull().default(30),
  enforceCreditLimit: pgBoolean('enforce_credit_limit').notNull().default(true),
  overdueAlert: pgBoolean('overdue_alert').notNull().default(false),
  overdueAlertDays: pgInteger('overdue_alert_days').notNull().default(5),
  salesmanMandatory: pgBoolean('salesman_mandatory').notNull().default(false),
  quotationExpiryDays: pgInteger('quotation_expiry_days').notNull().default(15),
  // Customer Settings — defaults, groups, loyalty, validations (Settings Hub → Customers)
  defaultCreditLimit: pgReal('default_credit_limit').notNull().default(0),
  customerGroups: pgText('customer_groups').notNull().default(''),
  defaultCustomerGroup: pgText('default_customer_group').notNull().default(''),
  loyaltyEnabled: pgBoolean('loyalty_enabled').notNull().default(false),
  loyaltyPointsPerAmount: pgInteger('loyalty_points_per_amount').notNull().default(100),
  defaultPriceList: pgText('default_price_list').notNull().default('standard'),
  gstValidation: pgBoolean('gst_validation').notNull().default(true),
  panValidation: pgBoolean('pan_validation').notNull().default(true),
});

// ═════════════════════════════════════════════════════════
// 7. CUSTOMER PRICE LIST
// ═════════════════════════════════════════════════════════
export const sqliteCustomerPriceList = sqliteTableBase(
  'shranix_customer_price_list',
  {
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
  },
  (table) => ({
    customerPriceIdx: uniqueIndex('customer_price_idx').on(table.customerId, table.itemId),
  }),
);

export const pgCustomerPriceList = pgTableBase(
  'shranix_customer_price_list',
  {
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
  },
  (table) => ({
    customerPriceIdx: pgUniqueIndex('customer_price_idx').on(table.customerId, table.itemId),
  }),
);

// ═════════════════════════════════════════════════════════
// 8. SALES APPROVALS (DB-persisted)
// ═════════════════════════════════════════════════════════
export const sqliteSalesApprovals = sqliteTableBase('shranix_sales_approvals', {
  ...sqliteBase,
  documentType: sqliteText('document_type').notNull(),
  documentId: sqliteText('document_id').notNull(),
  documentNumber: sqliteText('document_number'),
  customerId: sqliteText('customer_id'),
  customerName: sqliteText('customer_name'),
  amount: sqliteReal('amount').notNull().default(0),
  discountAmount: sqliteReal('discount_amount').notNull().default(0),
  discountPercent: sqliteReal('discount_percent').notNull().default(0),
  gstAmount: sqliteReal('gst_amount').notNull().default(0),
  createdBy: sqliteText('created_by').notNull(),
  createdByName: sqliteText('created_by_name'),
  currentLevel: sqliteInteger('current_level').notNull().default(1),
  totalLevels: sqliteInteger('total_levels').notNull().default(1),
  status: sqliteText('status').notNull().default('pending'),
  priority: sqliteText('priority').notNull().default('medium'),
  risk: sqliteText('risk').notNull().default('low'),
  creditStatus: sqliteText('credit_status').notNull().default('normal'),
  assignedTo: sqliteText('assigned_to'),
  assignedToName: sqliteText('assigned_to_name'),
  isOverdue: sqliteInteger('is_overdue', { mode: 'boolean' }).notNull().default(false),
  dueDate: sqliteText('due_date'),
  requestedBy: sqliteText('requested_by'),
  approvedBy: sqliteText('approved_by'),
  approvalDate: sqliteText('approval_date'),
  comments: sqliteText('comments'),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
});

export const pgSalesApprovals = pgTableBase('shranix_sales_approvals', {
  ...pgBase,
  documentType: pgText('document_type').notNull(),
  documentId: pgUuid('document_id').notNull(),
  documentNumber: pgText('document_number'),
  customerId: pgUuid('customer_id'),
  customerName: pgText('customer_name'),
  amount: pgReal('amount').notNull().default(0),
  discountAmount: pgReal('discount_amount').notNull().default(0),
  discountPercent: pgReal('discount_percent').notNull().default(0),
  gstAmount: pgReal('gst_amount').notNull().default(0),
  createdBy: pgUuid('created_by').notNull(),
  createdByName: pgText('created_by_name'),
  currentLevel: pgInteger('current_level').notNull().default(1),
  totalLevels: pgInteger('total_levels').notNull().default(1),
  status: pgText('status').notNull().default('pending'),
  priority: pgText('priority').notNull().default('medium'),
  risk: pgText('risk').notNull().default('low'),
  creditStatus: pgText('credit_status').notNull().default('normal'),
  assignedTo: pgUuid('assigned_to'),
  assignedToName: pgText('assigned_to_name'),
  isOverdue: pgBoolean('is_overdue').notNull().default(false),
  dueDate: pgTimestamp('due_date', { withTimezone: true }),
  requestedBy: pgUuid('requested_by'),
  approvedBy: pgUuid('approved_by'),
  approvalDate: pgTimestamp('approval_date', { withTimezone: true }),
  comments: pgText('comments'),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
});

// ═════════════════════════════════════════════════════════
// ⭐ Phase 1: NEW DB-persisted tables
// ═════════════════════════════════════════════════════════

// Approval History
// NOTE: base soft-delete/timestamp columns (created_at, updated_at, deleted_at,
// is_deleted) were added by migration 0004 — see migration SQL. They are nullable
// here (except is_deleted) so ALTER TABLE ADD COLUMN succeeds on tables with rows.
export const sqliteApprovalHistory = sqliteTableBase('shranix_approval_history', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  approvalId: sqliteText('approval_id').notNull(),
  action: sqliteText('action').notNull(),
  actionBy: sqliteText('action_by').notNull(),
  actionByName: sqliteText('action_by_name'),
  fromStatus: sqliteText('from_status'),
  toStatus: sqliteText('to_status').notNull(),
  level: sqliteInteger('level').notNull().default(0),
  comment: sqliteText('comment'),
  timestamp: sqliteText('timestamp')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const pgApprovalHistory = pgTableBase('shranix_approval_history', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  approvalId: pgUuid('approval_id').notNull(),
  action: pgText('action').notNull(),
  actionBy: pgUuid('action_by').notNull(),
  actionByName: pgText('action_by_name'),
  fromStatus: pgText('from_status'),
  toStatus: pgText('to_status').notNull(),
  level: pgInteger('level').notNull().default(0),
  comment: pgText('comment'),
  timestamp: pgTimestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// Approval Comments
export const sqliteApprovalComments = sqliteTableBase('shranix_approval_comments', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  approvalId: sqliteText('approval_id').notNull(),
  userId: sqliteText('user_id').notNull(),
  userName: sqliteText('user_name'),
  comment: sqliteText('comment').notNull(),
  isInternal: sqliteInteger('is_internal', { mode: 'boolean' }).notNull().default(false),
});

export const pgApprovalComments = pgTableBase('shranix_approval_comments', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  approvalId: pgUuid('approval_id').notNull(),
  userId: pgUuid('user_id').notNull(),
  userName: pgText('user_name'),
  comment: pgText('comment').notNull(),
  isInternal: pgBoolean('is_internal').notNull().default(false),
});

// Approval Notifications
export const sqliteApprovalNotifications = sqliteTableBase('shranix_approval_notifications', {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
  approvalId: sqliteText('approval_id').notNull(),
  recipientId: sqliteText('recipient_id').notNull(),
  recipientRole: sqliteText('recipient_role'),
  type: sqliteText('type').notNull(),
  message: sqliteText('message').notNull(),
  isRead: sqliteInteger('is_read', { mode: 'boolean' }).notNull().default(false),
});

export const pgApprovalNotifications = pgTableBase('shranix_approval_notifications', {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
  approvalId: pgUuid('approval_id').notNull(),
  recipientId: pgUuid('recipient_id').notNull(),
  recipientRole: pgText('recipient_role'),
  type: pgText('type').notNull(),
  message: pgText('message').notNull(),
  isRead: pgBoolean('is_read').notNull().default(false),
});

// Approval Matrices
export const sqliteApprovalMatrices = sqliteTableBase('shranix_approval_matrices', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  documentType: sqliteText('document_type').notNull(),
  levels: sqliteText('levels').notNull().default('single'),
  levelCount: sqliteInteger('level_count').notNull().default(1),
  approvers: sqliteText('approvers'),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const pgApprovalMatrices = pgTableBase('shranix_approval_matrices', {
  ...pgBase,
  name: pgText('name').notNull(),
  documentType: pgText('document_type').notNull(),
  levels: pgText('levels').notNull().default('single'),
  levelCount: pgInteger('level_count').notNull().default(1),
  approvers: pgText('approvers'),
  isActive: pgBoolean('is_active').notNull().default(true),
});

// Approval Rules
export const sqliteApprovalRules = sqliteTableBase('shranix_approval_rules', {
  ...sqliteBase,
  documentType: sqliteText('document_type').notNull(),
  field: sqliteText('field').notNull(),
  operator: sqliteText('operator').notNull(),
  value: sqliteText('value').notNull(),
  value2: sqliteText('value2'),
  approverRole: sqliteText('approver_role').notNull(),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
  priority: sqliteInteger('priority').notNull().default(1),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const pgApprovalRules = pgTableBase('shranix_approval_rules', {
  ...pgBase,
  documentType: pgText('document_type').notNull(),
  field: pgText('field').notNull(),
  operator: pgText('operator').notNull(),
  value: pgText('value').notNull(),
  value2: pgText('value2'),
  approverRole: pgText('approver_role').notNull(),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
  priority: pgInteger('priority').notNull().default(1),
  isActive: pgBoolean('is_active').notNull().default(true),
});

// Credit Profiles
export const sqliteCreditProfiles = sqliteTableBase('shranix_credit_profiles', {
  ...sqliteBase,
  customerId: sqliteText('customer_id').notNull(),
  customerName: sqliteText('customer_name'),
  customerCode: sqliteText('customer_code'),
  creditLimit: sqliteReal('credit_limit').notNull().default(0),
  creditDays: sqliteInteger('credit_days').notNull().default(0),
  securityDeposit: sqliteReal('security_deposit').notNull().default(0),
  openingBalance: sqliteReal('opening_balance').notNull().default(0),
  outstanding: sqliteReal('outstanding').notNull().default(0),
  availableCredit: sqliteReal('available_credit').notNull().default(0),
  blockedAmount: sqliteReal('blocked_amount').notNull().default(0),
  overdueAmount: sqliteReal('overdue_amount').notNull().default(0),
  maxInvoiceAmount: sqliteReal('max_invoice_amount').notNull().default(0),
  preferredPaymentMode: sqliteText('preferred_payment_mode').notNull().default('credit'),
  creditRating: sqliteText('credit_rating').notNull().default('A'),
  riskCategory: sqliteText('risk_category').notNull().default('low'),
  healthScore: sqliteInteger('health_score').notNull().default(100),
  isBlocked: sqliteInteger('is_blocked', { mode: 'boolean' }).notNull().default(false),
  blockReason: sqliteText('block_reason'),
  warningLevel: sqliteText('warning_level').notNull().default('green'),
  lastPaymentDate: sqliteText('last_payment_date'),
  averagePaymentDays: sqliteInteger('average_payment_days').notNull().default(0),
  // Phase 4: Customer advance balance (paise advance me liye — invoice settle karne
  // ke liye baad mein use hota hai). Payments with invoiceId=null → mode advance.
  advanceBalance: sqliteReal('advance_balance').notNull().default(0),
});

export const pgCreditProfiles = pgTableBase('shranix_credit_profiles', {
  ...pgBase,
  customerId: pgUuid('customer_id').notNull(),
  customerName: pgText('customer_name'),
  customerCode: pgText('customer_code'),
  creditLimit: pgReal('credit_limit').notNull().default(0),
  creditDays: pgInteger('credit_days').notNull().default(0),
  securityDeposit: pgReal('security_deposit').notNull().default(0),
  openingBalance: pgReal('opening_balance').notNull().default(0),
  outstanding: pgReal('outstanding').notNull().default(0),
  availableCredit: pgReal('available_credit').notNull().default(0),
  blockedAmount: pgReal('blocked_amount').notNull().default(0),
  overdueAmount: pgReal('overdue_amount').notNull().default(0),
  maxInvoiceAmount: pgReal('max_invoice_amount').notNull().default(0),
  preferredPaymentMode: pgText('preferred_payment_mode').notNull().default('credit'),
  creditRating: pgText('credit_rating').notNull().default('A'),
  riskCategory: pgText('risk_category').notNull().default('low'),
  healthScore: pgInteger('health_score').notNull().default(100),
  isBlocked: pgBoolean('is_blocked').notNull().default(false),
  blockReason: pgText('block_reason'),
  warningLevel: pgText('warning_level').notNull().default('green'),
  lastPaymentDate: pgTimestamp('last_payment_date', { withTimezone: true }),
  averagePaymentDays: pgInteger('average_payment_days').notNull().default(0),
  // Phase 4: Customer advance balance
  advanceBalance: pgReal('advance_balance').notNull().default(0),
});

// Credit Overrides
export const sqliteCreditOverrides = sqliteTableBase('shranix_credit_overrides', {
  ...sqliteBase,
  customerId: sqliteText('customer_id').notNull(),
  overrideBy: sqliteText('override_by').notNull(),
  overrideByName: sqliteText('override_by_name'),
  overrideRole: sqliteText('override_role').notNull(),
  reason: sqliteText('reason').notNull(),
  oldLimit: sqliteReal('old_limit').notNull().default(0),
  newLimit: sqliteReal('new_limit').notNull().default(0),
  approvedBy: sqliteText('approved_by'),
  timestamp: sqliteText('timestamp')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const pgCreditOverrides = pgTableBase('shranix_credit_overrides', {
  ...pgBase,
  customerId: pgUuid('customer_id').notNull(),
  overrideBy: pgUuid('override_by').notNull(),
  overrideByName: pgText('override_by_name'),
  overrideRole: pgText('override_role').notNull(),
  reason: pgText('reason').notNull(),
  oldLimit: pgReal('old_limit').notNull().default(0),
  newLimit: pgReal('new_limit').notNull().default(0),
  approvedBy: pgUuid('approved_by'),
  timestamp: pgTimestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// Credit Notes
export const sqliteCreditNotes = sqliteTableBase('shranix_credit_notes', {
  ...sqliteBase,
  creditNoteNumber: sqliteText('credit_note_number').notNull(),
  financialYear: sqliteText('financial_year'),
  customerId: sqliteText('customer_id').notNull(),
  originalInvoiceId: sqliteText('original_invoice_id'),
  originalInvoiceNumber: sqliteText('original_invoice_number'),
  referenceDate: sqliteText('reference_date'),
  returnAmount: sqliteReal('return_amount').notNull().default(0),
  cgstTotal: sqliteReal('cgst_total').notNull().default(0),
  sgstTotal: sqliteReal('sgst_total').notNull().default(0),
  igstTotal: sqliteReal('igst_total').notNull().default(0),
  cessTotal: sqliteReal('cess_total').notNull().default(0),
  roundOff: sqliteReal('round_off').notNull().default(0),
  narration: sqliteText('narration'),
  status: sqliteText('status').notNull().default('draft'),
  createdBy: sqliteText('created_by'),
});

export const pgCreditNotes = pgTableBase('shranix_credit_notes', {
  ...pgBase,
  creditNoteNumber: pgText('credit_note_number').notNull(),
  financialYear: pgText('financial_year'),
  customerId: pgUuid('customer_id').notNull(),
  originalInvoiceId: pgUuid('original_invoice_id'),
  originalInvoiceNumber: pgText('original_invoice_number'),
  referenceDate: pgTimestamp('reference_date', { withTimezone: true }),
  returnAmount: pgReal('return_amount').notNull().default(0),
  cgstTotal: pgReal('cgst_total').notNull().default(0),
  sgstTotal: pgReal('sgst_total').notNull().default(0),
  igstTotal: pgReal('igst_total').notNull().default(0),
  cessTotal: pgReal('cess_total').notNull().default(0),
  roundOff: pgReal('round_off').notNull().default(0),
  narration: pgText('narration'),
  status: pgText('status').notNull().default('draft'),
  createdBy: pgUuid('created_by'),
});

// Debit Notes
export const sqliteDebitNotes = sqliteTableBase('shranix_debit_notes', {
  ...sqliteBase,
  debitNoteNumber: sqliteText('debit_note_number').notNull(),
  financialYear: sqliteText('financial_year'),
  customerId: sqliteText('customer_id').notNull(),
  originalInvoiceId: sqliteText('original_invoice_id'),
  originalInvoiceNumber: sqliteText('original_invoice_number'),
  debitNoteDate: sqliteText('debit_note_date'),
  debitType: sqliteText('debit_type').notNull(),
  amount: sqliteReal('amount').notNull().default(0),
  gstAmount: sqliteReal('gst_amount').notNull().default(0),
  narration: sqliteText('narration'),
  status: sqliteText('status').notNull().default('draft'),
  createdBy: sqliteText('created_by'),
});

export const pgDebitNotes = pgTableBase('shranix_debit_notes', {
  ...pgBase,
  debitNoteNumber: pgText('debit_note_number').notNull(),
  financialYear: pgText('financial_year'),
  customerId: pgUuid('customer_id').notNull(),
  originalInvoiceId: pgUuid('original_invoice_id'),
  originalInvoiceNumber: pgText('original_invoice_number'),
  debitNoteDate: pgTimestamp('debit_note_date', { withTimezone: true }),
  debitType: pgText('debit_type').notNull(),
  amount: pgReal('amount').notNull().default(0),
  gstAmount: pgReal('gst_amount').notNull().default(0),
  narration: pgText('narration'),
  status: pgText('status').notNull().default('draft'),
  createdBy: pgUuid('created_by'),
});

// ═════════════════════════════════════════════════════════
// ⭐ Phase 4: SALES PAYMENTS (Payment Collection)
// Invoice → Payment: cash / UPI / bank / cheque / advance.
// Har payment ka apna record (paymentNumber, mode, ref/cheque, amount) —
// invoiceId null = advance (customer ke paas credit, baad mein settle hota hai).
// ═════════════════════════════════════════════════════════
export const sqliteSalesPayments = sqliteTableBase(
  'shranix_sales_payments',
  {
    ...sqliteBase,
    paymentNumber: sqliteText('payment_number').notNull(),
    invoiceId: sqliteText('invoice_id'),
    customerId: sqliteText('customer_id').notNull(),
    paymentDate: sqliteText('payment_date').notNull(),
    mode: sqliteText('mode').notNull().default('cash'), // cash, upi, bank, cheque, advance
    amount: sqliteReal('amount').notNull().default(0),
    referenceNo: sqliteText('reference_no'),
    bankName: sqliteText('bank_name'),
    chequeNo: sqliteText('cheque_no'),
    chequeDate: sqliteText('cheque_date'),
    notes: sqliteText('notes'),
    status: sqliteText('status').notNull().default('completed'), // completed, bounced, cancelled
    isAdvance: sqliteInteger('is_advance', { mode: 'boolean' }).notNull().default(false),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    paymentNumberIdx: uniqueIndex('sp_payment_number_idx').on(table.paymentNumber),
    paymentInvoiceIdx: sqliteIndex('sp_payment_invoice_idx').on(table.invoiceId),
    paymentCustomerIdx: sqliteIndex('sp_payment_customer_idx').on(table.customerId),
  }),
);

export const pgSalesPayments = pgTableBase(
  'shranix_sales_payments',
  {
    ...pgBase,
    paymentNumber: pgText('payment_number').notNull(),
    invoiceId: pgUuid('invoice_id'),
    customerId: pgUuid('customer_id').notNull(),
    paymentDate: pgTimestamp('payment_date', { withTimezone: true }).notNull(),
    mode: pgText('mode').notNull().default('cash'),
    amount: pgReal('amount').notNull().default(0),
    referenceNo: pgText('reference_no'),
    bankName: pgText('bank_name'),
    chequeNo: pgText('cheque_no'),
    chequeDate: pgTimestamp('cheque_date', { withTimezone: true }),
    notes: pgText('notes'),
    status: pgText('status').notNull().default('completed'),
    isAdvance: pgBoolean('is_advance').notNull().default(false),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    paymentNumberIdx: pgUniqueIndex('sp_payment_number_idx').on(table.paymentNumber),
    paymentInvoiceIdx: pgIndex('sp_payment_invoice_idx').on(table.invoiceId),
    paymentCustomerIdx: pgIndex('sp_payment_customer_idx').on(table.customerId),
  }),
);
