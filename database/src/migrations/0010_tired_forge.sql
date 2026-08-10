CREATE TABLE `shranix_supplier_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_category_name_idx` ON `shranix_supplier_categories` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_supplier_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_group_name_idx` ON `shranix_supplier_groups` (`name`);--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `group_id` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `category_id` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `aadhaar` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `upi_id` text;--> statement-breakpoint
CREATE INDEX `supplier_gstin_idx` ON `shranix_suppliers` (`gstin`);--> statement-breakpoint
CREATE INDEX `supplier_mobile_idx` ON `shranix_suppliers` (`mobile`);--> statement-breakpoint
CREATE INDEX `supplier_group_idx` ON `shranix_suppliers` (`group_id`);--> statement-breakpoint
CREATE INDEX `supplier_category_idx` ON `shranix_suppliers` (`category_id`);