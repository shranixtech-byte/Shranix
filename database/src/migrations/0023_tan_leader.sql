CREATE TABLE `shranix_billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`invoice_number` text NOT NULL,
	`subscription_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`base_price` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`due_date` text NOT NULL,
	`coupon_code` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`billing_payment_id` text,
	`gl_voucher_id` text,
	`issued_at` text,
	`paid_at` text,
	`cancelled_at` text,
	`cancellation_reason` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bi_number_idx` ON `shranix_billing_invoices` (`invoice_number`);--> statement-breakpoint
CREATE INDEX `bi_sub_idx` ON `shranix_billing_invoices` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `bi_customer_idx` ON `shranix_billing_invoices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `bi_status_idx` ON `shranix_billing_invoices` (`status`);--> statement-breakpoint
CREATE INDEX `bi_due_idx` ON `shranix_billing_invoices` (`due_date`);--> statement-breakpoint
CREATE TABLE `shranix_billing_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`payment_number` text NOT NULL,
	`subscription_id` text NOT NULL,
	`billing_invoice_id` text,
	`customer_id` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`mode` text DEFAULT 'gateway' NOT NULL,
	`provider` text DEFAULT 'simulated' NOT NULL,
	`gateway_ref` text,
	`status` text DEFAULT 'INITIATED' NOT NULL,
	`idempotency_key` text NOT NULL,
	`refunded_amount` real DEFAULT 0 NOT NULL,
	`refund_status` text,
	`initiated_at` text NOT NULL,
	`completed_at` text,
	`failure_reason` text,
	`provider_response` text,
	`webhook_received_at` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bp_number_idx` ON `shranix_billing_payments` (`payment_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `bp_idem_idx` ON `shranix_billing_payments` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `bp_sub_idx` ON `shranix_billing_payments` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `bp_invoice_idx` ON `shranix_billing_payments` (`billing_invoice_id`);--> statement-breakpoint
CREATE INDEX `bp_customer_idx` ON `shranix_billing_payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `bp_status_idx` ON `shranix_billing_payments` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_commercial_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`subscription_id` text NOT NULL,
	`reminder_type` text NOT NULL,
	`period_key` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`sent_at` text,
	`sent_to` text,
	`channel` text DEFAULT 'notification' NOT NULL,
	`metadata` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cr_sub_type_period_idx` ON `shranix_commercial_reminders` (`subscription_id`,`reminder_type`,`period_key`);--> statement-breakpoint
CREATE INDEX `cr_due_idx` ON `shranix_commercial_reminders` (`scheduled_for`);--> statement-breakpoint
CREATE TABLE `shranix_coupon_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`coupon_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text,
	`billing_invoice_id` text,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`redeemed_at` text NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cr_coupon_customer_idx` ON `shranix_coupon_redemptions` (`coupon_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `cr_coupon_idx` ON `shranix_coupon_redemptions` (`coupon_id`);--> statement-breakpoint
CREATE INDEX `cr_customer_idx` ON `shranix_coupon_redemptions` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shranix_coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`coupon_code` text NOT NULL,
	`description` text,
	`discount_type` text DEFAULT 'percent' NOT NULL,
	`discount_value` real DEFAULT 0 NOT NULL,
	`max_discount` real,
	`min_billing_amount` real DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`usage_limit` integer,
	`per_customer_limit` integer DEFAULT 1 NOT NULL,
	`applicable_plan_ids` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cp_code_idx` ON `shranix_coupons` (`coupon_code`);--> statement-breakpoint
CREATE INDEX `cp_status_idx` ON `shranix_coupons` (`status`);--> statement-breakpoint
CREATE INDEX `cp_date_idx` ON `shranix_coupons` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `shranix_plan_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`plan_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`features` text DEFAULT '{}' NOT NULL,
	`limits` text DEFAULT '{}' NOT NULL,
	`effective_from` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `pv_plan_idx` ON `shranix_plan_versions` (`plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pv_plan_version_idx` ON `shranix_plan_versions` (`plan_id`,`version`);--> statement-breakpoint
CREATE INDEX `pv_status_idx` ON `shranix_plan_versions` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`plan_code` text NOT NULL,
	`plan_name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`plan_type` text DEFAULT 'monthly' NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`trial_period_days` integer DEFAULT 0 NOT NULL,
	`grace_period_days` integer DEFAULT 3 NOT NULL,
	`setup_fee` real DEFAULT 0 NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_recommended` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`internal_notes` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pl_code_idx` ON `shranix_plans` (`plan_code`);--> statement-breakpoint
CREATE INDEX `pl_status_idx` ON `shranix_plans` (`status`);--> statement-breakpoint
CREATE INDEX `pl_type_idx` ON `shranix_plans` (`plan_type`);--> statement-breakpoint
CREATE TABLE `shranix_subscription_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`subscription_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`metadata` text,
	`created_by` text
);
--> statement-breakpoint
CREATE INDEX `se_sub_idx` ON `shranix_subscription_events` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `se_type_idx` ON `shranix_subscription_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `se_created_idx` ON `shranix_subscription_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `shranix_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`subscription_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`plan_version_id` text NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`trial_start` text,
	`trial_end` text,
	`grace_start` text,
	`grace_end` text,
	`status` text DEFAULT 'TRIAL' NOT NULL,
	`auto_renew` integer DEFAULT false NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`final_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`cancelled_at` text,
	`cancellation_reason` text,
	`cancelled_by` text,
	`upgrade_from_subscription_id` text,
	`payment_method_ref` text,
	`source` text DEFAULT 'admin' NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sub_number_idx` ON `shranix_subscriptions` (`subscription_number`);--> statement-breakpoint
CREATE INDEX `sub_customer_idx` ON `shranix_subscriptions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `sub_status_idx` ON `shranix_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `sub_plan_idx` ON `shranix_subscriptions` (`plan_id`);--> statement-breakpoint
CREATE INDEX `sub_end_idx` ON `shranix_subscriptions` (`end_date`);--> statement-breakpoint
CREATE TABLE `shranix_usage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`resource` text NOT NULL,
	`period_key` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`limit` integer,
	`recorded_at` text NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ur_customer_period_idx` ON `shranix_usage_records` (`customer_id`,`resource`,`period_key`);--> statement-breakpoint
CREATE INDEX `ur_sub_idx` ON `shranix_usage_records` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `ur_resource_idx` ON `shranix_usage_records` (`resource`);