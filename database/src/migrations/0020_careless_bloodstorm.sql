CREATE TABLE `shranix_asset_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`asset_id` text NOT NULL,
	`assigned_to_type` text NOT NULL,
	`assigned_to_id` text NOT NULL,
	`assignment_date` text,
	`expected_return_date` text,
	`remarks` text,
	`status` text DEFAULT 'assigned' NOT NULL,
	`returned_at` text,
	`assigned_by` text
);
--> statement-breakpoint
CREATE INDEX `ast_alloc_asset_idx` ON `shranix_asset_allocations` (`asset_id`);--> statement-breakpoint
CREATE INDEX `ast_alloc_emp_idx` ON `shranix_asset_allocations` (`assigned_to_id`);--> statement-breakpoint
CREATE TABLE `shranix_asset_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`category_name` text NOT NULL,
	`asset_type` text DEFAULT 'fixed_asset' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_cat_name_idx` ON `shranix_asset_categories` (`category_name`);--> statement-breakpoint
CREATE TABLE `shranix_asset_condition_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`asset_id` text NOT NULL,
	`condition` text NOT NULL,
	`changed_at` text,
	`remarks` text,
	`changed_by` text
);
--> statement-breakpoint
CREATE INDEX `ast_cond_asset_idx` ON `shranix_asset_condition_history` (`asset_id`);--> statement-breakpoint
CREATE TABLE `shranix_asset_depreciation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`asset_id` text NOT NULL,
	`period` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`book_value_before` real DEFAULT 0 NOT NULL,
	`book_value_after` real DEFAULT 0 NOT NULL,
	`is_posted` integer DEFAULT true NOT NULL,
	`posted_at` text,
	`gl_entry_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_dep_asset_period_idx` ON `shranix_asset_depreciation` (`asset_id`,`period`);--> statement-breakpoint
CREATE INDEX `ast_dep_asset_idx` ON `shranix_asset_depreciation` (`asset_id`);--> statement-breakpoint
CREATE TABLE `shranix_asset_disposals` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`disposal_number` text NOT NULL,
	`asset_id` text NOT NULL,
	`disposal_date` text,
	`reason` text,
	`disposal_type` text DEFAULT 'sale' NOT NULL,
	`sale_value` real DEFAULT 0 NOT NULL,
	`disposal_cost` real DEFAULT 0 NOT NULL,
	`book_value` real DEFAULT 0 NOT NULL,
	`gain_loss` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`gl_entry_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_disp_num_idx` ON `shranix_asset_disposals` (`disposal_number`);--> statement-breakpoint
CREATE INDEX `ast_disp_asset_idx` ON `shranix_asset_disposals` (`asset_id`);--> statement-breakpoint
CREATE TABLE `shranix_asset_maintenance` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`maintenance_number` text NOT NULL,
	`asset_id` text NOT NULL,
	`maintenance_type` text DEFAULT 'routine' NOT NULL,
	`service_date` text,
	`next_service_date` text,
	`service_frequency_days` integer,
	`reminder_days` integer DEFAULT 7 NOT NULL,
	`vendor` text,
	`description` text,
	`parts_cost` real DEFAULT 0 NOT NULL,
	`labor_cost` real DEFAULT 0 NOT NULL,
	`other_cost` real DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`warranty_covered` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`remarks` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_mnt_num_idx` ON `shranix_asset_maintenance` (`maintenance_number`);--> statement-breakpoint
CREATE INDEX `ast_mnt_asset_idx` ON `shranix_asset_maintenance` (`asset_id`);--> statement-breakpoint
CREATE INDEX `ast_mnt_next_idx` ON `shranix_asset_maintenance` (`next_service_date`);--> statement-breakpoint
CREATE TABLE `shranix_asset_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`transfer_number` text NOT NULL,
	`asset_id` text NOT NULL,
	`transfer_date` text,
	`from_type` text,
	`from_id` text,
	`to_type` text NOT NULL,
	`to_id` text NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_tr_num_idx` ON `shranix_asset_transfers` (`transfer_number`);--> statement-breakpoint
CREATE INDEX `ast_tr_asset_idx` ON `shranix_asset_transfers` (`asset_id`);--> statement-breakpoint
CREATE TABLE `shranix_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`asset_code` text NOT NULL,
	`asset_name` text NOT NULL,
	`category_id` text,
	`asset_type` text DEFAULT 'fixed_asset' NOT NULL,
	`brand` text,
	`model` text,
	`serial_number` text,
	`barcode` text,
	`purchase_date` text,
	`purchase_invoice_id` text,
	`supplier_id` text,
	`purchase_cost` real DEFAULT 0 NOT NULL,
	`additional_cost` real DEFAULT 0 NOT NULL,
	`capitalized_cost` real DEFAULT 0 NOT NULL,
	`warranty_start` text,
	`warranty_end` text,
	`warranty_provider` text,
	`warranty_number` text,
	`useful_life_years` real,
	`depreciation_method` text DEFAULT 'straight_line' NOT NULL,
	`depreciation_rate` real,
	`salvage_value` real DEFAULT 0 NOT NULL,
	`current_book_value` real DEFAULT 0 NOT NULL,
	`accumulated_depreciation` real DEFAULT 0 NOT NULL,
	`location` text,
	`department_id` text,
	`assigned_employee_id` text,
	`branch_id` text,
	`vehicle_number` text,
	`registration_number` text,
	`insurance_expiry` text,
	`puc_expiry` text,
	`fitness_certificate_expiry` text,
	`permit_expiry` text,
	`odometer_reading` real,
	`driver_employee_id` text,
	`status` text DEFAULT 'available' NOT NULL,
	`condition` text DEFAULT 'good' NOT NULL,
	`notes` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ast_code_idx` ON `shranix_assets` (`asset_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `ast_serial_idx` ON `shranix_assets` (`serial_number`);--> statement-breakpoint
CREATE INDEX `ast_cat_idx` ON `shranix_assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `ast_status_idx` ON `shranix_assets` (`status`);--> statement-breakpoint
CREATE INDEX `ast_emp_idx` ON `shranix_assets` (`assigned_employee_id`);--> statement-breakpoint
CREATE TABLE `shranix_expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`category_name` text NOT NULL,
	`expense_account_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exp_cat_name_idx` ON `shranix_expense_categories` (`category_name`);--> statement-breakpoint
CREATE TABLE `shranix_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`expense_number` text NOT NULL,
	`expense_date` text,
	`category_id` text,
	`expense_account_id` text,
	`vendor_id` text,
	`employee_id` text,
	`department_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`payment_mode` text,
	`payment_reference` text,
	`reference` text,
	`description` text,
	`attachment_ref` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approval_date` text,
	`paid_at` text,
	`paid_by` text,
	`gl_entry_id` text,
	`recurring_expense_id` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exp_num_idx` ON `shranix_expenses` (`expense_number`);--> statement-breakpoint
CREATE INDEX `exp_cat_idx` ON `shranix_expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `exp_status_idx` ON `shranix_expenses` (`status`);--> statement-breakpoint
CREATE INDEX `exp_date_idx` ON `shranix_expenses` (`expense_date`);--> statement-breakpoint
CREATE TABLE `shranix_recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`recurring_number` text NOT NULL,
	`category_id` text,
	`expense_account_id` text,
	`vendor_id` text,
	`department_id` text,
	`amount` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`interval_days` integer,
	`next_due_date` text,
	`description` text,
	`payment_mode` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_generated_at` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exp_rec_num_idx` ON `shranix_recurring_expenses` (`recurring_number`);--> statement-breakpoint
CREATE INDEX `exp_rec_due_idx` ON `shranix_recurring_expenses` (`next_due_date`);