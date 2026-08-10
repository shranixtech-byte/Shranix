CREATE TABLE `shranix_product_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`product_id` text NOT NULL,
	`doc_type` text DEFAULT 'other' NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text,
	`file_size` integer DEFAULT 0 NOT NULL,
	`mime_type` text,
	`notes` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `product_doc_product_idx` ON `shranix_product_documents` (`product_id`);--> statement-breakpoint
CREATE TABLE `shranix_product_price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`product_id` text NOT NULL,
	`price_type` text NOT NULL,
	`old_value` real DEFAULT 0 NOT NULL,
	`new_value` real DEFAULT 0 NOT NULL,
	`changed_by` text,
	`changed_at` text,
	`remarks` text
);
--> statement-breakpoint
CREATE INDEX `product_price_history_product_idx` ON `shranix_product_price_history` (`product_id`);--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `product_code` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `sub_category_id` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `barcode` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `qr_code` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `pack_size` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `conversion_factor` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `sac_code` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `wholesale_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `dealer_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `min_selling_price` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `max_discount_percent` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `preferred_supplier_id` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `track_inventory` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `allow_negative_stock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `shranix_items` ADD `updated_by` text;--> statement-breakpoint
CREATE UNIQUE INDEX `items_code_idx` ON `shranix_items` (`product_code`);--> statement-breakpoint
CREATE INDEX `items_barcode_idx` ON `shranix_items` (`barcode`);--> statement-breakpoint
CREATE INDEX `items_category_idx` ON `shranix_items` (`category_id`);--> statement-breakpoint
CREATE INDEX `items_subcategory_idx` ON `shranix_items` (`sub_category_id`);--> statement-breakpoint
CREATE INDEX `items_brand_idx` ON `shranix_items` (`brand_id`);--> statement-breakpoint
CREATE INDEX `items_type_idx` ON `shranix_items` (`type`);--> statement-breakpoint
CREATE INDEX `items_status_idx` ON `shranix_items` (`status`);