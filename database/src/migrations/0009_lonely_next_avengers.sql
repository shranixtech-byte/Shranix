CREATE TABLE `shranix_supplier_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`supplier_id` text NOT NULL,
	`address_type` text DEFAULT 'billing' NOT NULL,
	`address` text,
	`village` text,
	`taluka` text,
	`district` text,
	`state` text,
	`country` text DEFAULT 'India' NOT NULL,
	`pincode` text,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_supplier_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`supplier_id` text NOT NULL,
	`contact_type` text DEFAULT 'owner' NOT NULL,
	`name` text NOT NULL,
	`mobile` text,
	`email` text,
	`designation` text,
	`is_primary` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shranix_supplier_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`supplier_id` text NOT NULL,
	`doc_type` text DEFAULT 'other' NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text,
	`file_size` integer DEFAULT 0 NOT NULL,
	`mime_type` text,
	`notes` text
);
--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `firm_name` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `supplier_type` text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `alt_mobile` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `whatsapp` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `website` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `village` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `taluka` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `country` text DEFAULT 'India' NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `opening_balance` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `current_balance` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `payment_terms` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `shranix_suppliers` ADD `updated_by` text;