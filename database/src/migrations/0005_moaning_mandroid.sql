ALTER TABLE `shranix_sales_orders` ADD `payment_terms` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `billing_address` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `shipping_address` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `contact_person` text;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `is_partial` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `cgst_total` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `sgst_total` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `igst_total` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_sales_orders` ADD `cess_total` real DEFAULT 0 NOT NULL;