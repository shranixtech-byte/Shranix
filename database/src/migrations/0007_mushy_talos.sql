CREATE TABLE `shranix_sales_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`payment_number` text NOT NULL,
	`invoice_id` text,
	`customer_id` text NOT NULL,
	`payment_date` text NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reference_no` text,
	`bank_name` text,
	`cheque_no` text,
	`cheque_date` text,
	`notes` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`is_advance` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sp_payment_number_idx` ON `shranix_sales_payments` (`payment_number`);--> statement-breakpoint
CREATE INDEX `sp_payment_invoice_idx` ON `shranix_sales_payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `sp_payment_customer_idx` ON `shranix_sales_payments` (`customer_id`);--> statement-breakpoint
ALTER TABLE `shranix_credit_profiles` ADD `advance_balance` real DEFAULT 0 NOT NULL;