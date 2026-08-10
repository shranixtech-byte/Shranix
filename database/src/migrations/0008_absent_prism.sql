CREATE TABLE `shranix_customer_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`address_type` text DEFAULT 'billing' NOT NULL,
	`address` text,
	`village` text,
	`taluka` text,
	`district` text,
	`state` text,
	`country` text DEFAULT 'India' NOT NULL,
	`pincode` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `cust_addr_customer_idx` ON `shranix_customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shranix_customer_categories` (
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
CREATE UNIQUE INDEX `cust_category_name_idx` ON `shranix_customer_categories` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_customer_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`contact_type` text DEFAULT 'owner' NOT NULL,
	`name` text NOT NULL,
	`mobile` text,
	`email` text,
	`designation` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `cust_contact_customer_idx` ON `shranix_customer_contacts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shranix_customer_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_id` text NOT NULL,
	`doc_type` text DEFAULT 'other' NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text,
	`file_size` integer DEFAULT 0 NOT NULL,
	`mime_type` text,
	`uploaded_by` text,
	`notes` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `cust_doc_customer_idx` ON `shranix_customer_documents` (`customer_id`);--> statement-breakpoint
CREATE TABLE `shranix_customer_groups` (
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
CREATE UNIQUE INDEX `cust_group_name_idx` ON `shranix_customer_groups` (`name`);--> statement-breakpoint
CREATE TABLE `shranix_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`customer_code` text NOT NULL,
	`name` text NOT NULL,
	`firm_name` text,
	`customer_type` text DEFAULT 'retail' NOT NULL,
	`group_id` text,
	`category_id` text,
	`gstin` text,
	`pan` text,
	`mobile` text,
	`alt_mobile` text,
	`whatsapp` text,
	`email` text,
	`website` text,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`credit_days` integer DEFAULT 0 NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`current_balance` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`remarks` text,
	`created_by` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cust_code_idx` ON `shranix_customers` (`customer_code`);--> statement-breakpoint
CREATE INDEX `cust_mobile_idx` ON `shranix_customers` (`mobile`);--> statement-breakpoint
CREATE INDEX `cust_gstin_idx` ON `shranix_customers` (`gstin`);--> statement-breakpoint
CREATE INDEX `cust_group_idx` ON `shranix_customers` (`group_id`);--> statement-breakpoint
CREATE INDEX `cust_category_idx` ON `shranix_customers` (`category_id`);--> statement-breakpoint
-- ═════════════════════════════════════════════════════════
-- Phase 3 default reference data (idempotent seeds)
-- ═════════════════════════════════════════════════════════
INSERT OR IGNORE INTO `shranix_customer_groups` (`id`,`name`,`description`,`sort_order`,`is_system`,`is_active`,`created_at`,`updated_at`) VALUES
	('11111111-1111-4111-8111-111111111101','Retail','Retail customers — counter / walk-in buyers',10,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('11111111-1111-4111-8111-111111111102','Wholesale','Wholesale / bulk purchasers',20,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('11111111-1111-4111-8111-111111111103','Farmer','Farmer / Kisan customers',30,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('11111111-1111-4111-8111-111111111104','Dealer','Authorized dealer network',40,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('11111111-1111-4111-8111-111111111105','Corporate','Corporate / institutional accounts',50,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('11111111-1111-4111-8111-111111111106','Government','Government departments / tenders',60,1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z');--> statement-breakpoint
INSERT OR IGNORE INTO `shranix_customer_categories` (`id`,`name`,`description`,`priority`,`is_active`,`created_at`,`updated_at`) VALUES
	('22222222-2222-4222-8222-222222222201','A','Category A — high priority',5,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('22222222-2222-4222-8222-222222222202','B','Category B',4,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('22222222-2222-4222-8222-222222222203','C','Category C',3,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('22222222-2222-4222-8222-222222222204','Premium','Premium customers — VIP treatment',2,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z'),
	('22222222-2222-4222-8222-222222222205','VIP','Very Important Person — top tier',1,1,'2026-08-07T00:00:00.000Z','2026-08-07T00:00:00.000Z');