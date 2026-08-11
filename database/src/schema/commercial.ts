import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  real as pgReal,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ── SQLite base ──────────────────────────────────────────
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

// ── PostgreSQL base ──────────────────────────────────────
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// COMMERCIAL PLANS — the sellable plan master.
// Pricing/features live on plan_versions (never rewrite history).
// ═════════════════════════════════════════════════════════
export const sqlitePlans = sqliteTableBase(
  'shranix_plans',
  {
    ...sqliteBase,
    planCode: sqliteText('plan_code').notNull(),
    planName: sqliteText('plan_name').notNull(),
    displayName: sqliteText('display_name').notNull(),
    description: sqliteText('description'),
    // active | inactive | archived
    status: sqliteText('status').notNull().default('active'),
    // trial | monthly | quarterly | yearly | lifetime | enterprise
    planType: sqliteText('plan_type').notNull().default('monthly'),
    billingCycle: sqliteText('billing_cycle').notNull().default('monthly'),
    currency: sqliteText('currency').notNull().default('INR'),
    trialPeriodDays: sqliteInteger('trial_period_days').notNull().default(0),
    gracePeriodDays: sqliteInteger('grace_period_days').notNull().default(3),
    setupFee: sqliteReal('setup_fee').notNull().default(0),
    effectiveFrom: sqliteText('effective_from'),
    effectiveTo: sqliteText('effective_to'),
    displayOrder: sqliteInteger('display_order').notNull().default(0),
    isRecommended: sqliteInteger('is_recommended', { mode: 'boolean' }).notNull().default(false),
    isPublic: sqliteInteger('is_public', { mode: 'boolean' }).notNull().default(true),
    internalNotes: sqliteText('internal_notes'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('pl_code_idx').on(table.planCode),
    statusIdx: index('pl_status_idx').on(table.status),
    typeIdx: index('pl_type_idx').on(table.planType),
  }),
);

export const pgPlans = pgTableBase(
  'shranix_plans',
  {
    ...pgBase,
    planCode: pgText('plan_code').notNull(),
    planName: pgText('plan_name').notNull(),
    displayName: pgText('display_name').notNull(),
    description: pgText('description'),
    status: pgText('status').notNull().default('active'),
    planType: pgText('plan_type').notNull().default('monthly'),
    billingCycle: pgText('billing_cycle').notNull().default('monthly'),
    currency: pgText('currency').notNull().default('INR'),
    trialPeriodDays: pgInteger('trial_period_days').notNull().default(0),
    gracePeriodDays: pgInteger('grace_period_days').notNull().default(3),
    setupFee: pgReal('setup_fee').notNull().default(0),
    effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
    effectiveTo: pgTimestamp('effective_to', { withTimezone: true }),
    displayOrder: pgInteger('display_order').notNull().default(0),
    isRecommended: pgBoolean('is_recommended').notNull().default(false),
    isPublic: pgBoolean('is_public').notNull().default(true),
    internalNotes: pgText('internal_notes'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('pl_code_idx').on(table.planCode),
    statusIdx: pgIndex('pl_status_idx').on(table.status),
    typeIdx: pgIndex('pl_type_idx').on(table.planType),
  }),
);

// ═════════════════════════════════════════════════════════
// PLAN VERSIONS — immutable pricing + feature entitlements +
// usage limits snapshot. Subscriptions pin planVersionId.
// ═════════════════════════════════════════════════════════
export const sqlitePlanVersions = sqliteTableBase(
  'shranix_plan_versions',
  {
    ...sqliteBase,
    planId: sqliteText('plan_id').notNull(),
    version: sqliteInteger('version').notNull().default(1),
    price: sqliteReal('price').notNull().default(0),
    discountPercent: sqliteReal('discount_percent').notNull().default(0),
    taxRate: sqliteReal('tax_rate').notNull().default(0),
    currency: sqliteText('currency').notNull().default('INR'),
    // JSON: { sales: true, purchase: true, ... } — feature entitlements
    features: sqliteText('features').notNull().default('{}'),
    // JSON: { users: 5, branches: 1, invoices: 1000, ... } — usage limits
    limits: sqliteText('limits').notNull().default('{}'),
    effectiveFrom: sqliteText('effective_from'),
    // active | superseded
    status: sqliteText('status').notNull().default('active'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    planIdx: index('pv_plan_idx').on(table.planId),
    planVersionIdx: uniqueIndex('pv_plan_version_idx').on(table.planId, table.version),
    statusIdx: index('pv_status_idx').on(table.status),
  }),
);

export const pgPlanVersions = pgTableBase(
  'shranix_plan_versions',
  {
    ...pgBase,
    planId: pgUuid('plan_id').notNull(),
    version: pgInteger('version').notNull().default(1),
    price: pgReal('price').notNull().default(0),
    discountPercent: pgReal('discount_percent').notNull().default(0),
    taxRate: pgReal('tax_rate').notNull().default(0),
    currency: pgText('currency').notNull().default('INR'),
    features: pgText('features').notNull().default('{}'),
    limits: pgText('limits').notNull().default('{}'),
    effectiveFrom: pgTimestamp('effective_from', { withTimezone: true }),
    status: pgText('status').notNull().default('active'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    planIdx: pgIndex('pv_plan_idx').on(table.planId),
    planVersionIdx: pgUniqueIndex('pv_plan_version_idx').on(table.planId, table.version),
    statusIdx: pgIndex('pv_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// SUBSCRIPTIONS — one active subscription per customer.
// Status: TRIAL | PENDING_PAYMENT | ACTIVE | PAST_DUE |
//         GRACE_PERIOD | SUSPENDED | CANCELLED | EXPIRED |
//         UPGRADED | DOWNGRADED
// ═════════════════════════════════════════════════════════
export const sqliteSubscriptions = sqliteTableBase(
  'shranix_subscriptions',
  {
    ...sqliteBase,
    subscriptionNumber: sqliteText('subscription_number').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    planId: sqliteText('plan_id').notNull(),
    planVersionId: sqliteText('plan_version_id').notNull(),
    billingCycle: sqliteText('billing_cycle').notNull().default('monthly'),
    startDate: sqliteText('start_date').notNull(),
    endDate: sqliteText('end_date'),
    trialStart: sqliteText('trial_start'),
    trialEnd: sqliteText('trial_end'),
    graceStart: sqliteText('grace_start'),
    graceEnd: sqliteText('grace_end'),
    status: sqliteText('status').notNull().default('TRIAL'),
    autoRenew: sqliteInteger('auto_renew', { mode: 'boolean' }).notNull().default(false),
    price: sqliteReal('price').notNull().default(0),
    discountAmount: sqliteReal('discount_amount').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    finalAmount: sqliteReal('final_amount').notNull().default(0),
    currency: sqliteText('currency').notNull().default('INR'),
    // unpaid | pending | paid | failed
    paymentStatus: sqliteText('payment_status').notNull().default('unpaid'),
    cancelledAt: sqliteText('cancelled_at'),
    cancellationReason: sqliteText('cancellation_reason'),
    cancelledBy: sqliteText('cancelled_by'),
    // parent subscription when this is an upgrade replacement
    upgradeFromSubscriptionId: sqliteText('upgrade_from_subscription_id'),
    // customer's saved provider token for auto-renew (provider-safe only)
    paymentMethodRef: sqliteText('payment_method_ref'),
    source: sqliteText('source').notNull().default('admin'), // admin | portal | website
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('sub_number_idx').on(table.subscriptionNumber),
    customerIdx: index('sub_customer_idx').on(table.customerId),
    statusIdx: index('sub_status_idx').on(table.status),
    planIdx: index('sub_plan_idx').on(table.planId),
    endIdx: index('sub_end_idx').on(table.endDate),
  }),
);

export const pgSubscriptions = pgTableBase(
  'shranix_subscriptions',
  {
    ...pgBase,
    subscriptionNumber: pgText('subscription_number').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    planId: pgUuid('plan_id').notNull(),
    planVersionId: pgUuid('plan_version_id').notNull(),
    billingCycle: pgText('billing_cycle').notNull().default('monthly'),
    startDate: pgTimestamp('start_date', { withTimezone: true }).notNull(),
    endDate: pgTimestamp('end_date', { withTimezone: true }),
    trialStart: pgTimestamp('trial_start', { withTimezone: true }),
    trialEnd: pgTimestamp('trial_end', { withTimezone: true }),
    graceStart: pgTimestamp('grace_start', { withTimezone: true }),
    graceEnd: pgTimestamp('grace_end', { withTimezone: true }),
    status: pgText('status').notNull().default('TRIAL'),
    autoRenew: pgBoolean('auto_renew').notNull().default(false),
    price: pgReal('price').notNull().default(0),
    discountAmount: pgReal('discount_amount').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    finalAmount: pgReal('final_amount').notNull().default(0),
    currency: pgText('currency').notNull().default('INR'),
    paymentStatus: pgText('payment_status').notNull().default('unpaid'),
    cancelledAt: pgTimestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: pgText('cancellation_reason'),
    cancelledBy: pgUuid('cancelled_by'),
    upgradeFromSubscriptionId: pgUuid('upgrade_from_subscription_id'),
    paymentMethodRef: pgText('payment_method_ref'),
    source: pgText('source').notNull().default('admin'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('sub_number_idx').on(table.subscriptionNumber),
    customerIdx: pgIndex('sub_customer_idx').on(table.customerId),
    statusIdx: pgIndex('sub_status_idx').on(table.status),
    planIdx: pgIndex('sub_plan_idx').on(table.planId),
    endIdx: pgIndex('sub_end_idx').on(table.endDate),
  }),
);

// ═════════════════════════════════════════════════════════
// SUBSCRIPTION EVENTS — immutable lifecycle history
// ═════════════════════════════════════════════════════════
export const sqliteSubscriptionEvents = sqliteTableBase(
  'shranix_subscription_events',
  {
    ...sqliteBase,
    subscriptionId: sqliteText('subscription_id').notNull(),
    eventType: sqliteText('event_type').notNull(), // created | activated | renewed | upgraded | downgraded | cancelled | payment_failed | grace_started | suspended | expired | reminder
    fromStatus: sqliteText('from_status'),
    toStatus: sqliteText('to_status'),
    metadata: sqliteText('metadata'), // JSON
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    subIdx: index('se_sub_idx').on(table.subscriptionId),
    typeIdx: index('se_type_idx').on(table.eventType),
    createdIdx: index('se_created_idx').on(table.createdAt),
  }),
);

export const pgSubscriptionEvents = pgTableBase(
  'shranix_subscription_events',
  {
    ...pgBase,
    subscriptionId: pgUuid('subscription_id').notNull(),
    eventType: pgText('event_type').notNull(),
    fromStatus: pgText('from_status'),
    toStatus: pgText('to_status'),
    metadata: pgText('metadata'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    subIdx: pgIndex('se_sub_idx').on(table.subscriptionId),
    typeIdx: pgIndex('se_type_idx').on(table.eventType),
    createdIdx: pgIndex('se_created_idx').on(table.createdAt),
  }),
);

// ═════════════════════════════════════════════════════════
// BILLING INVOICES — commercial subscription invoices
// ═════════════════════════════════════════════════════════
export const sqliteBillingInvoices = sqliteTableBase(
  'shranix_billing_invoices',
  {
    ...sqliteBase,
    invoiceNumber: sqliteText('invoice_number').notNull(),
    subscriptionId: sqliteText('subscription_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    periodStart: sqliteText('period_start').notNull(),
    periodEnd: sqliteText('period_end').notNull(),
    basePrice: sqliteReal('base_price').notNull().default(0),
    discountAmount: sqliteReal('discount_amount').notNull().default(0),
    taxAmount: sqliteReal('tax_amount').notNull().default(0),
    totalAmount: sqliteReal('total_amount').notNull().default(0),
    currency: sqliteText('currency').notNull().default('INR'),
    dueDate: sqliteText('due_date').notNull(),
    couponCode: sqliteText('coupon_code'),
    // draft | issued | paid | failed | cancelled
    status: sqliteText('status').notNull().default('draft'),
    // unpaid | pending | paid | failed | refunded
    paymentStatus: sqliteText('payment_status').notNull().default('unpaid'),
    billingPaymentId: sqliteText('billing_payment_id'),
    glVoucherId: sqliteText('gl_voucher_id'),
    issuedAt: sqliteText('issued_at'),
    paidAt: sqliteText('paid_at'),
    cancelledAt: sqliteText('cancelled_at'),
    cancellationReason: sqliteText('cancellation_reason'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('bi_number_idx').on(table.invoiceNumber),
    subIdx: index('bi_sub_idx').on(table.subscriptionId),
    customerIdx: index('bi_customer_idx').on(table.customerId),
    statusIdx: index('bi_status_idx').on(table.status),
    dueIdx: index('bi_due_idx').on(table.dueDate),
  }),
);

export const pgBillingInvoices = pgTableBase(
  'shranix_billing_invoices',
  {
    ...pgBase,
    invoiceNumber: pgText('invoice_number').notNull(),
    subscriptionId: pgUuid('subscription_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    periodStart: pgTimestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: pgTimestamp('period_end', { withTimezone: true }).notNull(),
    basePrice: pgReal('base_price').notNull().default(0),
    discountAmount: pgReal('discount_amount').notNull().default(0),
    taxAmount: pgReal('tax_amount').notNull().default(0),
    totalAmount: pgReal('total_amount').notNull().default(0),
    currency: pgText('currency').notNull().default('INR'),
    dueDate: pgTimestamp('due_date', { withTimezone: true }).notNull(),
    couponCode: pgText('coupon_code'),
    status: pgText('status').notNull().default('draft'),
    paymentStatus: pgText('payment_status').notNull().default('unpaid'),
    billingPaymentId: pgUuid('billing_payment_id'),
    glVoucherId: pgUuid('gl_voucher_id'),
    issuedAt: pgTimestamp('issued_at', { withTimezone: true }),
    paidAt: pgTimestamp('paid_at', { withTimezone: true }),
    cancelledAt: pgTimestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: pgText('cancellation_reason'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('bi_number_idx').on(table.invoiceNumber),
    subIdx: pgIndex('bi_sub_idx').on(table.subscriptionId),
    customerIdx: pgIndex('bi_customer_idx').on(table.customerId),
    statusIdx: pgIndex('bi_status_idx').on(table.status),
    dueIdx: pgIndex('bi_due_idx').on(table.dueDate),
  }),
);

// ═════════════════════════════════════════════════════════
// BILLING PAYMENTS — subscription payments. unique idempotency
// key prevents duplicate processing (webhooks/concurrent retries).
// Status: INITIATED | PENDING | AUTHORIZED | SUCCESS | FAILED |
//         CANCELLED | REFUNDED | PARTIALLY_REFUNDED | EXPIRED
// ═════════════════════════════════════════════════════════
export const sqliteBillingPayments = sqliteTableBase(
  'shranix_billing_payments',
  {
    ...sqliteBase,
    paymentNumber: sqliteText('payment_number').notNull(),
    subscriptionId: sqliteText('subscription_id').notNull(),
    billingInvoiceId: sqliteText('billing_invoice_id'),
    customerId: sqliteText('customer_id').notNull(),
    amount: sqliteReal('amount').notNull().default(0),
    currency: sqliteText('currency').notNull().default('INR'),
    // upi | card | netbanking | wallet | manual | gateway
    mode: sqliteText('mode').notNull().default('gateway'),
    provider: sqliteText('provider').notNull().default('simulated'),
    gatewayRef: sqliteText('gateway_ref'),
    status: sqliteText('status').notNull().default('INITIATED'),
    idempotencyKey: sqliteText('idempotency_key').notNull(),
    refundedAmount: sqliteReal('refunded_amount').notNull().default(0),
    refundStatus: sqliteText('refund_status'),
    initiatedAt: sqliteText('initiated_at').notNull(),
    completedAt: sqliteText('completed_at'),
    failureReason: sqliteText('failure_reason'),
    providerResponse: sqliteText('provider_response'), // JSON — provider payload (no secrets)
    webhookReceivedAt: sqliteText('webhook_received_at'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    numberIdx: uniqueIndex('bp_number_idx').on(table.paymentNumber),
    idemIdx: uniqueIndex('bp_idem_idx').on(table.idempotencyKey),
    subIdx: index('bp_sub_idx').on(table.subscriptionId),
    invoiceIdx: index('bp_invoice_idx').on(table.billingInvoiceId),
    customerIdx: index('bp_customer_idx').on(table.customerId),
    statusIdx: index('bp_status_idx').on(table.status),
  }),
);

export const pgBillingPayments = pgTableBase(
  'shranix_billing_payments',
  {
    ...pgBase,
    paymentNumber: pgText('payment_number').notNull(),
    subscriptionId: pgUuid('subscription_id').notNull(),
    billingInvoiceId: pgUuid('billing_invoice_id'),
    customerId: pgUuid('customer_id').notNull(),
    amount: pgReal('amount').notNull().default(0),
    currency: pgText('currency').notNull().default('INR'),
    mode: pgText('mode').notNull().default('gateway'),
    provider: pgText('provider').notNull().default('simulated'),
    gatewayRef: pgText('gateway_ref'),
    status: pgText('status').notNull().default('INITIATED'),
    idempotencyKey: pgText('idempotency_key').notNull(),
    refundedAmount: pgReal('refunded_amount').notNull().default(0),
    refundStatus: pgText('refund_status'),
    initiatedAt: pgTimestamp('initiated_at', { withTimezone: true }).notNull(),
    completedAt: pgTimestamp('completed_at', { withTimezone: true }),
    failureReason: pgText('failure_reason'),
    providerResponse: pgText('provider_response'),
    webhookReceivedAt: pgTimestamp('webhook_received_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    numberIdx: pgUniqueIndex('bp_number_idx').on(table.paymentNumber),
    idemIdx: pgUniqueIndex('bp_idem_idx').on(table.idempotencyKey),
    subIdx: pgIndex('bp_sub_idx').on(table.subscriptionId),
    invoiceIdx: pgIndex('bp_invoice_idx').on(table.billingInvoiceId),
    customerIdx: pgIndex('bp_customer_idx').on(table.customerId),
    statusIdx: pgIndex('bp_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// COUPONS
// ═════════════════════════════════════════════════════════
export const sqliteCoupons = sqliteTableBase(
  'shranix_coupons',
  {
    ...sqliteBase,
    couponCode: sqliteText('coupon_code').notNull(),
    description: sqliteText('description'),
    // percent | fixed
    discountType: sqliteText('discount_type').notNull().default('percent'),
    discountValue: sqliteReal('discount_value').notNull().default(0),
    maxDiscount: sqliteReal('max_discount'),
    minBillingAmount: sqliteReal('min_billing_amount').notNull().default(0),
    startDate: sqliteText('start_date'),
    endDate: sqliteText('end_date'),
    usageLimit: sqliteInteger('usage_limit'),
    perCustomerLimit: sqliteInteger('per_customer_limit').notNull().default(1),
    // JSON array of planIds — empty = all plans
    applicablePlanIds: sqliteText('applicable_plan_ids').notNull().default('[]'),
    // active | inactive | expired
    status: sqliteText('status').notNull().default('active'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    codeIdx: uniqueIndex('cp_code_idx').on(table.couponCode),
    statusIdx: index('cp_status_idx').on(table.status),
    dateIdx: index('cp_date_idx').on(table.startDate, table.endDate),
  }),
);

export const pgCoupons = pgTableBase(
  'shranix_coupons',
  {
    ...pgBase,
    couponCode: pgText('coupon_code').notNull(),
    description: pgText('description'),
    discountType: pgText('discount_type').notNull().default('percent'),
    discountValue: pgReal('discount_value').notNull().default(0),
    maxDiscount: pgReal('max_discount'),
    minBillingAmount: pgReal('min_billing_amount').notNull().default(0),
    startDate: pgTimestamp('start_date', { withTimezone: true }),
    endDate: pgTimestamp('end_date', { withTimezone: true }),
    usageLimit: pgInteger('usage_limit'),
    perCustomerLimit: pgInteger('per_customer_limit').notNull().default(1),
    applicablePlanIds: pgText('applicable_plan_ids').notNull().default('[]'),
    status: pgText('status').notNull().default('active'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    codeIdx: pgUniqueIndex('cp_code_idx').on(table.couponCode),
    statusIdx: pgIndex('cp_status_idx').on(table.status),
    dateIdx: pgIndex('cp_date_idx').on(table.startDate, table.endDate),
  }),
);

// ═════════════════════════════════════════════════════════
// COUPON REDEMPTIONS — one row per (coupon, customer) use
// ═════════════════════════════════════════════════════════
export const sqliteCouponRedemptions = sqliteTableBase(
  'shranix_coupon_redemptions',
  {
    ...sqliteBase,
    couponId: sqliteText('coupon_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    subscriptionId: sqliteText('subscription_id'),
    billingInvoiceId: sqliteText('billing_invoice_id'),
    discountAmount: sqliteReal('discount_amount').notNull().default(0),
    redeemedAt: sqliteText('redeemed_at').notNull(),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    couponCustomerIdx: uniqueIndex('cr_coupon_customer_idx').on(table.couponId, table.customerId),
    couponIdx: index('cr_coupon_idx').on(table.couponId),
    customerIdx: index('cr_customer_idx').on(table.customerId),
  }),
);

export const pgCouponRedemptions = pgTableBase(
  'shranix_coupon_redemptions',
  {
    ...pgBase,
    couponId: pgUuid('coupon_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    subscriptionId: pgUuid('subscription_id'),
    billingInvoiceId: pgUuid('billing_invoice_id'),
    discountAmount: pgReal('discount_amount').notNull().default(0),
    redeemedAt: pgTimestamp('redeemed_at', { withTimezone: true }).notNull(),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    couponCustomerIdx: pgUniqueIndex('cr_coupon_customer_idx').on(table.couponId, table.customerId),
    couponIdx: pgIndex('cr_coupon_idx').on(table.couponId),
    customerIdx: pgIndex('cr_customer_idx').on(table.customerId),
  }),
);

// ═════════════════════════════════════════════════════════
// USAGE RECORDS — periodic snapshots for usage monitoring
// ═════════════════════════════════════════════════════════
export const sqliteUsageRecords = sqliteTableBase(
  'shranix_usage_records',
  {
    ...sqliteBase,
    customerId: sqliteText('customer_id').notNull(),
    subscriptionId: sqliteText('subscription_id').notNull(),
    resource: sqliteText('resource').notNull(), // users | branches | warehouses | customers | products | invoices | sales_orders | purchase_orders | storage | api_requests
    periodKey: sqliteText('period_key').notNull(), // YYYY-MM
    used: sqliteInteger('used').notNull().default(0),
    limit: sqliteInteger('limit'),
    recordedAt: sqliteText('recorded_at').notNull(),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    customerPeriodIdx: uniqueIndex('ur_customer_period_idx').on(
      table.customerId,
      table.resource,
      table.periodKey,
    ),
    subIdx: index('ur_sub_idx').on(table.subscriptionId),
    resourceIdx: index('ur_resource_idx').on(table.resource),
  }),
);

export const pgUsageRecords = pgTableBase(
  'shranix_usage_records',
  {
    ...pgBase,
    customerId: pgUuid('customer_id').notNull(),
    subscriptionId: pgUuid('subscription_id').notNull(),
    resource: pgText('resource').notNull(),
    periodKey: pgText('period_key').notNull(),
    used: pgInteger('used').notNull().default(0),
    limit: pgInteger('limit'),
    recordedAt: pgTimestamp('recorded_at', { withTimezone: true }).notNull(),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    customerPeriodIdx: pgUniqueIndex('ur_customer_period_idx').on(
      table.customerId,
      table.resource,
      table.periodKey,
    ),
    subIdx: pgIndex('ur_sub_idx').on(table.subscriptionId),
    resourceIdx: pgIndex('ur_resource_idx').on(table.resource),
  }),
);

// ═════════════════════════════════════════════════════════
// COMMERCIAL REMINDERS — deduped reminder history
// ═════════════════════════════════════════════════════════
export const sqliteCommercialReminders = sqliteTableBase(
  'shranix_commercial_reminders',
  {
    ...sqliteBase,
    subscriptionId: sqliteText('subscription_id').notNull(),
    reminderType: sqliteText('reminder_type').notNull(), // trial_expiring | renewal_due | payment_due | payment_overdue | grace_ending | expiry
    periodKey: sqliteText('period_key').notNull(), // billing period or target date — dedupe key
    scheduledFor: sqliteText('scheduled_for').notNull(),
    sentAt: sqliteText('sent_at'),
    sentTo: sqliteText('sent_to'), // customerId / recipient
    channel: sqliteText('channel').notNull().default('notification'),
    metadata: sqliteText('metadata'), // JSON
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    subTypePeriodIdx: uniqueIndex('cr_sub_type_period_idx').on(
      table.subscriptionId,
      table.reminderType,
      table.periodKey,
    ),
    dueIdx: index('cr_due_idx').on(table.scheduledFor),
  }),
);

export const pgCommercialReminders = pgTableBase(
  'shranix_commercial_reminders',
  {
    ...pgBase,
    subscriptionId: pgUuid('subscription_id').notNull(),
    reminderType: pgText('reminder_type').notNull(),
    periodKey: pgText('period_key').notNull(),
    scheduledFor: pgTimestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: pgTimestamp('sent_at', { withTimezone: true }),
    sentTo: pgUuid('sent_to'),
    channel: pgText('channel').notNull().default('notification'),
    metadata: pgText('metadata'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    subTypePeriodIdx: pgUniqueIndex('cr_sub_type_period_idx').on(
      table.subscriptionId,
      table.reminderType,
      table.periodKey,
    ),
    dueIdx: pgIndex('cr_due_idx').on(table.scheduledFor),
  }),
);
