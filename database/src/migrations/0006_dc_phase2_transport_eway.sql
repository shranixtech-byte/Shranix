ALTER TABLE `shranix_challan_items` ADD `description` text;--> statement-breakpoint
ALTER TABLE `shranix_challan_items` ADD `unit_id` text;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `eway_bill_no` text;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `eway_bill_date` text;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `transport_details` text;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `total_qty` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `total_amount` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `billing_address` text;--> statement-breakpoint
ALTER TABLE `shranix_delivery_challans` ADD `shipping_address` text;