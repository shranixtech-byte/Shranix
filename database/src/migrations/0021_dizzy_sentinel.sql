CREATE TABLE `shranix_business_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`rule_code` text NOT NULL,
	`rule_name` text NOT NULL,
	`module` text NOT NULL,
	`document_type` text,
	`description` text,
	`condition` text DEFAULT '{}' NOT NULL,
	`action` text DEFAULT 'block' NOT NULL,
	`severity` text DEFAULT 'error' NOT NULL,
	`message` text,
	`priority` integer DEFAULT 100 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `br_rule_code_idx` ON `shranix_business_rules` (`rule_code`);--> statement-breakpoint
CREATE INDEX `br_module_idx` ON `shranix_business_rules` (`module`);--> statement-breakpoint
CREATE INDEX `br_status_idx` ON `shranix_business_rules` (`status`);--> statement-breakpoint
CREATE TABLE `shranix_custom_field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`field_id` text NOT NULL,
	`document_type` text NOT NULL,
	`record_id` text NOT NULL,
	`value` text,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cfv_record_field_idx` ON `shranix_custom_field_values` (`record_id`,`field_id`);--> statement-breakpoint
CREATE INDEX `cfv_doc_idx` ON `shranix_custom_field_values` (`document_type`,`record_id`);--> statement-breakpoint
CREATE TABLE `shranix_custom_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`field_code` text NOT NULL,
	`field_name` text NOT NULL,
	`module` text NOT NULL,
	`document_type` text NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`min_value` real,
	`max_value` real,
	`pattern` text,
	`options` text,
	`default_value` text,
	`placeholder` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cf_doc_type_code_idx` ON `shranix_custom_fields` (`document_type`,`field_code`);--> statement-breakpoint
CREATE INDEX `cf_module_idx` ON `shranix_custom_fields` (`module`);--> statement-breakpoint
CREATE TABLE `shranix_record_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`tag_id` text NOT NULL,
	`record_type` text NOT NULL,
	`record_id` text NOT NULL,
	`assigned_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rt_tag_record_idx` ON `shranix_record_tags` (`tag_id`,`record_type`,`record_id`);--> statement-breakpoint
CREATE INDEX `rt_record_idx` ON `shranix_record_tags` (`record_type`,`record_id`);--> statement-breakpoint
CREATE TABLE `shranix_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`tag_name` text NOT NULL,
	`tag_color` text DEFAULT 'blue' NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_idx` ON `shranix_tags` (`tag_name`);