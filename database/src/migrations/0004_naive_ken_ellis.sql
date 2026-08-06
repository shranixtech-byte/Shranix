CREATE TABLE `shranix_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`company_id` text,
	`bank_name` text NOT NULL,
	`account_holder_name` text,
	`account_number` text,
	`account_type` text DEFAULT 'savings' NOT NULL,
	`ifsc` text,
	`swift_code` text,
	`upi_id` text,
	`cheque_format` text,
	`is_default` integer DEFAULT false NOT NULL,
	`neft_enabled` integer DEFAULT true NOT NULL,
	`rtgs_enabled` integer DEFAULT true NOT NULL,
	`imps_enabled` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `bank_acct_company_idx` ON `shranix_bank_accounts` (`company_id`);--> statement-breakpoint
DROP INDEX IF EXISTS `audit_timestamp_idx`;--> statement-breakpoint
CREATE INDEX `audit_timestamp_idx` ON `shranix_audit_details` (`timestamp`);--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `fiscal_year_lock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `period_lock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `period_lock_date` text;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `voucher_lock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `closing_date` text;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `opening_balance_lock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `default_ledger_account_id` text;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `default_tax_group_id` text;--> statement-breakpoint
ALTER TABLE `shranix_accounting_settings` ADD `rounding_rule` text DEFAULT 'nearest' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_approval_comments` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_comments` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_comments` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_approval_history` ADD `created_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_history` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_history` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_history` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_approval_notifications` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_notifications` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `shranix_approval_notifications` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `license_no` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `pesticides_license` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `seeds_license` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `cotton_license` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `fertilizer_license` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `retail_license` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `stamp` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `digital_signature` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `invoice_signature` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `email_logo` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `invoice_footer` text;--> statement-breakpoint
ALTER TABLE `shranix_companies` ADD `qr_logo` text;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `lot_tracking` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `auto_barcode` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `auto_sku` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `low_stock_alert` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `low_stock_threshold` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_inventory_settings` ADD `stock_reservation` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `auto_grn` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `supplier_credit_days` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_tax_group_id` text;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_warehouse_id` text;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_payment_mode` text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_supplier_category` text;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_vendor_rating` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `default_gst_rate` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_purchase_settings` ADD `require_vendor_approval` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `created_at` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `batch_no` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `hsn_code` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `barcode` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `free_qty` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `discount_type` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `remarks` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `warehouse` text;--> statement-breakpoint
ALTER TABLE `shranix_quotation_items` ADD `expiry_date` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `branch_id` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `parent_quote_id` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `billing_address` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `shipping_address` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `contact_person` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `payment_terms` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `delivery_time` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `freight` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `installation_charges` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `warranty` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `customer_notes` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `sent_at` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_quotations` ADD `sent_via` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `quote_fy_prefix` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `quote_branch_prefix` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `discount_approval` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `discount_approval_limit` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `enforce_credit_limit` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `overdue_alert` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `overdue_alert_days` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `salesman_mandatory` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `quotation_expiry_days` integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `default_credit_limit` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `customer_groups` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `default_customer_group` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `loyalty_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `loyalty_points_per_amount` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `default_price_list` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `gst_validation` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `pan_validation` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `invoice_suffix` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `print_format` text DEFAULT 'a4_portrait' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `duplicate_copy` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `transport_copy` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_qr` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_hsn` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_batch` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_expiry` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_discount` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_gst` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_settings` ADD `show_barcode` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_users` ADD `allowed_modules` text;