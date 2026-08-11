CREATE TABLE `shranix_purchase_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`payment_number` text NOT NULL,
	`invoice_id` text,
	`supplier_id` text NOT NULL,
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
CREATE UNIQUE INDEX `pp_payment_number_idx` ON `shranix_purchase_payments` (`payment_number`);--> statement-breakpoint
CREATE INDEX `pp_payment_invoice_idx` ON `shranix_purchase_payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `pp_payment_supplier_idx` ON `shranix_purchase_payments` (`supplier_id`);